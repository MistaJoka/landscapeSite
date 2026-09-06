import { describe, expect, it } from 'vitest';
import { parseSubmission } from '../../src/lib/contact';

const NOW = 1_800_000_000_000;
const STARTED = NOW - 10_000;

function form(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const base: Record<string, string> = {
    name: 'Dana Reyes',
    email: 'dana@example.com',
    phone: '845-555-0199',
    town: 'Beacon',
    service: 'patios-stonework',
    message: 'Our side yard erodes every spring and we would like a terrace instead.',
    company: '',
    startedAt: String(STARTED),
  };
  for (const [key, value] of Object.entries({ ...base, ...overrides })) data.set(key, value);
  return data;
}

describe('parseSubmission', () => {
  it('accepts a complete submission', () => {
    const result = parseSubmission(form(), NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.email).toBe('dana@example.com');
  });
  it('rejects a missing name', () => {
    const result = parseSubmission(form({ name: '' }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.name).toBeTruthy();
  });
  it('rejects a malformed email', () => {
    const result = parseSubmission(form({ email: 'not-an-email' }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBeTruthy();
  });
  it('rejects a message shorter than 20 characters', () => {
    const result = parseSubmission(form({ message: 'help' }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.message).toBeTruthy();
  });
  it('treats a filled honeypot as spam', () => {
    const result = parseSubmission(form({ company: 'Acme SEO Services' }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.form).toContain('could not be submitted');
  });
  it('rejects a submission completed in under three seconds', () => {
    const result = parseSubmission(form({ startedAt: String(NOW - 900) }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.form).toBeTruthy();
  });
  it('gives the same generic message for both spam checks', () => {
    const honeypot = parseSubmission(form({ company: 'x' }), NOW);
    const tooFast = parseSubmission(form({ startedAt: String(NOW) }), NOW);
    expect(honeypot.ok).toBe(false);
    expect(tooFast.ok).toBe(false);
    if (!honeypot.ok && !tooFast.ok) expect(honeypot.errors.form).toBe(tooFast.errors.form);
  });
  it('allows an empty phone number', () => {
    expect(parseSubmission(form({ phone: '' }), NOW).ok).toBe(true);
  });
});
