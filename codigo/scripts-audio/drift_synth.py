"""
Ambiente de drift v2 — motor 6 en línea turbo (tipo Toyota Supra), 24 s en loop.

Guion:
  0.0–6.5   ralentí → dos aceleradas en vacío → limitador antes de la largada
  6.5–18.0  largada: 1.ª, 2.ª, 3.ª y 4.ª con caja secuencial (corte, golpe, silbido)
  18.0–22.5 levanta (petardeo) y derrape: cubiertas contra el asfalto con gas modulado
  22.5–24.0 vuelve a ralentí para cerrar el loop sin corte

Modelo de motor: tren de explosiones a rpm/20 Hz (6 cil., 4 tiempos), cada explosión
es un pulso corto con variación por cilindro y jitter; resonancias de escape en
paralelo, saturación según carga, corte de encendido real (pulsos que faltan) en el
limitador y en cada cambio. Uso: python3 drift_synth_v2.py salida.wav
"""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave, sys

SR = 44100
L = 24.0            # duración final del loop
XF = 1.2            # cola extra que se funde con el comienzo
N = int((L + XF) * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(2027)

def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def curve(points):
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)
def smooth(x, ms):
    k = max(1, int(ms / 1000 * SR)); w = np.hanning(k + 2)[1:-1]; w /= w.sum()
    return np.convolve(x, w, mode='same')

# ── 1. Guion de rpm, acelerador y cortes ────────────────────────────
IDLE = 950
rpm = np.full(N, float(IDLE))
thr = np.zeros(N)          # carga 0..1
cut = np.zeros(N, bool)    # corte de encendido

def seg(a, b, r0, r1, th, shape=1.0):
    i0, i1 = int(a * SR), int(b * SR)
    k = np.linspace(0, 1, i1 - i0) ** shape
    rpm[i0:i1] = r0 + (r1 - r0) * k
    thr[i0:i1] = th

# Previa
seg(0.0, 1.6, IDLE, IDLE, 0.08)
seg(1.6, 2.05, IDLE, 4600, 0.95, 0.7)      # acelerada 1
seg(2.05, 3.0, 4600, 1300, 0.0, 0.55)
seg(3.0, 3.35, 1300, 5800, 1.0, 0.65)       # acelerada 2, más fuerte
seg(3.35, 4.3, 5800, 1600, 0.0, 0.5)
seg(4.3, 4.85, 1600, 6900, 1.0, 0.6)        # sube al limitador
seg(4.85, 6.5, 6900, 6900, 1.0)
# limitador: rebote 6700–7050 con corte de encendido
i0, i1 = int(4.85 * SR), int(6.5 * SR)
lim = 6870 + 170 * np.sign(np.sin(2 * np.pi * 13 * t[i0:i1]))
rpm[i0:i1] = smooth(lim, 25)
cut[i0:i1] = np.sin(2 * np.pi * 13 * t[i0:i1]) > 0.55

# Largada y cambios (rpm después de cada cambio, tiempo en marcha)
gears = [  # (inicio, fin, rpm_inicio, rpm_fin)
    (6.5, 8.6, 4300, 7100),     # 1.ª: embrague, cae y trepa rápido
    (8.68, 11.4, 5100, 7150),   # 2.ª
    (11.48, 14.6, 5300, 7150),  # 3.ª
    (14.68, 18.0, 5500, 6950),  # 4.ª, más larga
]
shift_times = []
for k, (a, b, r0, r1) in enumerate(gears):
    seg(a, b, r0, r1, 1.0, 0.85 if k else 0.7)
    if k < len(gears) - 1:
        na = gears[k + 1][0]
        i0, i1 = int(b * SR), int(na * SR)  # cambio: 80 ms de corte
        rpm[i0:i1] = np.linspace(r1, gears[k + 1][2], i1 - i0)
        thr[i0:i1] = 0.0
        cut[i0:i1] = True
        shift_times.append(b)
# dip del embrague en la largada
d0 = int(6.5 * SR); rpm[d0:d0 + int(0.25 * SR)] = np.linspace(6900, 4300, int(0.25 * SR))

