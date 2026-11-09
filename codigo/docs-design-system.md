# Design system — rediseño «siguiente nivel» (21/10/2026)

> **Actualización 21/10/2026 — tipografía display = Geist Variable.** Por decisión
> del cliente se reemplazó la Archivo condensada en MAYÚSCULAS por **Geist
> Variable** (`@fontsource-variable/geist`, importada en `global.css`):
> caja normal, peso 500–600 (`--display-wght: 560`), tracking `--display-track:
> -0.035em`, interlineado `--display-lh: 1`, sin `font-stretch`. La escala
> `--fs-*` bajó ~18%. Geist también es ahora `--font-body` / `--font-heading`
> (Archivo queda de fallback). Instrument Serif italic sigue para citas (y la
> comilla de QuoteOverlay). JetBrains Mono en MAYÚSCULAS sigue para etiquetas.
> `.t-display--narrow/--wide` quedan como no-op; `--display-wdth` = 100%.
> Donde abajo dice «condensada / MAYÚSCULAS», leer «Geist, caja normal».

Referencia: landonorris.com. Este documento cubre lo que agrega el rediseño;
los tokens y clases anteriores siguen vivos y sin renombrar (las páginas
interiores dependen de ellos).

## Archivos

| Archivo | Qué tiene |
|---|---|
| `src/styles/tokens.css` | Tokens. Bloque nuevo «REDISEÑO» al final del `:root` original. Topes de contraste documentados arriba de todo. |
| `src/styles/components.css` | Port 1:1 de la dirección aprobada. **Sin cambios.** |
| `src/styles/system.css` | Base global (selección, foco, scrollbar, grano) + utilidades `.t-*` / `.u-*` + `.roll`. |
| `src/styles/refresh.css` | Nuevo tratamiento de las piezas compartidas de components.css (pill, kicker, títulos, hero, foto, cita, facetas, media-card). Sacando su `@import` de `global.css` se vuelve atrás. |
| `src/styles/global.css` | Orden: JetBrains Mono (fontsource) → tokens → components → system → refresh → Tailwind. |
| `tailwind.config.mjs` | Alias nuevos: `font-display`, `font-mono`, `text-display-hero/1/2/3`, `text-mono`, `rounded-xl`, `ease-expo`, `ease-quart`, colores `gold`, `gold-ink`, `grid`, `grid-light`. |

## Tokens nuevos

| Token | Valor | Uso |
|---|---|---|
| `--font-display` | `'Geist Variable'`, Archivo de fallback | Display: caja normal, 500–600, tracking -0.035em. |
| `--font-mono` | `'JetBrains Mono Variable'`, ui-monospace… | Kickers, metadatos, contadores, índices. |
| `--fs-hero` | `clamp(3rem, 0.55rem + 12.4vw, 14.25rem)` | Titular de héroe (~13vw). |
| `--fs-display-1` | `clamp(2.5rem, 0.8rem + 7vw, 9rem)` | 40 → 144px |
| `--fs-display-2` | `clamp(2.125rem, 1.1rem + 4.1vw, 5.75rem)` | 34 → 92px |
| `--fs-display-3` | `clamp(1.75rem, 1.15rem + 2.4vw, 3.75rem)` | 28 → 60px |
| `--fs-mono` / `--fs-mono-sm` | 12px / 11px | Mono. |
| `--display-wght` / `--display-track` / `--display-lh` | 560 / -0.035em / 1 | Corte display. `--display-wdth` = 100% (legado). |
| `--line` | `rgb(255 255 255 / .08)` | Línea de grilla sobre oscuro. |
| `--line-strong` | `rgb(255 255 255 / .16)` | Hairline de controles sobre oscuro. |
| `--line-light` | `rgb(12 10 6 / .1)` | Línea de grilla sobre claro. |
| `--grid-cols` / `--grid-cols-mobile` | 12 / 4 | Columnas de `.u-grid-lines`. |
| `--radius-lg` | **28px** (antes alias de `--radius-sheet`) | Superficies grandes. |
| `--radius-xl` | 40px | Superficies muy grandes. |
| `--accent` | `#e8c874` | Dorado brillante = «neón» sobre negro (12.33:1). **Nunca texto blanco encima**: sobre él va tinta. |
| `--accent-ink` | `#7a5c10` | Dorado para TEXTO sobre claro (5.53:1 sobre `#f4f1ea`). Tope: `#8a6812`. |
| `--accent-soft` | `rgb(232 200 116 / .14)` | Tintes / fondos suaves. |
| `--ease-expo` | `cubic-bezier(.16,1,.3,1)` | Entradas largas, overlays, zoom. |
| `--ease-quart` | `cubic-bezier(.76,0,.24,1)` | Cortinas, in-out marcado. |
| `--nav-h` | 74px (64px ≤720px) | Alto de la barra (sticky, ocupa lugar en el flujo). |
| `--grain-url` | data-URI SVG | Textura de ruido (la usan el grano global y `.u-grain`). |

