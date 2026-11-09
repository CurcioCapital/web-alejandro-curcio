"""Motor 6 en línea turbo (tipo Toyota Supra B58) compartido por el arranque y el loop.
engine(rpm, thr, cut) -> señal mono normalizada. Mismos pulsos por cilindro (semilla fija),
así el arranque y el loop suenan al mismo motor."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def smooth(x, ms):
    k = max(1, int(ms / 1000 * SR)); w = np.hanning(k + 2)[1:-1]; w /= w.sum()
    return np.convolve(x, w, mode='same')

CYL_GAIN = np.array([1.0, 0.9, 1.07, 0.95, 1.03, 0.88])

def kernels():
    r = np.random.default_rng(58)  # B58
    kn = np.arange(int(0.014 * SR)) / SR
    out = []
    for c in range(6):
        f1 = r.uniform(105, 140); f2 = r.uniform(170, 230)
        k_soft = lp(r.standard_normal(len(kn)), 1000) * np.exp(-kn / 0.0035) + np.sin(2*np.pi*f1*kn) * np.exp(-kn / 0.004)
        k_hard = (lp(r.standard_normal(len(kn)), 4000) * np.exp(-kn / r.uniform(0.0014, 0.0022))
                  + 0.6*np.sin(2*np.pi*f2*kn + r.uniform(0, 6.3)) * np.exp(-kn / 0.0025))
        out.append((k_soft, k_hard))
    return out

def engine(rpm, thr, cut, rng, ref_peak=None, gain=None):
    """gain: multiplicador por explosión (p. ej. para fallos al arrancar). ref_peak: pico de
    referencia para normalizar igual que otra pieza (si None, se normaliza a sí misma)."""
    N = len(rpm)
    ph = np.cumsum(rpm / 20.0) / SR
    events = np.nonzero(np.diff(np.floor(ph)) > 0)[0] + 1
    soft = np.zeros((6, N)); hard = np.zeros((6, N))
    for n, i in enumerate(events):
        if cut[i]:
            continue
        c = n % 6
        j = min(N - 1, i + int(rng.normal(0, 0.0001) * SR))
        a = CYL_GAIN[c] * (1 + rng.normal(0, 0.08)) * (1 if gain is None else gain[i])
        load = thr[i]
        soft[c, j] += a * (0.35 + 0.25 * load) * (1 - load)
        hard[c, j] += a * (0.55 + 0.6 * load) * load
    pulses = np.zeros(N)
    for c, (ks, kh) in enumerate(kernels()):
        pulses += fftconvolve(soft[c], ks)[:N] + fftconvolve(hard[c], kh)[:N]
    env = smooth(np.abs(pulses), 4)
    pulses += bp(rng.standard_normal(N), 250, 2600) * env * (0.22 + 0.5 * thr)
    exh = (1.0 * bp(pulses, 70, 160) + 0.9 * bp(pulses, 160, 380) + 0.55 * bp(pulses, 380, 900)
           + 0.25 * bp(pulses, 900, 2200) + 0.08 * hp(pulses, 2200))
    d = int(0.0021 * SR)
    exh = exh + 0.45 * np.concatenate([np.zeros(d), exh[:-d]])
    bright = 0.25 + 0.75 * thr * np.clip(rpm / 7000, 0, 1)
    exh = exh * (1 - 0.5 * bright) + lp(hp(exh, 700), 4500) * 1.2 * bright
    drive = 1.4 + 2.4 * thr
    pk = ref_peak if ref_peak else np.abs(exh).max()
    return np.tanh(exh / pk * drive) / np.tanh(drive), np.abs(exh).max(), len(events)
