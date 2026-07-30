// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { recordSnapshotWorkV1 } from "./snapshot-work-instrumentation.ts";

describe("Snapshot work instrumentation", () => {
  it("attaches rejection handling to asynchronous probe results", () => {
    const asynchronousResult = Promise.resolve();
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
  });
});
