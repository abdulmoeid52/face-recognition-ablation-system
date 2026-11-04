

"use client";
import { useEffect, useRef, useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "";

type VerifyResult = {
  match: string | null;
  best_candidate?: string;
  score: number;
  threshold: number;
  all?: Record<string, number>;
};
type Box = { x: number; y: number; w: number; h: number };
type Quality = { size: number; center: number; score: number };

const STABLE_MS = 1000;
const GOOD_QUALITY = 0.65;

function qualityFrom(box: Box, vw: number, vh: number): Quality {
  const areaRatio = (box.w * box.h) / (vw * vh);
  const sizeScore = Math.max(0, Math.min(1, 1 - Math.abs(areaRatio - 0.20) / 0.25));
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = Math.abs(cx - vw / 2) / (vw / 2);
  const dy = Math.abs(cy - vh / 2) / (vh / 2);
  const centerScore = Math.max(0, 1 - Math.hypot(dx, dy) / 1.2);
  return {
    size: sizeScore,
    center: centerScore,
    score: sizeScore * 0.6 + centerScore * 0.4,
  };
}

function haptic(ms = 40) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { (navigator as any).vibrate(ms); } catch {}
  }
}

export default function LiveVerify() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const verifyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightVerify = useRef(false);
  const stableSinceRef = useRef<number | null>(null);
  const captureLockRef = useRef(false);

  const [aspect, setAspect] = useState<number | string>(4 / 3); // NEW: Dynamic aspect ratio

  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [warming, setWarming] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [lastVerify, setLastVerify] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [stableMs, setStableMs] = useState(0);
  const [autoMode, setAutoMode] = useState(false);
  const [flash, setFlash] = useState(false);
  const [enrollName, setEnrollName] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null);
  const [enrolledCount, setEnrolledCount] = useState(0);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    setStarting(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // NEW: Set aspect ratio dynamically based on camera feed
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            setAspect(videoRef.current.videoWidth / videoRef.current.videoHeight);
          }
        };
        await videoRef.current.play();
      }
      setActive(true);
    } catch (e: any) {
      setError(e?.name === "NotAllowedError" ? "Camera permission denied." : "Camera error: " + (e?.message || e));
      setStarting(false);
      return;
    }
    setStarting(false);

    setWarming(true);
    try { await fetch(`${API}/health`); } catch {}
    setWarming(false);

    try {
      if (!detectorRef.current) {
        const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm");
        detectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5,
        });
      }
    } catch (e: any) {
      console.warn("MediaPipe load failed:", e);
    }

    startDetectionLoop();
    verifyTimerRef.current = setInterval(captureAndVerify, 1400);
  }, [facing]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (verifyTimerRef.current) clearInterval(verifyTimerRef.current);
    rafRef.current = null;
    verifyTimerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    setResult(null);
    setBox(null);
    setQuality(null);
    setStableMs(0);
    setWarming(false);
    setEnrollMsg(null);
    stableSinceRef.current = null;
  }, []);

  function startDetectionLoop() {
    const tick = () => {
      const video = videoRef.current;
      if (!video || !detectorRef.current || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      try {
        const dets = detectorRef.current.detectForVideo(video, performance.now());
        const vw = video.videoWidth, vh = video.videoHeight;

        if (dets?.detections?.length > 0) {
          const bb = dets.detections[0].boundingBox;
          const b: Box = { x: bb.originX, y: bb.originY, w: bb.width, h: bb.height };
          setBox(b);
          const q = qualityFrom(b, vw, vh);
          setQuality(q);

          if (q.score >= GOOD_QUALITY) {
            if (stableSinceRef.current == null) stableSinceRef.current = performance.now();
            const elapsed = performance.now() - stableSinceRef.current;
            setStableMs(elapsed);

            if (autoMode && elapsed >= STABLE_MS && !captureLockRef.current && enrollName.trim()) {
              captureLockRef.current = true;
              haptic(60);
              captureAndEnroll().finally(() => {
                setTimeout(() => { captureLockRef.current = false; }, 1500);
              });
            }
          } else {
            stableSinceRef.current = null;
            setStableMs(0);
          }
        } else {
          setBox(null);
          setQuality(null);
          stableSinceRef.current = null;
          setStableMs(0);
        }
      } catch {}
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function grabFrame(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = videoRef.current, canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) return resolve(null);
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
    });
  }

  async function captureAndVerify() {
    if (inFlightVerify.current) return;
    inFlightVerify.current = true;
    try {
      const blob = await grabFrame();
      if (!blob) return;
      const fd = new FormData();
      fd.append("file", blob, "frame.jpg");
      const r = await fetch(`${API}/verify`, { method: "POST", body: fd });
      if (r.status === 422) { setResult(null); setLastVerify(Date.now()); return; }
      if (!r.ok) return;
      setResult(await r.json());
      setLastVerify(Date.now());
    } catch {} finally { inFlightVerify.current = false; }
  }

  async function captureAndEnroll() {
    const name = enrollName.trim();
    if (!name) return;
    setEnrolling(true);
    setEnrollMsg(null);
    try {
      const blob = await grabFrame();
      if (!blob) throw new Error("No frame");
      const fd = new FormData();
      fd.append("file", blob, "capture.jpg");
      fd.append("name", name);
      const r = await fetch(`${API}/enroll`, { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Enroll failed");
      setFlash(true); setTimeout(() => setFlash(false), 250);
      haptic(80);
      setEnrolledCount((c) => c + 1);
      setEnrollMsg(`✓ Enrolled "${data.enrolled}" · ${enrolledCount + 1} shot(s)`);
      await captureAndVerify();
    } catch (e: any) {
      setEnrollMsg("✗ " + (e.message || "Enroll failed"));
    } finally {
      setEnrolling(false);
    }
  }

  function flipCamera() {
    setFacing((f) => (f === "user" ? "environment" : "user"));
    setTimeout(() => { stop(); start(); }, 50);
  }

  useEffect(() => { return () => stop(); }, [stop]);

  const matched = !!result?.match && Date.now() - lastVerify < 2500;
  const ready = (quality?.score ?? 0) >= GOOD_QUALITY;
  const stableProgress = Math.min(1, stableMs / STABLE_MS);
  const guidance = !box ? "Show your face to the camera" : !ready ? (quality && quality.size < 0.4 ? "Move closer" : quality && quality.center < 0.4 ? "Center your face" : "Find better lighting") : autoMode ? "Hold still…" : "Perfect — capture now";

  const vw = videoRef.current?.videoWidth ?? 1;
  const vh = videoRef.current?.videoHeight ?? 1;
  const boxStyle: React.CSSProperties | null = box
    ? {
        left: mirror && facing === "user" ? `${(1 - (box.x + box.w) / vw) * 100}%` : `${(box.x / vw) * 100}%`,
        top: `${(box.y / vh) * 100}%`,
        width: `${(box.w / vw) * 100}%`,
        height: `${(box.h / vh) * 100}%`,
      }
    : null;

  return (
    <div className="live-wrap">
      <div className={`live-frame ${matched ? "ok" : box ? (ready ? "ready" : "") : ""}`} style={{ aspectRatio: aspect }}>
        <video ref={videoRef} className="live-video" playsInline muted style={{ transform: mirror && facing === "user" ? "scaleX(-1)" : "none" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {boxStyle && ready && (
          <div className="live-box ready" style={boxStyle}>
            <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
          </div>
        )}
        {boxStyle && !ready && <div className="live-box" style={boxStyle} />}

        {active && (
          <div className={`live-guide ${matched ? "ok" : ready ? "ready" : "wait"}`}>
            {matched ? `✓ ${result?.match}` : guidance}
            {matched && result && <span className="score">{result.score.toFixed(3)}</span>}
          </div>
        )}

        {active && autoMode && box && ready && !matched && (
          <div className="live-progress">
            <svg viewBox="0 0 36 36" width="56" height="56">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${stableProgress * 94.2} 94.2`} transform="rotate(-90 18 18)" />
            </svg>
          </div>
        )}

        {flash && <div className="live-flash" />}
        {warming && <div className="live-badge warm">Warming up backend…</div>}
        {!active && <div className="live-placeholder">{starting ? "Requesting camera…" : "Camera is off"}</div>}

        {active && (
          <div className="live-top-controls">
            <button className="icon-btn" onClick={flipCamera} title="Switch camera">🔄</button>
            <button className={`icon-btn ${mirror ? "on" : ""}`} onClick={() => setMirror((m) => !m)} title="Mirror">🪞</button>
          </div>
        )}
      </div>

      {!active ? (
        <button className="btn" onClick={start} disabled={starting}>{starting ? "Starting…" : "▶ Start camera"}</button>
      ) : (
        <>
          <div className="live-enroll-row">
            <input className="field" placeholder="Name to enroll" value={enrollName} onChange={(e) => { setEnrollName(e.target.value); setEnrolledCount(0); }} autoComplete="off" />
            <button className="btn btn-capture" onClick={captureAndEnroll} disabled={!enrollName.trim() || enrolling || !ready}>{enrolling ? "…" : "📸 Capture"}</button>
          </div>
          <div className="live-options">
            <label className="toggle"><input type="checkbox" checked={autoMode} onChange={(e) => setAutoMode(e.target.checked)} /><span>Auto-capture when face is stable</span></label>
            <button className="btn btn-secondary" onClick={stop}>■ Stop</button>
          </div>
          {quality && (
            <div className="live-quality">
              <div className="q-row"><span>Size</span><div className="q-bar"><div style={{ width: `${quality.size * 100}%` }} /></div></div>
              <div className="q-row"><span>Center</span><div className="q-bar"><div style={{ width: `${quality.center * 100}%` }} /></div></div>
              <div className="q-row"><span>Ready</span><div className="q-bar"><div className={ready ? "good" : ""} style={{ width: `${quality.score * 100}%` }} /></div></div>
            </div>
          )}
          {enrollMsg && <p className={enrollMsg.startsWith("✓") ? "msg-ok" : "error"}>{enrollMsg}</p>}
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}