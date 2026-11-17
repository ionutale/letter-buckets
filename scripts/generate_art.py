#!/usr/bin/env python3
"""Generate the 50 level illustrations with the same mflux FLUX.2-klein
pipeline as the local FLUX studio.

Run with the studio venv:
  flux2-klein-mlx-studio/.venv/bin/python scripts/generate_art.py --style-check
  flux2-klein-mlx-studio/.venv/bin/python scripts/generate_art.py --all
  flux2-klein-mlx-studio/.venv/bin/python scripts/generate_art.py --package p2 --all
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))

from atomic_write import atomic_replace  # noqa: E402

CANDIDATES = ROOT / "candidates"
ART = ROOT / "static" / "art" / "levels"
THEMES = ROOT / "scripts" / "themes.json"

PACKAGES = {
    "p1": {"themes": ROOT / "scripts" / "themes.json", "art": ROOT / "static" / "art" / "levels"},
    "p2": {"themes": ROOT / "scripts" / "themes.p2.json", "art": ROOT / "static" / "art" / "p2" / "levels"},
    "p3": {"themes": ROOT / "scripts" / "themes.p3.json", "art": ROOT / "static" / "art" / "p3" / "levels"},
}

WIDTH = 1024
HEIGHT = 576
STEPS = 4
GUIDANCE = 1.0

STYLE_TAIL = (
    "warm cream background, rounded simple shapes, muted sage ochre and berry palette, "
    "gentle warm light, centered vignette, child-friendly, cozy, no text, no letters, "
    "no words, no signs, no photorealistic faces"
)

VARIANTS = [
    (
        "layered-paper",
        "Soft cut-paper storybook illustration of {scene}, visible layered paper edges, "
        "soft shadows, " + STYLE_TAIL,
    ),
    (
        "soft-gouache",
        "Gentle gouache picture-book illustration of {scene}, painted texture, rounded "
        "brush shapes, no hard outline, " + STYLE_TAIL,
    ),
    (
        "flat-vector",
        "Clean flat vector storybook illustration of {scene}, thick rounded shapes, "
        "limited palette, subtle paper grain, " + STYLE_TAIL,
    ),
]

STYLE_SCENES = [
    "a cozy pet corner with a cat, a dog and a little fish bowl",
]


def load_model():
    from mflux.models.common.config import ModelConfig
    from mflux.models.flux2.variants import Flux2Klein

    print("loading FLUX.2-klein 4B…", flush=True)
    return Flux2Klein(model_config=ModelConfig.flux2_klein_4b())


def generate(model, prompt: str, seed: int, png: Path) -> None:
    print(f"  seed {seed}: {prompt[:90]}…", flush=True)
    image = model.generate_image(
        seed=seed,
        prompt=prompt,
        num_inference_steps=STEPS,
        width=WIDTH,
        height=HEIGHT,
        guidance=GUIDANCE,
    )
    png.parent.mkdir(parents=True, exist_ok=True)
    image.save(path=str(png), export_json_metadata=False, overwrite=True)


def to_webp(png: Path, webp: Path) -> None:
    from PIL import Image

    webp.parent.mkdir(parents=True, exist_ok=True)
    # Encode into a hidden sibling first: an interrupted run leaves the
    # previous level image in place instead of a truncated WebP.
    with atomic_replace(webp) as temp:
        with Image.open(png) as image:
            image = image.convert("RGB").resize((768, 432), Image.LANCZOS)
            image.save(temp, "WEBP", quality=80)
    png.unlink(missing_ok=True)


def style_check(model) -> None:
    scene = STYLE_SCENES[0]
    for index, (name, template) in enumerate(VARIANTS, start=1):
        prompt = template.format(scene=scene)
        png = CANDIDATES / f"style-{index}-{name}.png"
        generate(model, prompt, seed=1000 + index, png=png)
        print(f"wrote {png}", flush=True)


def load_themes(package: str) -> list[str]:
    path = PACKAGES[package]["themes"]
    if not path.exists():
        raise SystemExit(f"{path.name} missing; run `pnpm content:export` first")
    return json.loads(path.read_text())


def generate_all(model, package: str, only: set[int] | None, force: bool) -> None:
    themes = load_themes(package)
    if len(themes) != 50:
        raise SystemExit(f"expected 50 themes, found {len(themes)}")
    art = PACKAGES[package]["art"]

    for index, scene in enumerate(themes, start=1):
        if only and index not in only:
            continue
        webp = art / f"l{index:02}.webp"
        if webp.exists() and not force:
            print(f"skip {webp.name}", flush=True)
            continue
        prompt = VARIANTS[0][1].format(scene=scene)
        png = CANDIDATES / f"l{index:02}.png"
        generate(model, prompt, seed=index * 1000 + 1, png=png)
        to_webp(png, webp)
        print(f"wrote {webp}", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--style-check", action="store_true")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--only", default="")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--package", choices=sorted(PACKAGES), default="p1")
    args = parser.parse_args()

    if not args.style_check and not args.all:
        parser.error("choose --style-check or --all")

    only = {int(part) for part in args.only.split(",") if part.strip()}
    model = load_model()
    if args.style_check:
        style_check(model)
    if args.all:
        generate_all(model, args.package, only or None, args.force)
    return 0


def shutil_which(name: str) -> str | None:
    from shutil import which

    return which(name)


if __name__ == "__main__":
    sys.exit(main())
