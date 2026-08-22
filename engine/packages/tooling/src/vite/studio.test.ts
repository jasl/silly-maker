// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { HtmlTagDescriptor, Plugin } from "vite";

import {
  createStudioPageHtmlInternalV1,
  studioPageMetaNameV1,
  studioPageUrlV1,
  studioPluginV1,
} from "./studio.ts";

const studioBindingV1 = Object.freeze({
  module: "src/application/studio.ts",
  exportName: "catCafeStudioBindingV1",
});

function studioHtmlTransformV1(
  plugin: Plugin,
): (html: string) => string | {
  readonly html: string;
  readonly tags?: readonly HtmlTagDescriptor[];
} {
  const transform = plugin.transformIndexHtml;
  const handler = typeof transform === "function" ? transform : transform !== null &&
      transform !== undefined &&
      typeof transform === "object" &&
      "handler" in transform &&
      typeof transform.handler === "function"
    ? transform.handler
    : null;
  if (handler === null) throw new TypeError("missing studio HTML transform");
  const run = handler as unknown as (
    html: string,
  ) => string | { readonly html: string; readonly tags?: readonly HtmlTagDescriptor[] };
  return (html) => run(html);
}

function studioEntrySourceFromPluginV1(plugin: Plugin): string {
  if (typeof plugin.load !== "function") throw new TypeError("missing Studio virtual entry loader");
  const load = plugin.load as unknown as (id: string) => unknown;
  const source = load("/__sillymaker/studio-entry.tsx");
  if (typeof source !== "string") throw new TypeError("missing Studio virtual entry source");
  return source;
}

function virtualSourceFromPluginV1(plugin: Plugin, id: string): string {
  if (typeof plugin.load !== "function") throw new TypeError("missing Studio virtual loader");
  const load = plugin.load as unknown as (moduleId: string) => unknown;
  const source = load(id);
  if (typeof source !== "string") throw new TypeError(`missing virtual source ${id}`);
  return source;
}

