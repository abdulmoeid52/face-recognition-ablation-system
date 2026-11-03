from pathlib import Path
import numpy as np
from .config import CONFIG


def _path() -> Path:
    p = Path(CONFIG["gallery_store"])
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def load_gallery() -> dict[str, np.ndarray]:
    p = _path()
    if not p.exists():
        return {}
    data = np.load(p, allow_pickle=True)
    return {k: data[k] for k in data.files}


def save_gallery(gallery: dict[str, np.ndarray]) -> None:
    if not gallery:
        _path().unlink(missing_ok=True)
        return
    np.savez_compressed(_path(), **gallery)


def add_identity(name: str, emb: np.ndarray) -> None:
    g = load_gallery()
    if name in g:
        g[name] = ((g[name] + emb) / 2.0).astype(np.float32)
    else:
        g[name] = emb.astype(np.float32)
    save_gallery(g)


def delete_identity(name: str) -> bool:
    g = load_gallery()
    if name not in g:
        return False
    del g[name]
    save_gallery(g)
    return True


def list_identities() -> list[str]:
    return sorted(load_gallery().keys())