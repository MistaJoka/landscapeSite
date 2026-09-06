/// <reference types="astro/client" />

// `tsc` does not parse .astro files — that typing comes from the Astro language
// server, which only runs in editors. Without this, any .ts file importing a
// component (the Container API tests in tests/unit/) fails type-checking.
// Typed as Astro's real factory type rather than `any`, so the Container API's
// renderToString(component, ...) signature still checks.
declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
  const Component: AstroComponentFactory;
  export default Component;
}
