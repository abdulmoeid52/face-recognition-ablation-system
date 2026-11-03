"""Tune cosine threshold + report TAR@FAR on LFW.

This is the "training" step — the output is the number you put in config.yaml.
"""
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from sklearn.metrics import roc_curve, roc_auc_score
from tqdm import tqdm

from src.embeddings import get_embedding_path
from src.verify import cosine_sim

LFW = Path(__file__).resolve().parent.parent / "data" / "lfw-funneled"
N_IDENTITIES = 200


def main():
    if not LFW.exists():
        print(f"LFW not found at {LFW}. Run scripts/download_lfw.py first.")
        return

    people = [p for p in LFW.iterdir() if p.is_dir()]
    people = [p for p in people if len(list(p.glob("*.jpg"))) >= 2]
    if len(people) < 2:
        print("Not enough identities in LFW.")
        return

    random.seed(42)
    sample = random.sample(people, min(N_IDENTITIES, len(people)))

    scores, labels = [], []

    for person in tqdm(sample, desc="same-pairs"):
        imgs = list(person.glob("*.jpg"))
        ea = get_embedding_path(str(imgs[0]))
        eb = get_embedding_path(str(imgs[1]))
        if ea is None or eb is None:
            continue
        scores.append(cosine_sim(ea, eb))
        labels.append(1)

    for _ in tqdm(range(len(scores)), desc="diff-pairs"):
        p1, p2 = random.sample(sample, 2)
        ea = get_embedding_path(str(next(p1.glob("*.jpg"))))
        eb = get_embedding_path(str(next(p2.glob("*.jpg"))))
        if ea is None or eb is None:
            continue
        scores.append(cosine_sim(ea, eb))
        labels.append(0)

    if len(set(labels)) < 2:
        print("Not enough valid pairs to compute ROC.")
        return

    fpr, tpr, thr = roc_curve(labels, scores)
    auc = roc_auc_score(labels, scores)
    best_idx = int(np.argmax(tpr - fpr))
    idx_1 = min(int(np.searchsorted(fpr, 0.01)), len(tpr) - 1)

    print("\n=== LFW verification results ===")
    print(f"pairs evaluated : {len(scores)}")
    print(f"AUC             : {auc:.4f}")
    print(f"TAR@FAR=0.01    : {tpr[idx_1]:.4f}  (thr {thr[idx_1]:.4f})")
    print(f"Youden threshold: {thr[best_idx]:.4f}  "
          f"(TAR {tpr[best_idx]:.4f}, FAR {fpr[best_idx]:.4f})")
    print(f"\n→ Put this in config.yaml:  threshold: {thr[best_idx]:.3f}")


if __name__ == "__main__":
    main()