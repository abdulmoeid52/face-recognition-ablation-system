import numpy as np
import cv2
from .landmarks import get_landmarks


def apply_glasses(img):
    pts = get_landmarks(img)
    if pts is None:
        return None
    img = img.copy()
    le, re = pts[36], pts[45]
    cx = (le[0] + re[0]) // 2
    cy = (le[1] + re[1]) // 2
    w = int(abs(re[0] - le[0]) * 2.2)
    h = int(w * 0.35)
    cv2.ellipse(img, (cx, cy), (w // 2, h // 2), 0, 0, 360, (40, 40, 40), 3)
    cv2.ellipse(img, (le[0], le[1]), (w // 5, h // 2), 0, 0, 360, (40, 40, 40), 2)
    cv2.ellipse(img, (re[0], re[1]), (w // 5, h // 2), 0, 0, 360, (40, 40, 40), 2)
    return img


def apply_beard(img):
    pts = get_landmarks(img)
    if pts is None:
        return None
    img = img.copy()
    jaw = pts[0:17]
    mouth_bot = pts[48:68]
    region = np.concatenate([jaw, mouth_bot[::-1]])
    cv2.fillPoly(img, [region.astype(np.int32)], (30, 20, 10))
    return img


def apply_lighting(img, gamma: float = 0.4):
    if img is None:
        return None
    inv = 1.0 / gamma
    table = np.array([(i / 255.0) ** inv * 255 for i in range(256)]).astype("uint8")
    return cv2.LUT(img, table)


def apply_mole(img):
    pts = get_landmarks(img)
    if pts is None:
        return None
    img = img.copy()
    cv2.circle(img, tuple(pts[14]), 5, (20, 15, 10), -1)
    return img


def apply_burn(img):
    pts = get_landmarks(img)
    if pts is None:
        return None
    img = img.copy()
    x, y = pts[2]
    noise = np.random.randint(80, 160, (60, 60, 3), dtype=np.uint8)
    x1, y1 = max(0, x - 30), max(0, y - 30)
    x2, y2 = min(img.shape[1], x + 30), min(img.shape[0], y + 30)
    patch = img[y1:y2, x1:x2]
    n = noise[: patch.shape[0], : patch.shape[1]]
    img[y1:y2, x1:x2] = cv2.addWeighted(patch, 0.5, n, 0.5, 0)
    return img


def apply_expression(img):
    if img is None:
        return None
    h, w = img.shape[:2]
    src = np.float32([[0, 0], [w, 0], [0, h], [w, h]])
    dst = np.float32([[0, 0], [w, 0], [int(w * 0.05), h], [int(w * 0.95), h]])
    M = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(img, M, (w, h))


PERTURBATIONS = {
    "glasses":    apply_glasses,
    "beard":      apply_beard,
    "lighting":   apply_lighting,
    "mole":       apply_mole,
    "burn":       apply_burn,
    "expression": apply_expression,
}