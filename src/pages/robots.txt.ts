import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  // The Pages deploy is a preview of an invented placeholder business. Letting
  // it get indexed would put a fake Hudson Valley landscaper into search results.
  if (import.meta.env.DEMO_STATIC === '1') {
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const sitemap = new URL('sitemap-index.xml', site ?? 'https://stonecroplandscape.com').href;
  return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${sitemap}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
