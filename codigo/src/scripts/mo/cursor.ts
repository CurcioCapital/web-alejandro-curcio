/**
 * mo/cursor.ts — cursor custom + data-magnetic. Sólo pointer:fine (mouse/
 * trackpad) y con motion activo; en táctil no se crea nada.
 *
 * data-cursor="view|play|drag|link" (+ data-cursor-label="Ver") cambia el
 * estado del cursor. Etiquetas por defecto: view «Ver», play «Play»,
 * drag «Arrastrá». Sobre cualquier link/botón sin data-cursor el cursor
 * pasa a «hover» (anillo hueco). El cursor nativo sólo se oculta donde la
 * burbuja con etiqueta lo reemplaza (view/play/drag).
 *
 * data-magnetic="0.35" atrae el elemento hacia el puntero mientras está
 * encima (fuerza 0–1, default 0.35). Usa la propiedad CSS `translate`, que
 * se compone con los `transform` propios del componente.
 */
import { html, lerp, state } from './env';

const LABELS: Record<string, string> = { view: 'Ver', play: 'Play', drag: 'Arrastrá', link: '' };
const INTERACTIVE = 'a[href], button, [role="button"], summary, label[for], select, input[type="submit"], input[type="button"]';
const TEXTY = 'input:not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]';

export function initCursor() {
  const root = document.createElement('div');
  root.className = 'mo-cursor';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<div class="mo-cursor__ring"><span class="mo-cursor__label"></span></div><div class="mo-cursor__dot"></div>';
  document.body.appendChild(root);
  html.classList.add('mo-cursor-on');
  const dot = root.querySelector<HTMLElement>('.mo-cursor__dot')!;
  const ring = root.querySelector<HTMLElement>('.mo-cursor__ring')!;
  const label = root.querySelector<HTMLElement>('.mo-cursor__label')!;

  let mx = -100;
  let my = -100;
  let rx = mx;
  let ry = my;
  let seen = false;
  let current = '';

  function setState(target: Element | null) {
    let s = '';
    let text = '';
    const c = target?.closest<HTMLElement>('[data-cursor]');
    if (c) {
      s = c.dataset.cursor || 'view';
      text = c.dataset.cursorLabel ?? LABELS[s] ?? '';
    } else if (target?.closest(TEXTY)) {
      s = 'text';
    } else if (target?.closest(INTERACTIVE)) {
      s = 'hover';
    }
    if (s !== current) {
      current = s;
      if (s) root.dataset.state = s;
      else delete root.dataset.state;
    }
    if (label.textContent !== text) label.textContent = text;
  }

  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      mx = e.clientX;
      my = e.clientY;
      if (!seen) {
        seen = true;
        rx = mx;
        ry = my;
        root.classList.add('is-visible');
      }
      setState(e.target as Element);
    },
    { passive: true }
  );
  // al scrollear cambia lo que hay debajo del puntero sin pointermove
  addEventListener('scroll', () => seen && setState(document.elementFromPoint(mx, my)), { passive: true });
  document.addEventListener('pointerleave', () => root.classList.remove('is-visible'));
  document.addEventListener('pointerenter', () => seen && root.classList.add('is-visible'));
  addEventListener('pointerdown', () => root.classList.add('is-down'));
  // un click puede abrir un modal/menú bajo el puntero sin que se mueva
  addEventListener('click', () => setTimeout(() => seen && setState(document.elementFromPoint(mx, my)), 60));
  addEventListener('pointerup', () => root.classList.remove('is-down'));

  state.tickers.add((dt) => {
    const k = 1 - Math.pow(0.0001, dt); // ~ independiente del framerate
    rx = lerp(rx, mx, k * 0.9);
    ry = lerp(ry, my, k * 0.9);
    dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0)`;
  });
}

/* ── data-magnetic ─────────────────────────────────────────────────────── */
interface Mag {
  el: HTMLElement;
  strength: number;
  tx: number;
  ty: number;
  x: number;
  y: number;
}
const mags: Mag[] = [];

export function setupMagnetic(el: HTMLElement) {
  if (el.hasAttribute('data-magnetic-done')) return;
  el.setAttribute('data-magnetic-done', '');
  const m: Mag = { el, strength: Number(el.dataset.magnetic) || 0.35, tx: 0, ty: 0, x: 0, y: 0 };
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    // medimos sin el desplazamiento actual para no realimentar
    const cx = r.left - m.x + r.width / 2;
    const cy = r.top - m.y + r.height / 2;
    m.tx = (e.clientX - cx) * m.strength;
    m.ty = (e.clientY - cy) * m.strength;
  });
  el.addEventListener('pointerleave', () => {
    m.tx = 0;
    m.ty = 0;
  });
  mags.push(m);
}

export function tickMagnetic(dt: number) {
  const k = 1 - Math.pow(0.001, dt);
  for (const m of mags) {
    if (Math.abs(m.tx - m.x) < 0.05 && Math.abs(m.ty - m.y) < 0.05) {
      if (m.x !== m.tx || m.y !== m.ty) {
        m.x = m.tx;
        m.y = m.ty;
        m.el.style.translate = m.x || m.y ? `${m.x}px ${m.y}px` : '';
      }
      continue;
    }
    m.x = lerp(m.x, m.tx, k);
    m.y = lerp(m.y, m.ty, k);
    m.el.style.translate = `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px`;
  }
}
