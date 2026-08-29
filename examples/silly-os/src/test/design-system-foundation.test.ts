// SPDX-License-Identifier: MIT

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const productRootV1 = resolve(import.meta.dirname, "..");

describe("SillyOS design-system foundation", () => {
  it("binds the product theme to the Host application boundary", async () => {
    const tokens = await readFile(
      resolve(productRootV1, "ui/design-system/tokens.css"),
      "utf8",
    );

    expect(tokens).toContain('[data-application-id="example-silly-os"]');
    expect(tokens).toContain("--silly-color-canvas: #f6f6f4;");
    expect(tokens).toContain("--silly-color-accent: #496bdf;");
    expect(tokens).toContain("--sos-bg: var(--silly-color-canvas);");
    expect(tokens).not.toMatch(/(^|[},]\s*)(?::root|html|body|#root)\b/mu);
  });

  it("does not mutate document-wide theme authority from the product entry", async () => {
    const entry = await readFile(resolve(productRootV1, "application/entry.tsx"), "utf8");

    expect(entry).not.toContain("dataset.mode");
    expect(entry).toContain('document.documentElement.style.colorScheme = "light";');
  });
});
