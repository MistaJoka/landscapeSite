// Astro does not rewrite absolute hrefs when `base` is set, so a site mounted
// at /repo/ would 404 on every internal link. Route internal links through
// this and the site works at any mount point.
const BASE = import.meta.env.BASE_URL ?? '/';

export function withBase(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('mailto:') || path.startsWith('tel:')) {
    return path;
  }
  const base = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;
  const rest = path.startsWith('/') ? path : `/${path}`;
  return `${base}${rest}` || '/';
}
