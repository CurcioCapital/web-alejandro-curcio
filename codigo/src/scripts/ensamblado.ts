/**
 * ensamblado.ts — el motor de «la página se arma mientras scrolleás».
 *
 * Referencia pedida: cosmos.uy. Medido el 07/09/2026, ese sitio usa
 * GSAP + ScrollTrigger + Lenis + SplitType, y su vocabulario real es:
 *   · clip-path inset(100% 0 0) → inset(0): el medio se destapa de abajo
 *     hacia arriba en vez de aparecer con un fade.
 *   · SplitType parte los titulares en LÍNEAS y cada una sube a su lugar
 *     con retardo escalonado (medimos translateY de −57.6px por línea).
 *   · parallax: el medio se desplaza dentro de su marco mientras pasa.
 *   · una galería PINNEADA (position:sticky) que avanza con el scroll.
 *
 * Acá está reproducido SIN dependencias, con la misma física que ya usa el
 * sitio (motion.ts): una sola curva, un solo listener, rAF. Sumar GSAP+Lenis
 * para esto habría metido ~90KB y un scroll virtual que pelea con el
 * carrusel 3D y con el scrub del arco, que ya funcionan.
 *
 * NO se usa IntersectionObserver a propósito: en el panel de preview del
 * proyecto no dispara (ya nos pasó con la carga diferida de video). Todo se
 * resuelve con scroll + getBoundingClientRect.
 */
import { easeOutQuint } from './motion';

const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── partir titulares en líneas ─────────────────────────────────────────
   Cada palabra se envuelve, se agrupan por offsetTop (o sea: por línea real
   ya maquetada, no por conteo de caracteres) y cada línea queda dentro de un
   contenedor con overflow:hidden para que pueda subir desde abajo. */
function partirEnLineas(el: HTMLElement) {
  if (el.dataset.partido === 'si') return;
  // Guardar el texto ORIGINAL. Al re-partir (cuando cargan las fuentes
  // cambia el salto de línea), leer textContent del markup ya partido pega
  // las líneas sin separador y devuelve «Una vida.Seis facetas.»: se pierde
  // el espacio justo en el corte. La primera vez se guarda, y siempre se
  // parte desde ahí.
  if (!el.dataset.textoOriginal) el.dataset.textoOriginal = (el.textContent ?? '').trim();
  const texto = el.dataset.textoOriginal;
  el.textContent = '';
  const palabras = texto.trim().split(/\s+/);
  const spans = palabras.map((p) => {
    const s = document.createElement('span');
    s.textContent = p;
    s.style.display = 'inline-block';
    el.appendChild(s);
    el.appendChild(document.createTextNode(' '));
    return s;
  });

  const lineas: HTMLElement[][] = [];
  let topActual = -Infinity;
  for (const s of spans) {
    const t = s.offsetTop;
    if (Math.abs(t - topActual) > 4) {
      lineas.push([]);
      topActual = t;
    }
    lineas[lineas.length - 1].push(s);
  }

  el.textContent = '';
  lineas.forEach((linea, i) => {
    const marco = document.createElement('span');
    marco.className = 'ens-linea';
    const interior = document.createElement('span');
    interior.className = 'ens-linea-i';
    interior.style.transitionDelay = `${i * 90}ms`;
    interior.textContent = linea.map((s) => s.textContent).join(' ');
    marco.appendChild(interior);
    el.appendChild(marco);
  });
  el.dataset.partido = 'si';
}

/* ── registro de elementos animados ─────────────────────────────────── */
interface Pieza {
  el: HTMLElement;
  tipo: 'revelar' | 'parallax';
  /** parallax: cuántos px se desplaza a lo largo de todo el recorrido */
  recorrido: number;
}

const piezas: Pieza[] = [];

function registrar() {
  document.querySelectorAll<HTMLElement>('[data-ens]').forEach((el) => {
    if (el.dataset.ensListo === 'si') return;
    el.dataset.ensListo = 'si';
    if (el.dataset.ens === 'titular') partirEnLineas(el);
    piezas.push({ el, tipo: 'revelar', recorrido: 0 });
  });

  document.querySelectorAll<HTMLElement>('[data-ens-parallax]').forEach((el) => {
    if (el.dataset.ensListo === 'si') return;
    el.dataset.ensListo = 'si';
    piezas.push({
      el,
      tipo: 'parallax',
      recorrido: Number(el.dataset.ensParallax) || 60,
    });
  });
}

/* ── pintado ────────────────────────────────────────────────────────── */
function pintar() {
  const vh = window.innerHeight;
  for (const p of piezas) {
    const r = p.el.getBoundingClientRect();

    if (p.tipo === 'revelar') {
      // se dispara cuando el borde superior cruza el 88% del alto de la
      // ventana: entra armándose, no ya armado.
      if (!p.el.classList.contains('ens-visto') && r.top < vh * 0.88 && r.bottom > 0) {
        p.el.classList.add('ens-visto');
      }
      continue;
    }

    // parallax: 0 cuando el elemento entra por abajo, 1 cuando sale por
    // arriba. El desplazamiento va de +recorrido a −recorrido.
    const total = vh + r.height;
    const avance = Math.min(1, Math.max(0, (vh - r.top) / total));
    const d = (0.5 - avance) * 2 * p.recorrido;
    p.el.style.transform = `translate3d(0, ${d.toFixed(1)}px, 0)`;
  }
}

/* ── arranque ───────────────────────────────────────────────────────── */
export function iniciarEnsamblado() {
  registrar();

  if (reducido) {
    // Sin movimiento: todo en su estado final, y ni un listener colgado.
    piezas.forEach((p) => {
      p.el.classList.add('ens-visto');
      if (p.tipo === 'parallax') p.el.style.transform = 'none';
    });
    return;
  }

  document.documentElement.classList.add('ens-on');

  let raf = 0;
  const alScrollear = () => {
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        pintar();
      });
    }
  };

  addEventListener('scroll', alScrollear, { passive: true });
  addEventListener('resize', alScrollear, { passive: true });
  pintar();

  // Al cargar fuentes cambia el salto de línea: hay que volver a partir.
  document.fonts?.ready.then(() => {
    document.querySelectorAll<HTMLElement>('[data-ens="titular"]').forEach((el) => {
      if (el.classList.contains('ens-visto')) return;
      delete el.dataset.partido;
      partirEnLineas(el);
    });
    pintar();
  });
}

export { easeOutQuint };
