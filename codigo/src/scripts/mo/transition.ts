/**
 * mo/transition.ts — preloader de primera visita + cortina entre páginas.
 *
 * No hay router SPA: la navegación sigue siendo real (cada página corre
 * sus propios scripts como siempre). La cortina sube y tapa, se navega, y
 * en la página nueva el script inline del <head> ve la marca en
 * sessionStorage y arranca con la cortina puesta (`html.mo-enter`), que acá
 * se retira hacia arriba. Así no hay flash entre una página y otra.
 *
 * El preloader (contador 0→100) corre sólo la primera vez por sesión
 * (`html.mo-preload`, decidido en el <head>). Sin sessionStorage (modo
 * privado estricto) no hay preloader ni cortina de entrada: nunca se
 * bloquea la página.
 */
import { html, state } from './env';

const KEY_CURTAIN = 'mo:curtain';
const FILE_EXT = /\.(pdf|jpe?g|png|webp|avif|gif|svg|mp4|webm|mov|mp3|zip|docx?|xlsx?|pptx?|txt|json|xml)$/i;

function store(k: string, v: string) {
  try {
    sessionStorage.setItem(k, v);
    return true;
  } catch {
    return false;
  }
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function afterTransition(el: HTMLElement, prop: string, fallback: number) {
  return new Promise<void>((resolve) => {
    let done = false;
    const end = (e?: TransitionEvent) => {
      if (done || (e && (e.target !== el || e.propertyName !== prop))) return;
      done = true;
      el.removeEventListener('transitionend', end);
      resolve();
    };
    el.addEventListener('transitionend', end);
    setTimeout(end, fallback);
  });
}

/* ── preloader ─────────────────────────────────────────────────────────── */
async function runPreloader() {
  const pl = document.querySelector<HTMLElement>('.mo-preloader');
  if (!pl) return;
  const count = pl.querySelector<HTMLElement>('.mo-preloader__count');
  const t0 = performance.now();
  const MIN = 1300;
  const MAX = 2600;
  let loaded = document.readyState === 'complete';
  if (!loaded) addEventListener('load', () => (loaded = true), { once: true });

  await new Promise<void>((resolve) => {
    let shown = 0;
    const tick = (now: number) => {
      const el = now - t0;
      // avanza con el tiempo; el último 15% espera al `load` (tope MAX)
      const timeP = Math.min(1, el / MIN);
      const cap = loaded || el > MAX ? 1 : 0.85;
      const target = Math.min(cap, 1 - (1 - timeP) ** 3);
      shown += (target - shown) * 0.18;
      if (target === 1 && 1 - shown < 0.004) shown = 1;
      const n = Math.round(shown * 100);
      if (count) count.textContent = String(n).padStart(3, '0');
      pl.style.setProperty('--mo-pl', shown.toFixed(3));
      if (shown >= 1) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await wait(120);
  pl.classList.add('is-out');
  // la página empieza a armarse mientras el panel sube
  await wait(380);
  finishIntro();
  await afterTransition(pl, 'translate', 1400);
  html.classList.remove('mo-preload');
}

/* ── cortina de entrada ────────────────────────────────────────────────── */
async function runEnter() {
  const c = document.querySelector<HTMLElement>('.mo-curtain');
  if (!c) return;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  c.classList.add('is-out');
  await wait(320);
  finishIntro();
  await afterTransition(c, 'translate', 1300);
  html.classList.remove('mo-enter');
  c.classList.remove('is-out');
}

let introResolve: () => void = () => {};
export const introDone = new Promise<void>((r) => (introResolve = r));

function finishIntro() {
  if (state.introDone) return;
  state.introDone = true;
  state.dirty = true;
  state.lenis?.start();
  introResolve();
  dispatchEvent(new CustomEvent('motion:intro'));
}

export function runIntro() {
  if (html.classList.contains('mo-preload')) {
    state.lenis?.stop();
    runPreloader();
  } else if (html.classList.contains('mo-enter')) {
    runEnter();
  } else {
    finishIntro();
  }
}

/* ── links internos ────────────────────────────────────────────────────── */
function eligible(a: HTMLAnchorElement, e?: MouseEvent): URL | null {
  if (e && (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return null;
  if (a.hasAttribute('download') || a.closest('[data-no-transition]')) return null;
  const target = a.getAttribute('target');
  if (target && target !== '_self') return null;
  const raw = a.getAttribute('href');
  if (!raw || raw.startsWith('#') || /^(mailto|tel|sms|javascript):/i.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(a.href, location.href);
  } catch {
    return null;
  }
  if (url.origin !== location.origin) return null;
  if (FILE_EXT.test(url.pathname) || url.pathname.startsWith('/api/')) return null;
  // misma página con #hash → lo resuelve el scroll de anclas, no la cortina
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return null;
  return url;
}

const prefetched = new Set<string>();
function prefetch(url: URL) {
  const k = url.pathname + url.search;
  if (prefetched.has(k)) return;
  prefetched.add(k);
  const l = document.createElement('link');
  l.rel = 'prefetch';
  l.href = k;
  document.head.appendChild(l);
}

let leaving = false;

export function initLinks(animatedNav: boolean) {
  document.addEventListener(
    'pointerover',
    (e) => {
      const a = (e.target as Element)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const url = eligible(a);
      if (url) prefetch(url);
    },
    { passive: true }
  );

  if (!animatedNav) return;

  document.addEventListener('click', (e) => {
    const a = (e.target as Element)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || leaving) return;
    const url = eligible(a, e);
    if (!url) return;
    e.preventDefault();
    leave(url.href);
  });

  // volver con el botón «atrás» desde bfcache: sacar la cortina
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    html.classList.remove('mo-leave', 'mo-enter');
    state.lenis?.start();
  });
}

async function leave(href: string) {
  leaving = true;
  const c = document.querySelector<HTMLElement>('.mo-curtain');
  if (!c || !store(KEY_CURTAIN, '1')) {
    location.href = href;
    return;
  }
  state.lenis?.stop();
  html.classList.remove('mo-enter');
  // forzar el estado de partida (abajo) antes de animar hacia arriba
  void c.offsetHeight;
  html.classList.add('mo-leave');
  await afterTransition(c, 'translate', 800);
  location.href = href;
}
