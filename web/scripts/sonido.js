/*
 * Director de sonido — web de Alejandro Curcio.
 *
 * Regla: suena UN solo video a la vez, y solo si está en pantalla.
 *  1. Si el usuario puso a sonar un video a mano (play con sonido, «Escuchar
 *     el discurso», «Activar sonido»), ese tiene prioridad mientras se vea.
 *     Si sale de pantalla se pausa; si otro toma el turno, también se pausa.
 *  2. Si no, suena el video marcado con data-audio="auto" que más se ve
 *     (≥ 50 % visible; empate → el más cerca del centro). Los demás quedan
 *     en silencio, pero siguen corriendo como imagen.
 *  3. Los cambios de volumen son con fundido (~350 ms), no cortes.
 *
 * Los navegadores no permiten sonido hasta el primer gesto del usuario
 * (clic, toque o tecla). El sonido viene encendido por defecto y arranca con
 * ese gesto; el botón flotante permite apagarlo y la preferencia se guarda.
 *
 * Marcado en el HTML:
 *   data-audio="auto"    suena solo cuando le toca (ej. Pelota al Medio)
 *   data-audio="manual"  tiene audio, pero arranca solo si el usuario lo pide
 * Cualquier video que el usuario active con sonido entra como «manual».
 * No usa IntersectionObserver (ver CLAUDE.md): scroll + getBoundingClientRect.
 */
