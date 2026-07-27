"use client";

import { useEffect, useState } from "react";

const cameras = [
  { name: "Entrada principal", location: "Acceso principal", stream: "cam1", scene: "gate" },
  { name: "Entrada vehicular", location: "Lado oeste", stream: "cam2", scene: "driveway" },
  { name: "Patio", location: "Terraza trasera", stream: "cam3", scene: "patio" },
  { name: "Jardín trasero", location: "Límite de la propiedad", stream: "cam4", scene: "garden" },
];

const streamBase = process.env.NEXT_PUBLIC_STREAM_BASE_URL?.replace(/\/$/, "");
const cameraNamesKey = "homewatch-camera-names";
type RecordingRange = {
  minDate: string;
  maxDate: string;
  currentDate: string;
  currentTime: string;
};

export default function Home() {
  const [section, setSection] = useState<"live" | "recordings">("live");
  const [mode, setMode] = useState<"grid" | "focus">("grid");
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState<number[]>([]);
  const [cameraNames, setCameraNames] = useState(cameras.map((camera) => camera.name));
  const [time, setTime] = useState("--:--:--");
  const [date, setDate] = useState("");
  const [recordingRange, setRecordingRange] = useState<RecordingRange>();
  const [playbackDate, setPlaybackDate] = useState("");
  const [playbackTime, setPlaybackTime] = useState("");
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [playbackStatus, setPlaybackStatus] = useState("Selecciona una fecha y hora.");
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [archiveRequested, setArchiveRequested] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("es-MX", { hour12: false }));
      setDate(now.toLocaleDateString("es-MX", { weekday: "long", month: "long", day: "numeric" }));
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(cameraNamesKey) ?? "null");
      if (Array.isArray(saved) && saved.length === cameras.length && saved.every((name) => typeof name === "string")) {
        setCameraNames(saved);
      }
    } catch {
      // Keep the defaults if browser storage is unavailable or malformed.
    }
  }, []);

  useEffect(() => {
    if (section !== "recordings" || archiveRequested) return;
    setArchiveRequested(true);
    setLoadingArchive(true);
    setPlaybackStatus("Consultando las grabaciones del DVR…");
    fetch("/api/archive")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setRecordingRange(result);
        setPlaybackDate(result.currentDate);
        setPlaybackTime(result.currentTime);
        setPlaybackStatus("Selecciona el momento que quieres revisar.");
      })
      .catch((error) => setPlaybackStatus(error instanceof Error ? error.message : "No se pudo consultar el DVR."))
      .finally(() => setLoadingArchive(false));
  }, [section, archiveRequested]);

  const select = (index: number) => setSelected((index + cameras.length) % cameras.length);
  const selectRecording = (index: number) => {
    select(index);
    setPlaybackUrl("");
    setPlaybackStatus("Selecciona el momento que quieres revisar.");
  };
  const toggleZoom = (index: number) =>
    setZoomed((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  const renameCamera = (index: number) => {
    const name = window.prompt("Nombre de la cámara", cameraNames[index])?.trim().slice(0, 40);
    if (!name) return;
    const updated = cameraNames.map((current, cameraIndex) => cameraIndex === index ? name : current);
    setCameraNames(updated);
    try {
      window.localStorage.setItem(cameraNamesKey, JSON.stringify(updated));
    } catch {
      // The rename still works for this visit if browser storage is unavailable.
    }
  };
  const startPlayback = async () => {
    if (!playbackDate || !playbackTime || !streamBase) return;
    setLoadingArchive(true);
    setPlaybackStatus("Preparando la grabación…");
    try {
      const response = await fetch("/api/archive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel: selected + 1, date: playbackDate, time: playbackTime }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPlaybackUrl(`${streamBase}/${result.path}?controls=true&muted=true&autoplay=true&playsInline=true&session=${Date.now()}`);
      setPlaybackStatus(`Reproduciendo desde ${playbackDate} a las ${playbackTime}.`);
    } catch (error) {
      setPlaybackUrl("");
      setPlaybackStatus(error instanceof Error ? error.message : "No se pudo iniciar la grabación.");
    } finally {
      setLoadingArchive(false);
    }
  };

  return (
    <main className="shell">
      <aside className="rail">
        <div className="brand"><span className="brand-mark" aria-hidden="true" />HomeWatch</div>
        <p className="eyebrow">Centro de control</p>
        <nav className="nav" aria-label="Navegación principal">
          <button
            className={section === "live" ? "active" : ""}
            aria-current={section === "live" ? "page" : undefined}
            onClick={() => setSection("live")}
          ><span>◆</span>Vista en vivo</button>
          <button
            className={section === "recordings" ? "active" : ""}
            aria-current={section === "recordings" ? "page" : undefined}
            onClick={() => setSection("recordings")}
          ><span>▷</span>Grabaciones</button>
          <button disabled title="Disponible cuando se complete la conexión del DVR"><span>◇</span>Eventos</button>
          <button disabled title="Disponible cuando se complete la conexión del DVR"><span>⚙</span>Configuración</button>
        </nav>
        <div className="rail-spacer" />
        <section className="system-card" aria-label="Estado del almacenamiento del DVR">
          <div className="system-row"><span>Disco local del DVR</span><strong>988 GB</strong></div>
          <div className="meter"><i /></div>
          <div className="record-state"><i />Disco detectado y listo</div>
        </section>
        <div className="account"><span className="avatar">HW</span><div><b>Propietario</b><span>Propiedad privada</span></div></div>
      </aside>

      <section className="workspace">
        {section === "live" ? (
          <>
        <header className="topbar">
          <div className="title">
            <h1>Vigilancia nocturna</h1>
            <p><span>{streamBase ? "● Transmisión conectada" : "● Modo de vista previa"}</span><b>·</b>{date || "Hora local"}</p>
          </div>
          <div className="actions">
            <div className="segmented" aria-label="Modo de visualización de las cámaras">
              <button className={mode === "grid" ? "active" : ""} onClick={() => setMode("grid")} aria-pressed={mode === "grid"}>Cuadrícula</button>
              <button className={mode === "focus" ? "active" : ""} onClick={() => setMode("focus")} aria-pressed={mode === "focus"}>Enfoque</button>
            </div>
            <span className="connection-badge">Cifrado</span>
          </div>
        </header>

        <section className={`camera-grid ${mode}`} aria-label="Transmisiones de las cámaras">
          {cameras.map((camera, index) => {
            if (mode === "focus" && index !== selected) return null;
            const isZoomed = zoomed.includes(index);
            const cameraName = cameraNames[index];
            return (
              <article
                className={`camera ${selected === index ? "selected" : ""}`}
                key={camera.stream}
                tabIndex={0}
                aria-label={`Cámara: ${cameraName}`}
                onClick={() => select(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") select(index);
                }}
              >
                <div className={`feed ${isZoomed ? "zoomed" : ""}`}>
                  {streamBase ? (
                    <iframe
                      src={`${streamBase}/${camera.stream}?controls=false&muted=true&autoplay=true&playsInline=true`}
                      title={`Transmisión en vivo de ${cameraName}`}
                      allow="autoplay; fullscreen"
                      loading="eager"
                    />
                  ) : (
                    <div className={`camera-placeholder ${camera.scene}`} aria-hidden="true">
                      <i className="horizon" /><i className="structure" /><i className="light" /><i className="ground" />
                    </div>
                  )}
                </div>
                <div className="camera-shade" aria-hidden="true" />
                <div className="camera-top">
                  <span className={streamBase ? "live" : "ready"}><i />{streamBase ? "EN VIVO" : "LISTA"}</span>
                  <time>{time}</time>
                </div>
                <div className="camera-bottom">
                  <div className="camera-name"><i /><div><strong>{cameraName}</strong><span>{camera.location} · 1080p</span></div></div>
                  <div className="camera-tools">
                    <button
                      aria-label={`Renombrar ${cameraName}`}
                      title="Renombrar cámara"
                      onClick={(event) => { event.stopPropagation(); renameCamera(index); }}
                    >✎</button>
                    <button
                      aria-label={`${isZoomed ? "Restablecer zoom" : "Zoom digital"}: ${cameraName}`}
                      onClick={(event) => { event.stopPropagation(); toggleZoom(index); }}
                    >{isZoomed ? "−" : "+"}</button>
                    <button
                      aria-label={`Pantalla completa: ${cameraName}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        event.currentTarget.closest("article")?.requestFullscreen?.();
                      }}
                    ><span className="fullscreen-glyph" /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <footer className="pager">
          <p>4 cámaras · grabación local protegida</p>
          <div>
            <button onClick={() => select(selected - 1)}>← Anterior</button>
            <span>{selected + 1} / {cameras.length}</span>
            <button onClick={() => select(selected + 1)}>Siguiente →</button>
          </div>
        </footer>
          </>
        ) : (
          <>
            <header className="topbar">
              <div className="title">
                <h1>Grabaciones</h1>
                <p><span>● Archivo local del DVR</span><b>·</b>{date || "Hora local"}</p>
              </div>
              <div className="actions">
                <span className="connection-badge">DVR · 988 GB</span>
              </div>
            </header>

            <section className="archive-layout" aria-label="Reproductor de grabaciones">
              <article className="archive-player">
                <div className="archive-frame">
                  {playbackUrl ? (
                    <iframe
                      src={playbackUrl}
                      title={`Grabación de ${cameraNames[selected]}`}
                      allow="autoplay; fullscreen"
                    />
                  ) : (
                    <div className="archive-empty">
                      <span>▷</span>
                      <strong>{cameraNames[selected]}</strong>
                      <p>Elige una fecha y una hora para reproducir la grabación.</p>
                    </div>
                  )}
                  <span className="archive-label"><i />ARCHIVO</span>
                </div>
                <div className="archive-camera-nav">
                  <button onClick={() => selectRecording(selected - 1)}>← Cámara anterior</button>
                  <div>
                    <strong>{cameraNames[selected]}</strong>
                    <span>Cámara {selected + 1} de {cameras.length}</span>
                  </div>
                  <button onClick={() => selectRecording(selected + 1)}>Cámara siguiente →</button>
                </div>
              </article>

              <aside className="archive-controls">
                <p className="eyebrow">Buscar en el DVR</p>
                <h2>Selecciona un momento</h2>

                <label htmlFor="playback-date">Fecha</label>
                <input
                  id="playback-date"
                  type="date"
                  min={recordingRange?.minDate}
                  max={recordingRange?.maxDate}
                  value={playbackDate}
                  onChange={(event) => {
                    setPlaybackDate(event.target.value);
                    setPlaybackUrl("");
                  }}
                  disabled={!recordingRange || loadingArchive}
                />

                <label htmlFor="playback-time">Hora</label>
                <input
                  id="playback-time"
                  type="time"
                  max={playbackDate === recordingRange?.currentDate ? recordingRange.currentTime : undefined}
                  value={playbackTime}
                  onChange={(event) => {
                    setPlaybackTime(event.target.value);
                    setPlaybackUrl("");
                  }}
                  disabled={!recordingRange || loadingArchive}
                />

                <button
                  className="archive-play-button"
                  onClick={startPlayback}
                  disabled={!recordingRange || !playbackDate || !playbackTime || loadingArchive || !streamBase}
                >
                  {loadingArchive ? "Preparando…" : "▷ Reproducir grabación"}
                </button>

                <p className="archive-status" aria-live="polite">{playbackStatus}</p>
                {recordingRange && (
                  <p className="archive-range">
                    <span>Grabaciones disponibles</span>
                    <strong>{recordingRange.minDate} — {recordingRange.maxDate}</strong>
                    <small>Las fechas fuera de este intervalo están deshabilitadas.</small>
                  </p>
                )}
              </aside>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
