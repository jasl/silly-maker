import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    include: [
      "engine/packages/**/src/**/*.{test,spec}.{ts,tsx}",
      "game/**/src/**/*.{test,spec}.{ts,tsx}",
      "scripts/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist*/**", "engine/packages/web/e2e/**"],
    coverage: {
      provider: "v8",
      include: ["engine/packages/*/src/**"],
      reporter: ["text-summary", "json-summary"],
    },
  },
});
