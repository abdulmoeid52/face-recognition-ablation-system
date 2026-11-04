"use client";
import { useState } from "react";
import UploadZone from "./components/UploadZone";
import ResultCard from "./components/ResultCard";
import LiveVerify from "./components/LiveVerify";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export default function Home() {
  const [mode, setMode] = useState<"live" | "verify" | "enroll">("live");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (mode === "enroll") fd.append("name", name);

      const url = mode === "verify" ? `${API}/verify` : `${API}/enroll`;
      const r = await fetch(url, { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Request failed");

      if (mode === "verify") {
        setResult(data);
      } else {
        setResult({ match: data.enrolled, score: "enrolled", threshold: "-", all: {} });
      }
    } catch (e: any) {
      setErr(e.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <header className="header">
        <h1 className="title">Face Recognition · Smart Look</h1>
        <p className="subtitle">ArcFace embeddings · MediaPipe live detection · cosine verification</p>

        {/* UPDATED GITHUB LINK */}
        <div className="header-links">
          <a href="https://github.com/abdulmoeid52/face-recognition-ablation-system" target="_blank" rel="noopener noreferrer" className="gh-link">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.1c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.41-2.69 5.39-5.25 5.67.41.35.77 1.04.77 2.1v3.11c0 .3.21.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
            </svg>
            github.com/abdulmoeid52/face-recognition-ablation-system
          </a>
        </div>
      </header>

      <div className="tabs">
        <button className={`tab ${mode === "live" ? "active" : ""}`} onClick={() => { setMode("live"); setResult(null); setErr(null); }}>🔴 Live</button>
        <button className={`tab ${mode === "verify" ? "active" : ""}`} onClick={() => { setMode("verify"); setResult(null); setErr(null); }}>Verify</button>
        <button className={`tab ${mode === "enroll" ? "active" : ""}`} onClick={() => { setMode("enroll"); setResult(null); setErr(null); }}>Enroll</button>
      </div>

      {mode === "live" ? (
        <LiveVerify />
      ) : (
        <>
          {mode === "enroll" && (
            <input className="field" placeholder="Person name" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <UploadZone onFile={setFile} label={mode === "verify" ? "Drop a face image to verify" : "Drop a face image to enroll"} />
          <button className="btn" onClick={submit} disabled={!file || busy || (mode === "enroll" && !name.trim())}>
            {busy ? "Working…" : mode === "verify" ? "Verify" : "Enroll"}
          </button>
          {err && <p className="error">{err}</p>}
          <ResultCard result={result} />
        </>
      )}

      {/* UPDATED FOOTER LINKS */}
      <footer className="footer">
        <div className="footer-links">
          <a href="https://github.com/abdulmoeid52/face-recognition-ablation-system" target="_blank" rel="noopener noreferrer">GitHub</a>
          <span>·</span>
          <a href="https://github.com/abdulmoeid52/face-recognition-ablation-system#readme" target="_blank" rel="noopener noreferrer">Docs</a>
          <span>·</span>
          <span>Deployed on Vercel</span>
        </div>
        <p className="footer-note">ArcFace · dlib landmarks · LFW ablation study · MIT License</p>
      </footer>
    </main>
  );
}