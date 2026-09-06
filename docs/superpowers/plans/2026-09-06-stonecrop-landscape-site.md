# Stonecrop Landscape Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 23-page marketing website for a solo landscape operator that presents the business offering within the first two viewports, reads as high-design rather than templated, and generates its service and service-area pages from validated content files.

**Architecture:** Astro 7 static site with Tailwind 4. Services, areas, projects, and testimonials are Astro Content Collections validated by Zod; two dynamic route files generate all eleven sub-pages at build time. Motion is native CSS (View Transitions API for page changes, scroll-driven animations for reveals) so the site ships almost no JavaScript. A single on-demand route handles contact form submission.

**Tech Stack:** Astro 7, Tailwind CSS 4 (`@tailwindcss/vite`), TypeScript strict, Zod (via `astro:content`), Vitest + Astro Container API, Playwright + `@axe-core/playwright`, Lighthouse CI, `@astrojs/netlify`, `@fontsource`.

**Spec:** `docs/superpowers/specs/2026-09-06-stonecrop-landscape-design.md`

## Global Constraints

- **Node:** 22.12 or newer (Astro 7 declares `engines.node >=22.12.0`). **Package manager:** npm.
- **TypeScript:** `strict: true`. No `any` in committed code.
- **Brand strings are data.** The business name, phone number, and email may appear only in `site.config.ts` and `src/content/**`. Never in a component. Task 2 adds a test enforcing this.
- **One accent color.** `--moss` is the only accent. Do not introduce a second.
- **Exactly one `<h1>` per page.** No heading-level skips.
- **Every image needs meaningful `alt` text.** Decorative images use `alt=""`.
- **`prefers-reduced-motion: reduce` must leave all content visible and legible.** Never hide content behind an animation that will not run.
- **Contrast:** body text ≥ 4.5:1 against its background; primary text ≥ 7:1.
- **Colors are referenced as CSS custom properties**, never as raw hex, outside `src/styles/tokens.css`.
- **Commit after every task.** Conventional-commit prefixes (`feat:`, `test:`, `chore:`, `fix:`).

## File Structure

| Path | Responsibility |
|---|---|
| `site.config.ts` | Single source of truth for brand, NAP, nav, default SEO |
| `astro.config.mjs` | Integrations, adapter, Vite plugins, site URL |
| `src/lib/schemas.ts` | Zod schemas (plain module, importable from Vitest) |
| `src/content.config.ts` | Collection definitions wiring loaders to schemas |
| `src/content/services/*.md` | 5 service entries |
| `src/content/areas/*.md` | 6 service-area entries |
| `src/content/projects/*.md` | 6 project entries |
| `src/content/testimonials/*.md` | 4 testimonial entries |
| `src/styles/tokens.css` | Design tokens as custom properties |
| `src/styles/global.css` | Tailwind entry, font faces, base, reveal/motion primitives |
| `src/components/primitives/*` | Button, Container, Section, Eyebrow, Heading |
| `src/components/layout/*` | Header, Nav, MobileMenu, Footer, SkipLink |
| `src/components/sections/*` | One file per home-page section |
| `src/components/seo/*` | Meta, JsonLd |
| `src/layouts/BaseLayout.astro` | html/head/body shell, nav, footer, router |
| `src/layouts/PageLayout.astro` | Interior page frame (header block + slot) |
| `src/lib/seo.ts` | Canonical and Open Graph URL construction |
| `src/lib/schema.ts` | JSON-LD builders |
| `src/lib/motion.ts` | IntersectionObserver fallback for scroll reveals |
| `src/pages/**` | Routes |
| `tests/unit/**` | Vitest |
| `tests/e2e/**` | Playwright |

Section components receive typed props and render. They do not call `getCollection` and do not know about routing — pages fetch content and pass it down. This keeps every section unit-renderable in Vitest.

---

### Task 1: Project scaffold and test harness

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `src/pages/index.astro`, `src/styles/global.css`
- Test: `tests/unit/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: working `npm run build`, `npm run test:unit`, `npm run test:e2e` commands that every later task depends on.

- [ ] **Step 1: Scaffold the Astro project into the current directory**

```bash
npm create astro@latest . -- --template minimal --no-install --no-git --skip-houston --typescript strict
```

Answer "yes" to continuing in a non-empty directory. It preserves `docs/` but
**overwrites `.gitignore`**. After it finishes, re-append the entries it drops:

```bash
printf '\n.env\n.env.*\n!.env.example\ntest-results/\nplaywright-report/\n.lighthouseci/\n' >> .gitignore
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install tailwindcss @tailwindcss/vite @astrojs/sitemap @astrojs/netlify
npm install -D vitest @vitest/ui jsdom @playwright/test @axe-core/playwright @lhci/cli
npm install @fontsource-variable/inter @fontsource/instrument-serif
npx playwright install --with-deps chromium
```

- [ ] **Step 3: Configure Astro**

Replace `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://stonecroplandscape.com',
  output: 'static',
  adapter: netlify(),
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
```

Astro 5 prerenders every page under `output: 'static'`. The adapter exists only so the one contact endpoint in Task 18 can opt out with `prerender = false`.

- [ ] **Step 4: Create the Tailwind entry stylesheet**

Create `src/styles/global.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 5: Add npm scripts**

Merge into `package.json` `"scripts"`:

```json
{
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "test:unit": "vitest run",
  "test:e2e": "playwright test",
  "test": "npm run test:unit && npm run build && npm run test:e2e"
}
```

- [ ] **Step 6: Configure Vitest with Astro's Vite config**

Create `vitest.config.ts`:

```ts
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
```

`getViteConfig` is what makes `.astro` components importable inside Vitest. Without it, the Container API tests in Task 6 cannot resolve.

- [ ] **Step 7: Configure Playwright**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 8: Write the failing smoke test**

Create `tests/unit/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('project scaffold', () => {
  it('targets the production domain', async () => {
    const config = readFileSync('astro.config.mjs', 'utf-8');
    expect(config).toContain("site: 'https://stonecroplandscape.com'");
  });

  it('exposes the required npm scripts', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    for (const script of ['dev', 'build', 'test:unit', 'test:e2e']) {
      expect(pkg.scripts).toHaveProperty(script);
    }
  });
});
```

- [ ] **Step 9: Run the unit tests**

Run: `npm run test:unit`
Expected: PASS, 2 tests. If `site:` fails, Step 3 was not applied.

- [ ] **Step 10: Replace the placeholder home page**

Create `src/pages/index.astro`:

```astro
---
import '../styles/global.css';
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stonecrop Landscape Co.</title>
  </head>
  <body>
    <h1>Stonecrop Landscape Co.</h1>
  </body>
</html>
```

- [ ] **Step 11: Verify the build**

Run: `npm run build`
Expected: build completes, `dist/index.html` exists.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro project with Vitest and Playwright harness"
```

---

### Task 2: Site configuration and the brand-leak guard

**Files:**
- Create: `site.config.ts`
- Test: `tests/unit/site-config.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `siteConfig` — the default export of `site.config.ts`, typed as `SiteConfig`. Every later task reads brand data from it. Key fields: `siteConfig.business.name`, `.phone`, `.phoneHref`, `.email`, `.address.{street,city,region,postalCode,country}`, `.geo.{latitude,longitude}`, `.hours[]`, `.nav[]` (`{label, href}`), `.social[]`, `.seo.{defaultTitle,titleTemplate,defaultDescription,ogImage}`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/site-config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import siteConfig from '../../site.config';