# Levanta y derrape con gas modulado
seg(18.0, 18.55, 6950, 4200, 0.0, 0.6)
i0, i1 = int(18.55 * SR), int(22.4 * SR)
tt = t[i0:i1] - 18.55
drift_thr = 0.75 + 0.25 * np.sin(2 * np.pi * 1.6 * tt) * np.sin(2 * np.pi * 0.31 * tt + 1)
rpm[i0:i1] = 5600 + 900 * np.sin(2 * np.pi * 1.6 * tt) + 300 * np.sin(2 * np.pi * 4.3 * tt)
thr[i0:i1] = np.clip(drift_thr, 0, 1)
seg(22.4, 23.2, 5200, 1300, 0.0, 0.45)
seg(23.2, L + XF, 1300, IDLE, 0.08)

rpm = smooth(rpm, 18)
thr = smooth(thr, 30)

# ── 2. Explosiones (6 cil., 4 tiempos: rpm/20 Hz) ───────────────────
fire_hz = rpm / 20.0
ph = np.cumsum(fire_hz) / SR
events = np.nonzero(np.diff(np.floor(ph)) > 0)[0] + 1
cyl_gain = np.array([1.0, 0.9, 1.07, 0.95, 1.03, 0.88])
soft = np.zeros((6, N)); hard = np.zeros((6, N))
for n, i in enumerate(events):
    if cut[i]:
        continue
    c = n % 6
    j = min(N - 1, i + int(rng.normal(0, 0.0001) * SR))
    a = cyl_gain[c] * (1 + rng.normal(0, 0.08))
    load = thr[i]
    soft[c, j] += a * (0.35 + 0.25 * load) * (1 - load)
    hard[c, j] += a * (0.55 + 0.6 * load) * load

# un pulso propio por cilindro (si no, el motor suena a tono puro / turbina)
kn = np.arange(int(0.014 * SR)) / SR
pulses = np.zeros(N)
for c in range(6):
    f1 = rng.uniform(105, 140); f2 = rng.uniform(170, 230)
    k_soft = lp(rng.standard_normal(len(kn)), 1000) * np.exp(-kn / 0.0035) + np.sin(2*np.pi*f1*kn) * np.exp(-kn / 0.004)
    k_hard = (lp(rng.standard_normal(len(kn)), 4000) * np.exp(-kn / rng.uniform(0.0014, 0.0022))
              + 0.6*np.sin(2*np.pi*f2*kn + rng.uniform(0, 6.3)) * np.exp(-kn / 0.0025))
    pulses += fftconvolve(soft[c], k_soft)[:N] + fftconvolve(hard[c], k_hard)[:N]
# ruido de combustión: áspero, sigue a las explosiones y a la carga
env = smooth(np.abs(pulses), 4)
pulses += bp(rng.standard_normal(N), 250, 2600) * env * (0.22 + 0.5 * thr)

# Escape: resonancias en paralelo + tubo (filtro peine corto)
exh = (1.0 * bp(pulses, 70, 160) + 0.9 * bp(pulses, 160, 380) + 0.55 * bp(pulses, 380, 900)
       + 0.25 * bp(pulses, 900, 2200) + 0.08 * hp(pulses, 2200))
d = int(0.0021 * SR)
exh = exh + 0.45 * np.concatenate([np.zeros(d), exh[:-d]])
# brillo según carga y vueltas
bright = 0.25 + 0.75 * thr * np.clip(rpm / 7000, 0, 1)
exh = exh * (1 - 0.5 * bright) + lp(hp(exh, 700), 4500) * 1.2 * bright
# saturación del escape: más agresivo con carga
drive = 1.4 + 2.4 * thr
eng = np.tanh(exh / np.abs(exh).max() * drive) / np.tanh(drive)

# ── 3. Turbo, caja secuencial, petardeo ─────────────────────────────
spool = smooth(np.clip(thr * (rpm - 2500) / 4500, 0, 1), 400)
turbo = np.sin(2 * np.pi * np.cumsum(2400 + 2600 * spool) / SR) * spool * 0.012

moving = t > 6.5
crank = rpm / 60
whine_f = crank * np.where(t < 8.6, 21, np.where(t < 11.4, 17, np.where(t < 14.6, 14, 12)))
whine = np.sin(2 * np.pi * np.cumsum(whine_f) / SR) * (0.03 * thr * moving)
whine = lp(whine, 3200)

