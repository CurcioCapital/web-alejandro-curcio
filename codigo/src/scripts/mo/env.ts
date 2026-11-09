/**
 * mo/env.ts — estado compartido del sistema de motion global.
 *
 * `html.js`  → el JS corre (lo pone el script inline del <head>).
 * `html.mo`  → además hay movimiento permitido (no reduced-motion): de esta
 *              clase cuelgan TODOS los estados iniciales ocultos.
 * `html.mo-fail` → el failsafe del <head> se disparó (el módulo tardó o
 *              falló): se trata como modo estático, todo visible.
 */
import type Lenis from 'lenis';

export const html = document.documentElement;

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Movimiento activo: html.mo puesto y sin failsafe. */
export const animated = () => html.classList.contains('mo') && !html.classList.contains('mo-fail');
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
export const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;

export interface MotionState {
  lenis: Lenis | null;
  /** velocidad de scroll suavizada, px/frame (signo = dirección) */
  velocity: number;
  /** dirección del último scroll: 1 abajo, -1 arriba */
  direction: 1 | -1;
  /** true cuando terminó el preloader / la cortina de entrada */
  introDone: boolean;
  /** suscriptores por frame (marquesinas, cursor, magnético, kit) */
  tickers: Set<(dt: number, now: number) => void>;
  /** marca que hay que re-medir triggers/parallax/scrub */
  dirty: boolean;
}

export const state: MotionState = {
  lenis: null,
  velocity: 0,
  direction: 1,
  introDone: false,
  tickers: new Set(),
  dirty: true,
};

declare global {
  interface Window {
    __lenis?: Lenis | null;
    __motionReady?: boolean;
    __motion?: {
      state: MotionState;
      refresh: () => void;
      scrollTo: (target: number | string | HTMLElement, opts?: { offset?: number; immediate?: boolean; duration?: number }) => void;
      onTick: (fn: (dt: number, now: number) => void) => () => void;
      stop: () => void;
      start: () => void;
    };
  }
}
