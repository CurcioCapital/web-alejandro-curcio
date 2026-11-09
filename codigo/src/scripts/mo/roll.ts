/**
 * mo/roll.ts — data-roll: en hover/foco el texto sube y entra una copia
 * desde abajo, letra por letra.
 *
 * La «copia» NO es un nodo de texto: es un text-shadow de cada letra
 * desplazado 1.6em (ver motion.css). Así no hay texto duplicado ni para
 * lectores de pantalla ni para innerText / copiar-pegar.
 *
 * Qué texto se anima: el hijo marcado con [data-roll-text] si existe; si
 * no, los nodos de texto directos del elemento; si no hay, el primer
 * descendiente que sólo contenga texto (p. ej. <span>Ver más</span> junto a
 * un <svg>).
 *
 * Accesibilidad (el texto se lee UNA sola vez, como palabra y no letra por
 * letra): si el elemento es — o está dentro de — un link/botón, ese control
 * recibe aria-label con su texto ORIGINAL y las letras partidas llevan
 * aria-hidden. Si el control ya tiene nombre propio (aria-label/-labelledby)
 * sólo se ocultan las letras. Si no hay control (o contiene imágenes con
 * alt, que el aria-label taparía), las letras quedan expuestas tal cual:
 * son spans en línea sin espacios entre sí, se leen como la palabra entera.
 *
 * Tipografía: no asume mayúsculas ni métricas — todo en em y por letra,
 * funciona igual con Archivo, Geist o cualquier display.
 */
const NAMEABLE = 'a, button, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"]';

function wrap(textNode: Text, hide: boolean) {
  const text = textNode.nodeValue || '';
  const trimmed = text.trim();
  if (!trimmed) return;
  const lead = text.slice(0, text.indexOf(trimmed[0]));
  const trail = text.slice(text.lastIndexOf(trimmed[trimmed.length - 1]) + 1);
  const frag = document.createDocumentFragment();
  if (lead) frag.appendChild(document.createTextNode(lead));
  const roll = document.createElement('span');
  roll.className = 'mo-roll';
  if (hide) roll.setAttribute('aria-hidden', 'true');
  Array.from(trimmed).forEach((ch, i) => {
    const c = document.createElement('span');
    c.className = 'mo-roll-c';
    c.style.setProperty('--i', String(i));
    c.textContent = ch;
    roll.appendChild(c);
  });
  frag.appendChild(roll);
  if (trail) frag.appendChild(document.createTextNode(trail));
  textNode.parentNode?.replaceChild(frag, textNode);
}

/** Texto visible para AT: ignora lo que ya está aria-hidden (p. ej. la
 *  copia del `.roll` del design system) y los scripts/estilos. */
function readableText(root: Element) {
  let out = '';
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      for (let p = n.parentElement; p && p !== root.parentElement; p = p.parentElement) {
        if (p.getAttribute('aria-hidden') === 'true' || /^(SCRIPT|STYLE|TEMPLATE)$/.test(p.tagName))
          return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = w.nextNode(); n; n = w.nextNode()) out += n.nodeValue;
  return out.replace(/\s+/g, ' ').trim();
}

function textOnly(el: Element) {
  return el.childNodes.length > 0 && Array.from(el.childNodes).every((n) => n.nodeType === Node.TEXT_NODE);
}

export function roll(el: HTMLElement) {
  if (el.hasAttribute('data-roll-done')) return;
  el.setAttribute('data-roll-done', '');

  // ¿quién lleva el nombre accesible? el propio elemento o su control
  const control = el.closest<HTMLElement>(NAMEABLE);
  let hide = false;
  if (control) {
    if (control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby')) {
      hide = true;
    } else if (!control.querySelector('img[alt]:not([alt=""]), [role="img"][aria-label], svg[aria-label], svg title')) {
      const name = readableText(control);
      if (name) {
        control.setAttribute('aria-label', name);
        hide = true;
      }
    }
  }

  const explicit = el.querySelector<HTMLElement>('[data-roll-text]');
  const host = explicit || el;
  const direct = Array.from(host.childNodes).filter(
    (n): n is Text => n.nodeType === Node.TEXT_NODE && !!n.nodeValue?.trim()
  );
  if (direct.length) {
    direct.forEach((n) => wrap(n, hide));
    return;
  }
  const leaf = Array.from(host.querySelectorAll('*')).find(
    (n) => !(n instanceof SVGElement) && textOnly(n) && (n.textContent || '').trim()
  );
  if (leaf) Array.from(leaf.childNodes).forEach((n) => wrap(n as Text, hide));
}
