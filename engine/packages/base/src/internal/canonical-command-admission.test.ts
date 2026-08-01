// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { CanonicalJsonError, canonicalJsonBytes } from "../contracts/canonical-json.ts";
import {
  admitCanonicalCommandForTargetInternalV1,
  admitCanonicalCommandInternalV1,
  withCanonicalCommandHandoffInternalV1,
} from "./canonical-command-admission.ts";
import { createPurposeTaggedSnapshotWorkCounterV1 } from "./snapshot-work-instrumentation.ts";

function fixtureCommand() {
  return {
    kind: "fixture.command" as const,
    payload: [1],
  };
}

function expectCanonicalAdmissionFailure(
  value: unknown,
  expected: Readonly<{ code: string; path: string }>,
): void {
  let failure: unknown;
  try {
    admitCanonicalCommandInternalV1(value);
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(CanonicalJsonError);
  expect(failure).toMatchObject(expected);
}

describe("canonical command admission", () => {
  it("does not let an independent nested admission borrow or consume a handoff", () => {
    const command = fixtureCommand();
    const outer = admitCanonicalCommandInternalV1(command);
    const counter = createPurposeTaggedSnapshotWorkCounterV1();

    let independent: unknown;
    let handedOff: unknown;
    withCanonicalCommandHandoffInternalV1(outer, "command_log_append", () => {
      independent = admitCanonicalCommandInternalV1(command, counter.instrumentation);
      handedOff = admitCanonicalCommandForTargetInternalV1(
        outer.value,
        "command_log_append",
        counter.instrumentation,
      );
    });

    expect(independent).not.toBe(outer);
    expect(handedOff).toBe(outer);
    expect(counter.snapshot()).toMatchObject({
      commandAdmissionCanonicalTraversals: 1,
      commandHandoffFreezeTraversals: 1,
      totalPhysicalCanonicalTraversals: 1,
    });
  });

  it("consumes a matching target handoff once", () => {
    const command = fixtureCommand();
    const outer = admitCanonicalCommandInternalV1(command);
    const counter = createPurposeTaggedSnapshotWorkCounterV1();

    let first: unknown;
    let second: unknown;
    withCanonicalCommandHandoffInternalV1(outer, "simulation_game_execute", () => {
      first = admitCanonicalCommandForTargetInternalV1(
        outer.value,
        "simulation_game_execute",
        counter.instrumentation,
      );
      second = admitCanonicalCommandForTargetInternalV1(
        outer.value,
        "simulation_game_execute",
        counter.instrumentation,
      );
    });

    expect(first).toBe(outer);
    expect(second).not.toBe(outer);
    expect(counter.snapshot()).toMatchObject({
      commandAdmissionCanonicalTraversals: 1,
      commandHandoffFreezeTraversals: 1,
      totalPhysicalCanonicalTraversals: 1,
    });
  });

  it("keeps a mismatched target independent without consuming the handoff", () => {
    const command = fixtureCommand();
    const outer = admitCanonicalCommandInternalV1(command);
    const counter = createPurposeTaggedSnapshotWorkCounterV1();

    let mismatched: unknown;
    let matched: unknown;
    withCanonicalCommandHandoffInternalV1(outer, "simulation_game_execute", () => {
      mismatched = admitCanonicalCommandForTargetInternalV1(
        command,
        "command_log_append",
        counter.instrumentation,
      );
      matched = admitCanonicalCommandForTargetInternalV1(
        outer.value,
        "simulation_game_execute",
        counter.instrumentation,
      );
    });

    expect(mismatched).not.toBe(outer);
    expect(matched).toBe(outer);
    expect(counter.snapshot()).toMatchObject({
      commandAdmissionCanonicalTraversals: 1,
      commandHandoffFreezeTraversals: 1,
      totalPhysicalCanonicalTraversals: 1,
    });
  });

  it("does not lend a matching target to a different value identity", () => {
    const command = fixtureCommand();
    const different = fixtureCommand();
    different.payload[0] = 0.25;
    const outer = admitCanonicalCommandInternalV1(command);
    let matched: unknown;

    withCanonicalCommandHandoffInternalV1(outer, "simulation_game_execute", () => {
      expect(() =>
        admitCanonicalCommandForTargetInternalV1(
          different,
          "simulation_game_execute",
        )
      ).toThrow(CanonicalJsonError);
      matched = admitCanonicalCommandForTargetInternalV1(
        outer.value,
        "simulation_game_execute",
      );
    });

    expect(matched).toBe(outer);
  });

  it("hands off a frozen canonical projection without retaining raw identity state", () => {
    let virtualReads = 0;
    const shared = { value: 1 };
    const rawTarget = {
      kind: "fixture.command" as const,
      payload: [shared, shared],
    };
    const raw = new Proxy(rawTarget, {
      get(target, key, receiver) {
        if (key === "virtual") return ++virtualReads;
        return Reflect.get(target, key, receiver);
      },
    });
    const sideTable = new WeakMap<object, string>([[raw, "raw-only"]]);
    const expectedBytes = canonicalJsonBytes(raw);

    const admission = admitCanonicalCommandInternalV1(raw);
    const admitted = admission.value;

    expect(admitted).not.toBe(raw);
    expect(admitted.payload).not.toBe(rawTarget.payload);
    expect(admitted.payload[0]).not.toBe(shared);
    expect(admitted.payload[0]).not.toBe(admitted.payload[1]);
    expect((admitted as { readonly virtual?: number }).virtual).toBeUndefined();
    expect(virtualReads).toBe(0);
    expect(sideTable.has(admitted as object)).toBe(false);
    expect(Object.isFrozen(admitted)).toBe(true);
    expect(Object.isFrozen(admitted.payload)).toBe(true);
    expect(Object.isFrozen(admitted.payload[0])).toBe(true);
    expect(Object.isFrozen(raw)).toBe(false);
    expect(Object.isFrozen(rawTarget.payload)).toBe(false);
    expect(canonicalJsonBytes(admitted)).toEqual(expectedBytes);
  });

  it("does not carry private elements from a canonical-looking raw command", () => {
    class HiddenCommand {
      #counter = 0;
      readonly kind = "fixture.command" as const;
      readonly payload = [1];

      static next(value: HiddenCommand): number {
        return ++value.#counter;
      }
    }

    const raw = new HiddenCommand();
    Object.setPrototypeOf(raw, Object.prototype);

    const admitted = admitCanonicalCommandInternalV1(raw).value;

    expect(admitted).not.toBe(raw);
    expect(() => HiddenCommand.next(admitted as unknown as HiddenCommand)).toThrow(TypeError);
    expect(HiddenCommand.next(raw)).toBe(1);
  });

  it("attributes fallback work to the outer operation instrumentation", () => {
    const command = fixtureCommand();
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const outer = admitCanonicalCommandInternalV1(command, counter.instrumentation);
    counter.reset();

    withCanonicalCommandHandoffInternalV1(outer, "simulation_game_execute", () => {
      admitCanonicalCommandForTargetInternalV1(command, "command_log_append");
    });

    expect(counter.snapshot()).toMatchObject({
      commandAdmissionCanonicalTraversals: 1,
      commandHandoffFreezeTraversals: 1,
      totalPhysicalCanonicalTraversals: 1,
    });
  });

  it("rejects properties omitted by public canonical bytes without changing that algorithm", () => {
    const referenceBytes = canonicalJsonBytes(fixtureCommand());

    let extraGetterReads = 0;
    const extraProperty = fixtureCommand();
    Object.defineProperty(extraProperty.payload, "extra/~field", {
      enumerable: false,
      configurable: true,
      get() {
        extraGetterReads += 1;
        return 0.25;
      },
    });
    expect(canonicalJsonBytes(extraProperty)).toEqual(referenceBytes);
    expect(extraGetterReads).toBe(0);
    expectCanonicalAdmissionFailure(extraProperty, {
      code: "value.unrepresented_property",
      path: "/payload/extra~1~0field",
    });
    expect(extraGetterReads).toBe(0);
    expect(Object.isFrozen(extraProperty)).toBe(false);
    expect(Object.isFrozen(extraProperty.payload)).toBe(false);

    let symbolGetterReads = 0;
    const symbolProperty = fixtureCommand();
    Object.defineProperty(symbolProperty, Symbol("hidden"), {
      enumerable: true,
      configurable: true,
      get() {
        symbolGetterReads += 1;
        return 0.25;
      },
    });
    expect(canonicalJsonBytes(symbolProperty)).toEqual(referenceBytes);
    expect(symbolGetterReads).toBe(0);
    expectCanonicalAdmissionFailure(symbolProperty, {
      code: "value.unrepresented_property",
      path: "",
    });
    expect(symbolGetterReads).toBe(0);
    expect(Object.isFrozen(symbolProperty)).toBe(false);

    const arraySymbolProperty = fixtureCommand();
    Object.defineProperty(arraySymbolProperty.payload, Symbol("hidden"), {
      enumerable: true,
      configurable: true,
      value: 0.25,
    });
    expect(canonicalJsonBytes(arraySymbolProperty)).toEqual(referenceBytes);
    expectCanonicalAdmissionFailure(arraySymbolProperty, {
      code: "value.unrepresented_property",
      path: "/payload",
    });
    expect(Object.isFrozen(arraySymbolProperty)).toBe(false);
    expect(Object.isFrozen(arraySymbolProperty.payload)).toBe(false);

    const customArrayPrototype = fixtureCommand();
    Object.setPrototypeOf(customArrayPrototype.payload, Object.create(Array.prototype));
    expect(canonicalJsonBytes(customArrayPrototype)).toEqual(referenceBytes);
    expectCanonicalAdmissionFailure(customArrayPrototype, {
      code: "value.custom_prototype",
      path: "/payload",
    });
    expect(Object.isFrozen(customArrayPrototype)).toBe(false);
    expect(Object.isFrozen(customArrayPrototype.payload)).toBe(false);
  });

  it("rejects an array index accessor without invoking it", () => {
    let getterReads = 0;
    const command = fixtureCommand();
    Object.defineProperty(command.payload, 0, {
      enumerable: true,
      configurable: true,
      get() {
        getterReads += 1;
        return 1;
      },
    });

    expect(canonicalJsonBytes(command)).toEqual(canonicalJsonBytes(fixtureCommand()));
    expect(getterReads).toBe(1);
    getterReads = 0;

    expectCanonicalAdmissionFailure(command, {
      code: "value.getter",
      path: "/payload/0",
    });
    expect(getterReads).toBe(0);
    expect(Object.isFrozen(command)).toBe(false);
    expect(Object.isFrozen(command.payload)).toBe(false);
  });

  it("applies container-shape precedence before represented children", () => {
    const command = fixtureCommand();
    command.payload[0] = 0.25;
    Object.defineProperty(command.payload, "extra", {
      enumerable: true,
      configurable: true,
      value: 0.25,
    });
    Object.defineProperty(command.payload, Symbol("hidden"), {
      enumerable: true,
      configurable: true,
      value: 0.25,
    });

    expectCanonicalAdmissionFailure(command, {
      code: "value.unrepresented_property",
      path: "/payload",
    });
    expect(Object.isFrozen(command)).toBe(false);
    expect(Object.isFrozen(command.payload)).toBe(false);
  });

  it("lets a custom array prototype win over every member failure", () => {
    const command = fixtureCommand();
    command.payload[0] = 0.25;
    Object.defineProperty(command.payload, "extra", {
      enumerable: true,
      configurable: true,
      value: 0.25,
    });
    Object.defineProperty(command.payload, Symbol("hidden"), {
      enumerable: true,
      configurable: true,
      value: 0.25,
    });
    Object.setPrototypeOf(command.payload, Object.create(Array.prototype));

    expectCanonicalAdmissionFailure(command, {
      code: "value.custom_prototype",
      path: "/payload",
    });
  });

  it("selects the first extra array key by Unicode code-point order", () => {
    const command = fixtureCommand();
    command.payload[0] = 0.25;
    Object.defineProperty(command.payload, "z-last", {
      enumerable: true,
      configurable: true,
      value: 1,
    });
    Object.defineProperty(command.payload, "a-first", {
      enumerable: true,
      configurable: true,
      value: 1,
    });

    expectCanonicalAdmissionFailure(command, {
      code: "value.unrepresented_property",
      path: "/payload/a-first",
    });
  });

  it("keeps represented accessors in ordinary child traversal order", () => {
    const command = fixtureCommand();
    command.payload[0] = 0.25;
    command.payload.push(1);
    let laterGetterReads = 0;
    Object.defineProperty(command.payload, 1, {
      enumerable: true,
      configurable: true,
      get() {
        laterGetterReads += 1;
        return 1;
      },
    });

    expectCanonicalAdmissionFailure(command, {
      code: "number.not_integer",
      path: "/payload/0",
    });
    expect(laterGetterReads).toBe(0);
  });
});
