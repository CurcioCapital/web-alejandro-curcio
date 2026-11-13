/* mobile.js — ajustes de comportamiento SOLO para celular (<=860px).
 * Se carga con `defer` en el <head>, antes de los bundles de Astro (type=module),
 * así que corre antes de que el motor de motion prepare contadores y pins.
 * En escritorio no hace nada: todo está detrás de matchMedia('(max-width: 860px)').
 */
(function () {
  'use strict';
  var mq = window.matchMedia('(max-width: 860px)');
  if (!mq.matches) return;
  var root = document.documentElement;
  root.classList.add('is-mob');

  /* ---- SYS-01 · contadores ------------------------------------------------
   * Los años (1900–2100, sin separador de miles) no se animan en celular: el
   * motor lee data-counter-from, así que «desde» = «hasta» deja el año fijo.
   * El resto de los contadores cuenta en <=900 ms. */
  document.querySelectorAll('[data-counter]').forEach(function (el) {
    var m = (el.textContent || '').match(/\d[\d.,]*\d|\d/);
    if (!m) return;
    var tok = m[0];
    if (/^\d{4}$/.test(tok) && +tok >= 1900 && +tok <= 2100) {
      el.setAttribute('data-counter-from', tok);
      el.setAttribute('data-counter-duration', '1');
    } else {
      var d = Number(el.getAttribute('data-counter-duration'));
      if (!d || d > 900) el.setAttribute('data-counter-duration', '900');
    }
  });

  /* ---- SOL-05 · carrusel Guinness: las tres primeras fotos sin lazy ------ */
  document.querySelectorAll('.guinness-gal img[loading="lazy"]').forEach(function (img, i) {
    if (i < 3) img.setAttribute('loading', 'eager');
  });
  /* ---- SOL-07 · mosaico Drift solidario: el video sin póster muestra su
   * primer cuadro en vez de una tesela negra. */
  document.querySelectorAll('.dsu-v video[preload="none"]').forEach(function (v) {
    v.setAttribute('preload', 'metadata');
  });

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var onScroll = function (fn) {
    var raf = 0;
    var run = function () { raf = 0; fn(); };
    var req = function () { if (!raf) raf = requestAnimationFrame(run); };
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req, { passive: true });
    req();
  };

  /* Lo que sigue tiene que registrarse DESPUÉS que los scripts de Astro
   * (type=module), para que nuestros rAF pinten último. DOMContentLoaded
   * dispara cuando los módulos ya corrieron. */
  var start = function () {

    /* ---- DEP-01 · velocímetro fijo ---------------------------------------
     * En celular sólo acompaña al héroe, el casco y PUSHING THE LIMITS; cuando
     * termina ese pin se esconde y no tapa captions, flechas ni citas. */
    var gauge = document.querySelector('[data-dep-gauge]');
    var after = gauge && gauge.nextElementSibling; // el contenido que sigue al pin
    if (gauge && after) {
      onScroll(function () {
        gauge.classList.toggle('is-mob-off', after.getBoundingClientRect().top < innerHeight * 0.85);
      });
    }

    /* ---- HIST-01 · año del HUD de Historia --------------------------------
     * El componente interpola el año entre hitos (mostraba 1950 sobre 1945).
     * En celular mostramos el año del último hito que cruzó el 60% de la
     * pantalla. Se corrige cada vez que el componente reescribe el número. */
    document.querySelectorAll('[data-tlx]').forEach(function (tlx) {
      var num = tlx.querySelector('[data-tlx-num]');
      var ms = Array.prototype.slice.call(tlx.querySelectorAll('[data-tlx-year]'));
      if (!num || !ms.length) return;
      var fix = function () {
        var line = innerHeight * 0.6;
        var y = ms[0].getAttribute('data-tlx-year');
        for (var i = 0; i < ms.length; i++) {
          if (ms[i].getBoundingClientRect().top <= line) y = ms[i].getAttribute('data-tlx-year');
          else break;
        }
        if (num.textContent !== y) num.textContent = y;
      };
      new MutationObserver(fix).observe(num, { childList: true, characterData: true, subtree: true });
      onScroll(fix);
    });

    /* ---- SYS-06 · lectura palabra a palabra --------------------------------
     * Las palabras se encendían recién entre el 85% y el 50% de la pantalla.
     * En celular: arrancan al entrar (105%) y terminan al 70%. */
    if (!reduce) {
      [['[data-qe]', '[data-qe-words]', '.qe-w'], ['[data-bf]', '[data-bf-words]', '.bf-w']].forEach(function (c) {
        document.querySelectorAll(c[0]).forEach(function (raiz) {
          var bloques = raiz.querySelectorAll(c[1]);
          if (!bloques.length) return;
          var primero = bloques[0], ultimo = bloques[bloques.length - 1];
          onScroll(function () {
            var palabras = raiz.querySelectorAll(c[2]);
            if (!palabras.length) return;
            var vh = innerHeight;
            var r = raiz.getBoundingClientRect();
            if (r.bottom < -100 || r.top > vh + 100) return;
            /* SYS-09 · la cortina negro → hueso de «Quién es» se completa más
             * rápido: menos tiempo con el velo gris intermedio. */
            if (c[0] === '[data-qe]') {
              var t = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.3)));
              raiz.style.setProperty('--qe-t', t.toFixed(3));
            }
            var a = primero.getBoundingClientRect().top;
            var b = ultimo.getBoundingClientRect().bottom;
            var ini = vh * 1.05, fin = vh * 0.7;
            var p = Math.min(1, Math.max(0, (ini - a) / ((b - a + (ini - fin)) || 1)));
            var n = Math.round(p * palabras.length);
            for (var i = 0; i < palabras.length; i++) palabras[i].classList.toggle('is-on', i < n);
          });
        });
      });
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
