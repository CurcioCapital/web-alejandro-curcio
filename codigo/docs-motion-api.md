# Motion API — sistema global (21/10/2026)

Lo arranca `src/layouts/Base.astro` en toda página (`initMotion()` de `src/scripts/motion.ts` → `src/scripts/mo/*`).
Estilos/estados: `src/scripts/motion.css`. Sin IntersectionObserver: un solo loop (ticker de GSAP) mide con
`getBoundingClientRect()` sólo cuando el scroll o el layout cambiaron (todas las lecturas primero, después las escrituras).

## Clases en `<html>` (las pone el script inline del `<head>`)

| Clase | Significado |
|---|---|
| `js` | Corre JS. |
| `mo` | JS + movimiento permitido (sin `prefers-reduced-motion`). **Todo estado inicial oculto cuelga de `.mo`**: sin JS la página se ve entera. |
| `mo-preload` | Primera visita de la sesión: preloader 000→100 (1,3–2,6 s). |
| `mo-enter` / `mo-leave` | Cortina de transición entrando / saliendo. |
| `mo-fail` | Failsafe: el motor no arrancó en 6 s → se quita `mo` y todo queda visible. |
| `mo-cursor-on` | Cursor custom activo (sólo puntero fino). |

Con reduced motion: sin Lenis, sin preloader/cortina/cursor, sin transforms; reveals/splits/contadores en estado final, `--p = 1` en los scrub.

## Atributos declarativos

| Atributo | Efecto | Opciones |
|---|---|---|
| `data-split="lines\|words\|chars"` | Cada palabra (o letra) sube desde abajo dentro de una máscara, con stagger. En `lines`, las palabras de la misma línea real comparten retardo (se recalcula al cargar fuentes y al cambiar ancho). Respeta `<em>`, `<a>`, `<br>`. | `data-delay` (ms), `data-split-stagger` (ms), `data-start` (0–1, umbral del viewport; def. 0.9) |
| `data-reveal` | Fade + subida 48px. | `data-delay`, `data-start` (def. 0.88) |
| `data-reveal="mask"` | Clip-path de abajo hacia arriba; la imagen/video (el propio elemento o su hijo directo `img/video/picture/canvas/.mo-mask-media`) escala 1.15→1. | ídem |
| `.reveal` / `<Reveal>` | Legado: recibe `.in-view` + `.is-in`. `<Reveal mask>` = `data-reveal="mask"`. `stagger={i}` → `i*80ms`. | |
| `data-parallax="0.15"` | Desplazamiento vertical proporcional a la distancia al centro del viewport (negativo permitido). Usa la propiedad `translate` (no pisa `transform`). | |
| `data-scrub` | Escribe `--p` (0→1) en el elemento. El CSS de la sección la usa. | `through` (def.: entra por abajo → sale por arriba) · `enter` (top en el fondo → top arriba) · `stick`/`pin` (recorrido de un contenedor alto con sticky adentro) · `exit` |
| `data-magnetic` | Atracción al cursor mientras está encima (sólo mouse). Usa `translate`. | valor = fuerza 0–1 (def. 0.35) |
| `data-cursor="view\|play\|drag\|link"` | Cambia el cursor custom (burbuja dorada con etiqueta en view/play/drag; anillo en link). Sobre cualquier link/botón sin atributo: anillo. | `data-cursor-label="Ver"` (def.: Ver / Play / Arrastrá) |
| `data-marquee` | Marquesina infinita con los hijos directos; clones `aria-hidden` + `inert`. La velocidad y la dirección reaccionan al scroll (como landonorris.com). Pausa fuera de pantalla/pestaña oculta. | `data-marquee-speed` (px/s, def. 60, negativo = derecha), `data-marquee-hover="slow\|pause\|none"`, `data-marquee-react="false"` |
| `data-roll` | Text roll en hover/foco: las letras suben y entra la copia desde abajo. La copia es un `text-shadow` (no hay texto duplicado). El control (link/botón propio o ancestro) recibe `aria-label` con el texto original y las letras van `aria-hidden`; sin control, las letras quedan expuestas (se leen como palabra). innerText = el texto una sola vez. No asume mayúsculas ni métricas (Archivo/Geist). | `[data-roll-text]` en un hijo para elegir qué texto anima; `.is-rolling` lo fuerza |
| `data-counter` | Cuenta hasta el primer número del texto (conserva prefijo/sufijo, formato es-UY `1.200`, `3,5`). Al terminar se restaura el **nodo de texto original**: el valor final es exactamente el del HTML. Años (entero 1900–2100 sin separador) cuentan sólo los últimos 24. | `data-counter-from="1990"`, `data-counter-duration` (ms), `data-delay`, `data-start` (def. 0.92) |

