import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * E2E tests run against a real dev stack:
 *   - PostgreSQL (docker) with migrations + seed
 *   - Next.js app (pnpm dev or the production build)
 *   - The ingestion worker populates real quotes (CoinGecko keyless works).
 * Third-party providers are NOT mocked here; assertions only require the UI
 * to render real provider data or honest "unavailable" states.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    locale: 'fa-IR',
    // Use a locally cached Chromium when the exact playwright build is missing.
    launchOptions: {
      executablePath:
        process.env.PW_EXECUTABLE_PATH ??
        (process.env.HOME && existsSync(join(process.env.HOME, '.cache/ms-playwright/chromium-1187/chrome-linux/chrome'))
          ? join(process.env.HOME, '.cache/ms-playwright/chromium-1187/chrome-linux/chrome')
          : undefined),
    },
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: process.env.E2E_USE_DEV === '1' ? 'pnpm dev' : 'pnpm start',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
