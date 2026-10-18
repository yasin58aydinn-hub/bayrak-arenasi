"""Five original, royalty-free battle tracks synthesized from scratch.
usage: python3 music.py outdir
"""
import os, sys, subprocess
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

MINOR = [0, 2, 3, 5, 7, 8, 10]
PHRYG = [0, 1, 3, 5, 7, 8, 10]
HARM = [0, 2, 3, 5, 7, 8, 11]

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def lp(x, f, o=2): return sosfilt(butter(o, min(f, SR / 2 - 200), btype='low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, btype='high', fs=SR, output='sos'), x)
def bp(x, a, b): return sosfilt(butter(2, [a, b], btype='band', fs=SR, output='sos'), x)

class Song:
    def __init__(self, bpm, bars, seed):
        self.bpm = bpm; self.bars = bars
        self.s16 = 60 / bpm / 4
        self.n = int(bars * 16 * self.s16 * SR) + SR * 3
        self.bus = {k: np.zeros(self.n) for k in ['drums', 'bass', 'str', 'brass', 'lead', 'pad', 'fx']}
        self.rng = np.random.default_rng(seed)
    def t(self, bar, step): return (bar * 16 + step) * self.s16
    def put(self, bus, t0, x, g=1.0):
        i = int(t0 * SR)
        if i >= self.n: return
        j = min(self.n, i + len(x)); self.bus[bus][i:j] += x[: j - i] * g

def env(n, a=0.005, d=0.2, s=0.0, r=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * (s + (1 - s) * np.exp(-np.maximum(0, t - a) / d))
    if r:
        rn = int(r * SR); e[-rn:] *= np.linspace(1, 0, rn) if rn < n else 1
    return e

def saw(f, n, detune=0.0, ph=None):
    t = np.arange(n) / SR
    p = (ph if ph is not None else np.random.rand()) + f * (1 + detune) * t
    return 2 * (p % 1) - 1

def sq(f, n):
    t = np.arange(n) / SR
    return np.sign(np.sin(2 * np.pi * f * t + np.random.rand() * 6))

# ---- instruments
def kick(dur=0.45):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 42 + 110 * np.exp(-t * 28)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    x[:200] += np.random.uniform(-1, 1, 200) * np.linspace(0.6, 0, 200)
    return np.tanh(x * 1.6)

def taiko(dur=1.0, pitch=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = (62 + 70 * np.exp(-t * 16)) * pitch
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.6)
    skin = lp(np.random.uniform(-1, 1, n), 900) * np.exp(-t * 14) * 1.4
    return np.tanh((body + skin) * 1.5)

def snare(dur=0.3):
    n = int(dur * SR); t = np.arange(n) / SR
    x = bp(np.random.uniform(-1, 1, n), 1200, 6000) * np.exp(-t * 16) * 1.6
    x += np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28) * 0.6
    return x

def hat(dur=0.06, open_=False):
    if open_: dur = 0.3
    n = int(dur * SR); t = np.arange(n) / SR
    return hp(np.random.uniform(-1, 1, n), 7000) * np.exp(-t * (14 if open_ else 70)) * 0.7

def crash(dur=2.5):
    n = int(dur * SR); t = np.arange(n) / SR
    return hp(np.random.uniform(-1, 1, n), 3500) * np.exp(-t * 2.2) * 0.6

def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.random.uniform(-1, 1, n)
    out = np.zeros(n); seg = 2048
    for i in range(0, n, seg):
        fc = 300 + 6000 * (i / n) ** 2
        out[i:i + seg] = bp(x[i:i + seg + 0], fc * 0.7, fc * 1.3)[: len(out[i:i + seg])]
    return out * (t / dur) ** 2 * 0.8

def bass(m, dur, drive=1.0, cutoff=500):
    n = int(dur * SR); f = mtof(m)
    x = saw(f, n) + 0.5 * saw(f / 2, n) + 0.3 * sq(f, n)
    x = lp(x, cutoff) * env(n, 0.004, dur * 0.6, 0.3, 0.02)
    return np.tanh(x * 1.4 * drive)

def strings(m, dur, bright=2600):
    n = int(dur * SR); f = mtof(m)
    x = sum(saw(f, n, d) for d in (-0.006, 0.0, 0.007)) / 3
    return lp(x, bright) * env(n, 0.006, 0.12, 0.15, 0.02)

def brass(ms, dur, cutoff=1600):
    n = int(dur * SR); x = np.zeros(n)
    for m in ms:
        f = mtof(m); x += saw(f, n, -0.004) + saw(f, n, 0.004) + 0.4 * sq(f / 2, n)
    e = env(n, 0.06, dur * 0.8, 0.6, 0.15)
    sweep = lp(x, cutoff) * e
    return np.tanh(sweep / len(ms) * 1.2)

def pad(ms, dur):
    n = int(dur * SR); x = np.zeros(n); t = np.arange(n) / SR
    for m in ms:
        for d in (-0.008, 0, 0.008): x += saw(mtof(m), n, d)
    x = lp(x, 900) / (3 * len(ms))
    return x * np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.3 + 0.001)

def lead(m, dur, kind='saw'):
    n = int(dur * SR); t = np.arange(n) / SR
    f = mtof(m) * (1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.25))
    ph = np.cumsum(f) / SR
    if kind == 'saw': x = 2 * (ph % 1) - 1; x = lp(x, 3000) * 0.8 + 0.3 * np.sign(np.sin(2 * np.pi * ph))
    else: x = np.sin(2 * np.pi * ph) + 0.4 * np.sin(4 * np.pi * ph) + 0.2 * (2 * (ph % 1) - 1)
    return x * env(n, 0.02, dur, 0.85, 0.06)

