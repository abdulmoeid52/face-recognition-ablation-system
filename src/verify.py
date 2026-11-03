import numpy as np
from scipy.spatial.distance import cosine


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(1.0 - cosine(a, b))


def cosine_dist(a: np.ndarray, b: np.ndarray) -> float:
    return float(cosine(a, b))


def is_match(a, b, threshold: float) -> bool:
    return cosine_sim(a, b) >= threshold


def tar_at_far(scores, labels, far_target: float = 0.01):
    from sklearn.metrics import roc_curve
    fpr, tpr, thr = roc_curve(labels, scores)
    idx = min(int(np.searchsorted(fpr, far_target)), len(tpr) - 1)
    return float(tpr[idx]), float(thr[idx])