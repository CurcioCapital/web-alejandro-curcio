/**
 * mo/engine.ts — un solo motor de scroll para toda la página.
 *
 * Sin IntersectionObserver (no dispara en el preview del proyecto): cada
 * frame en que el scroll o el layout cambiaron se miden los elementos con
 * getBoundingClientRect() — primero TODAS las lecturas, después TODAS las
 * escrituras, para no forzar layout en el medio.
 *
 *   one-shot  .reveal, [data-reveal], [data-split], [data-counter]
 *             → se les agrega .is-in (y .in-view para el .reveal legado)
 *               cuando su borde superior cruza el 88% del viewport.
 *   continuo  [data-parallax="0.15"] → propiedad `translate` en Y
 *             [data-scrub]          → variable CSS --p de 0 a 1
 */
import { animated, clamp, state } from './env';
import { split, stagger } from './split';
import { prepareCounter, runCounter } from './counter';

interface Trigger {
  el: HTMLElement;
  kind: 'reveal' | 'split' | 'counter';
  start: number;
  done: boolean;
}
interface Para {
  el: HTMLElement;
  factor: number;
  y: number;
}
interface Scrub {
  el: HTMLElement;
  mode: string;
  p: number;
}

const triggers: Trigger[] = [];
const paras: Para[] = [];
const scrubs: Scrub[] = [];
const seen = new WeakSet<Element>();

function startOf(el: HTMLElement, def: number) {
  const s = Number(el.dataset.start);
  return Number.isFinite(s) && s > 0 ? s : def;
}

/** Busca elementos nuevos (se puede llamar de nuevo tras inyectar HTML). */
export function scan(root: ParentNode = document) {
  const anim = animated();
  root.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    if (seen.has(el)) return;
    seen.add(el);
    if (anim) split(el);
    else el.setAttribute('data-split-done', '');
    triggers.push({ el, kind: 'split', start: startOf(el, 0.9), done: !anim });
  });
  root.querySelectorAll<HTMLElement>('[data-counter]').forEach((el) => {
    if (seen.has(el)) return;
    seen.add(el);
    prepareCounter(el, anim);
    triggers.push({ el, kind: 'counter', start: startOf(el, 0.92), done: !anim });
  });
  root.querySelectorAll<HTMLElement>('.reveal, [data-reveal]').forEach((el) => {
    if (seen.has(el)) return;
    seen.add(el);
    const t: Trigger = { el, kind: 'reveal', start: startOf(el, 0.88), done: false };
    if (el.dataset.delay && el.hasAttribute('data-reveal')) el.style.transitionDelay = `${el.dataset.delay}ms`;
    triggers.push(t);
  });
  root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    if (seen.has(el)) return;
    seen.add(el);
    if (anim) paras.push({ el, factor: Number(el.dataset.parallax) || 0.15, y: 0 });
  });
  root.querySelectorAll<HTMLElement>('[data-scrub]').forEach((el) => {
    if (seen.has(el)) return;
    seen.add(el);
    if (anim) scrubs.push({ el, mode: el.dataset.scrub || 'through', p: -1 });
    else el.style.setProperty('--p', '1');
  });
  state.dirty = true;
}

function fire(t: Trigger) {
  t.done = true;
  t.el.classList.add('is-in');
  if (t.kind === 'reveal') t.el.classList.add('in-view');
  if (t.kind === 'counter') runCounter(t.el);
}

/** Lecturas y escrituras de un frame. */
export function update() {
  const vh = innerHeight;
  const gate = state.introDone;

  // ── lecturas
  const toFire: Trigger[] = [];
  if (gate) {
    for (const t of triggers) {
      if (t.done) continue;
      const r = t.el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue; // display:none
      if (r.top < vh * t.start) toFire.push(t);
    }
  }
  const pY: number[] = [];
  for (const p of paras) {
    const r = p.el.getBoundingClientRect();
    const center = r.top - p.y + r.height / 2; // posición sin el desplazamiento actual
    const visible = r.bottom - p.y > -vh * 0.5 && r.top - p.y < vh * 1.5;
    pY.push(visible ? -(center - vh / 2) * p.factor : p.y);
  }
  const sP: number[] = [];
  for (const s of scrubs) {
    const r = s.el.getBoundingClientRect();
    let p: number;
    if (s.mode === 'enter') p = (vh - r.top) / vh;
    else if (s.mode === 'stick' || s.mode === 'pin') p = -r.top / Math.max(1, r.height - vh);
    else if (s.mode === 'exit') p = -r.top / Math.max(1, r.height);
    else p = (vh - r.top) / (vh + r.height);
    sP.push(clamp(p));
  }

  // ── escrituras
  toFire.forEach(fire);
  paras.forEach((p, i) => {
    const y = pY[i];
    if (Math.abs(y - p.y) < 0.05) return;
    p.y = y;
    p.el.style.translate = `0 ${y.toFixed(2)}px`;
  });
  scrubs.forEach((s, i) => {
    const p = sP[i];
    if (Math.abs(p - s.p) < 0.0005) return;
    s.p = p;
    s.el.style.setProperty('--p', p.toFixed(4));
  });
}

/** Al cambiar fuentes/ancho: sólo se recalculan los retardos por línea. */
export function restagger() {
  document.querySelectorAll<HTMLElement>('[data-split-done]').forEach((el) => {
    if (!el.classList.contains('is-in') && el.querySelector('.mo-w')) stagger(el);
  });
}

/** Modo estático (reduced motion / failsafe): todo en su estado final. */
export function revealAll() {
  triggers.forEach((t) => {
    t.el.classList.add('is-in');
    if (t.kind === 'reveal') t.el.classList.add('in-view');
    t.done = true;
  });
}
