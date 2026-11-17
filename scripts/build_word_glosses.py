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
    "it:46:0": "regina (a queen wearing a crown and a long dress)",
    "it:2:1": "latte (a bottle of milk)",
    "it:3:0": "seme (a small pile of sunflower seeds)",
    "it:6:2": "maglia (a sweater)",
    "it:27:1": "cura (a first aid kit)",
    "it:29:0": "moneta (a two euro coin with the number 2 in the center, silver ring and gold center)",
    "it:29:2": "sconto (a sale price tag)",
    "it:30:0": "binario (an empty train station platform with a yellow safety line)",
    "it:30:2": "stazione (a train station building with a clock)",
    "it:31:0": "vento (swirling wind lines)",
    "it:38:0": "notte (a dark night sky with a moon and many stars)",
    "it:38:1": "sonno (a sleeping child)",
    "it:38:2": "stelle (a sky full of many stars)",
    "it:39:1": "albore (dawn light over hills)",
    "it:39:2": "eclissi (a solar eclipse)",
    "it:40:0": "estate (a sunny summer meadow)",
    "it:40:1": "autunno (autumn leaves)",
    "it:40:2": "inverno (a snowy winter tree)",
    "it:45:0": "colore (colorful paint splashes)",
    "it:45:1": "quadro (a rectangular framed painting with a landscape inside)",
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

    # Review pass 2: objects the model drew as the wrong thing
    "en:2:1": "a slice of toasted bread",
    "en:3:0": "a small pile of seeds",
    "en:6:0": "a winter scarf",
    "en:8:2": "a shower head with water",
    "en:18:2": "a white daisy flower",
    "en:28:1": "a farmer wearing a straw hat",
    "en:31:0": "rain falling from a cloud",
    "en:32:0": "a blue sky with clouds",
    "en:34:2": "a smooth grey stone",
    "en:36:0": "a pile of snow with snowflakes",
    "en:45:2": "a lump of clay",
    "ro:7:1": "a father with a child on his shoulders",
    "ro:8:1": "a folded bath towel",
    "ro:16:0": "a pile of red apples",
    "ro:22:0": "a street with a sidewalk",
    "ro:22:1": "a road sign on a post",
    "ro:22:2": "a glowing light bulb",
    "ro:24:0": "a basket of mixed fruit",
    "ro:25:2": "a garden path",
    "ro:28:0": "a baker wearing a chef hat",
    "ro:28:2": "a builder with a brick wall",
    "ro:33:1": "a seashell",
    "ro:36:0": "a pile of snow with snowflakes",
    "ro:40:1": "a snowy winter tree",
    "ro:44:0": "a child singing with musical notes",
    "ro:45:1": "a lump of clay",
    "ro:45:2": "a child's drawing with crayons",
    "ro:50:0": "a board game with pieces",
    "it:7:1": "a father with a child on his shoulders",
    "it:8:0": "a plain bar of soap with bubbles",
    "it:8:2": "a yellow sponge with holes",
    "it:14:0": "a bee with yellow and black stripes",
    "it:22:0": "a street with a sidewalk",
    "it:22:1": "a road sign on a post",
    "it:22:2": "a glowing light bulb",
    "it:23:1": "a sandwich with cheese",
    "it:24:0": "a basket of mixed fruit",
    "it:25:0": "a green lawn with grass blades",
    "it:26:2": "a stick of white chalk",
    "it:28:0": "a cook wearing a chef hat",
    "it:33:0": "a pile of sand",
    "it:34:2": "a smooth grey stone",
    "it:36:0": "a pile of snow with snowflakes",
    "it:36:2": "freddo (snowflakes blowing in the wind)",
    "it:44:0": "a child singing with musical notes",
    "it:49:2": "a board game with pieces",
    "de:7:1": "a father with a child on his shoulders",
    "de:8:0": "a plain bar of soap with bubbles",
    "de:8:2": "a shower head with water",
    "de:24:0": "a basket of mixed fruit",
    "de:28:0": "a baker wearing a chef hat",
    "de:28:1": "a farmer wearing a straw hat",
    "de:29:0": "a small shop with an awning",
    "de:32:0": "a blue sky with clouds",
    "de:36:0": "a pile of snow with snowflakes",
    "de:39:2": "bright sun rays",
    "de:40:1": "a snowy winter tree",
    "de:50:1": "a festive holiday table",
    "ru:3:0": "a small pile of seeds",
    "ru:7:1": "a father with a child on his shoulders",
    "ru:8:2": "a yellow sponge with holes",
    "ru:22:2": "a glowing light bulb",
    "ru:24:0": "a basket of mixed fruit",
    "ru:28:0": "a baker wearing a chef hat",
    "ru:28:1": "a farmer wearing a straw hat",
    "ru:32:0": "a blue sky with clouds",
    "ru:33:0": "a pile of sand",
    "ru:34:1": "a smooth grey stone",
    "ru:36:0": "a pile of snow with snowflakes",
    "ru:38:2": "a dark night sky with stars",
    "ru:40:0": "melting icicles dripping",
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

    # Review pass 3: final QA of all five locale sheets
    # English
    "en:6:1": "a pair of socks",
    "en:16:2": "a purple plum fruit",
    "en:24:0": "a basket of mixed fruit",
    "en:30:1": "an empty train platform with a yellow safety line",
    "en:49:0": "a wrapped gift box with a ribbon and bow",
    # Romanian
    "ro:6:2": "a long striped winter scarf",
    "ro:9:0": "a cooking pot with two handles",
    "ro:10:1": "two pillows on a bed",
    "ro:12:1": "a blue jay bird",
    "ro:16:2": "a purple plum fruit",
    "ro:19:2": "a maple tree with broad leaves",
    "ro:23:1": "a ring-shaped pretzel bread",
    "ro:24:2": "three red tomatoes",
    "ro:29:0": "two woven baskets",
    "ro:29:1": "a bookcase with several shelves",
    "ro:30:0": "two paper tickets side by side",
    "ro:30:1": "an empty train platform with a yellow safety line",
    "ro:32:0": "a blue sky with clouds",
    "ro:38:0": "a dark night sky with a crescent moon and stars",
    "ro:38:2": "a night sky full of many stars",
    "ro:41:1": "a planet with rings and stars",
    "ro:45:2": "a child's crayon drawing of a house and a sun",
    "ro:48:0": "a folded paper map with a red route",
    "ro:49:1": "two frosted cakes side by side",
    "ro:50:0": "two board games with dice",
    "ro:50:2": "children dancing",
    # Italian
    "it:6:1": "a pair of shoes",
    "it:18:1": "a violet flower",
    "it:24:1": "several colorful flowers",
    "it:26:1": "a ballpoint pen",
    "it:28:2": "a man holding a theatrical mask",
    "it:30:1": "a steel railway rail on wooden sleepers",
    "it:32:0": "a blue sky with clouds",
    "it:41:2": "a planet with rings and stars",
    "it:48:0": "a folded paper map with a red route",
    "it:49:2": "a colorful board game with playing pieces and a dice",
    # German
    "de:3:0": "a small pile of brown sunflower seeds",
    "de:6:1": "a pair of socks",
    "de:6:2": "a pair of shoes",
    "de:9:2": "a metal spoon",
    "de:18:2": "a cluster of small purple crocus flowers",
    "de:20:1": "two young calves standing side by side",
    "de:21:2": "a steam locomotive with a passenger car",
    "de:22:2": "a glowing light bulb",
    "de:25:0": "a wooden park bench",
    "de:29:1": "two woven baskets",
    "de:30:1": "a train station building with a clock",
    "de:31:2": "a dark storm cloud with lightning",
    "de:38:0": "a dark night sky with a crescent moon and stars",
    "de:38:1": "a child sleeping in bed under a blanket",
    "de:38:2": "a night sky full of many stars",
    "de:44:0": "several colorful musical notes",
    "de:45:2": "a blank white artist canvas on a wooden easel",
    "de:48:0": "a folded paper map with a red route",
    "de:48:2": "a suitcase with a camera and a sun hat",
    "de:49:1": "colorful balloons and party bunting",
    # Russian
    "ru:13:2": "a badger with a striped face",
    "ru:29:1": "a cash register with a drawer and buttons",
    "ru:30:0": "two paper tickets side by side",
    "ru:30:1": "an empty train platform with a yellow safety line",
    "ru:30:2": "a train station building with a clock",
    "ru:31:2": "a dark storm cloud with lightning",
    "ru:35:1": "a tall grey rock cliff",
    "ru:38:2": "a dark night sky with a crescent moon and stars",
    "ru:41:2": "a planet with rings and stars",
    "ru:45:0": "colorful paint splashes",
    "ru:49:2": "two small round cakes with candles",
}


