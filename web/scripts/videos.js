/* Carga de videos a demanda (2026-11-13).
 * - <video data-lv data-src="…" [data-src-m="…"] autoplay preload="none">: no descarga nada al abrir la página;
 *   el archivo se pide cuando el video está a ~1,5 pantallas de aparecer (o enseguida si tiene data-lv-eager).
 * - En celular (≤ 860 px) usa data-src-m (versión liviana) si existe.
 * - Videos que ya tienen src y data-src-m (se reproducen al tocar o pasar el mouse): en celular se cambia el src
 *   antes de que se descargue nada.
 * - Pausa los videos automáticos cuando salen de pantalla y los retoma al volver (ahorra batería y procesador).
 * - data-lv-wait (trailers): no arranca hasta que se ve al menos la mitad del video, y la primera vez
 *   empieza desde el principio (13/11/2026, Kingdom of Drift).
 * Fuente: codigo/public/scripts/videos.js. Visualmente no cambia nada: los posters se ven igual que antes.
 */
(() => {
	const mobile = window.matchMedia('(max-width: 860px)').matches;
	const pick = (el) => (mobile && el.dataset.srcM) ? el.dataset.srcM : el.dataset.src;
	const play = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };

	if (mobile) {
		document.querySelectorAll('[data-src-m]:not([data-lv])').forEach((el) => {
			if (el.dataset.src) el.dataset.src = el.dataset.srcM;
			if (el.tagName === 'VIDEO' && el.getAttribute('src')) el.setAttribute('src', el.dataset.srcM);
		});
	}

	const vids = [...document.querySelectorAll('video[data-lv]')];
	if (!vids.length) return;

	const load = (v) => {
		if (v.dataset.lvLoaded) return;
		v.dataset.lvLoaded = '1';
		const sources = v.querySelectorAll('source[data-src]');
		if (sources.length) { sources.forEach((s) => { s.src = pick(s); }); v.load(); }
		else if (v.dataset.src) { v.src = pick(v); }
		if (v.autoplay && !v.hasAttribute('data-lv-wait')) play(v);
	};

	if (!('IntersectionObserver' in window)) { vids.forEach(load); return; }

	const near = new IntersectionObserver((entries) => {
		for (const e of entries) if (e.isIntersecting) { load(e.target); near.unobserve(e.target); }
	}, { rootMargin: '150% 0px 150% 0px' });

	const seen = new IntersectionObserver((entries) => {
		for (const e of entries) {
			const v = e.target;
			if (!v.dataset.lvLoaded) continue;
			if (e.isIntersecting) { if (v.autoplay && v.paused && !v.ended) play(v); }
			else if (!v.paused) v.pause();
		}
	}, { threshold: 0 });

	const half = new IntersectionObserver((entries) => {
		for (const e of entries) {
			const v = e.target;
			if (e.isIntersecting && e.intersectionRatio >= 0.5) {
				load(v);
				if (!v.dataset.lvStarted) { v.dataset.lvStarted = '1'; try { v.currentTime = 0; } catch {} }
				if (v.paused) play(v);
			} else if (!e.isIntersecting && !v.paused) v.pause();
		}
	}, { threshold: [0, 0.5] });

	for (const v of vids) {
		if (v.hasAttribute('data-lv-eager')) load(v); else near.observe(v);
		if (v.hasAttribute('data-lv-wait')) half.observe(v); else seen.observe(v);
	}
})();
