import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave, sys

SR = 44100
L = 24.0            # duración del loop (s)
XF = 2.5            # crossfade para que el loop no tenga corte
N = int((L + XF) * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(1945)

def lp(x, f, o=4): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=3): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def smooth_env(points, n):
    xs, ys = zip(*points)
    e = np.interp(np.linspace(0, L + XF, n), xs, ys)
    k = int(0.35 * SR); w = np.hanning(k); w /= w.sum()
    return np.convolve(e, w, mode='same')

# ── Motor: ralentí grave que respira, con dos aceleradas suaves ─────────
rev = smooth_env([(0,0),(3,0.05),(5.5,0.85),(7.2,1),(8.6,0.25),(11,0.05),(14,0.08),(16.5,0.7),(18,0.9),(19.4,0.2),(22,0.04),(L+XF,0)], N)
f0 = 42 + 52 * rev + 1.2 * np.sin(2*np.pi*0.21*t)         # 34 → 80 Hz
f0 *= 1 + 0.006 * lp(rng.standard_normal(N), 6)            # irregularidad orgánica
ph = 2*np.pi*np.cumsum(f0)/SR
eng = np.zeros(N)
for h, a in [(1,0.7),(2,0.75),(3,0.6),(4,0.5),(5,0.38),(6,0.3),(8,0.2),(10,0.12),(12,0.07)]:
    eng += a * np.sin(h*ph + rng.uniform(0, 6.28))
# pulso de combustión (4 tiempos: modula a f0/2) y textura
eng *= 0.78 + 0.22*np.sin(ph/2)
eng += 0.18 * lp(rng.standard_normal(N), 300) * (0.4 + rev)
eng = lp(eng, 1300, 3)
eng += 0.22 * bp(rng.standard_normal(N), 280, 950, 2) * (0.25 + rev)   # admisión
eng = lp(eng, 2200, 2)
eng *= 0.55 + 0.45*rev                                     # más presencia al acelerar

# ── Derrape: ruido de goma filtrado, lejano, solo en los picos ─────────
skid_env = smooth_env([(0,0),(6.2,0),(7.0,0.9),(8.4,0.6),(9.5,0),(17.2,0),(18,0.8),(19.2,0.5),(20.3,0),(L+XF,0)], N)
sq = bp(rng.standard_normal(N), 1500, 2600, 3)
sq *= 1 + 0.35*np.sin(2*np.pi*(7 + 3*np.sin(2*np.pi*0.5*t))*t)  # vibración de la goma
skid = lp(sq, 3200, 2) * skid_env * 0.30

# ── Pasada de auto (whoosh) de izquierda a derecha ───────────────────
pass_env = smooth_env([(0,0),(10.5,0),(12.2,1),(13.4,0),(L+XF,0)], N)
wh = lp(bp(rng.standard_normal(N), 120, 1800, 2), 2200) * pass_env * 0.35
pan = np.clip((t - 10.5) / 2.9, 0, 1)

# ── Mezcla estéreo ──────────────────────────────────────────────────
Lc = 1.00*eng + 0.75*skid + wh*np.cos(pan*np.pi/2)
Rc = 0.96*np.roll(eng, int(0.0009*SR)) + 0.85*np.roll(skid, int(0.004*SR)) + wh*np.sin(pan*np.pi/2)
x = np.stack([Lc, Rc])

# Reverb de pista: respuesta al impulso de ruido con caída exponencial
ir_n = int(1.4*SR)
ir = rng.standard_normal((2, ir_n)) * np.exp(-np.arange(ir_n)/SR/0.38)
ir = np.stack([lp(i, 3000) for i in ir]); ir /= np.abs(ir).sum(axis=1, keepdims=True)
wet = np.stack([fftconvolve(x[c], ir[c])[:N] for c in range(2)])
x = 0.78*x + 0.9*wet*np.abs(x).max()/max(np.abs(wet).max(),1e-9)*0.35
x = np.stack([hp(c, 28) for c in x])                       # limpiar subgraves inútiles

# Loop sin corte: el final se funde con el principio
n, m = int(L*SR), int(XF*SR)
fade = np.sin(np.linspace(0, np.pi/2, m))**2
loop = x[:, :n].copy()
loop[:, :m] = loop[:, :m]*fade + x[:, n:n+m]*(1-fade)

# Nivel amable: RMS ≈ -23 dBFS, pico máx. -6 dBFS, saturación suave
loop *= 10**(-23/20) / np.sqrt(np.mean(loop**2))
loop = np.tanh(loop*1.2)/1.2
pk = np.abs(loop).max()
if pk > 10**(-6/20): loop *= 10**(-6/20)/pk

out = sys.argv[1]
pcm = (loop.T * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
rms = 20*np.log10(np.sqrt(np.mean(loop**2))); print(f'ok {L}s rms={rms:.1f}dBFS peak={20*np.log10(np.abs(loop).max()):.1f}dBFS')
