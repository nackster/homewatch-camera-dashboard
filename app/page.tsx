"use client";

import { useEffect, useState } from "react";

const cameras = [
  { name: "Front Gate", location: "Main entrance", stream: "cam1", scene: "gate" },
  { name: "Driveway", location: "West side", stream: "cam2", scene: "driveway" },
  { name: "Patio", location: "Rear terrace", stream: "cam3", scene: "patio" },
  { name: "Back Garden", location: "Property line", stream: "cam4", scene: "garden" },
];

const streamBase = process.env.NEXT_PUBLIC_STREAM_BASE_URL?.replace(/\/$/, "");

export default function Home() {
  const [mode, setMode] = useState<"grid" | "focus">("grid");
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState<number[]>([]);
  const [time, setTime] = useState("--:--:--");
  const [date, setDate] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour12: false }));
      setDate(now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }));
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const select = (index: number) => setSelected((index + cameras.length) % cameras.length);
  const toggleZoom = (index: number) =>
    setZoomed((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );

  return (
    <main className="shell">
      <aside className="rail">
        <div className="brand"><span className="brand-mark" aria-hidden="true" />HomeWatch</div>
        <p className="eyebrow">Control room</p>
        <nav className="nav" aria-label="Primary navigation">
          <button className="active" aria-current="page"><span>◆</span>Live view</button>
          <button disabled title="Available after the DVR connection is completed"><span>▷</span>Timeline</button>
          <button disabled title="Available after the DVR connection is completed"><span>◇</span>Events</button>
          <button disabled title="Available after the DVR connection is completed"><span>⚙</span>Settings</button>
        </nav>
        <div className="rail-spacer" />
        <section className="system-card" aria-label="DVR storage status">
          <div className="system-row"><span>Local DVR disk</span><strong>988 GB</strong></div>
          <div className="meter"><i /></div>
          <div className="record-state"><i />Disk detected and ready</div>
        </section>
        <div className="account"><span className="avatar">HW</span><div><b>Home Owner</b><span>Private property</span></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="title">
            <h1>Night watch</h1>
            <p><span>{streamBase ? "● Relay configured" : "● Preview mode"}</span><b>·</b>{date || "Local time"}</p>
          </div>
          <div className="actions">
            <div className="segmented" aria-label="Camera view mode">
              <button className={mode === "grid" ? "active" : ""} onClick={() => setMode("grid")} aria-pressed={mode === "grid"}>Grid</button>
              <button className={mode === "focus" ? "active" : ""} onClick={() => setMode("focus")} aria-pressed={mode === "focus"}>Focus</button>
            </div>
            <span className="connection-badge">Encrypted</span>
          </div>
        </header>

        <section className={`camera-grid ${mode}`} aria-label="Camera feeds">
          {cameras.map((camera, index) => {
            if (mode === "focus" && index !== selected) return null;
            const isZoomed = zoomed.includes(index);
            return (
              <article
                className={`camera ${selected === index ? "selected" : ""}`}
                key={camera.stream}
                tabIndex={0}
                aria-label={`${camera.name} camera`}
                onClick={() => select(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") select(index);
                }}
              >
                <div className={`feed ${isZoomed ? "zoomed" : ""}`}>
                  {streamBase ? (
                    <iframe
                      src={`${streamBase}/${camera.stream}?controls=false&muted=true&autoplay=true&playsInline=true`}
                      title={`${camera.name} live stream`}
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
                  <span className={streamBase ? "live" : "ready"}><i />{streamBase ? "LIVE" : "READY"}</span>
                  <time>{time}</time>
                </div>
                <div className="camera-bottom">
                  <div className="camera-name"><i /><div><strong>{camera.name}</strong><span>{camera.location} · 1080p</span></div></div>
                  <div className="camera-tools">
                    <button
                      aria-label={`${isZoomed ? "Reset zoom" : "Digital zoom"} ${camera.name}`}
                      onClick={(event) => { event.stopPropagation(); toggleZoom(index); }}
                    >{isZoomed ? "−" : "+"}</button>
                    <button
                      aria-label={`Fullscreen ${camera.name}`}
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
          <p>4 cameras · secure local recording</p>
          <div>
            <button onClick={() => select(selected - 1)}>← Previous</button>
            <span>{selected + 1} / {cameras.length}</span>
            <button onClick={() => select(selected + 1)}>Next →</button>
          </div>
        </footer>
      </section>
    </main>
  );
}
