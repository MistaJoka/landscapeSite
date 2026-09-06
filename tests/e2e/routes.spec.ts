import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';

test('the manifest covers every expected page', () => {
  expect(ROUTES).toHaveLength(23);
});

for (const route of ROUTES) {
  test(`${route} responds and renders a single h1`, async ({ page }) => {
    const response = await page.goto(route);
    // `/404` is a real page at that path, so requesting it directly is a 200.
    // Only an UNMATCHED url yields a 404 — asserted in navigation.spec.ts.
    const expected = route === '/404' ? [200, 404] : [200];
    expect(expected, `${route} -> ${response?.status()}`).toContain(response?.status());
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test(`${route} declares a description and canonical`, async ({ page }) => {
    await page.goto(route);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description, route).toBeTruthy();
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });
}

test('robots.txt points at the sitemap and blocks the API', async ({ request }) => {
  const body = await (await request.get('/robots.txt')).text();
  expect(body).toContain('Sitemap: https://stonecroplandscape.com/sitemap-index.xml');
  expect(body).toContain('Disallow: /api/');
});
