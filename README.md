# Stonecrop Landscape Co.

Marketing site for a solo landscape operator. Astro 7, Tailwind 4, static output
with one on-demand route for contact submissions.

The brand, copy, and imagery are **placeholders** — see "Replacing the placeholder
brand" below.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm run build` | Production build for Netlify (regenerates placeholder images first) |
| `npm run build:pages` | Static build for GitHub Pages — no adapter, no contact endpoint, sub-path `base` |
| `npm run preview` | Not supported — the Netlify adapter has no preview command. Use `npm run dev`. |
| `npm run test:unit` | Vitest — schemas, tokens, SEO, structured data, validation |
| `npm run test:e2e` | Playwright — routes, navigation, forms, accessibility |
| `npm run test:perf` | Lighthouse CI against the performance budget |
| `npm test` | Unit tests, build, then end-to-end tests |
| `npm run placeholders` | Regenerate placeholder imagery |

Run a single unit test file with `npx vitest run tests/unit/seo.test.ts`, and a
single Playwright spec with `npx playwright test tests/e2e/contact.spec.ts`.
Add `--project=mobile` to run the mobile viewport only.

## Architecture

Services, areas, projects, and testimonials are Astro Content Collections
validated by Zod. Two dynamic routes (`services/[slug]`, `areas/[slug]`, plus
`work/[slug]`) generate all seventeen sub-pages at build time from those files.

- **`site.config.ts`** — the only place brand data lives. A unit test fails the
  build if the business name or phone appears anywhere in `src/components/` or
  `src/layouts/`.
- **`src/lib/schemas.ts`** — Zod schemas, deliberately separate from
  `src/content.config.ts` so they are importable from Vitest (`content.config.ts`
  needs the `astro:content` virtual module, which only exists in an Astro build).
- **`src/lib/images.ts`** — bridges the plain string paths in content frontmatter
  to build-optimized assets, so content files stay portable.
- **`src/styles/tokens.css`** — the only file permitted to contain raw hex.
  A unit test computes real WCAG contrast ratios from it and fails below
  threshold.

### Thin-content prevention

Area pages enforce required local content: `localNote` of at least 200
characters, at least three neighborhoods, a real featured project, a local
testimonial. This is deliberate — a generic service-area page fails the build
rather than shipping as near-duplicate content that search engines filter. An
E2E test additionally asserts no two area pages share their prose.

### Motion

Page transitions use the View Transitions API (`<ClientRouter />`). Scroll
reveals use native CSS `animation-timeline: view()`, which runs on the
compositor and ships no JavaScript; a small IntersectionObserver in
`src/lib/motion.ts` covers browsers without support. Reveals animate
**transform only, never opacity** — fading text through low opacity puts it
below WCAG contrast for the duration of the animation. `prefers-reduced-motion`
disables everything and leaves all content visible.

## Editing content

Adding a service or a service area means adding one markdown file under
`src/content/`. Its page, navigation entry, sitemap entry, and structured data
all follow automatically.

## Replacing the placeholder brand

1. Edit `site.config.ts` with the real business name, NAP data, and social links.
2. Replace the markdown in `src/content/`.
3. Delete `scripts/generate-placeholders.mjs`, remove the `prebuild` script, and
   drop real photography into `src/assets/images/` using the same filenames.

## Deploy targets

Two builds from one codebase:

- **`npm run build`** targets Netlify. Everything works, including the contact
  endpoint.
- **`npm run build:pages`** targets GitHub Pages, which is static-only and
  serves project sites from a sub-path. It drops the adapter, sets `base`, and
  removes `/api/contact` (the endpoint lives in `src/endpoints/` and is injected
  as a route only for the server build — Astro resolves `prerender` from a
  compile-time literal, so it cannot opt out conditionally). The contact form
  stays visible for design review but is disabled with a notice, and the whole
  preview is `noindex` so a placeholder business never lands in search results.

Internal links go through `withBase()` in `src/lib/url.ts`, because Astro does
not rewrite absolute hrefs when `base` is set.

## Known gaps

- **Email delivery.** `src/pages/api/contact.ts` validates every submission and
  logs it. The provider call is marked `INTEGRATION POINT` and needs an API key.
  The form, its validation, its error and success states, and both spam defences
  are complete and tested — only the final delivery hop is deferred.
- **`npm audit`** reports high-severity advisories in build-time tooling
  (`@netlify/dev`, `@lhci/cli`). None are in the shipped artifact, which is
  static HTML plus one validation-only function. `npm audit fix --force` would
  downgrade `@astrojs/netlify` and break the adapter.
