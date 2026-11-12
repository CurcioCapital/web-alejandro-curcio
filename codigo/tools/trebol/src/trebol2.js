/* La historia del trébol — v2 (fluida). Vanilla, sin dependencias.
   - El texto se mueve con el scroll nativo/Lenis (sin transform por JS).
   - Un único rAF mientras la sección está cerca: lee scrollY una vez,
     calcula el progreso de lectura con medidas cacheadas y:
       · pinta el trébol en dorado en proporción exacta al % leído
         (las 4 hojas en orden, como un cuentakilómetros),
       · actualiza el % y la barra,
       · ajusta la opacidad de cada párrafo según su distancia a la
         línea de lectura (continuo, sin saltos).
   - Nada de lecturas de layout por frame; se re-mide con ResizeObserver. */
(function () {
  var root = document.querySelector('[data-trb]');
  if (!root || root.__trb2) return;
  root.__trb2 = true;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var text = root.querySelector('.trb-text');
  var pctEl = root.querySelector('[data-trb-pct]');
  var leafEl = root.querySelector('[data-trb-leaf]');
  var spark = root.querySelector('.trb-spark');
  var skip = root.querySelector('.trb-skip');
  var fin = root.querySelector('#trb-fin');
  var items = [].slice.call(root.querySelectorAll('.trb-item, .trb-act-head, .trb-sign'));
  var acts = [].slice.call(root.querySelectorAll('.trb-act')).map(function (el, i) {
    return { el: el, label: el.getAttribute('data-label') || '', n: i + 1 };
  });
  var leaves = [1, 2, 3, 4].map(function (n) {
    var mp = root.querySelector('#trb-m' + n + ' path');
    return {
      mp: mp,
      shine: root.querySelector('.trb-leafshine[data-leaf="' + n + '"]'),
      g: root.querySelector('.trb-leaf[data-leaf="' + n + '"]'), full: false,
      len: 0, lut: [], last: -1, lastShine: -1
    };
  });

  var c01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var smooth = function (t) { t = c01(t); return t * t * (3 - 2 * t); };

  // ---- Geometría del trébol (una sola vez)
  var total = 0;
  leaves.forEach(function (L) {
    if (!L.mp || !L.mp.getTotalLength) return;
    L.len = L.mp.getTotalLength();
    L.start = total;
    total += L.len;
    L.mp.style.strokeDasharray = L.len + ' ' + (L.len + 1);
    L.mp.style.strokeDashoffset = L.len;
    var N = 80;
    for (var i = 0; i <= N; i++) {
      var pt = L.mp.getPointAtLength(L.len * i / N);
      L.lut.push([pt.x, pt.y]);
    }
  });

  // ---- Medidas cacheadas
  var M = { top: 0, start: 0, end: 1, vh: 1, items: [], acts: [] };
  function absTop(el) {
    var r = el.getBoundingClientRect();
    return r.top + (window.scrollY || window.pageYOffset);
  }
  function measure() {
    M.vh = window.innerHeight;
    var first = root.querySelector('.trb-act') || text;
    var finEl = fin || text;
    // Línea de lectura al 52% de la pantalla. 0% cuando arranca la Hoja 1,
    // 100% cuando la frase final llega a esa línea.
    M.line = M.vh * 0.52;
    M.start = absTop(first) - M.line;
    M.end = absTop(finEl) + finEl.offsetHeight * 0.5 - M.line;
    if (M.end <= M.start) M.end = M.start + 1;
    M.items = items.map(function (el) {
      return { el: el, c: absTop(el) + el.offsetHeight * 0.5, h: el.offsetHeight, o: -1 };
    });
    M.acts = acts.map(function (a) { return { a: a, y: absTop(a.el) - M.line }; });
    M.secTop = absTop(root);
    M.secBot = M.secTop + root.offsetHeight;
    dirty = true;
  }

  // ---- Pintura
  var lastPct = -1, lastAct = -1, lastState = '';
  function paint(p) {
    var drawn = p * total;
    var tipLeaf = null, tipT = 0;
    for (var i = 0; i < leaves.length; i++) {
      var L = leaves[i];
      if (!L.len) continue;
      var d = drawn - L.start;
      d = d < 0 ? 0 : d > L.len ? L.len : d;
      var off = L.len - d;
      if (Math.abs(off - L.last) > 0.05) { L.mp.style.strokeDashoffset = off.toFixed(2); L.last = off; }
      var full = d >= L.len;
      if (L.g && full !== L.full) { if (full) L.g.removeAttribute('mask'); else L.g.setAttribute('mask', 'url(#trb-m' + (i + 1) + ')'); L.full = full; }
      var sh = d / L.len;
      sh = sh >= 1 ? 1 : sh * 0.35;
      if (L.shine && Math.abs(sh - L.lastShine) > 0.004) { L.shine.style.opacity = sh.toFixed(3); L.lastShine = sh; }
      if (d > 0 && d < L.len) { tipLeaf = L; tipT = d / L.len; }
    }
    if (spark) {
      if (tipLeaf && p > 0 && p < 1) {
        var f = tipT * (tipLeaf.lut.length - 1), k = Math.floor(f), r = f - k;
        var a = tipLeaf.lut[k], b = tipLeaf.lut[Math.min(k + 1, tipLeaf.lut.length - 1)];
        spark.setAttribute('cx', (a[0] + (b[0] - a[0]) * r).toFixed(1));
        spark.setAttribute('cy', (a[1] + (b[1] - a[1]) * r).toFixed(1));
      }
    }
    var state = p <= 0 ? 'idle' : p >= 1 ? 'done' : 'painting';
    if (state !== lastState) {
      root.classList.toggle('is-painting', state === 'painting');
      root.classList.toggle('is-complete', state === 'done');
      lastState = state;
    }
    var pct = Math.round(p * 100);
    if (pct !== lastPct && pctEl) {
      pctEl.textContent = (pct < 10 ? '00' : pct < 100 ? '0' : '') + pct;
      lastPct = pct;
    }
    root.style.setProperty('--trb-p', p.toFixed(4));
  }

  function setAct(y) {
    var idx = -1;
    for (var i = 0; i < M.acts.length; i++) if (y >= M.acts[i].y - 2) idx = i;
    if (idx !== lastAct && leafEl) {
      lastAct = idx;
      if (idx < 0) leafEl.innerHTML = 'Una historia en cuatro hojas';
      else {
        var a = M.acts[idx].a, n = a.n < 10 ? '0' + a.n : a.n;
        leafEl.innerHTML = '<b>Hoja ' + n + '</b> / 04 · ' + a.label;
      }
    }
  }

  function fade(y) {
    if (reduce.matches) return;
    var line = y + M.line, span = M.vh * 0.62;
    for (var i = 0; i < M.items.length; i++) {
      var it = M.items[i];
      var dist = Math.abs(it.c - line) - it.h * 0.5;
      var o = 1 - smooth(dist / span) * 0.8; // 1 en la línea, 0.2 lejos
      if (dist <= 0) o = 1;
      if (Math.abs(o - it.o) > 0.01) { it.el.style.opacity = o.toFixed(3); it.o = o; }
    }
  }

  // ---- Loop
  var raf = 0, running = false, dirty = true, lastY = -1;
  function frame() {
    raf = 0;
    if (!running) return;
    var y = window.scrollY || window.pageYOffset;
    if (y !== lastY || dirty) {
      lastY = y; dirty = false;
      var p = c01((y - M.start) / (M.end - M.start));
      paint(p);
      setAct(y);
      fade(y);
    }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; dirty = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) start(); else { dirty = true; frame(); stop(); } });
    }, { rootMargin: '200px 0px' }).observe(root);
  } else start();

  var rq = 0;
  function remeasure() { if (rq) return; rq = requestAnimationFrame(function () { rq = 0; measure(); if (!running) { running = true; frame(); running = false; } }); }
  measure();
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(text);
  window.addEventListener('resize', remeasure, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  window.addEventListener('load', remeasure);
  // Estado inicial correcto aunque la sección no esté visible
  running = true; frame(); running = false;

  // ---- Saltar historia → cierre (trébol completo)
  if (skip) skip.addEventListener('click', function (ev) {
    ev.preventDefault();
    measure();
    var target = M.end + 2;
    var lenis = window.__lenis || window.lenis;
    if (lenis && lenis.scrollTo) lenis.scrollTo(target, { duration: 1.4, force: true });
    else window.scrollTo({ top: target, behavior: reduce.matches ? 'auto' : 'smooth' });
    if (fin) setTimeout(function () { try { fin.focus({ preventScroll: true }); } catch (e) {} }, 1500);
  });
})();
