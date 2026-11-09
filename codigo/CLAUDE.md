# Web de Alejandro Curcio — contexto para Claude

Leé este archivo entero antes de tocar nada. Resume dónde quedó el proyecto (9 de noviembre de 2026), las reglas que puso el equipo y cómo se compila y publica.

## Qué es

Sitio de marca personal de **Alejandro Curcio**, empresario uruguayo:
- presidente de AYAX (Toyota y Suzuki en Uruguay);
- fundador de Curcio Capital;
- autor de *Capital de Vida* (2018), *Toolbook* (2023) y **CEO DE TU VIDA** (Grijalbo, lanzamiento 17/11/2026);
- piloto de Toyota Gazoo Racing Drift;
- Récord Guinness solidario (929 personas en baño de hielo, 13/04/2024).

Objetivo: una web de primer nivel en UX/UI y motion que lo muestre como líder en tecnología y negocios. Las referencias de estilo son **landonorris.com** y **charlesleclerc.com**.

La persona que dirige el proyecto es Emi (equipo de marketing). La gerente de marketing de Alejandro es **Dolores Valdés**; reemplaza a Santiago Tarallo.

## Reglas del equipo (obligatorias)

1. **No inventar información.** Todo dato, cifra, fecha o cita tiene que salir de este repo (`src/chat-data`, textos actuales), de `../docs/` o de prensa verificable. Si falta, preguntá.
2. **No modificar estructura ni secciones que no se pidieron.** Cambios quirúrgicos.
3. **«CEO DE TU VIDA» siempre en mayúsculas**, en todo el sitio.
4. **Récord Guinness = 929 personas.** El hijo se llama **Lucca Curcio**. Alejandro es la **segunda** generación al frente de AYAX y asumió la dirección en 1995.
5. **No tocar la animación del casco** (CascoEnPista, secuencia `media/casco-gr360`) salvo pedido explícito.
6. El formulario de CEO DE TU VIDA está **desactivado a propósito** (falta la herramienta de email).
7. El chat **Preguntale a Ale** no tiene backend. Siempre tiene que decir que es una IA y no Alejandro.
8. **Nunca** incluir un `.env` con claves. Una clave de OpenRouter circuló en un zip viejo y **hay que rotarla**.
9. Textos en español rioplatense (vos), tono sobrio y editorial.

## Stack

- Astro 5 + Tailwind 3. Node ≥ 22.12.
- Motion: GSAP 3 y Lenis (scroll suave); Three.js para el 3D.
- Tipografías:
  - Geist: todo el sitio.
  - JetBrains Mono: etiquetas.
  - League Gothic Variable (wdth 75 %): banda «PUSHING THE LIMITS FOR BETTER».
- `output` estático. El adaptador node queda para un futuro `/api` del chat.

```bash
# las fotos y videos NO vienen en codigo/: copiarlos desde la carpeta web
cp -r ../web/media public/media
npm install
npm run dev        # http://localhost:4321
npm run build      # genera dist/client
```

## Mapa del sitio (12 páginas)

| Ruta | Contenido actual |
|---|---|
| `/` | Hero retrato con «pincel» GR, «Una vida. Cinco facetas.» (Empresario, Deportista, Aventurero, Pensador, Solidario), Quién es (texto pintado al scroll), libros, chat |
| `/historia` | Solo la línea de tiempo animada (1945–2026) |
| `/negocios` | AYAX en cifras, historia al scroll, bZ4X, Curcio Capital, El Nido (video surf + video vertical de Ale), HY Project |
| `/deportista` | Casco 360° «EN PISTA», banda Leclerc «PUSHING THE LIMITS FOR BETTER», mosaico de 5 videos, Toyota Supra 2027 (2 videos centrados) |
| `/aventura` | Solo Monte Fuji: hero editorial + sección con la cita de la montaña |
| `/solidario` | Récord Guinness (carrusel + sello 929), Drift Arena Solidario/Teletón, Pelota al Medio (Copa Toyota), cita de cierre |
| `/libros` | Hero, arco 3D de tapas, BookFeature: tapa a la izquierda y texto pintado a la derecha (Capital de Vida, Toolbook), countdown CEO DE TU VIDA |
| `/capital-de-vida` | Página del primer libro y del concepto |
| `/ceo-de-tu-vida` | Hero, formulario (desactivado), origen Okinawa, seis secciones, countdown grande |
| `/prensa` | Hero split landscape, reconocimientos, selección de notas |
| `/seguime` | Canales (las tarjetas todavía no tienen link) |
| `/preguntale` | Chat IA (sin backend) |

- No se publican: `preview-*`, `kit-demo`, `home-cosmos` y `home-tony`. Son exploraciones.
- Footer, columna «Seguir»: solo Instagram, YouTube y LinkedIn. Instagram apunta a https://www.instagram.com/p/DLQC3KHMEOV/. YouTube y LinkedIn están pendientes de link.