describe('siteConfig', () => {
  it('carries complete NAP data for LocalBusiness structured data', () => {
    expect(siteConfig.business.name).toBe('Stonecrop Landscape Co.');
    expect(siteConfig.business.phone).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
    expect(siteConfig.business.phoneHref).toMatch(/^tel:\+1\d{10}$/);
    expect(siteConfig.business.email).toContain('@');
    const { street, city, region, postalCode, country } = siteConfig.business.address;
    for (const part of [street, city, region, postalCode, country]) {
      expect(part.length).toBeGreaterThan(0);
    }
  });

  it('defines navigation without the service-area pages', () => {
    const hrefs = siteConfig.nav.map((item) => item.href);
    expect(hrefs).toEqual(['/services', '/work', '/about', '/contact']);
    expect(hrefs.some((h) => h.startsWith('/areas'))).toBe(false);
  });

  it('provides a title template containing a placeholder', () => {
    expect(siteConfig.seo.titleTemplate).toContain('%s');
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('brand strings stay in configuration', () => {
  it('does not hardcode the business name or phone in components or layouts', () => {
    const roots = ['src/components', 'src/layouts'].filter((d) => {
      try { return statSync(d).isDirectory(); } catch { return false; }
    });
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of walk(root)) {
        const source = readFileSync(file, 'utf-8');
        if (source.includes(siteConfig.business.name) || source.includes(siteConfig.business.phone)) {
          offenders.push(file);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/site-config.test.ts`
Expected: FAIL — cannot resolve `site.config`.

- [ ] **Step 3: Write the configuration**

Create `site.config.ts`:

```ts
export interface NavItem { label: string; href: string; }
export interface SiteConfig {
  business: {
    name: string;
    legalName: string;
    operator: string;
    tagline: string;
    phone: string;
    phoneHref: string;
    email: string;
    address: { street: string; city: string; region: string; postalCode: string; country: string };
    geo: { latitude: number; longitude: number };
    hours: string[];
    foundedYear: number;
    credentials: string[];
  };
  nav: NavItem[];
  social: { label: string; href: string }[];
  seo: { defaultTitle: string; titleTemplate: string; defaultDescription: string; ogImage: string };
}

const siteConfig: SiteConfig = {
  business: {
    name: 'Stonecrop Landscape Co.',
    legalName: 'Stonecrop Landscape Co.',
    operator: 'Ellis Vance',
    tagline: 'Gardens, stonework, and grounds care for the Hudson Valley.',
    phone: '(845) 555-0142',
    phoneHref: 'tel:+18455550142',
    email: 'hello@stonecroplandscape.com',
    address: {
      street: '12 Tioronda Avenue',
      city: 'Beacon',
      region: 'NY',
      postalCode: '12508',
      country: 'US',
    },
    geo: { latitude: 41.5048, longitude: -73.9696 },
    hours: ['Mon-Fri 7:00-17:00', 'Sat 8:00-13:00', 'Sun closed'],
    foundedYear: 2014,
    credentials: ['Licensed & insured', 'NY Certified Nursery Professional', 'Solo operator — one person on every job'],
  },
  nav: [
    { label: 'Services', href: '/services' },
    { label: 'Work', href: '/work' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
  social: [{ label: 'Instagram', href: 'https://instagram.com/stonecroplandscape' }],
  seo: {
    defaultTitle: 'Stonecrop Landscape Co. — Hudson Valley garden design & stonework',
    titleTemplate: '%s | Stonecrop Landscape Co.',
    defaultDescription:
      'Ellis Vance designs, builds, and maintains gardens, patios, and grounds across the Hudson Valley. One person on every job, start to finish.',
    ogImage: '/og/default.jpg',
  },
};

export default siteConfig;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/site-config.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add site.config.ts tests/unit/site-config.test.ts
git commit -m "feat: add site configuration as the single source of brand data"
```

---

### Task 3: Design tokens and typography

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/styles/global.css`
- Test: `tests/unit/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties `--ink`, `--ink-muted`, `--paper`, `--paper-raised`, `--moss`, `--moss-deep`, `--stone`, and font families `--font-display`, `--font-body`. Every component references these; no component writes a hex value.

- [ ] **Step 1: Write the failing contrast test**

Create `tests/unit/tokens.test.ts`. This computes real WCAG contrast ratios from the token file, so a future palette edit that breaks accessibility fails the build rather than shipping.

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/tokens.test.ts`
Expected: FAIL — `src/styles/tokens.css` does not exist.

- [ ] **Step 3: Write the tokens**

Create `src/styles/tokens.css`:

```css
:root {
  --ink: #16181A;
  --ink-muted: #5C6169;
  --paper: #FAF9F6;
  --paper-raised: #FFFFFF;
  --moss: #3F5641;
  --moss-deep: #2C3D2E;
  --stone: #D6D1C7;

  --font-display: 'Instrument Serif', Georgia, 'Times New Roman', serif;
  --font-body: 'Inter Variable', 'Inter', system-ui, -apple-system, sans-serif;

  --measure: 68ch;
  --container: 80rem;
  --container-text: 42.5rem;

  --step--1: clamp(0.83rem, 0.79rem + 0.20vw, 0.94rem);
  --step-0:  clamp(1.00rem, 0.94rem + 0.30vw, 1.19rem);
  --step-1:  clamp(1.20rem, 1.10rem + 0.50vw, 1.50rem);
  --step-2:  clamp(1.44rem, 1.28rem + 0.80vw, 1.89rem);
  --step-3:  clamp(1.73rem, 1.48rem + 1.25vw, 2.38rem);
  --step-4:  clamp(2.07rem, 1.70rem + 1.87vw, 3.00rem);
  --step-5:  clamp(2.49rem, 1.94rem + 2.75vw, 3.78rem);
  --step-6:  clamp(2.99rem, 2.19rem + 3.98vw, 4.77rem);

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 180ms;
  --dur-base: 420ms;
  --dur-slow: 720ms;
}
```

The type scale uses `clamp()`, so there are no typography breakpoints anywhere in the codebase — size is a continuous function of viewport width.

- [ ] **Step 4: Wire tokens and fonts into the global stylesheet**

Replace `src/styles/global.css`:

```css
@import "tailwindcss";
@import "@fontsource/instrument-serif/400.css";
@import "@fontsource-variable/inter";
@import "./tokens.css";

@theme inline {
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-paper: var(--paper);
  --color-paper-raised: var(--paper-raised);
  --color-moss: var(--moss);
  --color-moss-deep: var(--moss-deep);
  --color-stone: var(--stone);
  --font-display: var(--font-display);
  --font-body: var(--font-body);
}

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

body {
  background-color: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: var(--step-0);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

p { text-wrap: pretty; }

:focus-visible {
  outline: 2px solid var(--moss);
  outline-offset: 3px;
  border-radius: 2px;
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

`@theme inline` is how Tailwind 4 adopts existing custom properties, which is what lets you write `text-ink` and `bg-paper` while the tokens file stays the single source of truth.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/unit/tokens.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Verify the build still succeeds**

Run: `npm run build`
Expected: success. A failure here means a font package path is wrong.

- [ ] **Step 7: Commit**

```bash
git add src/styles tests/unit/tokens.test.ts
git commit -m "feat: add design tokens with enforced WCAG contrast"
```

---

### Task 4: Content collection schemas

**Files:**
- Create: `src/lib/schemas.ts`, `src/content.config.ts`
- Test: `tests/unit/content-schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: exported Zod schemas `serviceSchema`, `areaSchema`, `projectSchema`, `testimonialSchema` from `src/lib/schemas.ts`, and the `collections` export Astro requires from `src/content.config.ts`. Later tasks call `getCollection('services' | 'areas' | 'projects' | 'testimonials')`.

The schemas live in a plain module importing `z` from `astro/zod`, not in
`content.config.ts` itself. `content.config.ts` must import from the
`astro:content` virtual module, which only exists inside an Astro build — putting
the schemas there would make them unimportable from Vitest.

- [ ] **Step 1: Write the failing schema test**

Create `tests/unit/content-schema.test.ts`. The interesting assertions are the rejections — they are what make thin SEO pages impossible to ship.

```ts
import { describe, expect, it } from 'vitest';
import { areaSchema, projectSchema, serviceSchema, testimonialSchema } from '../../src/lib/schemas';

const validArea = {
  town: 'Beacon',
  state: 'NY',
  order: 1,
  headline: 'Landscaping in Beacon, NY',
  summary: 'Garden design, stonework, and grounds care for Beacon homes.',
  localNote:
    'Beacon sits on a steep east-facing grade below Mount Beacon, which means most properties here shed water fast and dry out at the top of the slope while pooling at the foundation. Older homes in the historic district also sit on shallow bedrock, so planting beds usually need building up rather than digging down, and terracing does more good than drainage pipe.',
  neighborhoods: ['Historic District', 'Fishkill Landing', 'Mount Beacon'],
  featuredProjectSlug: 'tioronda-terrace',
  localTestimonial: { quote: 'Ellis re-graded our whole side yard.', attribution: 'Dana R.', town: 'Beacon' },
  services: ['garden-design', 'patios-stonework'],
};

describe('areaSchema', () => {
  it('accepts a fully specified area', () => {
    expect(() => areaSchema.parse(validArea)).not.toThrow();
  });

  it('rejects a localNote shorter than 200 characters', () => {
    expect(() => areaSchema.parse({ ...validArea, localNote: 'We serve Beacon.' })).toThrow();
  });

  it('rejects fewer than three neighborhoods', () => {
    expect(() => areaSchema.parse({ ...validArea, neighborhoods: ['Historic District'] })).toThrow();
  });

  it('rejects a missing featured project reference', () => {
    const { featuredProjectSlug, ...withoutProject } = validArea;
    expect(() => areaSchema.parse(withoutProject)).toThrow();
  });

  it('rejects a missing local testimonial', () => {
    const { localTestimonial, ...withoutTestimonial } = validArea;
    expect(() => areaSchema.parse(withoutTestimonial)).toThrow();
  });
});

describe('serviceSchema', () => {
  const validService = {
    title: 'Garden Design & Planting',
    order: 1,
    summary: 'Planting plans that look intentional in every season.',
    heroImage: '/images/services/garden-design.jpg',
    heroAlt: 'A layered perennial border in late summer.',
    startingPrice: 'from $2,400',
    steps: [
      { title: 'Site walk', body: 'We walk the property together and talk through light, soil, and how you use the space.' },
      { title: 'Planting plan', body: 'You get a drawn plan with a named plant list and a phased budget.' },
      { title: 'Installation', body: 'I plant it myself, then check back through the first season.' },
    ],
    faqs: [{ question: 'How long until it fills in?', answer: 'Most borders read as intentional in year one and closed in by year three.' }],
  };

  it('accepts a fully specified service', () => {
    expect(() => serviceSchema.parse(validService)).not.toThrow();
  });

  it('requires at least three process steps', () => {
    expect(() => serviceSchema.parse({ ...validService, steps: validService.steps.slice(0, 2) })).toThrow();
  });

  it('requires alt text on the hero image', () => {
    expect(() => serviceSchema.parse({ ...validService, heroAlt: '' })).toThrow();
  });
});

describe('projectSchema', () => {
  const validProject = {
    title: 'Tioronda Terrace',
    order: 1,
    town: 'Beacon',
    year: 2025,
    service: 'patios-stonework',
    summary: 'A bluestone terrace cut into a steep side yard.',
    beforeImage: '/images/work/tioronda-before.jpg',
    beforeAlt: 'A steep eroding side yard before work.',
    afterImage: '/images/work/tioronda-after.jpg',
    afterAlt: 'The same yard as a level bluestone terrace.',
    scope: ['Excavation and re-grading', 'Dry-laid bluestone terrace', 'Native shade planting'],
  };

  it('accepts a fully specified project', () => {
    expect(() => projectSchema.parse(validProject)).not.toThrow();
  });

  it('requires both before and after alt text', () => {
    expect(() => projectSchema.parse({ ...validProject, afterAlt: '' })).toThrow();
  });
});

describe('testimonialSchema', () => {
  it('requires quote, attribution, and town', () => {
    expect(() => testimonialSchema.parse({ quote: 'Excellent.', attribution: 'M. Choi', town: 'Rhinebeck', order: 1 })).not.toThrow();
    expect(() => testimonialSchema.parse({ quote: 'Excellent.', attribution: 'M. Choi', order: 1 })).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/content-schema.test.ts`
Expected: FAIL — cannot resolve `src/lib/schemas`.

- [ ] **Step 3: Write the schemas**

Create `src/lib/schemas.ts`:

```ts
import { z } from 'astro/zod';

export const serviceSchema = z.object({
  title: z.string().min(1),
  order: z.number().int(),
  summary: z.string().min(20),
  heroImage: z.string().min(1),
  heroAlt: z.string().min(1),
  startingPrice: z.string().min(1),
  steps: z.array(z.object({ title: z.string().min(1), body: z.string().min(20) })).min(3),
  faqs: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).min(1),
});

export const areaSchema = z.object({
  town: z.string().min(1),
  state: z.string().length(2),
  order: z.number().int(),
  headline: z.string().min(1),
  summary: z.string().min(20),
  localNote: z.string().min(200),
  neighborhoods: z.array(z.string().min(1)).min(3),
  featuredProjectSlug: z.string().min(1),
  localTestimonial: z.object({
    quote: z.string().min(1),
    attribution: z.string().min(1),
    town: z.string().min(1),
  }),
  services: z.array(z.string().min(1)).min(1),
});

export const projectSchema = z.object({
  title: z.string().min(1),
  order: z.number().int(),
  town: z.string().min(1),
  year: z.number().int(),
  service: z.string().min(1),
  summary: z.string().min(20),
  beforeImage: z.string().min(1),
  beforeAlt: z.string().min(1),
  afterImage: z.string().min(1),
  afterAlt: z.string().min(1),
  scope: z.array(z.string().min(1)).min(2),
});

export const testimonialSchema = z.object({
  quote: z.string().min(1),
  attribution: z.string().min(1),
  town: z.string().min(1),
  order: z.number().int(),
});
```

`localNote: z.string().min(200)` is the load-bearing line in this file. It is what
makes a generic service-area page fail the build instead of quietly damaging
search rankings.

- [ ] **Step 4: Wire the schemas into collections**

Create `src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { areaSchema, projectSchema, serviceSchema, testimonialSchema } from './lib/schemas';

export const collections = {
  services: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
    schema: serviceSchema,
  }),
  areas: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/areas' }),
    schema: areaSchema,
  }),
  projects: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
    schema: projectSchema,
  }),
  testimonials: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/testimonials' }),
    schema: testimonialSchema,
  }),
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/unit/content-schema.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/schemas.ts src/content.config.ts tests/unit/content-schema.test.ts
git commit -m "feat: add content schemas that reject thin area pages at build time"
```

---

### Task 5: Author the content

**Files:**
- Create: `src/content/services/*.md` (5), `src/content/areas/*.md` (6), `src/content/projects/*.md` (6), `src/content/testimonials/*.md` (4)
- Test: `tests/unit/content-integrity.test.ts`

**Interfaces:**
- Consumes: schemas from Task 4.
- Produces: collection entry IDs that routes depend on. Services: `garden-design`, `patios-stonework`, `lawn-grounds-care`, `irrigation-drainage`, `seasonal-cleanup`. Areas: `beacon`, `cold-spring`, `rhinebeck`, `new-paltz`, `kingston`, `hudson`. Projects: `tioronda-terrace`, `chestnut-ridge-garden`, `rhinebeck-farmhouse-grounds`, `wallkill-drainage`, `kingston-stoop-steps`, `hudson-courtyard`.

- [ ] **Step 1: Write the failing integrity test**

Create `tests/unit/content-integrity.test.ts`. This checks the things a schema cannot: cross-collection references, and that no two area pages share prose.

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

function frontmatter(path: string): Record<string, unknown> {
  const raw = readFileSync(path, 'utf-8');
  const block = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!block) throw new Error(`no frontmatter in ${path}`);
  const out: Record<string, unknown> = {};
  for (const line of block[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const ids = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));

describe('content inventory', () => {
  it('has the expected number of entries in each collection', () => {
    expect(ids('src/content/services')).toHaveLength(5);
    expect(ids('src/content/areas')).toHaveLength(6);
    expect(ids('src/content/projects')).toHaveLength(6);
    expect(ids('src/content/testimonials')).toHaveLength(4);
  });
});

describe('cross-collection references resolve', () => {
  const projectIds = ids('src/content/projects');
  const serviceIds = ids('src/content/services');

  it('every area featuredProjectSlug points at a real project', () => {
    for (const area of ids('src/content/areas')) {
      const fm = frontmatter(`src/content/areas/${area}.md`);
      expect(projectIds, `area "${area}"`).toContain(fm.featuredProjectSlug);
    }
  });

  it('every project service points at a real service', () => {
    for (const project of projectIds) {
      const fm = frontmatter(`src/content/projects/${project}.md`);
      expect(serviceIds, `project "${project}"`).toContain(fm.service);
    }
  });
});

describe('area pages are not templated duplicates', () => {
  it('gives every area a distinct localNote of real length', () => {
    const notes = ids('src/content/areas').map((a) => {
      const raw = readFileSync(`src/content/areas/${a}.md`, 'utf-8');
      const m = raw.match(/localNote: >-\n([\s\S]*?)\n\w+:/);
      if (!m) throw new Error(`no localNote in ${a}`);
      return m[1].replace(/\s+/g, ' ').trim();
    });
    for (const note of notes) expect(note.length).toBeGreaterThanOrEqual(200);
    expect(new Set(notes).size).toBe(notes.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/content-integrity.test.ts`
Expected: FAIL — content directories do not exist.

- [ ] **Step 3: Write the five service entries**

```bash
mkdir -p src/content/services
cat > src/content/services/garden-design.md <<'EOF'
---
title: Garden Design & Planting
order: 1
summary: Planting plans that look deliberate in every season, not just in June.
heroImage: /images/services/garden-design.jpg
heroAlt: A layered perennial border in late summer light.
startingPrice: from $2,400
steps:
  - title: Site walk
    body: We walk the property together and talk through light, drainage, soil, deer pressure, and how you actually use the space.
  - title: Planting plan
    body: You get a drawn plan with a named plant list, spacing, and a phased budget so the work can happen in stages.
  - title: Installation
    body: I plant it myself, mulch it in, and check back through the first full season to replace anything that sulks.
faqs:
  - question: How long until it fills in?
    answer: Most borders read as intentional in year one and closed in by year three. The plan accounts for that gap so it never looks bare.
  - question: Do you work with existing plantings?
    answer: Often. Mature shrubs and trees are the most valuable thing on a property. I would rather edit around them than start over.
---

Planting is the part of a landscape that changes. A good plan accounts for that
instead of fighting it.
EOF
cat > src/content/services/patios-stonework.md <<'EOF'
---
title: Patios & Stonework
order: 2
summary: Dry-laid bluestone, fieldstone walls, and steps built to sit still through frost.
heroImage: /images/services/patios-stonework.jpg
heroAlt: A dry-laid bluestone terrace with moss between the joints.
startingPrice: from $9,000
steps:
  - title: Grade and layout
    body: We stake the footprint on site so you can stand in it before anything is dug. Grade and runoff get settled here.
  - title: Base and drainage
    body: Excavation to frost depth, compacted base, and a drainage path. This invisible layer is what keeps the surface flat for decades.
  - title: Setting stone
    body: Stone is cut and set by hand, one person, start to finish. Joints get swept and the edges get planted.
faqs:
  - question: Why dry-laid instead of mortared?
    answer: Dry-laid work moves with frost instead of cracking against it. In this climate it outlasts mortar and can be repaired a stone at a time.
  - question: How long does a terrace take?
    answer: A typical 300-square-foot terrace is three to four weeks, weather depending.
---

Stone is the part of a landscape that does not change. It is worth getting the
base right.
EOF
cat > src/content/services/lawn-grounds-care.md <<'EOF'
---
title: Lawn & Grounds Care
order: 3
summary: Season-long maintenance for a small number of properties, done properly.
heroImage: /images/services/lawn-grounds-care.jpg
heroAlt: A mown lawn edge meeting a deep planted border.
startingPrice: from $220 per visit
steps:
  - title: Walk and baseline
    body: We assess turf health, bed edges, pruning needs, and what the property actually requires versus what it has been getting.
  - title: Season schedule
    body: You get a written calendar of visits for the year, with what happens on each one and what it costs.
  - title: Recurring visits
    body: Mowing, edging, bed maintenance, pruning at the right time of year, and a written note after each visit.
faqs:
  - question: How many properties do you maintain?
    answer: Twelve. That cap is the whole point. It is what makes it possible to prune on the plant's schedule rather than the route's.
  - question: Do you use chemical treatments?
    answer: Rarely, and never on a blanket schedule. Most turf problems here are drainage or compaction problems wearing a disguise.
---

Maintenance is where a landscape is either kept or quietly lost.
EOF
cat > src/content/services/irrigation-drainage.md <<'EOF'
---
title: Irrigation & Drainage
order: 4
summary: Moving water away from the house and toward the plants that want it.
heroImage: /images/services/irrigation-drainage.jpg
heroAlt: A stone-lined dry creek bed carrying runoff away from a foundation.
startingPrice: from $3,200
steps:
  - title: Watch it rain
    body: Where possible I look at the property during or right after a storm. Guessing at water is how drainage work goes wrong.
  - title: Grade correction first
    body: Most water problems are grade problems. Regrading is cheaper and lasts longer than pipe, so it gets tried first.
  - title: Build the path
    body: Dry creek beds, French drains, or drip irrigation zones, sized to the roof area and soil that actually feed them.
faqs:
  - question: Will a French drain fix my wet basement?
    answer: Sometimes. Often the fix is regrading the first ten feet around the foundation, which costs a fraction as much.
  - question: Do you install lawn sprinklers?
    answer: No. I install drip for beds. Overhead turf irrigation encourages shallow roots and disease in this climate.
---

Water decides more about a landscape than any plant choice does.
EOF
cat > src/content/services/seasonal-cleanup.md <<'EOF'
---
title: Seasonal Cleanup & Winter Prep
order: 5
summary: Spring opening and fall closing, timed to the plants rather than the calendar.
heroImage: /images/services/seasonal-cleanup.jpg
heroAlt: Cut-back perennial beds edged and mulched in early spring.
startingPrice: from $600
steps:
  - title: Fall assessment
    body: We decide what gets cut back now and what stands through winter for structure, seed, and overwintering insects.
  - title: Closing
    body: Leaf management, cutbacks, tender plant protection, drainage clearing, and hardscape checked before frost.
  - title: Spring opening
    body: Cutback of what stood, bed edging, first weeding, compost topdressing, and a walk-through of winter damage.
faqs:
  - question: Should everything be cut back in fall?
    answer: No. Standing stems shelter beneficial insects and read beautifully under snow. I cut back roughly half and leave the rest.
  - question: Do you haul leaves away?
    answer: Only what has to go. Shredded leaf mulch returned to the beds is better than anything I could buy.
---

The two shoulder seasons set up everything that happens in between.
EOF
```

- [ ] **Step 4: Write the six project entries**

```bash
mkdir -p src/content/projects
write_project() {
cat > "src/content/projects/$1.md" <<EOF
---
title: $2
order: $3
town: $4
year: $5
service: $6
summary: $7
beforeImage: /images/work/$1-before.jpg
beforeAlt: $8
afterImage: /images/work/$1-after.jpg
afterAlt: $9
scope:
  - ${10}
  - ${11}
  - ${12}
---

$7
EOF
}
write_project tioronda-terrace "Tioronda Terrace" 1 Beacon 2025 patios-stonework \
  "A bluestone terrace cut into a side yard that had been eroding downhill for a decade." \
  "A steep, rutted side yard with bare soil and exposed roots." \
  "The same yard as a level dry-laid bluestone terrace with planted edges." \
  "Excavation and re-grading" "Dry-laid bluestone terrace" "Native shade planting at the margins"
write_project chestnut-ridge-garden "Chestnut Ridge Garden" 2 "Cold Spring" 2025 garden-design \
  "A deer-resistant perennial garden on a rocky ridge lot with four hours of direct sun." \
  "A patchy lawn on thin soil over bedrock, with deer-browsed shrubs." \
  "A layered garden of grasses and deer-resistant perennials in full bloom." \
  "Soil building over shallow bedrock" "Deer-resistant planting plan" "Phased three-year installation"
write_project rhinebeck-farmhouse-grounds "Rhinebeck Farmhouse Grounds" 3 Rhinebeck 2024 lawn-grounds-care \
  "Full-season grounds care for a farmhouse property with mature specimen trees." \
  "Overgrown foundation shrubs obscuring the front of a farmhouse." \
  "Restored foundation plantings with clean bed edges and open sightlines." \
  "Restorative pruning of mature shrubs" "Bed edge restoration" "Season-long maintenance schedule"
write_project wallkill-drainage "Wallkill Drainage Correction" 4 "New Paltz" 2024 irrigation-drainage \
  "Regrading and a dry creek bed for a property that flooded its walkout basement twice a year." \
  "Standing water pooled against a walkout basement door after rain." \
  "A stone-lined dry creek bed carrying runoff to a planted rain garden." \
  "Foundation regrading" "Stone-lined dry creek bed" "Rain garden with wet-tolerant natives"
write_project kingston-stoop-steps "Kingston Stoop & Steps" 5 Kingston 2024 patios-stonework \
  "Rebuilt bluestone entry steps and landing for a Rondout row house." \
  "Cracked and settled concrete steps pulling away from a brick facade." \
  "New dry-laid bluestone steps and landing matched to the brick." \
  "Removal of failed concrete" "Frost-depth base and drainage" "Reclaimed bluestone treads"
write_project hudson-courtyard "Hudson Courtyard" 6 Hudson 2023 garden-design \
  "A small walled courtyard turned into a year-round green room behind a Warren Street building." \
  "A bare gravel courtyard enclosed by brick walls." \
  "The same courtyard with espaliered fruit, ferns, and a small seating terrace." \
  "Espaliered fruit on the south wall" "Shade planting and containers" "Compact seating terrace"
```

- [ ] **Step 5: Write the four testimonial entries**

```bash
mkdir -p src/content/testimonials
write_testimonial() {
cat > "src/content/testimonials/$1.md" <<EOF
---
quote: $2
attribution: $3
town: $4
order: $5
---
EOF
}
write_testimonial dana-r "Ellis re-graded our whole side yard and built a terrace we now use more than the house. Three winters in, not one stone has moved." "Dana R." Beacon 1
write_testimonial m-choi "He talked us out of the expensive drainage system we asked for and fixed it with grading for a third of the price. That is who you want on your property." "M. Choi" "New Paltz" 2
write_testimonial the-alvarados "Same person every visit, for four years. He knows our garden better than we do at this point." "The Alvarados" Rhinebeck 3
write_testimonial j-whitfield "The planting plan came with a drawing, a plant list, and a budget broken into three years. Nobody else we called offered anything like it." "J. Whitfield" "Cold Spring" 4
```

- [ ] **Step 6: Write the six area entries**

Each `localNote` is genuinely specific to its town. This is the content that makes these pages rank instead of getting filtered as duplicates.

```bash
mkdir -p src/content/areas
cat > src/content/areas/beacon.md <<'EOF'
---
town: Beacon
state: NY
order: 1
headline: Landscaping in Beacon, NY
summary: Garden design, stonework, and grounds care for Beacon homes.
localNote: >-
  Beacon sits on a steep east-facing grade below Mount Beacon, so most
  properties here shed water fast at the top of the slope and pool it against
  the foundation at the bottom. Older homes near the historic district also sit
  on shallow bedrock, which means planting beds usually have to be built up
  rather than dug down, and terracing solves more problems than drainage pipe
  does. Deer pressure coming down off the mountain is heavier here than
  anywhere else I work.
neighborhoods:
  - Historic District
  - Fishkill Landing
  - Mount Beacon
featuredProjectSlug: tioronda-terrace
localTestimonial:
  quote: Ellis re-graded our whole side yard and built a terrace we now use more than the house.
  attribution: Dana R.
  town: Beacon
services:
  - patios-stonework
  - garden-design
  - irrigation-drainage
---
EOF
cat > src/content/areas/cold-spring.md <<'EOF'
---
town: Cold Spring
state: NY
order: 2
headline: Landscaping in Cold Spring, NY
summary: Ridge-lot gardens and stonework in Cold Spring and Nelsonville.
localNote: >-
  Cold Spring lots run narrow and long, and a great many of them are thin soil
  over bedrock with only four or five hours of direct sun between the ridge and
  the tree canopy. That combination rules out most of what garden centers push
  in spring. The work here is almost always soil building rather than soil
  amending, and plant selection weighted hard toward shade-tolerant and
  deer-resistant species. Village historic-district review also applies to
  anything visible from the street, which affects fence and wall height.
neighborhoods:
  - Village Historic District
  - Nelsonville
  - Garrison Road
featuredProjectSlug: chestnut-ridge-garden
localTestimonial:
  quote: The planting plan came with a drawing, a plant list, and a budget broken into three years.
  attribution: J. Whitfield
  town: Cold Spring
services:
  - garden-design
  - patios-stonework
  - seasonal-cleanup
---
EOF
cat > src/content/areas/rhinebeck.md <<'EOF'
---
town: Rhinebeck
state: NY
order: 3
headline: Landscaping in Rhinebeck, NY
summary: Grounds care and garden restoration for Rhinebeck properties.
localNote: >-
  Rhinebeck properties tend to be larger and flatter than the river towns to
  the south, with deep loam and mature specimen trees that were planted
  deliberately fifty or a hundred years ago. The most valuable work here is
  usually restorative rather than new: bringing overgrown foundation shrubs
  back into scale, re-establishing bed edges that have crept, and pruning old
  trees on their own schedule. Wide-open sites also mean wind exposure that
  changes which perennials will stand up without staking.
neighborhoods:
  - Village of Rhinebeck
  - Rhinecliff
  - Route 308 corridor
featuredProjectSlug: rhinebeck-farmhouse-grounds
localTestimonial:
  quote: Same person every visit, for four years. He knows our garden better than we do at this point.
  attribution: The Alvarados
  town: Rhinebeck
services:
  - lawn-grounds-care
  - seasonal-cleanup
  - garden-design
---
EOF
cat > src/content/areas/new-paltz.md <<'EOF'
---
town: New Paltz
state: NY
order: 4
headline: Landscaping in New Paltz, NY
summary: Drainage correction and planting for New Paltz and the Wallkill Valley.
localNote: >-
  The Wallkill floodplain gives New Paltz some of the best soil in the region
  and some of its worst drainage, sometimes on the same property. Heavy silt
  loam holds water long after a storm, and a lot of houses here sit low enough
  that runoff arrives at the foundation before it reaches the street. Most of
  what I do in New Paltz starts with grade correction and rain gardens rather
  than planting. Once water is handled, the soil supports plantings that would
  struggle on the ridges across the river.
neighborhoods:
  - Village of New Paltz
  - Wallkill Valley
  - Springtown
featuredProjectSlug: wallkill-drainage
localTestimonial:
  quote: He talked us out of the expensive drainage system we asked for and fixed it with grading.
  attribution: M. Choi
  town: New Paltz
services:
  - irrigation-drainage
  - garden-design
  - lawn-grounds-care
---
EOF
cat > src/content/areas/kingston.md <<'EOF'
---
town: Kingston
state: NY
order: 5
headline: Landscaping in Kingston, NY
summary: Stonework, steps, and small-lot gardens across Kingston.
localNote: >-
  Kingston is the most urban work I take, and the lots reflect it: small,
  walled, and often paved right up to the building. Stonework dominates here
  because there is more hardscape than planting bed, and much of it is failing
  concrete poured over an inadequate base sometime in the last century. The
  Rondout and uptown Stockade both have masonry facades that new stone has to
  be matched against carefully. Compacted urban soil means bed work usually
  starts with decompaction rather than fertility.
neighborhoods:
  - Rondout
  - Stockade District
  - Midtown
featuredProjectSlug: kingston-stoop-steps
localTestimonial:
  quote: Three winters in, not one stone has moved.
  attribution: Dana R.
  town: Kingston
services:
  - patios-stonework
  - garden-design
  - seasonal-cleanup
---
EOF
cat > src/content/areas/hudson.md <<'EOF'
---
town: Hudson
state: NY
order: 6
headline: Landscaping in Hudson, NY
summary: Courtyards, small gardens, and stonework in Hudson.
localNote: >-
  Hudson properties are mostly narrow row-house lots with walled rear
  courtyards, which is a specific and unusual design problem: high walls, deep
  shade for most of the day, reflected heat in the afternoon, and no vehicle
  access for materials. Everything gets carried in through the house or down a
  side alley, which shapes what is buildable. The upside is that walled
  courtyards hold winter warmth well enough to grow espaliered fruit and
  borderline-hardy plants that would not survive an open site nearby.
neighborhoods:
  - Warren Street
  - North Bay
  - Hudson Waterfront
featuredProjectSlug: hudson-courtyard
localTestimonial:
  quote: He turned a gravel box behind our building into the reason we eat outside.
  attribution: R. Delacroix
  town: Hudson
services:
  - garden-design
  - patios-stonework
  - seasonal-cleanup
---
EOF
```

- [ ] **Step 7: Run the integrity test**

Run: `npx vitest run tests/unit/content-integrity.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 8: Verify the schemas accept every real entry**

Run: `npm run build`
Expected: build succeeds. Any Zod error names the exact file and field.

- [ ] **Step 9: Commit**

```bash
git add src/content tests/unit/content-integrity.test.ts
git commit -m "feat: author service, area, project, and testimonial content"
```

---

### Task 6: Layout primitives

**Files:**
- Create: `src/components/primitives/Container.astro`, `Section.astro`, `Eyebrow.astro`, `Button.astro`
- Test: `tests/unit/primitives.test.ts`

**Interfaces:**
- Consumes: tokens from Task 3.
- Produces:
  - `Container` — props `{ width?: 'default' | 'text' | 'full'; as?: string; class?: string }`, renders a slot.
  - `Section` — props `{ id?: string; tone?: 'paper' | 'raised' | 'ink' | 'moss'; class?: string }`, renders a `<section>` with vertical rhythm.
  - `Eyebrow` — no props, renders small uppercase label text from its slot.
  - `Button` — props `{ href: string; variant?: 'primary' | 'ghost'; class?: string }`, renders an `<a>` around its slot.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/primitives.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Button from '../../src/components/primitives/Button.astro';
import Container from '../../src/components/primitives/Container.astro';
import Section from '../../src/components/primitives/Section.astro';

const render = async (Component: unknown, options: Record<string, unknown>) =>
  (await AstroContainer.create()).renderToString(Component as never, options as never);

describe('Button', () => {
  it('renders an anchor with its slot content', async () => {
    const html = await render(Button, { props: { href: '/contact' }, slots: { default: 'Request a quote' } });
    expect(html).toContain('href="/contact"');
    expect(html).toContain('Request a quote');
  });

  it('applies a distinct class for the ghost variant', async () => {
    const primary = await render(Button, { props: { href: '/x' }, slots: { default: 'A' } });
    const ghost = await render(Button, { props: { href: '/x', variant: 'ghost' }, slots: { default: 'A' } });
    expect(primary).not.toBe(ghost);
  });

  it('never emits a raw hex color', async () => {
    const html = await render(Button, { props: { href: '/x' }, slots: { default: 'A' } });
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}/);
  });
});

describe('Container', () => {
  it('constrains text width when asked', async () => {
    const html = await render(Container, { props: { width: 'text' }, slots: { default: '<p>copy</p>' } });
    expect(html).toContain('copy');
    expect(html).toContain('container-text');
  });
});

describe('Section', () => {
  it('renders a section element carrying its id', async () => {
    const html = await render(Section, { props: { id: 'process' }, slots: { default: 'body' } });
    expect(html).toMatch(/<section[^>]*id="process"/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/primitives.test.ts`
Expected: FAIL — components do not exist.

- [ ] **Step 3: Write Container**

Create `src/components/primitives/Container.astro`:

```astro
---
interface Props { width?: 'default' | 'text' | 'full'; as?: string; class?: string }
const { width = 'default', as: Tag = 'div', class: className = '' } = Astro.props;
const widths = {
  default: 'mx-auto w-full max-w-[var(--container)] px-6 md:px-10',
  text: 'container-text mx-auto w-full max-w-[var(--container-text)] px-6 md:px-10',
  full: 'w-full',
};
---
<Tag class={`${widths[width]} ${className}`}><slot /></Tag>
```

- [ ] **Step 4: Write Section**

Create `src/components/primitives/Section.astro`:

```astro
---
interface Props { id?: string; tone?: 'paper' | 'raised' | 'ink' | 'moss'; class?: string }
const { id, tone = 'paper', class: className = '' } = Astro.props;
const tones = {
  paper: 'bg-paper text-ink',
  raised: 'bg-paper-raised text-ink',
  ink: 'bg-ink text-paper',
  moss: 'bg-moss text-paper',
};
---
<section id={id} class={`py-20 md:py-32 ${tones[tone]} ${className}`}>
  <slot />
</section>
```

- [ ] **Step 5: Write Eyebrow**

Create `src/components/primitives/Eyebrow.astro`:

```astro
---
interface Props { class?: string }
const { class: className = '' } = Astro.props;
---
<p class={`text-[length:var(--step--1)] font-medium uppercase tracking-[0.14em] text-ink-muted ${className}`}>
  <slot />
</p>
```

- [ ] **Step 6: Write Button**

Create `src/components/primitives/Button.astro`:

```astro
---
interface Props { href: string; variant?: 'primary' | 'ghost'; class?: string }
const { href, variant = 'primary', class: className = '' } = Astro.props;
const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[length:var(--step-0)] font-medium transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]';
const variants = {
  primary: 'bg-moss text-paper hover:bg-moss-deep',
  ghost: 'border border-stone text-ink hover:border-ink',
};
---
<a href={href} class={`${base} ${variants[variant]} ${className}`}><slot /></a>
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run tests/unit/primitives.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 8: Commit**

```bash
git add src/components/primitives tests/unit/primitives.test.ts
git commit -m "feat: add layout and control primitives"
```

---

### Task 7: SEO helpers and the Meta component

**Files:**
- Create: `src/lib/seo.ts`, `src/components/seo/Meta.astro`
- Test: `tests/unit/seo.test.ts`

**Interfaces:**
- Consumes: `siteConfig` from Task 2.
- Produces:
  - `canonical(pathname: string, site: URL | undefined): string` — absolute URL, trailing slash normalized off except for root.
  - `pageTitle(title?: string): string` — applies `siteConfig.seo.titleTemplate`, returns `defaultTitle` when given nothing.
  - `absoluteUrl(path: string, site: URL | undefined): string`
  - `Meta.astro` — props `{ title?: string; description?: string; ogImage?: string; noindex?: boolean }`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/seo.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/seo.test.ts`
Expected: FAIL — cannot resolve `src/lib/seo`.

- [ ] **Step 3: Write the helpers**

Create `src/lib/seo.ts`:

```ts
import siteConfig from '../../site.config';

const FALLBACK_ORIGIN = 'https://stonecroplandscape.com';

function origin(site: URL | undefined): string {
  return (site?.origin ?? FALLBACK_ORIGIN).replace(/\/$/, '');
}

export function canonical(pathname: string, site: URL | undefined): string {
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  return `${origin(site)}${path}`;
}

export function absoluteUrl(path: string, site: URL | undefined): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${origin(site)}${path.startsWith('/') ? path : `/${path}`}`;
}

export function pageTitle(title?: string): string {
  if (!title) return siteConfig.seo.defaultTitle;
  return siteConfig.seo.titleTemplate.replace('%s', title);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/seo.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Write the Meta component**

Create `src/components/seo/Meta.astro`:

```astro
---
import siteConfig from '../../../site.config';
import { absoluteUrl, canonical, pageTitle } from '../../lib/seo';

interface Props { title?: string; description?: string; ogImage?: string; noindex?: boolean }
const { title, description, ogImage, noindex = false } = Astro.props;

const resolvedTitle = pageTitle(title);
const resolvedDescription = description ?? siteConfig.seo.defaultDescription;
const url = canonical(Astro.url.pathname, Astro.site);
const image = absoluteUrl(ogImage ?? siteConfig.seo.ogImage, Astro.site);
---
<title>{resolvedTitle}</title>
<meta name="description" content={resolvedDescription} />
<link rel="canonical" href={url} />
{noindex && <meta name="robots" content="noindex, nofollow" />}

<meta property="og:type" content="website" />
<meta property="og:site_name" content={siteConfig.business.name} />
<meta property="og:title" content={resolvedTitle} />
<meta property="og:description" content={resolvedDescription} />
<meta property="og:url" content={url} />
<meta property="og:image" content={image} />
<meta name="twitter:card" content="summary_large_image" />
```

`Meta.astro` reads `siteConfig.business.name` rather than hardcoding it, which keeps it clear of the Task 2 brand-leak test.

- [ ] **Step 6: Commit**

```bash
git add src/lib/seo.ts src/components/seo/Meta.astro tests/unit/seo.test.ts
git commit -m "feat: add SEO helpers and meta component"
```

---

### Task 8: JSON-LD structured data

**Files:**
- Create: `src/lib/schema.ts`, `src/components/seo/JsonLd.astro`
- Test: `tests/unit/schema.test.ts`

**Interfaces:**
- Consumes: `siteConfig` (Task 2), `absoluteUrl` (Task 7).
- Produces four builders returning plain objects, and a component that serializes them:
  - `localBusinessJsonLd(site: URL | undefined): object`
  - `serviceJsonLd(input: { name: string; description: string; url: string; areaServed: string[] }): object`
  - `faqJsonLd(faqs: { question: string; answer: string }[]): object`
  - `breadcrumbJsonLd(crumbs: { name: string; url: string }[]): object`
  - `JsonLd.astro` — props `{ schema: object | object[] }`.

Names are deliberately suffixed `JsonLd` so they never collide with the Zod schemas exported from `src/content.config.ts`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { breadcrumbJsonLd, faqJsonLd, localBusinessJsonLd, serviceJsonLd } from '../../src/lib/schema';

const site = new URL('https://stonecroplandscape.com');

describe('localBusinessJsonLd', () => {
  const data = localBusinessJsonLd(site) as Record<string, any>;

  it('declares the correct type and context', () => {
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBe('LandscapingBusiness');
  });

  it('includes complete postal address fields', () => {
    expect(data.address['@type']).toBe('PostalAddress');
    for (const key of ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode', 'addressCountry']) {
      expect(data.address[key]).toBeTruthy();
    }
  });

  it('includes geo coordinates and a telephone', () => {
    expect(typeof data.geo.latitude).toBe('number');
    expect(typeof data.geo.longitude).toBe('number');
    expect(data.telephone).toBeTruthy();
  });

  it('lists every served town in areaServed', () => {
    const towns = data.areaServed.map((a: any) => a.name);
    expect(towns).toEqual(
      expect.arrayContaining(['Beacon', 'Cold Spring', 'Rhinebeck', 'New Paltz', 'Kingston', 'Hudson']),
    );
  });
});

describe('serviceJsonLd', () => {
  it('builds a Service node with a provider reference', () => {
    const data = serviceJsonLd({
      name: 'Patios & Stonework',
      description: 'Dry-laid bluestone.',
      url: 'https://stonecroplandscape.com/services/patios-stonework',
      areaServed: ['Beacon', 'Kingston'],
    }) as Record<string, any>;
    expect(data['@type']).toBe('Service');
    expect(data.name).toBe('Patios & Stonework');
    expect(data.provider['@type']).toBe('LandscapingBusiness');
    expect(data.areaServed).toHaveLength(2);
  });
});

describe('faqJsonLd', () => {
  it('maps each question to an accepted answer', () => {
    const data = faqJsonLd([{ question: 'How long?', answer: 'Three weeks.' }]) as Record<string, any>;
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity[0]['@type']).toBe('Question');
    expect(data.mainEntity[0].acceptedAnswer.text).toBe('Three weeks.');
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers positions from one', () => {
    const data = breadcrumbJsonLd([
      { name: 'Home', url: 'https://stonecroplandscape.com/' },
      { name: 'Services', url: 'https://stonecroplandscape.com/services' },
    ]) as Record<string, any>;
    expect(data.itemListElement[0].position).toBe(1);
    expect(data.itemListElement[1].position).toBe(2);
    expect(data.itemListElement[1].name).toBe('Services');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/schema.test.ts`
Expected: FAIL — cannot resolve `src/lib/schema`.

- [ ] **Step 3: Write the builders**

Create `src/lib/schema.ts`:

```ts
import siteConfig from '../../site.config';
import { absoluteUrl } from './seo';

const SERVED_TOWNS = ['Beacon', 'Cold Spring', 'Rhinebeck', 'New Paltz', 'Kingston', 'Hudson'];

export function localBusinessJsonLd(site: URL | undefined) {
  const { business } = siteConfig;
  return {
    '@context': 'https://schema.org',
    '@type': 'LandscapingBusiness',
    '@id': `${absoluteUrl('/', site)}#business`,
    name: business.name,
    legalName: business.legalName,
    description: siteConfig.seo.defaultDescription,
    url: absoluteUrl('/', site),
    telephone: business.phone,
    email: business.email,
    founder: { '@type': 'Person', name: business.operator },
    foundingDate: String(business.foundedYear),
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      addressRegion: business.address.region,
      postalCode: business.address.postalCode,
      addressCountry: business.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: business.geo.latitude,
      longitude: business.geo.longitude,
    },
    areaServed: SERVED_TOWNS.map((name) => ({ '@type': 'City', name })),
    openingHours: business.hours,
    image: absoluteUrl(siteConfig.seo.ogImage, site),
  };
}

export function serviceJsonLd(input: {
  name: string;
  description: string;
  url: string;
  areaServed: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url: input.url,
    serviceType: input.name,
    provider: { '@type': 'LandscapingBusiness', name: siteConfig.business.name },
    areaServed: input.areaServed.map((name) => ({ '@type': 'City', name })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

export function breadcrumbJsonLd(crumbs: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/schema.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Write the JsonLd component**

Create `src/components/seo/JsonLd.astro`:

```astro
---
interface Props { schema: object | object[] }
const { schema } = Astro.props;
const payload = Array.isArray(schema) ? schema : [schema];
---
{payload.map((entry) => (
  <script type="application/ld+json" set:html={JSON.stringify(entry)} />
))}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/schema.ts src/components/seo/JsonLd.astro tests/unit/schema.test.ts
git commit -m "feat: add JSON-LD structured data builders"
```

---

### Task 9: Motion foundation

**Files:**
- Create: `src/lib/motion.ts`
- Modify: `src/styles/global.css` (append the reveal layer)
- Test: `tests/unit/motion-css.test.ts`

**Interfaces:**
- Consumes: tokens from Task 3.
- Produces:
  - CSS class `.reveal` — element starts translated and transparent, animates to its resting state as it scrolls into view via `animation-timeline: view()`.
  - CSS class `.reveal-in` — the state the JS fallback applies.
  - `src/lib/motion.ts` — a side-effecting module, imported once in `BaseLayout`. Exports nothing.

The mechanism: browsers with scroll-driven animation support do the whole thing in CSS on the compositor thread, costing zero JavaScript. Older browsers get a small IntersectionObserver that adds `.reveal-in`. Both paths are skipped entirely under reduced motion, and the resting state is the visible one, so content can never get stranded invisible.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/motion-css.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/global.css', 'utf-8');

describe('reveal animation', () => {
  it('uses a native scroll-driven timeline', () => {
    expect(css).toContain('animation-timeline: view()');
  });

  it('guards the scroll-driven path behind a support query', () => {
    expect(css).toContain('@supports (animation-timeline: view())');
  });

  it('defines the JS fallback state class', () => {
    expect(css).toContain('.reveal-in');
  });

  it('disables reveal animation under reduced motion', () => {
    const reducedBlock = css.slice(css.indexOf('prefers-reduced-motion'));
    expect(reducedBlock).toContain('.reveal');
    expect(reducedBlock).toMatch(/opacity:\s*1/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/motion-css.test.ts`
Expected: FAIL — none of these strings exist yet.

- [ ] **Step 3: Append the reveal layer to the global stylesheet**

Append to `src/styles/global.css`:

```css
@keyframes reveal-rise {
  from { opacity: 0; transform: translateY(1.75rem); }
  to   { opacity: 1; transform: none; }
}

.reveal {
  opacity: 1;
  transform: none;
}

@supports (animation-timeline: view()) {
  .reveal {
    animation: reveal-rise linear both;
    animation-timeline: view();
    animation-range: entry 5% cover 28%;
  }
}

@supports not (animation-timeline: view()) {
  html.js .reveal {
    opacity: 0;
    transform: translateY(1.75rem);
    transition:
      opacity var(--dur-slow) var(--ease-out),
      transform var(--dur-slow) var(--ease-out);
  }
  html.js .reveal.reveal-in {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal,
  html.js .reveal {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
```

The `.reveal` base state is fully visible. The hidden state only ever applies inside `html.js`, which the script adds — so a JavaScript failure leaves every section readable instead of blank.

- [ ] **Step 4: Write the fallback script**

Create `src/lib/motion.ts`:

```ts
const supportsScrollTimeline =
  typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()');

const prefersReducedMotion =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function observeReveals(): void {
  const targets = document.querySelectorAll<HTMLElement>('.reveal:not(.reveal-in)');
  if (targets.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('reveal-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
  );

  targets.forEach((target) => observer.observe(target));
}

if (!supportsScrollTimeline && !prefersReducedMotion) {
  document.documentElement.classList.add('js');
  observeReveals();
  document.addEventListener('astro:after-swap', observeReveals);
}
```

`astro:after-swap` re-runs the observer after a View Transitions navigation, which is when new `.reveal` elements enter the document.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/unit/motion-css.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/motion.ts src/styles/global.css tests/unit/motion-css.test.ts
git commit -m "feat: add scroll reveal motion with reduced-motion safety"
```

---

### Task 10: Layout shell — header, navigation, footer

**Files:**
- Create: `src/components/layout/SkipLink.astro`, `Nav.astro`, `MobileMenu.astro`, `Header.astro`, `Footer.astro`, `src/layouts/BaseLayout.astro`, `src/layouts/PageLayout.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/e2e/navigation.spec.ts`

**Interfaces:**
- Consumes: `siteConfig` (Task 2), primitives (Task 6), `Meta` (Task 7), `JsonLd` + `localBusinessJsonLd` (Task 8), `motion.ts` (Task 9).
- Produces:
  - `BaseLayout.astro` — props `{ title?: string; description?: string; ogImage?: string; noindex?: boolean; transparentHeader?: boolean; jsonLd?: object | object[] }`, renders a slot inside `<main id="main">`.
  - `PageLayout.astro` — props `{ title: string; eyebrow?: string; lede?: string }` plus everything `BaseLayout` takes; renders a standard page header block above its slot.

- [ ] **Step 1: Write the failing E2E test**

Create `tests/e2e/navigation.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('desktop navigation', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop only');

  test('reaches every top-level page from the header', async ({ page }) => {
    for (const [label, path] of [
      ['Services', '/services'],
      ['Work', '/work'],
      ['About', '/about'],
      ['Contact', '/contact'],
    ] as const) {
      await page.goto('/');
      await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path}/?$`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('the skip link is the first focusable element and jumps to main', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: /skip to content/i });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });
});

test.describe('mobile menu', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only');

  test('opens, traps focus, closes on Escape, and restores focus', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: /menu/i });
    await toggle.click();

    const dialog = page.getByRole('dialog', { name: /navigation/i });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(dialog.locator(':focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('navigates from the mobile menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /menu/i }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Services' }).click();
    await expect(page).toHaveURL(/\/services\/?$/);
  });
});

test('every page exposes exactly one h1', async ({ page }) => {
  for (const path of ['/', '/services', '/work', '/about', '/contact']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/navigation.spec.ts --project=desktop`
Expected: FAIL — no header, and `/services` does not exist yet. Interior pages arrive in Tasks 14-18; this suite goes green at Task 18. That is expected and intentional: it is the contract those tasks build against.

- [ ] **Step 3: Write SkipLink**

Create `src/components/layout/SkipLink.astro`:

```astro
<a
  href="#main"
  class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-paper"
>
  Skip to content
</a>
```

- [ ] **Step 4: Write Nav**

Create `src/components/layout/Nav.astro`:

```astro
---
import siteConfig from '../../../site.config';

interface Props { class?: string; itemClass?: string }
const { class: className = '', itemClass = '' } = Astro.props;
const current = Astro.url.pathname;
---
<nav aria-label="Primary" class={className}>
  <ul class="flex items-center gap-8">
    {siteConfig.nav.map((item) => (
      <li>
        <a
          href={item.href}
          aria-current={current.startsWith(item.href) ? 'page' : undefined}
          class={`text-[length:var(--step-0)] transition-opacity duration-[var(--dur-fast)] hover:opacity-60 aria-[current=page]:underline aria-[current=page]:underline-offset-8 ${itemClass}`}
        >
          {item.label}
        </a>
      </li>
    ))}
  </ul>
</nav>
```

- [ ] **Step 5: Write MobileMenu**

Create `src/components/layout/MobileMenu.astro`. This is the only stateful component in the site.

```astro
---
import siteConfig from '../../../site.config';
---
<div class="md:hidden">
  <button
    type="button"
    id="menu-toggle"
    aria-expanded="false"
    aria-controls="mobile-menu"
    class="rounded-full border border-current px-5 py-2 text-[length:var(--step--1)]"
  >
    Menu
  </button>

  <div
    id="mobile-menu"
    role="dialog"
    aria-modal="true"
    aria-label="Site navigation"
    hidden
    class="fixed inset-0 z-50 flex flex-col bg-paper px-6 py-6 text-ink"
  >
    <div class="flex justify-end">
      <button type="button" id="menu-close" class="rounded-full border border-ink px-5 py-2 text-[length:var(--step--1)]">
        Close
      </button>
    </div>
    <ul class="mt-16 flex flex-col gap-8">
      {siteConfig.nav.map((item) => (
        <li>
          <a href={item.href} class="font-[family-name:var(--font-display)] text-[length:var(--step-4)]">{item.label}</a>
        </li>
      ))}
    </ul>
    <a href={siteConfig.business.phoneHref} class="mt-auto text-[length:var(--step-1)] text-moss">
      {siteConfig.business.phone}
    </a>
  </div>
</div>

<script>
  const toggle = document.getElementById('menu-toggle');
  const close = document.getElementById('menu-close');
  const menu = document.getElementById('mobile-menu');
  if (toggle && close && menu) {
    const focusables = () =>
      Array.from(menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));

    const open = () => {
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      focusables()[0]?.focus();
    };

    const shut = () => {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      toggle.focus();
    };

    toggle.addEventListener('click', open);
    close.addEventListener('click', shut);

    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { shut(); return; }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }
</script>
```

The `hidden` attribute both hides the dialog and removes its contents from the tab order, which is what makes the focus trap test meaningful rather than theatrical.

- [ ] **Step 6: Write Header**

Create `src/components/layout/Header.astro`:

```astro
---
import siteConfig from '../../../site.config';
import MobileMenu from './MobileMenu.astro';
import Nav from './Nav.astro';

interface Props { transparent?: boolean }
const { transparent = false } = Astro.props;
const tone = transparent
  ? 'absolute inset-x-0 top-0 text-paper'
  : 'sticky top-0 border-b border-stone bg-paper/80 text-ink backdrop-blur-xl';
---
<header class={`z-40 ${tone}`}>
  <div class="mx-auto flex w-full max-w-[var(--container)] items-center justify-between px-6 py-5 md:px-10">
    <a href="/" class="font-[family-name:var(--font-display)] text-[length:var(--step-1)] tracking-tight">
      {siteConfig.business.name}
    </a>
    <div class="flex items-center gap-8">
      <Nav class="hidden md:block" />
      <a href={siteConfig.business.phoneHref} class="hidden text-[length:var(--step-0)] md:inline">
        {siteConfig.business.phone}
      </a>
      <MobileMenu />
    </div>
  </div>
</header>
```

- [ ] **Step 7: Write Footer**

Create `src/components/layout/Footer.astro`:

```astro
---
import { getCollection } from 'astro:content';
import siteConfig from '../../../site.config';

const areas = (await getCollection('areas')).sort((a, b) => a.data.order - b.data.order);
const services = (await getCollection('services')).sort((a, b) => a.data.order - b.data.order);
const year = new Date().getFullYear();
---
<footer class="border-t border-stone bg-ink text-paper">
  <div class="mx-auto grid w-full max-w-[var(--container)] gap-12 px-6 py-20 md:grid-cols-4 md:px-10">
    <div>
      <p class="font-[family-name:var(--font-display)] text-[length:var(--step-2)]">{siteConfig.business.name}</p>
      <address class="mt-4 not-italic opacity-70">
        {siteConfig.business.address.street}<br />
        {siteConfig.business.address.city}, {siteConfig.business.address.region} {siteConfig.business.address.postalCode}
      </address>
      <a href={siteConfig.business.phoneHref} class="mt-4 block hover:opacity-70">{siteConfig.business.phone}</a>
      <a href={`mailto:${siteConfig.business.email}`} class="block hover:opacity-70">{siteConfig.business.email}</a>
    </div>

    <div>
      <h2 class="text-[length:var(--step--1)] uppercase tracking-[0.14em] opacity-60">Services</h2>
      <ul class="mt-4 space-y-2">
        {services.map((service) => (
          <li><a href={`/services/${service.id}`} class="opacity-80 hover:opacity-100">{service.data.title}</a></li>
        ))}
      </ul>
    </div>

    <div>
      <h2 class="text-[length:var(--step--1)] uppercase tracking-[0.14em] opacity-60">Service area</h2>
      <ul class="mt-4 space-y-2">
        {areas.map((area) => (
          <li><a href={`/areas/${area.id}`} class="opacity-80 hover:opacity-100">{area.data.town}, {area.data.state}</a></li>
        ))}
      </ul>
    </div>

    <div>
      <h2 class="text-[length:var(--step--1)] uppercase tracking-[0.14em] opacity-60">Hours</h2>
      <ul class="mt-4 space-y-2 opacity-80">
        {siteConfig.business.hours.map((line) => <li>{line}</li>)}
      </ul>
      <ul class="mt-6 space-y-2">
        {siteConfig.social.map((link) => (
          <li><a href={link.href} rel="me noopener" class="opacity-80 hover:opacity-100">{link.label}</a></li>
        ))}
      </ul>
    </div>
  </div>

  <div class="mx-auto w-full max-w-[var(--container)] px-6 pb-10 text-[length:var(--step--1)] opacity-60 md:px-10">
    &copy; {year} {siteConfig.business.name}. All rights reserved.
  </div>
</footer>
```

The six area links live here. That is their only sitewide entry point, which keeps the header uncluttered while still giving search engines a crawl path to every one.

- [ ] **Step 8: Write BaseLayout**

Create `src/layouts/BaseLayout.astro`:

```astro
---
import { ClientRouter } from 'astro:transitions';
import Footer from '../components/layout/Footer.astro';
import Header from '../components/layout/Header.astro';
import SkipLink from '../components/layout/SkipLink.astro';
import JsonLd from '../components/seo/JsonLd.astro';
import Meta from '../components/seo/Meta.astro';
import { localBusinessJsonLd } from '../lib/schema';
import '../styles/global.css';

interface Props {
  title?: string;
  description?: string;
  ogImage?: string;
  noindex?: boolean;
  transparentHeader?: boolean;
  jsonLd?: object | object[];
}
const { title, description, ogImage, noindex, transparentHeader = false, jsonLd } = Astro.props;

const extra = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
const schema = [localBusinessJsonLd(Astro.site), ...extra];
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="sitemap" href="/sitemap-index.xml" />
    <Meta title={title} description={description} ogImage={ogImage} noindex={noindex} />
    <JsonLd schema={schema} />
    <ClientRouter />
  </head>
  <body class="min-h-dvh">
    <SkipLink />
    <Header transparent={transparentHeader} />
    <main id="main"><slot /></main>
    <Footer />
    <script>import '../lib/motion.ts';</script>
  </body>
</html>
```

- [ ] **Step 9: Write PageLayout**

Create `src/layouts/PageLayout.astro`:

```astro
---
import Container from '../components/primitives/Container.astro';
import Eyebrow from '../components/primitives/Eyebrow.astro';
import BaseLayout from './BaseLayout.astro';

interface Props {
  title: string;
  eyebrow?: string;
  lede?: string;
  description?: string;
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: object | object[];
}
const { title, eyebrow, lede, description, ogImage, noindex, jsonLd } = Astro.props;
---
<BaseLayout title={title} description={description} ogImage={ogImage} noindex={noindex} jsonLd={jsonLd}>
  <Container class="pb-16 pt-20 md:pb-24 md:pt-32">
    {eyebrow && <Eyebrow class="mb-5">{eyebrow}</Eyebrow>}
    <h1 class="max-w-[16ch] text-[length:var(--step-6)]">{title}</h1>
    {lede && <p class="mt-8 max-w-[var(--measure)] text-[length:var(--step-1)] text-ink-muted">{lede}</p>}
  </Container>
  <slot />
</BaseLayout>
```

- [ ] **Step 10: Point the home page at the layout**

Replace `src/pages/index.astro`:

```astro
---
import Container from '../components/primitives/Container.astro';
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout>
  <Container class="py-32">
    <h1 class="text-[length:var(--step-6)]">Gardens, stonework, and grounds care for the Hudson Valley.</h1>
  </Container>
</BaseLayout>
```

- [ ] **Step 11: Verify the brand-leak guard still passes**

Run: `npx vitest run tests/unit/site-config.test.ts`
Expected: PASS. Header and Footer read the business name from `siteConfig`, so nothing is hardcoded.

- [ ] **Step 12: Verify the home page builds and the h1 test passes**

Run: `npm run build && npx playwright test tests/e2e/navigation.spec.ts -g "exactly one h1" --project=desktop`
Expected: the `/` case passes; interior pages still 404 until Task 18.

- [ ] **Step 13: Commit**

```bash
git add src/components/layout src/layouts src/pages/index.astro tests/e2e/navigation.spec.ts
git commit -m "feat: add layout shell with accessible navigation and view transitions"
```

---

### Task 11: Placeholder imagery and the image resolution helper

**Files:**
- Create: `scripts/generate-placeholders.mjs`, `src/lib/images.ts`, `src/assets/images/**` (generated)
- Test: `tests/unit/images.test.ts`

**Interfaces:**
- Consumes: content frontmatter image paths from Task 5.
- Produces: `resolveImage(path: string): Promise<ImageMetadata>` — maps a content frontmatter path like `/images/services/garden-design.jpg` to the imported asset at `/src/assets/images/services/garden-design.jpg`, so Astro's `<Image>` can optimize it. Throws a named error if the file is missing.

Content stores plain string paths so the content files stay portable and a real photo can be dropped in by filename. `resolveImage` is the bridge from that string to a build-time-optimized asset.

- [ ] **Step 1: Write the placeholder generator**

Create `scripts/generate-placeholders.mjs`:

```js
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const OUT = 'src/assets/images';

const PALETTE = ['#3F5641', '#5C6169', '#2C3D2E', '#6B7A5E', '#4A5568'];

const FILES = [
  ['hero.jpg', 2400, 1600, 'Hero'],
  ['about-portrait.jpg', 1200, 1500, 'Portrait'],
  ['services/garden-design.jpg', 1600, 1200, 'Garden Design'],
  ['services/patios-stonework.jpg', 1600, 1200, 'Patios & Stonework'],
  ['services/lawn-grounds-care.jpg', 1600, 1200, 'Lawn & Grounds'],
  ['services/irrigation-drainage.jpg', 1600, 1200, 'Irrigation & Drainage'],
  ['services/seasonal-cleanup.jpg', 1600, 1200, 'Seasonal Cleanup'],
];

for (const slug of [
  'tioronda-terrace',
  'chestnut-ridge-garden',
  'rhinebeck-farmhouse-grounds',
  'wallkill-drainage',
  'kingston-stoop-steps',
  'hudson-courtyard',
]) {
  FILES.push([`work/${slug}-before.jpg`, 1600, 1200, `${slug} before`]);
  FILES.push([`work/${slug}-after.jpg`, 1600, 1200, `${slug} after`]);
}

function svg(width, height, label, color) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${color}"/>
    <text x="50%" y="50%" fill="#FAF9F6" font-family="sans-serif" font-size="${Math.round(width / 26)}"
          text-anchor="middle" dominant-baseline="middle" opacity="0.85">${label}</text>
  </svg>`);
}

let index = 0;
for (const [name, width, height, label] of FILES) {
  const target = join(OUT, name);
  await mkdir(dirname(target), { recursive: true });
  const buffer = await sharp(svg(width, height, label, PALETTE[index % PALETTE.length]))
    .jpeg({ quality: 82 })
    .toBuffer();
  await writeFile(target, buffer);
  index += 1;
}

// Open Graph default lives in public/ because social crawlers need a stable, unhashed URL.
await mkdir('public/og', { recursive: true });
await writeFile(
  'public/og/default.jpg',
  await sharp(svg(1200, 630, 'Stonecrop Landscape Co.', PALETTE[0])).jpeg({ quality: 82 }).toBuffer(),
);

console.log(`generated ${FILES.length + 1} placeholder images`);
```

- [ ] **Step 2: Install sharp and generate the images**

```bash
npm install -D sharp
node scripts/generate-placeholders.mjs
```

Expected output: `generated 20 placeholder images`.

- [ ] **Step 3: Write the failing test**

Create `tests/unit/images.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { imageAssetPath } from '../../src/lib/images';

describe('imageAssetPath', () => {
  it('maps a content path into the assets directory', () => {
    expect(imageAssetPath('/images/services/garden-design.jpg')).toBe(
      '/src/assets/images/services/garden-design.jpg',
    );
  });

  it('tolerates a path without a leading slash', () => {
    expect(imageAssetPath('images/hero.jpg')).toBe('/src/assets/images/hero.jpg');
  });
});

describe('generated placeholders', () => {
  it('produced an asset for every image referenced in content', () => {
    for (const path of [
      'src/assets/images/hero.jpg',
      'src/assets/images/services/garden-design.jpg',
      'src/assets/images/work/tioronda-terrace-before.jpg',
      'src/assets/images/work/tioronda-terrace-after.jpg',
      'public/og/default.jpg',
    ]) {
      expect(existsSync(path), path).toBe(true);
    }
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run tests/unit/images.test.ts`
Expected: FAIL — cannot resolve `src/lib/images`.

- [ ] **Step 5: Write the helper**

Create `src/lib/images.ts`:

```ts
import type { ImageMetadata } from 'astro';

const assets = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/images/**/*.{jpg,jpeg,png,webp,avif}',
);

export function imageAssetPath(contentPath: string): string {
  const normalized = contentPath.startsWith('/') ? contentPath : `/${contentPath}`;
  return `/src/assets${normalized}`;
}

export async function resolveImage(contentPath: string): Promise<ImageMetadata> {
  const key = imageAssetPath(contentPath);
  const loader = assets[key];
  if (!loader) {
    throw new Error(
      `Image not found: "${contentPath}" resolved to "${key}". Add the file to src/assets/images or run scripts/generate-placeholders.mjs.`,
    );
  }
  return (await loader()).default;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run tests/unit/images.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 7: Ignore generated placeholders in git**

Append to `.gitignore`:

```
src/assets/images/
public/og/
```

Generated placeholders are build artifacts, not source. `scripts/generate-placeholders.mjs` is committed and regenerates them; real photography replaces the script's output later.

- [ ] **Step 8: Add a prebuild hook so generation is never forgotten**

Add to `package.json` `"scripts"`:

```json
{
  "placeholders": "node scripts/generate-placeholders.mjs",
  "prebuild": "node scripts/generate-placeholders.mjs"
}
```

- [ ] **Step 9: Commit**

```bash
git add scripts src/lib/images.ts tests/unit/images.test.ts .gitignore package.json
git commit -m "feat: add placeholder image generation and asset resolution"
```

---

### Task 12: Home hero and offering strip

**Files:**
- Create: `src/components/sections/Hero.astro`, `src/components/sections/OfferingStrip.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/e2e/home-offering.spec.ts`

**Interfaces:**
- Consumes: primitives (Task 6), `resolveImage` (Task 11), services collection (Task 5).
- Produces:
  - `Hero` — props `{ headline: string; lede: string; imagePath: string; imageAlt: string }`.
  - `OfferingStrip` — props `{ services: { slug: string; title: string; summary: string; startingPrice: string; imagePath: string; imageAlt: string }[] }`.

- [ ] **Step 1: Write the failing E2E test**

Create `tests/e2e/home-offering.spec.ts`. These assertions encode the brief's core requirement — the offering is visible immediately.

```ts
import { expect, test } from '@playwright/test';

test.describe('home page offering', () => {
  test('states the offering in the h1 above the fold', async ({ page }) => {
    await page.goto('/');
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    const box = await h1.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThan(viewport!.height);
  });

  test('offers a primary call to action and a tappable phone number in the hero', async ({ page }) => {
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
    const viewport = page.viewportSize();
    expect(box!.y).toBeLessThan(viewport!.height * 2);
  });

  test('every service card links to its own page', async ({ page }) => {
    await page.goto('/');
    const links = page.getByRole('region', { name: /what i do/i }).getByRole('link');
    await expect(links).toHaveCount(5);
    for (const href of await links.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')))) {
      expect(href).toMatch(/^\/services\/[a-z-]+$/);
    }
  });

  test('the hero image carries meaningful alt text', async ({ page }) => {
    await page.goto('/');
    const alt = await page.getByRole('region', { name: /hero/i }).locator('img').first().getAttribute('alt');
    expect(alt).toBeTruthy();
    expect(alt!.length).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/home-offering.spec.ts --project=desktop`
Expected: FAIL — no hero region exists.

- [ ] **Step 3: Write Hero**

Create `src/components/sections/Hero.astro`:

```astro
---
import { Image } from 'astro:assets';
import siteConfig from '../../../site.config';
import Button from '../primitives/Button.astro';
import { resolveImage } from '../../lib/images';

interface Props { headline: string; lede: string; imagePath: string; imageAlt: string }
const { headline, lede, imagePath, imageAlt } = Astro.props;
const image = await resolveImage(imagePath);
---
<section aria-label="Hero" class="relative flex min-h-[92svh] items-end overflow-hidden bg-ink">
  <Image
    src={image}
    alt={imageAlt}
    widths={[640, 1024, 1600, 2400]}
    sizes="100vw"
    loading="eager"
    fetchpriority="high"
    class="absolute inset-0 h-full w-full object-cover"
  />
  <div class="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-ink/25"></div>

  <div class="relative mx-auto w-full max-w-[var(--container)] px-6 pb-20 pt-40 text-paper md:px-10 md:pb-28">
    <h1 class="max-w-[14ch] text-[length:var(--step-6)]">{headline}</h1>
    <p class="mt-7 max-w-[46ch] text-[length:var(--step-1)] opacity-85">{lede}</p>
    <div class="mt-10 flex flex-wrap items-center gap-4">
      <Button href="/contact">Request a quote</Button>
      <a
        href={siteConfig.business.phoneHref}
        class="rounded-full border border-paper/40 px-7 py-3.5 text-[length:var(--step-0)] transition-colors duration-[var(--dur-fast)] hover:border-paper"
      >
        {siteConfig.business.phone}
      </a>
    </div>
  </div>
</section>
```

The gradient overlay is what guarantees text contrast over an arbitrary photograph. Without it, swapping in a bright real photo silently breaks legibility.

- [ ] **Step 4: Write OfferingStrip**

Create `src/components/sections/OfferingStrip.astro`:

```astro
---
import { Image } from 'astro:assets';
import Eyebrow from '../primitives/Eyebrow.astro';
import { resolveImage } from '../../lib/images';

interface ServiceCard {
  slug: string;
  title: string;
  summary: string;
  startingPrice: string;
  imagePath: string;
  imageAlt: string;
}
interface Props { services: ServiceCard[] }
const { services } = Astro.props;
const cards = await Promise.all(
  services.map(async (service) => ({ ...service, image: await resolveImage(service.imagePath) })),
);
---
<section aria-label="What I do" class="bg-paper py-20 md:py-28">
  <div class="mx-auto w-full max-w-[var(--container)] px-6 md:px-10">
    <Eyebrow>What I do</Eyebrow>
    <h2 class="mt-4 max-w-[20ch] text-[length:var(--step-4)]">Five services, one person, start to finish.</h2>
  </div>

  <ul
    class="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 md:mx-auto md:max-w-[var(--container)] md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-10 lg:grid-cols-5"
  >
    {cards.map((card) => (
      <li class="reveal w-[76vw] flex-none snap-start md:w-auto">
        <a href={`/services/${card.slug}`} class="group block h-full">
          <div class="overflow-hidden rounded-2xl bg-stone">
            <Image
              src={card.image}
              alt={card.imageAlt}
              widths={[400, 800, 1200]}
              sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 76vw"
              loading="lazy"
              class="aspect-[3/4] w-full object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
            />
          </div>
          <h3 class="mt-5 text-[length:var(--step-1)]">{card.title}</h3>
          <p class="mt-2 text-[length:var(--step--1)] text-ink-muted">{card.summary}</p>
          <p class="mt-3 text-[length:var(--step--1)] text-moss">{card.startingPrice}</p>
        </a>
      </li>
    ))}
  </ul>
</section>
```

- [ ] **Step 5: Assemble the home page**

Replace `src/pages/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/sections/Hero.astro';
import OfferingStrip from '../components/sections/OfferingStrip.astro';

const services = (await getCollection('services'))
  .sort((a, b) => a.data.order - b.data.order)
  .map((service) => ({
    slug: service.id,
    title: service.data.title,
    summary: service.data.summary,
    startingPrice: service.data.startingPrice,
    imagePath: service.data.heroImage,
    imageAlt: service.data.heroAlt,
  }));
---
<BaseLayout transparentHeader>
  <Hero
    headline="Gardens, stonework, and grounds care for the Hudson Valley."
    lede="Ellis Vance designs, builds, and maintains outdoor space across Beacon, Cold Spring, Rhinebeck, New Paltz, Kingston, and Hudson. One person on every job, start to finish."
    imagePath="/images/hero.jpg"
    imageAlt="A dry-laid bluestone terrace edged with deep perennial planting in late afternoon light."
  />
  <OfferingStrip services={services} />
</BaseLayout>
```

The page fetches content and passes plain props down. Neither section component calls `getCollection`, which is what keeps both unit-renderable.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run build && npx playwright test tests/e2e/home-offering.spec.ts`
Expected: PASS, 5 tests on both projects.

- [ ] **Step 7: Commit**

```bash
git add src/components/sections src/pages/index.astro tests/e2e/home-offering.spec.ts
git commit -m "feat: add hero and offering strip presenting services above the fold"
```

---

### Task 13: The before/after set piece

**Files:**
- Create: `src/components/sections/BeforeAfter.astro`
- Modify: `src/pages/index.astro`, `src/styles/global.css`
- Test: `tests/e2e/before-after.spec.ts`

**Interfaces:**
- Consumes: `resolveImage` (Task 11), projects collection (Task 5).
- Produces: `BeforeAfter` — props `{ title: string; project: { title: string; town: string; beforeImage: string; beforeAlt: string; afterImage: string; afterAlt: string } }`.

The mechanism: a tall scroll container holds a `position: sticky` viewport. The "after" image is clipped by a CSS `clip-path` whose inset is driven by `animation-timeline: view()` on the sticky element — so scrolling wipes one image into the other with no scroll listener and no JavaScript. Under reduced motion or without support, both images render side by side as a labeled comparison, which communicates the same thing statically.

- [ ] **Step 1: Write the failing E2E test**

Create `tests/e2e/before-after.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('renders both states with distinct alt text', async ({ page }) => {
  await page.goto('/');
  const region = page.getByRole('region', { name: /before and after/i });
  const images = region.locator('img');
  await expect(images).toHaveCount(2);

  const alts = await images.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('alt')));
  expect(alts[0]).toBeTruthy();
  expect(alts[1]).toBeTruthy();
  expect(alts[0]).not.toBe(alts[1]);
});

test('both images stay visible when motion is reduced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const region = page.getByRole('region', { name: /before and after/i });
  await region.scrollIntoViewIfNeeded();
  await expect(region.locator('img').first()).toBeVisible();
  await expect(region.locator('img').nth(1)).toBeVisible();
});

test('labels which image is which', async ({ page }) => {
  await page.goto('/');
  const region = page.getByRole('region', { name: /before and after/i });
  await expect(region.getByText('Before', { exact: true })).toBeVisible();
  await expect(region.getByText('After', { exact: true })).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/before-after.spec.ts --project=desktop`
Expected: FAIL — no such region.

- [ ] **Step 3: Add the wipe keyframes to the global stylesheet**

Append to `src/styles/global.css`:

```css
@keyframes wipe-reveal {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0 0 0); }
}

.wipe-layer { clip-path: inset(0 0 0 0); }

@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .wipe-stage { --wipe-enabled: 1; }
    .wipe-stage .wipe-layer {
      animation: wipe-reveal linear both;
      animation-timeline: view(block);
      animation-range: cover 15% cover 70%;
    }
  }
}
```

`.wipe-layer` resting state is fully revealed. The animation only ever hides part of it when both support and motion preference allow, so the fallback is the correct image rather than a blank panel.

- [ ] **Step 4: Write BeforeAfter**

Create `src/components/sections/BeforeAfter.astro`:

```astro
---
import { Image } from 'astro:assets';
import Eyebrow from '../primitives/Eyebrow.astro';
import { resolveImage } from '../../lib/images';

interface Project {
  title: string;
  town: string;
  beforeImage: string;
  beforeAlt: string;
  afterImage: string;
  afterAlt: string;
}
interface Props { title: string; project: Project }
const { title, project } = Astro.props;

const before = await resolveImage(project.beforeImage);
const after = await resolveImage(project.afterImage);
const shared = { widths: [640, 1024, 1600], sizes: '100vw', loading: 'lazy' as const };
---
<section aria-label="Before and after" class="bg-ink text-paper">
  <div class="mx-auto w-full max-w-[var(--container)] px-6 py-20 md:px-10 md:py-28">
    <Eyebrow class="text-paper/60">One property</Eyebrow>
    <h2 class="mt-4 max-w-[18ch] text-[length:var(--step-4)]">{title}</h2>
    <p class="mt-4 text-[length:var(--step-0)] opacity-70">{project.title} — {project.town}</p>
  </div>

  <!-- Tall track gives the sticky stage its scroll distance. -->
  <div class="wipe-track relative h-[220svh] md:h-[260svh]">
    <div class="wipe-stage sticky top-0 flex h-svh items-center overflow-hidden">
      <div class="relative h-full w-full">
        <Image src={before} alt={project.beforeAlt} {...shared} class="absolute inset-0 h-full w-full object-cover" />
        <Image
          src={after}
          alt={project.afterAlt}
          {...shared}
          class="wipe-layer absolute inset-0 h-full w-full object-cover"
        />

        <p class="absolute bottom-8 left-6 rounded-full bg-ink/70 px-4 py-2 text-[length:var(--step--1)] backdrop-blur md:left-10">
          Before
        </p>
        <p class="absolute bottom-8 right-6 rounded-full bg-paper/85 px-4 py-2 text-[length:var(--step--1)] text-ink backdrop-blur md:right-10">
          After
        </p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 5: Add the section to the home page**

In `src/pages/index.astro`, add to the frontmatter:

```ts
const featured = (await getCollection('projects')).find((p) => p.id === 'tioronda-terrace');
if (!featured) throw new Error('Home page requires the "tioronda-terrace" project entry.');
```

Add the import alongside the others:

```ts
import BeforeAfter from '../components/sections/BeforeAfter.astro';
```

And place the section directly after `<OfferingStrip />`:

```astro
<BeforeAfter
  title="The same side yard, eighteen months apart."
  project={{
    title: featured.data.title,
    town: featured.data.town,
    beforeImage: featured.data.beforeImage,
    beforeAlt: featured.data.beforeAlt,
    afterImage: featured.data.afterImage,
    afterAlt: featured.data.afterAlt,
  }}
/>
```

The explicit `throw` turns a missing content entry into a clear build failure instead of a silently absent section.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run build && npx playwright test tests/e2e/before-after.spec.ts`
Expected: PASS, 3 tests on both projects.

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/BeforeAfter.astro src/pages/index.astro src/styles/global.css tests/e2e/before-after.spec.ts
git commit -m "feat: add scroll-driven before and after set piece"
```

---

### Task 14: Remaining home sections

**Files:**
- Create: `src/components/sections/ProcessSteps.astro`, `SelectedWork.astro`, `Proof.astro`, `ServiceAreaList.astro`, `ClosingCTA.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/e2e/home-narrative.spec.ts`

**Interfaces:**
- Consumes: primitives (Task 6), `resolveImage` (Task 11), projects/testimonials/areas collections (Task 5).
- Produces:
  - `ProcessSteps` — props `{ steps: { title: string; body: string }[] }`.
  - `SelectedWork` — props `{ projects: { slug: string; title: string; town: string; year: number; summary: string; imagePath: string; imageAlt: string }[] }`.
  - `Proof` — props `{ testimonial: { quote: string; attribution: string; town: string }; credentials: string[]; yearsInBusiness: number }`.
  - `ServiceAreaList` — props `{ areas: { slug: string; town: string; state: string }[] }`.
  - `ClosingCTA` — props `{ headline: string; body: string }`.

- [ ] **Step 1: Write the failing E2E test**

Create `tests/e2e/home-narrative.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('presents the full narrative in order', async ({ page }) => {
  await page.goto('/');
  const names = [/hero/i, /what i do/i, /before and after/i, /how it works/i, /selected work/i, /why me/i, /service area/i, /get started/i];
  for (const name of names) {
    await expect(page.getByRole('region', { name })).toHaveCount(1);
  }
});

test('shows three process steps', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: /how it works/i }).getByRole('listitem')).toHaveCount(3);
});

test('shows three selected projects plus a link to the full index', async ({ page }) => {
  await page.goto('/');
  const region = page.getByRole('region', { name: /selected work/i });

  const caseStudies = region.locator('a[href^="/work/"]');
  await expect(caseStudies).toHaveCount(3);
  for (const href of await caseStudies.evaluateAll((n) => n.map((x) => x.getAttribute('href')))) {
    expect(href).toMatch(/^\/work\/[a-z-]+$/);
  }

  await expect(region.locator('a[href="/work"]')).toHaveCount(1);
});

test('links to all six service areas', async ({ page }) => {
  await page.goto('/');
  const links = page.getByRole('region', { name: /service area/i }).getByRole('link');
  await expect(links).toHaveCount(6);
});

test('renders a testimonial as a blockquote with attribution', async ({ page }) => {
  await page.goto('/');
  const proof = page.getByRole('region', { name: /why me/i });
  await expect(proof.locator('blockquote')).toBeVisible();
  await expect(proof.locator('figcaption')).toContainText(/,/);
});

test('closes with a single primary action', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: /get started/i }).getByRole('link')).toHaveCount(1);
});

test('heading levels never skip', async ({ page }) => {
  await page.goto('/');
  const levels = await page.locator('h1, h2, h3, h4').evaluateAll((nodes) =>
    nodes.map((n) => Number(n.tagName.slice(1))),
  );
  expect(levels[0]).toBe(1);
  for (let i = 1; i < levels.length; i += 1) {
    expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/home-narrative.spec.ts --project=desktop`
Expected: FAIL — the later regions do not exist.

- [ ] **Step 3: Write ProcessSteps**

Create `src/components/sections/ProcessSteps.astro`:

```astro
---
import Eyebrow from '../primitives/Eyebrow.astro';

interface Props { steps: { title: string; body: string }[] }
const { steps } = Astro.props;
---
<section aria-label="How it works" class="bg-paper py-20 md:py-32">
  <div class="mx-auto w-full max-w-[var(--container)] px-6 md:px-10">
    <Eyebrow>How it works</Eyebrow>
    <h2 class="mt-4 max-w-[18ch] text-[length:var(--step-4)]">Three steps, and you always talk to me.</h2>

    <ol class="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
      {steps.map((step, index) => (
        <li class="reveal border-t border-stone pt-6">
          <span class="font-[family-name:var(--font-display)] text-[length:var(--step-3)] text-moss">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 class="mt-4 text-[length:var(--step-2)]">{step.title}</h3>
          <p class="mt-3 max-w-[38ch] text-ink-muted">{step.body}</p>
        </li>
      ))}
    </ol>
  </div>
</section>
```

- [ ] **Step 4: Write SelectedWork**

Create `src/components/sections/SelectedWork.astro`:

```astro
---
import { Image } from 'astro:assets';
import Eyebrow from '../primitives/Eyebrow.astro';
import { resolveImage } from '../../lib/images';

interface ProjectCard {
  slug: string; title: string; town: string; year: number;
  summary: string; imagePath: string; imageAlt: string;
}
interface Props { projects: ProjectCard[] }
const { projects } = Astro.props;
const cards = await Promise.all(
  projects.map(async (project) => ({ ...project, image: await resolveImage(project.imagePath) })),
);
---
<section aria-label="Selected work" class="bg-paper-raised py-20 md:py-32">
  <div class="mx-auto w-full max-w-[var(--container)] px-6 md:px-10">
    <div class="flex flex-wrap items-end justify-between gap-6">
      <div>
        <Eyebrow>Selected work</Eyebrow>
        <h2 class="mt-4 max-w-[16ch] text-[length:var(--step-4)]">A few properties, start to finish.</h2>
      </div>
      <a href="/work" class="text-[length:var(--step-0)] text-moss underline underline-offset-8">See all work</a>
    </div>

    <ul class="mt-14 grid gap-10 md:grid-cols-3">
      {cards.map((card) => (
        <li class="reveal">
          <a href={`/work/${card.slug}`} class="group block">
            <div class="overflow-hidden rounded-2xl bg-stone">
              <Image
                src={card.image}
                alt={card.imageAlt}
                widths={[480, 800, 1200]}
                sizes="(min-width: 768px) 33vw, 90vw"
                loading="lazy"
                class="aspect-[4/3] w-full object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
              />
            </div>
            <h3 class="mt-5 text-[length:var(--step-1)]">{card.title}</h3>
            <p class="mt-1 text-[length:var(--step--1)] text-ink-muted">{card.town} — {card.year}</p>
            <p class="mt-3 max-w-[40ch] text-ink-muted">{card.summary}</p>
          </a>
        </li>
      ))}
    </ul>
  </div>
</section>
```

- [ ] **Step 5: Write Proof**

Create `src/components/sections/Proof.astro`:

```astro
---
interface Props {
  testimonial: { quote: string; attribution: string; town: string };
  credentials: string[];
  yearsInBusiness: number;
}
const { testimonial, credentials, yearsInBusiness } = Astro.props;
---
<section aria-label="Why me" class="bg-moss text-paper py-20 md:py-32">
  <div class="mx-auto grid w-full max-w-[var(--container)] gap-14 px-6 md:grid-cols-[3fr_2fr] md:px-10">
    <figure>
      <blockquote class="font-[family-name:var(--font-display)] text-[length:var(--step-4)] leading-[1.15]">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <figcaption class="mt-8 text-[length:var(--step-0)] opacity-80">
        {testimonial.attribution}, {testimonial.town}
      </figcaption>
    </figure>

    <ul class="space-y-5 self-center">
      <li class="border-t border-paper/25 pt-4 text-[length:var(--step-1)]">
        {yearsInBusiness} years working in the Hudson Valley
      </li>
      {credentials.map((credential) => (
        <li class="border-t border-paper/25 pt-4 text-[length:var(--step-1)]">{credential}</li>
      ))}
    </ul>
  </div>
</section>
```

- [ ] **Step 6: Write ServiceAreaList**

Create `src/components/sections/ServiceAreaList.astro`:

```astro
---
import Eyebrow from '../primitives/Eyebrow.astro';

interface Props { areas: { slug: string; town: string; state: string }[] }
const { areas } = Astro.props;
---
<section aria-label="Service area" class="bg-paper py-20 md:py-28">
  <div class="mx-auto w-full max-w-[var(--container)] px-6 md:px-10">
    <Eyebrow>Service area</Eyebrow>
    <h2 class="mt-4 max-w-[20ch] text-[length:var(--step-4)]">Six towns, roughly forty minutes from Beacon.</h2>

    <ul class="mt-12 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {areas.map((area) => (
        <li class="border-b border-stone">
          <a
            href={`/areas/${area.slug}`}
            class="flex items-baseline justify-between py-4 transition-colors duration-[var(--dur-fast)] hover:text-moss"
          >
            <span class="font-[family-name:var(--font-display)] text-[length:var(--step-2)]">{area.town}</span>
            <span class="text-[length:var(--step--1)] text-ink-muted">{area.state}</span>
          </a>
        </li>
      ))}
    </ul>
  </div>
</section>
```

- [ ] **Step 7: Write ClosingCTA**

Create `src/components/sections/ClosingCTA.astro`:

```astro
---
import Button from '../primitives/Button.astro';

interface Props { headline: string; body: string }
const { headline, body } = Astro.props;
---
<section aria-label="Get started" class="bg-ink py-24 text-paper md:py-36">
  <div class="mx-auto w-full max-w-[var(--container-text)] px-6 text-center md:px-10">
    <h2 class="text-[length:var(--step-5)]">{headline}</h2>
    <p class="mx-auto mt-6 max-w-[46ch] text-[length:var(--step-1)] opacity-75">{body}</p>
    <div class="mt-10 flex justify-center">
      <Button href="/contact">Request a quote</Button>
    </div>
  </div>
</section>
```

Exactly one link in this region — the test enforces it. A secondary action here competes with the primary one and measurably lowers conversion.

- [ ] **Step 8: Complete the home page**

Replace the body of `src/pages/index.astro` with the full assembly:

```astro
---
import { getCollection } from 'astro:content';
import siteConfig from '../../site.config';
import BaseLayout from '../layouts/BaseLayout.astro';
import BeforeAfter from '../components/sections/BeforeAfter.astro';
import ClosingCTA from '../components/sections/ClosingCTA.astro';
import Hero from '../components/sections/Hero.astro';
import OfferingStrip from '../components/sections/OfferingStrip.astro';
import ProcessSteps from '../components/sections/ProcessSteps.astro';
import Proof from '../components/sections/Proof.astro';
import SelectedWork from '../components/sections/SelectedWork.astro';
import ServiceAreaList from '../components/sections/ServiceAreaList.astro';

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

const services = (await getCollection('services')).sort(byOrder).map((service) => ({
  slug: service.id,
  title: service.data.title,
  summary: service.data.summary,
  startingPrice: service.data.startingPrice,
  imagePath: service.data.heroImage,
  imageAlt: service.data.heroAlt,
}));

const allProjects = (await getCollection('projects')).sort(byOrder);
const featured = allProjects.find((project) => project.id === 'tioronda-terrace');
if (!featured) throw new Error('Home page requires the "tioronda-terrace" project entry.');

const selected = allProjects.slice(0, 3).map((project) => ({
  slug: project.id,
  title: project.data.title,
  town: project.data.town,
  year: project.data.year,
  summary: project.data.summary,
  imagePath: project.data.afterImage,
  imageAlt: project.data.afterAlt,
}));

const areas = (await getCollection('areas')).sort(byOrder).map((area) => ({
  slug: area.id,
  town: area.data.town,
  state: area.data.state,
}));

const testimonials = (await getCollection('testimonials')).sort(byOrder);
const lead = testimonials[0];
if (!lead) throw new Error('Home page requires at least one testimonial entry.');

const steps = [
  { title: 'We walk the property', body: 'An hour on site, together. Light, drainage, soil, what you use and what you avoid. No charge, no obligation.' },
  { title: 'You get a plan and a price', body: 'A written scope with a drawing where it helps, a fixed price, and a phased budget if the work should happen in stages.' },
  { title: 'I build it and keep it', body: 'One person on site from first cut to final sweep, and a maintenance schedule afterward if you want one.' },
];
---
<BaseLayout transparentHeader>
  <Hero
    headline="Gardens, stonework, and grounds care for the Hudson Valley."
    lede="Ellis Vance designs, builds, and maintains outdoor space across Beacon, Cold Spring, Rhinebeck, New Paltz, Kingston, and Hudson. One person on every job, start to finish."
    imagePath="/images/hero.jpg"
    imageAlt="A dry-laid bluestone terrace edged with deep perennial planting in late afternoon light."
  />
  <OfferingStrip services={services} />
  <BeforeAfter
    title="The same side yard, eighteen months apart."
    project={{
      title: featured.data.title,
      town: featured.data.town,
      beforeImage: featured.data.beforeImage,
      beforeAlt: featured.data.beforeAlt,
      afterImage: featured.data.afterImage,
      afterAlt: featured.data.afterAlt,
    }}
  />
  <ProcessSteps steps={steps} />
  <SelectedWork projects={selected} />
  <Proof
    testimonial={{ quote: lead.data.quote, attribution: lead.data.attribution, town: lead.data.town }}
    credentials={siteConfig.business.credentials}
    yearsInBusiness={new Date().getFullYear() - siteConfig.business.foundedYear}
  />
  <ServiceAreaList areas={areas} />
  <ClosingCTA
    headline="Tell me about your property."
    body="Send a few photos and what is bothering you about the space. I answer every message myself, usually within a day."
  />
</BaseLayout>
```

- [ ] **Step 9: Run the tests**

Run: `npm run build && npx playwright test tests/e2e/home-narrative.spec.ts tests/e2e/home-offering.spec.ts tests/e2e/before-after.spec.ts`
Expected: PASS on both projects.

- [ ] **Step 10: Commit**

```bash
git add src/components/sections src/pages/index.astro tests/e2e/home-narrative.spec.ts
git commit -m "feat: complete the home page narrative"
```

---

### Task 15: Service pages

**Files:**
- Create: `src/pages/services/index.astro`, `src/pages/services/[slug].astro`
- Test: `tests/e2e/services.spec.ts`

**Interfaces:**
- Consumes: services collection (Task 5), `PageLayout` (Task 10), `resolveImage` (Task 11), `serviceJsonLd` + `faqJsonLd` + `breadcrumbJsonLd` (Task 8), `canonical` (Task 7).
- Produces: routes `/services` and `/services/{garden-design,patios-stonework,lawn-grounds-care,irrigation-drainage,seasonal-cleanup}`.

- [ ] **Step 1: Write the failing E2E test**

Create `tests/e2e/services.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const SLUGS = ['garden-design', 'patios-stonework', 'lawn-grounds-care', 'irrigation-drainage', 'seasonal-cleanup'];

test('the index lists every service', async ({ page }) => {
  await page.goto('/services');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  for (const slug of SLUGS) {
    await expect(page.locator(`a[href="/services/${slug}"]`).first()).toBeVisible();
  }
});

for (const slug of SLUGS) {
  test(`/services/${slug} renders content, steps, and FAQs`, async ({ page }) => {
    await page.goto(`/services/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: /how it works/i }).getByRole('listitem')).not.toHaveCount(0);
    await expect(page.getByRole('region', { name: /questions/i })).toBeVisible();
  });

  test(`/services/${slug} emits Service and FAQPage structured data`, async ({ page }) => {
    await page.goto(`/services/${slug}`);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map((block) => JSON.parse(block)['@type']);
    expect(types).toContain('Service');
    expect(types).toContain('FAQPage');
    expect(types).toContain('BreadcrumbList');
  });
}

test('each service page has a self-referential canonical', async ({ page }) => {
  await page.goto('/services/garden-design');
  const href = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(href).toBe('https://stonecroplandscape.com/services/garden-design');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/services.spec.ts --project=desktop`
Expected: FAIL — routes 404.

- [ ] **Step 3: Write the services index**

Create `src/pages/services/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import { Image } from 'astro:assets';
import PageLayout from '../../layouts/PageLayout.astro';
import Container from '../../components/primitives/Container.astro';
import ClosingCTA from '../../components/sections/ClosingCTA.astro';
import { resolveImage } from '../../lib/images';
import { breadcrumbJsonLd } from '../../lib/schema';
import { canonical } from '../../lib/seo';

const services = await Promise.all(
  (await getCollection('services'))
    .sort((a, b) => a.data.order - b.data.order)
    .map(async (service) => ({
      slug: service.id,
      data: service.data,
      image: await resolveImage(service.data.heroImage),
    })),
);

const jsonLd = breadcrumbJsonLd([
  { name: 'Home', url: canonical('/', Astro.site) },
  { name: 'Services', url: canonical('/services', Astro.site) },
]);
---
<PageLayout
  title="Five services, one person, start to finish."
  eyebrow="Services"
  lede="Design, build, and maintenance for Hudson Valley properties. Every job is quoted in writing and worked by the same person who quoted it."
  description="Garden design, patios and stonework, grounds care, irrigation and drainage, and seasonal cleanup across the Hudson Valley."
  jsonLd={jsonLd}
>
  <Container class="pb-24">
    <ul class="grid gap-14 md:grid-cols-2">
      {services.map((service) => (
        <li class="reveal">
          <a href={`/services/${service.slug}`} class="group block">
            <div class="overflow-hidden rounded-2xl bg-stone">
              <Image
                src={service.image}
                alt={service.data.heroAlt}
                widths={[480, 800, 1200]}
                sizes="(min-width: 768px) 45vw, 90vw"
                loading="lazy"
                class="aspect-[16/10] w-full object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
              />
            </div>
            <h2 class="mt-6 text-[length:var(--step-3)]">{service.data.title}</h2>
            <p class="mt-3 max-w-[46ch] text-ink-muted">{service.data.summary}</p>
            <p class="mt-4 text-moss">{service.data.startingPrice}</p>
          </a>
        </li>
      ))}
    </ul>
  </Container>

  <ClosingCTA
    headline="Not sure which one you need?"
    body="Most properties need two or three of these working together. Describe the space and I will tell you where to start."
  />
</PageLayout>
```

- [ ] **Step 4: Write the service detail route**

Create `src/pages/services/[slug].astro`:

```astro
---
import type { GetStaticPaths } from 'astro';
import { getCollection, render } from 'astro:content';
import { Image } from 'astro:assets';
import BaseLayout from '../../layouts/BaseLayout.astro';
import Container from '../../components/primitives/Container.astro';
import Eyebrow from '../../components/primitives/Eyebrow.astro';
import ClosingCTA from '../../components/sections/ClosingCTA.astro';
import { resolveImage } from '../../lib/images';
import { breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '../../lib/schema';
import { canonical } from '../../lib/seo';

export const getStaticPaths: GetStaticPaths = async () => {
  const services = await getCollection('services');
  return services.map((service) => ({ params: { slug: service.id }, props: { service } }));
};

const { service } = Astro.props;
const { Content } = await render(service);
const image = await resolveImage(service.data.heroImage);
const url = canonical(`/services/${service.id}`, Astro.site);

const areas = (await getCollection('areas')).sort((a, b) => a.data.order - b.data.order);
const towns = areas.map((area) => area.data.town);
const relatedAreas = areas.filter((area) => area.data.services.includes(service.id));

const jsonLd = [
  serviceJsonLd({ name: service.data.title, description: service.data.summary, url, areaServed: towns }),
  faqJsonLd(service.data.faqs),
  breadcrumbJsonLd([
    { name: 'Home', url: canonical('/', Astro.site) },
    { name: 'Services', url: canonical('/services', Astro.site) },
    { name: service.data.title, url },
  ]),
];
---
<BaseLayout title={service.data.title} description={service.data.summary} jsonLd={jsonLd}>
  <Container class="pb-14 pt-20 md:pt-28">
    <Eyebrow class="mb-5">Services</Eyebrow>
    <h1 class="max-w-[16ch] text-[length:var(--step-6)]">{service.data.title}</h1>
    <p class="mt-8 max-w-[var(--measure)] text-[length:var(--step-1)] text-ink-muted">{service.data.summary}</p>
    <p class="mt-6 text-[length:var(--step-1)] text-moss">{service.data.startingPrice}</p>
  </Container>

  <Container>
    <Image
      src={image}
      alt={service.data.heroAlt}
      widths={[640, 1024, 1600, 2000]}
      sizes="(min-width: 1280px) 1280px, 100vw"
      loading="eager"
      fetchpriority="high"
      class="aspect-[16/9] w-full rounded-3xl object-cover"
    />
  </Container>

  <Container width="text" class="prose-lg py-20 text-[length:var(--step-1)] text-ink-muted">
    <Content />
  </Container>

  <section aria-label="How it works" class="bg-paper-raised py-20 md:py-28">
    <Container>
      <Eyebrow>How it works</Eyebrow>
      <ol class="mt-12 grid gap-12 md:grid-cols-3 md:gap-10">
        {service.data.steps.map((step, index) => (
          <li class="reveal border-t border-stone pt-6">
            <span class="font-[family-name:var(--font-display)] text-[length:var(--step-3)] text-moss">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h2 class="mt-4 text-[length:var(--step-2)]">{step.title}</h2>
            <p class="mt-3 max-w-[38ch] text-ink-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </Container>
  </section>

  <section aria-label="Common questions" class="bg-paper py-20 md:py-28">
    <Container width="text">
      <Eyebrow>Common questions</Eyebrow>
      <dl class="mt-10 divide-y divide-stone border-t border-stone">
        {service.data.faqs.map((faq) => (
          <div class="py-7">
            <dt class="font-[family-name:var(--font-display)] text-[length:var(--step-2)]">{faq.question}</dt>
            <dd class="mt-3 text-ink-muted">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </Container>
  </section>

  {relatedAreas.length > 0 && (
    <section aria-label="Where I do this work" class="bg-paper-raised py-16">
      <Container>
        <Eyebrow>Where I do this work</Eyebrow>
        <ul class="mt-6 flex flex-wrap gap-3">
          {relatedAreas.map((area) => (
            <li>
              <a href={`/areas/${area.id}`} class="rounded-full border border-stone px-5 py-2 hover:border-ink">
                {area.data.town}, {area.data.state}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )}

  <ClosingCTA
    headline="Tell me about your property."
    body="Send a few photos and what is bothering you about the space. I answer every message myself, usually within a day."
  />
</BaseLayout>
```

The `relatedAreas` block builds the internal link graph that makes the area pages discoverable and credible to search engines, without any manual link maintenance.

- [ ] **Step 5: Run the tests**

Run: `npm run build && npx playwright test tests/e2e/services.spec.ts`
Expected: PASS, 12 tests per project.

- [ ] **Step 6: Commit**

```bash
git add src/pages/services tests/e2e/services.spec.ts
git commit -m "feat: generate service index and detail pages from content"
```

---

### Task 16: Service-area pages

**Files:**
- Create: `src/pages/areas/[slug].astro`
- Test: `tests/e2e/areas.spec.ts`

**Interfaces:**
- Consumes: areas, services, projects collections (Task 5); `PageLayout` (Task 10); `resolveImage` (Task 11); `serviceJsonLd` + `breadcrumbJsonLd` (Task 8).
- Produces: routes `/areas/{beacon,cold-spring,rhinebeck,new-paltz,kingston,hudson}`.

- [ ] **Step 1: Write the failing E2E test**

Create `tests/e2e/areas.spec.ts`. The duplicate-content assertion is the important one — it is the runtime counterpart to the schema guard from Task 4.

```ts
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
  });

  test(`/areas/${slug} shows a featured project and a local testimonial`, async ({ page }) => {
    await page.goto(`/areas/${slug}`);
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/areas.spec.ts --project=desktop`
Expected: FAIL — routes 404.

- [ ] **Step 3: Write the area route**

Create `src/pages/areas/[slug].astro`:

```astro
---
import type { GetStaticPaths } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { Image } from 'astro:assets';
import BaseLayout from '../../layouts/BaseLayout.astro';
import Container from '../../components/primitives/Container.astro';
import Eyebrow from '../../components/primitives/Eyebrow.astro';
import ClosingCTA from '../../components/sections/ClosingCTA.astro';
import { resolveImage } from '../../lib/images';
import { breadcrumbJsonLd, serviceJsonLd } from '../../lib/schema';
import { canonical } from '../../lib/seo';

export const getStaticPaths: GetStaticPaths = async () => {
  const areas = await getCollection('areas');
  return areas.map((area) => ({ params: { slug: area.id }, props: { area } }));
};

const { area } = Astro.props;
const url = canonical(`/areas/${area.id}`, Astro.site);

const project = await getEntry('projects', area.data.featuredProjectSlug);
if (!project) {
  throw new Error(`Area "${area.id}" references missing project "${area.data.featuredProjectSlug}".`);
}
const projectImage = await resolveImage(project.data.afterImage);

const allServices = await getCollection('services');
const services = area.data.services
  .map((slug) => allServices.find((service) => service.id === slug))
  .filter((service): service is NonNullable<typeof service> => Boolean(service));

const jsonLd = [
  serviceJsonLd({
    name: `Landscaping in ${area.data.town}, ${area.data.state}`,
    description: area.data.summary,
    url,
    areaServed: [area.data.town],
  }),
  breadcrumbJsonLd([
    { name: 'Home', url: canonical('/', Astro.site) },
    { name: area.data.town, url },
  ]),
];
---
<BaseLayout title={area.data.headline} description={area.data.summary} jsonLd={jsonLd}>
  <Container class="pb-14 pt-20 md:pt-28">
    <Eyebrow class="mb-5">Service area</Eyebrow>
    <h1 class="max-w-[16ch] text-[length:var(--step-6)]">{area.data.headline}</h1>
    <p class="mt-8 max-w-[var(--measure)] text-[length:var(--step-1)] text-ink-muted">{area.data.summary}</p>
  </Container>

  <section aria-label="Local conditions" class="bg-paper-raised py-20">
    <Container width="text">
      <Eyebrow>What {area.data.town} properties need</Eyebrow>
      <p class="mt-6 text-[length:var(--step-1)] leading-relaxed">{area.data.localNote}</p>
    </Container>
  </section>

  <section aria-label="Services offered here" class="bg-paper py-20">
    <Container>
      <Eyebrow>What I do in {area.data.town}</Eyebrow>
      <ul class="mt-10 grid gap-8 md:grid-cols-3">
        {services.map((service) => (
          <li class="reveal border-t border-stone pt-6">
            <h2 class="text-[length:var(--step-2)]">
              <a href={`/services/${service.id}`} class="hover:text-moss">{service.data.title}</a>
            </h2>
            <p class="mt-3 text-ink-muted">{service.data.summary}</p>
          </li>
        ))}
      </ul>
    </Container>
  </section>

  <section aria-label="Featured project" class="bg-paper-raised py-20">
    <Container>
      <Eyebrow>Recent work nearby</Eyebrow>
      <a href={`/work/${project.id}`} class="group mt-8 grid gap-10 md:grid-cols-2 md:items-center">
        <div class="overflow-hidden rounded-2xl bg-stone">
          <Image
            src={projectImage}
            alt={project.data.afterAlt}
            widths={[480, 800, 1200]}
            sizes="(min-width: 768px) 45vw, 90vw"
            loading="lazy"
            class="aspect-[4/3] w-full object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
          />
        </div>
        <div>
          <h2 class="text-[length:var(--step-3)]">{project.data.title}</h2>
          <p class="mt-2 text-[length:var(--step--1)] text-ink-muted">{project.data.town} — {project.data.year}</p>
          <p class="mt-4 max-w-[42ch] text-ink-muted">{project.data.summary}</p>
        </div>
      </a>
    </Container>
  </section>

  <section aria-label="Neighborhoods served" class="bg-paper py-16">
    <Container>
      <Eyebrow>Neighborhoods</Eyebrow>
      <ul class="mt-6 flex flex-wrap gap-3">
        {area.data.neighborhoods.map((neighborhood) => (
          <li class="rounded-full border border-stone px-5 py-2 text-ink-muted">{neighborhood}</li>
        ))}
      </ul>
    </Container>
  </section>

  <section aria-label="Local testimonial" class="bg-moss py-20 text-paper">
    <Container width="text">
      <figure>
        <blockquote class="font-[family-name:var(--font-display)] text-[length:var(--step-4)] leading-[1.15]">
          &ldquo;{area.data.localTestimonial.quote}&rdquo;
        </blockquote>
        <figcaption class="mt-8 opacity-80">
          {area.data.localTestimonial.attribution}, {area.data.localTestimonial.town}
        </figcaption>
      </figure>
    </Container>
  </section>

  <ClosingCTA
    headline={`Working in ${area.data.town} this season.`}
    body="Send a few photos and what is bothering you about the space. I answer every message myself, usually within a day."
  />
</BaseLayout>
```

- [ ] **Step 4: Run the tests**

Run: `npm run build && npx playwright test tests/e2e/areas.spec.ts`
Expected: PASS, 14 tests per project. `/work/[slug]` links 404 until Task 17; the assertions only check the link exists, so they pass now.

- [ ] **Step 5: Commit**

```bash
git add src/pages/areas tests/e2e/areas.spec.ts
git commit -m "feat: generate service-area pages with required local content"
```

---

### Task 17: Work index and case studies

**Files:**
- Create: `src/pages/work/index.astro`, `src/pages/work/[slug].astro`
- Test: `tests/e2e/work.spec.ts`

**Interfaces:**
- Consumes: projects and services collections (Task 5); `resolveImage` (Task 11); `breadcrumbJsonLd` (Task 8).
- Produces: routes `/work` and `/work/{tioronda-terrace,chestnut-ridge-garden,rhinebeck-farmhouse-grounds,wallkill-drainage,kingston-stoop-steps,hudson-courtyard}`.

- [ ] **Step 1: Write the failing E2E test**

Create `tests/e2e/work.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const SLUGS = [
  'tioronda-terrace',
  'chestnut-ridge-garden',
  'rhinebeck-farmhouse-grounds',
  'wallkill-drainage',
  'kingston-stoop-steps',
  'hudson-courtyard',
];

test('the index lists every project', async ({ page }) => {
  await page.goto('/work');
  for (const slug of SLUGS) {
    await expect(page.locator(`a[href="/work/${slug}"]`).first()).toBeVisible();
  }
});

test('the index filters by service', async ({ page }) => {
  await page.goto('/work');
  const filters = page.getByRole('region', { name: /filter/i }).getByRole('link');
  await expect(filters).not.toHaveCount(0);
});

for (const slug of SLUGS) {
  test(`/work/${slug} shows before and after with scope`, async ({ page }) => {
    await page.goto(`/work/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const comparison = page.getByRole('region', { name: /before and after/i });
    await expect(comparison.locator('img')).toHaveCount(2);

    await expect(page.getByRole('region', { name: /scope/i }).getByRole('listitem')).not.toHaveCount(0);
    await expect(page.locator('a[href^="/services/"]').first()).toBeVisible();
  });
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/work.spec.ts --project=desktop`
Expected: FAIL — routes 404.

- [ ] **Step 3: Write the work index**

Create `src/pages/work/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import { Image } from 'astro:assets';
import PageLayout from '../../layouts/PageLayout.astro';
import Container from '../../components/primitives/Container.astro';
import Eyebrow from '../../components/primitives/Eyebrow.astro';
import ClosingCTA from '../../components/sections/ClosingCTA.astro';
import { resolveImage } from '../../lib/images';
import { breadcrumbJsonLd } from '../../lib/schema';
import { canonical } from '../../lib/seo';

const services = (await getCollection('services')).sort((a, b) => a.data.order - b.data.order);

const projects = await Promise.all(
  (await getCollection('projects'))
    .sort((a, b) => a.data.order - b.data.order)
    .map(async (project) => ({
      slug: project.id,
      data: project.data,
      image: await resolveImage(project.data.afterImage),
    })),
);

const jsonLd = breadcrumbJsonLd([
  { name: 'Home', url: canonical('/', Astro.site) },
  { name: 'Work', url: canonical('/work', Astro.site) },
]);
---
<PageLayout
  title="Properties I have worked on."
  eyebrow="Work"
  lede="Six projects across the Hudson Valley, each one worked start to finish by the same person who quoted it."
  description="Selected landscape, stonework, and drainage projects across Beacon, Cold Spring, Rhinebeck, New Paltz, Kingston, and Hudson."
  jsonLd={jsonLd}
>
  <section aria-label="Filter by service" class="border-y border-stone py-6">
    <Container>
      <ul class="flex flex-wrap gap-3">
        {services.map((service) => (
          <li>
            <a href={`/services/${service.id}`} class="rounded-full border border-stone px-5 py-2 text-[length:var(--step--1)] hover:border-ink">
              {service.data.title}
            </a>
          </li>
        ))}
      </ul>
    </Container>
  </section>

  <Container class="py-20">
    <ul class="grid gap-14 md:grid-cols-2">
      {projects.map((project) => (
        <li class="reveal">
          <a href={`/work/${project.slug}`} class="group block">
            <div class="overflow-hidden rounded-2xl bg-stone">
              <Image
                src={project.image}
                alt={project.data.afterAlt}
                widths={[480, 800, 1200]}
                sizes="(min-width: 768px) 45vw, 90vw"
                loading="lazy"
                class="aspect-[4/3] w-full object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
              />
            </div>
            <h2 class="mt-6 text-[length:var(--step-3)]">{project.data.title}</h2>
            <p class="mt-1 text-[length:var(--step--1)] text-ink-muted">{project.data.town} — {project.data.year}</p>
            <p class="mt-3 max-w-[44ch] text-ink-muted">{project.data.summary}</p>
          </a>
        </li>
      ))}
    </ul>
  </Container>

  <ClosingCTA
    headline="Your property could be next."
    body="Send a few photos and what is bothering you about the space. I answer every message myself, usually within a day."
  />
</PageLayout>
```

- [ ] **Step 4: Write the case-study route**

Create `src/pages/work/[slug].astro`:

```astro
---
import type { GetStaticPaths } from 'astro';
import { getCollection, getEntry, render } from 'astro:content';
import { Image } from 'astro:assets';
import BaseLayout from '../../layouts/BaseLayout.astro';
import Container from '../../components/primitives/Container.astro';
import Eyebrow from '../../components/primitives/Eyebrow.astro';
import ClosingCTA from '../../components/sections/ClosingCTA.astro';
import { resolveImage } from '../../lib/images';
import { breadcrumbJsonLd } from '../../lib/schema';
import { canonical } from '../../lib/seo';

export const getStaticPaths: GetStaticPaths = async () => {
  const projects = await getCollection('projects');
  return projects.map((project) => ({ params: { slug: project.id }, props: { project } }));
};

const { project } = Astro.props;
const { Content } = await render(project);

const before = await resolveImage(project.data.beforeImage);
const after = await resolveImage(project.data.afterImage);
const service = await getEntry('services', project.data.service);
if (!service) {
  throw new Error(`Project "${project.id}" references missing service "${project.data.service}".`);
}

const url = canonical(`/work/${project.id}`, Astro.site);
const jsonLd = breadcrumbJsonLd([
  { name: 'Home', url: canonical('/', Astro.site) },
  { name: 'Work', url: canonical('/work', Astro.site) },
  { name: project.data.title, url },
]);

const shared = { widths: [480, 800, 1400], sizes: '(min-width: 768px) 45vw, 90vw', loading: 'lazy' as const };
---
<BaseLayout title={project.data.title} description={project.data.summary} jsonLd={jsonLd}>
  <Container class="pb-14 pt-20 md:pt-28">
    <Eyebrow class="mb-5">Work</Eyebrow>
    <h1 class="max-w-[16ch] text-[length:var(--step-6)]">{project.data.title}</h1>
    <p class="mt-6 text-[length:var(--step-0)] text-ink-muted">
      {project.data.town} — {project.data.year} —
      <a href={`/services/${service.id}`} class="text-moss underline underline-offset-4">{service.data.title}</a>
    </p>
    <p class="mt-8 max-w-[var(--measure)] text-[length:var(--step-1)] text-ink-muted">{project.data.summary}</p>
  </Container>

  <section aria-label="Before and after" class="bg-paper-raised py-16">
    <Container>
      <div class="grid gap-6 md:grid-cols-2">
        <figure>
          <Image src={before} alt={project.data.beforeAlt} {...shared} class="aspect-[4/3] w-full rounded-2xl object-cover" />
          <figcaption class="mt-3 text-[length:var(--step--1)] text-ink-muted">Before</figcaption>
        </figure>
        <figure>
          <Image src={after} alt={project.data.afterAlt} {...shared} class="aspect-[4/3] w-full rounded-2xl object-cover" />
          <figcaption class="mt-3 text-[length:var(--step--1)] text-ink-muted">After</figcaption>
        </figure>
      </div>
    </Container>
  </section>

  <section aria-label="Scope of work" class="bg-paper py-20">
    <Container width="text">
      <Eyebrow>Scope of work</Eyebrow>
      <ul class="mt-8 divide-y divide-stone border-t border-stone">
        {project.data.scope.map((item) => (
          <li class="py-4 text-[length:var(--step-1)]">{item}</li>
        ))}
      </ul>
      <div class="mt-12 text-ink-muted"><Content /></div>
    </Container>
  </section>

  <ClosingCTA
    headline="Tell me about your property."
    body="Send a few photos and what is bothering you about the space. I answer every message myself, usually within a day."
  />
</BaseLayout>
```

- [ ] **Step 5: Run the tests**

Run: `npm run build && npx playwright test tests/e2e/work.spec.ts tests/e2e/areas.spec.ts`
Expected: PASS on both projects.

- [ ] **Step 6: Commit**

```bash
git add src/pages/work tests/e2e/work.spec.ts
git commit -m "feat: generate work index and project case studies"
```

---

### Task 18: About page and 404

**Files:**
- Create: `src/pages/about.astro`, `src/pages/404.astro`
- Test: `tests/e2e/about.spec.ts`

**Interfaces:**
- Consumes: `PageLayout` (Task 10), `siteConfig` (Task 2), `resolveImage` (Task 11), testimonials collection (Task 5).
- Produces: routes `/about` and `/404`.

- [ ] **Step 1: Write the failing E2E test**

Create `tests/e2e/about.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('the about page names the operator and lists credentials', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: /credentials/i }).getByRole('listitem')).not.toHaveCount(0);
  await expect(page.getByRole('region', { name: /portrait/i }).locator('img')).toHaveCount(1);
});

test('the about page shows every testimonial', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('region', { name: /what clients say/i }).locator('blockquote')).toHaveCount(4);
});

test('an unknown URL renders the 404 page with a route home', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: /home/i }).first()).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/about.spec.ts --project=desktop`
Expected: FAIL — `/about` 404s.

- [ ] **Step 3: Write the about page**

Create `src/pages/about.astro`:

```astro
---
import { getCollection } from 'astro:content';
import { Image } from 'astro:assets';
import siteConfig from '../../site.config';
import PageLayout from '../layouts/PageLayout.astro';
import Container from '../components/primitives/Container.astro';
import Eyebrow from '../components/primitives/Eyebrow.astro';
import ClosingCTA from '../components/sections/ClosingCTA.astro';
import { resolveImage } from '../lib/images';
import { breadcrumbJsonLd } from '../lib/schema';
import { canonical } from '../lib/seo';

const portrait = await resolveImage('/images/about-portrait.jpg');
const testimonials = (await getCollection('testimonials')).sort((a, b) => a.data.order - b.data.order);
const years = new Date().getFullYear() - siteConfig.business.foundedYear;

const jsonLd = breadcrumbJsonLd([
  { name: 'Home', url: canonical('/', Astro.site) },
  { name: 'About', url: canonical('/about', Astro.site) },
]);
---
<PageLayout
  title={`${siteConfig.business.operator}, and nobody else.`}
  eyebrow="About"
  lede={`${years} years working Hudson Valley properties. I quote the job, I do the job, and I am the person you call afterward.`}
  description={`${siteConfig.business.operator} is a solo landscape designer and builder working across the Hudson Valley.`}
  jsonLd={jsonLd}
>
  <section aria-label="Portrait" class="bg-paper py-8">
    <Container>
      <Image
        src={portrait}
        alt={`${siteConfig.business.operator} standing in a garden bed with hand tools.`}
        widths={[480, 800, 1200]}
        sizes="(min-width: 768px) 50vw, 90vw"
        loading="lazy"
        class="aspect-[4/5] w-full max-w-xl rounded-3xl object-cover"
      />
    </Container>
  </section>

  <Container width="text" class="py-16 text-[length:var(--step-1)] text-ink-muted">
    <p>
      Most landscape companies solve the scheduling problem by adding crews. That works, and it is
      why the person who walked your property is rarely the person who shows up to work on it.
    </p>
    <p class="mt-6">
      I solved it differently: I cap the number of properties I take. Twelve maintenance clients,
      and a handful of design and stonework projects a year. It means I turn work away, and it means
      I can prune a shrub on the shrub's schedule instead of the route's.
    </p>
    <p class="mt-6">
      I trained in horticulture before I trained in stonework, which shapes the order I do things in.
      Water first, then soil, then plants, then stone. Skipping that order is why most landscapes
      start failing in year three.
    </p>
  </Container>

  <section aria-label="Credentials" class="bg-paper-raised py-16">
    <Container>
      <Eyebrow>Credentials</Eyebrow>
      <ul class="mt-8 divide-y divide-stone border-t border-stone">
        <li class="py-5 text-[length:var(--step-1)]">Working in the Hudson Valley since {siteConfig.business.foundedYear}</li>
        {siteConfig.business.credentials.map((credential) => (
          <li class="py-5 text-[length:var(--step-1)]">{credential}</li>
        ))}
      </ul>
    </Container>
  </section>

  <section aria-label="What clients say" class="bg-paper py-20">
    <Container>
      <Eyebrow>What clients say</Eyebrow>
      <ul class="mt-10 grid gap-10 md:grid-cols-2">
        {testimonials.map((testimonial) => (
          <li class="reveal border-t border-stone pt-6">
            <figure>
              <blockquote class="text-[length:var(--step-1)]">&ldquo;{testimonial.data.quote}&rdquo;</blockquote>
              <figcaption class="mt-4 text-[length:var(--step--1)] text-ink-muted">
                {testimonial.data.attribution}, {testimonial.data.town}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Container>
  </section>

  <ClosingCTA
    headline="Tell me about your property."
    body="Send a few photos and what is bothering you about the space. I answer every message myself, usually within a day."
  />
</PageLayout>
```

- [ ] **Step 4: Write the 404 page**

Create `src/pages/404.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Container from '../components/primitives/Container.astro';
import Button from '../components/primitives/Button.astro';
---
<BaseLayout title="Page not found" noindex>
  <Container width="text" class="py-32 text-center">
    <h1 class="text-[length:var(--step-5)]">That page is not here.</h1>
    <p class="mt-6 text-[length:var(--step-1)] text-ink-muted">
      It may have moved, or the link may be wrong. The work, services, and contact pages are all still where they were.
    </p>
    <div class="mt-10 flex justify-center gap-4">
      <Button href="/">Back home</Button>
      <Button href="/services" variant="ghost">See services</Button>
    </div>
  </Container>
</BaseLayout>
```

- [ ] **Step 5: Run the tests**

Run: `npm run build && npx playwright test tests/e2e/about.spec.ts tests/e2e/navigation.spec.ts`
Expected: PASS. The Task 10 navigation suite goes fully green here — every page it referenced now exists.

- [ ] **Step 6: Commit**

```bash
git add src/pages/about.astro src/pages/404.astro tests/e2e/about.spec.ts
git commit -m "feat: add about page and 404"
```

---

### Task 19: Contact page and submission endpoint

**Files:**
- Create: `src/lib/contact.ts`, `src/pages/api/contact.ts`, `src/pages/contact.astro`
- Test: `tests/unit/contact.test.ts`, `tests/e2e/contact.spec.ts`

**Interfaces:**
- Consumes: `siteConfig` (Task 2), `PageLayout` (Task 10), areas collection (Task 5).
- Produces:
  - `contactSchema` — Zod schema for a submission.
  - `parseSubmission(form: FormData, now: number): { ok: true; data: ContactSubmission } | { ok: false; errors: Record<string, string> }` — validation plus both spam checks.
  - `POST /api/contact` — the only on-demand route in the site.
  - Route `/contact`.

Two spam defenses, both invisible to real users: a honeypot field named `company` that is hidden from humans and irresistible to bots, and a minimum fill time of 3 seconds carried in a hidden `startedAt` timestamp.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/contact.test.ts`:

```ts
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

  it('allows an empty phone number', () => {
    expect(parseSubmission(form({ phone: '' }), NOW).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/contact.test.ts`
Expected: FAIL — cannot resolve `src/lib/contact`.

- [ ] **Step 3: Write the validation module**

Create `src/lib/contact.ts`:

```ts
import { z } from 'astro/zod';

export const MIN_FILL_MS = 3_000;

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.'),
  email: z.string().trim().email('Please enter a valid email address.'),
  phone: z.string().trim().optional().default(''),
  town: z.string().trim().min(2, 'Please tell me which town the property is in.'),
  service: z.string().trim().min(1, 'Please choose what you need.'),
  message: z.string().trim().min(20, 'Please add a sentence or two about the property.'),
});

export type ContactSubmission = z.infer<typeof contactSchema>;

export type ParseResult =
  | { ok: true; data: ContactSubmission }
  | { ok: false; errors: Record<string, string> };

const GENERIC_REJECTION = 'This message could not be submitted. Please call instead.';

export function parseSubmission(form: FormData, now: number): ParseResult {
  if (String(form.get('company') ?? '').trim() !== '') {
    return { ok: false, errors: { form: GENERIC_REJECTION } };
  }

  const startedAt = Number(form.get('startedAt'));
  if (!Number.isFinite(startedAt) || now - startedAt < MIN_FILL_MS) {
    return { ok: false, errors: { form: GENERIC_REJECTION } };
  }

  const parsed = contactSchema.safeParse({
    name: form.get('name') ?? '',
    email: form.get('email') ?? '',
    phone: form.get('phone') ?? '',
    town: form.get('town') ?? '',
    service: form.get('service') ?? '',
    message: form.get('message') ?? '',
  });

  if (parsed.success) return { ok: true, data: parsed.data };

  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? 'form');
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}
```

Both spam rejections return the same generic message. Telling a bot *which* check it failed is telling it how to pass next time.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/contact.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write the endpoint**

Create `src/pages/api/contact.ts`:

```ts
import type { APIRoute } from 'astro';
import { parseSubmission } from '../../lib/contact';

export const prerender = false;

function html(status: number, heading: string, body: string): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${heading}</title>
     <meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
     <style>body{font-family:system-ui,sans-serif;background:#FAF9F6;color:#16181A;margin:0;
     display:grid;place-items:center;min-height:100dvh;padding:2rem;text-align:center}
     a{color:#3F5641}</style></head>
     <body><main><h1>${heading}</h1><p>${body}</p><p><a href="/contact">Back to the contact page</a></p></main></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const result = parseSubmission(form, Date.now());
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');

  if (!result.ok) {
    return wantsJson
      ? new Response(JSON.stringify({ ok: false, errors: result.errors }), {
          status: 422,
          headers: { 'content-type': 'application/json' },
        })
      : html(422, 'That message did not go through', Object.values(result.errors)[0] ?? 'Please check the form and try again.');
  }

  // INTEGRATION POINT — email delivery.
  // Replace this log with the provider call once an API key exists, e.g.:
  //   await new Resend(import.meta.env.RESEND_API_KEY).emails.send({ ... });
  // Everything above this line is complete and tested; only the delivery hop is deferred.
  console.info('[contact] validated submission', {
    ...result.data,
    receivedAt: new Date().toISOString(),
  });

  return wantsJson
    ? new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } })
    : html(200, 'Thank you — your message is in', 'I read every message myself and usually reply within a day.');
};
```

- [ ] **Step 6: Write the failing E2E test**

Create `tests/e2e/contact.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('shows validation errors for an empty form', async ({ page }) => {
  await page.goto('/contact');
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

  await page.waitForTimeout(3200); // clears the minimum fill-time check
  await page.getByRole('button', { name: /send/i }).click();

  await expect(page.getByRole('status')).toContainText(/thank you/i);
});

test('rejects a honeypot submission at the endpoint', async ({ request }) => {
  const response = await request.post('/api/contact', {
    headers: { accept: 'application/json' },
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
    headers: { accept: 'application/json' },
    form: {
      name: 'Bot', email: 'bot@example.com', phone: '', town: 'Beacon',
      service: 'garden-design', message: 'A perfectly plausible looking message body.',
      company: '', startedAt: String(Date.now()),
    },
  });
  expect(response.status()).toBe(422);
});

test('the form works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/contact');
  await expect(page.locator('form')).toHaveAttribute('action', '/api/contact');
  await expect(page.locator('form')).toHaveAttribute('method', /post/i);
  await context.close();
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/contact.spec.ts --project=desktop`
Expected: FAIL — `/contact` 404s.

- [ ] **Step 8: Write the contact page**

Create `src/pages/contact.astro`:

```astro
---
import { getCollection } from 'astro:content';
import siteConfig from '../../site.config';
import PageLayout from '../layouts/PageLayout.astro';
import Container from '../components/primitives/Container.astro';
import Eyebrow from '../components/primitives/Eyebrow.astro';
import { breadcrumbJsonLd } from '../lib/schema';
import { canonical } from '../lib/seo';

const services = (await getCollection('services')).sort((a, b) => a.data.order - b.data.order);
const areas = (await getCollection('areas')).sort((a, b) => a.data.order - b.data.order);

const jsonLd = breadcrumbJsonLd([
  { name: 'Home', url: canonical('/', Astro.site) },
  { name: 'Contact', url: canonical('/contact', Astro.site) },
]);

const field = 'mt-2 w-full rounded-xl border border-stone bg-paper-raised px-4 py-3 text-[length:var(--step-0)] focus:border-moss';
const label = 'block text-[length:var(--step--1)] font-medium';
const error = 'mt-2 block text-[length:var(--step--1)] text-moss-deep';
---
<PageLayout
  title="Tell me about your property."
  eyebrow="Contact"
  lede="Send a few photos and what is bothering you about the space. I answer every message myself, usually within a day."
  description="Request a landscape quote from Ellis Vance across Beacon, Cold Spring, Rhinebeck, New Paltz, Kingston, and Hudson."
  jsonLd={jsonLd}
>
  <Container class="pb-24">
    <div class="grid gap-16 md:grid-cols-[3fr_2fr]">
      <form id="contact-form" action="/api/contact" method="post" novalidate class="space-y-7">
        <p role="status" aria-live="polite" id="form-status" class="hidden rounded-xl bg-moss px-5 py-4 text-paper"></p>
        <p id="form-error" class="hidden text-moss-deep"></p>

        <div>
          <label class={label} for="name">Your name</label>
          <input class={field} id="name" name="name" type="text" autocomplete="name" required />
          <span class={`${error} hidden`} data-error-for="name"></span>
        </div>

        <div class="grid gap-7 sm:grid-cols-2">
          <div>
            <label class={label} for="email">Email</label>
            <input class={field} id="email" name="email" type="email" autocomplete="email" required />
            <span class={`${error} hidden`} data-error-for="email"></span>
          </div>
          <div>
            <label class={label} for="phone">Phone <span class="text-ink-muted">(optional)</span></label>
            <input class={field} id="phone" name="phone" type="tel" autocomplete="tel" />
          </div>
        </div>

        <div class="grid gap-7 sm:grid-cols-2">
          <div>
            <label class={label} for="town">Town</label>
            <input class={field} id="town" name="town" type="text" list="towns" required />
            <datalist id="towns">{areas.map((area) => <option value={area.data.town} />)}</datalist>
            <span class={`${error} hidden`} data-error-for="town"></span>
          </div>
          <div>
            <label class={label} for="service">What do you need?</label>
            <select class={field} id="service" name="service" required>
              <option value="">Choose one</option>
              {services.map((service) => <option value={service.id}>{service.data.title}</option>)}
              <option value="not-sure">Not sure yet</option>
            </select>
            <span class={`${error} hidden`} data-error-for="service"></span>
          </div>
        </div>

        <div>
          <label class={label} for="message">About the property</label>
          <textarea class={field} id="message" name="message" rows="6" required></textarea>
          <span class={`${error} hidden`} data-error-for="message"></span>
        </div>

        <!-- Honeypot: positioned off-screen rather than display:none, which some bots detect. -->
        <div class="absolute left-[-9999px]" aria-hidden="true">
          <label for="company">Company</label>
          <input id="company" name="company" type="text" tabindex="-1" autocomplete="off" />
        </div>
        <input type="hidden" name="startedAt" id="startedAt" value="0" />

        <button
          type="submit"
          class="rounded-full bg-moss px-8 py-4 text-[length:var(--step-0)] font-medium text-paper transition-colors duration-[var(--dur-fast)] hover:bg-moss-deep"
        >
          Send message
        </button>
      </form>

      <aside class="space-y-10">
        <div>
          <Eyebrow>Call or email</Eyebrow>
          <a href={siteConfig.business.phoneHref} class="mt-4 block text-[length:var(--step-2)] text-moss">
            {siteConfig.business.phone}
          </a>
          <a href={`mailto:${siteConfig.business.email}`} class="block text-ink-muted">{siteConfig.business.email}</a>
        </div>
        <div>
          <Eyebrow>Hours</Eyebrow>
          <ul class="mt-4 space-y-1 text-ink-muted">
            {siteConfig.business.hours.map((line) => <li>{line}</li>)}
          </ul>
        </div>
        <div>
          <Eyebrow>Service area</Eyebrow>
          <ul class="mt-4 space-y-1">
            {areas.map((area) => (
              <li><a href={`/areas/${area.id}`} class="text-ink-muted hover:text-moss">{area.data.town}, {area.data.state}</a></li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  </Container>
</PageLayout>

<script>
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  const started = document.getElementById('startedAt') as HTMLInputElement | null;
  const status = document.getElementById('form-status');
  const formError = document.getElementById('form-error');
  if (form && started && status && formError) {
    started.value = String(Date.now());

    const showErrors = (errors: Record<string, string>) => {
      form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((node) => {
        node.textContent = '';
        node.classList.add('hidden');
      });
      formError.classList.add('hidden');

      for (const [field, message] of Object.entries(errors)) {
        const node = form.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
        if (node) {
          node.textContent = message;
          node.classList.remove('hidden');
        } else {
          formError.textContent = message;
          formError.classList.remove('hidden');
        }
      }
      const first = form.querySelector<HTMLElement>('[data-error-for]:not(.hidden)');
      first?.previousElementSibling?.scrollIntoView({ block: 'center' });
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { accept: 'application/json' },
        body: new FormData(form),
      });
      const payload = await response.json();

      if (payload.ok) {
        form.reset();
        started.value = String(Date.now());
        showErrors({});
        status.textContent = 'Thank you — your message is in. I usually reply within a day.';
        status.classList.remove('hidden');
      } else {
        status.classList.add('hidden');
        showErrors(payload.errors ?? { form: 'Something went wrong. Please call instead.' });
      }
    });
  }
</script>
```

Without JavaScript the form is a plain `POST` to `/api/contact` and the endpoint returns a real confirmation page. With JavaScript it submits in place and renders errors per field. The `novalidate` attribute hands validation to one implementation instead of two competing ones.

- [ ] **Step 9: Run the tests**

Run: `npm run build && npx playwright test tests/e2e/contact.spec.ts`
Expected: PASS, 5 tests per project.

- [ ] **Step 10: Commit**

```bash
git add src/lib/contact.ts src/pages/api src/pages/contact.astro tests/unit/contact.test.ts tests/e2e/contact.spec.ts
git commit -m "feat: add contact form with validation and spam defenses"
```

---

### Task 20: Robots, route manifest, and the accessibility sweep

**Files:**
- Create: `src/pages/robots.txt.ts`, `tests/e2e/routes.ts`, `tests/e2e/routes.spec.ts`, `tests/e2e/accessibility.spec.ts`
- Test: both new spec files

**Interfaces:**
- Consumes: every route from Tasks 12-19.
- Produces: `ROUTES` — a `const` array exported from `tests/e2e/routes.ts` (a plain module, **not** a spec file) listing all 23 HTML routes. Both `routes.spec.ts` and `accessibility.spec.ts` import it, so the two suites can never drift apart.

`ROUTES` lives in its own module because importing one `.spec.ts` from another
registers its tests twice — once per importing file — which inflates the run and
makes failures report against the wrong file.

- [ ] **Step 1: Write robots.txt**

Create `src/pages/robots.txt.ts`:

```ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site ?? 'https://stonecroplandscape.com').href;
  return new Response(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${sitemap}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
```

- [ ] **Step 2: Write the failing route manifest test**

First create the shared manifest, `tests/e2e/routes.ts`:

```ts
export const ROUTES = [
  '/',
  '/services',
  '/services/garden-design',
  '/services/patios-stonework',
  '/services/lawn-grounds-care',
  '/services/irrigation-drainage',
  '/services/seasonal-cleanup',
  '/work',
  '/work/tioronda-terrace',
  '/work/chestnut-ridge-garden',
  '/work/rhinebeck-farmhouse-grounds',
  '/work/wallkill-drainage',
  '/work/kingston-stoop-steps',
  '/work/hudson-courtyard',
  '/areas/beacon',
  '/areas/cold-spring',
  '/areas/rhinebeck',
  '/areas/new-paltz',
  '/areas/kingston',
  '/areas/hudson',
  '/about',
  '/contact',
  '/404',
] as const;
```

Then create `tests/e2e/routes.spec.ts`. On a site where most pages are generated,
this is the single highest-value test: it catches a broken `getStaticPaths`
immediately instead of on a page nobody visits for months.

```ts
import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';

test('the manifest covers every expected page', () => {
  expect(ROUTES).toHaveLength(23);
});

for (const route of ROUTES) {
  test(`${route} responds and renders a single h1`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(route === '/404' ? 404 : 200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });
}

for (const route of ROUTES) {
  test(`${route} declares a canonical URL and a description`, async ({ page }) => {
    await page.goto(route);
    if (route !== '/404') {
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    }
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description, route).toBeTruthy();
  });
}

test('robots.txt points at the sitemap and blocks the API', async ({ request }) => {
  const body = await (await request.get('/robots.txt')).text();
  expect(body).toContain('Sitemap: https://stonecroplandscape.com/sitemap-index.xml');
  expect(body).toContain('Disallow: /api/');
});

test('the sitemap index is generated', async ({ request }) => {
  expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
});
```

- [ ] **Step 3: Run it**

Run: `npm run build && npx playwright test tests/e2e/routes.spec.ts --project=desktop`
Expected: PASS, 49 tests. Any failure names the exact broken route.

- [ ] **Step 4: Write the failing accessibility test**

Create `tests/e2e/accessibility.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';

for (const route of ROUTES) {
  test(`${route} has no accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`),
      route,
    ).toEqual([]);
  });
}

test('all content stays visible with motion reduced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const reveals = page.locator('.reveal');
  const count = await reveals.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    await expect(reveals.nth(i)).toBeVisible();
    await expect(reveals.nth(i)).toHaveCSS('opacity', '1');
  }
});

test('every image on the home page has an alt attribute', async ({ page }) => {
  await page.goto('/');
  const missing = await page.locator('img:not([alt])').count();
  expect(missing).toBe(0);
});
```

- [ ] **Step 5: Run it and fix what it finds**

Run: `npx playwright test tests/e2e/accessibility.spec.ts --project=desktop`
Expected: PASS, 26 tests. If a violation appears, fix the component that causes it — do not narrow the axe tag list to make it pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/robots.txt.ts tests/e2e/routes.ts tests/e2e/routes.spec.ts tests/e2e/accessibility.spec.ts
git commit -m "test: add route manifest and accessibility sweeps"
```

---

### Task 21: Performance budget

**Files:**
- Create: `lighthouserc.json`, `.github/workflows/ci.yml`
- Modify: `package.json`, `README.md`

**Interfaces:**
- Consumes: the built site from every prior task.
- Produces: `npm run test:perf`, and a CI workflow running unit, build, E2E, and Lighthouse in that order.

- [ ] **Step 1: Write the Lighthouse configuration**

Create `lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "url": [
        "http://localhost/index.html",
        "http://localhost/services/index.html",
        "http://localhost/services/patios-stonework/index.html",
        "http://localhost/areas/beacon/index.html",
        "http://localhost/work/tioronda-terrace/index.html",
        "http://localhost/contact/index.html"
      ],
      "numberOfRuns": 3,
      "settings": { "preset": "desktop" }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 1 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 1 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.05 }],
        "total-blocking-time": ["error", { "maxNumericValue": 150 }],
        "unused-javascript": ["warn", { "maxNumericValue": 20000 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

- [ ] **Step 2: Add the script**

Add to `package.json` `"scripts"`:

```json
{ "test:perf": "lhci autorun" }
```

- [ ] **Step 3: Run it**

```bash
npm run build
npm run test:perf
```

Expected: all assertions pass. If LCP misses, check that the hero `<Image>` still carries `loading="eager"` and `fetchpriority="high"` — that is the usual cause.

- [ ] **Step 4: Write the CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Unit tests
        run: npm run test:unit
      - name: Build
        run: npm run build
      - name: End-to-end tests
        run: npm run test:e2e
      - name: Performance budget
        run: npm run test:perf
```

- [ ] **Step 5: Write the README**

Create `README.md`:

```markdown
# Stonecrop Landscape Co.

Marketing site for a solo landscape operator. Astro 5, Tailwind 4, static output
with one on-demand route for contact submissions.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm run build` | Production build into `dist/` (regenerates placeholder images first) |
| `npm run preview` | Serve the built site |
| `npm run test:unit` | Vitest — schemas, tokens, SEO, structured data, validation |
| `npm run test:e2e` | Playwright — routes, navigation, forms, accessibility |
| `npm run test:perf` | Lighthouse CI against the performance budget |
| `npm test` | Unit tests, build, then end-to-end tests |
| `npm run placeholders` | Regenerate placeholder imagery |

Run a single unit test file with `npx vitest run tests/unit/seo.test.ts`, and a
single Playwright spec with `npx playwright test tests/e2e/contact.spec.ts`.

## Editing content

All brand data lives in `site.config.ts`. All page content lives in
`src/content/`. Adding a service or a service area means adding one markdown
file — the page, navigation entry, sitemap entry, and structured data follow
automatically.

Area pages enforce required local content (`localNote` of at least 200
characters, at least three neighborhoods, a real featured project, a local
testimonial). This is deliberate: a generic service-area page fails the build
rather than shipping as near-duplicate content.

## Replacing the placeholder brand

1. Edit `site.config.ts` with the real business name, NAP data, and social links.
2. Replace the markdown in `src/content/`.
3. Delete `scripts/generate-placeholders.mjs`, remove the `prebuild` script, and
   drop real photography into `src/assets/images/` using the same filenames.

## Known integration gap

`src/pages/api/contact.ts` validates every submission and logs it. The email
delivery call is marked `INTEGRATION POINT` and needs a provider API key.
```

- [ ] **Step 6: Run the whole suite**

```bash
npm test && npm run test:perf
```

Expected: everything green.

- [ ] **Step 7: Commit**

```bash
git add lighthouserc.json .github/workflows/ci.yml README.md package.json
git commit -m "ci: enforce performance and accessibility budgets"
```

---

## Spec Coverage

| Spec section | Covered by |
|---|---|
| §2 Brand, §2.1 single source of truth | Task 2 |
| §3 Technology | Task 1 |
| §4.1 Content-driven generation | Tasks 4, 15, 16, 17 |
| §4.2 Thin-content prevention | Task 4 (schema), Task 5 (content), Task 16 (runtime check) |
| §4.3 Route map | Tasks 12-19, verified in Task 20 |
| §4.4 Directory structure | Tasks 6-19 |
| §5 Design system | Task 3 |
| §6 Home page composition | Tasks 12, 13, 14 |
| §7 Motion | Tasks 9, 13 |
| §8 SEO | Tasks 7, 8, 20 |
| §9 Contact form | Task 19 |
| §10 Images | Task 11 |
| §11 Accessibility | Tasks 3, 10, 20 |
| §12 Testing | Every task; sweeps in Tasks 20, 21 |
| §14 Success criteria | Tasks 20, 21 |
