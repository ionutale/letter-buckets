#!/usr/bin/env python3
"""Generate one 256x256 paper-cut clue image per word entry.

Run with the FLUX studio venv:
  flux2-klein-mlx-studio/.venv/bin/python scripts/generate_word_art.py --all
  flux2-klein-mlx-studio/.venv/bin/python scripts/generate_word_art.py --package p2 --all
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))

from atomic_write import atomic_replace, temp_sibling  # noqa: E402

GLOSSES = ROOT / "scripts" / "word_glosses.json"

PACKAGES = {
    "p1": {
        "content": ROOT / "scripts" / "content.json",
        "out": ROOT / "static" / "art" / "words",
    },
    "p2": {
        "content": ROOT / "scripts" / "content.p2.json",
        "out": ROOT / "static" / "art" / "p2" / "words",
    },
    "p3": {
        "content": ROOT / "scripts" / "content.p3.json",
        "out": ROOT / "static" / "art" / "p3" / "words",
    },
}

STEPS = 6
SIZE = 256
GUIDANCE = 1.0
STYLE = (
    "Soft cut-paper storybook icon of {word}, one clear centered subject, colorful "
    "layered paper cutout, warm cream background, rounded simple shapes, muted sage "
    "ochre and berry palette, gentle light, no text, no letters, no people, no extra objects"
)


def load_model():
    from mflux.models.common.config import ModelConfig
    from mflux.models.flux2.variants import Flux2Klein

    print("loading FLUX.2-klein 4B…", flush=True)
    return Flux2Klein(model_config=ModelConfig.flux2_klein_4b())


def gloss_subject(
    package: str, locale: str, level: dict, index: int, entry: dict, glosses: dict
) -> str | None:
    """The image subject for one word.

    Package 1 keeps the original key so its existing glosses still apply, and
    may fall back to the word itself. Packages 2 and 3 are namespaced: a missing
    key must stop the run instead of borrowing Package 1's subject for a
    different word.
    """
    key = f"{package}:{locale}:{level['id']}:{index}"
    if package == "p1":
        legacy = f"{locale}:{level['id']}:{index}"
        return glosses.get(key, glosses.get(legacy, entry["word"].lower()))
    return glosses.get(key)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--locale", default="")
    parser.add_argument("--only", default="", help="comma-separated level numbers")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--package", choices=sorted(PACKAGES), default="p1")
    args = parser.parse_args()
    if not args.all:
        parser.error("choose --all")

    content = json.loads(PACKAGES[args.package]["content"].read_text())
    out = PACKAGES[args.package]["out"]
    glosses = json.loads(GLOSSES.read_text()) if GLOSSES.exists() else {}
    locales = [args.locale] if args.locale else list(content)
    only = {int(part) for part in args.only.split(",") if part.strip()}

    # Everything the run could draw, before the model is loaded: existing output
    # is skipped unless --force, and a run with nothing to do fails instead of
    # reporting "done: 0 images" as success.
    targets = []
    for locale in locales:
        for level in content[locale]["levels"]:
            if only and level["id"] not in only:
                continue
            for index, entry in enumerate(level["words"]):
                output = out / locale / f"l{level['id']:02}-w{index + 1}.webp"
                if output.exists() and not args.force:
                    continue
                targets.append((locale, level, index, entry, output))
    if not targets:
        raise SystemExit(
            "nothing to generate: all selected images already exist (use --force to redraw them)"
        )

    missing = []
    for locale, level, index, entry, _ in targets:
        key = f"{args.package}:{locale}:{level['id']}:{index}"
        if gloss_subject(args.package, locale, level, index, entry, glosses) is None:
            missing.append(key)
    if missing:
        raise SystemExit(
            f"{len(missing)} gloss(es) missing, e.g. {missing[:5]}; "
            "run scripts/build_word_glosses.py"
        )

    target = len(targets)
    model = load_model()
    total = 0
    started = time.time()

    for locale, level, index, entry, output in targets:
        subject = gloss_subject(args.package, locale, level, index, entry, glosses)
        prompt = STYLE.format(word=subject)
        seed = level["id"] * 1000 + index + 41
        image = model.generate_image(
            seed=seed,
            prompt=prompt,
            num_inference_steps=STEPS,
            width=SIZE,
            height=SIZE,
            guidance=GUIDANCE,
        )
        png = temp_sibling(output.with_suffix(".png"))
        try:
            image.save(path=str(png), export_json_metadata=False, overwrite=True)
            from PIL import Image

            # The WebP is the published asset, so it is renamed into
            # place only once PIL has finished encoding it.
            with atomic_replace(output) as temp:
                with Image.open(png) as opened:
                    opened.convert("RGB").save(temp, "WEBP", quality=80)
        finally:
            png.unlink(missing_ok=True)
        total += 1
        elapsed = time.time() - started
        rate = elapsed / total
        remaining = (target - total) * rate
        print(
            f"{output.relative_to(ROOT)}  {total}/{target}  "
            f"{rate:.1f}s/img  ~{remaining / 60:.0f} min left",
            flush=True,
        )
    print(f"done: {total}/{target} images in {(time.time() - started) / 60:.1f} min")
    return 0


if __name__ == "__main__":
    sys.exit(main())
