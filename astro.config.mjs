import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

// GitHub Pages is static-only and serves project sites from a sub-path, so the
// Pages build drops the adapter, sets `base`, and disables the contact
// endpoint. The default build still targets Netlify, where the form works.
const isPagesBuild = process.env.DEMO_STATIC === '1';
const repo = process.env.PAGES_BASE ?? '/landscapeSite';

// `prerender` is resolved at compile time from a literal, so the contact
// endpoint cannot opt out conditionally. It therefore lives outside src/pages
// and is injected as a route only for the server-capable build; a static host
// never sees it at all.
const contactEndpoint = {
  name: 'contact-endpoint',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      injectRoute({
        pattern: '/api/contact',
        entrypoint: './src/endpoints/contact.ts',
      });
    },
  },
};

export default defineConfig({
  site: isPagesBuild ? 'https://mistajoka.github.io' : 'https://stonecroplandscape.com',
  base: isPagesBuild ? repo : undefined,
  output: 'static',
  ...(isPagesBuild
    ? {}
    : {
        adapter: netlify({
          // The edge-functions dev server needs a Deno runtime that is not
          // installed here, and its failure throws an unhandled rejection that
          // covers the page with an error overlay.
          devFeatures: { edgeFunctions: false, environmentVariables: true, images: true },
        }),
      }),
  integrations: isPagesBuild ? [sitemap()] : [sitemap(), contactEndpoint],
  // The dev toolbar injects its own UI (including a button labelled "Menu")
  // into the page. That collides with real selectors and means tests would be
  // auditing markup that never ships. Humans keep it in `npm run dev`.
  devToolbar: { enabled: process.env.PLAYWRIGHT !== '1' },
  vite: { plugins: [tailwindcss()] },
});
