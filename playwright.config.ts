import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
const baseURL = `http://localhost:${PORT}`;

// End-to-end tests run against the production build (`npm run build` first),
// with a throwaway embedded database seeded with the demo account. Gemini is
// mocked in the browser, so no API key is needed.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run db:seed -- --fresh && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: "", // always use the throwaway embedded database, even if .env.local sets one
      PGLITE_DATA_DIR: ".data/pglite-e2e",
      DISABLE_AUTH_RATE_LIMIT: "true",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "e2e-only-secret-never-use-in-production-0123456789",
    },
  },
});
