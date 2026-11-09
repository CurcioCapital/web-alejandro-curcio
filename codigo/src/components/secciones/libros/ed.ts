/**
 * ed.ts — motion LOCAL de las Páginas B (libros, capital-de-vida,
 * ceo-de-tu-vida, prensa, seguime, preguntale). Complementa el contrato
 * global de src/scripts/motion.ts (data-split, data-reveal, data-scrub,
 * data-counter, data-magnetic, data-marquee, data-roll, data-cursor) con
 * cuatro piezas que sólo existen acá:
 *
 *  - [data-ed-pin]   progreso 0→1 de un recorrido pineado (sticky) → --pin,
 *                    y data-step con el paso activo (data-steps="3").
 *  - [data-ed-tilt]  objeto 3D que sigue al mouse → --rx/--ry en .ed-tilt__obj.
 *  - [data-ed-odo]   número que entra rodando como odómetro cuando aparece en
 *                    pantalla. El texto original queda en un .ed-sr.
 *  - [data-ed-spot]  luz que sigue al cursor dentro de una tarjeta → --mx/--my.
 *
 * Sin IntersectionObserver (no dispara en el preview): scroll +
 * getBoundingClientRect + rAF. Todo se apaga con prefers-reduced-motion.
 * Si este script falla, nada queda oculto: los estados iniciales cuelgan de
 * html.ed-on, que pone este mismo script.
 */

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const root = document.documentElement;

/* ------------------------------------------------------------ odómetro */
function digitCol(d: number) {
  const wrap = document.createElement('span');
  wrap.className = 'ed-odo__d';
  const col = document.createElement('span');
  col.className = 'ed-odo__col';
  for (let i = 0; i <= 9; i++) {
    const s = document.createElement('span');
    s.textContent = String(i);
    col.appendChild(s);
  }
  col.style.setProperty('--d', String(d));
  wrap.appendChild(col);
  return wrap;
}

/** Pinta `value` en el odómetro `el`. Si la cantidad de caracteres no
 *  cambió, sólo mueve las ruedas (eso es lo que se ve como "flip"). */
export function odoSet(el: HTMLElement, value: string, start = false) {
  const prev = el.dataset.odoValue;
  el.dataset.odoValue = value;
  const sr = el.querySelector<HTMLElement>(':scope > .ed-sr');
  const vis = el.querySelector<HTMLElement>(':scope > .ed-odo');
  if (sr && vis && prev && prev.length === value.length) {
    sr.textContent = value;
    const cols = vis.querySelectorAll<HTMLElement>('.ed-odo__col');
    let k = 0;
    for (const ch of value) {
      if (/\d/.test(ch)) cols[k++]?.style.setProperty('--d', ch);
    }
    return;
  }
  el.textContent = '';
  const srEl = document.createElement('span');
  srEl.className = 'ed-sr';
  srEl.textContent = value;
  const v = document.createElement('span');
  v.className = 'ed-odo';
  v.setAttribute('aria-hidden', 'true');
  for (const ch of value) {
    if (/\d/.test(ch)) v.appendChild(digitCol(start ? 0 : Number(ch)));
    else {
      const s = document.createElement('span');
      s.textContent = ch;
      v.appendChild(s);
    }
  }
  el.append(srEl, v);
}

function odoRun(el: HTMLElement) {
  const value = el.dataset.odoValue ?? '';
  const cols = el.querySelectorAll<HTMLElement>('.ed-odo__col');
  let k = 0;
  let i = 0;
  for (const ch of value) {
    if (/\d/.test(ch)) {
      const col = cols[k++];
      if (col) {
        col.style.transitionDelay = `${i * 90}ms`;
        col.style.transitionDuration = `${1200 + i * 220}ms`;
        col.style.setProperty('--d', ch);
      }
      i++;
    }
  }
}

const odos: HTMLElement[] = [];
document.querySelectorAll<HTMLElement>('[data-ed-odo]').forEach((el) => {
  if (el.dataset.edOdo === 'live') return; // lo maneja su propio script (countdown)
  const value = (el.textContent ?? '').trim();
  if (!value || reduce) return;
  odoSet(el, value, true);
  odos.push(el);
});

/* ------------------------------------------------------------ pin */
const pins = Array.from(document.querySelectorAll<HTMLElement>('[data-ed-pin]'));

/* ------------------------------------------------------------ loop */
let ticking = false;
function frame() {
  ticking = false;
  const vh = window.innerHeight;
  for (let i = odos.length - 1; i >= 0; i--) {
    const r = odos[i].getBoundingClientRect();
    if (r.top < vh * 0.92 && r.bottom > 0) {
      odoRun(odos[i]);
      odos.splice(i, 1);
    }
  }
  for (const el of pins) {
    const r = el.getBoundingClientRect();
    const span = Math.max(1, r.height - vh);
    const p = Math.min(1, Math.max(0, -r.top / span));
    el.style.setProperty('--pin', p.toFixed(4));
    const steps = Number(el.dataset.steps || 0);
    if (steps > 1) {
      const s = String(Math.min(steps - 1, Math.round(p * (steps - 1))));
      if (el.dataset.step !== s) el.dataset.step = s;
    }
  }
}
function request() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(frame);
  }
}
window.addEventListener('scroll', request, { passive: true });
window.addEventListener('resize', request);
window.addEventListener('motion:ready', request);
request();
// por si un smooth-scroll mueve la página sin disparar scroll a tiempo
setTimeout(request, 400);

/* ------------------------------------------------------------ tilt */
if (fine && !reduce) {
  document.querySelectorAll<HTMLElement>('[data-ed-tilt]').forEach((el) => {
    const max = Number(el.dataset.edTilt || 10);
    const objs = el.querySelectorAll<HTMLElement>('.ed-tilt__obj');
    let raf = 0;
    let rx = 0;
    let ry = 0;
    const apply = () => {
      raf = 0;
      objs.forEach((o) => {
        o.style.setProperty('--rx', rx.toFixed(2));
        o.style.setProperty('--ry', ry.toFixed(2));
      });
    };
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      ry = x * max * 2;
      rx = -y * max * 1.4;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    el.addEventListener('pointerleave', () => {
      rx = 0;
      ry = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });
  });
}

/* ------------------------------------------------------------ spot */
if (fine && !reduce) {
  document.querySelectorAll<HTMLElement>('[data-ed-spot]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

root.classList.add('ed-on');
