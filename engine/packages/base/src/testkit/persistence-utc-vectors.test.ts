// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  evaluatePersistenceUtcAdmissionVectorsV1,
  persistenceUtcAdmissionExpectedV1,
} from "./persistence-utc-vectors.ts";

describe("B-prime persistence UTC vectors", () => {
  it("admits and rejects the fixed corpus without Host Date semantics", () => {
    expect(evaluatePersistenceUtcAdmissionVectorsV1()).toEqual(
      persistenceUtcAdmissionExpectedV1,
    );
  });
});