# Package 2 and 3 words are already bilingual in their content files; these
# replacements cover the ones a bare word renders badly.
PACKAGE_OVERRIDES = {
	"p2": {
		"10:0": "an open carton with packing tape",
		"10:2": "a house door with a number plate",
		"11:1": "a coiled fire hose",
		"12:2": "a police car with a flashing light",
		"13:1": "an x-ray picture of a hand",
		"18:1": "a supermarket aisle with shelves",
		"20:1": "a suitcase at a boarding gate",
		"23:1": "a television remote with buttons",
		"23:2": "a rooftop television antenna",
		"24:2": "a radio tuning dial",
		"25:1": "a spinning washing drum",
		"28:1": "a printer toner cartridge",
		"29:0": "a small electric motor",
		"29:1": "a small round sensor eye",
		"30:1": "a drone rotor blade",
		"37:2": "glowing magma cracks",
		"44:1": "an open treasure chest with coins",
		"49:1": "a pile of gold coins",
	},
	"p3": {
		"1:0": "a bright smiling face",
		"1:1": "a sad face with a teardrop",
		"1:2": "a calm face with closed eyes",
		"2:0": "a wide friendly smile",
		"2:1": "a pair of friendly eyes",
		"2:2": "a round button nose",
		"3:0": "two children holding hands",
		"3:1": "an apple cut in two halves",
		"3:2": "two teddy bears hugging",
		"4:0": "a chef hat and a wooden spoon",
		"4:1": "a bus steering wheel",
		"4:2": "a book and a pencil",
		"5:0": "a hand lifting a small box",
		"5:1": "a basket held in two hands",
		"5:2": "a broom and soap bubbles",
		"6:0": "a pair of dancing shoes",
		"6:2": "music notes and a microphone",
		"8:0": "running footprints",
		"8:1": "eyes peeking from behind a curtain",
		"8:2": "a laughing face",
		"9:1": "a pillow and a folded blanket",
		"9:2": "a sleeping face with a dream cloud",
		"10:0": "a seedling growing taller",
		"10:1": "three children of different heights",
		"10:2": "a family of paper figures",
		"15:1": "a ball of dough and a rolling pin",
		"16:2": "a mug of cocoa with marshmallows",
		"20:2": "a glass of lemonade with a straw",
		"22:1": "falling confetti",
		"22:2": "a bursting firework",
		"24:1": "a friendly little ghost",
		"25:1": "a wooden sleigh",
		"30:1": "a round mooncake on a plate",
		"31:0": "swirling wind lines",
		"31:2": "falling autumn leaves",
		"32:0": "a dark cloud with a lightning bolt",
		"32:1": "a bright lightning flash",
		"32:2": "falling raindrops",
		"33:0": "a rainbow of paint swatches",
		"33:1": "a fluffy white cloud",
		"34:0": "a snowman with a scarf",
		"34:1": "a pair of mittens",
		"35:0": "soft mist layers",
		"35:1": "a hazy horizon",
		"35:2": "a glowing lamp",
		"36:0": "a ringed planet",
		"36:1": "waves on the ocean",
		"36:2": "a row of pine trees",
		"37:0": "a speckled granite rock",
		"37:1": "a smooth marble block",
		"37:2": "a pile of sand",
		"38:0": "a handful of seeds",
		"38:1": "a green sprout",
		"38:2": "a watering can pouring water",
		"39:0": "a comet with a tail",
		"39:1": "a ringed planet",
		"39:2": "a spiral galaxy",
		"40:0": "the sun rising over hills",
		"40:2": "a dewdrop on a leaf",
		"41:0": "a flowing superhero cape",
		"41:1": "a superhero eye mask",
		"41:2": "a superhero shield emblem",
		"42:0": "a magnifying glass over footprints",
		"42:1": "footprints in the sand",
		"42:2": "a detective hat",
		"43:0": "a folded map",
		"43:1": "a brass compass",
		"43:2": "a pair of hiking boots",
		"44:0": "a metal gear",
		"44:1": "a coiled metal spring",
		"44:2": "a small wooden model",
		"45:0": "a glass beaker",
		"45:1": "a science flask",
		"45:2": "a magnifying lens",
		"46:1": "a story scroll with a star",
		"47:0": "three balls in the air",
		"47:2": "a clown face",
		"48:0": "puppet strings",
		"48:1": "a small puppet stage",
		"49:0": "a magnifying glass and footprints",
		"50:1": "a castle and a little village",
		"50:2": "a sunset sky",
	},
}

