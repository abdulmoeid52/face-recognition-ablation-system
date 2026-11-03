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
        setResult({
          match: data.enrolled,
          score: "enrolled",
          threshold: "-",
          all: {},
        });
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
        <h1 className="title">Face Recognition Ablation</h1>
        <p className="subtitle">
          ArcFace embeddings · dlib landmarks · cosine verification
        </p>
      </header>

      <div className="tabs">
  <button
    className={`tab ${mode === "live" ? "active" : ""}`}
    onClick={() => { setMode("live"); setResult(null); setErr(null); }}
  >
    🔴 Live
  </button>
  <button
    className={`tab ${mode === "verify" ? "active" : ""}`}
    onClick={() => { setMode("verify"); setResult(null); setErr(null); }}
  >
    Verify
  </button>
  <button
    className={`tab ${mode === "enroll" ? "active" : ""}`}
    onClick={() => { setMode("enroll"); setResult(null); setErr(null); }}
  >
    Enroll
  </button>
</div>

     {mode === "live" ? (
  <LiveVerify />
) : (
  <>
    {mode === "enroll" && (
      <input
        className="field"
        placeholder="Person name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    )}

    <UploadZone
      onFile={setFile}
      label={mode === "verify" ? "Drop a face image to verify" : "Drop a face image to enroll"}
    />

    <button
      className="btn"
      onClick={submit}
      disabled={!file || busy || (mode === "enroll" && !name.trim())}
    >
      {busy ? "Working…" : mode === "verify" ? "Verify" : "Enroll"}
    </button>

    {err && <p className="error">{err}</p>}
    <ResultCard result={result} />
  </>
)}
      <footer className="footer">
  <div className="footer-links">
    <a href="https://github.com/abdulmoeid52/face-recognition-ablation-system"
       target="_blank" rel="noopener noreferrer">
      GitHub
    </a>
    <span>·</span>
    <a href="https://huggingface.co/spaces/YOUR_USERNAME/face-recognition-ablation"
       target="_blank" rel="noopener noreferrer">
      HF Space
    </a>
    <span>·</span>
    <a href="https://github.com/abdulmoeid52/face-recognition-ablation-system#readme"
       target="_blank" rel="noopener noreferrer">
      Docs
    </a>
  </div>
  <p className="footer-note">
    ArcFace · dlib landmarks · LFW ablation study · MIT License
  </p>
</footer>
    </main>
  );
}