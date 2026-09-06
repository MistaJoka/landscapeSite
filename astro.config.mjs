import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://stonecroplandscape.com',
  output: 'static',
  adapter: netlify(),
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
