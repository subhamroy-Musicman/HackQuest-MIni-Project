/**
 * PostCSS configuration.
 *
 * Tailwind CSS v4 ships as a single PostCSS plugin. There is no `tailwind.config.js`
 * in v4 — the design tokens live in `app/globals.css` inside an `@theme` block.
 * See that file for the colour palette used across the app.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
