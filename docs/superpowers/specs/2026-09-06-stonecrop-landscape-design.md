# Stonecrop Landscape Co. — Website Design Spec

**Date:** 2026-09-06
**Status:** Approved
**Type:** Architectural — new project

---

## 1. Purpose

Build a marketing website for a solo landscape operator. The site must:

1. Communicate the business offering within the first two viewports.
2. Read as high-design and intentional — not as a template.
3. Rank in local search for service+town queries.
4. Convert visitors into quote requests via phone or form.

The visual reference is Apple's product homepage: full-bleed imagery, generous
whitespace, disciplined type scale, scroll-choreographed narrative, minimal chrome.

## 2. Brand (invented placeholder)

All brand data is placeholder content, structured so a real business can be
swapped in by editing data files only.

| Field | Value |
|---|---|
| Business name | Stonecrop Landscape Co. |
| Operator | Ellis Vance (sole proprietor) |
| Region | Hudson Valley, New York |
| Positioning | Design-literate garden and stonework, not volume lawn service |
| Phone | (845) 555-0142 |
| Email | hello@stonecroplandscape.com |

**Services (5):**

| Slug | Name |
|---|---|
| `garden-design` | Garden Design & Planting |
| `patios-stonework` | Patios & Stonework |
| `lawn-grounds-care` | Lawn & Grounds Care |
| `irrigation-drainage` | Irrigation & Drainage |
| `seasonal-cleanup` | Seasonal Cleanup & Winter Prep |

**Service areas (6):** `beacon`, `cold-spring`, `rhinebeck`, `new-paltz`,
`kingston`, `hudson`

### 2.1 Single source of truth

`site.config.ts` at the repo root exports one typed object containing business
name, NAP (name/address/phone) data, social links, navigation structure, and
default SEO metadata. No component may hardcode a brand string. A Vitest test
asserts this by grepping `src/components/**` for the literal business name and
phone number and failing if either appears outside `site.config.ts`.

## 3. Technology

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Astro 5 | Zero JS by default; islands for the few interactive parts |
| Styling | Tailwind CSS 4 | Utility-first, with design tokens defined in CSS custom properties |
| Language | TypeScript, `strict: true` | Content schemas are type-checked at build |
| Content | Astro Content Collections + Zod | Build fails on invalid or thin content |
| Fonts | `@fontsource-variable` (self-hosted) | No third-party round-trip, no layout shift |
| Unit tests | Vitest | Schema and utility coverage |
| E2E tests | Playwright | Route manifest, navigation, forms, accessibility |
| Perf gate | Lighthouse CI | Budget enforced in CI |
| Package manager | npm | No preference stated; default |
| Deploy target | Netlify, `@astrojs/netlify` adapter | Every page prerendered; only `/api/contact` renders on demand |

## 4. Architecture

### 4.1 Content-driven page generation

Services and areas are Content Collections. Two dynamic route files generate all
eleven sub-pages at build time via `getStaticPaths()`. Adding a service means
adding one markdown file; its page, navigation entry, sitemap entry, and
structured data all follow automatically.

Rejected alternatives:

- **Hand-authored pages.** Total per-page control, but shared elements drift —
  a CTA change becomes eleven edits.
- **Headless CMS / Supabase.** Correct when a non-technical client edits weekly.
  This operator updates content a few times per year. A database, an auth
  surface, and a recurring bill buy nothing here.

### 4.2 Thin-content prevention

Programmatically generated area pages carry a real SEO risk: near-duplicate
pages get filtered from search results and can drag down the whole domain.

The mitigation is structural, not procedural. In the `areas` collection schema,
these fields are **required**, not optional:

- `localNote` — minimum 200 characters, specific to that town's conditions
  (soil, grade, historic-district rules, deer pressure, drainage).
- `featuredProjectSlug` — must reference an existing entry in the `projects`
  collection.
- `localTestimonial` — an object with quote, attribution, and town.
- `neighborhoods` — minimum 3 named sub-areas.

Zod rejects a missing or short field, which fails the build. A generic area page
cannot be shipped, because it cannot be compiled.

### 4.3 Route map

| Route | Source | Count |
|---|---|---|
| `/` | `pages/index.astro` | 1 |
| `/services` | `pages/services/index.astro` | 1 |
| `/services/[slug]` | collection `services` | 5 |
| `/work` | `pages/work/index.astro` | 1 |
| `/work/[slug]` | collection `projects` | 6 |
| `/areas/[slug]` | collection `areas` | 6 |
| `/about` | `pages/about.astro` | 1 |
| `/contact` | `pages/contact.astro` | 1 |
| `/404` | `pages/404.astro` | 1 |
| `/sitemap-index.xml`, `/robots.txt` | integration | 2 |

