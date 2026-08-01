// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { authoritativeOrderingVectorExpectedV1 } from "./authoritative-ordering-vector-expected.ts";
import { runAuthoritativeOrderingVectorsV1 } from "./authoritative-ordering-vectors.ts";

describe("authoritative ordering vectors", () => {
  it("matches the fixed Event Pool, Content DB, Session, log, and replay oracle", async () => {
    const localeCompare = vi.spyOn(String.prototype, "localeCompare").mockImplementation(() => {
      throw new TypeError("authoritative vector consulted the Host locale");
    });

    try {
      const first = await runAuthoritativeOrderingVectorsV1();
      const second = await runAuthoritativeOrderingVectorsV1();
      expect(first).toEqual(authoritativeOrderingVectorExpectedV1);
      expect(second).toEqual(authoritativeOrderingVectorExpectedV1);
      expect(localeCompare).not.toHaveBeenCalled();
    } finally {
      localeCompare.mockRestore();
    }
  });
});
