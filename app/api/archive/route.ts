const mediaApi = process.env.MEDIA_MTX_API_URL ?? "http://relay:9997";
const timeZone = "America/Mexico_City";
const sourceKeys = [
  "MTX_PATHS_CAM1_SOURCE",
  "MTX_PATHS_CAM2_SOURCE",
  "MTX_PATHS_CAM3_SOURCE",
  "MTX_PATHS_CAM4_SOURCE",
] as const;

type RecordingRange = { minDate: string; maxDate: string };

let rangeCache: { value: RecordingRange; expires: number } | undefined;

function localDate(offsetDays = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(Date.now() - offsetDays * 86_400_000),
  );
}

function localTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function sourceFor(channel: number, start: string, end: string) {
  const sourceKey = sourceKeys[channel - 1];
  if (!sourceKey) throw new Error("Cámara no válida.");
  const liveSource = process.env[sourceKey];
  const marker = liveSource?.lastIndexOf("/cam/");
  if (!liveSource || marker === undefined || marker < 0) {
    throw new Error("La fuente del DVR no está configurada.");
  }
  const encodeTime = (value: string) => value.replace(/[-T:]/g, "_");
  return `${liveSource.slice(0, marker)}/cam/playback?channel=${channel}&subtype=0&starttime=${encodeTime(start)}&endtime=${encodeTime(end)}`;
}

async function removePath(name: string) {
  await fetch(`${mediaApi}/v3/config/paths/delete/${name}`, { method: "DELETE" }).catch(() => undefined);
}

async function addPath(name: string, source: string, sourceOnDemand: boolean) {
  const response = await fetch(`${mediaApi}/v3/config/paths/add/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      source,
      sourceOnDemand,
      sourceOnDemandStartTimeout: "15s",
      sourceOnDemandCloseAfter: "30s",
      rtspTransport: "tcp",
    }),
  });
  if (!response.ok) throw new Error(`MediaMTX rechazó la ruta (${response.status}).`);
}

async function hasRecording(date: string) {
  const name = `probe-${date}-${Date.now()}`;
  const end = date === localDate() ? `${date}T${localTime()}:59` : `${date}T23:59:59`;
  try {
    await addPath(name, sourceFor(1, `${date}T00:00:00`, end), false);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const response = await fetch(`${mediaApi}/v3/paths/get/${name}`);
      if (response.ok && (await response.json()).ready === true) return true;
    }
    return false;
  } finally {
    await removePath(name);
  }
}

async function getRecordingRange() {
  if (rangeCache && rangeCache.expires > Date.now()) return rangeCache.value;

  let minDate = localDate();
  let maxDate = localDate();
  let found = false;

  // DVR recordings are continuous, so the first missing day marks retention.
  for (let offset = 0; offset < 31; offset += 1) {
    const date = localDate(offset);
    if (await hasRecording(date)) {
      if (!found) maxDate = date;
      minDate = date;
      found = true;
    } else if (found) {
      break;
    }
  }

  if (!found) throw new Error("El DVR no informó grabaciones disponibles.");
  rangeCache = { value: { minDate, maxDate }, expires: Date.now() + 3_600_000 };
  return rangeCache.value;
}

export async function GET() {
  try {
    return Response.json({
      ...(await getRecordingRange()),
      currentDate: localDate(),
      currentTime: localTime(),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo consultar el DVR." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { channel, date, time } = await request.json();
    if (!Number.isInteger(channel) || channel < 1 || channel > 4) {
      return Response.json({ error: "Cámara no válida." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return Response.json({ error: "Fecha u hora no válida." }, { status: 400 });
    }

    const range = await getRecordingRange();
    if (date < range.minDate || date > range.maxDate || (date === localDate() && time > localTime())) {
      return Response.json({ error: "Ese momento no está disponible en el DVR." }, { status: 400 });
    }

    // ponytail: one shared playback slot; use per-viewer paths if concurrent archive viewing is needed.
    await removePath("archive");
    const end = date === localDate() ? `${date}T${localTime()}:59` : `${date}T23:59:59`;
    await addPath("archive", sourceFor(channel, `${date}T${time}:00`, end), true);

    return Response.json({ path: "archive", startedAt: `${date}T${time}:00` });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo iniciar la grabación." },
      { status: 503 },
    );
  }
}
