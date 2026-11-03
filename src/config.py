from pathlib import Path
import os
import yaml

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config.yaml"

DEFAULT_CONFIG = {
    "model_name": "ArcFace",
    "detector_backend": "opencv",
    "threshold": 0.40,
    "max_upload_mb": 8,
    "dlib_model_path": "models/shape_predictor_68_face_landmarks.dat",
    "gallery_path": "data/gallery",
    "gallery_store": "data/gallery_embeddings.npz",
}


def load_config() -> dict:
    cfg = dict(DEFAULT_CONFIG)
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, encoding="utf-8") as f:
            cfg.update(yaml.safe_load(f) or {})

    # environment overrides
    if v := os.getenv("FACE_THRESHOLD"):
        cfg["threshold"] = float(v)
    if v := os.getenv("GALLERY_STORE"):
        cfg["gallery_store"] = v

    # resolve relative paths against project root
    for key in ("dlib_model_path", "gallery_path", "gallery_store"):
        p = Path(cfg[key])
        if not p.is_absolute():
            cfg[key] = str(ROOT / p)
    return cfg


CONFIG = load_config()