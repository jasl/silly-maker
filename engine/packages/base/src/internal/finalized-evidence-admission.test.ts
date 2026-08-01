// SPDX-License-Identifier: MIT
import { expect, it } from "vitest";

import { CanonicalJsonError, canonicalJsonBytes } from "../contracts/canonical-json.ts";
import {
  admitCommandAttemptEvidenceInternalV1,
  admitDebugValidationErrorsInternalV1,
} from "./finalized-evidence-admission.ts";

function fixtureSnapshot() {
  return Object.freeze({
    rng: Object.freeze({ cursor: 1 }),
    commandSequence: 0,
  });
}

function dynamicLengthArrayV1<T>(items: readonly T[]): {
  readonly value: readonly T[];
  readonly lengthReads: () => number;
  readonly lengthDescriptorReads: () => number;
} {
  const target = [...items];
  let lengthReads = 0;
  let lengthDescriptorReads = 0;
  return {
    value: new Proxy(target, {
      get(array, key, receiver) {
        if (key === "length") {
          lengthReads += 1;
          return lengthReads <= target.length ? target.length : target.length - 1;
        }
        return Reflect.get(array, key, receiver);
      },
      getOwnPropertyDescriptor(array, key) {
        if (key === "length") lengthDescriptorReads += 1;
        return Reflect.getOwnPropertyDescriptor(array, key);
      },
    }),
    lengthReads: () => lengthReads,
    lengthDescriptorReads: () => lengthDescriptorReads,
  };
}

it("captures committed evidence vectors from one fixed own length descriptor", () => {
  const snapshot = fixtureSnapshot();
  const facts = dynamicLengthArrayV1([
    { kind: "fixture.fact", ordinal: 1 },
    { kind: "fixture.fact", ordinal: 2 },
  ]);
  const attemptedDraws = dynamicLengthArrayV1([
    { kind: "fixture.draw", ordinal: 1 },
    { kind: "fixture.draw", ordinal: 2 },
  ]);

  const admitted = admitCommandAttemptEvidenceInternalV1(snapshot, {
    result: {
      kind: "committed",
      snapshot,
      facts: facts.value,
    },
    diagnostics: {
      committedRngBefore: snapshot.rng,
      attemptedDraws: attemptedDraws.value,
      candidateRngAfter: snapshot.rng,
      committedRngAfter: snapshot.rng,
    },
  });

  if (admitted.result.kind !== "committed") throw new Error("expected committed evidence");
  expect(admitted.result.facts).toHaveLength(2);
  expect(admitted.diagnostics.attemptedDraws).toHaveLength(2);
  expect(facts.lengthReads()).toBe(0);
  expect(attemptedDraws.lengthReads()).toBe(0);
  expect(facts.lengthDescriptorReads()).toBe(1);
  expect(attemptedDraws.lengthDescriptorReads()).toBe(1);
});

it("captures rejected evidence vectors from one fixed own length descriptor", () => {
  const snapshot = fixtureSnapshot();
  const reasons = dynamicLengthArrayV1([
    { code: "fixture.first" },
    { code: "fixture.second" },
  ]);

  const admitted = admitCommandAttemptEvidenceInternalV1(snapshot, {
    result: {
      kind: "rejected",
      snapshot,
      reasons: reasons.value,
    },
    diagnostics: {
      committedRngBefore: snapshot.rng,
      attemptedDraws: [],
      committedRngAfter: snapshot.rng,
    },
  });

  if (admitted.result.kind !== "rejected") throw new Error("expected rejected evidence");
  expect(admitted.result.reasons).toHaveLength(2);
  expect(reasons.lengthReads()).toBe(0);
  expect(reasons.lengthDescriptorReads()).toBe(1);
});

it("captures Debug validation errors from one fixed own length descriptor", () => {
  const errors = dynamicLengthArrayV1([
    { code: "fixture.first" },
    { code: "fixture.second" },
  ]);

  const admitted = admitDebugValidationErrorsInternalV1(errors.value, undefined);

  expect(admitted).toHaveLength(2);
  expect(errors.lengthReads()).toBe(0);
  expect(errors.lengthDescriptorReads()).toBe(1);
});

it("rejects a maximum-length sparse evidence array at its first hole without materializing indices", () => {
  const snapshot = fixtureSnapshot();
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

it("returns canonical evidence projections without retaining normalized raw identity state", () => {
  const snapshot = fixtureSnapshot();
  const shared = { value: 1 };
  let virtualReads = 0;
  const rawFactTarget = {
    kind: "fixture.fact" as const,
    first: shared,
    second: shared,
  };
  const rawFact = new Proxy(rawFactTarget, {
    get(target, key, receiver) {
      if (key === "virtual") return ++virtualReads;
      return Reflect.get(target, key, receiver);
    },
  });
  const sideTable = new WeakMap<object, string>([[rawFact, "raw-only"]]);
  const expectedBytes = canonicalJsonBytes(rawFact);
  const attempt = {
    result: {
      kind: "committed" as const,
      snapshot,
      facts: [rawFact],
    },
    diagnostics: {
      committedRngBefore: snapshot.rng,
      attemptedDraws: [],
      candidateRngAfter: snapshot.rng,
      committedRngAfter: snapshot.rng,
    },
  };

  const admitted = admitCommandAttemptEvidenceInternalV1(snapshot, attempt);
  if (admitted.result.kind !== "committed") throw new Error("expected committed evidence");
  const fact = admitted.result.facts[0] as typeof rawFactTarget & {
    readonly virtual?: number;
  };

  expect(fact).not.toBe(rawFact);
  expect(fact.first).not.toBe(shared);
  expect(fact.second).not.toBe(shared);
  expect(fact.first).not.toBe(fact.second);
  expect(fact.virtual).toBeUndefined();
  expect(virtualReads).toBe(0);
  expect(sideTable.has(fact)).toBe(false);
  expect(Object.isFrozen(fact)).toBe(true);
  expect(Object.isFrozen(fact.first)).toBe(true);
  expect(Object.isFrozen(rawFact)).toBe(false);
  expect(Object.isFrozen(shared)).toBe(false);
  expect(canonicalJsonBytes(fact)).toEqual(expectedBytes);
});

it("does not carry private elements from canonical-looking normalized evidence", () => {
  class HiddenValidationError {
    #counter = 0;
    readonly code = "fixture.hidden";

    static next(value: HiddenValidationError): number {
      return ++value.#counter;
    }
  }

  const raw = new HiddenValidationError();
  Object.setPrototypeOf(raw, Object.prototype);

  const admitted = admitDebugValidationErrorsInternalV1([raw], undefined);

  expect(admitted[0]).not.toBe(raw);
  expect(() => HiddenValidationError.next(admitted[0] as HiddenValidationError)).toThrow(
    TypeError,
  );
  expect(HiddenValidationError.next(raw)).toBe(1);
  expect(Object.isFrozen(raw)).toBe(false);
});
