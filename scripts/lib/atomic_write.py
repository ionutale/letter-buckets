"""Write a file into the published tree without ever exposing a partial one.

Every asset is written to a hidden sibling and renamed over its target only
after the write succeeds. A killed or failed render therefore leaves the old
file in place, and nothing a later run would skip.
"""
from __future__ import annotations

import os
import secrets
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


def temp_sibling(target: Path) -> Path:
    """A hidden sibling that keeps the target's suffix, so format sniffing works."""
    return target.with_name(
        f".{target.stem}.tmp-{os.getpid()}-{secrets.token_hex(4)}{target.suffix}"
    )


@contextmanager
def atomic_replace(target: Path) -> Iterator[Path]:
    """Yield a temp path; rename it over `target` only when the block finishes.

    Any exception removes the temp file and leaves the previous asset intact.
    The rename is atomic on one filesystem, so a reader sees the old file or
    the complete new one.
    """
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = temp_sibling(target)
    try:
        yield temp
    except BaseException:
        temp.unlink(missing_ok=True)
        raise
    os.replace(temp, target)