(() => {
	if (window.__sonido) return;
	window.__sonido = true;

	const KEY = 'ac-sonido';
	const FADE_MS = 350;
	const AUTO_MIN = 0.5; // visibilidad mínima para que suene un video «auto»
	const KEEP_MIN = 0.35; // visibilidad mínima para conservar el turno
	const PAUSE_BELOW = 0.2; // un video manual por debajo de esto se pausa

	const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
	const save = (v) => { try { localStorage.setItem(KEY, v); } catch {} };

	let enabled = read() !== 'off';
	let unlocked = false;
	let manual = null; // video que el usuario puso a sonar
	let manualAt = 0;
	const pausedAt = new WeakMap(); // momento de la última pausa real (play la borra)
	let focus = null; // video que suena ahora
	const expected = new WeakMap(); // estado de muted que fijó el director
	const fades = new WeakMap();
	const gens = new WeakMap(); // cada fundido nuevo invalida al anterior
	const toPause = new WeakSet(); // videos manuales que se pausan al terminar de bajar

	const videos = () => [...document.querySelectorAll('video')];
	const hasAudioMark = () => document.querySelector('video[data-audio]');

	const ratio = (v) => {
		const r = v.getBoundingClientRect();
		if (!r.width || !r.height) return 0;
		const vis = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) *
			Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
		return vis / (r.width * r.height);
	};
	const centerDist = (v) => {
		const r = v.getBoundingClientRect();
		return Math.abs(r.top + r.height / 2 - innerHeight / 2);
	};

	const outGen = new WeakMap();
	const fadingOut = (v) => outGen.get(v) === gens.get(v);
	const setMuted = (v, m) => { expected.set(v, m); v.muted = m; };

	function fadeTo(v, target, done) {
		cancelAnimationFrame(fades.get(v));
		const g = (gens.get(v) || 0) + 1;
		gens.set(v, g);
		if (target === 0) outGen.set(v, g); else outGen.delete(v);
		if (target > 0) setMuted(v, false);
		const from = v.muted ? 0 : v.volume;
		const t0 = performance.now();
		const step = (t) => {
			const k = Math.min(1, (t - t0) / FADE_MS);
			try { v.volume = from + (target - from) * k; } catch {}
			if (k < 1) fades.set(v, requestAnimationFrame(step));
			else {
				gens.set(v, g + 0.5); // ya terminó: el respaldo no repite
				if (target === 0) { setMuted(v, true); try { v.volume = 1; } catch {} finishOut(v); }
				done && done();
			}
		};
		fades.set(v, requestAnimationFrame(step));
		// Respaldo: si la pestaña está en segundo plano, rAF no corre.
		setTimeout(() => {
			if (gens.get(v) !== g) return; // hubo otro fundido después
			cancelAnimationFrame(fades.get(v));
			if (target === 0) {
				if (!v.muted) { setMuted(v, true); try { v.volume = 1; } catch {} done && done(); }
				finishOut(v);
			} else { try { v.volume = target; } catch {} }
		}, FADE_MS + 80);
	}

	function finishOut(v) {
		if (toPause.has(v)) { toPause.delete(v); v.pause(); }
	}

	function silence(v) {
		if (v === manual) {
			toPause.add(v);
			manual = null;
			v.muted ? finishOut(v) : fadeTo(v, 0);
		} else if (!v.muted) fadeTo(v, 0);
		else finishOut(v);
		syncPm(v);
	}

	function speak(v) {
		toPause.delete(v);
		if (v.muted) { try { v.volume = 0; } catch {} }
		fadeTo(v, 1);
		if (v.paused) {
			v.play().catch(() => { setMuted(v, true); v.play().catch(() => {}); });
		}
		syncPm(v);
	}

	// Mantiene el botón propio de Pelota al Medio en sintonía con el director.
	function syncPm(v) {
		if (!v.matches('[data-pm-video]')) return;
		const b = document.querySelector('[data-pm-sound]');
		if (!b) return;
		const on = expected.get(v) === false;
		b.setAttribute('aria-pressed', String(on));
		const l = b.querySelector('[data-pm-sound-label]');
		if (l) l.textContent = on ? 'Silenciar' : 'Activar sonido';
	}

	function pick() {
		if (manual) {
			const r = ratio(manual);
			if (manual.ended || (manual.paused && pausedAt.get(manual) && performance.now() - pausedAt.get(manual) > 900)) manual = null;
			else if (r < PAUSE_BELOW) { const m = manual; manual = null; toPause.add(m); fadeTo(m, 0); }
			else if (r >= KEEP_MIN) return manual;
		}
		if (!enabled || !unlocked) return null;
		let best = null;
		for (const v of document.querySelectorAll('video[data-audio="auto"]')) {
			if (v.dataset.userMuted) continue;
			const r = ratio(v);
			if (r < AUTO_MIN) continue;
			if (!best || r > best.r + 0.05 || (Math.abs(r - best.r) <= 0.05 && centerDist(v) < centerDist(best.v))) best = { v, r };
		}
		// Histéresis: el que ya suena conserva el turno mientras se vea bastante.
		if (focus && focus !== manual && focus.dataset.audio === 'auto' && ratio(focus) >= KEEP_MIN &&
			(!best || best.v === focus || ratio(focus) >= best.r - 0.15)) return focus;
		return best && best.v;
	}

	let raf = 0;
	function tick() {
		raf = 0;
		const next = pick();
		if (next !== focus) {
			if (focus) silence(focus);
			focus = next;
			if (focus) speak(focus);
		}
		// Ningún otro video puede sonar en simultáneo.
		for (const v of videos()) if (v !== focus && !v.muted && !v.paused && v !== manual && !fadingOut(v)) silence(v);
		paint();
	}
	const schedule = () => { raf || (raf = requestAnimationFrame(tick)); };

	// El usuario activó sonido en un video (controles nativos o botones propios).
	function onUserSound(v) {
		if (v.muted || expected.get(v) === v.muted) return;
		expected.set(v, false);
		toPause.delete(v);
		delete v.dataset.userMuted;
		if (!enabled) { enabled = true; save('on'); }
		unlocked = true;
		if (focus && focus !== v) silence(focus);
		manual = v;
		manualAt = performance.now();
		focus = v;
		paint();
	}

	document.addEventListener('volumechange', (e) => {
		const v = e.target;
		if (!(v instanceof HTMLVideoElement)) return;
		if (expected.get(v) === v.muted) return; // cambio hecho por el director
		if (!v.muted) onUserSound(v);
		else {
			// El usuario silenció este video: no volver a encenderlo solo.
			expected.set(v, true);
			if (v.dataset.audio === 'auto') v.dataset.userMuted = '1';
			if (v === manual) manual = null;
			if (v === focus) focus = null;
			schedule();
		}
	}, true);

	document.addEventListener('play', (e) => {
		const v = e.target;
		if (v instanceof HTMLVideoElement) pausedAt.delete(v);
		if (v instanceof HTMLVideoElement && !v.muted && expected.get(v) !== false) onUserSound(v);
		schedule();
	}, true);
	document.addEventListener('pause', (e) => {
		if (e.target instanceof HTMLVideoElement) pausedAt.set(e.target, performance.now());
		schedule();
		setTimeout(schedule, 1000);
	}, true);
	document.addEventListener('ended', schedule, true);

	const unlock = (e) => {
		// El botón flotante maneja su propio clic (si no, lo apagaría al instante).
		if (unlocked || (btn && e && btn.contains(e.target))) return;
		unlocked = true;
		schedule();
	};
	for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, unlock, { capture: true, passive: true });

	addEventListener('scroll', schedule, { passive: true });
	addEventListener('resize', schedule, { passive: true });
	document.addEventListener('visibilitychange', () => {
		if (document.hidden && focus) { silence(focus); focus = null; }
		else schedule();
	});

	// ── Botón flotante ─────────────────────────────────────────────
	let btn = null;
	function mountButton() {
		if (btn || !hasAudioMark()) return;
		const css = document.createElement('style');
		css.textContent = `
.snd-toggle{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:9000;
display:inline-flex;align-items:center;gap:.6em;padding:.7em 1em .7em .85em;border-radius:999px;cursor:pointer;
font:500 11px/1 var(--ed-mono,"JetBrains Mono Variable",ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase;
color:var(--ed-bone,#f4f1ea);background:rgb(12 10 6 / .62);border:1px solid rgb(255 255 255 / .16);
-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transition:opacity .4s,transform .4s var(--ed-expo,cubic-bezier(.16,1,.3,1)),border-color .3s}
.snd-toggle:hover{border-color:var(--ed-accent,#e8c874)}
.snd-toggle:focus-visible{outline:2px solid var(--ed-accent,#e8c874);outline-offset:3px}
.snd-toggle[hidden]{display:none}
.snd-bars{display:inline-flex;align-items:flex-end;gap:2px;height:12px}
.snd-bars i{width:2px;height:3px;background:currentColor;border-radius:1px;transition:height .3s}
.snd-toggle[data-state="on"] .snd-bars i{animation:snd 1s ease-in-out infinite}
.snd-toggle[data-state="on"] .snd-bars i:nth-child(2){animation-delay:-.4s}
.snd-toggle[data-state="on"] .snd-bars i:nth-child(3){animation-delay:-.7s}
.snd-toggle[data-state="on"]{color:var(--ed-accent,#e8c874)}
@keyframes snd{0%,100%{height:3px}50%{height:12px}}
@media (prefers-reduced-motion:reduce){.snd-toggle .snd-bars i{animation:none!important;height:8px}}`;
		document.head.appendChild(css);
		btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'snd-toggle';
		btn.innerHTML = '<span class="snd-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="snd-label"></span>';
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			if (enabled && !unlocked) { unlocked = true; schedule(); paint(); return; }
			enabled = !enabled;
			save(enabled ? 'on' : 'off');
			unlocked = true;
			if (!enabled) {
				manual = null;
				for (const v of videos()) if (!v.muted) silence(v);
				focus = null;
			} else for (const v of videos()) delete v.dataset.userMuted;
			schedule();
			paint();
		});
		document.body.appendChild(btn);
		paint();
	}

	function paint() {
		if (!btn) return;
		const playing = !!(focus && !focus.muted && !focus.paused);
		const state = !enabled ? 'off' : playing ? 'on' : 'ready';
		btn.dataset.state = state;
		btn.setAttribute('aria-pressed', String(enabled));
		btn.setAttribute('aria-label', !enabled ? 'Sonido desactivado. Activar sonido de los videos' : !unlocked ? 'Activar sonido de los videos' : 'Sonido activado. Silenciar videos');
		btn.querySelector('.snd-label').textContent =
			!enabled ? 'Sin sonido' : !unlocked ? 'Activar sonido' : playing ? 'Sonando' : 'Sonido';
	}

	const start = () => { mountButton(); schedule(); };
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
	else start();
	// Transiciones de página de Astro (si están activas).
	document.addEventListener('astro:page-load', () => { manual = focus = null; btn = btn && btn.isConnected ? btn : null; start(); });
})();
