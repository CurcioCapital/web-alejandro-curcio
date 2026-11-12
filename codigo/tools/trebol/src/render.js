/* Renderer de la historia → HTML (string). Lo usa el navegador en el
   prototipo (lee STORY) y el build en node para pre-renderizar el
   componente (texto real en el HTML: SEO + lectores de pantalla). */
function trbRenderStory(s) {
  var esc = function (t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  // Título: la última palabra va en serif itálica dorada («trébol.»).
  var t = esc(s.title || '');
  var m = t.match(/^(.*\s)(\S+?)([.!?…]*)$/);
  var title = m ? m[1] + '<em>' + m[2] + '</em>' + m[3] : t;
  var nActs = s.acts.length;
  var lastAct = nActs - 1;
  var h = '';
  h += '<header class="trb-item trb-intro" data-kind="intro">';
  h += '<p class="trb-intro-kick">Una historia en ' + (nActs === 4 ? 'cuatro' : nActs) + ' hojas</p>';
  h += '<h2 class="trb-title" id="trb-title">' + title + '</h2>';
  if (s.subtitle) h += '<p class="trb-sub">' + esc(s.subtitle) + '</p>';
  h += '</header>';
  s.acts.forEach(function (a, ai) {
    h += '<div class="trb-act" data-leaf="' + a.leaf + '" data-label="' + esc(a.label) + '">';
    h += '<h3 class="trb-act-head"><span class="trb-act-no">Hoja ' + pad(a.leaf) + ' / ' + pad(nActs) + '</span><span class="trb-act-label">' + esc(a.label) + '</span></h3>';
    a.beats.forEach(function (b, bi) {
      var fin = ai === lastAct && bi === a.beats.length - 1;
      var kind = fin ? 'final' : b.kind === 'big' ? 'big' : 'read';
      var cls = 'trb-item trb-beat trb-beat--' + kind;
      h += '<p class="' + cls + '" data-kind="' + kind + '"' + (fin ? ' id="trb-fin" tabindex="-1"' : '') + '>' + esc(b.text).replace(/\s*\n\s*/g, '<br>') + '</p>';
    });
    if (ai === lastAct && s.signature) {
      h += '<p class="trb-sign"><span class="trb-sign-dash" aria-hidden="true"></span>' + esc(s.signature) + '</p>';
    }
    h += '</div>';
  });
  return h;
}
