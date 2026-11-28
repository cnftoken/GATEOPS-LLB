import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
import { loadPlaywrightEnv } from "../../scripts/playwright-env";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  webServer: {
    command: "corepack pnpm --filter @gateops/web dev",
    env: loadPlaywrightEnv(resolve(process.cwd(), "../..")),
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
