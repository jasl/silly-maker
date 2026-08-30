// SPDX-License-Identifier: MIT

import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveSillyOsLocaleQueryOverrideV1 } from "../content/copy.ts";

const productRootV1 = resolve(import.meta.dirname, "..");

async function readUiTsxSourcesV1(directoryV1: string): Promise<
  readonly {
    readonly path: string;
    readonly source: string;
  }[]
> {
  const entriesV1 = await readdir(directoryV1, { withFileTypes: true });
  const sourcesV1: { path: string; source: string }[] = [];
  for (
    const entryV1 of entriesV1.toSorted((leftV1, rightV1) =>
      leftV1.name.localeCompare(rightV1.name)
    )
  ) {
    const pathV1 = resolve(directoryV1, entryV1.name);
    if (entryV1.isDirectory()) {
      sourcesV1.push(...await readUiTsxSourcesV1(pathV1));
    } else if (entryV1.isFile() && entryV1.name.endsWith(".tsx")) {
      sourcesV1.push({ path: pathV1, source: await readFile(pathV1, "utf8") });
    }
  }
  return sourcesV1;
}

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
    const [
      productCss,
      creatorHomeCss,
      composerModelPickerCss,
      settingsCss,
      providerSettingsCss,
      chatCss,
      workspaceViewCss,
      activityCss,
      componentCss,
    ] = await Promise.all([
      readFile(resolve(productRootV1, "ui/silly-os.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/creator-home.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/composer-model-picker.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/settings.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/provider-settings.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/chat.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/workspace-view.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/activity.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/design-system/components.css"), "utf8"),
    ]);

    expect(
      `${productCss}\n${creatorHomeCss}\n${composerModelPickerCss}\n${settingsCss}\n${providerSettingsCss}\n${chatCss}\n${workspaceViewCss}\n${activityCss}\n${componentCss}`,
    )
      .not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/iu);
    expect(productCss).toContain("var(--sos-surface-translucent)");
    expect(providerSettingsCss).toContain("var(--sos-surface)");
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

  it("keeps the shared composer picker before its Creator Home surface owner", async () => {
    const [app, legacyCss, creatorHomeCss, composerModelPickerCss] = await Promise.all([
      readFile(resolve(productRootV1, "ui/silly-os-app.tsx"), "utf8"),
      readFile(resolve(productRootV1, "ui/silly-os.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/creator-home.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/composer-model-picker.css"), "utf8"),
    ]);

    expect(app.indexOf('import "./collection-state.css";')).toBeLessThan(
      app.indexOf('import "./composer-model-picker.css";'),
    );
    expect(app.indexOf('import "./composer-model-picker.css";')).toBeLessThan(
      app.indexOf('import "./creator-home.css";'),
    );
    expect(app.indexOf('import "./creator-home.css";')).toBeLessThan(
      app.indexOf('import "./silly-os.css";'),
    );
    expect(app.indexOf('import "./silly-os.css";')).toBeLessThan(
      app.indexOf('import "./design-system/tailwind.css";'),
    );

    expect(creatorHomeCss).toContain(".creator-home {");
    expect(creatorHomeCss).toContain(".pi-agent-setup {");
    expect(creatorHomeCss).toContain(".creator-composer {");
    expect(creatorHomeCss).not.toMatch(/(^|\n)\s*\.creator-composer__(?:model|reasoning)/u);
    expect(composerModelPickerCss).toContain(".creator-composer__model-picker {");
    expect(composerModelPickerCss).not.toMatch(/(^|\n)\s*\.creator-home(?:\b|__)/u);
    expect(legacyCss).not.toMatch(/(^|\n)\s*\.creator-home(?:\b|__)/u);
    expect(legacyCss).not.toMatch(/(^|\n)\s*\.pi-agent-setup(?:\b|__)/u);
    expect(legacyCss).not.toMatch(/(^|\n)\s*\.creator-composer(?:\s|,|\{)/u);
    expect(legacyCss).not.toMatch(
      /(^|\n)\s*\.creator-composer__(?:actions|primary-actions)(?:\b|\s|,|\{)/u,
    );
    expect(legacyCss).not.toMatch(/(^|\n)\s*\.creator-composer__(?:model|reasoning)/u);
  });

  it("keeps Settings surface styles separate from Provider detail ownership", async () => {
    const [app, providers, componentCss, settingsCss, providerSettingsCss, legacyCss] =
      await Promise.all([
        readFile(resolve(productRootV1, "ui/silly-os-app.tsx"), "utf8"),
        readFile(resolve(productRootV1, "ui/provider-settings.tsx"), "utf8"),
        readFile(resolve(productRootV1, "ui/design-system/components.css"), "utf8"),
        readFile(resolve(productRootV1, "ui/settings.css"), "utf8"),
        readFile(resolve(productRootV1, "ui/provider-settings.css"), "utf8"),
        readFile(resolve(productRootV1, "ui/silly-os.css"), "utf8"),
      ]);

    expect(app.indexOf('import "./design-system/components.css";')).toBeLessThan(
      app.indexOf('import "./settings.css";'),
    );
    expect(app.indexOf('import "./creator-home.css";')).toBeLessThan(
      app.indexOf('import "./settings.css";'),
    );
    expect(app.indexOf('import "./settings.css";')).toBeLessThan(
      app.indexOf('import "./provider-settings.css";'),
    );
    expect(app.indexOf('import "./provider-settings.css";')).toBeLessThan(
      app.indexOf('import "./chat.css";'),
    );
    expect(componentCss).toContain(".sos-card");
    expect(settingsCss).toContain(".silly-os-settings {");
    expect(settingsCss).toContain(".silly-os-settings__preference-card {");
    expect(settingsCss).toContain(".provider-settings__vault {");
    expect(providerSettingsCss).toContain(".provider-settings {");
    expect(providerSettingsCss).toContain(".provider-settings__credential {");
    expect(providerSettingsCss).toContain(".provider-settings__connection-model {");
    expect(providerSettingsCss).toContain(".provider-settings__collection-state {");
    expect(providerSettingsCss).toContain("@media (width <= 767px)");
    expect(providerSettingsCss).not.toContain(".provider-settings__vault");
    expect(providerSettingsCss).not.toContain(
      ".provider-settings__detail-heading > .provider-settings__availability",
    );
    const unavailableRuleStart = settingsCss.indexOf(
      '.provider-settings__vault-mode span[data-vault-mode="unavailable"]',
    );
    const unavailableRule = settingsCss.slice(
      unavailableRuleStart,
      settingsCss.indexOf("}", unavailableRuleStart) + 1,
    );
    expect(unavailableRuleStart).toBeGreaterThanOrEqual(0);
    expect(unavailableRule).toContain("border-color: var(--sos-line-strong);");
    expect(unavailableRule).toContain("color: var(--sos-ink-muted);");
    expect(unavailableRule).toContain("background: var(--sos-surface-muted);");
    expect(providers).not.toContain("is-${vault.phase}");
    expect(settingsCss).not.toContain("silly-os-settings__dialog-layer");
    expect(settingsCss).not.toContain("silly-os-settings__dialog-backdrop");
    expect(settingsCss).not.toContain("nth-of-type(2)");
    expect(legacyCss).not.toMatch(/(^|\n)\s*\.silly-os-settings(?:\b|__)/u);
    expect(legacyCss).not.toMatch(/(^|\n)\s*\.provider-settings__vault(?:\b|[-_])/u);
    expect(legacyCss).not.toMatch(/(^|\n)\s*\.provider-settings(?:\b|__)/u);
    expect(legacyCss).not.toContain("silly-os-settings__dialog-layer");
    expect(legacyCss).not.toContain("silly-os-settings__dialog-backdrop");
  });

  it("keeps Chat surface styles separate from Program and Workpiece chrome", async () => {
    const [app, chatCss, legacyCss] = await Promise.all([
      readFile(resolve(productRootV1, "ui/silly-os-app.tsx"), "utf8"),
      readFile(resolve(productRootV1, "ui/chat.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/silly-os.css"), "utf8"),
    ]);

    expect(app.indexOf('import "./composer-model-picker.css";')).toBeLessThan(
      app.indexOf('import "./chat.css";'),
    );
    expect(app.indexOf('import "./creator-home.css";')).toBeLessThan(
      app.indexOf('import "./chat.css";'),
    );
    expect(app.indexOf('import "./settings.css";')).toBeLessThan(
      app.indexOf('import "./chat.css";'),
    );
    expect(app.indexOf('import "./chat.css";')).toBeLessThan(
      app.indexOf('import "./silly-os.css";'),
    );
    expect(app.indexOf('import "./silly-os.css";')).toBeLessThan(
      app.indexOf('import "./design-system/tailwind.css";'),
    );

    expect(chatCss).toContain(".chat-pane {");
    expect(chatCss).toContain(".chat-pane > .creator-readiness {");
    expect(chatCss).toContain("@container chat-pane (width < 340px)");
    expect(chatCss).toContain(".chat-message {");
    expect(chatCss).toContain(".pi-agent-run {");
    expect(chatCss).toContain(".network-access {");
    expect(chatCss).toContain(".program-proposal {");
    expect(chatCss).toContain(".program-workspace-review {");
    expect(chatCss).toContain(".silly-os .workpiece-link {");
    expect(chatCss).toContain(".chat-composer {");
    expect(chatCss).toContain(".chat-composer .creator-composer__model-picker");
    expect(chatCss).toContain(
      ".chat-composer__primary-actions > .creator-composer__model-picker",
    );
    expect(chatCss).toContain("@media (width <= 767px)");
    expect(chatCss).not.toContain("@keyframes silly-os-spin");
    expect(chatCss).not.toMatch(/(^|\n)\s*\.program-workspace__(?:chat-shell|mobile-nav)/u);
    expect(chatCss).not.toMatch(/(^|\n)\s*\.workpiece-pane(?:\b|__)/u);

    expect(legacyCss).not.toMatch(
      /(^|\n)\s*(?:\.chat-pane(?:\b|__)|\.chat-message(?:\b|--|__)|\.pi-agent-run(?:\b|__)|\.network-access(?:\b|__)|\.program-proposal(?:\b|__)|\.program-workspace-review(?:\b|__)|\.workpiece-link(?:\b|__)|\.chat-composer(?:\b|__))/u,
    );
    expect(legacyCss).not.toContain(".silly-os .workpiece-link");
    expect(legacyCss).toContain("@keyframes silly-os-spin");
  });

  it("keeps Workspace View shared status baselines separate from residual runtime status", async () => {
    const [app, workspaceViewCss, legacyCss] = await Promise.all([
      readFile(resolve(productRootV1, "ui/silly-os-app.tsx"), "utf8"),
      readFile(resolve(productRootV1, "ui/workspace-view.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/silly-os.css"), "utf8"),
    ]);

    expect(app.indexOf('import "./chat.css";')).toBeLessThan(
      app.indexOf('import "./workspace-view.css";'),
    );
    expect(app.indexOf('import "./workspace-view.css";')).toBeLessThan(
      app.indexOf('import "./silly-os.css";'),
    );
    expect(app.indexOf('import "./silly-os.css";')).toBeLessThan(
      app.indexOf('import "./design-system/tailwind.css";'),
    );

    expect(workspaceViewCss).toContain(".program-workspace {");
    expect(workspaceViewCss).toContain(".program-workspace__separator {");
    expect(workspaceViewCss).toContain(".program-workspace__mobile-nav {");
    expect(workspaceViewCss).toContain(".workpiece-pane {");
    expect(workspaceViewCss).toContain(".workpiece-workspace-export {");
    expect(workspaceViewCss).toContain(".program-canvas {");
    expect(workspaceViewCss).toContain(".program-surface {");
    expect(workspaceViewCss).toContain(".program-workpiece-empty {");
    expect(workspaceViewCss).toContain(".program-capabilities {");
    expect(workspaceViewCss).toContain(".program-execution-workspace {");
    expect(workspaceViewCss).toContain(".program-browser-storage {");
    expect(workspaceViewCss).toContain("@container workpiece-body (width < 620px)");
    expect(workspaceViewCss).toContain("@media (width <= 1040px)");
    expect(workspaceViewCss).toContain("@media (width <= 767px)");
    expect(workspaceViewCss).toContain("@media (width <= 430px)");
    expect(workspaceViewCss).not.toContain(".program-activity");
    expect(workspaceViewCss).not.toContain("@keyframes silly-os-spin");

    expect(legacyCss).not.toMatch(
      /(^|\n)\s*(?:\.program-workspace(?:\b|__)|\.workpiece-pane(?:\b|__)|\.workpiece-workspace-export(?:\b|__)|\.program-canvas(?:\b|__)|\.program-surface(?:\b|__)|\.program-workpiece-empty(?:\b|__)|\.program-capabilities(?:\b|__)|\.program-execution-workspace(?:\b|__)|\.program-browser-storage(?:\b|__))/u,
    );
    expect(legacyCss).toContain("@keyframes silly-os-spin");
    expect(legacyCss).toContain(".program-storage-status {");
  });

  it("keeps Activity placement after Workspace View without reviving dead copy", async () => {
    const [app, activityCss, workspaceViewCss, legacyCss] = await Promise.all([
      readFile(resolve(productRootV1, "ui/silly-os-app.tsx"), "utf8"),
      readFile(resolve(productRootV1, "ui/activity.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/workspace-view.css"), "utf8"),
      readFile(resolve(productRootV1, "ui/silly-os.css"), "utf8"),
    ]);

    expect(app.indexOf('import "./workspace-view.css";')).toBeLessThan(
      app.indexOf('import "./activity.css";'),
    );
    expect(app.indexOf('import "./activity.css";')).toBeLessThan(
      app.indexOf('import "./silly-os.css";'),
    );
    expect(app.indexOf('import "./silly-os.css";')).toBeLessThan(
      app.indexOf('import "./design-system/tailwind.css";'),
    );

    expect(activityCss).toContain(".program-activity {");
    expect(activityCss).toContain(".program-activity h2 {");
    expect(activityCss).toContain(".program-activity > header {");
    expect(activityCss).toContain(".program-activity > .program-execution-workspace {");
    expect(activityCss).toContain(".program-activity > .program-browser-storage {");
    expect(activityCss).toContain(".program-activity__sequence {");
    expect(activityCss).toContain(".program-activity__line {");
    expect(activityCss).toContain("@container workpiece-body (width < 620px)");
    expect(activityCss).not.toContain(".program-activity header p");
    expect(activityCss).not.toContain(".program-capabilities");
    expect(activityCss).not.toMatch(/(^|\n)\s*\.program-execution-workspace(?:\s|,|\{)/u);
    expect(activityCss).not.toMatch(/(^|\n)\s*\.program-browser-storage(?:\s|,|\{)/u);
    expect(activityCss).not.toContain("@keyframes silly-os-spin");
    expect(activityCss).not.toContain(".program-storage-status");

    expect(workspaceViewCss).toContain(".program-execution-workspace {");
    expect(workspaceViewCss).toContain(".program-browser-storage {");
    expect(workspaceViewCss).not.toContain(".program-activity");
    expect(legacyCss).not.toMatch(/(^|\n)\s*\.program-activity(?:\b|__)/u);
    expect(legacyCss).not.toContain(".program-activity header p");
    expect(legacyCss).toContain("@keyframes silly-os-spin");
    expect(legacyCss).toContain(".program-storage-status {");
  });

  it("routes multiline and durable export progress through the shared physical layer", async () => {
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
    expect(workpiece.match(/<Progress\b/gu)).toHaveLength(1);
    expect(componentCss).toContain(".sos-textarea");
    expect(componentCss).toContain(".sos-progress");
    expect(componentCss).toContain(".silly-progress-meter.sos-progress");
    expect(productCss).not.toContain(".workpiece-workspace-export progress");
  });

  it("routes visible checkbox and password consumers through shared controls", async () => {
    const checkboxPathV1 = resolve(productRootV1, "ui/design-system/checkbox.tsx");
    const [creator, chat, providers, checkbox, componentCss, productCss, uiSourcesV1] =
      await Promise.all([
        readFile(resolve(productRootV1, "ui/creator-home.tsx"), "utf8"),
        readFile(resolve(productRootV1, "ui/chat-pane.tsx"), "utf8"),
        readFile(resolve(productRootV1, "ui/provider-settings.tsx"), "utf8"),
        readFile(checkboxPathV1, "utf8"),
        readFile(resolve(productRootV1, "ui/design-system/components.css"), "utf8"),
        readFile(resolve(productRootV1, "ui/silly-os.css"), "utf8"),
        readUiTsxSourcesV1(resolve(productRootV1, "ui")),
      ]);

    const rawCheckboxConsumersV1 = uiSourcesV1.filter((sourceV1) =>
      sourceV1.path !== checkboxPathV1 && sourceV1.source.includes('type="checkbox"')
    );
    expect(rawCheckboxConsumersV1.map((sourceV1) => sourceV1.path)).toEqual([]);
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
