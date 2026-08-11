import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Run against a production build served by the real FastAPI backend
  // (not `next start` -- the frontend is a static export now, and the
  // backend is what actually implements the /login redirect gate).
  webServer: {
    command: `bash -c "npm run build && cd ../backend && uv run uvicorn app.main:app --port ${PORT}"`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
