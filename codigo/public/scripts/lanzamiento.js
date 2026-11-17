/* Lanzamiento de CEO DE TU VIDA (17/11/2026, pedidos de Emi). Hora de Montevideo.
 * Antes de las 20:00  → franja «— en vivo hoy, 20:00», tarjeta del home «En vivo · 20:00», ambas llevan a /ceo-de-tu-vida/#en-vivo.
 * 20:00 a 22:00       → «— en vivo ahora» / «En vivo ahora». Contador del clímax → «YA DISPONIBLE» + botón de compra.
 * Desde las 22:00     → franja «— ya disponible», tarjeta «Nuevo libro», el bloque #en-vivo queda como «Presentación · 17 de noviembre de 2026».
 * Cambia solo, sin recargar. Fuente: codigo/public/scripts/lanzamiento.js.
 */
(() => {
	const T1 = Date.parse('2026-11-17T20:00:00-03:00');
	const T2 = Date.parse('2026-11-17T22:00:00-03:00');
	const LIVE = '/ceo-de-tu-vida/#en-vivo';
	const set = (sel, fn) => document.querySelectorAll(sel).forEach(fn);
	const apply = () => {
		const now = Date.now();
		const st = now < T1 ? 'pre' : now < T2 ? 'live' : 'post';
		set('.ribbon-label', (e) => { e.textContent = st === 'pre' ? '— en vivo hoy, 20:00' : st === 'live' ? '— en vivo ahora' : '— ya disponible'; });
		set('a.ribbon', (a) => { a.setAttribute('href', st === 'post' ? '/ceo-de-tu-vida/' : LIVE); });
		set('[data-live-label]', (e) => {
			e.textContent = st === 'pre' ? 'En vivo · 20:00' : st === 'live' ? 'En vivo ahora' : 'Nuevo libro';
			const a = e.closest('a');
			if (a) {
				a.setAttribute('href', st === 'post' ? '/ceo-de-tu-vida/' : LIVE);
				a.setAttribute('aria-label', st === 'post' ? 'Nuevo libro: CEO DE TU VIDA. Ver el libro' : 'Presentación en vivo de CEO DE TU VIDA');
			}
		});
		set('[data-live-k]', (e) => { e.textContent = st === 'pre' ? 'En vivo · hoy, 20:00' : st === 'live' ? 'En vivo ahora' : 'Presentación · 17 de noviembre de 2026'; });
		set('#en-vivo', (s) => s.classList.toggle('is-live', st !== 'post'));
		set('.ceo-climax__count', (c) => c.classList.toggle('is-disponible', now >= T1));
		return st === 'post';
	};
	// Ir al bloque en vivo: al llegar con #en-vivo o al tocar un link a #en-vivo estando en la misma página.
	const goLive = () => {
		const el = document.getElementById('en-vivo');
		if (!el) return false;
		const y = el.getBoundingClientRect().top + scrollY - 80;
		if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.2 }); else scrollTo({ top: y, behavior: 'smooth' });
		return true;
	};
	document.addEventListener('click', (ev) => {
		const a = ev.target.closest && ev.target.closest('a[href$="#en-vivo"]');
		if (a && document.getElementById('en-vivo')) { ev.preventDefault(); ev.stopPropagation(); goLive(); }
	}, true);
	if (location.hash === '#en-vivo') {
		let n = 0; const t = setInterval(() => { n++; if (window.__lenis || n > 20) { clearInterval(t); setTimeout(goLive, 700); } }, 150);
	}
	if (!apply()) {
		const id = setInterval(() => { if (apply()) clearInterval(id); }, 5000);
	}
})();
