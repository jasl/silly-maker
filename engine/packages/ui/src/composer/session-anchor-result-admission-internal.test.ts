// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { admitSettledSessionAnchorResultInternalV1 } from "./session-anchor-result-admission-internal.ts";

describe("admitSettledSessionAnchorResultInternalV1", () => {
  it.each([
    Object.freeze({ kind: "anchored" as const, commandSequence: 0 }),
    Object.freeze({ kind: "anchored" as const, commandSequence: Number.MAX_SAFE_INTEGER }),
    Object.freeze({ kind: "rejected" as const, code: "busy" as const }),
    Object.freeze({ kind: "rejected" as const, code: "fault_paused" as const }),
    Object.freeze({ kind: "rejected" as const, code: "hmr_invalidated" as const }),
    Object.freeze({ kind: "rejected" as const, code: "validation_failed" as const }),
    Object.freeze({ kind: "faulted" as const, code: "runtime.anchor_failed" }),
  ])("projects one exact settled result without retaining caller identity: %o", (value) => {
    const admitted = admitSettledSessionAnchorResultInternalV1(value);

    expect(admitted).toEqual(value);
    expect(admitted).not.toBe(value);
    expect(Object.getPrototypeOf(admitted)).toBe(Object.prototype);
    expect(Object.isFrozen(admitted)).toBe(true);
  });

  it("accepts an exact null-prototype data record", () => {
    const value = Object.create(null) as Record<string, unknown>;
    Object.defineProperties(value, {
      kind: { value: "anchored", enumerable: true },
      commandSequence: { value: 17, enumerable: true },
    });

    expect(admitSettledSessionAnchorResultInternalV1(value)).toEqual({
      kind: "anchored",
      commandSequence: 17,
    });
  });

  it.each([
    undefined,
    null,
    true,
    "anchored",
    1,
    [],
    Promise.resolve({ kind: "anchored", commandSequence: 0 }),
    Object.freeze({ kind: "unknown", commandSequence: 0 }),
    Object.freeze({ kind: "anchored" }),
    Object.freeze({ kind: "anchored", commandSequence: 0, extra: true }),
    Object.freeze({ kind: "anchored", commandSequence: -0 }),
    Object.freeze({ kind: "anchored", commandSequence: -1 }),
    Object.freeze({ kind: "anchored", commandSequence: 0.5 }),
    Object.freeze({ kind: "anchored", commandSequence: Number.MAX_SAFE_INTEGER + 1 }),
    Object.freeze({ kind: "rejected", code: "unknown" }),
    Object.freeze({ kind: "faulted", code: new String("runtime.anchor_failed") }),
    Object.freeze({ kind: "faulted", code: 1 }),
    Object.assign(Object.create({ kind: "anchored" }), { commandSequence: 0 }),
    Object.assign(Object.create(Date.prototype), { kind: "anchored", commandSequence: 0 }),
  ])("rejects a malformed settled result without assimilation: %o", (value) => {
    expect(() => admitSettledSessionAnchorResultInternalV1(value)).toThrowError(
      "ui.lifecycle_restart_result_invalid",
    );
  });

  it("rejects accessor, symbol, hostile and revoked records without invoking a getter", () => {
    const getter = vi.fn(() => "anchored");
    const accessor = Object.defineProperties({}, {
      kind: { get: getter, enumerable: true },
      commandSequence: { value: 0, enumerable: true },
    });
    const symbolRecord = Object.assign({ kind: "anchored", commandSequence: 0 }, {
      [Symbol("extra")]: true,
    });
    const hostile = new Proxy({}, {
      getPrototypeOf: () => {
        throw new Error("hostile prototype");
      },
    });
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();

    for (const value of [accessor, symbolRecord, hostile, revocable.proxy]) {
      expect(() => admitSettledSessionAnchorResultInternalV1(value)).toThrowError(
        "ui.lifecycle_restart_result_invalid",
      );
    }
    expect(getter).not.toHaveBeenCalled();
  });
});
