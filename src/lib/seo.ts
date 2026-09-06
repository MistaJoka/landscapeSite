import siteConfig from '../../site.config';

const FALLBACK_ORIGIN = 'https://stonecroplandscape.com';

function origin(site: URL | undefined): string {
  return (site?.origin ?? FALLBACK_ORIGIN).replace(/\/$/, '');
}

export function canonical(pathname: string, site: URL | undefined): string {
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  return `${origin(site)}${path}`;
}

export function absoluteUrl(path: string, site: URL | undefined): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${origin(site)}${path.startsWith('/') ? path : `/${path}`}`;
}

export function pageTitle(title?: string): string {
  if (!title) return siteConfig.seo.defaultTitle;
  return siteConfig.seo.titleTemplate.replace('%s', title);
}
