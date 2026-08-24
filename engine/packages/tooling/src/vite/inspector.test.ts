// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { HtmlTagDescriptor, Plugin, ViteDevServer } from "vite";

import {
  createInspectorPageHtmlInternalV1,
  embeddedAuthorEntryIdInternalV1,
  inspectorEntryIdInternalV1,
  inspectorPageMetaNameV1,
  inspectorPageUrlV1,
  inspectorPluginV1,
} from "./inspector.ts";

const inspectorBindingV1 = {
  module: "src/application/inspector.ts",
  exportName: "catCafeInspectorBindingV1",
};

function hookV1<T>(value: unknown, label: string): T {
  if (typeof value === "function") return value as T;
  if (
    value !== null && typeof value === "object" && "handler" in value &&
    typeof value.handler === "function"
  ) {
    return value.handler as T;
  }
  throw new TypeError(`missing ${label}`);
}

function htmlTransformV1(plugin: Plugin): (
  html: string,
) => string | { readonly html: string; readonly tags?: readonly HtmlTagDescriptor[] } {
  return hookV1(plugin.transformIndexHtml, "Inspector HTML transform");
}

describe("inspectorPluginV1", () => {
  it("serves an accessible Author/Browser boot document", () => {
    const html = createInspectorPageHtmlInternalV1();

    expect(html).toContain('id="sillymaker-application-boot-shell"');
    expect(html).toContain('id="sillymaker-inspector-root"');
    expect(html).toContain('data-sillymaker-bootstrap-config="v1"');
    expect(html).toContain('aria-label="SillyMaker Inspector 启动状态"');
    expect(html).toContain(`src="${inspectorEntryIdInternalV1}"`);
  });

  it("advertises the standalone route and resident launcher only on product HTML", () => {
    const plugin = inspectorPluginV1(inspectorBindingV1);
    const transform = htmlTransformV1(plugin);
    const transformed = transform("<html><head></head><body></body></html>");

    expect(plugin.apply).toBe("serve");
    expect(transformed).toMatchObject({
      tags: expect.arrayContaining([
        {
          tag: "meta",
          attrs: { name: inspectorPageMetaNameV1, content: inspectorPageUrlV1 },
          injectTo: "head",
        },
        {
          tag: "script",
          attrs: { type: "module", src: embeddedAuthorEntryIdInternalV1 },
          injectTo: "body",
        },
      ]),
    });

    const inspectorHtml = '<body><div id="sillymaker-inspector-root"></div></body>';
    expect(transform(inspectorHtml)).toBe(inspectorHtml);
  });

  it("handles the Inspector route and rejects non-GET requests", async () => {
    const plugin = inspectorPluginV1(inspectorBindingV1);
    let middleware:
      | ((
        request: { readonly url?: string; readonly method?: string },
        response: {
          statusCode: number;
          setHeader(name: string, value: string): void;
          end(body?: string): void;
        },
        next: () => void,
      ) => void)
      | null = null;
    const configureServer = hookV1<(server: ViteDevServer) => void>(
      plugin.configureServer,
      "Inspector server hook",
    );
    configureServer({
      middlewares: {
        use(handler: typeof middleware) {
          middleware = handler;
        },
      },
      transformIndexHtml: async (_url: string, html: string) => html,
    } as unknown as ViteDevServer);
    if (middleware === null) throw new TypeError("Inspector route was not registered");

    const invoke = (method: string): Promise<{ readonly status: number; readonly body: string }> =>
      new Promise((resolve) => {
        const response = {
          statusCode: 0,
          setHeader() {},
          end(body = "") {
            resolve({ status: response.statusCode, body });
          },
        };
        middleware!({ url: inspectorPageUrlV1, method }, response, () => {
          throw new TypeError("Inspector route unexpectedly delegated");
        });
      });

    const get = await invoke("GET");
    expect(get.status).toBe(200);
    expect(get.body).toContain('id="sillymaker-inspector-root"');
    await expect(invoke("POST")).resolves.toEqual({
      status: 405,
      body: "method not allowed",
    });
  });
});
