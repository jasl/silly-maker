// SPDX-License-Identifier: MIT
import { expect, it } from "vitest";

import { CanonicalJsonError } from "../contracts/canonical-json.ts";
import { admitCommandAttemptEvidenceInternalV1 } from "./finalized-evidence-admission.ts";

it("rejects a maximum-length sparse evidence array at its first hole without materializing indices", () => {
  const snapshot = Object.freeze({
    rng: Object.freeze({ cursor: 1 }),
    commandSequence: 0,
  });
  const facts: unknown[] = [];
  facts.length = 0xffff_ffff;
  const attempt = {
    result: {
      kind: "committed" as const,
      snapshot,
      facts,
    },
    diagnostics: {
      committedRngBefore: snapshot.rng,
      attemptedDraws: [],
      candidateRngAfter: snapshot.rng,
      committedRngAfter: snapshot.rng,
    },
  };

  let failure: unknown;
  try {
    admitCommandAttemptEvidenceInternalV1(snapshot, attempt);
  } catch (error) {
    failure = error;
  }

  expect(failure).toBeInstanceOf(CanonicalJsonError);
  expect(failure).toMatchObject({
    code: "value.sparse_array",
    path: "/result/facts/0",
  });
  expect(Object.isFrozen(facts)).toBe(false);
});
