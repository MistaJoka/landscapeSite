import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('project scaffold', () => {
  it('targets the production domain', async () => {
    const config = readFileSync('astro.config.mjs', 'utf-8');
    expect(config).toContain("site: 'https://stonecroplandscape.com'");
  });

  it('exposes the required npm scripts', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    for (const script of ['dev', 'build', 'test:unit', 'test:e2e']) {
      expect(pkg.scripts).toHaveProperty(script);
    }
  });
});