**23 HTML pages**, plus the generated `sitemap-index.xml` and `robots.txt`.
Route-manifest tests cover the 23 HTML pages. Area pages are deliberately excluded from the header
navigation — they are search landing pages, linked from the footer and from the
home page's service-area section. Six town names in the header would clutter a
design whose premise is restraint.

### 4.4 Directory structure

```
site.config.ts
src/
  content.config.ts        Collection definitions + Zod schemas
  content/
    services/              5 markdown entries
    areas/                 6 markdown entries
    projects/              6 markdown entries
    testimonials/          4 markdown entries
  components/
    primitives/            Button, Container, Section, Eyebrow, Heading
    layout/                Header, Footer, Nav, MobileMenu, SkipLink
    sections/              Hero, OfferingStrip, BeforeAfter, ProcessSteps,
                           SelectedWork, Proof, ServiceAreaList, ClosingCTA
    seo/                   Meta, JsonLd
  layouts/
    BaseLayout.astro       html/head/body, nav, footer, view transitions
    PageLayout.astro       Standard interior page frame
  pages/                   Routes per 4.3
  lib/
    seo.ts                 Canonical URLs, OG tag construction
    schema.ts              JSON-LD builders
    motion.ts              IntersectionObserver fallback shim
  styles/
    tokens.css             Design tokens as CSS custom properties
    global.css             Base reset, font faces, Tailwind entry
tests/
  unit/                    Vitest
  e2e/                     Playwright
```

Components stay small and single-purpose. A section component receives typed
props and renders; it does not fetch content or know about routing.

## 5. Design system

### 5.1 Color tokens

| Token | Value | Use |
|---|---|---|
| `--ink` | `#16181A` | Primary text. Near-black; pure black reads harsh against warm paper. |
| `--ink-muted` | `#5C6169` | Secondary text, captions |
| `--paper` | `#FAF9F6` | Page background, warm off-white |
| `--paper-raised` | `#FFFFFF` | Cards, elevated surfaces |
| `--moss` | `#3F5641` | The single accent — CTAs, links, active states |
| `--moss-deep` | `#2C3D2E` | Accent hover/pressed |
| `--stone` | `#D6D1C7` | Dividers, borders, inactive surfaces |

One accent color only. Restraint is what separates considered design from
decorated design.

Contrast: `--ink` on `--paper` is ~15:1. `--moss` on `--paper` is ~7.5:1.
Both clear WCAG AA for all text sizes; `--ink` clears AAA.

### 5.2 Typography

- **Display:** Instrument Serif — headlines, hero, section titles.
- **Body / UI:** Inter Variable — body copy, navigation, buttons, captions.

Apple uses a single sans throughout. Copying that exactly produces a site that
reads as generic on a landscaping business. The serif display against a precise
sans is the specific choice that makes the page feel authored.

Type scale uses `clamp()` for fluid sizing, so there are no typography-specific
breakpoints. Body copy holds a 65–75 character measure at all widths.

### 5.3 Spacing and layout

8px base scale. Content container maxes at 1280px; text-heavy blocks cap at
680px for readability. Full-bleed sections break the container deliberately.

## 6. Home page composition

The brief requires the offering visible immediately. It therefore appears twice
in the first two viewports — once as a sentence, once as a grid.

| # | Section | Content |
|---|---|---|
| 1 | Hero | Full-viewport photograph. Headline states the offering in plain English. Primary CTA + tap-to-call. Translucent blurred nav floating over it. Scroll cue. |
| 2 | Offering strip | All five services immediately below the fold. Snap-scrolling cards on mobile, grid on desktop. |
| 3 | Before / After | Sticky-pinned section; scroll position drives a wipe between two images. The site's single "wow" moment. |
| 4 | Process | Three steps: walk the site → plan & quote → build & maintain. |
| 5 | Selected work | Three projects, large imagery, link to `/work`. |
| 6 | Proof | One strong testimonial; licensed, insured, years in business. |
| 7 | Service area | Town list linking to the six area pages. |
| 8 | Closing CTA | Full-bleed, single action. |
| 9 | Footer | Full NAP, navigation, hours, social links. |

Exactly one scroll-driven set piece (section 3). A second would cheapen the first.

## 7. Motion

| Behavior | Implementation | Cost |
|---|---|---|
| Page transitions | Astro `<ClientRouter />` (View Transitions API) | ~2 KB |
| Scroll reveals | Native CSS `animation-timeline: view()` | 0 KB |
| Reveal fallback | IntersectionObserver shim in `lib/motion.ts` | ~15 lines, loaded only if `CSS.supports()` fails |
| Before/After wipe | `position: sticky` + scroll-driven CSS animation | 0 KB |
| Mobile menu | Astro island, the only stateful component | small |

