/* La historia del trébol — motor de scroll. Vanilla, sin dependencias.
   Funciona sobre el scroll nativo de window (Lenis incluido): lee scrollY
   en un único rAF, que solo corre mientras la sección está cerca (IO). */
(function () {
  var root = document.querySelector('[data-trb]');
  if (!root) return;
  var reel = root.querySelector('[data-trb-reel]');
  // Prototipo: si el carrusel viene vacío, se arma desde STORY.
  if (reel && !reel.children.length && typeof trbRenderStory === 'function' && typeof STORY !== 'undefined') {
    reel.innerHTML = trbRenderStory(STORY);
  }
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var live = false;
  var api = { setup: setup, teardown: teardown };
  root.__trb = api;

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var c01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeIO = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  // ---- Elementos
  var col = root.querySelector('.trb-col');
  var svgbox = root.querySelector('.trb-svgbox');
  var ghost = root.querySelector('.trb-ghost');
  var spark = root.querySelector('.trb-spark');
  var meta = root.querySelector('.trb-meta');
  var leafNo = root.querySelector('.trb-leafno-n');
  var leafName = root.querySelector('.trb-leafname');
  var progBars = [].slice.call(root.querySelectorAll('.trb-prog b'));
  var skip = root.querySelector('.trb-skip');
  var sign = root.querySelector('.trb-sign');
  var leaves = [1, 2, 3, 4].map(function (n) {
    return {
      g: root.querySelector('.trb-leaf[data-leaf="' + n + '"]'),
      mp: root.querySelector('#trb-m' + n + ' path'),
      center: root.querySelector('.trb-center[data-leaf="' + n + '"]'),
      shine: root.querySelector('.trb-leafshine[data-leaf="' + n + '"]'),
      len: 0, p: -1, lit: false
    };
  });

  // ---- Modelo: items (intro + beats), actos, pesos en vh de scroll
  var items = [], acts = [], heads = [];
  var W_INTRO = 40, W_BIG = 68, W_FINAL = 100;
  function weightRead(words) { return clamp(24 + words * 0.42, 34, 50); }

  function build() {
    items = [];
    acts = [];
    var intro = root.querySelector('.trb-intro');
    items.push({ el: intro, kind: 'intro', w: W_INTRO, words: [] });
    [].slice.call(root.querySelectorAll('.trb-act')).forEach(function (actEl, ai) {
      var a = { leaf: +actEl.getAttribute('data-leaf') || ai + 1, label: actEl.getAttribute('data-label') || '', head: actEl.querySelector('.trb-act-head'), first: items.length, last: 0 };
      [].slice.call(actEl.querySelectorAll('.trb-beat')).forEach(function (el) {
        var kind = el.getAttribute('data-kind') || 'read';
        var words = splitWords(el);
        var w = kind === 'big' ? W_BIG : kind === 'final' ? W_FINAL : weightRead(words.length);
        items.push({ el: el, kind: kind, w: w, words: words, act: ai, op: -1, far: null, wv: [] });
      });
      a.last = items.length - 1;
      acts.push(a);
    });
    var s = 0;
    items.forEach(function (it, i) { it.i = i; it.start = s; s += it.w; it.op = -1; it.far = null; });
    total = s; // en «vh de scroll»
  }
  var total = 0;

  // Partir en palabras (texto sigue siendo texto real; los spans son inline).
  // Respeta <br> (saltos de línea editoriales).
  function splitWords(el) {
    if (!el.__trbWords) {
      el.__trbHTML = el.innerHTML;
      var spans = [];
      var nodes = [].slice.call(el.childNodes);
      el.textContent = '';
      nodes.forEach(function (nd) {
        if (nd.nodeType !== 3) { el.appendChild(nd); return; }
        nd.nodeValue.split(/(\s+)/).forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { el.appendChild(document.createTextNode(' ')); return; }
          var sp = document.createElement('span');
          sp.className = 'trb-w';
          sp.textContent = p;
          el.appendChild(sp);
          spans.push(sp);
        });
      });
      el.__trbWords = spans;
    }
    return el.__trbWords;
  }
  function unsplit() {
    items.forEach(function (it) {
      if (it.el && it.el.__trbWords) { it.el.innerHTML = it.el.__trbHTML; it.el.__trbWords = null; }
    });
  }

  // ---- Medidas (solo en resize / fuentes): nada de lecturas por frame
  var vh = 0, vw = 0, secTop = 0, colH = 0, focusY = 0, centers = [];
  var mobile = false;
  function measure(force) {
    var nw = window.innerWidth, nh = window.innerHeight;
    // Altura estable: en móvil la barra del navegador cambia innerHeight;
    // solo re-medimos si cambia el ancho o la altura salta mucho.
    if (force || nw !== vw || Math.abs(nh - vh) > 140 || !vh) { vw = nw; vh = nh; }
    mobile = vw < 900;
    root.style.setProperty('--trb-h', Math.round(total / 100 * vh + vh) + 'px');
    var r = root.getBoundingClientRect();
    secTop = r.top + window.pageYOffset;
    colH = col.clientHeight;
    focusY = colH * (mobile ? 0.4 : 0.46);
    centers = items.map(function (it) { return it.el.offsetTop + it.el.offsetHeight / 2; });
    // halo detrás del trébol
    var b = svgbox.getBoundingClientRect(), pr = root.querySelector('.trb-pin').getBoundingClientRect();
    root.style.setProperty('--trb-gx', (b.left + b.width / 2 - pr.left) + 'px');
    root.style.setProperty('--trb-gy', (b.top + b.height / 2 - pr.top) + 'px');
    leaves.forEach(function (L) {
      if (!L.mp) return;
      L.len = L.mp.getTotalLength();
      L.mp.style.strokeDasharray = L.len + ' ' + (L.len + 40);
      L.p = -1;
    });
    if (window.__trbDebug) window.__trbDebug({ totalVh: total + 100, px: Math.round(total / 100 * vh + vh), vh: vh, beats: items.length - 1 });
    dirty = true;
  }

  // ---- Estado animado
  var us = -1, raf = 0, running = false, dirty = true, curAct = -2, lastFinal = null, lastPast = null;
  function frame() {
    raf = 0;
    if (!live) return;
    var y = window.pageYOffset;
    var enter = c01((y - (secTop - vh)) / vh); // 0 → la sección asoma, 1 → fijada
    var u = clamp((y - secTop) / vh * 100, 0, total - 0.001);
    if (us < 0 || dirty) us = u;
    else us += (u - us) * 0.2; // inercia leve (con Lenis casi no se nota)
    if (Math.abs(u - us) < 0.02) us = u;
    dirty = false;

    // ítem actual + foco continuo F
    var k = 0;
    for (var i = items.length - 1; i >= 0; i--) { if (us >= items[i].start) { k = i; break; } }
    var it = items[k];
    var t = (us - it.start) / it.w;
    var hold = it.kind === 'big' ? 0.62 : it.kind === 'intro' ? 0.45 : 0.6;
    var g = k < items.length - 1 ? easeIO(c01((t - hold) / (1 - hold))) : 0;
    var F = k + g;
    var f0 = Math.floor(F), f1 = Math.min(f0 + 1, items.length - 1), fr = F - f0;

    // carrusel
    var cy = lerp(centers[f0], centers[f1], fr);
    var ry = focusY - cy;
    reel.style.transform = 'translate3d(0,' + ry.toFixed(1) + 'px,0)';
    var bigFocus = lerp(isBig(items[f0]), isBig(items[f1]), fr);

    // opacidades por distancia al foco
    for (var j = 0; j < items.length; j++) {
      var o = items[j];
      var d = Math.abs(j - F);
      var op = d < 1 ? 1 - 0.74 * d : Math.max(0.06, 0.26 - 0.12 * (d - 1));
      if (d > 0.5 && !isBig(o)) op *= 1 - 0.9 * bigFocus;
      if (d > 0.5 && isBig(o) && bigFocus > 0) op *= 1 - 0.6 * bigFocus;
      if (o.kind === 'intro') op = d < 1 ? op : 0;
      setOp(o, op);
      var far = d > 0.6;
      if (far !== o.far) { o.far = far; o.el.classList.toggle('is-far', far); }
      // palabras
      if (d < 2.2) words(o, j, F);
    }
    acts.forEach(function (a) {
      var o = items[a.first];
      setStyleOp(a, a.head, o.opNow * 0.95);
    });

    // trébol: progreso por acto
    var spk = null;
    acts.forEach(function (a, ai) {
      var p = c01((F - a.first + 0.5) / (a.last - a.first + 0.5));
      if (k === items.length - 1 && ai === acts.length - 1) p = 1;
      if (p > 0.999) p = 1; else if (p < 0.001) p = 0; // sin «casi lleno» (umbral de cambio abajo)
      var L = leaves[(a.leaf - 1) % 4];
      if (Math.abs(p - L.p) > 0.0005) {
        L.p = p;
        if (L.mp) {
          var e = p * p * (3 - 2 * p); // smoothstep: trazo parejo
          L.mp.style.strokeDashoffset = (L.len * (1 - e)).toFixed(2);
          L.g.style.opacity = p > 0.001 ? 1 : 0;
        }
        if (progBars[ai]) progBars[ai].style.transform = 'scaleX(' + p.toFixed(4) + ')';
        var lit = p >= 0.999;
        if (lit !== L.lit) {
          L.lit = lit;
          if (L.shine) L.shine.classList.toggle('is-on', lit);
          // completa: sin máscara, la hoja entera (incluye las puntas finas)
          if (L.g) { if (lit) L.g.removeAttribute('mask'); else L.g.setAttribute('mask', 'url(#trb-m' + a.leaf + ')'); }
        }
      }
      if (p > 0.002 && p < 0.998 && L.center) spk = { L: L, p: p * p * (3 - 2 * p) };
    });
    if (spark) {
      if (spk) {
        var pt = spk.L.center.getPointAtLength(spk.L.center.getTotalLength() * spk.p);
        spark.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
        spark.style.opacity = 1;
      } else spark.style.opacity = 0;
    }

    // rótulo del acto
    var ai2 = -1;
    var rk = Math.round(F);
    for (var q = 0; q < acts.length; q++) if (rk >= acts[q].first - 0.0) ai2 = q;
    if (rk < 1) ai2 = -1;
    if (ai2 !== curAct) { curAct = ai2; swapMeta(ai2); }

    // intro: el trébol (fantasma) entra mientras la sección asoma
    var ge = easeOut(enter);
    ghost.style.opacity = (0.25 + 0.75 * ge).toFixed(3);
    var final = k === items.length - 1 ? c01(t / 0.18) : 0;
    var sc = (0.86 + 0.14 * ge) * (1 + 0.06 * easeIO(final));
    var rot = (1 - ge) * -14;
    svgbox.style.transform = 'translate3d(0,' + ((1 - ge) * 6).toFixed(2) + 'vh,0) rotate(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
    root.style.setProperty('--trb-halo', (0.3 + 0.25 * (curAct + 1) / acts.length + 0.45 * final).toFixed(3));

    var isFinal = k === items.length - 1 && t > 0.04;
    if (isFinal !== lastFinal) { lastFinal = isFinal; root.classList.toggle('is-final', isFinal); }
    var past = F > 0.35;
    if (past !== lastPast) { lastPast = past; root.classList.toggle('is-past-intro', past); }
    if (sign) {
      var sr = k === items.length - 1 ? easeOut(c01((t - 0.22) / 0.22)) : 0;
      sign.style.opacity = sr.toFixed(3);
      sign.style.transform = 'translate3d(0,' + ((1 - sr) * 18).toFixed(1) + 'px,0)';
    }
    if (running && Math.abs(u - us) > 0.001) raf = requestAnimationFrame(frame);
  }
  function isBig(o) { return o.kind === 'big' || o.kind === 'final' ? 1 : 0; }
  function setOp(o, op) {
    op = Math.round(op * 1000) / 1000;
    o.opNow = op;
    if (op !== o.op) { o.op = op; o.el.style.opacity = op; }
  }
  function setStyleOp(holder, el, op) {
    if (!el) return;
    op = Math.round(op * 1000) / 1000;
    if (op !== holder.hop) { holder.hop = op; el.style.opacity = op; }
  }
  // Palabras: en «read» se encienden de a una mientras el beat está en
  // pausa (da sensación de avance sin mover el texto); en «big» suben.
  function words(o, j, F) {
    var ws = o.words, n = ws.length;
    if (!n) return;
    var local = us - o.start;
    if (o.kind === 'read') {
      var f = c01(local / (o.w * 0.5));
      for (var i = 0; i < n; i++) {
        var v = 0.3 + 0.7 * c01((f * (n + 5) - i) / 5);
        v = Math.round(v * 50) / 50;
        if (o.wv[i] !== v) { o.wv[i] = v; ws[i].style.opacity = v; }
      }
    } else {
      // llega desde abajo: revela entre F = j-0.75 y F = j (completo en la pausa)
      var r = c01((F - j + 0.75) / 0.75);
      for (var m = 0; m < n; m++) {
        var w = easeOut(c01((r * (n + 3) - m) / 3));
        w = Math.round(w * 200) / 200;
        if (o.wv[m] !== w) {
          o.wv[m] = w;
          ws[m].style.opacity = w;
          ws[m].style.transform = 'translate3d(0,' + ((1 - w) * 0.45).toFixed(3) + 'em,0)';
          ws[m].style.backgroundPosition = (m / Math.max(1, n - 1) * 100).toFixed(1) + '% 50%';
        }
      }
    }
  }
  function swapMeta(ai) {
    var a = acts[ai];
    meta.classList.add('is-swap');
    meta.classList.toggle('is-intro', ai < 0);
    if (ai < 0) {
      leafNo.textContent = '00';
      leafName.textContent = 'Una historia en cuatro hojas';
    } else {
      leafNo.textContent = (a.leaf < 10 ? '0' : '') + a.leaf;
      leafName.textContent = a.label;
    }
    requestAnimationFrame(function () { requestAnimationFrame(function () { meta.classList.remove('is-swap'); }); });
  }

  function tick() { if (live && !raf) raf = requestAnimationFrame(frame); }
  function onScroll() { if (running) tick(); }
  var rzT = 0;
  function onResize() { clearTimeout(rzT); rzT = setTimeout(function () { measure(false); tick(); }, 120); }

  // Saltar historia → directo al cierre (trébol completo + firma)
  function onSkip(e) {
    if (!live) return; // sin modo vivo, el ancla #trb-fin alcanza
    e.preventDefault();
    var fin = items[items.length - 1];
    var target = secTop + (fin.start + fin.w * 0.55) / 100 * vh;
    // El sitio expone Lenis como window.__lenis. Hay que pasar por Lenis (force:
    // ignora stop()): un window.scrollTo nativo lo pisa Lenis si está animando.
    var L = window.__lenis || window.lenis;
    if (L && typeof L.scrollTo === 'function') L.scrollTo(target, { immediate: true, force: true });
    else window.scrollTo(0, target);
    dirty = true;
    tick();
    try { fin.el.focus({ preventScroll: true }); } catch (err) {}
  }

  var io = null;
  function setup() {
    if (live) return;
    live = true;
    root.classList.add('is-live');
    build();
    leaves.forEach(function (L, n) {
      if (L.g) { L.g.setAttribute('mask', 'url(#trb-m' + (n + 1) + ')'); L.g.style.opacity = 0; }
      L.lit = false; L.p = -1;
      if (L.shine) L.shine.classList.remove('is-on');
    });
    measure(true);
    if (sign) sign.style.opacity = 0;
    curAct = -2;
    io = new IntersectionObserver(function (en) {
      running = en[0].isIntersecting;
      if (running) { dirty = true; tick(); }
    }, { rootMargin: '100% 0px 100% 0px' });
    io.observe(root);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    if (skip) skip.addEventListener('click', onSkip);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (live) { measure(false); tick(); } });
    if (window.ResizeObserver) { api.ro = new ResizeObserver(function () { onResize(); }); api.ro.observe(col); }
    tick();
  }
  function teardown() {
    if (!live) return;
    live = false;
    running = false;
    if (raf) cancelAnimationFrame(raf), (raf = 0);
    if (io) io.disconnect();
    if (api.ro) api.ro.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    if (skip) skip.removeEventListener('click', onSkip);
    unsplit();
    root.classList.remove('is-live', 'is-final', 'is-past-intro');
    root.style.removeProperty('--trb-h');
    [reel, svgbox, ghost, sign].forEach(function (el) { if (el) el.removeAttribute('style'); });
    root.querySelectorAll('.trb-item, .trb-act-head, .trb-prog b').forEach(function (el) { el.removeAttribute('style'); el.classList.remove('is-far'); });
    leaves.forEach(function (L) {
      if (L.g) { L.g.removeAttribute('mask'); L.g.removeAttribute('style'); }
      if (L.mp) L.mp.removeAttribute('style');
      if (L.shine) L.shine.classList.add('is-on');
    });
  }

  function decide() { if (mq.matches) teardown(); else setup(); }
  if (mq.addEventListener) mq.addEventListener('change', decide); else if (mq.addListener) mq.addListener(decide);
  decide();
})();
