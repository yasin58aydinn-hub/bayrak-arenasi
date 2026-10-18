"""Render the game's sound effects to a WAV from an event list.
usage: python3 synth.py events.json out.wav
events.json = {"duration": seconds, "events": [[time_seconds, "name"], ...]}
"""
import json, sys
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100
spec = json.load(open(sys.argv[1]))
total = int(spec["duration"] * SR) + SR
buf = np.zeros(total, dtype=np.float64)
rng = np.random.default_rng(7)

def env(n, vol):
    return vol * np.exp(np.linspace(0, np.log(0.001), n))

def tone(t0, f0, f1, dur, typ, vol, delay=0.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = f0 * (max(30, f1) / f0) ** (tt / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if typ == "sine": w = np.sin(ph)
    elif typ == "square": w = np.sign(np.sin(ph)) * 0.6
    elif typ == "sawtooth": w = (2 * ((ph / (2 * np.pi)) % 1) - 1) * 0.6
    else: w = (2 * np.abs(2 * ((ph / (2 * np.pi)) % 1) - 1) - 1)
    add(t0 + delay, w * env(n, vol))

def noise(t0, dur, vol, f0, f1, delay=0.0):
    n = int(dur * SR)
    fc = np.sqrt(f0 * f1)
    lo, hi = max(40, fc / 1.6), min(SR / 2 - 100, fc * 1.6)
    sos = butter(2, [lo, hi], btype="band", fs=SR, output="sos")
    w = sosfilt(sos, rng.uniform(-1, 1, n)) * 3
    add(t0 + delay, w * env(n, vol))

def add(t0, w):
    i = int(t0 * SR)
    if i < 0 or i >= total: return
    j = min(total, i + len(w))
    buf[i:j] += w[: j - i]

def sfx(t, n):
    if n == "swish": noise(t, 0.18, 0.22, 700, 3200)
    elif n == "clang": tone(t, 1400, 900, 0.25, "square", 0.04); tone(t, 2600, 2100, 0.35, "sine", 0.06); noise(t, 0.08, 0.2, 3200, 2000)
    elif n == "parry": tone(t, 1800, 1760, 0.8, "sine", 0.12); tone(t, 2700, 2650, 0.7, "sine", 0.06); noise(t, 0.12, 0.3, 4200, 2500)
    elif n == "hit": tone(t, 170, 60, 0.18, "sine", 0.35); noise(t, 0.1, 0.25, 900, 300)
    elif n == "heavy": tone(t, 120, 40, 0.35, "sine", 0.45); noise(t, 0.22, 0.35, 700, 150); tone(t, 220, 80, 0.2, "square", 0.05)
    elif n == "break": noise(t, 0.5, 0.35, 2600, 300); tone(t, 600, 150, 0.4, "sawtooth", 0.06)
    elif n == "ko": tone(t, 90, 30, 1.3, "sine", 0.5); noise(t, 0.9, 0.3, 1200, 100)
    elif n == "super": tone(t, 200, 900, 0.7, "sawtooth", 0.06); noise(t, 0.7, 0.15, 400, 2400)
    elif n == "rage": tone(t, 110, 240, 0.5, "sawtooth", 0.07)
    elif n == "beep": tone(t, 660, 660, 0.14, "square", 0.07)
    elif n == "go": tone(t, 880, 880, 0.35, "square", 0.09)
    elif n == "clash": tone(t, 1600, 1500, 0.6, "sine", 0.1); tone(t, 2400, 2300, 0.5, "sine", 0.07); tone(t, 900, 700, 0.3, "square", 0.04); noise(t, 0.15, 0.35, 4200, 2200)
    elif n == "jump": noise(t, 0.22, 0.18, 500, 2500); tone(t, 220, 440, 0.18, "triangle", 0.05)
    elif n == "slam": tone(t, 110, 40, 0.4, "sine", 0.45); noise(t, 0.3, 0.3, 600, 120)
    elif n == "win":
        for i, f in enumerate([523, 659, 784, 1047]): tone(t, f, f, 0.28, "square", 0.07, i * 0.14)

for t, n in spec["events"]:
    sfx(t, n)

# low arena ambience so the track is never fully silent
amb = sosfilt(butter(2, [80, 400], btype="band", fs=SR, output="sos"), rng.uniform(-1, 1, total)) * 0.04
buf += amb
out = np.tanh(buf * 1.6) * 0.85
wavfile.write(sys.argv[2], SR, (out[: int(spec["duration"] * SR)] * 32767).astype(np.int16))
print("ok", sys.argv[2])
