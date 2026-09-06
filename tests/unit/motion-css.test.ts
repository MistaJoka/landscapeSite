import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/global.css', 'utf-8');

describe('reveal animation', () => {
  it('uses a native scroll-driven timeline', () => {
    expect(css).toContain('animation-timeline: view()');
  });
  it('guards the scroll-driven path behind a support query', () => {
    expect(css).toContain('@supports (animation-timeline: view())');
  });
  it('defines the JS fallback state class', () => {
    expect(css).toContain('.reveal-in');
  });
  it('disables reveal animation under reduced motion', () => {
    const reducedBlock = css.slice(css.indexOf('prefers-reduced-motion'));
    expect(reducedBlock).toContain('.reveal');
    expect(reducedBlock).toMatch(/opacity:\s*1/);
  });
});
