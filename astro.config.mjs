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
  vite: { plugins: [tailwindcss()] },
});