clunk = np.zeros(N)
for s in shift_times + [6.5]:
    i = int(s * SR); n = int(0.06 * SR); k = np.arange(n) / SR
    clunk[i:i + n] += (0.5 * bp(rng.standard_normal(n), 1800, 5000) + 0.9 * np.sin(2*np.pi*95*k)) * np.exp(-k / 0.012)
    # descarga de la válvula del turbo
    m = int(0.35 * SR); km = np.arange(m) / SR
    clunk[i:i + m] += 0.10 * bp(rng.standard_normal(m), 2500, 7000) * np.exp(-km / 0.11) * (1 - np.exp(-km / 0.01))

pops = np.zeros(N)
for a, b in [(2.05, 2.7), (3.35, 4.0), (18.0, 18.6), (22.4, 23.0)]:
    for _ in range(int((b - a) * 9)):
        i = int(rng.uniform(a, b) * SR); n = int(0.025 * SR); k = np.arange(n) / SR
        pops[i:i + n] += rng.uniform(0.4, 1.0) * lp(rng.standard_normal(n), 2500) * np.exp(-k / 0.006)

# ── 4. Cubiertas: chillido (stick-slip) + roce de asfalto ───────────
sq_env = curve([(0, 0), (18.55, 0), (18.9, 0.9), (20.2, 1.0), (21.3, 0.75), (22.1, 0.95), (22.6, 0), (L, 0)])
sq_env = smooth(sq_env, 120)
f_sq = 1150 + 220 * smooth(rng.standard_normal(N), 90) * 6 + 120 * np.sin(2*np.pi*0.7*t)
stick = 0.55 + 0.45 * np.abs(smooth(rng.standard_normal(N), 18)) * 5
stick = np.clip(stick, 0, 1.6)
squeal = (np.sin(2*np.pi*np.cumsum(f_sq)/SR) + 0.45*np.sin(2*np.pi*np.cumsum(2.02*f_sq)/SR)
          + 0.6 * bp(rng.standard_normal(N), 900, 2600)) * stick
squeal = bp(squeal, 700, 4200) * sq_env * 0.22
scrub = bp(rng.standard_normal(N), 70, 450) * smooth(sq_env, 300) * 0.35   # roce sobre asfalto
road = bp(rng.standard_normal(N), 40, 220) * (0.12 * moving) * smooth(np.clip((t - 6.5) / 2, 0, 1), 200)

# ── 5. Mezcla, espacio y nivel ──────────────────────────────────────
mono = 1.0 * eng + 0.55 * pops + 0.6 * clunk + whine + turbo
Lc = mono + 0.9 * squeal + scrub + road
Rc = np.roll(mono, int(0.0006 * SR)) + 1.0 * np.roll(squeal, int(0.003 * SR)) + np.roll(scrub, 37) + road
x = np.stack([Lc, Rc])
# reflejos de pista (cercanos, sin cola larga)
for dly, g in [(0.031, 0.22), (0.067, 0.14), (0.113, 0.08)]:
    dd = int(dly * SR)
    x = x + g * lp(np.pad(x[::-1], ((0, 0), (dd, 0)))[:, :N], 2500)
x = np.stack([hp(c, 30) for c in x])

# cierre del loop: los últimos 1,2 s se funden con el comienzo (ambos en ralentí)
n, m = int(L * SR), int(XF * SR)
fade = np.sin(np.linspace(0, np.pi / 2, m)) ** 2
x[:, :m] = x[:, :m] * fade + x[:, n:n + m] * (1 - fade)
x = x[:, :n]

# Nivel: integrado ≈ -19 LUFS (el sitio lo baja con data-ambient-vol), pico -3 dBFS
x *= 10 ** (-19 / 20) / np.sqrt(np.mean(x ** 2))
x = np.tanh(x * 1.1) / 1.1
pk = np.abs(x).max()
if pk > 10 ** (-3 / 20): x *= 10 ** (-3 / 20) / pk

pcm = (x.T * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'ok {L}s eventos={len(events)} rms={20*np.log10(np.sqrt(np.mean(x**2))):.1f}dBFS')
