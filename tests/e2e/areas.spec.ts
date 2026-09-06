import { expect, test } from '@playwright/test';

const AREAS = [
  ['beacon', 'Beacon'],
  ['cold-spring', 'Cold Spring'],
  ['rhinebeck', 'Rhinebeck'],
  ['new-paltz', 'New Paltz'],
  ['kingston', 'Kingston'],
  ['hudson', 'Hudson'],
] as const;

for (const [slug, town] of AREAS) {
  test(`/areas/${slug} renders its town, local note, and neighborhoods`, async ({ page }) => {
    await page.goto(`/areas/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(town);

    const note = page.getByRole('region', { name: /local conditions/i });
    await expect(note).toBeVisible();
    expect((await note.innerText()).length).toBeGreaterThan(200);

    await expect(page.getByRole('region', { name: /neighborhoods/i }).getByRole('listitem')).not.toHaveCount(0);
    await expect(page.getByRole('region', { name: /featured project/i }).getByRole('link')).toHaveCount(1);
    await expect(page.locator('blockquote')).toBeVisible();
  });
}

test('no two area pages share their local-conditions prose', async ({ page }) => {
  const notes: string[] = [];
  for (const [slug] of AREAS) {
    await page.goto(`/areas/${slug}`);
    notes.push((await page.getByRole('region', { name: /local conditions/i }).innerText()).trim());
  }
  expect(new Set(notes).size).toBe(AREAS.length);
});

test('area pages are reachable from the footer', async ({ page }) => {
  await page.goto('/');
  for (const [slug] of AREAS) {
    await expect(page.locator(`footer a[href="/areas/${slug}"]`)).toHaveCount(1);
  }
});
