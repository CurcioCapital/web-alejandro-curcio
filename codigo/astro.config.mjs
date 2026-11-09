// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  // El sitio sigue siendo ESTÁTICO: todo se genera como HTML en el build.
  // El adaptador está sólo para que UNA ruta pueda correr en servidor,
  // /api/chat, que marca `export const prerender = false`.
  // OJO con la versión: @astrojs/node 11 pide Astro 7 y este proyecto usa
  // Astro 5. La serie compatible es la 9.
  adapter: node({ mode: 'standalone' }),
  integrations: [
    tailwind({
      // We keep Tailwind's own base/reset off in favor of tokens.css owning
      // the reset + custom properties, so the two don't fight each other.
      applyBaseStyles: false,
    }),
  ],
});