def pluck(m, dur):
    n = int(dur * SR); f = mtof(m); p = int(SR / f)
    buf = np.random.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return lp(out, 4000)

# ---- composition
def chord(scale, root, deg, octave=0):
    tones = []
    for k in (0, 2, 4):
        d = deg + k
        tones.append(root + scale[d % 7] + 12 * (d // 7) + 12 * octave)
    return tones

def make(name, title, bpm, root, scale, prog, style, seed):
    np.random.seed(seed)
    sections = [('intro', 4), ('A', 8), ('B', 8), ('break', 4), ('A', 8), ('B', 8), ('end', 2)]
    bars = sum(b for _, b in sections)
    S = Song(bpm, bars, seed); rng = S.rng
    s16 = S.s16; bar = 0
    melody_rhythms = [[4, 2, 2, 4, 4], [2, 2, 4, 2, 2, 4], [6, 2, 4, 4], [4, 4, 2, 2, 4], [3, 3, 2, 4, 4]]
    last_note = root + 12 + scale[0]
    for sec, nb in sections:
        for b in range(nb):
            deg = prog[(bar) % len(prog)]
            ch = chord(scale, root, deg)
            t0 = S.t(bar, 0)
            # drums
            if sec in ('intro', 'break'):
                for st in (0, 8) if sec == 'intro' else (0, 6, 8, 12):
                    S.put('drums', S.t(bar, st), taiko(1.0, 1.0 if st == 0 else 1.15), 0.9)
            elif sec in ('A', 'B'):
                kpat = {'march': (0, 4, 8, 12), 'drive': (0, 3, 6, 8, 11, 14), 'half': (0, 10), 'gallop': (0, 3, 4, 8, 11, 12)}[style['kick']]
                for st in kpat: S.put('drums', S.t(bar, st), kick(), 0.9)
                for st in (4, 12): S.put('drums', S.t(bar, st), snare(), 0.55)
                for st in range(0, 16, 2 if style['hat'] == 8 else 1): S.put('drums', S.t(bar, st), hat(open_=(st % 8 == 6 and style['hat'] == 8)), 0.35 if st % 4 == 0 else 0.22)
                if sec == 'B' or style.get('taiko_always'):
                    for st in (0, 8): S.put('drums', S.t(bar, st), taiko(), 0.7)
                if b == nb - 1:
                    for st in (12, 13, 14, 15): S.put('drums', S.t(bar, st), snare(), 0.45 + 0.1 * (st - 12))
                if b == 0: S.put('drums', t0, crash(), 0.55)
            elif sec == 'end':
                if b == 0: S.put('drums', t0, taiko(1.6), 1.0); S.put('drums', t0, crash(3), 0.6); S.put('drums', t0, kick(), 1.0)
            # bass
            if sec in ('A', 'B'):
                step = style['bass_step']
                for st in range(0, 16, step):
                    m = ch[0] - 24 + (12 if (style['bass_oct'] and st % 4 == 2) else 0)
                    S.put('bass', S.t(bar, st), bass(m, s16 * step * 0.9, style['drive'], style['bass_cut']), 0.55)
            elif sec == 'end' and b == 0:
                S.put('bass', t0, bass(ch[0] - 24, 2.5), 0.6)
            # string ostinato
            if sec in ('A', 'B', 'break'):
                pat = style['ost']
                for st in range(16):
                    iv = pat[st % len(pat)]
                    if iv is None: continue
                    m = ch[0] + iv
                    S.put('str', S.t(bar, st), strings(m, s16 * 0.95, 2200 if sec == 'break' else 3000), 0.32)
            # pads / brass
            if sec in ('intro', 'break'):
                S.put('pad', t0, pad([c - 12 for c in ch] + [ch[0] + 12], 16 * s16 + 0.3), 0.6)
            if sec in ('A', 'B'):
                hits = style['brass_hits']
                for st, ln in hits:
                    S.put('brass', S.t(bar, st), brass([c for c in ch] + [ch[0] - 12], s16 * ln, 1400 if sec == 'A' else 2200), 0.42)
            if sec == 'end' and b == 0:
                S.put('brass', t0, brass(ch + [ch[0] - 12, ch[0] + 12], 2.6, 2400), 0.55)
            if sec == 'intro' and b == nb - 1:
                S.put('fx', t0, riser(16 * s16), 0.5)
            # lead melody
            if sec == 'B':
                rhythm = melody_rhythms[rng.integers(len(melody_rhythms))]; st = 0
                for ln in rhythm:
                    cands = [c + 12 for c in ch] + [c + 24 for c in ch[:1]] + [root + 12 + scale[i] for i in range(7)]
                    cands = sorted(set(cands), key=lambda m: abs(m - last_note) + rng.random() * 3)
                    m = cands[0] if st % 8 == 0 else cands[min(len(cands) - 1, rng.integers(1, 4))]
                    if st == 0: m = min([c + 12 for c in ch] + [c + 24 for c in ch], key=lambda x: abs(x - last_note))
                    last_note = m
                    snd = pluck(m, s16 * ln + 0.4) if style['lead'] == 'pluck' else lead(m, s16 * ln * 0.95, style['lead'])
                    S.put('lead', S.t(bar, st), snd, 0.3 if style['lead'] == 'pluck' else 0.22)
                    st += ln
            bar += 1
    # mix
    rv_t = np.arange(int(2.2 * SR)) / SR
    ir = lp(np.random.uniform(-1, 1, len(rv_t)), 5000) * np.exp(-rv_t / 0.55)
    ir /= np.sqrt(np.sum(ir ** 2))
    send = S.bus['str'] * 0.5 + S.bus['brass'] * 0.6 + S.bus['lead'] * 0.5 + S.bus['pad'] * 0.6 + S.bus['drums'] * 0.12 + S.bus['fx'] * 0.4
    wet = fftconvolve(send, ir)[: S.n] * 0.35
    mix = S.bus['drums'] * 1.0 + S.bus['bass'] + S.bus['str'] + S.bus['brass'] + S.bus['lead'] + S.bus['pad'] + S.bus['fx'] + wet
    mix = hp(mix, 30)
    end = int((S.t(bars, 0) + 2.5) * SR)
    mix = mix[:end]
    mix /= np.sqrt(np.mean(mix ** 2)) / 0.16
    mix = np.tanh(mix * 1.1) * 0.9
    st = np.stack([mix, np.roll(mix, int(0.012 * SR)) * 0.92 + mix * 0.08], 1)
    wav = os.path.join(OUT, name + '.wav')
    from scipy.io import wavfile
    wavfile.write(wav, SR, (st * 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '192k',
                    '-metadata', f'title={title}', '-metadata', 'artist=Bayrak Arenası', os.path.join(OUT, name + '.mp3')], check=True)
    os.remove(wav)
    print(name, round(end / SR, 1), 's')

O = [0, 0, 7, 0, 12, 0, 7, 0, 3, 0, 7, 0, 12, 10, 7, 3]
O2 = [0, None, 0, 7, 0, None, 12, 7, 0, None, 0, 7, 10, 7, 3, 7]
O3 = [0, 3, 7, 12, 15, 12, 7, 3, 0, 3, 7, 12, 19, 15, 12, 7]
O4 = [0, 12, 0, 12, 7, 12, 0, 12, 3, 12, 0, 12, 7, 12, 10, 12]

make('muzik1_kolezyum', 'Kolezyum', 140, 50, MINOR, [0, 5, 2, 6], dict(kick='march', hat=8, bass_step=2, bass_oct=False, drive=1.0, bass_cut=500, ost=O, brass_hits=[(0, 6), (8, 4), (14, 2)], lead='saw'), 11)
make('muzik2_volkan', 'Volkan', 160, 52, PHRYG, [0, 1, 0, 6], dict(kick='drive', hat=16, bass_step=1, bass_oct=False, drive=2.6, bass_cut=700, ost=O4, brass_hits=[(0, 3), (3, 3), (6, 2), (10, 6)], lead='saw', taiko_always=True), 22)
make('muzik3_kiraz', 'Kiraz Bahçesi', 120, 45, MINOR, [0, 5, 3, 4], dict(kick='half', hat=8, bass_step=4, bass_oct=True, drive=1.0, bass_cut=420, ost=O2, brass_hits=[(0, 16)], lead='pluck', taiko_always=True), 33)
make('muzik4_son_round', 'Son Round', 150, 48, HARM, [0, 6, 5, 4], dict(kick='gallop', hat=16, bass_step=2, bass_oct=True, drive=1.6, bass_cut=600, ost=O3, brass_hits=[(0, 4), (6, 2), (8, 8)], lead='saw'), 44)
make('muzik5_sampiyon', 'Şampiyon', 130, 41, MINOR, [0, 5, 6, 0], dict(kick='march', hat=8, bass_step=2, bass_oct=True, drive=1.2, bass_cut=520, ost=O, brass_hits=[(0, 8), (8, 6), (14, 2)], lead='sine'), 55)
