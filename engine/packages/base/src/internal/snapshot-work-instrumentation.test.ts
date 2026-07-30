// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { recordSnapshotWorkV1 } from "./snapshot-work-instrumentation.ts";

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
      ),
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
});