## Sistema de motion (ver `docs-motion-api.md`)

- Atributos: `data-split`, `data-reveal` (`="mask"`), `data-parallax`, `data-marquee`.
- Marquees: la velocidad se multiplica ×2,4 en `src/scripts/mo/marquee.ts`. `Ticker.astro` divide entre 2,4. El footer usa 16 s.
- Texto pintado palabra por palabra: spans `.qe-w`, `.bf-w` y `.pw` reciben `.is-on` según el scroll (Quién es, BookFeature, CEO).
- `src/components/secciones/deportista/PushLimits.astro` es una réplica de charlesleclerc.com:
  - texto con skewX = clamp(−vel, ±15°);
  - poster que entra con escala 1,2 → 1;
  - margin-top −220svh, que lo superpone al final del casco.
- Imágenes: `BlurImage` usa srcset por id con variantes `-640/-1280/-2048` en `.avif/.webp/.jpg`. Se generan con Pillow.
- Videos: recomprimir con ffmpeg (x264, crf 24–27, `-movflags +faststart`, normalmente sin audio) y extraer un poster.

## Publicación

La versión de revisión vive en un Artifact de claude.ai: https://claude.ai/artifact/97SNKbzhYbcFMmhLTsKh89

- Ese link pertenece a la cuenta original. En otra cuenta se publica un artifact nuevo y se avisa el link nuevo.
- La regla del equipo: **publicar siempre en el mismo link** para no repartir versiones.

`scripts-publicacion/` contiene:
- `deploy.sh`: arma la carpeta publicable. Hace lo siguiente:
  - saca las páginas de prueba;
  - renombra `_astro` → `astro`;
  - copia solo la media referenciada y la secuencia `casco-gr360`;
  - corre `relink.py` para pasar todas las rutas a relativas (el artifact no sirve rutas absolutas).
  - **Ajustar las rutas** del principio: `D`, `S` y la carpeta de videos recomprimidos.
- `relink.py`: el script de rutas relativas.
- `final.mjs`: smoke test con Playwright. Recorre 13 páginas a 1440 y 390 px y revisa errores JS, 404 y overflow horizontal.

Límites del Artifact:
- 255 archivos por publicación y unos 511 por versión.
- Los hashes viejos de `astro/` se borran pasando `null` en el mapa de `files`.

La carpeta `../web` del export ya es la salida de `deploy.sh`.

## Pendientes y dudas abiertas

Validación con Alejandro: ver `../docs/Mapa de contenidos de la web.md`, con 67 bloques y un checklist «Para resolver con Alejandro».

- **Origen de AYAX.** Negocios dice «insumos de laboratorio y telares», luego Opel. El material oficial dice Bedford, Vauxhall, General Motors y FIAT. Confirmar.
- En Negocios se ve una nota interna: «⚠ Fechas tomadas del copy aprobado; pendientes de confirmar» (AyaxScrollStory, `b.note`). Sacarla cuando se confirme.
- Sumar a Solidario los **tres récords consecutivos de recaudación para la Teletón**, si Alejandro lo aprueba.
- Seguime:
  - confirmar «más de 375.000» seguidores de Instagram;
  - confirmar los podcasts con Nando Parrado y Berch Rupenian;
  - faltan los links reales.
- La tapa final de CEO DE TU VIDA (Grijalbo) no está; hoy es un mockup.
- La foto con traje GR del hero necesita aprobación de Alejandro.
- Pelota al Medio: confirmar autorización de imagen de menores.
- Fuji: hay una sola foto y tiene marcas de Instagram.
- Chat: conectarlo, por ejemplo con una función en Vercel y un LLM por API con RAG sobre `src/chat-data`. La clave va en variables de entorno del hosting, nunca en el repo.
- El evento de lanzamiento no está en la web. Hay que definir si se publica:
  - 17/11/2026, 19:00 h, Carrasco Yacht North Shore;
  - estética japonesa;
  - producción de Vista Urbana;
  - pantallas, animaciones e iluminación de Jonatan Bordoni;
  - unos 400 invitados.

## Documentos relacionados (carpeta `../docs`)

- `Alejandro Curcio (nota Obsidian).md`: ficha completa para trabajar (datos, reglas de comunicación, citas, cronología, evento).
- `Alejandro Curcio — Perfil completo.md`: perfil largo con fuentes.
- `Mapa de contenidos de la web.md`: sitemap para validar con Alejandro.
- Docs internos del repo: `BRIEF-REDISENO.md`, `docs-design-system.md`, `docs-motion-api.md`, `QA-REPORT.md`, `LEEME-TRASPASO.md`.
