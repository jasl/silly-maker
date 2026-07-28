# SPDX-License-Identifier: MIT
# Synthesizes the Cat Cafe placeholder audio set from first principles
# (pure Python stdlib -> WAV, then ffmpeg -> MP3). Every byte is generated
# by this script: no third-party recordings, no copyright exposure, stable
# digests. Re-run to regenerate:
#
#   python3 generate.py && for f in out/*.wav; do
#     ffmpeg -y -i "$f" -codec:a libmp3lame -q:a 6 "${f%.wav}.mp3"; done
#
# The musical goal is "placeholder with intent": rainy-alley calm for the
# shop, a brighter arpeggio for contests, a sparse reprise for the ending,
# plus tiny interaction cues. Swap for produced music later by replacing
# files and manifest digests only.
import math
import os
import random
import struct
import wave

RATE = 44100


def write_wav(name: str, samples: list[float]) -> None:
    os.makedirs("out", exist_ok=True)
    path = os.path.join("out", f"{name}.wav")
    with wave.open(path, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        frames = bytearray()
        for value in samples:
            clipped = max(-1.0, min(1.0, value))
            frames += struct.pack("<h", int(clipped * 32767))
        handle.writeframes(bytes(frames))
    print(f"wrote {path} ({len(samples) / RATE:.1f}s)")


def silence(seconds: float) -> list[float]:
    return [0.0] * int(seconds * RATE)


def mix_at(target: list[float], source: list[float], at_seconds: float, gain: float = 1.0) -> None:
    offset = int(at_seconds * RATE)
    for index, value in enumerate(source):
        position = offset + index
        if 0 <= position < len(target):
            target[position] += value * gain


def piano_note(frequency: float, seconds: float, gain: float = 0.5) -> list[float]:
    """A soft felt-piano-ish tone: decaying sine plus quiet harmonics."""
    count = int(seconds * RATE)
    out = []
    for index in range(count):
        time = index / RATE
        envelope = math.exp(-3.2 * time) * min(1.0, time * 200)
        value = (
            math.sin(2 * math.pi * frequency * time)
            + 0.35 * math.sin(2 * math.pi * frequency * 2 * time)
            + 0.12 * math.sin(2 * math.pi * frequency * 3 * time)
        )
        out.append(value * envelope * gain)
    return out


def pluck_note(frequency: float, seconds: float, gain: float = 0.4) -> list[float]:
    """A brighter plucked tone for the arena arpeggio."""
    count = int(seconds * RATE)
    out = []
    for index in range(count):
        time = index / RATE
        envelope = math.exp(-6.0 * time) * min(1.0, time * 400)
        value = math.sin(2 * math.pi * frequency * time) + 0.5 * math.sin(
            2 * math.pi * frequency * 2 * time + 0.4
        )
        out.append(value * envelope * gain)
    return out


NOTE = {  # equal temperament, octave 4 reference
    "C3": 130.81, "E3": 164.81, "F3": 174.61, "G3": 196.00, "A3": 220.00, "B3": 246.94,
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00, "A4": 440.00,
    "B4": 493.88, "C5": 523.25, "E5": 659.26, "G5": 783.99,
}


def bgm_shop() -> list[float]:
    """C - Am - F - G broken chords, ~70bpm, 24s seamless loop."""
    beat = 60 / 70
    bar = beat * 4
    out = silence(bar * 8)
    progression = [
        ["C3", "G3", "E4", "C4"], ["A3", "E4", "C4", "A3"],
        ["F3", "C4", "A4", "F4"], ["G3", "D4", "B4", "G4"],
    ] * 2
    for bar_index, chord in enumerate(progression):
        base = bar_index * bar
        for note_index, name in enumerate(chord):
            mix_at(out, piano_note(NOTE[name], beat * 2.6, 0.30), base + note_index * beat)
        # A soft high answer on bars 4 and 8.
        if bar_index % 4 == 3:
            mix_at(out, piano_note(NOTE["E5"], beat * 1.6, 0.10), base + beat * 2)
    return out


def bgm_arena() -> list[float]:
    """The same language, faster: ~132bpm arpeggio with a light tick, 16s."""
    beat = 60 / 132
    bar = beat * 4
    out = silence(bar * 11)
    progression = [
        ["C4", "E4", "G4", "E4"], ["A3", "C4", "E4", "C4"],
        ["F3", "A3", "C4", "A3"], ["G3", "B3", "D4", "B3"],
    ]
    rng = random.Random(20260728)
    for bar_index in range(11):
        chord = progression[bar_index % 4]
        base = bar_index * bar
        for step in range(8):
            name = chord[step % 4]
            mix_at(out, pluck_note(NOTE[name] * (2 if step >= 4 else 1), beat, 0.22),
                   base + step * beat / 2)
        for step in range(4):  # noise tick as a tiny hat
            tick = [
                (rng.random() * 2 - 1) * math.exp(-60 * index / RATE) * 0.05
                for index in range(int(0.03 * RATE))
            ]
            mix_at(out, tick, base + step * beat)
    return out


def bgm_ending() -> list[float]:
    """A sparse reprise: C - F - C - G, ~55bpm, 26s."""
    beat = 60 / 55
    bar = beat * 4
    out = silence(bar * 6)
    progression = [["C3", "E4", "G4"], ["F3", "A4", "C5"], ["C3", "E4", "G4"], ["G3", "B4", "D4"]]
    for bar_index in range(6):
        chord = progression[bar_index % 4]
        base = bar_index * bar
        for note_index, name in enumerate(chord):
            mix_at(out, piano_note(NOTE[name], beat * 3.2, 0.26), base + note_index * beat * 1.2)
    return out


def ambient_rain() -> list[float]:
    """Low-passed noise with sparse droplet pings, 20s, crossfaded loop."""
    seconds = 20.0
    count = int(seconds * RATE)
    rng = random.Random(20260701)
    out = []
    level = 0.0
    for _ in range(count):
        level += (rng.random() * 2 - 1 - level) * 0.08  # one-pole low-pass
        out.append(level * 0.5)
    for _ in range(56):  # droplets
        at = rng.random() * (seconds - 0.3)
        frequency = 1300 + rng.random() * 1400
        drop = [
            math.sin(2 * math.pi * frequency * index / RATE)
            * math.exp(-28 * index / RATE)
            * 0.05
            for index in range(int(0.12 * RATE))
        ]
        mix_at(out, drop, at)
    fade = int(1.2 * RATE)  # head/tail crossfade for a seamless loop
    for index in range(fade):
        blend = index / fade
        out[index] = out[index] * blend + out[count - fade + index] * (1 - blend)
    return out[: count - fade]


def sfx_purr() -> list[float]:
    count = int(0.9 * RATE)
    out = []
    for index in range(count):
        time = index / RATE
        tremolo = 0.6 + 0.4 * math.sin(2 * math.pi * 24 * time)
        envelope = math.exp(-2.2 * time) * min(1.0, time * 60)
        out.append(math.sin(2 * math.pi * 62 * time) * tremolo * envelope * 0.55)
    return out


def sfx_hiss() -> list[float]:
    rng = random.Random(7)
    count = int(0.45 * RATE)
    out = []
    previous = 0.0
    for index in range(count):
        raw = rng.random() * 2 - 1
        value = raw - previous  # crude high-pass
        previous = raw
        envelope = math.exp(-7 * index / RATE) * min(1.0, index / (0.01 * RATE))
        out.append(value * envelope * 0.4)
    return out


def sfx_coin() -> list[float]:
    out = silence(0.4)
    for at, frequency in ((0.0, 880.0), (0.09, 1318.5)):
        ping = [
            math.sin(2 * math.pi * frequency * index / RATE) * math.exp(-14 * index / RATE) * 0.4
            for index in range(int(0.3 * RATE))
        ]
        mix_at(out, ping, at)
    return out


def sfx_win() -> list[float]:
    out = silence(1.0)
    for step, name in enumerate(["C4", "E4", "G4", "C5"]):
        mix_at(out, pluck_note(NOTE[name], 0.5, 0.4), step * 0.12)
    return out


def sfx_lose() -> list[float]:
    out = silence(0.8)
    mix_at(out, piano_note(NOTE["E4"], 0.5, 0.35), 0.0)
    mix_at(out, piano_note(NOTE["C4"], 0.7, 0.35), 0.22)
    return out


if __name__ == "__main__":
    write_wav("cc-bgm-shop", bgm_shop())
    write_wav("cc-bgm-arena", bgm_arena())
    write_wav("cc-bgm-ending", bgm_ending())
    write_wav("cc-ambient-rain", ambient_rain())
    write_wav("cc-sfx-purr", sfx_purr())
    write_wav("cc-sfx-hiss", sfx_hiss())
    write_wav("cc-sfx-coin", sfx_coin())
    write_wav("cc-sfx-win", sfx_win())
    write_wav("cc-sfx-lose", sfx_lose())
