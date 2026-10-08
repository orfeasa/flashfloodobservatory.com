"""Keep recordings usable for dashboards opened before a data refresh."""
from pathlib import Path
import os
import shutil
import time

RETENTION_SECONDS = 48 * 60 * 60


def publish_clips(cache: Path, output: Path, wanted: set[str], now=None):
    now = time.time() if now is None else now
    output.mkdir(parents=True, exist_ok=True)
    # Refresh last-use time, including reused recordings generated long ago.
    for filename in wanted:
        path = cache / filename
        if not path.is_file():
            raise FileNotFoundError(path)
        os.utime(path, (now, now))
    kept = set()
    for path in cache.glob('*.mp3'):
        if path.name not in wanted and now - path.stat().st_mtime > RETENTION_SECONDS:
            path.unlink()
            continue
        kept.add(path.name)
        shutil.copy2(path, output / path.name)
    for path in output.glob('*.mp3'):
        if path.name not in kept:
            path.unlink()
    return len(kept)
