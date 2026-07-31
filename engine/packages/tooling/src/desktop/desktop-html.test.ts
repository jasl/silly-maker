// SPDX-License-Identifier: MIT
import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

import {
  createDesktopHtmlResponseInternalV1,
  injectDesktopRecordsMarkerV1,
} from "./desktop-html.mts";

const markerNeedleV1 = "__SILLYMAKER_RECORDS__";
const capabilityNeedleV1 = "__SILLYMAKER_DESKTOP_CAPABILITY__";
const capabilityV1 = "a".repeat(43);
const markerBodyV1 =
  `Object.defineProperties(globalThis,{"__SILLYMAKER_RECORDS__":{value:"local",writable:false,configurable:false},"__SILLYMAKER_DESKTOP_CAPABILITY__":{value:"${capabilityV1}",writable:false,configurable:false}});`;
const markerSourceV1 = `<script>${markerBodyV1}</script>`;
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
    expect(marked).toContain(`"${capabilityNeedleV1}":{value:"${capabilityV1}"`);
  });

  it("accepts head attributes and case changes", () => {
    const html =
      '<!doctype html><HTML><HEAD data-theme="dark"><script src="app.js"></script></HEAD></HTML>';
    const marked = injectV1(html);

    expect(marked).toContain(`<HEAD data-theme="dark">${markerSourceV1}`);
    expect(marked.indexOf(markerNeedleV1)).toBeLessThan(marked.indexOf('src="app.js"'));
  });

  it("falls back to the root element or document prefix for minimal HTML", () => {
    const rooted = injectV1("<html><body>Game</body></html>");
    const fragment = injectV1('<script src="app.js"></script>');

    expect(rooted).toContain(`<html>${markerSourceV1}`);
    expect(fragment.startsWith(markerSourceV1)).toBe(true);
  });

  it("is idempotent when the local record transport marker is already present", () => {
    const html = `<html><head>${markerSourceV1}</head></html>`;

    expect(injectV1(html)).toBe(html);
  });

  it("does not mistake comments, partial markers, or stale capabilities for the launch receipt", () => {
    const commented = `<html><head><!-- ${markerSourceV1} --></head></html>`;
    const custom =
      '<html><head><script>globalThis.__SILLYMAKER_RECORDS__ = "custom";</script></head></html>';
    const recordsOnly =
      '<html><head><script>globalThis.__SILLYMAKER_RECORDS__ = "local";</script></head></html>';
    const stale =
      `<html><head><script>globalThis.__SILLYMAKER_RECORDS__ = "local";globalThis.__SILLYMAKER_DESKTOP_CAPABILITY__ = "${
        "b".repeat(
          43,
        )
      }";</script></head></html>`;

    expect(injectV1(commented)).toContain(`<head>${markerSourceV1}<!--`);
    expect(injectV1(custom)).toContain(`<head>${markerSourceV1}<script>`);
    expect(injectV1(recordsOnly)).toContain(`<head>${markerSourceV1}<script>`);
    expect(injectV1(stale)).toContain(`<head>${markerSourceV1}<script>`);
  });

  it("prevents later classic scripts from replacing the launch handshake", () => {
    const laterAssignments =
      `<script>globalThis.__SILLYMAKER_RECORDS__ = "custom";globalThis.__SILLYMAKER_DESKTOP_CAPABILITY__ = "${
        "b".repeat(
          43,
        )
      }";</script>`;
    const context = executeClassicInlineScriptsV1(
      injectV1(`<html><head>${laterAssignments}</head></html>`),
    );

    expect(context[markerNeedleV1]).toBe("local");
    expect(context[capabilityNeedleV1]).toBe(capabilityV1);
    expect(Object.getOwnPropertyDescriptor(context, markerNeedleV1)).toMatchObject({
      configurable: false,
      writable: false,
    });
    expect(Object.getOwnPropertyDescriptor(context, capabilityNeedleV1)).toMatchObject({
      configurable: false,
      writable: false,
    });
  });

  it("ignores a head element inside an HTML comment when choosing the insertion point", () => {
    const html =
      "<!-- template placeholder: <head> --><html><head><title>Game</title></head></html>";

    expect(injectV1(html)).toBe(
      `<!-- template placeholder: <head> --><html><head>${markerSourceV1}<title>Game</title></head></html>`,
    );
  });

  it.each([
    `<script src="records.js">${markerBodyV1}</script>`,
    `<script type="application/json">${markerBodyV1}</script>`,
    `<script type="text/plain">${markerBodyV1}</script>`,
  ])("does not accept a non-executable inline marker body in %s", (script) => {
    const html = `<html><head>${script}</head></html>`;

    expect(injectV1(html)).toBe(`<html><head>${markerSourceV1}${script}</head></html>`);
  });

  it("rejects malformed capabilities instead of emitting an incomplete handshake", () => {
    expect(() => injectDesktopRecordsMarkerV1("<html></html>", "short")).toThrow(
      "invalid Desktop shell capability",
    );
  });

  it("serves launch-specific HTML without caching it and omits HEAD bodies", async () => {
    const html = "<!doctype html><html><head><title>Game</title></head></html>";
    const getResponse = createDesktopHtmlResponseInternalV1(html, capabilityV1, false);
    const headResponse = createDesktopHtmlResponseInternalV1(html, capabilityV1, true);

    expect(getResponse.headers.get("cache-control")).toBe("no-store");
    expect(getResponse.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(getResponse.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
    expect(getResponse.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(getResponse.headers.get("x-content-type-options")).toBe("nosniff");
    expect(getResponse.headers.get("x-frame-options")).toBe("DENY");
    await expect(getResponse.text()).resolves.toContain(markerSourceV1);
    expect(headResponse.headers.get("cache-control")).toBe("no-store");
    await expect(headResponse.text()).resolves.toBe("");
  });
});
