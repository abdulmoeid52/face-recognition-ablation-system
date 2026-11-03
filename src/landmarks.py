from pathlib import Path
import numpy as np
import cv2
import dlib
from .config import CONFIG

_detector = None
_predictor = None


def _init():
    global _detector, _predictor
    if _detector is None:
        _detector = dlib.get_frontal_face_detector()
    if _predictor is None:
        path = Path(CONFIG["dlib_model_path"])
        if not path.exists():
            raise FileNotFoundError(
                f"dlib model missing at {path}. "
                "Run: python scripts/download_models.py"
            )
        _predictor = dlib.shape_predictor(str(path))


def get_landmarks(image: np.ndarray) -> np.ndarray | None:
    """Return (68, 2) int array or None if no face found."""
    _init()
    if image is None:
        return None
    gray = image if image.ndim == 2 else cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = _detector(gray)
    if len(faces) == 0:
        return None
    shape = _predictor(gray, faces[0])
    return np.array([[shape.part(i).x, shape.part(i).y] for i in range(68)])