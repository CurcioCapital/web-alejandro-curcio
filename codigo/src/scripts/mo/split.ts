/**
 * mo/split.ts — data-split="lines|words|chars".
 *
 * Recorre los nodos de texto del elemento (respetando <em>, <strong>, <a>,
 * <br>…) y envuelve cada palabra en una máscara `.mo-w > .mo-wi`; en modo
 * chars, cada letra además en `.mo-c`. Accesibilidad (el texto se lee UNA
 * sola vez, e innerText no se duplica):
 *  · lines / words: el texto real sigue ahí, con sus espacios como nodos de
 *    texto entre palabras — no se oculta nada ni se agrega copia.
 *  · chars: en encabezados/links/botones las letras llevan aria-hidden y
 *    el nombre va en aria-label. En p/span/div (no admiten aria-label) o
 *    con links/botones adentro no se oculta nada ni se agrega copia.
 *
 * En modo `lines` el retardo de cada palabra es el índice de SU LÍNEA real
 * (agrupadas por posición vertical), así suben juntas como una línea. Se
 * recalcula al cargar fuentes y al cambiar el ancho (sólo los retardos).
 */
export type SplitMode = 'lines' | 'words' | 'chars';

const STAGGER: Record<SplitMode, number> = { lines: 110, words: 45, chars: 18 };
const MAX_DELAY = 1100;
const SKIP = new Set(['SCRIPT', 'STYLE', 'svg', 'SVG', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA']);

export function modeOf(el: HTMLElement): SplitMode {
  const m = (el.dataset.split || 'lines').trim();
  return m === 'words' || m === 'chars' ? m : 'lines';
}

export function split(el: HTMLElement) {
  if (el.hasAttribute('data-split-done')) return;
  const mode = modeOf(el);
  const original = (el.textContent || '').replace(/\s+/g, ' ').trim();
  const interactive = !!el.querySelector('a, button, input, select, textarea, [tabindex]');
  const labelable = el.matches('h1, h2, h3, h4, h5, h6, a, button, [role="heading"], [role="button"], [role="link"]');
  // sólo se ocultan las letras si el nombre puede ir en aria-label; si no,
  // quedan expuestas (spans en línea sin espacios: se leen como palabra) y
  // no se agrega copia — innerText nunca sale duplicado.
  const hideChars = mode === 'chars' && !interactive && labelable && !!original;

  const texts: Text[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      let p = n.parentElement;
      while (p && p !== el) {
        if (SKIP.has(p.tagName) || p.classList.contains('mo-sr')) return NodeFilter.FILTER_REJECT;
        p = p.parentElement;
      }
      return n.nodeValue && n.nodeValue.length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n as Text);

  for (const t of texts) {
    const parts = (t.nodeValue || '').split(/(\s+)/);
    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      const w = document.createElement('span');
      w.className = 'mo-w';
      if (hideChars) w.setAttribute('aria-hidden', 'true');
      const wi = document.createElement('span');
      wi.className = 'mo-wi';
      if (mode === 'chars') {
        for (const ch of Array.from(part)) {
          const c = document.createElement('span');
          c.className = 'mo-c';
          c.textContent = ch;
          wi.appendChild(c);
        }
      } else {
        wi.textContent = part;
      }
      w.appendChild(wi);
      frag.appendChild(w);
    }
    t.parentNode?.replaceChild(frag, t);
  }

  if (hideChars && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', original);
  el.setAttribute('data-split-done', '');
  stagger(el);
}

/** (Re)calcula los retardos — por línea real, por palabra o por letra. */
export function stagger(el: HTMLElement) {
  const mode = modeOf(el);
  const base = Number(el.dataset.delay) || 0;
  const st = Number(el.dataset.splitStagger) || STAGGER[mode];
  if (mode === 'chars') {
    el.querySelectorAll<HTMLElement>('.mo-c').forEach((c, i) => {
      c.style.transitionDelay = `${base + Math.min(i * st, MAX_DELAY)}ms`;
    });
    return;
  }
  const words = el.querySelectorAll<HTMLElement>('.mo-w');
  let line = -1;
  let lastTop = -Infinity;
  words.forEach((w, i) => {
    let idx = i;
    if (mode === 'lines') {
      const top = w.offsetTop;
      if (Math.abs(top - lastTop) > 4) {
        line++;
        lastTop = top;
      }
      idx = line;
    }
    (w.firstElementChild as HTMLElement).style.transitionDelay = `${base + Math.min(idx * st, MAX_DELAY)}ms`;
  });
}
