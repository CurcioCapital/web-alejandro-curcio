/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      // Bridge Tailwind's utility classes to the CSS custom properties
      // defined in src/styles/tokens.css. Values are the P1
      // tournament-approved palette ("dirección D") — reskinning the whole
      // site is still a one-file edit: change tokens.css, these mappings
      // stay put.
      colors: {
        black: 'var(--color-black)',
        'black-2': 'var(--color-black-2)',
        white: 'var(--color-white)',
        off: 'var(--color-off)',
        ink: 'var(--color-ink)',
        cobalt: 'var(--color-cobalt)',
        'cobalt-dim': 'var(--color-cobalt-dim)',
        line: 'var(--color-line)',
        'line-dark': 'var(--color-line-dark)',
        // legacy/generic aliases kept for continuity with the P0 scaffold
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        border: 'var(--color-border)',
        // Rediseño 21/10/2026 — nombres NUEVOS (no pisan `accent`, que sigue
        // mapeando a --color-accent para las páginas existentes).
        gold: 'var(--accent)', // dorado brillante: sólo sobre oscuro
        'gold-ink': 'var(--accent-ink)', // dorado para texto sobre claro (AA)
        grid: 'var(--line)',
        'grid-light': 'var(--line-light)',
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
        display: 'var(--font-display)',
        mono: 'var(--font-mono)',
      },
      fontSize: {
        hero: 'var(--text-hero)',
        'section-title': 'var(--text-section-title)',
        'photo-title': 'var(--text-photo-title)',
        quote: 'var(--text-quote)',
        'pillar-word': 'var(--text-pillar-word)',
        lead: 'var(--text-lead)',
        kicker: 'var(--text-kicker)',
        'display-hero': ['var(--fs-hero)', { lineHeight: '0.82' }],
        'display-1': ['var(--fs-display-1)', { lineHeight: '0.86' }],
        'display-2': ['var(--fs-display-2)', { lineHeight: '0.86' }],
        'display-3': ['var(--fs-display-3)', { lineHeight: '0.9' }],
        mono: 'var(--fs-mono)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      spacing: {
        section: 'var(--space-section)',
        edge: 'var(--edge)',
      },
      transitionDuration: {
        DEFAULT: 'var(--dur)',
        base: 'var(--dur)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--ease)',
        standard: 'var(--ease)',
        expo: 'var(--ease-expo)',
        quart: 'var(--ease-quart)',
      },
    },
  },
  plugins: [],
};