describe("studioPluginV1", () => {
  it("generates a static accessible Author/Browser boot shell", () => {
    const html = createStudioPageHtmlInternalV1();

    expect(html).toContain('<div id="sillymaker-application-boot-shell">');
    expect(html).toContain('<div id="sillymaker-studio-root">');
    expect(html).toContain(
      'role="status" aria-live="polite" aria-busy="true" aria-label="SillyMaker Studio 启动状态"',
    );
    expect(html).toContain("SillyMaker Studio 正在启动…");
    expect(html).toContain(
      '{"revision":1,"entry":"author","target":"browser"}',
    );
    expect(html).toContain('type="application/json" data-sillymaker-bootstrap-config="v1"');
    const shellIndex = html.indexOf('id="sillymaker-application-boot-shell"');
    const mountIndex = html.indexOf('id="sillymaker-studio-root"');
    const entryIndex = html.indexOf('src="/__sillymaker/studio-entry.tsx"');
    expect(shellIndex).toBeGreaterThan(-1);
    expect(mountIndex).toBeGreaterThan(shellIndex);
    expect(entryIndex).toBeGreaterThan(mountIndex);
    expect(html.slice(shellIndex, mountIndex)).toContain(
      'data-sillymaker-boot-shell="pending"',
    );
    expect(html.slice(mountIndex, entryIndex)).not.toContain(
      'data-sillymaker-boot-shell="pending"',
    );
  });

  it("advertises standalone Studio and installs only the resident embedded launcher", () => {
    const transform = studioHtmlTransformV1(studioPluginV1(studioBindingV1));
    const transformed = transform("<!doctype html><html><head></head><body></body></html>");
    if (typeof transformed === "string") {
      throw new TypeError("expected injected tags on the game page");
    }
    expect(transformed.tags).toEqual([
      Object.freeze({
        tag: "meta",
        attrs: Object.freeze({
          name: studioPageMetaNameV1,
          content: studioPageUrlV1,
        }),
        injectTo: "head",
      }),
      Object.freeze({
        tag: "script",
        attrs: Object.freeze({
          type: "module",
          src: "/__sillymaker/embedded-author-entry.ts",
        }),
        injectTo: "body",
      }),
    ]);
  });

  it("keeps Studio, source IO, and the binding behind first embedded activation", () => {
    const plugin = studioPluginV1(studioBindingV1);
    const launcher = virtualSourceFromPluginV1(
      plugin,
      "/__sillymaker/embedded-author-entry.ts",
    );
    const runtime = virtualSourceFromPluginV1(
      plugin,
      "/__sillymaker/embedded-author-runtime.tsx",
    );

    expect(launcher).toContain('import("/__sillymaker/embedded-author-runtime.tsx")');
    expect(launcher).toContain('containerV1.id = "sillymaker-embedded-author-root"');
    expect(launcher).toContain('openV1.className = "silly-button"');
    expect(launcher).toContain('mountV1.dataset.sillymakerEmbeddedAuthorMount = "true"');
    expect(launcher).toContain("moduleV1.mountEmbeddedAuthoringV1(mountV1)");
    expect(launcher).toContain("openV1.remove();");
    expect(launcher).toContain("mountV1.replaceChildren();");
    expect(launcher).toContain("openV1.disabled = false;");
    expect(launcher.indexOf("openV1.remove();")).toBeGreaterThan(
      launcher.indexOf("await moduleV1.mountEmbeddedAuthoringV1(mountV1)"),
    );
    expect(launcher).not.toContain("@sillymaker/studio");
    expect(launcher).not.toContain("createDevServerSceneIoV1");
    expect(launcher).not.toContain("/src/application/studio.ts");

    expect(runtime).toContain("createDevServerSceneIoV1");
    expect(runtime).toContain("createDevServerMotionIoV1");
    expect(runtime).toContain("createDevServerRegionsIoV1");
    expect(runtime).toContain('mode: "embedded"');
    expect(runtime).toContain('profileId: "sillymaker.authoring-host.embedded.live"');
    expect(runtime).toContain(
      'import.meta.hot.accept("/src/application/studio.ts", (moduleV1) => {',
    );
    expect(runtime).toContain("publicationV1?.dispose();");
    expect(runtime).toContain("await compositionV1?.dispose();");
    expect(runtime).toContain("if (mountedV1 === attemptV1) mountedV1 = null;");
  });

  it("does not advertise Studio on the Studio page itself", () => {
    const transform = studioHtmlTransformV1(studioPluginV1(studioBindingV1));
    const html = [
      "<!doctype html>",
      "<html><head></head>",
      '<body><div id="sillymaker-studio-root"></div></body>',
      "</html>",
    ].join("");
    expect(transform(html)).toBe(html);
  });

  it("publishes initial and HMR Studio epochs with acknowledged consumer-first cleanup", () => {
    const source = studioEntrySourceFromPluginV1(studioPluginV1(studioBindingV1));

    expect(source).toContain(
      'import { createStudioToolingHmrCoordinatorV1, createStudioToolingLiveCompositionV1, createStudioToolingReactPublicationV1 } from "@sillymaker/studio/composition";',
    );
    expect(source).toContain(
      'import { createDevServerRegionsIoV1, createDevServerSceneIoV1 } from "@sillymaker/studio";',
    );
    expect(source).toContain(
      'import { createWebApplicationStartupDiagnosticsControllerInternalV1, readApplicationBootstrapConfigFromDocumentInternalV1 } from "@sillymaker/web/internal/application-startup";',
    );
    expect(source).toContain(
      'readApplicationBootstrapConfigFromDocumentInternalV1(document, "author")',
    );
    expect(source).toContain('bootstrapConfigV1.target !== "browser"');
    expect(source).toContain("const regionsIoV1 = createDevServerRegionsIoV1();");
    expect(source.match(/regionsIo: regionsIoV1,/gu)).toHaveLength(2);
    expect(source).toContain('profileId: "sillymaker.studio.live"');
    expect(source).toContain(
      'import.meta.hot.accept("/src/application/studio.ts", (moduleV1) => {',
    );
    expect(source).toContain("hmrV1.accept(moduleV1);");
    expect(source).toContain("void hmrV1.dispose();");
    const configReadIndex = source.indexOf(
      'readApplicationBootstrapConfigFromDocumentInternalV1(document, "author")',
    );
    const mountIndex = source.indexOf("await compositionV1.mount");
    const initialPublicationIndex = source.indexOf(
      "await reactPublicationV1.mount(initialPlanV1)",
    );
    const requiredReadyIndex = source.indexOf(
      "startupDiagnosticsV1.signalRequiredDomainReady()",
    );
    const firstCommitIndex = source.indexOf(
      'startupDiagnosticsV1.signalFirstProductCommit("presentation")',
    );
    const initialFailureIndex = source.lastIndexOf("} catch (errorV1) {");
    const rootCleanupIndex = source.indexOf(
      "disposeReactPublicationV1?.();",
      initialFailureIndex,
    );
    const compositionCleanupIndex = source.indexOf(
      "await disposeCompositionV1();",
      initialFailureIndex,
    );
    const terminalFailureIndex = source.indexOf(
      "startupDiagnosticsV1.signalTerminalStartupFailure({",
      initialFailureIndex,
    );
    expect(configReadIndex).toBeGreaterThan(-1);
    expect(mountIndex).toBeGreaterThan(configReadIndex);
    expect(mountIndex).toBeGreaterThan(-1);
    expect(requiredReadyIndex).toBeGreaterThan(mountIndex);
    expect(initialPublicationIndex).toBeGreaterThan(requiredReadyIndex);
    expect(firstCommitIndex).toBeGreaterThan(initialPublicationIndex);
    expect(initialFailureIndex).toBeGreaterThan(firstCommitIndex);
    expect(rootCleanupIndex).toBeGreaterThan(initialFailureIndex);
    expect(compositionCleanupIndex).toBeGreaterThan(rootCleanupIndex);
    expect(terminalFailureIndex).toBeGreaterThan(compositionCleanupIndex);
    expect(source).toContain("reason: startupFailureReasonV1");
    expect(source).toContain("globalThis.location.reload();");
    expect(source).not.toContain("textContent = errorV1");
    expect(source).not.toContain("innerHTML = errorV1");
    expect(source).toContain(
      "publish: (planV1, signalV1) => reactPublicationV1.publish(planV1, signalV1)",
    );
    expect(source).toContain("disposeRoot: () => reactPublicationV1.dispose()");
    expect(source).not.toContain("reactRootV1.render");
    expect(source).not.toContain("renderStudioV1");
    expect(source).not.toContain('import { createRoot } from "react-dom/client"');
    expect(source).not.toContain("@sillymaker/state");
    expect(source).not.toContain("GameSession");
    expect(source).not.toContain("Context");
  });
});
