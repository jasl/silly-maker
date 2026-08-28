// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";

import { build } from "vite";
import { describe, expect, it } from "vitest";

import { readApplicationBootstrapConfigFromDocumentInternalV1 } from "@sillymaker/web/internal/application-startup";

import {
  createDesktopHtmlResponseInternalV1,
  injectDesktopBootstrapConfigV1,
} from "../desktop/desktop-html.mts";
import {
  applicationRuntimeBootstrapPluginInternalV1,
  applicationRuntimeBootShellElementIdInternalV1,
  injectApplicationRuntimeBootstrapHtmlInternalV1,
} from "./application-entry-bootstrap.ts";
import { createSillymakerAppViteConfigV1 } from "./app-vite-config.ts";
import { desktopDevIntentEnvironmentKeyInternalV1 } from "./desktop-dev.ts";
import { inspectorPageUrlV1 } from "./inspector.ts";

const repositoryRootV1 = resolve(process.cwd());

describe("runtime application entry bootstrap HTML", () => {
  it("places one accessible static shell and inert Browser receipt before modules", () => {
    const html = injectApplicationRuntimeBootstrapHtmlInternalV1({
      html:
        '<!doctype html><html><body><div id="root"></div><script type="module" src="entry.ts"></script></body></html>',
      applicationLabel: "SillyMaker Lab",
    });

    expect(html).toContain(`id="${applicationRuntimeBootShellElementIdInternalV1}"`);
    expect(html).toContain(
      'role="status" aria-live="polite" aria-busy="true" aria-label="SillyMaker Lab 启动状态"',
    );
    expect(html).toContain("SillyMaker Lab 正在启动…");
    expect(html).toContain(
      '{"revision":1,"entry":"runtime","target":"browser"}',
    );
    expect(html).toContain('type="application/json" data-sillymaker-bootstrap-config="v1"');
    expect(html.indexOf(applicationRuntimeBootShellElementIdInternalV1)).toBeLessThan(
      html.indexOf('src="entry.ts"'),
    );
    expect(html.match(/sillymaker-application-bootstrap/gu)).toHaveLength(1);

    const parsed = new DOMParser().parseFromString(html, "text/html");
    const config = readApplicationBootstrapConfigFromDocumentInternalV1(parsed, "runtime");
    expect(config).toEqual({ revision: 1, entry: "runtime", target: "browser" });
  });

  it("keeps the same admitted receipt boundary after Desktop target replacement", () => {
    const browserHtml = injectApplicationRuntimeBootstrapHtmlInternalV1({
      html: '<!doctype html><html><body><div id="root"></div></body></html>',
      applicationLabel: "Desktop Application",
    });
    const desktopHtml = injectDesktopBootstrapConfigV1(
      browserHtml,
      { revision: 1, entry: "runtime", target: "deno_desktop" },
    );
    const parsed = new DOMParser().parseFromString(desktopHtml, "text/html");

    const config = readApplicationBootstrapConfigFromDocumentInternalV1(parsed, "runtime");

    expect(config).toEqual({ revision: 1, entry: "runtime", target: "deno_desktop" });
    expect(desktopHtml.match(/sillymaker-application-bootstrap/gu)).toHaveLength(1);
  });

  it("escapes application labels instead of admitting markup", () => {
    const html = injectApplicationRuntimeBootstrapHtmlInternalV1({
      html: "<html><body></body></html>",
      applicationLabel: '<App "unsafe">',
    });

    expect(html).toContain("&lt;App &quot;unsafe&quot;&gt; 启动状态");
    expect(html).toContain('&lt;App "unsafe"&gt; 正在启动…');
    expect(html).not.toContain('<App "unsafe">');
  });

  it.each([
    ["missing body", "<html></html>", "body_ambiguous"],
    ["duplicate body", "<body></body><body></body>", "body_ambiguous"],
    [
      "reserved config",
      '<body><script id="SILLYMAKER-APPLICATION-BOOTSTRAP"></script></body>',
      "reserved_marker_conflict",
    ],
    [
      "reserved shell",
      '<body><div DATA-SILLYMAKER-BOOT-SHELL="pending"></div></body>',
      "reserved_marker_conflict",
    ],
  ])("rejects %s", (_label, html, code) => {
    expect(() =>
      injectApplicationRuntimeBootstrapHtmlInternalV1({
        html,
        applicationLabel: "Application",
      })
    ).toThrow(`application_entry_bootstrap.${code}`);
  });

  it("leaves the generated Inspector Author page under its own entry policy", () => {
    const plugin = applicationRuntimeBootstrapPluginInternalV1({
      applicationLabel: "Runtime",
    });
    const transform = plugin.transformIndexHtml;
    if (typeof transform !== "object" || transform === null) {
      throw new TypeError("runtime bootstrap HTML transform missing");
    }
    const inspectorHtml = '<html><body><div id="sillymaker-inspector-root"></div></body></html>';

    expect(
      transform.handler.call({} as never, inspectorHtml, {
        path: inspectorPageUrlV1,
      } as never),
    )
      .toBe(
        inspectorHtml,
      );
  });

  it("is installed by every configured GUI application", async () => {
    const config = await createSillymakerAppViteConfigV1({
      appRoot: import.meta.dirname,
      config: {
        applicationId: "bootstrap-test",
        label: "Bootstrap test",
        storyEntry: { module: "src/story.ts", exportName: "storyV1" },
        assetVerification: false,
        simulate: null,
        web: {
          applicationHtml: "index.html",
          applicationEntry: "src/entry.tsx",
          base: "./",
          sourcemap: false,
          identity: null,
          desktop: null,
        },
      },
    });

    expect(config.plugins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "sillymaker:application-runtime-bootstrap" }),
      ]),
    );
    expect(config.plugins).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "sillymaker:desktop-dev" }),
      ]),
    );
  });

  it("fails an explicit Desktop-dev launch when native capability is unavailable", async () => {
    const previous = process.env[desktopDevIntentEnvironmentKeyInternalV1];
    process.env[desktopDevIntentEnvironmentKeyInternalV1] = JSON.stringify({
      revision: 1,
      runId: "stable-unavailable",
      recordsDir: join(tmpdir(), "sillymaker-desktop-dev-records"),
      downloadsDir: join(tmpdir(), "sillymaker-desktop-dev-downloads"),
      bootstrap: { revision: 1, entry: "runtime", target: "deno_desktop" },
    });
    try {
      await expect(createSillymakerAppViteConfigV1({
        appRoot: import.meta.dirname,
        config: {
          applicationId: "bootstrap-test",
          label: "Bootstrap test",
          storyEntry: { module: "src/story.ts", exportName: "storyV1" },
          assetVerification: false,
          simulate: null,
          web: {
            applicationHtml: "index.html",
            applicationEntry: "src/entry.tsx",
            base: "./",
            sourcemap: false,
            identity: null,
            desktop: null,
          },
        },
      })).rejects.toThrow("desktop_dev.runtime.browser_window_unavailable");
    } finally {
      if (previous === undefined) delete process.env[desktopDevIntentEnvironmentKeyInternalV1];
      else process.env[desktopDevIntentEnvironmentKeyInternalV1] = previous;
    }
  });

  it("survives the real Template build and Desktop response boundary", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "sillymaker-entry-bootstrap-"));
    try {
      const output = await build({
        configFile: join(repositoryRootV1, "template", "vite.config.ts"),
        logLevel: "silent",
        build: { write: false, outDir: outputDirectory, emptyOutDir: true },
      });
      if (!Array.isArray(output) && !("output" in output)) {
        throw new TypeError("Template build unexpectedly returned a watcher");
      }
      const generated = (Array.isArray(output) ? output : [output]).flatMap(
        ({ output: files }) => files,
      );
      const index = generated.find(
        (file) => file.type === "asset" && file.fileName === "index.html",
      );
      if (index === undefined || index.type !== "asset") {
        throw new TypeError("Template build did not emit index.html");
      }
      const browserHtml = typeof index.source === "string"
        ? index.source
        : new TextDecoder().decode(index.source);

      expect(browserHtml.match(/sillymaker-application-bootstrap/gu)).toHaveLength(1);
      expect(browserHtml.match(/data-sillymaker-boot-shell="pending"/gu)).toHaveLength(1);
      expect(browserHtml).toContain('"entry":"runtime","target":"browser"');
      expect(browserHtml).toContain('<script type="module"');
      const browserDocument = new DOMParser().parseFromString(browserHtml, "text/html");
      const executableInlineScripts = Array.from(browserDocument.scripts).filter((script) => {
        if (script.hasAttribute("src")) return false;
        const type = (script.getAttribute("type") ?? "").trim().toLowerCase();
        return type === "" ||
          type === "module" ||
          type === "text/javascript" ||
          type === "application/javascript";
      });
      expect(executableInlineScripts).toHaveLength(0);
      const versionStampAsset = generated.find((file) =>
        file.type === "asset" &&
        typeof file.source === "string" &&
        file.source.includes("__SILLYMAKER_VERSIONS__")
      );
      if (versionStampAsset === undefined) {
        throw new TypeError("Template build did not emit the external version-stamp asset");
      }
      const scripts = Array.from(browserDocument.scripts);
      const versionStampScript = scripts.find((script) =>
        script.getAttribute("src")?.endsWith(versionStampAsset.fileName) === true
      );
      const applicationModuleScript = scripts.find((script) => script.type === "module");
      expect(versionStampScript).toBeDefined();
      expect(versionStampScript?.hasAttribute("type")).toBe(false);
      expect(versionStampScript?.hasAttribute("async")).toBe(false);
      expect(versionStampScript?.hasAttribute("defer")).toBe(false);
      if (versionStampScript === undefined || applicationModuleScript === undefined) {
        throw new TypeError("Template build did not order the version stamp before its module");
      }
      expect(scripts.indexOf(versionStampScript)).toBeLessThan(
        scripts.indexOf(applicationModuleScript),
      );
      const browserConfig = readApplicationBootstrapConfigFromDocumentInternalV1(
        browserDocument,
        "runtime",
      );
      expect(browserConfig).toEqual({ revision: 1, entry: "runtime", target: "browser" });

      const desktopResponse = createDesktopHtmlResponseInternalV1(
        browserHtml,
        "a".repeat(43),
        { revision: 1, entry: "runtime", target: "deno_desktop" },
        false,
      );
      const desktopHtml = await desktopResponse.text();
      const desktopDocument = new DOMParser().parseFromString(desktopHtml, "text/html");
      const desktopConfig = readApplicationBootstrapConfigFromDocumentInternalV1(
        desktopDocument,
        "runtime",
      );

      expect(desktopConfig).toEqual({
        revision: 1,
        entry: "runtime",
        target: "deno_desktop",
      });
      expect(desktopHtml).not.toContain('"target":"browser"');
      expect(desktopHtml.match(/sillymaker-application-bootstrap/gu)).toHaveLength(1);
      expect(desktopHtml.match(/data-sillymaker-boot-shell="pending"/gu)).toHaveLength(1);
    } finally {
      await rm(outputDirectory, { force: true, recursive: true });
    }
  });
});
