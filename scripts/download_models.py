"""Download dlib 68-point landmark model."""
import bz2
import urllib.request
from pathlib import Path

URL = (
    "https://github.com/davisking/dlib-models/"
    "raw/master/shape_predictor_68_face_landmarks.dat.bz2"
)
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "models" / "shape_predictor_68_face_landmarks.dat"


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        print(f"Exists: {OUT}")
        return
    tmp = OUT.with_suffix(".dat.bz2")
    print(f"Downloading to {tmp} …")
    urllib.request.urlretrieve(URL, tmp)
    print("Decompressing …")
    with bz2.open(tmp, "rb") as fin, open(OUT, "wb") as fout:
        fout.write(fin.read())
    tmp.unlink()
    print(f"Saved: {OUT} ({OUT.stat().st_size // 1024 // 1024} MB)")


if __name__ == "__main__":
    main()