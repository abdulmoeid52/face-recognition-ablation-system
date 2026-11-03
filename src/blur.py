import numpy as np
import cv2
from .landmarks import get_landmarks

REGIONS = {
    "eyes":    list(range(36, 48)),
    "nose":    list(range(27, 36)),
    "mouth":   list(range(48, 68)),
    "jawline": list(range(0, 17)),
}


def blur_region(image: np.ndarray, point_indices, kernel: int = 51, sigma: int = 20):
    """Return blurred BGR image (np.ndarray) or None if no landmarks."""
    if image is None:
        return None
    pts = get_landmarks(image)
    if pts is None:
        return None
    region_pts = pts[point_indices].reshape((-1, 1, 2)).astype(np.int32)
    mask = np.zeros(image.shape[:2], dtype=np.float32)
    cv2.fillPoly(mask, [region_pts], 1.0)
    blurred = cv2.GaussianBlur(image, (kernel, kernel), sigma)
    mask_3d = np.stack([mask] * 3, axis=-1)
    return (image * (1 - mask_3d) + blurred * mask_3d).astype(np.uint8)