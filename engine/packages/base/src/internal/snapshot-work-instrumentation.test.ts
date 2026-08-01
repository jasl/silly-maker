// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  createPurposeTaggedSnapshotWorkCounterV1,
  recordSnapshotWorkV1,
} from "./snapshot-work-instrumentation.ts";

describe("Snapshot work instrumentation", () => {
  it("isolates synchronous probe failures", () => {
    expect(() =>
      recordSnapshotWorkV1(
        {
          record() {
            throw new Error("broken synchronous probe");
          },
        },
        "canonical_digest",
      )
    ).not.toThrow();
  });

  it("consumes asynchronous probe rejections", async () => {
    const asynchronousResult = Promise.reject(new Error("broken asynchronous probe"));
    const catchSpy = vi.spyOn(asynchronousResult, "catch");

    recordSnapshotWorkV1(
      {
        record() {
          return asynchronousResult;
        },
      },
      "canonical_digest",
    );

    expect(catchSpy).toHaveBeenCalledOnce();
    await Promise.resolve();
  });

  it("counts physical canonical work separately from its authoritative purpose", () => {
    const counter = createPurposeTaggedSnapshotWorkCounterV1();

    recordSnapshotWorkV1(counter.instrumentation, "canonical_traversal", "snapshot_digest");
    recordSnapshotWorkV1(counter.instrumentation, "canonical_traversal", "replay_comparison");
    recordSnapshotWorkV1(counter.instrumentation, "canonical_traversal");
    recordSnapshotWorkV1(counter.instrumentation, "deep_freeze_traversal", "snapshot_freeze");
    recordSnapshotWorkV1(
      counter.instrumentation,
      "canonical_traversal",
      "bootstrap_admission",
    );
    recordSnapshotWorkV1(
      counter.instrumentation,
      "deep_freeze_traversal",
      "bootstrap_handoff_freeze",
    );

    expect(counter.snapshot()).toEqual({
      snapshotDigestTraversals: 1,
      snapshotFreezeTraversals: 1,
      bootstrapAdmissionCanonicalTraversals: 1,
      bootstrapHandoffFreezeTraversals: 1,
      commandAdmissionCanonicalTraversals: 0,
      evidenceAdmissionCanonicalTraversals: 0,
      replayComparisonTraversals: 1,
      totalPhysicalCanonicalTraversals: 4,
    });
  });
});
