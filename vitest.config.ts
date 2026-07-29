import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    include: [
      "engine/packages/**/src/**/*.{test,spec}.{ts,tsx}",
      "engine/packages/**/src/**/*.test.mjs",
      "e2e/src/**/*.{test,spec}.{ts,tsx}",
      "examples/*/src/**/*.{test,spec}.{ts,tsx}",
      "template/src/**/*.{test,spec}.{ts,tsx}",
      "scripts/**/*.test.ts",
      "scripts/**/*.test.mjs",
    ],
    exclude: ["**/node_modules/**", "**/dist*/**", "engine/packages/web/e2e/**"],
    coverage: {
      provider: "v8",
      include: ["engine/packages/*/src/**"],
      reporter: ["text-summary", "json-summary"],
    },
  },
});
