// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  CanonicalJsonError,
  type CanonicalJsonErrorCodeV1,
  canonicalJsonBytes,
} from "../contracts/canonical-json.ts";
import {
  createPurposeTaggedSnapshotWorkCounterV1,
  type PurposeTaggedSnapshotWorkCountsV1,
} from "./snapshot-work-instrumentation.ts";
import { admitCanonicalBootstrapInternalV1 } from "./canonical-bootstrap-admission.ts";

const emptyBootstrapWorkCountsV1 = Object.freeze({
  snapshotDigestTraversals: 0,
  snapshotFreezeTraversals: 0,
  commandAdmissionCanonicalTraversals: 0,
  commandHandoffFreezeTraversals: 0,
  commandLogMetadataAdmissionCanonicalTraversals: 0,
  commandLogMetadataFreezeTraversals: 0,
  evidenceAdmissionCanonicalTraversals: 0,
  replayComparisonTraversals: 0,
});

function bootstrapWorkCountsV1(
  bootstrapAdmissionCanonicalTraversals: number,
  bootstrapHandoffFreezeTraversals: number,
): PurposeTaggedSnapshotWorkCountsV1 {
  return Object.freeze({
    ...emptyBootstrapWorkCountsV1,
    bootstrapAdmissionCanonicalTraversals,
    bootstrapHandoffFreezeTraversals,
    totalPhysicalCanonicalTraversals: bootstrapAdmissionCanonicalTraversals,
  });
}

function captureThrownV1(callback: () => unknown): unknown {
  try {
    callback();
  } catch (error) {
    return error;
  }
  throw new TypeError("expected callback to throw");
}

interface InvalidBootstrapCaseV1 {
  readonly label: string;
  readonly code: CanonicalJsonErrorCodeV1;
  readonly path: string;
  create(): {
    readonly value: unknown;
    readonly getterCalls?: () => number;
  };
}

const invalidBootstrapCasesV1: readonly InvalidBootstrapCaseV1[] = Object.freeze([
  Object.freeze({
    label: "fractional number",
    code: "number.not_integer" as const,
    path: "/extra",
    create: () => ({ value: { extra: 0.25, rngSeed: 97 } }),
  }),
  ...[NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].map((extra) =>
    Object.freeze({
      label: `non-finite number ${String(extra)}`,
      code: "number.non_finite" as const,
      path: "/extra",
      create: () => ({ value: { extra, rngSeed: 97 } }),
    })
  ),
  Object.freeze({
    label: "unsafe integer",
    code: "number.unsafe_integer" as const,
    path: "/extra",
    create: () => ({ value: { extra: Number.MAX_SAFE_INTEGER + 1, rngSeed: 97 } }),
  }),
  Object.freeze({
    label: "negative zero",
    code: "number.negative_zero" as const,
    path: "/extra",
    create: () => ({ value: { extra: -0, rngSeed: 97 } }),
  }),
  Object.freeze({
    label: "undefined member",
    code: "value.undefined" as const,
    path: "/extra",
    create: () => ({ value: { extra: undefined, rngSeed: 97 } }),
  }),
  Object.freeze({
    label: "represented getter",
    code: "value.getter" as const,
    path: "/extra",
    create() {
      let getterCalls = 0;
      const value = { rngSeed: 97 } as Record<string, unknown>;
      Object.defineProperty(value, "extra", {
        enumerable: true,
        get() {
          getterCalls += 1;
          return 1;
        },
      });
      return { value, getterCalls: () => getterCalls };
    },
  }),
  Object.freeze({
    label: "custom object prototype",
    code: "value.custom_prototype" as const,
    path: "",
    create: () => ({
      value: Object.assign(Object.create({ inherited: true }), { rngSeed: 97 }),
    }),
  }),
  Object.freeze({
    label: "sparse array",
    code: "value.sparse_array" as const,
    path: "/extra/0",
    create() {
      const extra: unknown[] = [];
      extra.length = 1;
      return { value: { extra, rngSeed: 97 } };
    },
  }),
  Object.freeze({
    label: "cycle",
    code: "value.cycle" as const,
    path: "/cycle",
    create() {
      const value: Record<string, unknown> = { rngSeed: 97 };
      value.cycle = value;
      return { value };
    },
  }),
  Object.freeze({
    label: "root symbol-keyed member",
    code: "value.unrepresented_property" as const,
    path: "",
    create() {
      const value: Record<PropertyKey, unknown> = { rngSeed: 97 };
      value[Symbol("hidden")] = 1;
      return { value };
    },
  }),
  Object.freeze({
    label: "nested symbol-keyed member",
    code: "value.unrepresented_property" as const,
    path: "/nested",
    create() {
      const nested: Record<PropertyKey, unknown> = { represented: 1 };
      nested[Symbol("hidden")] = 2;
      return { value: { nested, rngSeed: 97 } };
    },
  }),
  Object.freeze({
    label: "extra own array property",
    code: "value.unrepresented_property" as const,
    path: "/extra/hidden",
    create() {
      const extra = [1];
      Object.defineProperty(extra, "hidden", {
        configurable: true,
        enumerable: false,
        value: 2,
        writable: true,
      });
      return { value: { extra, rngSeed: 97 } };
    },
  }),
  Object.freeze({
    label: "custom array prototype",
    code: "value.custom_prototype" as const,
    path: "/extra",
    create() {
      const extra = [1];
      Object.setPrototypeOf(extra, { inherited: true });
      return { value: { extra, rngSeed: 97 } };
    },
  }),
]);

