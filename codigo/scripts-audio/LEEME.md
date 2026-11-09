# Audio de la sección de drift (Deportista)

Síntesis propia, sin grabaciones de terceros. Motor 6 en línea turbo tipo Supra.

- `engine_core.py`: el motor (explosiones por cilindro, escape, saturación). Compartido.
- `drift_synth.py`: loop de 24 s → `media/audio/drift-ambiente-vN.m4a`.
- `intro_synth.py`: arranque de 3,2 s (se escucha una vez) → `media/audio/drift-arranque.m4a`.

```bash
python3 drift_synth.py loop.wav            # también guarda eng_peak.npy
python3 intro_synth.py intro.wav loop.wav  # usa el ralentí del loop para igualar nivel
ffmpeg -i loop.wav  -c:a aac -b:a 128k -movflags +faststart drift-ambiente-vN.m4a
ffmpeg -i intro.wav -c:a aac -b:a 128k -movflags +faststart drift-arranque.m4a
```
Cada versión nueva del loop lleva nombre nuevo: `/media` tiene caché de 7 días.
