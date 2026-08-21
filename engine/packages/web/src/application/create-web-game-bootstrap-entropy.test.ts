// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createWebGameBootstrapEntropyInternalV1 } from "./create-web-game-bootstrap-entropy.ts";

describe("Web Game Domain bootstrap entropy", () => {
  it("adapts Web crypto without sharing Application Host capabilities", () => {
    const samples = [0, 7];
    const cryptoPort = Object.freeze({
      randomUUID: () =>
        "00000000-0000-4000-8000-000000000001" as `${string}-${string}-${string}-${string}-${string}`,
      getRandomValues<T extends ArrayBufferView | null>(values: T): T {
        if (!(values instanceof Uint32Array)) throw new TypeError("expected Uint32Array");
        const sample = samples.shift();
        if (sample === undefined) throw new RangeError("crypto samples exhausted");
        values[0] = sample;
        return values;
      },
    }) satisfies Pick<Crypto, "getRandomValues" | "randomUUID">;

    const entropy = createWebGameBootstrapEntropyInternalV1(cryptoPort);

    expect(entropy.nextUuidV4()).toBe("00000000-0000-4000-8000-000000000001");
    expect(entropy.nextNonZeroUint32()).toBe(7);
    expect(samples).toEqual([]);
    expect(Object.isFrozen(entropy)).toBe(true);
  });
});
