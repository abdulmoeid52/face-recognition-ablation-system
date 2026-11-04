"""Face Recognition API — deploy to HuggingFace Spaces (Docker SDK)."""
import io
import sys
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import CONFIG
from src.embeddings import get_embedding
from src.verify import cosine_sim
from src.gallery import (
    add_identity, delete_identity, list_identities, load_gallery,
)
from src.blur import blur_region, REGIONS

app = FastAPI(title="Face Recog Ablation API", version="0.1.0")

# allow Vercel + local dev. Update `allow_origins` after you know your Vercel URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _read_upload(file: UploadFile) -> np.ndarray:
    raw = file.file.read()
    if len(raw) > CONFIG["max_upload_mb"] * 1024 * 1024:
        raise HTTPException(413, "File too large")
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid image")
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)


@app.get("/health")
def health():
    return {
        "ok": True,
        "model": CONFIG["model_name"],
        "threshold": CONFIG["threshold"],
        "identities": len(list_identities()),
    }


@app.get("/identities")
def identities():
    return {"identities": list_identities()}


@app.post("/enroll")
async def enroll(name: str = Form(...), file: UploadFile = File(...)):
    if not name.strip():
        raise HTTPException(400, "Name required")
    img = _read_upload(file)
    emb = get_embedding(img)
    if emb is None:
        raise HTTPException(422, "No face detected")
    add_identity(name.strip(), emb)
    return {"ok": True, "enrolled": name.strip()}


@app.post("/verify")
async def verify(file: UploadFile = File(...)):
    img = _read_upload(file)
    emb = get_embedding(img)
    if emb is None:
        raise HTTPException(422, "No face detected")
    gallery = load_gallery()
    if not gallery:
        return {"match": None, "score": 0.0, "all": {},
                "message": "gallery empty"}
    scores = {n: cosine_sim(emb, e) for n, e in gallery.items()}
    best = max(scores, key=scores.get)
    passed = scores[best] >= CONFIG["threshold"]
    return {
        "match": best if passed else None,
        "best_candidate": best,
        "score": round(scores[best], 4),
        "threshold": CONFIG["threshold"],
        "all": {k: round(v, 4) for k, v in scores.items()},
    }


@app.delete("/identities/{name}")
def remove(name: str):
    if delete_identity(name):
        return {"ok": True, "deleted": name}
    raise HTTPException(404, "Not found")


@app.post("/ablate")
async def ablate(
    file: UploadFile = File(...),
    region: str = Query(..., pattern="^(eyes|nose|mouth|jawline)$"),
):
    img = _read_upload(file)
    orig = get_embedding(img)
    if orig is None:
        raise HTTPException(422, "No face detected")
    blurred = blur_region(img, REGIONS[region])
    if blurred is None:
        raise HTTPException(422, "Landmarks not found")
    new = get_embedding(blurred)
    if new is None:
        raise HTTPException(422, "No face in blurred image")
    return {
        "region": region,
        "cosine_similarity": round(cosine_sim(orig, new), 4),
        "delta": round(cosine_sim(orig, new) - 1.0, 4),
    }