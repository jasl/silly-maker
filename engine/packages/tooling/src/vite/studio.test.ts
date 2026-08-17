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

  it("boots an isolated live composition and commits HMR renders only after reload succeeds", () => {
    const source = studioEntrySourceFromPluginV1(studioPluginV1(studioBindingV1));

    expect(source).toContain(
      'import { createStudioToolingHmrCoordinatorV1, createStudioToolingLiveCompositionV1 } from "@sillymaker/studio/composition";',
    );
    expect(source).toContain('profileId: "sillymaker.studio.live"');
    expect(source).toContain(
      'import.meta.hot.accept("/src/application/studio.ts", (moduleV1) => {',
    );
    expect(source).toContain("hmrV1.accept(moduleV1);");
    expect(source).toContain("void hmrV1.dispose();");
    const mountIndex = source.indexOf("await compositionV1.mount");
    const initialRenderIndex = source.indexOf("renderStudioV1(initialPlanV1)");
    expect(mountIndex).toBeGreaterThan(-1);
    expect(initialRenderIndex).toBeGreaterThan(mountIndex);
    expect(source).not.toContain("@sillymaker/state");
    expect(source).not.toContain("GameSession");
    expect(source).not.toContain("Context");
  });
});
