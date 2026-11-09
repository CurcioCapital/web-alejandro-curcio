# Web de Alejandro Curcio — traspaso

Sitio personal de Alejandro Curcio (presidente de Ayax S.A. y Curcio Capital,
Montevideo). Este paquete es el proyecto completo salvo dependencias y
artefactos de build.

**Fecha límite real: noviembre de 2026**, lanzamiento de su tercer libro
*CEO de tu Vida*. Todo el alcance se decide contra esa fecha.

---

## Cómo levantarlo

Node **22.12 o superior**.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # salida en dist/
```

Stack: **Astro 5 + Tailwind 3** (con `applyBaseStyles: false` — el reset y los
tokens viven en `src/styles/tokens.css`, no en Tailwind). Sin React, sin GSAP,
sin Lenis: todas las animaciones de scroll son JS propio en
`src/scripts/motion.ts` y `src/scripts/ensamblado.ts`.

## Seguridad — leer antes de nada

El `.env` **no viene en este zip, a propósito**. Contenía una
`OPENROUTER_API_KEY` real en texto plano que venía arrastrada desde el paquete
original. Hoy **ninguna página la usa** (no hay una sola referencia en `src/`),
pero estuvo expuesta en un zip que circuló: **conviene rotarla igual.**
Si más adelante se conecta el chatbot, va en `.env` y nunca en el repo.

## Estructura

```
src/
  pages/            una ruta por archivo .astro
  components/       compartidos (MediaCard, BlurImage, Reveal, PillButton…)
    kit/            piezas de interacción (Carousel, QuoteRotator, Ticker…)
    secciones/      componentes que pertenecen a UNA sección
  data/             *.json generados — NO editar a mano
  scripts/          motion.ts (física de scroll), ensamblado.ts
  styles/           tokens.css (reset + variables), components.css
public/media/       assets derivados + manifest.json
scripts/ingest.mjs  vault (markdown) -> src/data/*.json
```

### El contenido no se escribe en el código

`src/data/*.json` se **genera** desde la carpeta de contenido con
`npm run ingest`. Si editás los JSON a mano se pisan en la próxima corrida.

### Los assets tienen manifiesto

`public/media/manifest.json` registra cada archivo derivado con su origen,
recorte (in/out) y advertencias. **Si agregás un asset, registralo ahí.**

---

## Reglas del proyecto (no son preferencias)

1. **No inventar credenciales.** Premios, fechas, cifras y nombres de proyecto
   sólo se publican si están confirmados. Lo no confirmado se marca como
   pendiente; no se completa con una suposición plausible. En la web hay
   varios «Día de lanzamiento sin confirmar» que son deliberados.
2. **La prueba va antes que la promesa.** Ale es el caso inverso de un coach:
   hizo las cosas durante cuarenta años y recién ahora las cuenta. El día que
   la web parece una landing de infoproducto, su activo diferencial —una
   trayectoria verificable— se vuelve indistinguible del ruido de gurús.
3. **Contraste calculado, no estimado.** Cada color de marca se eligió
   corriendo el cálculo WCAG antes de aplicarlo. Los topes están anotados en
   `tokens.css` (por ejemplo: en el ribbon dorado la parada más clara no puede
   pasar de `#8f6a15`, donde el texto blanco queda en 4.95:1).
4. **Español rioplatense** en todo el texto de cara al usuario.

---

## Decisiones abiertas

- **Hay TRES versiones del home** y falta elegir una:
  `/` (actual) · `/home-tony` (estructura tipo Tony Robbins) ·
  `/home-cosmos` (la página se arma al scrollear).
  Las tres comparten el cierre — libros y chat son el mismo componente.
- **Tipografía:** `/preview-tipografia` es un muestrario de seis variantes
  esperando una elección.
- **Carrusel:** `/preview-carrusel` y `/preview-carrusel-2` son alternativas
  descartables.
- **Formulario de `/ceo-de-tu-vida`:** el botón está **desactivado a
  propósito** hasta que se defina el servicio de email. No es un bug.
- **El chatbot** (`/preguntale`) está maquetado pero sin backend. Cualquier IA
  que hable como Ale necesita: consentimiento escrito de él, identificación
  visible como IA, límites de dominio y logging.

## Problemas conocidos

- **Assets con sufijo invertido:** `padre-hijo-barco-h` es VERTICAL (2048×3072)
  y `padre-hijo-barco-v` es HORIZONTAL (2048×1366). Están al revés en el
  pipeline. Renombrarlos toca `ingest.mjs`, el manifest y cuatro páginas:
  conviene hacerlo de una sola vez.
- **`fuji-referencia`** es una captura de historia de Instagram con etiquetas
  de cuenta encima, marcada en el manifest como «reference quality only», y
  está publicada en `/aventura` (dos lugares) y `/seguime`. Hay que pedir la
  foto original.
- **La faceta «Aventurero»** usa foto y no video porque no existe video usable:
  los únicos clips de hielo son proxies de 204×360.
- **Video pesado sin usar:** `hyproject-moma-web.mp4` (33 MB) y
  `fiat600r-hero-loop-1600.mp4` (0,8 MB) quedaron sin referencias. Revisar
  antes de podar: algunos se nombran sólo desde el manifest.
- El prototipo viejo en `web/` (fuera de este zip) quedó sin borrar.

## Detalles de implementación que conviene no romper

- **No se usa `IntersectionObserver`** en las animaciones de scroll: en el
  entorno de preview del proyecto no dispara. Todo va con `scroll` +
  `getBoundingClientRect()` y `requestAnimationFrame`.
- **Progresivo:** el estado inicial «oculto» de cada animación cuelga de una
  clase que pone el JS (`html.ens-on`, `html.lb-on`). Si el script falla, la
  página se ve entera en vez de quedar en blanco. Si tocás ese CSS, mantené
  esa propiedad.
- **Especificidad con estilos scopeados de Astro:** el estado inicial y el
  final tienen que escribirse con la MISMA forma. Si uno va suelto y el otro
  con `:global()`, Astro le agrega el atributo de scope a uno solo y el
  inicial le gana al final — la animación no ocurre nunca. Ya pasó dos veces.
- **`min-height` le gana a `height`**, y una grilla con altura definida
  estira sus filas. En el recorrido de los libros eso hacía que las tapas se
  dibujaran fuera de la pantalla.
