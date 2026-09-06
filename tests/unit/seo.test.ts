import { describe, expect, it } from 'vitest';
import { absoluteUrl, canonical, pageTitle } from '../../src/lib/seo';

const site = new URL('https://stonecroplandscape.com');

describe('canonical', () => {
  it('builds an absolute URL from a pathname', () => {
    expect(canonical('/services', site)).toBe('https://stonecroplandscape.com/services');
  });
  it('strips a trailing slash from non-root paths', () => {
    expect(canonical('/services/', site)).toBe('https://stonecroplandscape.com/services');
    expect(canonical('/areas/beacon/', site)).toBe('https://stonecroplandscape.com/areas/beacon');
  });
  it('keeps the root path as a single slash', () => {
    expect(canonical('/', site)).toBe('https://stonecroplandscape.com/');
  });
  it('falls back to the configured production origin when site is undefined', () => {
    expect(canonical('/about', undefined)).toBe('https://stonecroplandscape.com/about');
  });
});

describe('pageTitle', () => {
  it('applies the template to a page title', () => {
    expect(pageTitle('Services')).toBe('Services | Stonecrop Landscape Co.');
  });
  it('returns the default title when given nothing', () => {
    expect(pageTitle()).toContain('Stonecrop Landscape Co.');
    expect(pageTitle()).not.toContain('%s');
  });
});

describe('absoluteUrl', () => {
  it('resolves a relative asset path', () => {
    expect(absoluteUrl('/og/default.jpg', site)).toBe('https://stonecroplandscape.com/og/default.jpg');
  });
  it('passes through an already-absolute URL', () => {
    expect(absoluteUrl('https://cdn.example.com/a.jpg', site)).toBe('https://cdn.example.com/a.jpg');
  });
});
