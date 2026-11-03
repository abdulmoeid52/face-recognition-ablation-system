# Face Recognition Ablation Study

> Which part of a face does a face-recognition model actually use?
> This project blurs each facial region and measures the identity-signal drop,
> then ships the pipeline as a deployed verify web app.

**Frontend (Vercel):** https://your-app.vercel.app
**API (HF Spaces):** https://your-username-face-recog.hf.space

## Results

| Region  | Mean cosine drop |
|---------|------------------|
| eyes    | Δ = __           |
| nose    | Δ = __           |
| mouth   | Δ = __           |
| jawline | Δ = __           |

(From `notebooks/01_ablation_blur.ipynb`, N identities on LFW.)

## Pipeline
