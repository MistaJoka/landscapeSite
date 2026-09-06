import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { imageAssetPath } from '../../src/lib/images';

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

describe('generated placeholders', () => {
  it('produced an asset for every image referenced in content', () => {
    for (const path of [
      'src/assets/images/hero.jpg',
      'src/assets/images/about-portrait.jpg',
      'src/assets/images/services/garden-design.jpg',
      'src/assets/images/work/tioronda-terrace-before.jpg',
      'src/assets/images/work/tioronda-terrace-after.jpg',
      'public/og/default.jpg',
    ]) {
      expect(existsSync(path), path).toBe(true);
    }
  });
});
