// SPDX-License-Identifier: MIT

import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { describe, expect, it } from "vitest";

const productSourceRootV1 = new URL("../", import.meta.url);
const productRootV1 = new URL("../../", import.meta.url);
const productionExtensionsV1 = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);

async function productionSourceFilesV1(directory: string): Promise<readonly string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "test") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await productionSourceFilesV1(path));
    } else if (entry.isFile() && productionExtensionsV1.has(extname(entry.name))) {
      files.push(path);
    }
  }
  return files.sort();
}

function dynamicImportArgumentsV1(source: string): readonly string[] {
  return [...source.matchAll(/\bimport\s*\(\s*([\s\S]*?)\s*\)/gu)]
    .map((match) => match[1] ?? "");
}

describe("SillyOS Browser control-plane source boundary", () => {
  it("contains no executable-text or generated-HTML sink", async () => {
    const banned = [
      ["eval", /\beval\s*\(/u],
      ["Function constructor", /\bnew\s+Function\s*\(/u],
      ["React raw HTML", /dangerouslySetInnerHTML/u],
      ["innerHTML", /\binnerHTML\b/u],
      ["outerHTML", /\bouterHTML\b/u],
      ["insertAdjacentHTML", /\binsertAdjacentHTML\b/u],
      ["document.write", /\bdocument\.write\s*\(/u],
      ["style attribute assignment", /setAttribute\s*\(\s*["']style["']/u],
      ["style cssText assignment", /\.style\.cssText\s*=/u],
      ["DOMParser", /\bDOMParser\b/u],
      ["srcdoc", /\bsrcDoc\b|\bsrcdoc\b/u],
      ["iframe", /<iframe\b/iu],
      ["object", /<object\b/iu],
      ["embed", /<embed\b/iu],
    ] as const;

    for (const path of await productionSourceFilesV1(productSourceRootV1.pathname)) {
      const source = await readFile(path, "utf8");
      for (const [label, pattern] of banned) {
        expect(source, `${path} must not use ${label}`).not.toMatch(pattern);
      }
    }
  });

  it("admits only literal product-owned dynamic imports", async () => {
    const imports: { readonly path: string; readonly argument: string }[] = [];
    for (const path of await productionSourceFilesV1(productSourceRootV1.pathname)) {
      const source = await readFile(path, "utf8");
      for (const argument of dynamicImportArgumentsV1(source)) {
        imports.push({ path, argument });
      }
    }

    expect(imports.length).toBeGreaterThan(0);
    for (const entry of imports) {
      expect(entry.argument, `${entry.path} has a user-controlled dynamic import`).toMatch(
        /^(?:"[^"\r\n]+"|'[^'\r\n]+')$/u,
      );
    }
  });

  it("keeps the Browser Pi connector and Program Agent implementation on the public Agent Session boundary", async () => {
    for (
      const path of [
        new URL("../agent/browser-pi-transport.ts", import.meta.url),
        new URL("../application/program-agent-composition.ts", import.meta.url),
      ]
    ) {
      const source = await readFile(path, "utf8");
      expect(source).toContain("@sillymaker/agent/session");
      expect(source).not.toContain("@sillymaker/agent/internal");
    }
  });

  it("detects multiline data-controlled dynamic imports", () => {
    expect(dynamicImportArgumentsV1("import(\n userSelectedModule\n)"))
      .toEqual(["userSelectedModule"]);
    expect(dynamicImportArgumentsV1("import(\n './fixed-product-module.ts'\n)"))
      .toEqual(["'./fixed-product-module.ts'"]);
  });

  it("keeps bootstrap HTML free of inline script and style bodies", async () => {
    const html = await readFile(new URL("index.html", productRootV1), "utf8");

    expect(html).not.toMatch(/<style\b/iu);
    expect(html).not.toMatch(/<script\b(?![^>]*\bsrc\s*=)[^>]*>/iu);
    expect(html).not.toMatch(/<script\b[^>]*\bsrc\s*=\s*["']https?:/iu);
  });

  it("does not present control-origin storage as the independent Workspace volume", async () => {
    const app = await readFile(new URL("../ui/silly-os-app.tsx", import.meta.url), "utf8");

    expect(app).not.toContain("browser-workspace-storage-policy");
    expect(app).not.toMatch(/\bbrowserStorage\b/u);
    expect(app).not.toContain("onRequestStoragePersistence");
    expect(app).not.toContain("data-browser-storage");
  });
});
