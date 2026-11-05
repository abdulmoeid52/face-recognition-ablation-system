from functools import lru_cache
import numpy as np
from deepface import DeepFace
from .config import CONFIG


def _represent(image_input) -> np.ndarray | None:
    try:
        result = DeepFace.represent(
            img_path=image_input,
            model_name=CONFIG["model_name"],
            detector_backend=CONFIG["detector_backend"],
            enforce_detection=True,
        )
        return np.asarray(result[0]["embedding"], dtype=np.float32)
    except Exception:
        return None


@lru_cache(maxsize=4096)
def get_embedding_path(path: str) -> np.ndarray | None:
    return _represent(path)


def get_embedding(image: np.ndarray) -> np.ndarray | None:
    if image is None:
        return None
    return _represent(image)


def get_embedding_any(x) -> np.ndarray | None:
    if isinstance(x, np.ndarray):
        return get_embedding(x)
    return get_embedding_path(str(x))