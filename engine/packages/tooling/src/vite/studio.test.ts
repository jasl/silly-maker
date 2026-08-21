// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { HtmlTagDescriptor, Plugin } from "vite";

import { studioPageMetaNameV1, studioPageUrlV1, studioPluginV1 } from "./studio.ts";

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

describe("studioPluginV1", () => {
  it("advertises the Studio page on the game HTML", () => {
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
    ]);
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
    expect(source).toContain("const regionsIoV1 = createDevServerRegionsIoV1();");
    expect(source.match(/regionsIo: regionsIoV1,/gu)).toHaveLength(2);
    expect(source).toContain('profileId: "sillymaker.studio.live"');
    expect(source).toContain(
      'import.meta.hot.accept("/src/application/studio.ts", (moduleV1) => {',
    );
    expect(source).toContain("hmrV1.accept(moduleV1);");
    expect(source).toContain("void hmrV1.dispose();");
    const mountIndex = source.indexOf("await compositionV1.mount");
    const initialPublicationIndex = source.indexOf(
      "await reactPublicationV1.mount(initialPlanV1)",
    );
    const initialFailureIndex = source.indexOf("} catch (errorV1) {");
    const rootCleanupIndex = source.indexOf(
      "reactPublicationV1.dispose();",
      initialFailureIndex,
    );
    const compositionCleanupIndex = source.indexOf(
      "await compositionV1.dispose();",
      initialFailureIndex,
    );
    expect(mountIndex).toBeGreaterThan(-1);
    expect(initialPublicationIndex).toBeGreaterThan(mountIndex);
    expect(initialFailureIndex).toBeGreaterThan(initialPublicationIndex);
    expect(rootCleanupIndex).toBeGreaterThan(initialFailureIndex);
    expect(compositionCleanupIndex).toBeGreaterThan(rootCleanupIndex);
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
