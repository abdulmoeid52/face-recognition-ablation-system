"""Capture 10 images per identity from webcam → data/gallery/<name>/.

NOTE: requires `opencv-python` (not headless) for cv2.imshow.
If you installed `opencv-python-headless`, run:
    pip install --force-reinstall opencv-python
first.
"""
import cv2
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GALLERY = ROOT / "data" / "gallery"


def main():
    name = input("Person name: ").strip()
    if not name:
        print("aborted")
        return
    out = GALLERY / name
    out.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Could not open webcam")
        return

    count = 0
    print("SPACE = capture, ESC = quit. Target: 10 images.")
    while count < 10:
        ok, frame = cap.read()
        if not ok:
            break
        cv2.putText(frame, f"{name}  {count}/10", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        cv2.imshow("capture", frame)
        k = cv2.waitKey(1) & 0xFF
        if k == 32:
            cv2.imwrite(str(out / f"{count:02d}.jpg"), frame)
            count += 1
        elif k == 27:
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"Saved {count} images to {out}")


if __name__ == "__main__":
    main()