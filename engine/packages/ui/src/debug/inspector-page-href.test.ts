// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it } from "vitest";

import {
  inspectorPageMetaNameV1,
  isSafeInspectorPageHrefV1,
  readInspectorPageHrefV1,
  resolveInspectorPageHrefV1,
} from "./inspector-page-href.ts";

afterEach(() => {
  document.head.querySelectorAll(`meta[name="${inspectorPageMetaNameV1}"]`).forEach((node) => {
    node.remove();
  });
});

describe("inspector page href", () => {
  it("accepts only same-origin relative paths", () => {
    expect(isSafeInspectorPageHrefV1("/__sillymaker/inspector/")).toBe(true);
    expect(isSafeInspectorPageHrefV1("//evil.example/inspector")).toBe(false);
    expect(isSafeInspectorPageHrefV1("https://evil.example/inspector")).toBe(false);
    expect(isSafeInspectorPageHrefV1("javascript:alert(1)")).toBe(false);
    expect(isSafeInspectorPageHrefV1("\\__sillymaker\\inspector\\")).toBe(false);
  });

  it("reads the advertised meta tag", () => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", inspectorPageMetaNameV1);
    meta.setAttribute("content", "/__sillymaker/inspector/");
    document.head.append(meta);
    expect(readInspectorPageHrefV1()).toBe("/__sillymaker/inspector/");
  });

  it("lets an explicit empty href hide the advertised page", () => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", inspectorPageMetaNameV1);
    meta.setAttribute("content", "/__sillymaker/inspector/");
    document.head.append(meta);
    expect(resolveInspectorPageHrefV1("")).toBeUndefined();
    expect(resolveInspectorPageHrefV1("javascript:alert(1)")).toBeUndefined();
  });
});
