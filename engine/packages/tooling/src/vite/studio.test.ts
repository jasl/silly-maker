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

  it("keeps Studio behind first activation and emits Vite-static HMR boundaries", () => {
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
    expect(launcher).not.toContain("@sillymaker/studio");
    expect(launcher).not.toContain("/src/application/studio.ts");

    expect(runtime).toContain(
      'import.meta.hot.accept("/src/application/studio.ts", (moduleV1) => {',
    );
    const standalone = virtualSourceFromPluginV1(plugin, "/__sillymaker/studio-entry.tsx");
    expect(standalone).toContain(
      'import.meta.hot.accept("/src/application/studio.ts", (moduleV1) => {',
    );
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
});
