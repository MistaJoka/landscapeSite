import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';

for (const route of ROUTES) {
  test(`${route} has no accessibility violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    // Let webfonts settle before scanning. Under full-suite parallel load axe
    // could otherwise measure contrast against a half-painted page — a state no
    // user sees, and a false failure. Bounded, because a font that never
    // resolves must not hang the test. Images are covered by `networkidle`;
    // do not wait on `img.complete`, as lazy images below the fold never load.
    await page.evaluate(
      () => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]).then(() => undefined),
    );

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`),
      route,
    ).toEqual([]);
  });
}
