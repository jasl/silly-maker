// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { digestBytes } from "../contracts/digest.ts";
import {
  defineSaveStateMigrationRegistryV1,
  parseSaveStateMigrationIdV1,
  parseSaveStateMigrationNamespaceV1,
  parseSaveStateMigrationReasonCodeV1,
} from "../contracts/save-state-migration.ts";
import type {
  SaveStateContractIdentityV1,
  SaveStateMigrationReferenceChangesV1,
  SaveStateMigrationStepV1,
} from "../contracts/save-state-migration.ts";
import { parseStrictJsonLimitsV1 } from "../contracts/strict-json.ts";
import type { StrictJsonLimitsV1, StrictJsonValueV1 } from "../contracts/strict-json.ts";
import { parsePositiveSafeInteger } from "../contracts/values.ts";
import {
  createSaveStateMigrationAttemptInternalV1,
  createSaveStateMigrationReceiptInternalV1,
  executeResolvedSaveStateMigrationInternalV1,
  resolveSaveStateMigrationChainInternalV1,
} from "./save-state-migration-execution.ts";
import type {
  ResolvedSaveStateMigrationChainInternalV1,
  SaveStateMigrationExecutionResultInternalV1,
} from "./save-state-migration-execution.ts";

const namespaceV1 = parseSaveStateMigrationNamespaceV1("state.synthetic.aggregate");
const sourceStateDigestV1 = digestBytes(
  new TextEncoder().encode("raw historical whole Snapshot digest"),
);
const finalSnapshotDigestV1 = digestBytes(
  new TextEncoder().encode("final normalized whole Snapshot digest"),
);
const generousLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 16_384,
  maxDepth: 16,
  maxArrayItems: 128,
  maxObjectMembers: 128,
  maxNodes: 1_024,
  maxStringBytes: 4_096,
});
const emptyReferencesV1: SaveStateMigrationReferenceChangesV1 = Object.freeze({
  renames: Object.freeze([]),
  deletions: Object.freeze([]),
});

function identityV1(revision: number, label = String(revision)): SaveStateContractIdentityV1 {
  return {
    stateContractRevision: parsePositiveSafeInteger(revision),
    stateContractDigest: digestBytes(new TextEncoder().encode(`state-contract:${label}`)),
  };
}

function stepV1(
  from: SaveStateContractIdentityV1,
  to: SaveStateContractIdentityV1,
  label: string,
  migrate: SaveStateMigrationStepV1["migrate"],
  references: SaveStateMigrationReferenceChangesV1 = emptyReferencesV1,
): SaveStateMigrationStepV1 {
  return {
    migrationId: parseSaveStateMigrationIdV1(`migration.synthetic.${label}`),
    namespace: namespaceV1,
    from,
    to,
    references,
    migrate,
  };
}

function resolveV1(
  registry: ReturnType<typeof defineSaveStateMigrationRegistryV1>,
  source: SaveStateContractIdentityV1,
): ResolvedSaveStateMigrationChainInternalV1 {
  const result = resolveSaveStateMigrationChainInternalV1(registry, source);
  expect(result.kind).toBe("resolved");
  if (result.kind !== "resolved") throw new Error("expected resolved migration chain");
  return result.chain;
}

function executeV1(
  chain: ResolvedSaveStateMigrationChainInternalV1,
  state: StrictJsonValueV1,
  limits: StrictJsonLimitsV1 = generousLimitsV1,
): SaveStateMigrationExecutionResultInternalV1 {
  return executeResolvedSaveStateMigrationInternalV1({
    chain,
    sourceStateDigest: sourceStateDigestV1,
    state,
    limits,
  });
}

function expectFrozenTreeV1(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (descriptor.get === undefined && descriptor.set === undefined) {
      expectFrozenTreeV1(descriptor.value);
    }
  }
}

