import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { imageAssetPath } from '../../src/lib/images';
import { FILES } from '../../scripts/generate-placeholders.mjs';

describe('imageAssetPath', () => {
  it('maps a content path into the assets directory', () => {
    expect(imageAssetPath('/images/services/garden-design.jpg')).toBe(
      '/src/assets/images/services/garden-design.jpg',
    );
  });
  it('tolerates a path without a leading slash', () => {
    expect(imageAssetPath('images/hero.jpg')).toBe('/src/assets/images/hero.jpg');
  });
});

// Checks the generator's manifest rather than the filesystem, so it does not
// depend on a build having run first — and so it fails for the right reason:
// content referencing an image nothing produces.
function referencedImages(): string[] {
  const out: string[] = [];
  for (const dir of ['services', 'areas', 'projects', 'testimonials']) {
    for (const file of readdirSync(`src/content/${dir}`)) {
      const raw = readFileSync(`src/content/${dir}/${file}`, 'utf-8');
      for (const m of raw.matchAll(/^(?:heroImage|beforeImage|afterImage):\s*(\S+)$/gm)) {
        out.push(m[1]);
      }
    }
  }
  return [...new Set(out)];
}

describe('placeholder generator manifest', () => {
  const produced = new Set<string>(FILES.map((entry) => `/images/${String(entry[0])}`));

  it('produces every image referenced by content', () => {
    const missing = referencedImages().filter((path) => !produced.has(path));
    expect(missing).toEqual([]);
  });

  it('covers the images the pages reference directly', () => {
    for (const path of ['/images/hero.jpg', '/images/about-portrait.jpg']) {
      expect(produced.has(path), path).toBe(true);
    }
  });

  it('produces nothing content does not reference, beyond the two page images', () => {
    const referenced = new Set([...referencedImages(), '/images/hero.jpg', '/images/about-portrait.jpg']);
    const orphans = [...produced].filter((p) => !referenced.has(p));
    expect(orphans).toEqual([]);
  });
});
