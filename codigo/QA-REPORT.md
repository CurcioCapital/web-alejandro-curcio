# QA del rediseño — 21/10/2026

Revisión independiente (no participé del build). Se probó el build de deploy
(`/home/claude/site2`, links relativos `…/index.html`, igual que la versión
publicada) con Playwright/Chromium a 1440×900 y 390×844 (más algunos casos
a 375). Se compararon el texto visible y los links contra el build original
(`/home/claude/site`).

## Pedidos del cliente

| # | Pedido | Resultado |
|---|---|---|
| a1 | Nombre «Alejandro Curcio» moderado, no dominante | **A validar con el cliente.** Se achicó (≈62 % del anterior), pero en 1440 sigue siendo el texto más grande de la pantalla: 201 px (`min(14vw, 28svh)`) contra 40 px del h1. En 390 queda bien (58 px). Es una decisión de diseño; no la toqué. |
| a2 | Hover del retrato → imagen GR con pincel suave que sigue al cursor y se desvanece, sin círculo/lupa/anillo/etiqueta | **Pasa.** Trazo orgánico de borde suave, se borra solo en ~1 s. Sin UI propia. Ojo: se sigue viendo el punto dorado de 8 px del cursor global del sitio (no es del efecto; ver abiertos). |
| a3 | Titular = trébol + «Capital de Vida» (reemplaza «El verdadero capital se forja.») | **Pasa.** Es el `<h1>`. |
| a4 | Sin marquesina de palabras debajo del hero | **Pasa.** Debajo del hero viene directo «Una vida. / Seis facetas.». |
| a5 | «Una vida.» / «Seis facetas.» en dos líneas, «Seis facetas.» en una sola | **Pasa** en 1440, 390 y 375 (medido por líneas reales de texto). |
| b | Display en Geist, caja normal, sin condensada/negrita/mayúsculas; mono puede ir en mayúsculas | **Pasa.** Todo texto ≥ 26 px en las 11 páginas es Geist (o Instrument Serif itálica en citas). Sin `font-stretch`, sin mayúsculas fuera de la mono. Las únicas excepciones son índices numéricos en mono grande (`01–06` de facetas, pasos `01–05` del protocolo, HUD del año en historia): números decorativos, no texto. |
| c | Todo link de sección aterriza ARRIBA (o en el #ancla) | **Pasa.** 24 casos por viewport (footer, menú, marca, CTA del header, tarjetas de la home y links internos), arrancando desde el fondo o la mitad de la página de origen: `scrollY = 0` a los 0,4 s y a los 2,6 s; `/#facetas`, `/seguime#canales` y `/aventura#guinness` dejan el ancla a 119–126 px (debajo del header). Las 11 rutas cubiertas. |
| d | Integridad de contenido | **Pasa.** Diff de texto visible (palabra por palabra) de las 11 páginas contra el original: no falta ni cambia ningún texto, cifra, fecha, nombre ni cita, salvo el pedido (a3). Lo agregado es microcopy de UI («Menú», «Scroll», «Play», «Volver arriba»), numeración decorativa (01/06, Era 01/05…), duplicados de marquesinas y texto que en el original existía pero oculto (descriptores del índice de libros, acordeón de prensa). Todo texto agregado existe en el HTML original. Los links (`href`) son los mismos; sólo se suman `#`, `#top` y `#menu-sitio`. Los contadores terminan en el valor exacto. Siguen los «Día de lanzamiento sin confirmar», el formulario de CEO de tu Vida desactivado y el chat rotulado «Esto es una IA». |

## Otras verificaciones

- **Consola**: 0 errores y 0 warnings en las 11 páginas, ambos viewports.
- **Requests**: 0 fallidos / 404; 0 imágenes rotas.
- **Overflow horizontal**: 0 px en todas las páginas, ambos viewports.
- **JS desactivado**: todo el contenido visible. Los dos sospechosos están bien: el h1 de la home (`.hh-title`) entra con una animación CSS pura y queda en opacidad 1 a los ~1,4 s; los descriptores de `/libros` (BookIndex) se revelan por CSS con hover/foco (igual que el acordeón cerrado del original) y en táctil están siempre visibles.
- **Reduced motion**: todo renderiza; sin autoplay; contadores/splits en su estado final. Lo único oculto son las citas inactivas del QuoteRotator (se cambian con los avatares, como en el original).
- **Videos**: ninguno corre fuera de pantalla; con reduced motion, ninguno corre.
- **Menú por teclado**: Enter y Espacio abren, el foco va al primer ítem, Tab queda atrapado, Escape cierra y devuelve el foco a «Menú». Foco visible (outline dorado 2 px) en todo el sitio.
- **Rendimiento**: igual que el original (comparado página por página). Lo pesado es previo al rediseño (ver abiertos).

## Defectos corregidos

1. **El VideoModal cerrado seguía en el orden de Tab** (`/historia`, `/libros`). El `display:flex` del overlay pisaba el `[hidden]`; el foco caía en el «Cerrar video» y en los controles de un video invisible, y la página saltaba ~20.000 px. Ya pasaba en el original, pero es un defecto claro de teclado. → `src/components/kit/VideoModal.astro`: `.kit-video-modal__overlay[hidden] { visibility: hidden }` (no `display:none`, para no romper la medición FLIP ni el fundido).
2. **El video abierto quedaba encerrado en la tarjeta** (regresión del rediseño, `/historia` y aftermovie de `/libros`). El estado final de `data-reveal="mask"` deja `clip-path: inset(0)` en el contenedor, y el clip-path recorta también a los hijos `position: fixed`: sin fondo oscuro, el botón cerrar fuera de vista. → `VideoModal.astro`: mientras el modal está abierto, el contenedor con máscara pasa a `clip-path: none` (visualmente idéntico).
3. **El video de cierre de `/libros` («Ver el cierre completo») quedaba debajo del footer.** `.chispa` tiene `isolation: isolate`, que encierra el z-index 300 del modal, y el footer se pintaba encima. → `src/components/secciones/libros/ClosingChispaQuote.astro`: la sección sube a `z-index: 400` sólo mientras su modal está abierto (sigue por debajo del menú, 500).
4. **Botón del video sin nombre accesible** (disparadores que son sólo una imagen, en `/historia` y `/libros`). → `VideoModal.astro`: si el disparador no tiene texto, toma el `label` que ya se le pasa al diálogo (mismo texto, no se agrega contenido).
5. **Contraste AA**: textos de metadatos mono y epígrafes de `/negocios` en 4,48:1 (blanco 45 % sobre `#0a0805`). → `src/styles/tokens.css`: `--ink-low` 0,45 → 0,50 (5,3:1). Y los índices `[ 03 ]`/`[ 04 ]` sobre hoja hueso (historia, negocios, aventura) en 3,5:1 → `src/components/secciones/historia/pa-kit.css`: 0,50 → 0,62 (5,2:1).

Re-build y re-verificación hechos para 1, 2, 4 y 5 (foco, contraste, apertura/cierre del modal con mouse y teclado, consola sin errores). **La 3 está aplicada en el código pero NO quedó re-verificada**: la herramienta de comandos se cayó antes del último build. Pendiente: `npx astro build`, abrir «Ver el cierre completo» en `/libros` y confirmar que el video tapa el footer.

## Abiertos (por prioridad)

**Alta — decisión del cliente**
1. **Tamaño del nombre en el hero (a1).** En escritorio sigue siendo lo más grande de la pantalla. Si el cliente quiere que «acompañe», una opción es bajar `.hh-name` a algo como `min(9vw, 18svh)` en `HeroRetrato.astro`; no lo cambié porque es criterio de diseño.
2. **Punto dorado del cursor global sobre el retrato.** El efecto del pincel no tiene UI, pero el cursor custom del sitio (8 px) sigue visible encima. Si el cliente lo leyó como «círculo», se puede ocultar sólo sobre `.hh-figure`.

**Media**
3. **Videos pesados (previo al rediseño, igual que el original):** `/libros` ≈ 24 MB (toolbook-aftermovie 12 MB + chispa 12 MB) y `/historia` ≈ 19 MB (fiat600r 12 MB + sucesion 6 MB) se piden al cargar dentro de los modales; `/deportista` ≈ 12 MB en loops. Conviene `preload="none"` en los videos de los modales y recomprimir. Ojo: el `python -m http.server` local no soporta Range, así que en producción puede ser algo menos.
4. **Primera visita**: la entrada animada del hero (nombre, retrato, h1) corre detrás del preloader (1,3–2,6 s) y no se llega a ver.
5. **Header**: «Sobre Alejandro» y «Explorar» ya no están visibles en la barra; viven en el menú overlay con los mismos destinos (está documentado en el design system). Confirmar que el cliente lo aprobó.

**Baja**
6. Puntos del carrusel de `/aventura` de 7×7 px (igual que el original). Las flechas cubren la misma función, así que entra en la excepción de WCAG 2.5.8; si se quiere, se agranda el área táctil.
7. Años de `/prensa` y números romanos de `/ceo-de-tu-vida` en contorno (relleno transparente, trazo fino): se leen bien en tamaño grande, pero no tienen contraste «de relleno».
8. `/historia` en móvil dice «Pasá el mouse para revivir la anécdota» (texto original, no se tocó).
9. Las filas del índice de `/libros` usan `tabindex="0"` en un `<li>` sin rol interactivo: se pueden enfocar para revelar el descriptor, pero el lector de pantalla no anuncia qué son.