Siguen vigentes los topes: ribbon con texto blanco → parada más clara `#8f6a15`
(4.95:1); dorado sobre crema → no pasar de `#8a6812`. Ember sigue restringido.

## Utilidades

### Tipografía
- `.t-display` — Geist, 560, caja normal, `-0.035em`, lh 1, `text-wrap: balance`. Tamaño por defecto `--fs-display-2`.
  - Tamaños: `.t-display--hero`, `--1`, `--2`, `--3`.
  - `.t-display--narrow` / `--wide`: no-op (legado). `.t-display--black`: 640.
  - `.t-display--outline` — sólo contorno (eco decorativo).
  - `<em>` dentro de `.t-display` o `.t-accent` → palabra en dorado (`--accent`; en hojas claras `--accent-ink`).
- `.t-mono` — JetBrains Mono 12px, 500, MAYÚSCULAS, `0.08em`, cifras tabulares. `.t-mono--sm` = 11px.
- `.t-bracket` — envuelve en `[ … ]` (decorativo, por CSS). `.t-dash` — raya delante.

### Superficies
- `.u-grid-lines` — columnas de 1px alineadas al `.wrap` (1360px + `--edge`), con fundido arriba/abajo. Va en `::before` con `z-index:-1` y `isolation:isolate` (pinta sobre el fondo y bajo el contenido). Sobre claro: `.on-light` o `--grid-line`. `.u-grid-lines--solid` sin fundido. **Ojo**: `isolation` encierra los z-index de los hijos; no usar en un contenedor que tenga un modal fijo adentro.
- `.u-grain` — grano local en `::after` (`--grain-opacity`, def. .12, blend overlay). El grano GLOBAL ya está en `body::after` (4.5%, sin blend, fijo).
- `.u-crop` — cuatro crop-marks en las esquinas, en `::after` (z 3). Variables: `--crop-color`, `--crop-size` (14px), `--crop-inset` (14px). `.on-light` / hojas claras → marcas oscuras. `.u-crop--accent` dorado. `.u-crop--hover` las abre en hover. **No combinar `.u-grain` y `.u-crop` en el mismo elemento** (ambas usan `::after`).
- `.u-surface` — radio `--radius-lg` + hairline. `.u-hairline` — separador de 1px.
- `.roll` — text-roll del design system (menú, footer). Marcado:
  `<a class="roll-host"><span class="roll"><span class="roll__in"><span>Texto</span><span aria-hidden="true">Texto</span></span></span></a>`.
  Para todo lo demás usar `data-roll` del agente de motion.

### Base global
- Selección dorada (`--accent` + tinta). Foco: `outline 2px --accent` (en hojas claras `--accent-ink`), sólo `:focus-visible`.
- Scrollbar fina dorada (Firefox + WebKit).

## Componentes

