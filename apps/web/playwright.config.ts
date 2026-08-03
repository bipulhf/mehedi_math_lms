import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a real stack: a Vite dev server that proxies to
 * the API on 3001, which needs Postgres and Redis. They are deliberately **not**
 * part of `bun run test` -- that task must stay runnable with nothing else on
 * the machine. Run them with `bun run test:e2e`.
 *
 * The dev server runs on 3100, not the 3000 that `bun run dev` uses. Playwright
 * reuses whatever is already listening, and on a shared machine that can be an
 * entirely different project -- which then fails in a way that looks like a
 * broken app rather than a port collision.
 *
 * Set `E2E_BASE_URL` to point at a deployed environment instead; the local dev
 * server is only started when the default URL is in use.
 */
const defaultBaseURL = "http://localhost:3100";
const baseURL = process.env.E2E_BASE_URL ?? defaultBaseURL;
const shouldStartDevServer = baseURL === defaultBaseURL;

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Pin the locale. The UI is bilingual and Bangla is the default, so an
        // assertion on English copy would otherwise be asserting on a cookie
        // nobody set. `en` is the fallback locale and the one these specs read.
        storageState: {
          cookies: [
            {
              domain: new URL(baseURL).hostname,
              expires: -1,
              httpOnly: false,
              name: "genex_locale",
              path: "/",
              sameSite: "Lax",
              secure: false,
              value: "en"
            }
          ],
          origins: []
        }
      }
    }
  ],
  reporter: process.env.CI ? "github" : "list",
  retries: process.env.CI ? 1 : 0,
  testDir: "./e2e",
  use: {
    baseURL,
    // A failing E2E gives you a trace or it gives you nothing useful.
    trace: "retain-on-failure"
  },
  ...(shouldStartDevServer
    ? {
        webServer: {
          command: "vite dev --port 3100",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          url: baseURL
        }
      }
    : {})
});
