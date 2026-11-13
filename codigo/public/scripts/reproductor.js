/* Reproductor de video con sonido (2026-11-13).
 * 1) En línea: <figure class="vp" data-vp> <video class="vp-vid" data-src="…" [data-src-m="…"] poster="…" preload="none" playsinline>
 *    + <button class="vp-play" data-vp-play>…</button>. Al tocar el botón carga la versión que corresponde
 *    (liviana en celular), muestra los controles y reproduce con sonido.
 * 2) En ventana: <button data-vp-open data-src="…" [data-src-m="…"] [data-poster="…"] [data-ratio="9/16"]
 *    [data-title="…"]>. Abre una ventana sobre la página con el video y controles; Esc, la X o tocar
 *    afuera la cierran y el video se detiene.
 * Fuente: codigo/public/scripts/reproductor.js · estilos en estilos/reproductor.css.
 */
(() => {
	const mobile = () => window.matchMedia('(max-width: 860px)').matches;
	const srcOf = (el) => (mobile() && el.dataset.srcM) ? el.dataset.srcM : el.dataset.src;

	// ---- en línea ----
	document.querySelectorAll('[data-vp]').forEach((fig) => {
		const v = fig.querySelector('video');
		const btn = fig.querySelector('[data-vp-play]');
		if (!v || !btn) return;
		btn.addEventListener('click', () => {
			if (!v.getAttribute('src') && v.dataset.src) { v.src = srcOf(v); v.dataset.lvLoaded = '1'; }
			v.controls = true;
			v.muted = false;
			v.volume = 1;
			fig.classList.add('is-playing');
			const p = v.play(); if (p && p.catch) p.catch(() => {});
		});
		v.addEventListener('ended', () => { fig.classList.remove('is-playing'); v.controls = false; });
	});

	// ---- en ventana ----
	const openers = document.querySelectorAll('[data-vp-open]');
	if (!openers.length) return;
	const dlg = document.createElement('div');
	dlg.className = 'vpm';
	dlg.setAttribute('role', 'dialog');
	dlg.setAttribute('aria-modal', 'true');
	dlg.hidden = true;
	dlg.innerHTML = '<div class="vpm-back" data-vpm-close></div><div class="vpm-box"><button type="button" class="vpm-x" data-vpm-close aria-label="Cerrar"><span></span><span></span></button><video class="vpm-vid" controls playsinline preload="auto"></video><p class="vpm-title"></p></div>';
	document.body.appendChild(dlg);
	const vid = dlg.querySelector('video');
	const title = dlg.querySelector('.vpm-title');
	let last = null;

	const close = () => {
		if (dlg.hidden) return;
		vid.pause();
		vid.removeAttribute('src');
		vid.load();
		dlg.hidden = true;
		document.documentElement.classList.remove('vpm-open');
		if (window.__lenis && window.__lenis.start) window.__lenis.start();
		if (last) last.focus();
	};
	const open = (b) => {
		last = b;
		dlg.style.setProperty('--vpm-ratio', b.dataset.ratio || '16/9');
		title.textContent = b.dataset.title || '';
		title.hidden = !b.dataset.title;
		if (b.dataset.poster) vid.poster = b.dataset.poster; else vid.removeAttribute('poster');
		vid.src = srcOf(b);
		dlg.hidden = false;
		document.documentElement.classList.add('vpm-open');
		if (window.__lenis && window.__lenis.stop) window.__lenis.stop();
		vid.muted = false;
		vid.volume = 1;
		const p = vid.play(); if (p && p.catch) p.catch(() => {});
		dlg.querySelector('.vpm-x').focus();
	};
	openers.forEach((b) => b.addEventListener('click', () => open(b)));
	dlg.addEventListener('click', (e) => { if (e.target.closest('[data-vpm-close]')) close(); });
	document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();
