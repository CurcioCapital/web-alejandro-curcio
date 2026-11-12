// Build de «La historia del trébol».
//   node tools/build.mjs
// Lee: tools/src/{story.js,render.js,trebol.css,trebol.js}, tools/trebol-leaves.json
//      y, si existe y es válido, ../editorial.json (reemplaza a STORY).
// Escribe: proto/index.html (renderiza desde STORY inline en el navegador)
//          component.html   (sección pre-renderizada: texto real en el HTML)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const work = path.resolve(here, '..');
const rd = (p) => fs.readFileSync(path.join(here, p), 'utf8');

let storySrc = rd('src/story.js');
const editorial = path.join(work, 'editorial.json');
if (fs.existsSync(editorial)) {
  try {
    const ed = JSON.parse(fs.readFileSync(editorial, 'utf8'));
    if (ed && Array.isArray(ed.acts) && ed.acts.length) {
      storySrc = '/* STORY — generado desde editorial.json. Reemplazable. */\nconst STORY = ' + JSON.stringify(ed, null, 2) + ';\n';
      console.log('usando editorial.json');
    }
  } catch (e) { console.warn('editorial.json inválido, uso story.js:', e.message); }
}
const renderSrc = rd('src/render.js');
const css = rd('src/trebol.css');
const js = rd('src/trebol.js');
const leaves = JSON.parse(rd('trebol-leaves.json'));

const ctx = {};
vm.createContext(ctx);
vm.runInContext(storySrc + '\n' + renderSrc + '\nthis.STORY = STORY; this.trbRenderStory = trbRenderStory;', ctx);
const STORY = ctx.STORY;

// ---- SVG del trébol (4 hojas vectorizadas de media/marca/trebol.png)
const order = ['TL', 'TR', 'BR', 'BL']; // hoja 1..4, sentido horario
let svg = '<svg class="trb-svg trb-svg--glow" viewBox="-8 -8 272 272" aria-hidden="true" focusable="false">';
svg += '<defs>';
svg += '<linearGradient id="trb-oro" gradientUnits="userSpaceOnUse" x1="24" y1="8" x2="232" y2="250"><stop offset="0" stop-color="#b8892a"/><stop offset=".46" stop-color="#e8c874"/><stop offset="1" stop-color="#c9992f"/></linearGradient>';
svg += '<radialGradient id="trb-sparkg"><stop offset="0" stop-color="#fffaf0"/><stop offset=".3" stop-color="#f3dc9a" stop-opacity=".95"/><stop offset="1" stop-color="#e8c874" stop-opacity="0"/></radialGradient>';
svg += '<filter id="trb-blur" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="7"/></filter>';
order.forEach((k, i) => {
  svg += `<mask id="trb-m${i + 1}" maskUnits="userSpaceOnUse" x="-24" y="-24" width="304" height="304"><path d="${leaves[k].center}" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/></mask>`;
});
svg += '</defs>';
svg += '<g class="trb-glow" filter="url(#trb-blur)">' + order.map((k, i) => `<path class="trb-leafshine is-on" data-leaf="${i + 1}" fill="url(#trb-oro)" d="${leaves[k].fill}"/>`).join('') + '</g>';
svg += '</svg>';
svg += '<svg class="trb-svg trb-svg--draw" viewBox="-8 -8 272 272" aria-hidden="true" focusable="false">';
svg += `<g class="trb-ghost"><path d="${leaves.full}"/></g>`;
svg += order.map((k, i) => `<g class="trb-leaf" data-leaf="${i + 1}"><path d="${leaves[k].fill}"/></g>`).join('');
svg += order.map((k, i) => `<path class="trb-center" data-leaf="${i + 1}" d="${leaves[k].center}" fill="none" stroke="none"/>`).join('');
svg += '<circle class="trb-spark" r="10" fill="url(#trb-sparkg)"/>';
svg += '</svg>';

const section = (reelHtml) => `<section class="trb" id="historia-trebol" data-trb aria-labelledby="trb-title">
  <div class="trb-pin">
    <div class="trb-bg" aria-hidden="true"></div>
    <div class="trb-stage">
      <div class="trb-top">
        <p class="trb-kick"><span class="trb-idx" aria-hidden="true">[ ✣ ]</span>Trébol solidario</p>
        <a class="trb-skip" href="#trb-fin">Saltar historia <span class="trb-skip-arrow" aria-hidden="true">↓</span></a>
      </div>
      <div class="trb-mark" aria-hidden="true">
        <div class="trb-svgbox">${svg}</div>
        <div class="trb-meta">
          <p class="trb-leafno">Hoja <span class="trb-leafno-n">00</span> <span class="trb-leafno-of">/ 04</span></p>
          <p class="trb-leafname">Una historia en cuatro hojas</p>
          <div class="trb-prog"><i><b></b></i><i><b></b></i><i><b></b></i><i><b></b></i></div>
        </div>
      </div>
      <div class="trb-col"><div class="trb-reel" data-trb-reel>${reelHtml}</div></div>
      <p class="trb-cue" aria-hidden="true"><i></i>Deslizá para leer</p>
    </div>
  </div>
</section>`;

