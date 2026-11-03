"use client";
import { useRef, useState } from "react";

export default function UploadZone({
  onFile,
  label = "Drop a face image or click",
}: {
  onFile: (f: File) => void;
  label?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handle(f: File | undefined) {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    onFile(f);
  }

  return (
    <div
      className="upload"
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => {
        e.preventDefault();
        handle(e.dataTransfer.files[0]);
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      {preview ? (
        <img src={preview} alt="preview" className="upload-preview" />
      ) : (
        <span className="upload-hint">{label}</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </div>
  );
}