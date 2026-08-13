// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it } from "vitest";

import {
  isSafeStudioPageHrefV1,
  readStudioPageHrefV1,
  resolveStudioPageHrefV1,
  studioPageMetaNameV1,
} from "./studio-page-href.ts";

afterEach(() => {
  document.head.querySelectorAll(`meta[name="${studioPageMetaNameV1}"]`).forEach((node) => {
    node.remove();
  });
});

describe("studio page href", () => {
  it("accepts only same-origin relative paths", () => {
    expect(isSafeStudioPageHrefV1("/__sillymaker/studio/")).toBe(true);
    expect(isSafeStudioPageHrefV1("//evil.example/studio")).toBe(false);
    expect(isSafeStudioPageHrefV1("https://evil.example/studio")).toBe(false);
    expect(isSafeStudioPageHrefV1("javascript:alert(1)")).toBe(false);
    expect(isSafeStudioPageHrefV1("\\__sillymaker\\studio\\")).toBe(false);
  });

  it("reads the advertised meta tag", () => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", studioPageMetaNameV1);
    meta.setAttribute("content", "/__sillymaker/studio/");
    document.head.append(meta);
    expect(readStudioPageHrefV1()).toBe("/__sillymaker/studio/");
  });

  it("lets an explicit empty href hide the advertised page", () => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", studioPageMetaNameV1);
    meta.setAttribute("content", "/__sillymaker/studio/");
    document.head.append(meta);
    expect(resolveStudioPageHrefV1("")).toBeUndefined();
    expect(resolveStudioPageHrefV1("javascript:alert(1)")).toBeUndefined();
  });
});
