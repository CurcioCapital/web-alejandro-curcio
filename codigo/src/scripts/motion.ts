/**
 * motion.ts — shared motion machinery for the Home v2 "film" (no deps).
 *
 * Extracted from FacetasCarousel3D so every chapter speaks the same
 * physics: the signature CSS curve cubic-bezier(0.22, 1, 0.36, 1) has its
 * exact JS scrub mirror in easeOutQuint, scroll progress is measured the
 * same way everywhere (books cascade, carousel entrance), and the
 * assisted snap — "the user starts the move, the page finishes it" — is
 * reusable by any scroll-anchored chapter.
 *
 * Mother rule: scrub to enter (quint shaping, transition: none while
 * p < 1), time to inhabit (autoplays only after the chapter settles).
 */

/** Exact JS mirror of the signature curve cubic-bezier(0.22, 1, 0.36, 1). */
export const easeOutQuint = (t: number): number => 1 - (1 - t) ** 5;

/** JS mirror of --ease-inout cubic-bezier(0.65, 0, 0.35, 1) — page glides. */
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

/**
 * Scroll progress (0..1) of a chapter anchor: 0 while the anchor's top is
 * still at the bottom edge of the viewport ("entering"), 1 once it is
 * aligned with the top ("on stage"). p = clamp((vh − top) / vh, 0, 1).
 * The scrollbar IS the timeline — call this from a rAF-throttled scroll
 * listener and derive transforms/opacity from the returned p.
 */
export function scrollProgress(anchor: HTMLElement): number {
  const vh = window.innerHeight;
  const top = anchor.getBoundingClientRect().top;
  return Math.min(1, Math.max(0, (vh - top) / vh));
}

export interface AssistedSnapOptions {
  /** ms of scroll silence before the glide fires (default 140). */
  settleDelay?: number;
  /** Heading down: complete the entrance past this progress (default 0.2). */
  completeDown?: number;
  /** Heading up: only stay if still past this progress (default 0.85). */
  completeUp?: number;
}

export interface AssistedSnap {
  /** Call from the (per-event, un-throttled) scroll listener: tracks the
   *  scroll direction and re-arms the settle timer. */
  arm(): void;
  /** Cancel any pending/running glide (also wired to user input). */
  cancel(): void;
}

/**
 * Assisted snap: the user starts the move, the page finishes it.
 *
 * While the anchor's entrance is mid-scrub (0.02 < p < 0.98) and the
 * scroll settles, the page glides the rest of the way: heading down past
 * `completeDown` → complete the entrance (anchor top at viewport top);
 * otherwise (barely peeked, or heading back up) → retreat a full viewport
 * so the page never rests half-assembled. The user keeps veto power: any
 * wheel/touch/key input cancels the glide instantly. No-op under
 * prefers-reduced-motion.
 */
export function assistedSnap(
  anchor: HTMLElement,
  getProgress: () => number,
  { settleDelay = 140, completeDown = 0.2, completeUp = 0.85 }: AssistedSnapOptions = {}
): AssistedSnap {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let lastY = window.scrollY;
  let dir: 1 | -1 = 1;
  let settleT: ReturnType<typeof setTimeout> | null = null;
  let raf = 0;

  // Mid-transition when the scroll settles: glide the rest of the way.
  function assist() {
    const p = getProgress();
    if (reduced || raf || p <= 0.02 || p >= 0.98) return;
    const complete = dir === 1 ? p > completeDown : p > completeUp;
    const anchorAbs = anchor.getBoundingClientRect().top + window.scrollY;
    const target = complete ? anchorAbs : anchorAbs - window.innerHeight;
    glideTo(Math.max(0, target));
  }

  function glideTo(target: number) {
    const from = window.scrollY;
    const dist = target - from;
    if (Math.abs(dist) < 2) return;
    const dur = Math.min(900, 350 + Math.abs(dist) * 0.4);
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, from + dist * easeInOutCubic(t));
      raf = t < 1 ? requestAnimationFrame(tick) : 0;
    };
    raf = requestAnimationFrame(tick);
  }

  function cancel() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (settleT) clearTimeout(settleT);
  }

  (['wheel', 'touchstart', 'keydown'] as const).forEach((ev) =>
    window.addEventListener(ev, cancel, { passive: true })
  );

  function arm() {
    if (reduced) return;
    const y = window.scrollY;
    if (y !== lastY) dir = y > lastY ? 1 : -1;
    lastY = y;
    // Re-armed on every scroll event; fires once scrolling settles. The
    // !raf guard keeps the glide's own scroll events from re-arming it.
    if (!raf) {
      if (settleT) clearTimeout(settleT);
      settleT = setTimeout(assist, settleDelay);
    }
  }

  return { arm, cancel };
}

/* ── Sistema de motion global (21/10/2026) ─────────────────────────────
   La API declarativa (data-split, data-reveal, data-parallax, data-scrub,
   data-magnetic, data-cursor, data-marquee, data-roll, data-counter,
   Lenis, cortina, preloader) vive en ./mo/ y la arranca Base.astro con
   initMotion(). Documentación: /docs-motion-api.md. Las utilidades de
   arriba (easeOutQuint, scrollProgress, assistedSnap) no cambian. */
export { initMotion, refresh } from './mo/index';
