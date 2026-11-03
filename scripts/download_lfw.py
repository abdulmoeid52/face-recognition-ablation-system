"""Download LFW funneled (for offline ablation study only)."""
import tarfile
import urllib.request
from pathlib import Path

URL = "http://vis-www.cs.umass.edu/lfw/lfw-funneled.tgz"
ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "data"
EXTRACT = DEST / "lfw-funneled"


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    if EXTRACT.exists():
        print(f"Already extracted: {EXTRACT}")
        return
    tgz = DEST / "lfw-funneled.tgz"
    if not tgz.exists():
        print("Downloading LFW (~233 MB) …")
        urllib.request.urlretrieve(URL, tgz)
    print("Extracting …")
    with tarfile.open(tgz, "r:gz") as tar:
        tar.extractall(DEST)
    print(f"Done: {EXTRACT}")


if __name__ == "__main__":
    main()