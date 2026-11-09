/**
 * mo/counter.ts — data-counter: cuenta de 0 (o de data-counter-from; los
 * años, sólo sus últimos 24) al número que YA está en el texto.
 *
 * Lee el primer número del texto («1.200+», «US$ 30», «+40», «3,5», «2026»)
 * y conserva prefijo y sufijo. Formato es-UY: el punto seguido de grupos de
 * 3 dígitos es separador de miles, la coma es decimal. Si el original no
 * tenía separador de miles (p. ej. un año), la cuenta tampoco lo usa.
 * Al terminar se restaura el nodo de texto ORIGINAL, carácter por
 * carácter: el número final es exactamente el del HTML.
 */
import { easeOutExpo } from './env';

interface Parsed {
  node: Text;
  original: string;
  before: string;
  after: string;
  value: number;
  decimals: number;
  thousands: string; // '' si no había agrupación
  decimal: string;
  from: number;
}

const NUM = /\d[\d.,]*\d|\d/;

function parse(el: HTMLElement): Parsed | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue || '';
    const m = text.match(NUM);
    if (!m || m.index === undefined) continue;
    const tok = m[0];
    let thousands = '';
    let decimal = ',';
    let intPart = tok;
    let decPart = '';
    const hasDot = tok.includes('.');
    const hasComma = tok.includes(',');
    if (hasDot && hasComma) {
      // 1.234,5 (es) o 1,234.5 (en): el último separador es el decimal
      const lastDot = tok.lastIndexOf('.');
      const lastComma = tok.lastIndexOf(',');
      decimal = lastComma > lastDot ? ',' : '.';
      thousands = decimal === ',' ? '.' : ',';
      [intPart, decPart] = tok.split(decimal);
    } else if (hasDot) {
      const groups = tok.split('.');
      if (groups.slice(1).every((g) => g.length === 3)) {
        thousands = '.';
      } else {
        decimal = '.';
        [intPart, decPart] = [groups.slice(0, -1).join(''), groups[groups.length - 1]];
      }
    } else if (hasComma) {
      const groups = tok.split(',');
      if (groups.length > 2 && groups.slice(1).every((g) => g.length === 3)) {
        thousands = ',';
      } else {
        decimal = ',';
        [intPart, decPart] = [groups.slice(0, -1).join(''), groups[groups.length - 1]];
      }
    }
    const digits = intPart.replace(/[.,]/g, '');
    const value = Number(`${digits}${decPart ? '.' + decPart : ''}`);
    if (!Number.isFinite(value)) return null;
    return {
      node: n as Text,
      original: text,
      before: text.slice(0, m.index),
      after: text.slice(m.index + tok.length),
      value,
      decimals: decPart.length,
      thousands,
      decimal,
      from: startValue(el, value, decPart.length, thousands),
    };
  }
  return null;
}

function format(p: Parsed, v: number) {
  const fixed = v.toFixed(p.decimals);
  let [i, d] = fixed.split('.');
  if (p.thousands) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, p.thousands);
  return d ? `${i}${p.decimal}${d}` : i;
}

/** Desde dónde cuenta. `data-counter-from="1990"` lo fija a mano. Si no,
 *  los valores que parecen AÑOS (entero 1900–2100, sin separador de miles)
 *  no arrancan en 0: cuentan sólo los últimos 24 (p. ej. 2002 → 2026). */
function startValue(el: HTMLElement, value: number, decimals: number, thousands: string) {
  const f = Number(el.dataset.counterFrom);
  if (el.dataset.counterFrom !== undefined && Number.isFinite(f)) return f;
  if (!decimals && !thousands && value >= 1900 && value <= 2100) return value - 24;
  return 0;
}

const parsed = new WeakMap<HTMLElement, Parsed>();

/** Prepara el contador: lo deja en 0 (sólo con motion activo). */
export function prepareCounter(el: HTMLElement, animate: boolean) {
  const p = parse(el);
  if (p) parsed.set(el, p);
  if (p && animate) p.node.nodeValue = p.before + format(p, p.from) + p.after;
  el.setAttribute('data-counter-ready', '');
}

export function runCounter(el: HTMLElement) {
  const p = parsed.get(el);
  if (!p) return;
  const dur = Number(el.dataset.counterDuration) || Math.min(2400, 1400 + Math.log10(Math.abs(p.value - p.from) + 1) * 220);
  const delay = Number(el.dataset.delay) || 0;
  el.classList.add('is-counting');
  const t0 = performance.now() + delay;
  const tick = (now: number) => {
    const t = Math.max(0, (now - t0) / dur);
    if (t >= 1) {
      p.node.nodeValue = p.original; // exacto, como vino en el HTML
      el.classList.remove('is-counting');
      return;
    }
    let v = p.from + (p.value - p.from) * easeOutExpo(t);
    if (p.decimals === 0) v = Math.floor(v);
    p.node.nodeValue = p.before + format(p, v) + p.after;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
