/**
 * mo/marquee.ts — data-marquee: marquesina infinita reactiva al scroll.
 *
 *   data-marquee                  activa (los hijos directos son el contenido)
 *   data-marquee-speed="60"       px por segundo (negativo = hacia la derecha)
 *   data-marquee-hover="slow|pause|none"   default "slow"
 *   data-marquee-react="true|false"        default true: la velocidad de
 *         scroll la acelera y su dirección la invierte (como landonorris.com)
 *
 * Los clones llevan aria-hidden + inert (ni lector ni tab los ven dos
 * veces). Se pausa fuera de pantalla y con la pestaña oculta. Sin JS o con
 * reduced-motion el contenido queda estático, tal cual vino.
 */
import { state } from './env';

interface Mq {
  el: HTMLElement;
  track: HTMLElement;
  group: HTMLElement;
  width: number;
  x: number;
  speed: number;
  hover: string;
  react: boolean;
  hovering: boolean;
  factor: number;
  visible: boolean;
}

const list: Mq[] = [];

export function setupMarquee(el: HTMLElement) {
  if (el.hasAttribute('data-marquee-done')) return;
  el.setAttribute('data-marquee-done', '');
  const cs = getComputedStyle(el);
  const gap = cs.columnGap && cs.columnGap !== 'normal' ? cs.columnGap : '0px';

  const track = document.createElement('div');
  track.className = 'mo-mq-track';
  const group = document.createElement('div');
  group.className = 'mo-mq-group';
  group.style.gap = gap;
  group.style.paddingRight = gap;
  while (el.firstChild) group.appendChild(el.firstChild);
  track.appendChild(group);
  el.appendChild(track);
  el.classList.add('mo-mq-on');

  const mq: Mq = {
    el,
    track,
    group,
    width: 0,
    x: 0,
    // ×2.4 (pedido 26/10): las cintas iban muy lentas para leerse con ritmo.
    speed: (Number(el.dataset.marqueeSpeed) || 60) * 2.4,
    hover: el.dataset.marqueeHover || 'slow',
    react: el.dataset.marqueeReact !== 'false',
    hovering: false,
    factor: 1,
    visible: true,
  };
  el.addEventListener('pointerenter', () => (mq.hovering = true));
  el.addEventListener('pointerleave', () => (mq.hovering = false));
  measure(mq);
  list.push(mq);
}

function measure(mq: Mq) {
  mq.width = mq.group.getBoundingClientRect().width;
  if (!mq.width) return;
  // clones hasta cubrir el contenedor + un grupo
  const need = Math.ceil((mq.el.clientWidth + mq.width) / mq.width);
  let have = mq.track.children.length;
  while (have < Math.max(2, need)) {
    const c = mq.group.cloneNode(true) as HTMLElement;
    c.setAttribute('aria-hidden', 'true');
    c.setAttribute('inert', '');
    mq.track.appendChild(c);
    have++;
  }
}

export function remeasureMarquees() {
  list.forEach(measure);
}

export function tickMarquees(dt: number) {
  if (!list.length || document.hidden) return;
  const vh = innerHeight;
  const v = state.velocity;
  for (const mq of list) {
    const r = mq.el.getBoundingClientRect();
    mq.visible = r.bottom > -50 && r.top < vh + 50;
    if (!mq.visible || !mq.width) continue;
    let target = 1;
    if (mq.react) target = state.direction * (1 + Math.min(Math.abs(v) * 0.18, 5));
    if (mq.hovering && mq.hover === 'slow') target *= 0.25;
    if (mq.hovering && mq.hover === 'pause') target = 0;
    mq.factor += (target - mq.factor) * Math.min(1, dt * 6);
    mq.x -= mq.speed * mq.factor * dt;
    const w = mq.width;
    if (mq.x <= -w) mq.x += w;
    if (mq.x > 0) mq.x -= w;
    mq.track.style.transform = `translate3d(${mq.x.toFixed(2)}px,0,0)`;
  }
}