### Header (`Header.astro`)
- Ribbon dorado de «CEO de tu Vida»: mismo texto y contador (sólo días); el contador va en mono.
- Barra sticky mínima: marca (trébol + nombre en display) · búsqueda (→ `/preguntale`) · CTA «CEO de tu Vida» (pill dorado) · botón «Menú».
- Transparente arriba; al scrollear `.is-scrolled` (vidrio con blur). Bajando > 240px se oculta (`.is-hidden`), subiendo vuelve. Nunca se oculta con foco adentro ni con el menú abierto.
- Menú overlay (`#menu-sitio`, `role="dialog"`, `aria-modal`): mismos items y destinos (Sobre Alejandro → `/#facetas`; Explorar: Libros → `/libros`, Podcast → `/seguime#canales`; Preguntale a Ale → `/preguntale`; CTA → `/ceo-de-tu-vida`), en display gigante, índice mono decorativo, cortina `--ease-quart`, entrada escalonada (`--i`), roll en hover, los demás items se apagan. Preview de imagen que sigue al cursor (sólo puntero fino ≥1024px, vive en la mitad derecha) con assets existentes de `/media` (se cargan al abrir por primera vez).
- Accesibilidad: el botón es `<a href="#menu-sitio" role="button" aria-expanded aria-controls>`; Espacio/Enter abren, Escape cierra y devuelve el foco, Tab queda atrapado, scroll bloqueado (`overflow:hidden` + `__lenis.stop()`), `inert` cuando está cerrado. Sin JS abre por `:target` y «Cerrar» (`href="#"`) cierra.
- También registra un listener delegado que escribe `--px/--py` en cualquier `.pill` (origen del relleno).

### Footer (`Footer.astro`)
- Marquesina decorativa (`aria-hidden`) con «Curcio Capital · AYAX · El Nido» en display, alternando contorno, separador trébol dorado. Se pausa fuera de pantalla; quieta con reduced motion.
- Tagline grande + botón «Volver arriba» (usa `__lenis.scrollTo(0)` si existe).
- Columnas con los mismos links y textos (índice mono decorativo 01–04); «Seguir» sigue inerte (`aria-disabled`, sin href).
- Nombre «Alejandro Curcio» en display a sangre: un script ajusta el `font-size` al ancho exacto (fit-text) tras cargar la fuente.
- Clase `site-footer`: el selector global `footer {}` de components.css no se tocó (otras piezas usan `<footer>`).

### PillButton (`PillButton.astro`) / `.pill`
- Relleno circular que crece desde el punto de entrada del cursor (`::before`, `--ease-expo`) y se retira hacia el de salida. Sin JS nace del centro.
- Variantes (mismas props): default blanco → relleno dorado · `outline` → relleno blanco (en hojas claras se invierte a tinta) · `dark` → relleno dorado · `pill--accent` (rampa dorada) → relleno hueso. Texto tinta sobre dorado.
- Label en `<span class="pill-label" data-roll>`; el `<a>` lleva `data-magnetic`. Pendientes (`href="#"`) quedan inertes, sin relleno ni magnetismo.
- Sin lift en hover (el movimiento lo da `data-magnetic`).

### Compartidos
- **InsetHeroCard**: `.u-crop`, radio 28px, titular display (`--fs-display-2`; versión `compact` a `--fs-hero`), kicker y ticker en mono. La variante `short` pone la copia en el flujo para que la tarjeta crezca con el titular.
- **SectionPhoto**: `.u-crop`, título display, kicker mono, `data-scrub` → la foto hace zoom 1.14 → 1 con `--p`.
- **QuoteOverlay**: `.u-crop`, comilla display dorada (`aria-hidden`), atribución mono, `data-scrub` con zoom. Corregido: la foto ahora llena el cuadro en móvil.
- **PillarRow**: índice mono `[ 01 ]`, palabra display, «Explorar» mono, foto con crop-marks + zoom y clip en hover.
- **MediaCard**: `data-cursor="view"` + `data-cursor-label="Ver"` (no en la tipográfica), zoom contenido en hover (mínimo en `ratio`/exacta para no recortar la tapa).
- **SectionWhite**: radio 28px, kicker mono (dorado tinta en claro), título display (`h2.section-title` global).
- **BlurImage**: sin cambios.

### Clases globales que cambiaron de tratamiento (refresh.css)
`.kicker` / `.hero-kicker` / `.stub-kicker` → mono con raya · `h2.section-title`, `.photo-title`, `.hero-title`, `.stub-title`, `.final-cta h2` → display condensada MAYÚSCULAS · `.quote-attr`, `.pillar-idx`, `.pillar-explore`, `.book-year`, `.book-link`, `.media-card .tk` → mono.

## Reduced motion
Sin transforms: el header no se esconde, el menú entra con fundido de 180ms (sin cortina ni stagger ni preview), marquesina quieta, sin zoom de fotos ni relleno animado del pill.
