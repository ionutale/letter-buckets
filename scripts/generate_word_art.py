#!/usr/bin/env python3
"""Generate one 256x256 paper-cut clue image per word entry.

Run with the FLUX studio venv:
  flux2-klein-mlx-studio/.venv/bin/python scripts/generate_word_art.py --all
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "scripts" / "content.json"
OUT = ROOT / "static" / "art" / "words"

STEPS = 4
SIZE = 256
GUIDANCE = 1.0
STYLE = (
    "Soft cut-paper storybook icon of a single {word}, colorful layered paper cutout, "
    "centered, warm cream background, rounded simple shapes, muted sage ochre and berry "
    "palette, gentle light, no text, no letters, no people, no extra objects"
)


def load_model():
    from mflux.models.common.config import ModelConfig
    from mflux.models.flux2.variants import Flux2Klein

    print("loading FLUX.2-klein 4B…", flush=True)
    return Flux2Klein(model_config=ModelConfig.flux2_klein_4b())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--locale", default="")
    parser.add_argument("--only", default="", help="comma-separated level numbers")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if not args.all:
        parser.error("choose --all")

    content = json.loads(CONTENT.read_text())
    locales = [args.locale] if args.locale else list(content)
    only = {int(part) for part in args.only.split(",") if part.strip()}
    model = load_model()
    total = 0
    started = time.time()

    for locale in locales:
        for level in content[locale]["levels"]:
            if only and level["id"] not in only:
                continue
            for index, entry in enumerate(level["words"]):
                output = OUT / locale / f"l{level['id']:02}-w{index + 1}.webp"
                if output.exists() and not args.force:
                    continue
                prompt = STYLE.format(word=entry["word"].lower())
                seed = level["id"] * 1000 + index + 41
                image = model.generate_image(
                    seed=seed,
                    prompt=prompt,
                    num_inference_steps=STEPS,
                    width=SIZE,
                    height=SIZE,
                    guidance=GUIDANCE,
                )
                png = output.with_suffix(".png")
                output.parent.mkdir(parents=True, exist_ok=True)
                image.save(path=str(png), export_json_metadata=False, overwrite=True)
                from PIL import Image

                with Image.open(png) as opened:
                    opened.convert("RGB").save(output, "WEBP", quality=80)
                png.unlink(missing_ok=True)
                total += 1
                elapsed = time.time() - started
                rate = elapsed / total
                remaining = (750 - total) * rate
                print(
                    f"{output.relative_to(ROOT)}  {total}/750  "
                    f"{rate:.1f}s/img  ~{remaining / 60:.0f} min left",
                    flush=True,
                )
    print(f"done: {total} images in {(time.time() - started) / 60:.1f} min")
    return 0


if __name__ == "__main__":
    sys.exit(main())
