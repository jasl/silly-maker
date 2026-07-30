// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { injectDesktopRecordsMarkerV1 } from "./desktop-html.mts";

const markerNeedleV1 = "__SILLYMAKER_RECORDS__";
const markerSourceV1 = '<script>globalThis.__SILLYMAKER_RECORDS__ = "local";</script>';

describe("desktop HTML marker injection", () => {
  it("injects immediately after a conventional head element", () => {
    const html = "<!doctype html><html><head><title>Game</title></head><body></body></html>";
    const marked = injectDesktopRecordsMarkerV1(html);

    expect(marked.indexOf(markerNeedleV1)).toBeGreaterThan(marked.indexOf("<head>"));
    expect(marked.indexOf(markerNeedleV1)).toBeLessThan(marked.indexOf("<title>"));
  });

  it("accepts head attributes and case changes", () => {
    const html =
      '<!doctype html><HTML><HEAD data-theme="dark"><script src="app.js"></script></HEAD></HTML>';
    const marked = injectDesktopRecordsMarkerV1(html);

    expect(marked).toContain('<HEAD data-theme="dark"><script>globalThis.__SILLYMAKER_RECORDS__');
    expect(marked.indexOf(markerNeedleV1)).toBeLessThan(marked.indexOf('src="app.js"'));
  });

  it("falls back to the root element or document prefix for minimal HTML", () => {
    const rooted = injectDesktopRecordsMarkerV1("<html><body>Game</body></html>");
    const fragment = injectDesktopRecordsMarkerV1('<script src="app.js"></script>');

    expect(rooted).toContain("<html><script>globalThis.__SILLYMAKER_RECORDS__");
    expect(fragment.startsWith("<script>globalThis.__SILLYMAKER_RECORDS__")).toBe(true);
  });

  it("is idempotent when the local record transport marker is already present", () => {
    const html =
      '<html><head><script>globalThis.__SILLYMAKER_RECORDS__ = "local";</script></head></html>';

    expect(injectDesktopRecordsMarkerV1(html)).toBe(html);
  });

  it("does not mistake comments or other record transports for the local marker", () => {
    const commented =
      '<html><head><!-- <script>globalThis.__SILLYMAKER_RECORDS__ = "local";</script> --></head></html>';
    const custom =
      '<html><head><script>globalThis.__SILLYMAKER_RECORDS__ = "custom";</script></head></html>';

    expect(injectDesktopRecordsMarkerV1(commented)).toContain(
      '<head><script>globalThis.__SILLYMAKER_RECORDS__ = "local";</script><!--',
    );
    expect(injectDesktopRecordsMarkerV1(custom)).toContain(
      '<head><script>globalThis.__SILLYMAKER_RECORDS__ = "local";</script><script>',
    );
  });

  it("ignores a head element inside an HTML comment when choosing the insertion point", () => {
    const html =
      "<!-- template placeholder: <head> --><html><head><title>Game</title></head></html>";

    expect(injectDesktopRecordsMarkerV1(html)).toBe(
      `<!-- template placeholder: <head> --><html><head>${markerSourceV1}<title>Game</title></head></html>`,
    );
  });

  it.each([
    '<script src="records.js">globalThis.__SILLYMAKER_RECORDS__ = "local";</script>',
    '<script type="application/json">globalThis.__SILLYMAKER_RECORDS__ = "local";</script>',
    '<script type="text/plain">globalThis.__SILLYMAKER_RECORDS__ = "local";</script>',
  ])("does not accept a non-executable inline marker body in %s", (script) => {
    const html = `<html><head>${script}</head></html>`;

    expect(injectDesktopRecordsMarkerV1(html)).toBe(
      `<html><head>${markerSourceV1}${script}</head></html>`,
    );
  });
});
