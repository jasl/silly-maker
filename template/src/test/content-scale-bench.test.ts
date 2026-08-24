// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import {
  compileContentScaleFixtureV1,
  contentScaleEntriesPerPackV1,
  contentScaleProfileEntryCountsV1,
  contentScaleProfilePackCountsV1,
  createContentScaleFixtureV1,
} from "../../bench/content-scale.ts";

describe("content scale fixture", () => {
  it("keeps identical minimal mutable State across both profiles", () => {
    const reference = createContentScaleFixtureV1("content-reference");
    const scale = createContentScaleFixtureV1("content-scale");

    expect(reference.entryCount).toBe(1_000);
    expect(scale.entryCount).toBe(100_000);
    expect(reference.packCount).toBe(1);
    expect(scale.packCount).toBe(100);
    expect(canonicalJsonBytes(reference.mutableState)).toEqual(
      canonicalJsonBytes(scale.mutableState),
    );
    expect(reference.mutableState).toBe(scale.mutableState);
    expect(reference.doc.entry).toBe(scale.doc.entry);
    expect(createContentScaleFixtureV1("content-reference").doc).toEqual(reference.doc);
    expect(contentScaleProfileEntryCountsV1).toEqual({
      "content-reference": 1_000,
      "content-scale": 100_000,
    });
    expect(contentScaleProfilePackCountsV1).toEqual({
      "content-reference": 1,
      "content-scale": 100,
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
        fixtureTextEntryCount: result.correctness.fixtureTextEntryCount,
        loadedPackCount: result.correctness.loadedPackCount,
        loadedTextEntryCount: result.correctness.loadedTextEntryCount,
        firstTextId: result.correctness.firstTextId,
        lastTextId: result.correctness.lastTextId,
        firstText: result.correctness.firstText,
      }).toEqual({
        runtimeNodeCount: 2,
        inlineTextEntryCount: 0,
        manifestPackCount: contentScaleProfilePackCountsV1[profile],
        fixtureTextEntryCount: expected,
        loadedPackCount: 1,
        loadedTextEntryCount: 1_000,
        firstTextId: "text.scale.line.000000",
        lastTextId: `text.scale.line.${String(expected - 1).padStart(6, "0")}`,
        firstText: "Synthetic content line 000000",
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
    }
  });
});