describe("Save State migration pure execution", () => {
  it("executes one step with a detached frozen input and output without retaining raw aliases", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const rawInput = { count: 1, nested: { label: "raw" } };
    let rawOutput: { count: number; nested: { label: string } } | undefined;
    let callbackArgumentCount = -1;
    const migrateSpy = vi.fn(function (
      this: unknown,
      state: Readonly<Record<string, unknown>>,
    ) {
      callbackArgumentCount = arguments.length;
      expect(state).not.toBe(rawInput);
      expect(state.nested).not.toBe(rawInput.nested);
      expectFrozenTreeV1(state);
      rawOutput = { count: 2, nested: { label: "migrated" } };
      return { kind: "migrated" as const, state: rawOutput };
    });
    const migrate = migrateSpy as SaveStateMigrationStepV1["migrate"];
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: second,
      steps: [stepV1(first, second, "one", migrate)],
    });

    const result = executeV1(resolveV1(registry, first), rawInput);
    expect(result.kind).toBe("migrated");
    if (result.kind !== "migrated") return;
    expect(result.state).toEqual({ count: 2, nested: { label: "migrated" } });
    expect(result.state).not.toBe(rawOutput);
    expectFrozenTreeV1(result);
    expect(migrate).toHaveBeenCalledTimes(1);
    expect(migrateSpy.mock.contexts).toEqual([undefined]);
    expect(callbackArgumentCount).toBe(1);

    rawInput.count = 99;
    rawInput.nested.label = "mutated input";
    rawOutput!.count = 88;
    rawOutput!.nested.label = "mutated output";
    expect(result.state).toEqual({ count: 2, nested: { label: "migrated" } });

    const receipt = createSaveStateMigrationReceiptInternalV1(
      result.completion,
      finalSnapshotDigestV1,
    );
    expect(receipt).toEqual({
      namespace: namespaceV1,
      source: first,
      target: second,
      steps: [{
        migrationId: parseSaveStateMigrationIdV1("migration.synthetic.one"),
        from: first,
        to: second,
      }],
      sourceStateDigest: sourceStateDigestV1,
      migratedStateDigest: finalSnapshotDigestV1,
    });
    expect(receipt.sourceStateDigest).not.toBe(receipt.migratedStateDigest);
    expectFrozenTreeV1(receipt);
    expect(() =>
      createSaveStateMigrationReceiptInternalV1(
        { ...result.completion } as typeof result.completion,
        finalSnapshotDigestV1,
      )
    ).toThrow(TypeError);
  });

  it("executes a complete two-step path or its exact suffix with detached intermediate aliases", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const third = identityV1(3);
    const shared = { marker: "shared" };
    let firstRawOutput: Record<string, StrictJsonValueV1> | undefined;
    let firstCallbackInput: unknown;
    let secondCallbackInput: unknown;
    const firstCallback = vi.fn((state: StrictJsonValueV1) => {
      firstCallbackInput = state;
      firstRawOutput = { count: 2, left: shared, right: shared };
      return { kind: "migrated" as const, state: firstRawOutput };
    });
    const secondCallback = vi.fn((state: StrictJsonValueV1) => {
      secondCallbackInput = state;
      const record = state as Readonly<Record<string, StrictJsonValueV1>>;
      expect(state).not.toBe(firstRawOutput);
      expect(record.left).not.toBe(shared);
      expect(record.right).not.toBe(shared);
      expect(record.left).not.toBe(record.right);
      expectFrozenTreeV1(state);
      return { kind: "migrated" as const, state: { ...record, count: 3 } };
    });
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: third,
      steps: [
        stepV1(first, second, "first", firstCallback),
        stepV1(second, third, "second", secondCallback),
      ],
    });

    const full = executeV1(resolveV1(registry, first), { count: 1 });
    expect(full.kind).toBe("migrated");
    if (full.kind !== "migrated") return;
    expect(full.state).toEqual({
      count: 3,
      left: { marker: "shared" },
      right: { marker: "shared" },
    });
    expect(firstCallbackInput).not.toBe(secondCallbackInput);
    expect(firstCallback).toHaveBeenCalledTimes(1);
    expect(secondCallback).toHaveBeenCalledTimes(1);

    firstCallback.mockClear();
    secondCallback.mockClear();
    const suffix = executeV1(resolveV1(registry, second), {
      count: 2,
      left: { marker: "shared" },
      right: { marker: "shared" },
    });
    expect(suffix.kind).toBe("migrated");
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });

  it("is repeatable while returning independent immutable State, completion, and receipt data", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const callback = vi.fn((state: StrictJsonValueV1) => ({
      kind: "migrated" as const,
      state: { before: state, value: 2 },
    }));
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: second,
      steps: [stepV1(first, second, "repeat", callback)],
    });
    const chain = resolveV1(registry, first);

    const left = executeV1(chain, { value: 1 });
    const right = executeV1(chain, { value: 1 });
    expect(left.kind).toBe("migrated");
    expect(right.kind).toBe("migrated");
    if (left.kind !== "migrated" || right.kind !== "migrated") return;
    expect(canonicalJsonBytes(left.state)).toEqual(canonicalJsonBytes(right.state));
    expect(left.state).toEqual(right.state);
    expect(left.state).not.toBe(right.state);
    expect(left.completion).not.toBe(right.completion);
    expect(createSaveStateMigrationReceiptInternalV1(left.completion, finalSnapshotDigestV1))
      .toEqual(createSaveStateMigrationReceiptInternalV1(right.completion, finalSnapshotDigestV1));
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("resolves missing or mismatched source identities before touching State or callbacks", () => {
    const second = identityV1(2);
    const third = identityV1(3);
    const callback = vi.fn((state: StrictJsonValueV1) => ({ kind: "migrated" as const, state }));
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: second,
      current: third,
      steps: [stepV1(second, third, "available", callback)],
    });
    const stateGetter = vi.fn(() => 1);
    const hostileState = Object.defineProperty({}, "value", {
      enumerable: true,
      get: stateGetter,
    });

    for (
      const source of [
        identityV1(1),
        identityV1(2, "wrong-digest"),
        third,
        identityV1(4),
      ]
    ) {
      const resolved = resolveSaveStateMigrationChainInternalV1(registry, source);
      expect(resolved).toMatchObject({
        kind: "unavailable",
        code: "migration.unavailable",
      });
      expect(callback).not.toHaveBeenCalled();
      expect(stateGetter).not.toHaveBeenCalled();
    }

    expect(() =>
      executeV1(
        Object.freeze({}) as ResolvedSaveStateMigrationChainInternalV1,
        hostileState as never,
      )
    ).toThrow(TypeError);
    expect(callback).not.toHaveBeenCalled();
    expect(stateGetter).not.toHaveBeenCalled();
  });

  it("treats reference declarations as diagnostics while callbacks own rename and fallback semantics", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const references: SaveStateMigrationReferenceChangesV1 = {
      renames: [
        {
          referenceSetId: "references.synthetic.scene",
          fromId: "scene.synthetic.old",
          toId: "scene.synthetic.current",
        },
      ],
      deletions: [
        {
          referenceSetId: "references.synthetic.scene",
          id: "scene.synthetic.deleted",
          resolution: { kind: "fallback", toId: "scene.synthetic.current" },
        },
      ],
    };
    const identityRegistry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: second,
      steps: [
        stepV1(
          first,
          second,
          "reference-identity",
          (state) => ({ kind: "migrated", state }),
          references,
        ),
      ],
    });
    const raw = { renamed: "scene.synthetic.old", deleted: "scene.synthetic.deleted" };
    const unchanged = executeV1(resolveV1(identityRegistry, first), raw);
    expect(unchanged).toMatchObject({ kind: "migrated", state: raw });

    const transformingRegistry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: second,
      steps: [
        stepV1(
          first,
          second,
          "reference-transform",
          () => ({
            kind: "migrated",
            state: {
              renamed: "scene.synthetic.current",
              deleted: "scene.synthetic.current",
            },
          }),
          references,
        ),
      ],
    });
    expect(executeV1(resolveV1(transformingRegistry, first), raw)).toMatchObject({
      kind: "migrated",
      state: {
        renamed: "scene.synthetic.current",
        deleted: "scene.synthetic.current",
      },
    });

    const third = identityV1(3);
    const rejectReason = parseSaveStateMigrationReasonCodeV1(
      "migration.synthetic.deleted-reference",
    );
    const reject = vi.fn(() => ({ kind: "rejected" as const, reasonCode: rejectReason }));
    const later = vi.fn((state: StrictJsonValueV1) => ({ kind: "migrated" as const, state }));
    const rejectingRegistry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: third,
      steps: [
        stepV1(first, second, "reference-reject", reject, {
          renames: [],
          deletions: [
            {
              referenceSetId: "references.synthetic.scene",
              id: "scene.synthetic.deleted",
              resolution: { kind: "reject", reasonCode: rejectReason },
            },
          ],
        }),
        stepV1(second, third, "reference-reject-not-run", later),
      ],
    });
    expect(executeV1(resolveV1(rejectingRegistry, first), raw)).toMatchObject({
      kind: "rejected",
      code: "migration.rejected",
      reasonCode: rejectReason,
      migrationAttempt: { failingPhase: "callback_rejected" },
    });
    expect(reject).toHaveBeenCalledTimes(1);
    expect(later).not.toHaveBeenCalled();
  });

  it("reports exact first- and second-step rejection attempts without running later callbacks", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const third = identityV1(3);
    const reasonCode = parseSaveStateMigrationReasonCodeV1("migration.synthetic.declined");
    const firstSuccess = vi.fn((state: StrictJsonValueV1) => ({
      kind: "migrated" as const,
      state,
    }));
    const reject = vi.fn(() => ({ kind: "rejected" as const, reasonCode }));
    const later = vi.fn((state: StrictJsonValueV1) => ({ kind: "migrated" as const, state }));

    const firstRejectRegistry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: third,
      steps: [
        stepV1(first, second, "reject-first", reject),
        stepV1(second, third, "not-run", later),
      ],
    });
    const firstRejected = executeV1(resolveV1(firstRejectRegistry, first), { value: 1 });
    expect(firstRejected).toMatchObject({
      kind: "rejected",
      code: "migration.rejected",
      reasonCode,
      migrationAttempt: {
        source: first,
        target: third,
        completedSteps: [],
        failingStep: {
          migrationId: parseSaveStateMigrationIdV1("migration.synthetic.reject-first"),
        },
        failingPhase: "callback_rejected",
        migratedStateDigest: null,
      },
    });
    expect(later).not.toHaveBeenCalled();

    const secondRejectRegistry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: third,
      steps: [
        stepV1(first, second, "completed", firstSuccess),
        stepV1(second, third, "reject-second", reject),
      ],
    });
    const secondRejected = executeV1(resolveV1(secondRejectRegistry, first), { value: 1 });
    expect(secondRejected).toMatchObject({
      kind: "rejected",
      code: "migration.rejected",
      reasonCode,
      migrationAttempt: {
        completedSteps: [
          { migrationId: parseSaveStateMigrationIdV1("migration.synthetic.completed") },
        ],
        failingStep: {
          migrationId: parseSaveStateMigrationIdV1("migration.synthetic.reject-second"),
        },
        failingPhase: "callback_rejected",
        migratedStateDigest: null,
      },
    });
    expect(firstSuccess).toHaveBeenCalledTimes(1);
    expectFrozenTreeV1(secondRejected);
  });

  it.each([
    ["first", 0],
    ["second", 1],
  ])(
    "redacts a %s-step callback throw and preserves only the completed prefix",
    (_label, throwIndex) => {
      const first = identityV1(1);
      const second = identityV1(2);
      const third = identityV1(3);
      const secretGetter = vi.fn(() => "secret getter value");
      const hostileThrown = Object.defineProperties({}, {
        message: { enumerable: true, get: secretGetter },
        stack: { enumerable: true, get: secretGetter },
        cause: { enumerable: true, get: secretGetter },
      });
      const callbacks = [0, 1].map((index) =>
        vi.fn((state: StrictJsonValueV1) => {
          if (index === throwIndex) throw hostileThrown;
          return { kind: "migrated" as const, state };
        })
      );
      const registry = defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: first,
        current: third,
        steps: [
          stepV1(first, second, "throw-first", callbacks[0]!),
          stepV1(second, third, "throw-second", callbacks[1]!),
        ],
      });

      const result = executeV1(resolveV1(registry, first), { value: 1 });
      expect(result).toMatchObject({
        kind: "faulted",
        code: "migration.callback_threw",
        migrationAttempt: {
          completedSteps: expect.any(Array),
          failingPhase: "callback",
          migratedStateDigest: null,
        },
      });
      expect(Object.keys(result).sort()).toEqual(["code", "kind", "migrationAttempt"]);
      expect(JSON.stringify(result)).not.toContain("secret");
      expect(secretGetter).not.toHaveBeenCalled();
      expect(callbacks[0]).toHaveBeenCalledTimes(1);
      expect(callbacks[1]).toHaveBeenCalledTimes(throwIndex === 1 ? 1 : 0);
      if (result.kind === "faulted") {
        expect(result.migrationAttempt.completedSteps).toHaveLength(throwIndex);
        expect(result.migrationAttempt.completedSteps.map(({ migrationId }) => migrationId))
          .toEqual(
            throwIndex === 0
              ? []
              : [parseSaveStateMigrationIdV1("migration.synthetic.throw-first")],
          );
        expect(result.migrationAttempt.failingStep?.migrationId).toBe(
          parseSaveStateMigrationIdV1(
            throwIndex === 0
              ? "migration.synthetic.throw-first"
              : "migration.synthetic.throw-second",
          ),
        );
      }
    },
  );

  it("maps malformed callback result envelopes to output_invalid without invoking accessors", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const getter = vi.fn(() => "migrated");
    const stateGetter = vi.fn(() => ({ value: 2 }));
    const reasonGetter = vi.fn(() => "migration.synthetic.declined");
    const thenGetter = vi.fn(() => () => undefined);
    const throwingTrap = vi.fn(() => {
      throw new Error("hostile result trap");
    });
    const symbolResult = { kind: "migrated", state: { value: 2 }, [Symbol("extra")]: true };
    const cases: readonly unknown[] = [
      undefined,
      null,
      1,
      [],
      Promise.resolve({ kind: "migrated", state: { value: 2 } }),
      // oxlint-disable-next-line unicorn/no-thenable -- deliberate hostile callback result
      { kind: "migrated", state: { value: 2 }, then: () => undefined },
      // oxlint-disable-next-line unicorn/no-thenable -- verifies the executor never reads then
      Object.defineProperty({ kind: "migrated", state: { value: 2 } }, "then", {
        enumerable: true,
        get: thenGetter,
      }),
      { kind: "migrated" },
      { kind: "migrated", state: { value: 2 }, extra: true },
      symbolResult,
      Object.defineProperty({ state: { value: 2 } }, "kind", {
        enumerable: true,
        get: getter,
      }),
      Object.defineProperty({ kind: "migrated" }, "state", {
        enumerable: true,
        get: stateGetter,
      }),
      Object.defineProperty({ kind: "rejected" }, "reasonCode", {
        enumerable: true,
        get: reasonGetter,
      }),
      Object.assign(Object.create(null), { kind: "migrated", state: { value: 2 } }),
      Object.assign(Object.create({}), { kind: "migrated", state: { value: 2 } }),
      { kind: "unknown", state: { value: 2 } },
      { kind: "rejected", reasonCode: "INVALID REASON" },
      { kind: "rejected", reasonCode: "migration.synthetic.declined", extra: true },
      new Proxy({}, { getPrototypeOf: throwingTrap }),
    ];

    for (const [index, invalidResult] of cases.entries()) {
      let callbackCount = 0;
      const callback = (() => {
        callbackCount += 1;
        return invalidResult as never;
      }) as SaveStateMigrationStepV1["migrate"];
      const registry = defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: first,
        current: second,
        steps: [stepV1(first, second, `invalid-result-${index}`, callback)],
      });
      const result = executeV1(resolveV1(registry, first), { value: 1 });
      expect(result).toMatchObject({
        kind: "rejected",
        code: "migration.output_invalid",
        migrationAttempt: {
          completedSteps: [],
          failingPhase: "result_envelope",
          migratedStateDigest: null,
        },
      });
      expect(callbackCount).toBe(1);
    }
    expect(getter).not.toHaveBeenCalled();
    expect(stateGetter).not.toHaveBeenCalled();
    expect(reasonGetter).not.toHaveBeenCalled();
    expect(thenGetter).not.toHaveBeenCalled();
    expect(throwingTrap).toHaveBeenCalledTimes(1);
  });

  it("captures a callback result key vector once", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const symbol = Symbol("configurable-extra");
    const target = { kind: "migrated" as const, state: { value: 2 }, [symbol]: true };
    let ownKeysCalls = 0;
    const resultProxy = new Proxy(target, {
      ownKeys() {
        ownKeysCalls += 1;
        return ownKeysCalls === 1 ? ["kind", "state"] : Reflect.ownKeys(target);
      },
    });
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: second,
      steps: [stepV1(first, second, "single-result-snapshot", () => resultProxy)],
    });

    expect(executeV1(resolveV1(registry, first), { value: 1 })).toMatchObject({
      kind: "migrated",
      state: { value: 2 },
    });
    expect(ownKeysCalls).toBe(1);
  });

  it("rejects an oversized callback-result key before reading any descriptor", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const inspectedProperties: PropertyKey[] = [];
    const resultProxy = new Proxy({}, {
      ownKeys: () => ["kind", "x".repeat(1_024)],
      getOwnPropertyDescriptor(target, property) {
        inspectedProperties.push(property);
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: second,
      steps: [stepV1(first, second, "bounded-result-key", () => resultProxy as never)],
    });

    expect(executeV1(resolveV1(registry, first), { value: 1 })).toMatchObject({
      kind: "rejected",
      code: "migration.output_invalid",
      migrationAttempt: { failingPhase: "result_envelope" },
    });
    expect(inspectedProperties).toEqual([]);
  });

  it("stops over-limit array admission before inspecting any array item", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const inspectedIndices: PropertyKey[] = [];
    const oversized = new Proxy([1, 2], {
      getOwnPropertyDescriptor(target, property) {
        if (property !== "length") inspectedIndices.push(property);
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: second,
      steps: [stepV1(first, second, "bounded-array", () => ({
        kind: "migrated",
        state: oversized,
      }))],
    });
    const limits = parseStrictJsonLimitsV1({
      maxBytes: 1_024,
      maxDepth: 8,
      maxArrayItems: 1,
      maxObjectMembers: 8,
      maxNodes: 32,
      maxStringBytes: 128,
    });

    expect(executeV1(resolveV1(registry, first), null, limits)).toMatchObject({
      kind: "rejected",
      code: "migration.output_invalid",
      migrationAttempt: { failingPhase: "output_admission" },
    });
    expect(inspectedIndices).toEqual([]);
  });

  it("bounds hostile object and array key spellings before descriptor traversal", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const inspectedProperties: PropertyKey[] = [];
    const hostileObject = new Proxy({}, {
      ownKeys: () => ["x".repeat(1_024), "y".repeat(1_024)],
      getOwnPropertyDescriptor(target, property) {
        inspectedProperties.push(property);
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });
    const hostileArray = new Proxy([1], {
      ownKeys: () => ["length", "9".repeat(1_024)],
      getOwnPropertyDescriptor(target, property) {
        if (property !== "length") inspectedProperties.push(property);
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });
    const outputs = [hostileObject, hostileArray];
    const limits = parseStrictJsonLimitsV1({
      maxBytes: 64,
      maxDepth: 8,
      maxArrayItems: 8,
      maxObjectMembers: 8,
      maxNodes: 32,
      maxStringBytes: 8,
    });

    for (const [index, state] of outputs.entries()) {
      const registry = defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: first,
        current: second,
        steps: [stepV1(first, second, `bounded-key-${index}`, () => ({
          kind: "migrated",
          state,
        }))],
      });
      expect(executeV1(resolveV1(registry, first), null, limits)).toMatchObject({
        kind: "rejected",
        code: "migration.output_invalid",
        migrationAttempt: { failingPhase: "output_admission" },
      });
    }
    expect(inspectedProperties).toEqual([]);
  });

  it("maps non-canonical migrated State to output_invalid without invoking nested accessors", () => {
    // sillymaker-determinism-vector: migration-negative-zero-output-admission
    const first = identityV1(1);
    const second = identityV1(2);
    const nestedGetter = vi.fn(() => 2);
    const accessorState = Object.defineProperty({}, "value", {
      enumerable: true,
      get: nestedGetter,
    });
    const sparse: unknown[] = [];
    sparse.length = 1;
    const arrayGetter = vi.fn(() => 1);
    const accessorArray: unknown[] = [];
    Object.defineProperty(accessorArray, "0", {
      enumerable: true,
      configurable: true,
      get: arrayGetter,
    });
    const customArray = Object.setPrototypeOf([1], Object.create(Array.prototype));
    const extraArray = [1];
    Object.defineProperty(extraArray, "extra", { enumerable: true, value: 2 });
    const symbolState = { value: 2, [Symbol("extra")]: true };
    const dangerousState = {};
    Object.defineProperty(dangerousState, "__proto__", { enumerable: true, value: 2 });
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    const invalidStates: readonly unknown[] = [
      { value: undefined },
      { value: () => undefined },
      { value: 1.5 },
      { value: Number.NaN },
      { value: Number.POSITIVE_INFINITY },
      { value: Number.MAX_SAFE_INTEGER + 1 },
      { value: -0 },
      { value: "\ud800" },
      new Date(0),
      accessorState,
      accessorArray,
      customArray,
      sparse,
      extraArray,
      symbolState,
      dangerousState,
      cycle,
      Object.assign(Object.create(null), { value: 2 }),
    ];

    for (const [index, invalidState] of invalidStates.entries()) {
      const callback = vi.fn(() => ({ kind: "migrated" as const, state: invalidState as never }));
      const registry = defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: first,
        current: second,
        steps: [stepV1(first, second, `invalid-state-${index}`, callback)],
      });
      const result = executeV1(resolveV1(registry, first), { value: 1 });
      expect(result).toMatchObject({
        kind: "rejected",
        code: "migration.output_invalid",
        migrationAttempt: {
          completedSteps: [],
          failingPhase: "output_admission",
          migratedStateDigest: null,
        },
      });
    }
    expect(nestedGetter).not.toHaveBeenCalled();
    expect(arrayGetter).not.toHaveBeenCalled();
  });

  it.each(
    [
      null,
      true,
      false,
      0,
      -123,
      "plain",
      '\u0000\b\t\n\f\r"\\é😀\u2028',
      [1, "two", null],
      { z: 1, a: "two", "😀": true, "é": false },
    ] as const,
  )("matches canonical bytes at the exact byte boundary for %j", (state) => {
    const first = identityV1(1);
    const second = identityV1(2);
    let callbackInput: unknown;
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: second,
      steps: [stepV1(first, second, "canonical-boundary", (input) => {
        callbackInput = input;
        return { kind: "migrated", state: input };
      })],
    });
    const expectedBytes = canonicalJsonBytes(state);
    const limits = parseStrictJsonLimitsV1({
      maxBytes: expectedBytes.byteLength,
      maxDepth: 8,
      maxArrayItems: 8,
      maxObjectMembers: 8,
      maxNodes: 32,
      maxStringBytes: 128,
    });

    const result = executeV1(resolveV1(registry, first), state, limits);
    expect(result.kind).toBe("migrated");
    if (result.kind !== "migrated") return;
    expect(canonicalJsonBytes(result.state)).toEqual(expectedBytes);
    if (state !== null && typeof state === "object") {
      expect(result.state).not.toBe(callbackInput);
    }
  });

  it("retains only the admitted prefix when a later migrated State is invalid", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const third = identityV1(3);
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: third,
      steps: [
        stepV1(first, second, "valid-prefix", (state) => ({ kind: "migrated", state })),
        stepV1(second, third, "invalid-tail", () => ({
          kind: "migrated",
          state: { value: 1.5 } as never,
        })),
      ],
    });

    expect(executeV1(resolveV1(registry, first), { value: 1 })).toMatchObject({
      kind: "rejected",
      code: "migration.output_invalid",
      migrationAttempt: {
        completedSteps: [
          { migrationId: parseSaveStateMigrationIdV1("migration.synthetic.valid-prefix") },
        ],
        failingStep: {
          migrationId: parseSaveStateMigrationIdV1("migration.synthetic.invalid-tail"),
        },
        failingPhase: "output_admission",
        migratedStateDigest: null,
      },
    });
  });

  it.each([
    ["bytes", { maxBytes: 8 }, { value: "long enough" }],
    ["depth", { maxDepth: 1 }, { value: { nested: 1 } }],
    ["array items", { maxArrayItems: 1 }, { value: [1, 2] }],
    ["object members", { maxObjectMembers: 1 }, { first: 1, second: 2 }],
    ["nodes", { maxNodes: 2 }, { first: 1, second: 2 }],
    ["string bytes", { maxStringBytes: 1 }, { value: "two" }],
  ])("rejects a migrated State that exceeds the %s limit", (_label, overrides, state) => {
    const first = identityV1(1);
    const second = identityV1(2);
    const limits = parseStrictJsonLimitsV1({
      maxBytes: 1_024,
      maxDepth: 8,
      maxArrayItems: 8,
      maxObjectMembers: 8,
      maxNodes: 32,
      maxStringBytes: 128,
      ...overrides,
    });
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: second,
      steps: [stepV1(first, second, `limit-${_label.replaceAll(" ", "-")}`, () => ({
        kind: "migrated",
        state,
      }))],
    });

    expect(executeV1(resolveV1(registry, first), null, limits)).toMatchObject({
      kind: "rejected",
      code: "migration.output_invalid",
      migrationAttempt: { failingPhase: "output_admission", migratedStateDigest: null },
    });
  });

  it("constructs later-phase attempts from an exact completion without manufacturing a digest", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: second,
      steps: [
        stepV1(first, second, "later-attempt", (state) => ({ kind: "migrated", state })),
      ],
    });
    const result = executeV1(resolveV1(registry, first), { value: 1 });
    expect(result.kind).toBe("migrated");
    if (result.kind !== "migrated") return;

    const beforeDigest = createSaveStateMigrationAttemptInternalV1(
      result.completion,
      "current_snapshot_schema",
      null,
    );
    expect(beforeDigest).toMatchObject({
      completedSteps: [{
        migrationId: parseSaveStateMigrationIdV1("migration.synthetic.later-attempt"),
      }],
      failingStep: null,
      failingPhase: "current_snapshot_schema",
      migratedStateDigest: null,
    });
    const afterDigest = createSaveStateMigrationAttemptInternalV1(
      result.completion,
      "compatibility",
      finalSnapshotDigestV1,
    );
    expect(afterDigest.migratedStateDigest).toBe(finalSnapshotDigestV1);
    expectFrozenTreeV1(beforeDigest);
    expectFrozenTreeV1(afterDigest);
    expect(() =>
      createSaveStateMigrationAttemptInternalV1(
        { ...result.completion } as typeof result.completion,
        "compatibility",
        finalSnapshotDigestV1,
      )
    ).toThrow(TypeError);
    expect(() =>
      createSaveStateMigrationAttemptInternalV1(
        result.completion,
        "current_snapshot_schema",
        finalSnapshotDigestV1,
      )
    ).toThrow(TypeError);
    expect(() =>
      createSaveStateMigrationAttemptInternalV1(
        result.completion,
        "compatibility",
        null,
      )
    ).toThrow(TypeError);
  });
});