// ---- component.html (para integrar en web/solidario/index.html)
const reelPre = ctx.trbRenderStory(STORY);
const component = `<!-- ================================================================
  LA HISTORIA DEL TRÉBOL — bloque listo para integrar.
  · Va en web/solidario/index.html (dentro de <main>, donde corresponda).
  · Usa las fuentes del sitio (Geist Variable, JetBrains Mono Variable,
    Instrument Serif) y tokens si existen (--font-display, --font-mono,
    --font-serif, --nav-h, --edge); tiene fallbacks propios.
  · Texto pre-renderizado (SEO / lectores). Para cambiar la división en
    beats: editar trebol-work/editorial.json y correr node tools/build.mjs.
  · No usa media externa (el trébol es SVG vectorizado de media/marca/trebol.png).
  ================================================================ -->
${section(reelPre)}
<style>
${css}</style>
<script>
${js}</script>
`;
fs.writeFileSync(path.join(work, 'component.html'), component);

// ---- proto/index.html (standalone, con contexto de página falso)
const proto = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prototipo — La historia del trébol</title>
<link rel="preload" as="font" type="font/woff2" href="fonts/geist-latin.woff2" crossorigin>
<style>
@font-face{font-family:'Geist Variable';font-style:normal;font-display:swap;font-weight:100 900;src:url(fonts/geist-latin.woff2) format('woff2-variations');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Geist Variable';font-style:normal;font-display:swap;font-weight:100 900;src:url(fonts/geist-latin-ext.woff2) format('woff2-variations');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'JetBrains Mono Variable';font-style:normal;font-display:swap;font-weight:100 800;src:url(fonts/jetbrains-mono-latin.woff2) format('woff2-variations')}
@font-face{font-family:'Instrument Serif';font-style:italic;font-display:swap;font-weight:400;src:url(fonts/instrument-serif-latin-400-italic.woff2) format('woff2')}
@font-face{font-family:'Instrument Serif';font-style:normal;font-display:swap;font-weight:400;src:url(fonts/instrument-serif-latin-400-normal.woff2) format('woff2')}
:root{--color-black:#0c0a06;--ink-hi:rgba(255,255,255,.92);--ink-mid:rgba(255,255,255,.65);--ink-low:rgba(255,255,255,.5);
--font-display:'Geist Variable',-apple-system,'Segoe UI',Arial,sans-serif;--font-mono:'JetBrains Mono Variable',ui-monospace,Menlo,monospace;--font-serif:'Instrument Serif',Georgia,serif;--nav-h:74px;--edge:20px}
html,body{margin:0;background:#0c0a06;color:rgba(255,255,255,.92);font-family:var(--font-display);-webkit-font-smoothing:antialiased}
/* --- maqueta de contexto (no forma parte del componente) --- */
.mock-nav{position:fixed;inset:0 0 auto 0;height:74px;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:linear-gradient(#0c0a06e6,#0c0a0600)}
.mock-nav b{font-weight:600;letter-spacing:-.01em}.mock-nav span{font:500 11px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.65)}
.mock-sec{min-height:90vh;display:grid;align-content:center;max-width:1360px;margin:0 auto;padding:120px 20px;box-sizing:border-box}
.mock-sec p.k{font:500 11.5px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:#e8c874;margin:0 0 20px}
.mock-sec h2{font-weight:560;font-size:clamp(2.4rem,1rem+4.5vw,5.5rem);letter-spacing:-.035em;line-height:1;margin:0;max-width:14ch}
.mock-sec p.l{color:rgba(255,255,255,.65);font-size:1.125rem;line-height:1.55;max-width:52ch}
.mock-hud{position:fixed;right:12px;bottom:12px;z-index:60;font:500 10.5px/1.5 var(--font-mono);letter-spacing:.04em;color:#e8c874;background:#0c0a06d9;border:1px solid #e8c87433;padding:8px 10px;border-radius:8px;pointer-events:none}
@media (max-width:600px){.mock-hud{display:none}}
</style>
</head>
<body>
<header class="mock-nav"><b>Alejandro Curcio</b><span>Menú</span></header>
<main>
  <section class="mock-sec"><p class="k">[ 02 ] Récord Guinness · 13 abril 2024</p><h2>Meterse al hielo con los demás.</h2><p class="l">(Sección anterior de /solidario — maqueta de contexto.) Scrolleá para entrar en la historia del trébol.</p></section>
${section('')}
  <section class="mock-sec" id="despues"><p class="k">[ 04 ] Siguiente sección</p><h2>La historia termina, la página sigue.</h2><p class="l">Acá el pin se suelta y el scroll vuelve a ser normal.</p></section>
</main>
<div class="mock-hud" id="mock-hud">…</div>
<script>
window.__trbDebug = function (d) {
  var el = document.getElementById('mock-hud');
  if (el) el.textContent = 'Historia: ' + d.beats + ' beats · alto ' + d.totalVh.toFixed(0) + 'vh = ' + d.px + 'px (vh ' + d.vh + 'px)';
  window.__trbInfo = d;
};
</script>
<style>
${css}</style>
<script id="trb-story">
${storySrc}</script>
<script id="trb-render">
${renderSrc}</script>
<script id="trb-js">
${js}</script>
</body>
</html>
`;
fs.writeFileSync(path.join(work, 'proto', 'index.html'), proto);

// Resumen de largo
const words = (t) => t.trim().split(/\s+/).length;
let tot = 50, n = 0;
STORY.acts.forEach((a, ai) => a.beats.forEach((b, bi) => {
  n++;
  const fin = ai === STORY.acts.length - 1 && bi === a.beats.length - 1;
  tot += fin ? 130 : b.kind === 'big' ? 88 : Math.min(66, Math.max(44, 30 + words(b.text) * 0.55));
}));
console.log(`beats: ${n} · scroll fijado: ${tot.toFixed(0)}vh · alto total sección: ${(tot + 100).toFixed(0)}vh`);
console.log(`  @900px alto: ${Math.round((tot + 100) * 9)}px · @844px: ${Math.round((tot + 100) * 8.44)}px`);
