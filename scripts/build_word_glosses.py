#!/usr/bin/env python3
"""Build the image-prompt gloss for every word from the reviewed translations."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRANSLATIONS = ROOT / "scripts" / "word_translations.json"
OUT = ROOT / "scripts" / "word_glosses.json"

COLORS = {
    "red": "a solid red paint swatch",
    "blue": "a solid blue paint swatch",
    "green": "a solid green paint swatch",
    "yellow": "a solid yellow paint swatch",
    "white": "a solid white paint swatch",
    "black": "a solid black paint swatch",
    "orange": "a solid orange paint swatch",
    "pink": "a solid pink paint swatch",
    "purple": "a solid purple paint swatch",
    "brown": "a solid brown paint swatch",
    "grey": "a solid grey paint swatch",
    "gray": "a solid grey paint swatch",
}

# Keyed locale:level:index. These replace the bilingual default when the
# literal translation is abstract, ambiguous, or grammatically awkward.
OVERRIDES = {
    # English
    "en:22:2": "a glowing street lamp",
    "en:28:2": "a painter holding a paintbrush",
    "en:29:2": "a paper shopping receipt",
    "en:30:1": "a train platform",
    "en:30:2": "a suitcase and a travel bag",
    "en:31:1": "swirling wind lines",
    "en:31:2": "a storm cloud with lightning",
    "en:35:2": "a mountain peak",
    "en:37:0": "a single water drop",
    "en:38:0": "a long shadow on the ground",
    "en:38:1": "a clock showing midnight",
    "en:39:0": "the sun setting behind hills",
    "en:39:1": "a solar eclipse",
    "en:39:2": "a crescent moon",
    "en:40:0": "spring flowers blooming",
    "en:40:1": "a sunny summer meadow",
    "en:40:2": "a snowy winter tree",
    "en:45:0": "a splash of paint",
    "en:47:0": "children running a race",
    "en:47:1": "a child swimming",
    "en:47:2": "a child jumping",
    "en:49:2": "a birthday party table",
    "en:50:1": "a colorful festival tent",
    "en:50:2": "a parade with flags",
    # Romanian
    "ro:12:2": "cioară (a crow)",
    "ro:18:2": "bujor (a peony flower)",
    "ro:19:1": "salcâm (an acacia tree)",
    "ro:30:1": "peroane (train platforms)",
    "ro:31:1": "vânt (swirling wind lines)",
    "ro:37:2": "umed (wet splashes)",
    "ro:38:1": "visuri (dream clouds above a sleeping child)",
    "ro:39:1": "lumină (a glowing light bulb)",
    "ro:40:0": "caniculă (a blazing summer sun)",
    "ro:45:0": "penel (a paintbrush)",
    "ro:47:0": "înot (a child swimming)",
    "ro:47:1": "cursa (children running a race)",
    "ro:47:2": "salt (a child jumping)",
    "ro:49:2": "zâmbet (a smiling face)",
    "ro:50:1": "bucurie (a happy child)",
    # Italian
    "it:6:2": "maglia (a sweater)",
    "it:27:1": "cura (a medicine bottle)",
    "it:29:2": "sconto (a sale price tag)",
    "it:30:0": "binario (a train platform)",
    "it:31:0": "vento (swirling wind lines)",
    "it:38:1": "sonno (a sleeping child)",
    "it:39:2": "eclissi (a solar eclipse)",
    "it:40:0": "estate (a sunny summer meadow)",
    "it:40:1": "autunno (autumn leaves)",
    "it:40:2": "inverno (a snowy winter tree)",
    "it:45:0": "colore (colorful paint splashes)",
    "it:45:2": "arte (an artist's palette)",
    "it:47:0": "corsa (children running a race)",
    "it:47:1": "nuoto (a child swimming)",
    "it:47:2": "salto (a child jumping)",
    "it:50:0": "allegria (a happy child)",
    "it:50:2": "fuochi (colorful fireworks)",
    # German
    "de:5:2": "würfel (a wooden cube block)",
    "de:10:0": "träume (dream clouds above a sleeping child)",
    "de:23:0": "kuchen (a loaf cake)",
    "de:23:1": "torte (a layered cake)",
    "de:31:0": "regen (rain falling from a cloud)",
    "de:36:1": "flocke (a snowflake)",
    "de:39:1": "gestirn (a constellation of stars)",
    "de:44:2": "takt (a drum with beat lines)",
    "de:45:0": "farbe (colorful paint splashes)",
    "de:47:0": "lauf (a child running)",
    "de:47:1": "sprung (a child jumping)",
    "de:47:2": "rennen (children running a race)",
    "de:50:0": "freude (a happy child)",
    "de:50:2": "tanzen (children dancing)",
    # Russian
    "ru:27:2": "укол (a syringe)",
    "ru:29:1": "касса (a checkout counter)",
    "ru:35:2": "вершина (a mountain summit)",
    "ru:38:1": "сияние (a glowing star)",
    "ru:38:2": "тёмнота (a dark night sky)",
    "ru:40:0": "капель (melting icicles dripping)",
    "ru:43:2": "цирк (a circus tent)",
    "ru:44:2": "ритм (musical notes and a beat)",
    "ru:47:0": "бегун (a child running)",
    "ru:47:1": "прыжок (a child jumping)",
    "ru:47:2": "ворота (a football goal)",
    "ru:48:2": "багаж (a suitcase and travel bag)",
    "ru:50:1": "танцор (a child dancing)",
    "ru:50:2": "хоровод (children in a circle dance)",
}


def main() -> None:
    content = json.loads((ROOT / "scripts" / "content.json").read_text())
    translations = json.loads(TRANSLATIONS.read_text())
    glosses: dict[str, str] = {}

    for locale in ["en", "ro", "it", "de", "ru"]:
        for level in content[locale]["levels"]:
            for index, entry in enumerate(level["words"]):
                key = f"{locale}:{level['id']}:{index}"
                word = entry["word"]
                translation = translations[key]
                if key in OVERRIDES:
                    glosses[key] = OVERRIDES[key]
                elif translation in COLORS:
                    glosses[key] = COLORS[translation]
                elif locale == "en":
                    glosses[key] = translation
                else:
                    glosses[key] = f"{word.lower()} ({translation})"

    OUT.write_text(json.dumps(glosses, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {len(glosses)} glosses to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
