// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import {
  compileContentScaleFixtureV1,
  contentScaleEntriesPerPackV1,
  contentScaleProfileEntryCountsV1,
  contentScaleProfileLocaleCountsV1,
  contentScaleProfilePackCountsV1,
  createContentScaleFixtureV1,
} from "../../bench/content-scale.ts";

describe("content scale fixture", () => {
  it("keeps identical minimal mutable State across both profiles", () => {
    const reference = createContentScaleFixtureV1("content-reference");
    const scale = createContentScaleFixtureV1("content-scale");

    expect(reference.entryCount).toBe(2_000);
    expect(scale.entryCount).toBe(100_000);
    expect(reference.packCount).toBe(2);
    expect(scale.packCount).toBe(100);
    expect(reference.localeCount).toBe(3);
    expect(scale.localeCount).toBe(8);
    expect(reference.variantCount).toBe(6);
    expect(scale.variantCount).toBe(800);
    expect(canonicalJsonBytes(reference.mutableState)).toEqual(
      canonicalJsonBytes(scale.mutableState),
    );
    expect(reference.mutableState).toBe(scale.mutableState);
    expect(reference.doc.entry).toBe(scale.doc.entry);
    expect(createContentScaleFixtureV1("content-reference").doc).toEqual(reference.doc);
    expect(contentScaleProfileEntryCountsV1).toEqual({
      "content-reference": 2_000,
      "content-scale": 100_000,
    });
    expect(contentScaleProfilePackCountsV1).toEqual({
      "content-reference": 2,
      "content-scale": 100,
    });
    expect(contentScaleProfileLocaleCountsV1).toEqual({
      "content-reference": 3,
      "content-scale": 8,
    });
    expect(contentScaleEntriesPerPackV1).toBe(1_000);
  });

  it("keeps the same control plan and loads only the first pack", async () => {
    let mutableStateObservation:
      | Readonly<{ readonly bytes: number; readonly digest: string }>
      | undefined;

    for (const profile of ["content-reference", "content-scale"] as const) {
      const result = await compileContentScaleFixtureV1(createContentScaleFixtureV1(profile));
      const expected = contentScaleProfileEntryCountsV1[profile];

      expect({
        runtimeNodeCount: result.correctness.runtimeNodeCount,
        inlineTextEntryCount: result.correctness.inlineTextEntryCount,
        manifestPackCount: result.correctness.manifestPackCount,
        manifestLocaleCount: result.correctness.manifestLocaleCount,
        manifestVariantCount: result.correctness.manifestVariantCount,
        fixtureTextEntryCount: result.correctness.fixtureTextEntryCount,
        loadedPackCount: result.correctness.loadedPackCount,
        loadedVariantCount: result.correctness.loadedVariantCount,
        loadedTextEntryCount: result.correctness.loadedTextEntryCount,
        requestedVariantLoadCount: result.correctness.requestedVariantLoadCount,
        unrequestedVariantLoadCount: result.correctness.unrequestedVariantLoadCount,
        coldVariantCount: result.correctness.coldVariantCount,
        firstTextId: result.correctness.firstTextId,
        lastTextId: result.correctness.lastTextId,
        firstText: result.correctness.firstText,
        fallbackText: result.correctness.fallbackText,
        activeLocale: result.correctness.activeLocale,
      }).toEqual({
        runtimeNodeCount: 2,
        inlineTextEntryCount: 0,
        manifestPackCount: contentScaleProfilePackCountsV1[profile],
        manifestLocaleCount: contentScaleProfileLocaleCountsV1[profile],
        manifestVariantCount: contentScaleProfilePackCountsV1[profile] *
          contentScaleProfileLocaleCountsV1[profile],
        fixtureTextEntryCount: expected,
        loadedPackCount: 1,
        loadedVariantCount: 2,
        loadedTextEntryCount: 1_500,
        requestedVariantLoadCount: 2,
        unrequestedVariantLoadCount: 0,
        coldVariantCount: contentScaleProfilePackCountsV1[profile] *
            contentScaleProfileLocaleCountsV1[profile] -
          2,
        firstTextId: "text.scale.line.000000",
        lastTextId: `text.scale.line.${String(expected - 1).padStart(6, "0")}`,
        firstText: `${
          profile === "content-reference" ? "zh-CN" : "zh-TW"
        } synthetic content line 000000`,
        fallbackText: "en synthetic content line 000001",
        activeLocale: profile === "content-reference" ? "zh-CN" : "zh-TW",
      });
      const currentStateObservation = {
        bytes: result.correctness.mutableStateCanonicalBytes,
        digest: result.correctness.mutableStateDigest,
      };
      if (mutableStateObservation === undefined) {
        mutableStateObservation = currentStateObservation;
      } else {
        expect(currentStateObservation).toEqual(mutableStateObservation);
      }
      result.session.dispose();
    }
  });
});
