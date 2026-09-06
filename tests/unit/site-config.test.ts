import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import siteConfig from '../../site.config';

describe('siteConfig', () => {
  it('carries complete NAP data for LocalBusiness structured data', () => {
    expect(siteConfig.business.name).toBe('Stonecrop Landscape Co.');
    expect(siteConfig.business.phone).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
    expect(siteConfig.business.phoneHref).toMatch(/^tel:\+1\d{10}$/);
    expect(siteConfig.business.email).toContain('@');
    const { street, city, region, postalCode, country } = siteConfig.business.address;
    for (const part of [street, city, region, postalCode, country]) {
      expect(part.length).toBeGreaterThan(0);
    }
  });

  it('defines navigation without the service-area pages', () => {
    const hrefs = siteConfig.nav.map((item) => item.href);
    expect(hrefs).toEqual(['/services', '/work', '/about', '/contact']);
    expect(hrefs.some((h) => h.startsWith('/areas'))).toBe(false);
  });

  it('provides a title template containing a placeholder', () => {
    expect(siteConfig.seo.titleTemplate).toContain('%s');
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('brand strings stay in configuration', () => {
  it('does not hardcode the business name or phone in components or layouts', () => {
    const roots = ['src/components', 'src/layouts'].filter((d) => {
      try { return statSync(d).isDirectory(); } catch { return false; }
    });
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of walk(root)) {
        const source = readFileSync(file, 'utf-8');
        if (source.includes(siteConfig.business.name) || source.includes(siteConfig.business.phone)) {
          offenders.push(file);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