Native scroll-driven animations run on the compositor thread, so reveals cannot
cause jank the way a scroll-event listener can.

`prefers-reduced-motion: reduce` disables every transform, transition, and
scroll-driven animation. All content remains fully visible and legible in its
final state — reduced motion must never hide content behind an animation that
no longer runs. A Playwright test asserts this.

## 8. SEO

- Per-page canonical URL, title, description, and Open Graph tags via `lib/seo.ts`.
- JSON-LD via `lib/schema.ts`:
  - `LocalBusiness` with full NAP and `areaServed` — sitewide
  - `Service` — service pages
  - `FAQPage` — service pages carrying FAQs
  - `BreadcrumbList` — all interior pages
- `@astrojs/sitemap` generates the sitemap; `robots.txt` references it.
- Semantic heading hierarchy: exactly one `<h1>` per page, no level skips.
- Every image requires meaningful `alt` text — enforced by schema where images
  come from content, and by an axe check in E2E.

## 9. Contact form

Client-side validation plus server-side validation in an Astro API route at
`/api/contact`. The site builds with `output: 'static'`; this single route sets
`export const prerender = false` so it runs as a function while every page stays
prerendered. Progressive enhancement: the form submits natively without
JavaScript and the endpoint responds accordingly.

Anti-spam: hidden honeypot field, plus a minimum time-to-submit check that
rejects submissions faster than 3 seconds.

**Known integration gap.** The email delivery provider (Resend, or Netlify
Forms) requires an account and API key not available at build time. The endpoint
performs full validation and logs the validated payload, with a single clearly
marked integration point where the provider call belongs. The form itself, its
validation, and its error and success states are complete and tested — only the
final delivery hop is deferred.

## 10. Images

Placeholder photography with correct aspect ratios and dominant-color blur
placeholders, so layout and loading behavior are real even though the pictures
are not.

- Astro `<Image>` generates AVIF and WebP at multiple widths.
- Hero: `loading="eager"`, `fetchpriority="high"`, preloaded.
- All others: lazy, with explicit `width`/`height` so cumulative layout shift
  stays at zero.

## 11. Accessibility

Target WCAG 2.2 AA.

- Keyboard-navigable throughout; visible focus rings that meet contrast minimums.
- Skip-to-content link as the first focusable element.
- Mobile menu traps focus while open, restores focus on close, closes on Escape.
- Landmark regions on every page.
- Automated axe scan on every route in E2E; manual keyboard pass before sign-off.

## 12. Testing

Tests are written before the implementation they cover.

### Unit (Vitest)

1. Content schemas reject invalid entries — missing required fields, `localNote`
   under 200 characters, fewer than 3 neighborhoods, `featuredProjectSlug`
   pointing at a nonexistent project.
2. `lib/seo.ts` builds correct canonical and OG URLs, including trailing-slash
   handling.
3. `lib/schema.ts` emits structurally valid JSON-LD for each schema type.
4. No brand string appears in `src/components/**` outside `site.config.ts`.

### E2E (Playwright)

1. **Route manifest** — every route in §4.3 returns 200 and renders its `<h1>`.
   Highest-value test on a programmatically generated site.
2. Header navigation reaches every top-level page.
3. Mobile menu: opens, traps focus, closes on Escape, restores focus.
4. Contact form: rejects invalid input with visible messages; accepts valid
   input; honeypot submission is rejected.
5. `prefers-reduced-motion` — all section content is visible with animations
   disabled.
6. axe accessibility scan on every route, zero violations.
7. Each area page renders its unique `localNote` (guards against a template
   regression silently producing identical pages).

### Performance (Lighthouse CI)

Budgets enforced in CI; a regression fails the build.

| Metric | Budget |
|---|---|
| Largest Contentful Paint | < 1.8 s |
| Cumulative Layout Shift | < 0.05 |
| Total Blocking Time | < 150 ms |
| Performance score (mobile) | ≥ 95 |
| Accessibility score | 100 |

## 13. Out of scope

Not built in this phase, and not designed for:

- Online booking or scheduling
- Payments or invoicing
- Customer accounts or authentication
- Blog or CMS
- Multi-language support
- Analytics (deferred pending a provider decision)
- Live email delivery (see §9)

## 14. Success criteria

1. All 23 HTML pages build and return 200.
2. Lighthouse budgets in §12 met on mobile.
3. Zero axe violations across all routes.
4. Full keyboard operability; reduced-motion path fully legible.
5. A new service or area can be added by creating one markdown file, with no
   component changes.
6. Brand identity can be replaced by editing `site.config.ts` and content files
   only.
