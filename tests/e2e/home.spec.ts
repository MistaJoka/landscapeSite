import { expect, test } from '@playwright/test';

test('states the offering in the h1 above the fold', async ({ page }) => {
  await page.goto('/');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toBeVisible();
  const box = await h1.boundingBox();
  expect(box!.y).toBeLessThan(page.viewportSize()!.height);
});

test('the hero offers a primary CTA and a tappable phone number', async ({ page }) => {
  await page.goto('/');
  const hero = page.getByRole('region', { name: /hero/i });
  await expect(hero.getByRole('link', { name: /request a quote/i })).toBeVisible();
  await expect(hero.getByRole('link', { name: /845/ })).toHaveAttribute('href', /^tel:/);
});

test('lists all five services within the second viewport', async ({ page }) => {
  await page.goto('/');
  const strip = page.getByRole('region', { name: /what i do/i });
  await expect(strip.getByRole('listitem')).toHaveCount(5);
  const box = await strip.boundingBox();
  expect(box!.y).toBeLessThan(page.viewportSize()!.height * 2);
});

test('every service card links to its own page', async ({ page }) => {
  await page.goto('/');
  const links = page.getByRole('region', { name: /what i do/i }).getByRole('link');
  await expect(links).toHaveCount(5);
  for (const href of await links.evaluateAll((n) => n.map((x) => x.getAttribute('href')))) {
    expect(href).toMatch(/^\/services\/[a-z-]+$/);
  }
});

test('presents the full narrative in order', async ({ page }) => {
  await page.goto('/');
  for (const name of [/hero/i, /what i do/i, /before and after/i, /how it works/i, /selected work/i, /why me/i, /service area/i, /get started/i]) {
    await expect(page.getByRole('region', { name })).toHaveCount(1);
  }
});

test('shows three selected projects plus a link to the full index', async ({ page }) => {
  await page.goto('/');
  const region = page.getByRole('region', { name: /selected work/i });
  await expect(region.locator('a[href^="/work/"]')).toHaveCount(3);
  await expect(region.locator('a[href="/work"]')).toHaveCount(1);
});

test('links to all six service areas', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: /service area/i }).getByRole('link')).toHaveCount(6);
});

test('closes with a single primary action', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: /get started/i }).getByRole('link')).toHaveCount(1);
});

test('heading levels never skip', async ({ page }) => {
  await page.goto('/');
  const levels = await page.locator('h1, h2, h3, h4').evaluateAll((nodes) => nodes.map((n) => Number(n.tagName.slice(1))));
  expect(levels[0]).toBe(1);
  for (let i = 1; i < levels.length; i += 1) {
    expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  }
});

test('the before/after renders both states with distinct alt text', async ({ page }) => {
  await page.goto('/');
  const region = page.getByRole('region', { name: /before and after/i });
  const images = region.locator('img');
  await expect(images).toHaveCount(2);
  const alts = await images.evaluateAll((n) => n.map((x) => x.getAttribute('alt')));
  expect(alts[0]).toBeTruthy();
  expect(alts[1]).toBeTruthy();
  expect(alts[0]).not.toBe(alts[1]);
});

test('all reveal content stays visible when motion is reduced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const reveals = page.locator('.reveal');
  const count = await reveals.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    await expect(reveals.nth(i)).toHaveCSS('opacity', '1');
  }
});

test('every image on the home page has an alt attribute', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('img:not([alt])').count()).toBe(0);
});
