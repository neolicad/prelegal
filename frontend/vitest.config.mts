import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Playwright's own tests live under e2e/ and run via `npm run test:e2e`.
    exclude: ["node_modules/**", "e2e/**"],
    // Pin a non-UTC zone so date-formatting tests (e.g. render-nda.test.ts's
    // local-time-parsing regression test) are deterministic and actually
    // exercise the UTC-vs-local boundary regardless of the host/CI runner's
    // own timezone, which is often UTC by default.
    env: { TZ: "America/Los_Angeles" },
  },
});
