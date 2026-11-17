/* Lanzamiento de CEO DE TU VIDA (17/11/2026, pedido de Emi).
 * Antes de las 20:00 (Montevideo): franja «— presentación hoy, 20:00» y contador del clímax.
 * Desde las 20:00: franja «— ya disponible» y, en lugar del contador, «YA DISPONIBLE» con el botón grande de compra.
 * Cambia sola a la hora exacta, sin recargar. Fuente: codigo/public/scripts/lanzamiento.js.
 */
(() => {
	const T = Date.parse('2026-11-17T20:00:00-03:00');
	const apply = () => {
		const on = Date.now() >= T;
		document.querySelectorAll('.ribbon-label').forEach((e) => {
			e.textContent = on ? '— ya disponible' : '— presentación hoy, 20:00';
		});
		document.querySelectorAll('.ceo-climax__count').forEach((c) => c.classList.toggle('is-disponible', on));
		return on;
	};
	if (!apply()) {
		const id = setInterval(() => { if (apply()) clearInterval(id); }, 5000);
	}
})();
