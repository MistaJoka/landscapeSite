import { chromium } from 'playwright';

const targets = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

for (const spec of targets) {
  const [route, name] = spec.split('=');
  await page.goto(`http://localhost:4321${route}`, { waitUntil: 'networkidle' });
  // Settle scroll-driven reveals: walk the page so every view() animation resolves.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  });
  await page.screenshot({ path: `.shots/${name}.png`, fullPage: true });
  const h = await page.evaluate(() => document.body.scrollHeight);
  console.log(`${name}: ${route} captured (${h}px tall)`);
}
await browser.close();
