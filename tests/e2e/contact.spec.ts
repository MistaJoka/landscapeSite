import { expect, test } from '@playwright/test';

test('shows validation errors for an empty form', async ({ page }) => {
  await page.goto('/contact');
  await page.waitForTimeout(3200); // clears the minimum fill-time check
  await page.getByRole('button', { name: /send/i }).click();
  await expect(page.getByText(/please enter your name/i)).toBeVisible();
});

test('accepts a complete submission', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('Your name').fill('Dana Reyes');
  await page.getByLabel('Email').fill('dana@example.com');
  await page.getByLabel('Town').fill('Beacon');
  await page.getByLabel('What do you need?').selectOption('patios-stonework');
  await page.getByLabel('About the property').fill('Our side yard erodes every spring and we would like a terrace.');

  await page.waitForTimeout(3200);
  await page.getByRole('button', { name: /send/i }).click();
  await expect(page.getByRole('status')).toContainText(/thank you/i);
});

// Astro's checkOrigin protection rejects same-origin-less POSTs with 403 before
// the handler runs. A real browser always sends Origin, so these direct posts
// must too — otherwise we would be testing the CSRF guard, not the spam guards.
const ORIGIN = { accept: 'application/json', origin: 'http://localhost:4321' };

test('rejects a honeypot submission at the endpoint', async ({ request }) => {
  const response = await request.post('/api/contact', {
    headers: ORIGIN,
    form: {
      name: 'Bot', email: 'bot@example.com', phone: '', town: 'Beacon',
      service: 'garden-design', message: 'A perfectly plausible looking message body.',
      company: 'Acme SEO', startedAt: String(Date.now() - 10_000),
    },
  });
  expect(response.status()).toBe(422);
});

test('rejects a submission that was too fast', async ({ request }) => {
  const response = await request.post('/api/contact', {
    headers: ORIGIN,
    form: {
      name: 'Bot', email: 'bot@example.com', phone: '', town: 'Beacon',
      service: 'garden-design', message: 'A perfectly plausible looking message body.',
      company: '', startedAt: String(Date.now()),
    },
  });
  expect(response.status()).toBe(422);
});

test('a valid submission is accepted at the endpoint', async ({ request }) => {
  const response = await request.post('/api/contact', {
    headers: ORIGIN,
    form: {
      name: 'Dana Reyes', email: 'dana@example.com', phone: '', town: 'Beacon',
      service: 'patios-stonework', message: 'Our side yard erodes every spring and we want a terrace.',
      company: '', startedAt: String(Date.now() - 10_000),
    },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});

test('a cross-site POST is refused before the handler runs', async ({ request }) => {
  const response = await request.post('/api/contact', {
    headers: { accept: 'application/json', origin: 'https://evil.example.com' },
    form: {
      name: 'Dana Reyes', email: 'dana@example.com', phone: '', town: 'Beacon',
      service: 'patios-stonework', message: 'Our side yard erodes every spring and we want a terrace.',
      company: '', startedAt: String(Date.now() - 10_000),
    },
  });
  expect(response.status()).toBe(403);
});

test('the form posts natively without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/contact');
  await expect(page.locator('form#contact-form')).toHaveAttribute('action', '/api/contact');
  await expect(page.locator('form#contact-form')).toHaveAttribute('method', /post/i);
  await context.close();
});
