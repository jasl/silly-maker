// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import {
  compileContentScaleFixtureV1,
  contentScaleProfileEntryCountsV1,
  createContentScaleFixtureV1,
} from "../../bench/content-scale.ts";

describe("content scale fixture", () => {
  it("keeps identical minimal mutable State across both profiles", () => {
    const reference = createContentScaleFixtureV1("content-reference");
    const scale = createContentScaleFixtureV1("content-scale");

    expect(reference.entryCount).toBe(1_000);
    expect(scale.entryCount).toBe(100_000);
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
  });

  it("retains exact compiler and TextCatalog counts", () => {
    let mutableStateObservation:
      | Readonly<{ readonly bytes: number; readonly digest: string }>
      | undefined;

    for (const profile of ["content-reference", "content-scale"] as const) {
      const result = compileContentScaleFixtureV1(createContentScaleFixtureV1(profile));
      const expected = contentScaleProfileEntryCountsV1[profile];

      expect({
        runtimeNodeCount: result.correctness.runtimeNodeCount,
        textEntryCount: result.correctness.textEntryCount,
        flowNodeCount: result.correctness.flowNodeCount,
        flowEdgeCount: result.correctness.flowEdgeCount,
        catalogEntryCount: result.correctness.catalogEntryCount,
        firstTextId: result.correctness.firstTextId,
        lastTextId: result.correctness.lastTextId,
      }).toEqual({
        runtimeNodeCount: expected + 1,
        textEntryCount: expected,
        flowNodeCount: expected + 1,
        flowEdgeCount: expected,
        catalogEntryCount: expected,
        firstTextId: "text.scale.line.line-000000",
        lastTextId: `text.scale.line.line-${String(expected - 1).padStart(6, "0")}`,
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
