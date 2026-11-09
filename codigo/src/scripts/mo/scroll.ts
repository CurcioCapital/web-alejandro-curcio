/**
 * mo/scroll.ts — smooth scroll global (Lenis) + anclas #hash.
 *
 * Lenis mueve el scroll NATIVO del documento (no hay contenedor virtual),
 * así que todo lo que ya escucha `scroll` + getBoundingClientRect (motion.ts,
 * ensamblado.ts, el carrusel 3D, position:sticky) sigue funcionando igual.
 * Rueda/trackpad: suavizado. Táctil: nativo (syncTouch apagado).
 *
 * Bloqueos de scroll de terceros (modales, menú móvil que ponen
 * overflow:hidden en <body> o <html>): un MutationObserver los detecta y
 * frena/reanuda Lenis solo. Para scrollers internos alcanza con que tengan
 * overflow:auto (allowNestedScroll); `data-lenis-prevent` los excluye a mano.
 */
import Lenis from 'lenis';
import { html, state } from './env';

export function headerOffset(el?: Element | null) {
  if (el) {
    const sm = parseFloat(getComputedStyle(el).scrollMarginTop);
    if (sm > 0) return sm;
  }
  const h = document.querySelector('header');
  if (!h) return 0;
  const pos = getComputedStyle(h).position;
  return pos === 'sticky' || pos === 'fixed' ? h.getBoundingClientRect().height : 0;
}

function resolveTarget(t: number | string | HTMLElement): HTMLElement | number | null {
  if (typeof t === 'number') return t;
  if (typeof t === 'string') {
    if (t === '#' || t === '#top') return 0;
    const id = decodeURIComponent(t.replace(/^#/, ''));
    return document.getElementById(id);
  }
  return t;
}

export function scrollToTarget(
  t: number | string | HTMLElement,
  { offset, immediate = false, duration }: { offset?: number; immediate?: boolean; duration?: number } = {}
) {
  const target = resolveTarget(t);
  if (target === null) return;
  const off = offset ?? (typeof target === 'number' ? 0 : -headerOffset(target));
  if (state.lenis) {
    state.lenis.scrollTo(target, {
      offset: off,
      immediate,
      duration: duration ?? 1.3,
      easing: (x) => (x === 1 ? 1 : 1 - 2 ** (-10 * x)),
      force: true,
    });
  } else {
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY + off;
    scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
  }
}

export function initLenis() {
  const lenis = new Lenis({
    lerp: 0.095,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 1,
    allowNestedScroll: true,
    autoRaf: false,
    anchors: false,
  });
  state.lenis = lenis;
  window.__lenis = lenis;

  // bloqueos de scroll puestos por otros scripts
  const check = () => {
    const bodyLock = getComputedStyle(document.body).overflowY === 'hidden';
    const htmlLock = html.style.overflow === 'hidden' || html.style.overflowY === 'hidden';
    const locked = bodyLock || htmlLock || html.hasAttribute('data-scroll-lock');
    if (locked && !lenis.isStopped) lenis.stop();
    else if (!locked && lenis.isStopped && state.introDone && !html.classList.contains('mo-leave')) lenis.start();
  };
  const mo = new MutationObserver(check);
  mo.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
  mo.observe(html, { attributes: true, attributeFilter: ['style', 'data-scroll-lock'] });
  return lenis;
}

/** Click en anclas de la MISMA página → scroll suave con offset del header. */
export function initAnchors() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null;
    if (!a || a.hasAttribute('data-no-smooth')) return;
    let url: URL;
    try {
      url = new URL(a.href, location.href);
    } catch {
      return;
    }
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
    const hash = url.hash;
    if (!hash || hash === '#') return;
    const el = resolveTarget(hash);
    if (el === null) return;
    e.preventDefault();
    scrollToTarget(el);
    if (location.hash !== hash) {
      const oldURL = location.href;
      history.pushState(null, '', hash);
      dispatchEvent(new HashChangeEvent('hashchange', { oldURL, newURL: location.href }));
    }
    // foco para teclado/lectores, sin saltar
    if (el instanceof HTMLElement) {
      if (!el.matches('a[href], button, input, select, textarea, [tabindex]')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
  });
}

/* ── Aterrizaje: toda navegación llega ARRIBA (o al #ancla) ───────────────
   Bug de cliente (21/10): al entrar a una sección la página aparecía abajo.
   Defensa en capas, sin depender de qué la movió:
   · history.scrollRestoration = 'manual' (también en el <head>): el
     navegador no restaura posiciones viejas (recarga, atrás, iframes).
   · Al arrancar y en pageshow (bfcache) se fija el destino: 0, o el
     elemento del #hash con el offset del header.
   · Durante la «ventana de aterrizaje» (hasta ~1,5s después de `load`,
     mínimo 2,5s, tope 10s) cada frame se re-fija el destino si algo lo
     movió (fuentes/imágenes tardías que cambian el layout, scroll anchoring,
     un focus() o scrollIntoView ajeno, Lenis con estado viejo) — salvo que
     el usuario ya haya tomado el control (rueda, toque, tecla, click). */
const IGNORED_HASH = new Set(['', '#', '#top', '#menu-sitio']);

function landingTarget(): HTMLElement | null {
  const h = location.hash;
  if (IGNORED_HASH.has(h)) return null;
  try {
    return document.getElementById(decodeURIComponent(h.slice(1)));
  } catch {
    return null;
  }
}

export function initScrollReset() {
  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  } catch {}

  let userTook = false;
  let until = 0;
  let raf = 0;
  let cap = performance.now() + 10000;

  const take = () => {
    // durante el preloader Lenis está frenado: esa rueda no es «tomar el control»
    if (state.introDone) userTook = true;
  };
  (['wheel', 'touchstart', 'pointerdown', 'keydown'] as const).forEach((ev) =>
    addEventListener(ev, take, { passive: true, capture: true })
  );

  const desired = (): number | null => {
    const el = landingTarget();
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null; // oculto: no pelear
    const max = document.documentElement.scrollHeight - innerHeight;
    return Math.max(0, Math.min(max, Math.round(r.top + scrollY - headerOffset(el))));
  };

  const pin = () => {
    if (userTook) return;
    const y = desired();
    if (y === null) return;
    const lenisOff = state.lenis && Math.abs(state.lenis.scroll - y) > 1;
    if (Math.abs(scrollY - y) > 1 || lenisOff) {
      state.lenis?.scrollTo(y, { immediate: true, force: true });
      if (Math.abs(scrollY - y) > 1) window.scrollTo(0, y);
    }
  };

  const loop = () => {
    pin();
    raf = !userTook && performance.now() < until ? requestAnimationFrame(loop) : 0;
  };
  const arm = (ms: number) => {
    until = Math.max(until, Math.min(performance.now() + ms, cap));
    if (!raf && !userTook) raf = requestAnimationFrame(loop);
  };

  pin();
  // Embebido (preview en iframe de altura automática): el que scrollea es el
  // documento padre y conserva su posición entre navegaciones. scrollIntoView
  // propaga a los ancestros y lleva el inicio de la página a la vista.
  if (window.top !== window.self && !location.hash) {
    try { document.documentElement.scrollIntoView({ block: 'start' }); } catch {}
  }
  arm(2500);
  if (document.readyState === 'complete') arm(1500);
  else addEventListener('load', () => (pin(), arm(1500)), { once: true });
  document.fonts?.ready.then(() => (pin(), arm(800)));

  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    userTook = false;
    until = 0;
    cap = performance.now() + 10000;
    pin();
    arm(1500);
  });
}
