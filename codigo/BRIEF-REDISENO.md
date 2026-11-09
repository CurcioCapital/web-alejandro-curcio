# Brief — rediseño "siguiente nivel" (21/10/2026)

Proyecto: /home/claude/app (Astro 5 + Tailwind 3). Leé también `LEEME-TRASPASO.md`.
Referencia visual y de interacción: **landonorris.com**.
Objetivo: una web más fresca, dinámica y moderna, que respire **tecnología** y a la vez
**corporativo / negocios**. Que reaccione a la interacción del usuario y acompañe la navegación.

## Reglas duras (no negociables)
1. **No inventar información.** No se agrega, quita ni reescribe ningún texto, cifra, fecha,
   premio, nombre, cita, link ni dato. Todo el copy queda literal. Si un componente se rediseña,
   reutiliza exactamente el mismo texto (los JSON de `src/data/` no se tocan).
   Única excepción: microcopy de UI sin información (ej. "Scroll", "Ver", "Play", "Menú", "Cerrar"),
   en español rioplatense, y numeración decorativa de secciones (01, 02…) derivada del orden existente.
2. **No modificar estructura.** Mismas páginas, mismas secciones, mismo orden, misma navegación,
   mismos assets de `public/media/`. Se cambia el TRATAMIENTO (layout dentro de la sección,
   tipografía, color, motion, interacción), no el QUÉ.
3. Los «Día de lanzamiento sin confirmar» y el formulario desactivado de CEO de tu Vida son deliberados: se mantienen.
4. Accesibilidad: contraste AA (ver topes en tokens.css), `prefers-reduced-motion` respetado
   (sin transforms ni autoplay), foco visible, navegación por teclado, links reales `<a>`.
5. Progresivo: si el JS falla, la página se ve entera (los estados ocultos cuelgan de una clase que pone el JS en `<html>`).
6. Móvil primero: todo funciona en 375px; los efectos de hover tienen alternativa táctil o por scroll.
7. Rendimiento: nada de videos nuevos pesados; animar solo `transform`/`opacity`/`clip-path`; rAF; pausar fuera de pantalla.
8. Rutas de assets: siempre absolutas `/media/...` como hoy (el deploy las reescribe).

## Dirección de arte (lo que tomamos de landonorris.com)
- **Tipografía display enorme y condensada**: Archivo Variable ya soporta `wdth 62–125`. Display =
  Archivo, `font-stretch: 62%–75%`, peso 800–900, MAYÚSCULAS, tracking apretado (-0.02em), line-height ~0.85,
  tamaños con `clamp()` que llegan a 14–18vw en héroes. Texto corrido = Archivo normal (wdth 100).
  Instrument Serif italic queda SOLO para citas/momentos emotivos (como hoy).
- **Etiquetas "tech"**: una mono para kickers, metadatos, contadores, timestamps
  (`@fontsource-variable/jetbrains-mono`, ya instalada como dependencia; token `--font-mono`).
  Estilo: 11–12px, uppercase, tracking 0.08em, a veces con `[ 01 ]` o `—` como separadores.
- **Color**: base casi negra cálida (`--color-black`), hueso (`--color-off`) para hojas claras,
  y UN acento de identidad: el **dorado** de marca (decisión de cliente, documentada en tokens.css).
  Sobre oscuro el dorado brillante `#e8c874` funciona como el "neón" de Lando. Rampa dorada para
  superficies premium. Máximo 2 tintes saturados por página (ember sigue restringido).
- **Grilla técnica**: líneas finas de 1px (`rgb(255 255 255 / .08)` en oscuro), columnas visibles sutiles,
  esquinas con marcas tipo crop-marks, granos/ruido muy sutil global.
- **Superficies**: tarjetas con radios grandes (24–32px), imágenes que escalan/recortan con el scroll,
  `clip-path` reveals, sticky stacking de secciones.

