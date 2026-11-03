FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TF_CPP_MIN_LOG_LEVEL=3 \
    DEEPFACE_HOME=/app/.deepface

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Updated to use the new backend folder
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir \
    --timeout 300 \
    --retries 10 \
    -r requirements.txt

COPY src ./src

# 2. Updated to copy the backend folder
COPY backend ./backend

COPY scripts/download_models.py ./scripts/download_models.py
COPY config.yaml ./config.yaml

RUN mkdir -p models data \
    && python scripts/download_models.py

EXPOSE 7860

# 3. Updated to point to backend.main:app
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]