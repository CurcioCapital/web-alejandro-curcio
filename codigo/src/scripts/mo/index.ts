/**
 * mo/index.ts — arranque del sistema de motion global (lo llama Base.astro).
 * La API declarativa está documentada en /docs-motion-api.md.
 */
import { gsap } from 'gsap';
import { animated, finePointer, html, reduced, state } from './env';
import { initAnchors, initLenis, initScrollReset, scrollToTarget } from './scroll';
import { restagger, revealAll, scan, update } from './engine';
import { remeasureMarquees, setupMarquee, tickMarquees } from './marquee';
import { roll } from './roll';
import { initCursor, setupMagnetic, tickMagnetic } from './cursor';
import { initLinks, runIntro } from './transition';

let started = false;

function scanInteractive(root: ParentNode = document) {
  if (!animated()) return;
  root.querySelectorAll<HTMLElement>('[data-marquee]').forEach(setupMarquee);
  root.querySelectorAll<HTMLElement>('[data-roll]').forEach(roll);
  if (finePointer) root.querySelectorAll<HTMLElement>('[data-magnetic]').forEach(setupMagnetic);
}

export function refresh(root: ParentNode = document) {
  scan(root);
  scanInteractive(root);
  remeasureMarquees();
  state.dirty = true;
}

export function initMotion() {
  if (started) return;
  started = true;
  const anim = animated();
  if (!anim) {
    // reduced motion o failsafe: sin smooth scroll, sin transforms, sin preloader
    html.classList.remove('mo-preload', 'mo-enter');
  }

  // ── smooth scroll
  const lenis = anim ? initLenis() : null;
  if (!lenis) window.__lenis = null;
  // toda navegación aterriza arriba (o en el #ancla) — ver scroll.ts
  initScrollReset();
  initAnchors();

  // ── registro declarativo
  scan();
  scanInteractive();
  if (anim && finePointer) initCursor();
  initLinks(anim);
  if (!anim) {
    state.introDone = true;
    revealAll();
  }

  // ── un solo loop (ticker de GSAP: el mismo reloj para Lenis y para todo)
  let lastY = scrollY;
  const onScroll = () => {
    state.dirty = true;
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => {
    state.dirty = true;
    restagger();
    remeasureMarquees();
  });
  new ResizeObserver(() => (state.dirty = true)).observe(document.body);
  document.fonts?.ready.then(() => {
    restagger();
    remeasureMarquees();
    state.dirty = true;
  });
  addEventListener('load', () => {
    remeasureMarquees();
    state.dirty = true;
  });

  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add((time, deltaMs) => {
    const dt = Math.min(0.1, deltaMs / 1000);
    if (lenis) lenis.raf(time * 1000);
    const y = scrollY;
    const raw = lenis ? lenis.velocity : y - lastY;
    if (y !== lastY) state.direction = y > lastY ? 1 : -1;
    lastY = y;
    state.velocity += (raw - state.velocity) * 0.2;
    if (state.dirty) {
      state.dirty = false;
      update();
    }
    if (anim) {
      tickMarquees(dt);
      tickMagnetic(dt);
    }
    state.tickers.forEach((fn) => fn(dt, time));
  });

  window.__motion = {
    state,
    refresh,
    scrollTo: scrollToTarget,
    onTick(fn) {
      state.tickers.add(fn);
      return () => state.tickers.delete(fn);
    },
    stop: () => lenis?.stop(),
    start: () => lenis?.start(),
  };

  window.__motionReady = true;
  dispatchEvent(new CustomEvent('motion:ready', { detail: { lenis, reduced, animated: anim } }));

  if (anim) runIntro();
  else update();
}
