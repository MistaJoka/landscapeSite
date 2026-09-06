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
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Astro 7 auto-detects agentic shells (e.g. Claude Code, via the
    // `am-i-vibing` package) and silently forks `astro dev` into a detached
    // background daemon, exiting the wrapper process immediately. Playwright
    // then reports "Process from config.webServer exited early" even though
    // a server did come up. ASTRO_DEV_BACKGROUND=1 is the flag Astro's own
    // background-mode spawner sets on its child to say "just run in the
    // foreground" — setting it here opts back into normal blocking behavior
    // so Playwright can manage the process lifecycle itself.
    env: { ASTRO_DEV_BACKGROUND: '1', PLAYWRIGHT: '1' },
  },
});
