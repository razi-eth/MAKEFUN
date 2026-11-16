"""ai-excited-01 entry: write the entry image to /output/entry.png.

The entry image lives in this repository as entry.jpg. This program copies
it to the competition output path. Standard library only, no network.
"""

import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "entry.jpg")
DEST_DIR = "/output"
DEST = os.path.join(DEST_DIR, "entry.png")


def main():
    if not os.path.isfile(SOURCE):
        raise FileNotFoundError(f"entry image not found: {SOURCE}")
    os.makedirs(DEST_DIR, exist_ok=True)
    try:
        shutil.copyfile(SOURCE, DEST)
    except OSError as exc:
        raise RuntimeError(f"failed to write {DEST}: {exc}") from exc
    if os.path.getsize(DEST) != os.path.getsize(SOURCE):
        raise RuntimeError(f"size mismatch after copy: {DEST}")
    print(f"wrote {DEST} ({os.path.getsize(DEST)} bytes)")


if __name__ == "__main__":
    main()
