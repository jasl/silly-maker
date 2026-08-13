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
});
