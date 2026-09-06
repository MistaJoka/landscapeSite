import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/tokens.css', 'utf-8');

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`token --${name} not found`);
  return match[1];
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('color tokens', () => {
  it('defines every required token', () => {
    for (const name of ['ink', 'ink-muted', 'paper', 'paper-raised', 'moss', 'moss-deep', 'stone']) {
      expect(token(name)).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('meets WCAG AAA for primary text on paper', () => {
    expect(contrast(token('ink'), token('paper'))).toBeGreaterThanOrEqual(7);
  });

  it('meets WCAG AA for secondary text on paper', () => {
    expect(contrast(token('ink-muted'), token('paper'))).toBeGreaterThanOrEqual(4.5);
  });

  it('meets WCAG AA for the accent on paper', () => {
    expect(contrast(token('moss'), token('paper'))).toBeGreaterThanOrEqual(4.5);
  });

  it('meets WCAG AA for paper text on the accent (inverted CTA)', () => {
    expect(contrast(token('paper'), token('moss'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('typography tokens', () => {
  it('defines display and body families', () => {
    expect(css).toContain('--font-display');
    expect(css).toContain('--font-body');
  });
});
