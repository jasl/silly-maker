// SPDX-License-Identifier: MIT

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveSillyOsLocaleQueryOverrideV1 } from "../content/copy.ts";

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
    expect(tokens).toContain('.silly-os[data-color-scheme="dark"]');
    const darkTheme = tokens.slice(tokens.indexOf('.silly-os[data-color-scheme="dark"]'));
    expect(darkTheme).toContain("--sos-bg: var(--silly-color-canvas);");
    expect(darkTheme).toContain("--sos-surface: var(--silly-color-surface);");
    expect(darkTheme).toContain("--sos-ink: var(--silly-color-text);");
    expect(darkTheme).toContain("--sos-ink-soft: var(--silly-color-text-muted);");
    expect(tokens).not.toMatch(/(^|[},]\s*)(?::root|html|body|#root)\b/mu);
  });

  it("applies the persisted product theme before mount without claiming engine theme authority", async () => {
    const entry = await readFile(resolve(productRootV1, "application/entry.tsx"), "utf8");

    expect(entry).not.toContain("dataset.mode");
    expect(entry).toContain("applySillyOsDocumentPreferencesV1");
    expect(entry).toContain("resolveSillyOsColorSchemeV1");
  });

  it("admits an explicit locale only as a navigation override", () => {
    expect(resolveSillyOsLocaleQueryOverrideV1("?locale=zh-CN")).toBe("zh-CN");
    expect(resolveSillyOsLocaleQueryOverrideV1("?locale=zh")).toBe("zh-CN");
    expect(resolveSillyOsLocaleQueryOverrideV1("?locale=fr")).toBeNull();
    expect(resolveSillyOsLocaleQueryOverrideV1("")).toBeNull();
  });

  it("keeps component colors behind semantic tokens", async () => {
    const productCss = await readFile(resolve(productRootV1, "ui/silly-os.css"), "utf8");
    const componentCss = await readFile(
      resolve(productRootV1, "ui/design-system/components.css"),
      "utf8",
    );

    expect(`${productCss}\n${componentCss}`).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/iu);
    expect(productCss).toContain("var(--sos-surface)");
    expect(componentCss).toContain(".sos-button");
    expect(componentCss).toContain(".sos-input");
    expect(componentCss).toContain(".sos-status");
    expect(componentCss).not.toMatch(/(^|[},]\s*)(?::root|html|body|#root)\b/mu);
  });

  it("lets surface layout rules override component geometry without duplicating controls", async () => {
    const app = await readFile(resolve(productRootV1, "ui/silly-os-app.tsx"), "utf8");
    const componentCss = await readFile(
      resolve(productRootV1, "ui/design-system/components.css"),
      "utf8",
    );

    expect(app.indexOf('import "./design-system/components.css";')).toBeLessThan(
      app.indexOf('import "./silly-os.css";'),
    );
    expect(componentCss).toContain('.sos-icon-button:where([data-size="sm"])');
    const textButtonRule = componentCss.slice(
      componentCss.indexOf(".sos-button {"),
      componentCss.indexOf("}", componentCss.indexOf(".sos-button {")) + 1,
    );
    expect(componentCss).toContain("min-block-size: var(--silly-control-min-size);");
    expect(textButtonRule).toContain("white-space: normal");
    expect(textButtonRule).not.toMatch(/(^|\s)block-size:/u);
  });

  it("routes multiline and progress consumers through the shared physical layer", async () => {
    const [creator, chat, workpiece, componentCss, productCss] = await Promise.all([
      readFile(resolve(productRootV1, "ui/creator-home.tsx"), "utf8"),
      readFile(resolve(productRootV1, "ui/chat-pane.tsx"), "utf8"),
      readFile(resolve(productRootV1, "ui/workpiece-pane.tsx"), "utf8"),
      readFile(resolve(productRootV1, "ui/design-system/components.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/silly-os.css"), "utf8"),
    ]);

    expect(`${creator}\n${chat}`).not.toContain("<textarea");
    expect(`${creator}\n${chat}`).toContain("<TextareaV1");
    expect(workpiece).not.toContain("<progress");
    expect(workpiece.match(/<Progress\b/gu)).toHaveLength(2);
    expect(componentCss).toContain(".sos-textarea");
    expect(componentCss).toContain(".sos-progress");
    expect(componentCss).toContain(".silly-progress-meter.sos-progress");
    expect(productCss).not.toContain(".workpiece-workspace-export progress");
  });

  it("routes visible checkbox and password consumers through shared controls", async () => {
    const [creator, chat, providers, checkbox, componentCss, productCss] = await Promise.all([
      readFile(resolve(productRootV1, "ui/creator-home.tsx"), "utf8"),
      readFile(resolve(productRootV1, "ui/chat-pane.tsx"), "utf8"),
      readFile(resolve(productRootV1, "ui/provider-settings.tsx"), "utf8"),
      readFile(resolve(productRootV1, "ui/design-system/checkbox.tsx"), "utf8"),
      readFile(resolve(productRootV1, "ui/design-system/components.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/silly-os.css"), "utf8"),
    ]);

    expect(`${chat}\n${providers}`).not.toContain('type="checkbox"');
    expect(chat).toContain("<CheckboxV1");
    expect(providers).toContain("<CheckboxV1");
    expect(checkbox).toContain('type="checkbox"');
    expect(checkbox).toContain('data-slot="checkbox"');
    expect(creator).toMatch(/<InputV1\s+id="pi-agent-key"/u);
    expect(`${creator}\n${chat}`).not.toContain('type="file"');
    expect(`${creator}\n${chat}`).not.toContain("Add resource");
    expect(componentCss).toContain(".sos-checkbox");
    expect(productCss).not.toContain(".provider-settings__model input");
    expect(productCss).not.toContain(".network-access__toggle input");
  });

  it("scans every emitted CSS asset for forbidden Tailwind globals", async () => {
    const checker = await readFile(
      resolve(productRootV1, "../tools/check-browser-control-plane-build.mts"),
      "utf8",
    );

    expect(checker).toContain("const cssFilesV1 = filesV1.filter");
    expect(checker).toContain("for (const file of cssFilesV1)");
    expect(checker).toContain("tailwindUtilityCssFilesV1");
  });
});
