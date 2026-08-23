// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  contentBundleScaleFixtureV1,
  initialJavaScriptPathsFromViteManifestV1,
} from "./content-bundle-scale-helpers.ts";

describe("content bundle scale fixture", () => {
  it("changes only the amount of unselected content", () => {
    expect(contentBundleScaleFixtureV1("bundle-reference")).toEqual({
      profile: "bundle-reference",
      packCount: 1,
      entriesPerPack: 1_000,
      entryCount: 1_000,
      selectedPackIndex: 0,
    });
    expect(contentBundleScaleFixtureV1("bundle-scale")).toEqual({
      profile: "bundle-scale",
      packCount: 100,
      entriesPerPack: 1_000,
      entryCount: 100_000,
      selectedPackIndex: 0,
    });
  });

  it("walks the initial static JavaScript closure once", () => {
    expect(initialJavaScriptPathsFromViteManifestV1({
      "index.html": { file: "assets/index.js", imports: ["vendor.ts"], isEntry: true },
      "vendor.ts": { file: "assets/vendor.js", imports: ["shared.ts"] },
      "shared.ts": { file: "assets/shared.js", imports: ["vendor.ts"] },
      "lazy.ts": { file: "assets/lazy.js" },
    })).toEqual([
      "assets/index.js",
      "assets/shared.js",
      "assets/vendor.js",
    ]);
  });
});
