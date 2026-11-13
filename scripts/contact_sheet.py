#!/usr/bin/env python3
"""Build a 5x10 contact sheet of the 50 level illustrations."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "static" / "art" / "levels"
OUT = ROOT / "candidates" / "contact-sheet.png"
THUMB = (240, 135)
COLS = 5
ROWS = 10
LABEL = 22


def main() -> None:
    sheet = Image.new("RGB", (COLS * THUMB[0], ROWS * (THUMB[1] + LABEL)), "#fdf6e9")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for index in range(1, 51):
        path = ART / f"l{index:02}.webp"
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

    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