## Contrato de motion global (lo implementa el agente Motion; los demás lo USAN)
Atributos declarativos, inicializados en `src/scripts/motion.ts` para toda página que use `Base.astro`:
- `data-split="lines|words|chars"` → el texto se parte y entra con máscara (sube desde abajo, stagger). Mantiene el texto accesible (aria-label con el texto original).
- `data-reveal` (ya existe vía Reveal.astro) → fade + rise; `data-reveal="mask"` → reveal de imagen con clip-path de abajo hacia arriba + leve scale 1.15→1.
- `data-parallax="0.15"` → desplazamiento vertical proporcional al scroll (negativo permitido).
- `data-scrub` → el elemento recibe la variable CSS `--p` (0→1) según su paso por el viewport; el CSS de cada sección la usa.
- `data-magnetic` → el elemento se atrae suavemente al cursor (botones, íconos).
- `data-cursor="view|play|drag|link"` + opcional `data-cursor-label="Ver"` → cambia el cursor custom.
- `data-marquee` (+ `data-marquee-speed`) → marquesina infinita cuya velocidad reacciona a la velocidad del scroll.
- `data-roll` en links/botones → efecto "text roll" en hover (el texto sube y entra una copia desde abajo).
- `data-counter` en números → cuenta desde 0 al valor existente cuando entra en pantalla (el número final es exactamente el del texto).
- Smooth scroll global (Lenis) y transición de página tipo cortina entre rutas internas; preloader corto (contador 0→100) solo en la primera visita de la sesión.
- Evento `window` `'motion:ready'` cuando todo está inicializado; `window.__lenis` expuesto.
- NO usar IntersectionObserver (no dispara en el preview del proyecto): scroll + getBoundingClientRect + rAF, o GSAP ScrollTrigger (dependencia `gsap` instalada).

## Propiedad de archivos (cada agente toca SOLO lo suyo)
- **Motion** → `src/scripts/**`, `src/layouts/Base.astro`, `src/components/Reveal.astro`, `src/components/kit/**`.
- **Design system** → `src/styles/**`, `tailwind.config.mjs`, `src/components/Header.astro`, `Footer.astro`,
  y los compartidos de `src/components/*.astro` (salvo Reveal.astro).
- **Home** → `src/pages/index.astro`, `src/components/secciones/home/**`, nuevos componentes bajo `src/components/secciones/home/`.
- **Páginas A** → historia, negocios, deportista, aventura (+ sus `secciones/*`).
- **Páginas B** → libros, capital-de-vida, ceo-de-tu-vida, prensa, seguime, preguntale (+ sus `secciones/*`).
- No tocar: `src/data/**`, `src/chat-data/**`, `public/media/**` (salvo indicación), home-tony, home-cosmos, preview-*, kit-demo, api.
Si necesitás algo de un archivo que no es tuyo, resolvelo con CSS/JS local en tu propio archivo.

## Tokens nuevos (los define Design system; los demás pueden usarlos ya)
`--font-display` (Archivo condensada), `--font-mono`, `--fs-hero` (clamp a ~16vw), `--fs-display-1/2/3`,
`--line` (línea de grilla sobre oscuro), `--line-light` (sobre claro), `--radius-lg: 28px`, `--radius-xl: 40px`,
`--accent` (= dorado brillante sobre oscuro), `--accent-ink` (dorado para texto sobre claro, AA),
`--ease-expo: cubic-bezier(.16,1,.3,1)`, `--ease-quart: cubic-bezier(.76,0,.24,1)`.
Utilidades CSS: `.t-display`, `.t-mono`, `.u-grid-lines`, `.u-grain`, `.u-crop` (crop-marks en esquinas).

## Cómo verificar (sin pisarse)
- Build en carpeta propia: `npx astro build --outDir /home/claude/builds/<tu-nombre>` y servir
  `/home/claude/builds/<tu-nombre>/client` con `python3 -m http.server <puerto propio>`.
- Si el build falla por un archivo que NO es tuyo, esperá un minuto y reintentá; no lo arregles vos.
- Capturas con Playwright (`$(npm root -g)/playwright/index.mjs`, Chromium ya instalado) a 1440×900 y 390×844, y mirarlas.
- Comparar texto visible antes/después: `git diff` sobre tus archivos no debe cambiar ningún string de contenido.
- No hagas commits; dejá los cambios en el árbol de trabajo.
