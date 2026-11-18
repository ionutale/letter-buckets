#!/usr/bin/env python3
"""Romanian word synthesiser: XTTS-v2 Romanian fine-tune, cloned reference voice.

Runs as a long-lived worker so the 2 GB checkpoint is loaded once per batch:

    {"text": "câine", "wav": "/tmp/xtts-123.wav"}
    -> {"ok": true, "seconds": 0.68, "attempts": 1}

XTTS pads the end of a short utterance with a lot of silence, so the duration
is measured *after* trimming, not from the raw waveform — otherwise every clip
looks too long and the retry loop discards perfectly good audio.

Loudness, the 250 ms lead-in and MP3 encoding stay in the Node pipeline so every
locale goes through the same audio chain.

Setup (once):
    .venv-xtts/bin/python candidates/voice-design/patch_xtts_ro.py
    models/xtts-v2-ro/{config,vocab,model,dvae,mel_stats,speakers_xtts}.*
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import torch
import torchaudio

MODEL_DIR = Path(os.environ.get("XTTS_MODEL_DIR", "models/xtts-v2-ro"))
REFERENCE = Path(os.environ.get("XTTS_REFERENCE", "candidates/voice-clone/reference-eu.m4a"))
TMP = Path(os.environ.get("XTTS_TMP", "candidates/audio-tmp"))

# The fine-tune was trained on comma-below diacritics; cedilla variants tokenise
# into the Turkish entries and come out with the wrong sounds.
CEDILLA_TO_COMMA = str.maketrans(
    {"\u015f": "\u0219", "\u0163": "\u021b", "\u015e": "\u0218", "\u0162": "\u021a"}
)

VOWELS = "aăâeiîou"


def syllables(word: str) -> int:
    """Rough Romanian syllable count: one per vowel group."""
    count, previous = 0, False
    for character in word.lower():
        is_vowel = character in VOWELS
        if is_vowel and not previous:
            count += 1
        previous = is_vowel
    return max(1, count)


# Leading silence is cut at -45 dB, but the tail needs a firmer threshold: XTTS
# often ends a word with a breath about 40 dB below peak, separated from the
# speech by half a second of near-silence, which survives -45 dB and makes the
# clip look twice as long as the word.
TRIM = (
    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
    "silenceremove=start_periods=1:start_threshold=-38dB,areverse"
)

# A single Romanian word is 0.3-1.7 s of speech. Below the floor the model cut
# the word off; above the ceiling it repeated or rambled.
MIN_SECONDS = 0.30
MAX_SECONDS = 1.70
# Extra tokens only buy trailing silence for a one-word utterance, so the budget
# stays small; the trim above is what removes the padding.
TOKENS = 45
# Re-sample at the same temperature the user approved. Varying it produced
# clipped takes at 0.6 and degenerate repeats at 0.15.
TEMPERATURES = (0.3,) * int(os.environ.get("XTTS_ATTEMPTS", "6"))


def load_model():
    from TTS.tts.configs.xtts_config import XttsConfig
    from TTS.tts.models.xtts import Xtts

    config = XttsConfig()
    config.load_json(str(MODEL_DIR / "config.json"))
    model = Xtts.init_from_config(config)
    model.load_checkpoint(config, checkpoint_dir=str(MODEL_DIR), use_deepspeed=False)
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model.to(device)
    model.eval()
    model.tokenizer.char_limits["ro"] = 250
    return model


def prepare_reference() -> Path:
    TMP.mkdir(parents=True, exist_ok=True)
    target = TMP / "xtts-reference.wav"
    if not target.exists() or target.stat().st_mtime < REFERENCE.stat().st_mtime:
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error", "-i", str(REFERENCE),
                "-ac", "1", "-ar", "24000", "-t", "30", str(target),
            ],
            check=True,
        )
    return target


def trim(source: Path, target: Path) -> float:
    """Strip leading and trailing silence; return the speech duration."""
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error", "-i", str(source),
            "-af", TRIM, "-ac", "1", "-ar", "24000", str(target),
        ],
        check=True,
    )
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=nw=1:nk=1", str(target),
        ],
        capture_output=True,
        text=True,
    )
    # An utterance that was nothing but silence leaves no duration behind.
    try:
        return float(probe.stdout.strip())
    except ValueError:
        return 0.0


def main() -> int:
    model = load_model()
    conditioning = model.get_conditioning_latents(audio_path=[str(prepare_reference())])
    print(json.dumps({"ready": True}), flush=True)
    TMP.mkdir(parents=True, exist_ok=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            print(json.dumps({"ok": False, "error": "bad json"}), flush=True)
            continue

        text = request["text"].translate(CEDILLA_TO_COMMA)
        target = Path(request["wav"])
        best = None
        attempts = 0
        for temperature in TEMPERATURES:
            attempts += 1
            out = model.inference(
                text=text,
                language="ro",
                gpt_cond_latent=conditioning[0],
                speaker_embedding=conditioning[1],
                temperature=temperature,
                top_p=0.7,
                top_k=30,
                length_penalty=0.8,
                repetition_penalty=10.0,
                enable_text_splitting=False,
                max_new_tokens=TOKENS,
            )
            handle, raw_name = tempfile.mkstemp(suffix=".wav", dir=TMP)
            os.close(handle)
            raw = Path(raw_name)
            torchaudio.save(str(raw), torch.tensor(out["wav"]).unsqueeze(0), 24000)
            seconds = trim(raw, target)
            raw.unlink(missing_ok=True)
            # Keep the closest attempt if none lands inside the window. An
            # empty take is never a candidate: it used to win whenever both
            # attempts trimmed to nothing, shipping a clip that was pure lead-in.
            expected = syllables(text) * 0.26
            if seconds >= 0.2 and (best is None or abs(seconds - expected) < abs(best[0] - expected)):
                best = (seconds, target.read_bytes())
            # A take far shorter than the word's syllable count means the model
            # dropped the ending; re-sample instead of shipping a clipped word.
            floor = max(MIN_SECONDS, 0.6 * syllables(text) * 0.26)
            if floor <= seconds <= MAX_SECONDS:
                print(json.dumps({"ok": True, "seconds": round(seconds, 3), "attempts": attempts}), flush=True)
                break
        else:
            if best is None:
                print(json.dumps({"ok": False, "error": f"no usable take for {text}"}), flush=True)
                continue
            print(f"# out_of_range {text} {best[0]:.2f}s", file=sys.stderr, flush=True)
            target.write_bytes(best[1])
            print(
                json.dumps(
                    {
                        "ok": True,
                        "seconds": round(best[0], 3),
                        "attempts": attempts,
                        "out_of_range": True,
                    }
                ),
                flush=True,
            )

    return 0


if __name__ == "__main__":
    sys.exit(main())
