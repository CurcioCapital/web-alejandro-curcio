"""
Arranque del Supra (se escucha una sola vez, antes del loop).
  0.00–0.20  silencio
  0.20–1.05  burro de arranque: chirrido eléctrico + compresiones (motor girando a ~230 rpm)
  1.05       prende: primeras explosiones irregulares
  1.10–1.55  acelerada de arranque en frío hasta ~2700 rpm, con estallido
  1.55–3.20  baja a ralentí en frío (~1250) y se asienta en ~950, igual que el comienzo del loop
Uso: python3 intro_synth.py salida.wav loop.wav
"""
import os, sys, wave
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine_core import SR, engine, lp, hp, bp, smooth

L = 3.2
N = int(L * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(1968)

def curve(points):
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)

# ── rpm y carga ─────────────────────────────────────────────────────
rpm = curve([(0, 0), (1.05, 0), (1.12, 1000), (1.28, 2500), (1.45, 3050), (1.62, 2900), (1.85, 2100),
             (2.25, 1400), (2.6, 1180), (3.0, 980), (L, 950)])
thr = curve([(0, 0), (1.05, 0), (1.1, 1.0), (1.55, 0.95), (1.68, 0.08), (L, 0.08)])
rpm = smooth(rpm, 25); thr = smooth(thr, 20)
cut = np.zeros(N, bool)
# primeras explosiones: algunas fallan (encendido en frío)
gain = np.ones(N)
gain[(t > 1.05) & (t < 1.18)] = 0.55
eng, _, _ = engine(rpm, thr, cut, rng, ref_peak=float(np.load(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'eng_peak.npy'))), gain=gain)
eng[t < 1.05] = 0

# ── burro de arranque ───────────────────────────────────────────────
crank = (t > 0.2) & (t < 1.12)
cenv = smooth(crank.astype(float), 40)
# chirrido eléctrico del motor de arranque (sube un poco al tomar velocidad)
f_st = 300 + 140 * np.clip((t - 0.2) / 0.5, 0, 1)
st_ph = 2 * np.pi * np.cumsum(f_st) / SR
starter = (np.sin(st_ph) + 0.5 * np.sin(2 * st_ph) + 0.3 * np.sin(3.01 * st_ph)) * 0.05
starter += bp(rng.standard_normal(N), 1500, 5000) * 0.02          # piñón
# compresiones: el motor gira sin explotar (6 cil. a ~230 rpm → ~11,5 golpes/s)
comp_ph = np.cumsum(np.full(N, 230 / 20)) / SR
comp_ev = np.nonzero(np.diff(np.floor(comp_ph)) > 0)[0] + 1
comp = np.zeros(N)
kk = np.arange(int(0.06 * SR)) / SR
kern = (np.sin(2 * np.pi * 55 * kk) + 0.4 * lp(rng.standard_normal(len(kk)), 400)) * np.exp(-kk / 0.018)
for i in comp_ev:
    if crank[i]:
        comp[i] += rng.uniform(0.8, 1.1)
comp = np.convolve(comp, kern)[:N] * 0.22
# el chirrido "pulsa" con cada compresión (carga sobre el arranque)
starter *= 0.75 + 0.25 * np.cos(2 * np.pi * comp_ph)
starter_all = (starter + comp) * cenv * 3.6

# estallido al prender (válvula de escape abierta en modo Sport)
bang = np.zeros(N); i = int(1.13 * SR); n = int(0.09 * SR); k = np.arange(n) / SR
bang[i:i + n] = (lp(rng.standard_normal(n), 1800) + 0.8 * np.sin(2 * np.pi * 70 * k)) * np.exp(-k / 0.03) * 0.5

mono = eng + starter_all + bang
x = np.stack([mono, np.roll(mono, int(0.0006 * SR))])
for dly, gn in [(0.031, 0.22), (0.067, 0.14), (0.113, 0.08)]:
    dd = int(dly * SR)
    x = x + gn * lp(np.pad(x[::-1], ((0, 0), (dd, 0)))[:, :N], 2500)
x = np.stack([hp(c, 30) for c in x])
x[:, :int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))

# Nivel: el ralentí final igual al ralentí del comienzo del loop (empalme parejo)
with wave.open(sys.argv[2]) as w:
    lp_ = np.frombuffer(w.readframes(int(0.8 * SR)), '<i2').reshape(-1, 2) / 32768
ref = np.sqrt(np.mean(lp_ ** 2))
tail = x[:, -int(0.6 * SR):]
x *= ref / np.sqrt(np.mean(tail ** 2))
x = np.tanh(x * 1.05) / 1.05
pk = np.abs(x).max()
if pk > 10 ** (-1.5 / 20): x *= 10 ** (-1.5 / 20) / pk
pcm = (x.T * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'ok intro {L}s pico={20*np.log10(np.abs(x).max()):.1f}dBFS')