describe("admitCanonicalBootstrapInternalV1", () => {
  it.each([
    { rngSeed: 97 },
    { rngSeed: 97, empty: [], nested: { z: null, a: [true, "猫"] } },
    { rngSeed: 97, ["\u{10000}"]: 1, ["\ue000"]: 2 },
  ])("keeps projected bytes identical to existing canonical bytes for %#", (bootstrap) => {
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const referenceBytes = canonicalJsonBytes(bootstrap);

    const admitted = admitCanonicalBootstrapInternalV1(
      bootstrap,
      counter.instrumentation,
    );

    expect(admitted).not.toBe(bootstrap);
    expect(canonicalJsonBytes(admitted)).toEqual(referenceBytes);
    expect(Object.isFrozen(admitted)).toBe(true);
    expect(Object.isFrozen(bootstrap)).toBe(false);
    expect(counter.snapshot()).toEqual(bootstrapWorkCountsV1(1, 1));
  });

  it("returns a recursively frozen path-local projection without retaining or freezing raw aliases", () => {
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const shared = { child: { count: 1 }, label: "shared" };
    const values = [shared];
    const nested = { values };
    const bootstrap = { first: shared, nested, rngSeed: 97, second: shared };
    const referenceBytes = canonicalJsonBytes(bootstrap);

    const admitted = admitCanonicalBootstrapInternalV1(
      bootstrap,
      counter.instrumentation,
    );

    expect(admitted).toEqual(bootstrap);
    expect(admitted).not.toBe(bootstrap);
    expect(admitted.first).not.toBe(shared);
    expect(admitted.second).not.toBe(shared);
    expect(admitted.nested).not.toBe(nested);
    expect(admitted.nested.values).not.toBe(values);
    expect(admitted.nested.values[0]).not.toBe(shared);
    expect(admitted.first).not.toBe(admitted.second);
    expect(admitted.first).not.toBe(admitted.nested.values[0]);
    expect(admitted.second).not.toBe(admitted.nested.values[0]);

    expect(Object.isFrozen(admitted)).toBe(true);
    expect(Object.isFrozen(admitted.first)).toBe(true);
    expect(Object.isFrozen(admitted.first.child)).toBe(true);
    expect(Object.isFrozen(admitted.second)).toBe(true);
    expect(Object.isFrozen(admitted.second.child)).toBe(true);
    expect(Object.isFrozen(admitted.nested)).toBe(true);
    expect(Object.isFrozen(admitted.nested.values)).toBe(true);
    expect(Object.isFrozen(admitted.nested.values[0])).toBe(true);
    expect(Object.isFrozen(admitted.nested.values[0]?.child)).toBe(true);

    expect(Object.isFrozen(bootstrap)).toBe(false);
    expect(Object.isFrozen(shared)).toBe(false);
    expect(Object.isFrozen(shared.child)).toBe(false);
    expect(Object.isFrozen(nested)).toBe(false);
    expect(Object.isFrozen(values)).toBe(false);

    shared.child.count = 2;
    expect(admitted.first.child.count).toBe(1);
    expect(admitted.second.child.count).toBe(1);
    expect(admitted.nested.values[0]?.child.count).toBe(1);
    expect(canonicalJsonBytes(admitted)).toEqual(referenceBytes);
    expect(counter.snapshot()).toEqual(bootstrapWorkCountsV1(1, 1));
  });

  it("projects Proxy-backed arrays from descriptors without invoking a get trap", () => {
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    let getCalls = 0;
    const values = new Proxy([1], {
      get(target, key, receiver) {
        getCalls += 1;
        return Reflect.get(target, key, receiver);
      },
    });
    const bootstrap = { rngSeed: 97, values };

    const admitted = admitCanonicalBootstrapInternalV1(
      bootstrap,
      counter.instrumentation,
    );
    const getCallsAfterAdmission = getCalls;

    expect(admitted).not.toBe(bootstrap);
    expect(admitted.values).not.toBe(values);
    expect(admitted.values).toEqual([1]);
    expect(getCallsAfterAdmission).toBe(0);
    expect(Object.getPrototypeOf(admitted)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(admitted.values)).toBe(Array.prototype);
    expect(Object.isFrozen(admitted)).toBe(true);
    expect(Object.isFrozen(admitted.values)).toBe(true);
    expect(Object.isFrozen(bootstrap)).toBe(false);
    expect(Object.isFrozen(values)).toBe(false);
    expect(counter.snapshot()).toEqual(bootstrapWorkCountsV1(1, 1));
  });

  it("does not carry Proxy, private-field, or WeakMap hidden identity into the projection", () => {
    class HiddenBootstrapHandlerV1 implements ProxyHandler<Record<string, unknown>> {
      readonly #privateState = Object.freeze({ label: "hidden" });
      readonly #stateByIdentity = new WeakMap<object, object>();

      getPrototypeOf(target: Record<string, unknown>): object | null {
        return Reflect.getPrototypeOf(target);
      }

      associate(value: object): object {
        this.#stateByIdentity.set(value, this.#privateState);
        return this.#privateState;
      }

      stateFor(value: object): object | undefined {
        return this.#stateByIdentity.get(value);
      }
    }

    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const target = { rngSeed: 97, visible: { label: "public" } };
    const handler = new HiddenBootstrapHandlerV1();
    const bootstrap = new Proxy(target, handler);
    const hiddenState = handler.associate(bootstrap);

    const admitted = admitCanonicalBootstrapInternalV1(
      bootstrap,
      counter.instrumentation,
    );

    expect(admitted).toEqual({ rngSeed: 97, visible: { label: "public" } });
    expect(admitted).not.toBe(bootstrap);
    expect(admitted).not.toBe(target);
    expect(admitted.visible).not.toBe(target.visible);
    expect(Object.getPrototypeOf(admitted)).toBe(Object.prototype);
    expect(handler.stateFor(bootstrap)).toBe(hiddenState);
    expect(handler.stateFor(admitted as object)).toBeUndefined();
    expect(Reflect.ownKeys(admitted)).toEqual(["rngSeed", "visible"]);
    expect(Object.isFrozen(admitted)).toBe(true);
    expect(Object.isFrozen(admitted.visible)).toBe(true);
    expect(Object.isFrozen(bootstrap)).toBe(false);
    expect(Object.isFrozen(target.visible)).toBe(false);
    expect(counter.snapshot()).toEqual(bootstrapWorkCountsV1(1, 1));
  });

  it.each(invalidBootstrapCasesV1)(
    "rejects $label with an exact descriptor-safe canonical error",
    ({ create, code, path }) => {
      const counter = createPurposeTaggedSnapshotWorkCounterV1();
      const fixture = create();

      const error = captureThrownV1(() =>
        admitCanonicalBootstrapInternalV1(fixture.value, counter.instrumentation)
      );

      expect(error).toBeInstanceOf(CanonicalJsonError);
      expect(error).toMatchObject({ code, path });
      expect(fixture.getterCalls?.() ?? 0).toBe(0);
      expect(counter.snapshot()).toEqual(bootstrapWorkCountsV1(1, 0));
    },
  );

  it("completes canonical preflight before entering projection freeze", () => {
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const earlier = { represented: true };
    const bootstrap = {
      earlier,
      rngSeed: 97,
      laterInvalid: 0.5,
    };
    let authoritativeCallbackCalls = 0;

    const error = captureThrownV1(() => {
      const admitted = admitCanonicalBootstrapInternalV1(
        bootstrap,
        counter.instrumentation,
      );
      authoritativeCallbackCalls += 1;
      return admitted;
    });

    expect(error).toMatchObject({
      code: "number.not_integer",
      path: "/laterInvalid",
    });
    expect(Object.isFrozen(bootstrap)).toBe(false);
    expect(Object.isFrozen(earlier)).toBe(false);
    expect(authoritativeCallbackCalls).toBe(0);
    expect(counter.snapshot()).toEqual(bootstrapWorkCountsV1(1, 0));
  });

  it("records an entered handoff freeze but does not call authoritative code when freezing throws", () => {
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const freezeFailure = new Error("synthetic bootstrap freeze failure");
    const bootstrap = { nested: { value: 1 }, rngSeed: 97 };
    let authoritativeCallbackCalls = 0;
    let projectionAtFreeze: unknown;

    const error = captureThrownV1(() => {
      const admitted = admitCanonicalBootstrapInternalV1(
        bootstrap,
        counter.instrumentation,
        {
          beforeProjectionFreeze(projected: unknown) {
            projectionAtFreeze = projected;
            throw freezeFailure;
          },
        },
      );
      authoritativeCallbackCalls += 1;
      return admitted;
    });

    expect(error).toBe(freezeFailure);
    expect(authoritativeCallbackCalls).toBe(0);
    expect(projectionAtFreeze).toEqual(bootstrap);
    expect(projectionAtFreeze).not.toBe(bootstrap);
    expect(Object.isFrozen(projectionAtFreeze)).toBe(false);
    expect(Object.isFrozen(bootstrap)).toBe(false);
    expect(Object.isFrozen(bootstrap.nested)).toBe(false);
    expect(counter.snapshot()).toEqual(bootstrapWorkCountsV1(1, 1));
  });

  it("keeps container-wide shape precedence ahead of child traversal", () => {
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    let getterCalls = 0;
    const extra = [0.5];
    Object.defineProperty(extra, "laterGetter", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });

    const error = captureThrownV1(() =>
      admitCanonicalBootstrapInternalV1(
        { extra, rngSeed: 97 },
        counter.instrumentation,
      )
    );

    expect(error).toMatchObject({
      code: "value.unrepresented_property",
      path: "/extra/laterGetter",
    });
    expect(getterCalls).toBe(0);
    expect(counter.snapshot()).toEqual(bootstrapWorkCountsV1(1, 0));
  });

  it("keeps custom-prototype precedence ahead of later descriptor traps", () => {
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    let ownKeysCalls = 0;
    const target = Object.assign(Object.create({ inherited: true }), { rngSeed: 97 });
    const bootstrap = new Proxy(target, {
      ownKeys() {
        ownKeysCalls += 1;
        throw new Error("descriptor trap must not run");
      },
    });

    const error = captureThrownV1(() =>
      admitCanonicalBootstrapInternalV1(bootstrap, counter.instrumentation)
    );

    expect(error).toMatchObject({ code: "value.custom_prototype", path: "" });
    expect(ownKeysCalls).toBe(0);
    expect(counter.snapshot()).toEqual(bootstrapWorkCountsV1(1, 0));
  });

  it("preserves depth-first child precedence over a later represented getter", () => {
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    let getterCalls = 0;
    const bootstrap = { earlierInvalid: 0.5, rngSeed: 97 } as Record<string, unknown>;
    Object.defineProperty(bootstrap, "laterGetter", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });

    const error = captureThrownV1(() =>
      admitCanonicalBootstrapInternalV1(bootstrap, counter.instrumentation)
    );

    expect(error).toMatchObject({
      code: "number.not_integer",
      path: "/earlierInvalid",
    });
    expect(getterCalls).toBe(0);
    expect(counter.snapshot()).toEqual(bootstrapWorkCountsV1(1, 0));
  });
});
