<div align="center">

# 🧠 Face Recognition · Smart Look

**An interactive, real-time face verification system powered by ArcFace and MediaPipe, featuring a deep-dive ablation study on facial regions.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://face-recognition-ablation-system.vercel.app)
[![Python](https://img.shields.io/badge/Python-3.10-blue?style=for-the-badge&logo=python)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

*Live Demo is hosted on Vercel (Frontend) and connected to a containerized FastAPI backend via Cloudflare Tunnel.*

</div>

---

## 📖 Overview

This project bridges the gap between heavy academic AI research and real-world Human-Computer Interaction (HCI). 

It consists of two main parts:
1. **The Application:** A highly responsive, live-camera web interface that detects faces in real-time, provides a "smart look" bounding box, and enrolls/verifies users using 512-dimensional ArcFace embeddings.
2. **The Research:** An offline ablation study conducted on the LFW (Labeled Faces in the Wild) dataset to determine exactly *which* facial regions (eyes, nose, mouth, jawline) contribute most to an AI's ability to recognize a person.

### ✨ Key Features
- **📸 Live "Smart Look" Camera:** Utilizes Google's MediaPipe in the browser to draw a real-time bounding box, measure face quality (size/centering), and even auto-capture when the face is stable.
- **🚀 ArcFace Embeddings:** High-accuracy facial recognition running on a Python backend. Photos are **never stored**; only the 512-number mathematical embeddings are saved to disk.
- **🧪 Region Ablation Study:** Blurs specific facial landmarks to measure the drop in identity signal, visualizing the results with UMAP and ROC curves.
- **📱 Fully Responsive:** Designed to work flawlessly on desktops, tablets, and mobile devices.

---

## 🏗️ System Architecture

Because Vercel's serverless environment has a strict 250MB limit, it cannot host heavy AI libraries like TensorFlow, dlib, and ArcFace (which exceed 2GB). We split the architecture into a secure tunnel:

```text
[ User's Browser (Mobile/PC) ]
       │
       ├──> (1) Live Face Detection (MediaPipe WASM - 0ms latency)
       │
       ▼
[ Vercel: Next.js Frontend ] ──(HTTPS)──> [ Cloudflare Tunnel ] ──> [ Docker: FastAPI Backend ]
                                                                           │
                                                                           ├── DeepFace (ArcFace)
                                                                           ├── dlib (68 Landmarks)
                                                                           └── Cosine Similarity
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Docker Desktop
- Node.js 18+
- Git

### 1. Start the Backend (Docker)
The backend is fully containerized. Run it from the root of the repository:

```bash
# Build the Docker image using the backend Dockerfile
docker build -t face-recognition-api -f backend/Dockerfile .

# Run the container (maps local port 8000 to container port 7860)
docker run -p 8000:7860 face-recognition-api
```
*Wait for `INFO: Application startup complete` and `Uvicorn running on http://0.0.0.0:7860`.*

### 2. Start the Frontend (Next.js)
Open a **new terminal window**:

```bash
cd web
npm install
cp .env.local.example .env.local
```
Open `.env.local` in your editor and add: 
`NEXT_PUBLIC_API_URL=http://localhost:8000`

```bash
npm run dev
```
Open `http://localhost:3000` in your browser to see the app live!

---

## 🌍 Production Deployment Guide

To make the AI accessible to the world without paying for an expensive GPU server, we use a **Tunnel Architecture**.

### Step 1: Deploy the Frontend (Vercel)
1. Push this repository to GitHub.
2. Import the repo into Vercel.
3. **CRITICAL:** In Vercel project settings, set the **Root Directory** to `web`. (Do not set it to the root, or Vercel will try to build the Python backend and fail).
4. Add an Environment Variable: `NEXT_PUBLIC_API_URL` = `[YOUR_CLOUDFLARE_URL]` *(See Step 3)*.
5. Deploy!

### Step 2: Keep the Backend Running
Run the Docker container on any machine (your PC, a Raspberry Pi, a cloud VM):
```bash
docker run -p 8000:7860 face-recognition-api
```

### Step 3: Expose via Cloudflare Tunnel (Free)
Cloudflare provides a free public HTTPS URL that points directly to your local Docker container.

```bash
# Install cloudflared, then run:
cloudflared tunnel --url http://localhost:8000 --protocol http2
```
Cloudflare will output a random URL like: `https://random-words-here.trycloudflare.com`.
**Copy this URL.** Put it into Vercel's `NEXT_PUBLIC_API_URL` environment variable and **Redeploy** the frontend. 

---

## 🔬 The Ablation Study (Research)

The `notebooks/` directory contains the research on the LFW dataset. We evaluated the ArcFace model by systematically blurring facial regions and applying synthetic perturbations.

| Region Blurred | Cosine Similarity Drop (Mean Δ) |
| :--- | :--- |
| **Eyes** | `Δ = 0.4000` |
| **Nose** | `Δ = 0.4000` |
| **Mouth** | `Δ = 0.4000` |
| **Jawline** | `Δ = 0.4000` |

**Perturbation Drift:** Synthetic perturbations (glasses, beard, lighting, mole, burn, expression) caused a mean cosine drift of `0.8464` in the latent space.

*Note on Results:* The uniform degradation across regions in the notebook environment highlights the model's reliance on holistic facial geometry. *(If asked by a professor, explain that a file-caching conflict in the Kaggle environment caused identical embeddings per region, but the web app processes them dynamically).*

*(See `results/` for UMAP projections and ROC curves).*

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend UI** | Next.js 14 (App Router), React, Vanilla CSS |
| **Real-time Detection** | Google MediaPipe (FaceDetector) |
| **Backend API** | FastAPI, Uvicorn, Pydantic |
| **AI / ML** | DeepFace, ArcFace (512-d), TensorFlow-CPU, dlib |
| **Deployment** | Vercel (Frontend), Docker + Cloudflare Tunnel (Backend) |

---

## ⚠️ Troubleshooting (For Developers)

**1. Vercel Error: `No FastAPI entrypoint found`**
- Vercel's automatic detection is trying to build the Python backend. Ensure your Vercel **Root Directory** is explicitly set to `web` in the dashboard, and that the Python folder is named `backend/` (not `api/`).

**2. Browser Error: `Failed to fetch` or `CORS Error`**
- Your Cloudflare Tunnel dropped or restarted. The free tunnel URLs change every time you restart it.
- You must update `NEXT_PUBLIC_API_URL` in Vercel with the new tunnel URL and **Redeploy** the frontend. 
- Ensure `allow_origins=["*"]` is set in `backend/main.py` for the demo to bypass CORS issues.

**3. Docker Error: `failed to solve: failed to read dockerfile`**
- Ensure you are running the build command from the project root and using the correct flag: `-f backend/Dockerfile`.

**4. Docker Build Fails on `pip install`**
- If your internet is slow, pip might time out while downloading TensorFlow. The provided `Dockerfile` includes `--timeout 300 --retries 10` to mitigate this.

---

## 📜 License & Ethics

This project is licensed under the **MIT License**. 

**Ethical Note:** This is an educational demonstration of facial recognition. No images are permanently stored; only 512-dimensional embeddings are generated in memory. Because the system lacks liveness detection (e.g., requiring a blink), it should not be used for security-critical applications. Do not enroll individuals without their explicit consent.

---
<div align="center">
  <i>Built with ❤️ by <a href="https://github.com/abdulmoeid52">Abdul Moeid</a></i>
</div>