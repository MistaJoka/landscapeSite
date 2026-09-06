import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://stonecroplandscape.com',
  output: 'static',
  adapter: netlify({
    // The edge-functions dev server requires a Deno runtime that is not
    // installed here, and its failure throws an unhandled rejection that
    // covers the page with an error overlay. Nothing in this site uses edge
    // middleware, so turning the dev feature off costs nothing. Production
    // builds are unaffected.
    devFeatures: { edgeFunctions: false, environmentVariables: true, images: true },
  }),
  integrations: [sitemap()],
  // The dev toolbar injects its own UI (including a button labelled "Menu")
  // into the page. That collides with real selectors and means tests would be
  // auditing markup that never ships. Humans keep it in `npm run dev`.
  devToolbar: { enabled: process.env.PLAYWRIGHT !== '1' },
  vite: { plugins: [tailwindcss()] },
});
