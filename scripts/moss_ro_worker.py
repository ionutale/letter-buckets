#!/usr/bin/env python3
"""Romanian word synthesiser: MOSS-TTS v1.5 (8B) with a cloned reference voice.

Speaks the same protocol as scripts/xtts_ro_worker.py, so generate_audio.mjs can
use either engine without changing its per-word loop:

    {"text": "câine", "wav": "/tmp/moss-123.wav"}
    -> {"ok": true, "seconds": 1.04, "attempts": 1}

MOSS lists Romanian among its languages and clones from a reference clip. It is
an 8B model, so it runs on the GPU and each word takes several seconds; every
clip is gated on duration because a one-word prompt sometimes keeps talking.

Setup (once):
    uv venv .venv-moss --python 3.12
    uv pip install --python .venv-moss/bin/python torch torchaudio "transformers==5.0.0" \\
        accelerate soundfile librosa torchcodec
    # model: models/moss-tts-1.5 (OpenMOSS-Team/MOSS-TTS-v1.5)
"""
from __future__ import annotations

import json
import os
import random
import subprocess
import sys
import tempfile
from pathlib import Path

import torch
import torchaudio

MODEL_DIR = str(Path(os.environ.get("MOSS_MODEL_DIR", "models/moss-tts-1.5")).resolve())
REFERENCE = os.environ.get("MOSS_REFERENCE", "candidates/voice-clone/chunks6/chunk0.wav")
TMP = Path(os.environ.get("MOSS_TMP", "candidates/audio-tmp"))
LANGUAGE = os.environ.get("MOSS_LANGUAGE", "Romanian")
# Target length in audio tokens: without it a single word often runs long.
TOKENS = int(os.environ.get("MOSS_TOKENS", "12"))

MIN_SECONDS = 0.32
MAX_SECONDS = 1.95
ATTEMPTS = 4

FILTER = (
    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
    "silenceremove=start_periods=1:start_threshold=-45dB,areverse"
)


def trim_seconds(path: Path) -> float:
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(path), "-af", FILTER, "-ac", "1", "-ar", "24000", str(path.with_suffix(".trim.wav"))],
        check=True,
    )
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=nw=1:nk=1", str(path.with_suffix(".trim.wav")),
        ],
        capture_output=True,
        text=True,
    )
    trimmed = path.with_suffix(".trim.wav")
    try:
        seconds = float(probe.stdout.strip())
    except ValueError:
        seconds = 0.0
    trimmed.replace(path)
    return seconds


def main() -> int:
    from transformers import AutoModel, AutoProcessor

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    dtype = torch.bfloat16 if device == "mps" else torch.float32

    processor = AutoProcessor.from_pretrained(MODEL_DIR, trust_remote_code=True)
    model = AutoModel.from_pretrained(
        MODEL_DIR, trust_remote_code=True, attn_implementation="sdpa", torch_dtype=dtype
    ).to(device)
    model.eval()
    TMP.mkdir(parents=True, exist_ok=True)
    print(json.dumps({"ready": True}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            print(json.dumps({"ok": False, "error": "bad json"}), flush=True)
            continue

        word = request["text"]
        target = Path(request["wav"])
        seconds = 0.0
        attempt = 0
        for attempt in range(1, ATTEMPTS + 1):
            conversation = processor.build_user_message(
                text=word, language=LANGUAGE, reference=[REFERENCE], tokens=TOKENS
            )
            batch = processor([conversation], mode="generation")
            torch.manual_seed(random.randrange(1 << 30))
            with torch.no_grad():
                outputs = model.generate(
                    input_ids=batch["input_ids"].to(device),
                    attention_mask=batch["attention_mask"].to(device),
                    max_new_tokens=80,
                )
            message = processor.decode(outputs)[0]
            audio = message.audio_codes_list[0]
            handle, name = tempfile.mkstemp(suffix=".wav", dir=TMP)
            os.close(handle)
            raw = Path(name)
            torchaudio.save(str(raw), audio.unsqueeze(0), processor.model_config.sampling_rate)
            seconds = trim_seconds(raw)
            if MIN_SECONDS <= seconds <= MAX_SECONDS:
                raw.replace(target)
                print(json.dumps({"ok": True, "seconds": round(seconds, 2), "attempts": attempt}), flush=True)
                break
            raw.replace(target)
        else:
            print(
                json.dumps({"ok": True, "seconds": round(seconds, 2), "attempts": attempt, "out_of_range": True}),
                flush=True,
            )

    return 0


if __name__ == "__main__":
    sys.exit(main())