PACKAGE_CONTENT = {
	"p2": ROOT / "scripts" / "content.p2.json",
	"p3": ROOT / "scripts" / "content.p3.json",
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

    for package, path in PACKAGE_CONTENT.items():
        if not path.exists():
            continue
        content = json.loads(path.read_text())
        english = content["en"]["levels"]
        for locale in ["en", "ro", "it", "de", "ru"]:
            for position, level in enumerate(content[locale]["levels"]):
                for index, entry in enumerate(level["words"]):
                    key = f"{package}:{level['id']}:{index}"
                    replacement = PACKAGE_OVERRIDES[package].get(f"{level['id']}:{index}")
                    if replacement:
                        glosses[f"{package}:{locale}:{level['id']}:{index}"] = replacement
                        continue
                    subject = english[position]["words"][index]["word"].lower()
                    if locale == "en":
                        glosses[f"{package}:{locale}:{level['id']}:{index}"] = subject
                    else:
                        glosses[f"{package}:{locale}:{level['id']}:{index}"] = (
                            f"{entry['word'].lower()} ({subject})"
                        )

    # Tab indentation keeps the generated file stable under Prettier's checked formatting.
    OUT.write_text(json.dumps(glosses, ensure_ascii=False, indent="\t") + "\n")
    print(f"wrote {len(glosses)} glosses to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
