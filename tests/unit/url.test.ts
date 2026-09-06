import { describe, expect, it } from 'vitest';
import { withBase } from '../../src/lib/url';

describe('withBase', () => {
  it('leaves internal paths usable at the default root mount', () => {
    expect(withBase('/services')).toBe('/services');
    expect(withBase('/')).toBe('/');
  });
  it('normalises a path given without a leading slash', () => {
    expect(withBase('services')).toBe('/services');
  });
  it('passes external and protocol links through untouched', () => {
    expect(withBase('https://example.com/x')).toBe('https://example.com/x');
    expect(withBase('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(withBase('tel:+18455550142')).toBe('tel:+18455550142');
  });
});
