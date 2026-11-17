#!/usr/bin/env python3
"""Build a 5x10 contact sheet of the 50 level illustrations.

  python3 scripts/contact_sheet.py --package p2
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PACKAGES = {
    "p1": ROOT / "static" / "art" / "levels",
    "p2": ROOT / "static" / "art" / "p2" / "levels",
    "p3": ROOT / "static" / "art" / "p3" / "levels",
}
OUT = ROOT / "candidates"
THUMB = (240, 135)
COLS = 5
ROWS = 10
LABEL = 22


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--package", choices=sorted(PACKAGES), default="p1")
    args = parser.parse_args()
    art = PACKAGES[args.package]
    out = OUT / f"contact-sheet-{args.package}.png"

    sheet = Image.new("RGB", (COLS * THUMB[0], ROWS * (THUMB[1] + LABEL)), "#fdf6e9")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for index in range(1, 51):
        path = art / f"l{index:02}.webp"
        if not path.exists():
            continue
        col = (index - 1) % COLS
        row = (index - 1) // COLS
        x = col * THUMB[0]
        y = row * (THUMB[1] + LABEL)
        with Image.open(path) as image:
            image = image.convert("RGB").resize(THUMB)
            sheet.paste(image, (x, y))
        draw.text((x + 6, y + THUMB[1] + 4), f"Level {index}", fill="#4a3b2f", font=font)

    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
