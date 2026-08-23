// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  contentBundleScalePackJsonV1,
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

  it("generates one admitted JSON-shaped text pack without executable content", () => {
    const pack = JSON.parse(contentBundleScalePackJsonV1({
      packIndex: 2,
      entriesPerPack: 3,
    }));
    expect(pack).toMatchObject({
      format: "sillymaker.text-content-pack",
      version: 1,
      packId: "text-pack.scale.002",
      textCatalogs: { defaultLocale: "en" },
    });
    expect(pack.textCatalogs.catalogs[0].entries.map((entry: { textId: string }) => entry.textId))
      .toEqual([
        "text.scale.line.000006",
        "text.scale.line.000007",
        "text.scale.line.000008",
      ]);
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
