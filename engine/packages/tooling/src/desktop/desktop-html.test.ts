// SPDX-License-Identifier: MIT
import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

import {
  createDesktopHtmlResponseInternalV1,
  injectDesktopBootstrapConfigV1,
  injectDesktopRecordsMarkerV1,
} from "./desktop-html.mts";
import {
  applicationBootstrapElementIdV1,
  applicationBootstrapJsonHtmlV1,
} from "./application-bootstrap-html.mts";
import { desktopRuntimeBootstrapConfigV1 } from "./desktop-shell-arguments.mts";

const markerNeedleV1 = "__SILLYMAKER_RECORDS__";
const capabilityNeedleV1 = "__SILLYMAKER_DESKTOP_CAPABILITY__";
const capabilityV1 = "a".repeat(43);
const executableScriptPatternV1 = /<script>([\s\S]*?)<\/script>/giu;

function injectV1(html: string): string {
  return injectDesktopRecordsMarkerV1(html, capabilityV1);
}

function executeClassicInlineScriptsV1(html: string): Record<string, unknown> {
  const context: Record<string, unknown> = {};
  for (const match of html.matchAll(executableScriptPatternV1)) {
    runInNewContext(match[1] ?? "", context);
  }
  return context;
}

describe("desktop HTML marker injection", () => {
  it("injects immediately after a conventional head element", () => {
    const html = "<!doctype html><html><head><title>Game</title></head><body></body></html>";
    const marked = injectV1(html);

    expect(marked.indexOf(markerNeedleV1)).toBeGreaterThan(marked.indexOf("<head>"));
    expect(marked.indexOf(markerNeedleV1)).toBeLessThan(marked.indexOf("<title>"));
    const context = executeClassicInlineScriptsV1(marked);
    expect(context[markerNeedleV1]).toBe("local");
    expect(context[capabilityNeedleV1]).toBe(capabilityV1);
  });

  it("accepts head attributes and case changes", () => {
    const html =
      '<!doctype html><HTML><HEAD data-theme="dark"><script src="app.js"></script></HEAD></HTML>';
    const marked = injectV1(html);

    expect(marked.indexOf(markerNeedleV1)).toBeGreaterThan(marked.indexOf("<HEAD"));
    expect(marked.indexOf(markerNeedleV1)).toBeLessThan(marked.indexOf('src="app.js"'));
  });

  it("falls back to the root element or document prefix for minimal HTML", () => {
    const rooted = injectV1("<html><body>Game</body></html>");
    const fragment = injectV1('<script src="app.js"></script>');

    expect(rooted.indexOf(markerNeedleV1)).toBeGreaterThan(rooted.indexOf("<html>"));
    expect(fragment.indexOf(markerNeedleV1)).toBeLessThan(fragment.indexOf('src="app.js"'));
  });

  it("ignores a head element inside an HTML comment when choosing the insertion point", () => {
    const html =
      "<!-- template placeholder: <head> --><html><head><title>Game</title></head></html>";

    const marked = injectV1(html);
    expect(marked.indexOf(markerNeedleV1)).toBeGreaterThan(marked.lastIndexOf("<head>"));
    expect(marked.indexOf(markerNeedleV1)).toBeLessThan(marked.indexOf("<title>"));
  });

  it("serves launch-specific HTML without caching it and omits HEAD bodies", async () => {
    const html = "<!doctype html><html><head><title>Game</title></head></html>";
    const getResponse = createDesktopHtmlResponseInternalV1(
      html,
      capabilityV1,
      desktopRuntimeBootstrapConfigV1,
      false,
    );
    const headResponse = createDesktopHtmlResponseInternalV1(
      html,
      capabilityV1,
      desktopRuntimeBootstrapConfigV1,
      true,
    );

    expect(getResponse.headers.get("cache-control")).toBe("no-store");
    expect(getResponse.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(getResponse.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
    expect(getResponse.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(getResponse.headers.get("x-content-type-options")).toBe("nosniff");
    expect(getResponse.headers.get("x-frame-options")).toBe("DENY");
    const responseText = await getResponse.text();
    const responseContext = executeClassicInlineScriptsV1(responseText);
    expect(responseContext[markerNeedleV1]).toBe("local");
    expect(responseContext[capabilityNeedleV1]).toBe(capabilityV1);
    expect(responseText).toContain(applicationBootstrapElementIdV1);
    expect(headResponse.headers.get("cache-control")).toBe("no-store");
    await expect(headResponse.text()).resolves.toBe("");
  });
});

describe("desktop bootstrap config injection", () => {
  const desktopConfigHtmlV1 = applicationBootstrapJsonHtmlV1(
    desktopRuntimeBootstrapConfigV1,
  );

  it("injects one inert Desktop runtime block before application scripts", () => {
    const html = '<html><head><script type="module" src="app.js"></script></head></html>';
    const injected = injectDesktopBootstrapConfigV1(html, desktopRuntimeBootstrapConfigV1);

    expect(injected.match(new RegExp(applicationBootstrapElementIdV1, "gu"))).toHaveLength(1);
    expect(injected).toContain(desktopConfigHtmlV1);
    expect(injected.indexOf(desktopConfigHtmlV1)).toBeLessThan(injected.indexOf('src="app.js"'));
    expect(desktopConfigHtmlV1).not.toContain("globalThis");
  });

  it("replaces the build's Browser runtime receipt without leaving ambiguity", () => {
    const browserConfigHtml = applicationBootstrapJsonHtmlV1({
      revision: 1,
      entry: "runtime",
      target: "browser",
    });
    const html =
      `<html><head>${browserConfigHtml}<script type="module" src="app.js"></script></head></html>`;
    const injected = injectDesktopBootstrapConfigV1(html, desktopRuntimeBootstrapConfigV1);

    expect(injected).not.toContain('"target":"browser"');
    expect(injected).toContain('"target":"deno_desktop"');
    expect(injected.match(new RegExp(applicationBootstrapElementIdV1, "gu"))).toHaveLength(1);
  });

  it("canonicalizes an existing Desktop runtime receipt idempotently", () => {
    const html = `<html><head>${desktopConfigHtmlV1}</head></html>`;

    expect(injectDesktopBootstrapConfigV1(html, desktopRuntimeBootstrapConfigV1)).toBe(html);
  });

  it.each([
    `<script id="${applicationBootstrapElementIdV1}" type="application/json" data-sillymaker-bootstrap-config="v1">not-json</script>`,
    applicationBootstrapJsonHtmlV1({ revision: 1, entry: "author", target: "browser" }),
    `<div id="${applicationBootstrapElementIdV1}"></div>`,
    '<div DATA-SILLYMAKER-BOOTSTRAP-CONFIG="v1"></div>',
    `<script type="application/json" data-sillymaker-bootstrap-config="v1">{"revision":1,"entry":"runtime","target":"browser"}</script>`,
    `<script id="${applicationBootstrapElementIdV1}" id="another" type="application/json" data-sillymaker-bootstrap-config="v1">{"revision":1,"entry":"runtime","target":"browser"}</script>`,
  ])("rejects a conflicting reserved bootstrap source %#", (source) => {
    expect(() =>
      injectDesktopBootstrapConfigV1(`<html><head>${source}</head></html>`, {
        ...desktopRuntimeBootstrapConfigV1,
      })
    ).toThrow("desktop_html.bootstrap_conflict");
  });

  it("replaces a semantic Browser receipt without depending on JSON source formatting", () => {
    const source =
      `<script id="${applicationBootstrapElementIdV1}" type="application/json" data-sillymaker-bootstrap-config="v1">
        { "target": "browser", "entry": "runtime", "revision": 1 }
      </script>`;

    expect(
      injectDesktopBootstrapConfigV1(
        `<html><head>${source}</head></html>`,
        desktopRuntimeBootstrapConfigV1,
      ),
    )
      .toContain(desktopConfigHtmlV1);
  });

  it("rejects duplicate sources instead of choosing DOM order", () => {
    const html = `<html><head>${desktopConfigHtmlV1}${desktopConfigHtmlV1}</head></html>`;

    expect(() => injectDesktopBootstrapConfigV1(html, desktopRuntimeBootstrapConfigV1)).toThrow(
      "desktop_html.bootstrap_conflict",
    );
  });
});
