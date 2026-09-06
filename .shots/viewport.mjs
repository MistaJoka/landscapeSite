import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });

const spots = [
  ['offering', '[aria-label="What I do"]', 0],
  ['wipe-start', '[aria-label="Before and after"]', 900],
  ['wipe-mid', '[aria-label="Before and after"]', 1600],
  ['process', '[aria-label="How it works"]', 0],
  ['work', '[aria-label="Selected work"]', 0],
];

for (const [name, sel, extra] of spots) {
  await page.evaluate(([s, e]) => {
    document.documentElement.style.scrollBehavior = 'auto';
    const el = document.querySelector(s);
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + e);
  }, [sel, extra]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `.shots/${name}.png` });
  const vis = await page.evaluate(() => {
    const r = [...document.querySelectorAll('.reveal')];
    const inView = r.filter((el) => {
      const b = el.getBoundingClientRect();
      return b.top < window.innerHeight && b.bottom > 0;
    });
    return {
      revealsInView: inView.length,
      opacities: inView.map((el) => getComputedStyle(el).opacity),
    };
  });
  console.log(name, JSON.stringify(vis));
}
await browser.close();