Todos los one-shot reciben `.is-in` al entrar. Esperan a que termine el preloader/cortina.

## JS

- Evento `window` **`motion:ready`** (`detail: { lenis, reduced, animated }`) cuando todo está inicializado; `window.__motionReady = true`.
- Evento `motion:intro` cuando se retira el preloader/cortina.
- **`window.__lenis`**: instancia de Lenis (o `null` con reduced motion). Mueve el scroll nativo, así que `scroll` + `getBoundingClientRect` y `position: sticky` siguen funcionando. Táctil = nativo.
- `window.__motion`: `{ state, refresh(root?), scrollTo(target, { offset, immediate, duration }), onTick(fn) → unsubscribe, stop(), start() }`.
  - `refresh(root)` después de inyectar HTML con atributos nuevos.
  - `scrollTo('#id' | el | y)` aplica el offset del header (o el `scroll-margin-top` del destino).
- Bloqueo de scroll: poner `overflow:hidden` en `<body>`/`<html>` o `data-scroll-lock` en `<html>` frena Lenis solo (MutationObserver). Scrollers internos: `overflow:auto` alcanza; `data-lenis-prevent` los excluye a mano.

## Navegación

- **Anclas de la misma página** (`a[href*="#"]`): scroll suave con offset del header, `pushState`, foco con `preventScroll`. `data-no-smooth` lo desactiva.
- **Cortina entre rutas internas**: click en link interno (mismo origen, sin `target`, sin `download`, no archivos, no `/api/`) → la cortina sube, se navega de verdad (no hay SPA), la página nueva arranca tapada (`mo-enter`) y la cortina se retira. `data-no-transition` en el link o un ancestro la desactiva. Prefetch en hover. Funciona con rutas `…/index.html` relativas y dentro de un `<iframe>`.
- **Aterrizaje** (`initScrollReset`, `mo/scroll.ts`): toda navegación llega a `scrollY = 0`, o al elemento del `#hash` con el offset del header. `history.scrollRestoration = 'manual'` (también en el `<head>`, así aplica aunque el módulo falle). Durante la ventana de aterrizaje (hasta 1,5 s después de `load`, mínimo 2,5 s, tope 10 s) el destino se re-fija cada frame si algo lo movió (fuentes/imágenes tardías, scroll anchoring, `focus()`/`scrollIntoView` ajenos, Lenis con estado viejo), salvo que el usuario ya tomó el control (rueda, toque, tecla, click). También en `pageshow` desde bfcache. Hashes ignorados: `#`, `#top`, `#menu-sitio`.
- Regla para todo el sitio: **nunca `el.focus()` sin `{ preventScroll: true }`**.

## Preloader / cortina

Marcado fijo en `Base.astro` (`.mo-preloader`, `.mo-curtain`, ambos `aria-hidden`). Preloader sólo en la primera visita de la sesión (`sessionStorage mo:visited`); sin `sessionStorage` no hay preloader ni cortina.

## Base.astro — props

| Prop | Uso |
|---|---|
| `title`, `description` | como siempre |
| `preloadImage` | `{ href, srcset?, sizes? }` precarga la imagen LCP de esa página; `false` la desactiva. Default: sólo en la home (`/`), el retrato `/media/img/hero-ale-traje-*.webp` con el mismo srcset/sizes que el hero. |

## Kit (`src/components/kit/`)

Accordion, Carousel (drag + `data-cursor="drag"`), HoverPlayCard, QuoteRotator, Ticker, VideoModal (FLIP desde la tarjeta; cierre con Esc/X/fondo; área táctil del botón cerrar 48×48 vía `::before`; foco atrapado con `preventScroll`). Todos respetan reduced motion y se ven sin JS.

## Verificación hecha (21/10)

Playwright, 1440×900 y 390×844, sobre `/home/claude/builds/motion/client`: navegación por links reales (footer, header, menú overlay, tarjetas de la home) entre las 11 rutas, partiendo de arriba y desde el fondo de la página anterior, directo / dentro de un `<iframe>` / con links `…/index.html` relativos / con imágenes y fuentes demoradas 1,2–2,7 s; recarga al fondo; atrás. `scrollY === 0` a los 300 ms y a los 2,3 s en todos los casos; `/seguime#canales` y `/#facetas` aterrizan en el ancla bajo el header. Sin errores de consola.
