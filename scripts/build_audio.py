"""Build site-owned UK narration. Only generated MP3 clips enter public/.

No speech service, API credentials or observatory-machine access is required.
"""
from pathlib import Path
import hashlib
import io
import json
import re
import shutil
import urllib.request
import wave

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache"
OUTPUT = ROOT / "public/assets/audio"
VOICE = "en_GB-cori-medium"
REVISION = "c10ece1aade47bb51c153c893d14e5bf8e5b7117"
BASE = f"https://huggingface.co/rhasspy/piper-voices/resolve/{REVISION}/en/en_GB/cori/medium"
VERSION = "cori-medium-20261006-v1"


def model_file(filename):
    destination = CACHE / "voice" / filename
    if not destination.exists():
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(destination.suffix + ".part")
        with urllib.request.urlopen(f"{BASE}/{filename}", timeout=120) as source:
            with temporary.open("wb") as target:
                shutil.copyfileobj(source, target)
        temporary.replace(destination)
    return destination


def build():
    import lameenc
    from piper import PiperVoice, SynthesisConfig

    requests = json.loads((CACHE / "narration.json").read_text())
    if not requests:
        raise ValueError("No narration requests; refusing an empty audio build")
    clip_cache = CACHE / "clips"
    clip_cache.mkdir(parents=True, exist_ok=True)
    voice = None
    generated = 0
    for request in requests:
        key, text = request["hash"], request["text"]
        expected = hashlib.sha256((VERSION + "\n" + text).encode()).hexdigest()
        if not re.fullmatch(r"[a-f0-9]{64}", key) or key != expected:
            raise ValueError("Audio version or text hash mismatch")
        target = clip_cache / f"{key}.mp3"
        if target.exists() and target.stat().st_size > 100:
            continue
        if voice is None:
            model_file(f"{VOICE}.onnx.json")
            model = model_file(f"{VOICE}.onnx")
            voice = PiperVoice.load(str(model))
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            voice.synthesize_wav(text, wav, syn_config=SynthesisConfig(length_scale=1.05))
        buffer.seek(0)
        with wave.open(buffer, "rb") as wav:
            if wav.getnframes() == 0 or wav.getsampwidth() != 2:
                raise ValueError("Speech generator returned invalid PCM audio")
            encoder = lameenc.Encoder()
            encoder.set_bit_rate(64)
            encoder.set_in_sample_rate(wav.getframerate())
            encoder.set_channels(wav.getnchannels())
            encoder.set_quality(2)
            mp3 = encoder.encode(wav.readframes(wav.getnframes())) + encoder.flush()
        temporary = target.with_suffix(".part")
        temporary.write_bytes(mp3)
        temporary.replace(target)
        generated += 1
        print(f"Generated clip {generated}", flush=True)

    # Only publish a complete set. Cache contains earlier clips; output does not.
    OUTPUT.mkdir(parents=True, exist_ok=True)
    wanted = {f'{request["hash"]}.mp3' for request in requests}
    for filename in wanted:
        shutil.copyfile(clip_cache / filename, OUTPUT / filename)
    # Keep the cache bounded as observation values change throughout the day.
    for directory in (OUTPUT, clip_cache):
        for old in directory.glob("*.mp3"):
            if old.name not in wanted:
                old.unlink()
    print(f"Audio ready: {len(wanted)} clips, {generated} generated, {len(wanted) - generated} reused.")


if __name__ == "__main__":
    build()
