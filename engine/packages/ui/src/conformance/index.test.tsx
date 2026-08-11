// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import {
  emptyNarrativeHistoryV1,
  parseNarrativeHistoryV1,
  parseNonNegativeSafeInteger,
  parsePendingInteractionV1,
  type NarrativeHistoryV1,
  type PendingInteractionV1,
} from "@sillymaker/base";
import { defaultPlayerProfileV1, type PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { Fragment, StrictMode, type ComponentType } from "react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  inputHandledV1,
  inputIgnoredV1,
  parseInputActionIdV1,
  systemInputActionIdsV1,
  type InputRouterV1,
} from "../input/contracts.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import type { PresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import {
  createNarrativeConformanceRigV1,
  type CreateNarrativeConformanceRigInputV1,
  type NarrativeConformanceHostPropsV1,
  type NarrativeConformanceResolutionRequestV1,
  type NarrativeConformanceRigCreationResultV1,
  type NarrativeConformanceRigV1,
  type NarrativeConformanceSnapshotV1,
} from "./index.tsx";
import * as conformanceModuleV1 from "./index.tsx";

const conformanceInputKeysV1 = Object.freeze(
  [
    "observeNarrative",
    "subscribeNarrative",
    "dispatchResolution",
    "playerProfile",
    "presentationClock",
    "textResolver",
    "voiceReplay",
    "reportFailure",
  ] as const,
);

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function snapshotV1(
  revision = 0,
  pending: PendingInteractionV1 | null = null,
  history: NarrativeHistoryV1 = emptyNarrativeHistoryV1,
): NarrativeConformanceSnapshotV1 {
  return Object.freeze({
    revision: parseNonNegativeSafeInteger(revision),
    pending,
    history,
  });
}

function sayPendingV1(sequence: number): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "say",
    definitionId: "narrative.conformance.say",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    speakerTextId: "text.conformance.speaker",
    textId: "text.conformance.line",
    advancePolicy: "confirm",
  });
}

function choicePendingV1(sequence: number): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "choice",
    definitionId: "narrative.conformance.choice",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    promptTextId: "text.conformance.prompt",
    options: [
      { choiceId: "choice.conformance.first", textId: "text.conformance.first" },
      { choiceId: "choice.conformance.second", textId: "text.conformance.second" },
    ],
  });
}

function namedChoicePendingV1(sequence: number, name: string): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "choice",
    definitionId: `narrative.conformance.${name}`,
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    promptTextId: `text.conformance.${name}.prompt`,
    options: [
      {
        choiceId: `choice.conformance.${name}.first`,
        textId: `text.conformance.${name}.first`,
      },
      {
        choiceId: `choice.conformance.${name}.second`,
        textId: `text.conformance.${name}.second`,
      },
    ],
  });
}

function pausePendingV1(sequence: number): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "pause",
    definitionId: "narrative.conformance.pause",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    durationMs: 1_000,
    skippable: true,
  });
}

function customPendingV1(sequence: number): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "custom",
    definitionId: "narrative.conformance.custom",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    surfaceId: "surface.conformance.custom",
    params: { min: 1, max: 3 },
  });
}

function barrierPendingV1(sequence: number): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "presentation_barrier",
    definitionId: "narrative.conformance.barrier",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    expectedTransitionId: `transition.conformance.${String(sequence)}`,
    loadRecovery: "settle",
  });
}

function historyV1(sequence: number): NarrativeHistoryV1 {
  return parseNarrativeHistoryV1({
    entries: [{
      kind: "say",
      occurrenceId: `interaction-occurrence.${String(sequence + 100)}`,
      definitionId: "narrative.conformance.history",
      seenRevision: 1,
      speakerTextId: null,
      textId: "text.conformance.history",
      voiceAssetId: null,
    }],
  });
}

function mutableNarrativeSourceV1(
  initialSnapshot: unknown = snapshotV1(),
) {
  let currentSnapshot = initialSnapshot;
  let observeFaulted = false;
  let observeError: unknown;
  let subscribeFaulted = false;
  let subscribeError: unknown;
  let notifyDuringSubscribe = false;
  let notifyDuringUnsubscribe = false;
  const listeners = new Set<() => void>();
  const historicalListeners: Array<() => void> = [];
  const unsubscribeCalls: Array<ReturnType<typeof vi.fn>> = [];

  const observeNarrative = vi.fn((): NarrativeConformanceSnapshotV1 => {
    if (observeFaulted) throw observeError;
    return currentSnapshot as NarrativeConformanceSnapshotV1;
  });
  const subscribeNarrative = vi.fn((listener: () => void): () => void => {
    if (subscribeFaulted) throw subscribeError;
    historicalListeners.push(listener);
    if (notifyDuringSubscribe) listener();
    listeners.add(listener);
    let active = true;
    const unsubscribe = vi.fn(() => {
      if (!active) return;
      active = false;
      listeners.delete(listener);
      if (notifyDuringUnsubscribe) listener();
    });
    unsubscribeCalls.push(unsubscribe);
    return unsubscribe;
  });

  return {
    observeNarrative,
    subscribeNarrative,
    activeSubscriptions: () => listeners.size,
    historicalListeners,
    unsubscribeCalls,
    failObserve(error: unknown): void {
      observeFaulted = true;
      observeError = error;
    },
    restoreObserve(): void {
      observeFaulted = false;
    },
    failSubscribe(error: unknown): void {
      subscribeFaulted = true;
      subscribeError = error;
    },
    restoreSubscribe(): void {
      subscribeFaulted = false;
    },
    notifySynchronouslyDuringSubscribe(enabled: boolean): void {
      notifyDuringSubscribe = enabled;
    },
    notifySynchronouslyDuringUnsubscribe(enabled: boolean): void {
      notifyDuringUnsubscribe = enabled;
    },
    replaceSnapshot(nextSnapshot: unknown): void {
      currentSnapshot = nextSnapshot;
    },
    publish(nextSnapshot: unknown): void {
      currentSnapshot = nextSnapshot;
      for (const listener of [...listeners]) listener();
    },
  };
}

function playerProfileProbeV1() {
  const listeners = new Set<() => void>();
  let currentProfile = defaultPlayerProfileV1;
  const current = vi.fn(() => currentProfile);
  const subscribe = vi.fn((listener: () => void): () => void => {
    listeners.add(listener);
    let active = true;
    return vi.fn(() => {
      if (!active) return;
      active = false;
      listeners.delete(listener);
    });
  });
  const markSeen = vi.fn(async (_definitionId: string, _seenRevision: number) => {});
  const markMeta = vi.fn(async (_entryId: string, _value?: number) => {});
  const updatePreferences = vi.fn(async () => {});
  const store = Object.freeze({
    current,
    subscribe,
    markSeen,
    markMeta,
    updatePreferences,
  }) satisfies PlayerProfileStoreV1;
  return {
    store,
    current,
    subscribe,
    markSeen,
    markMeta,
    updatePreferences,
    activeSubscriptions: () => listeners.size,
    publish(nextProfile: typeof defaultPlayerProfileV1): void {
      currentProfile = nextProfile;
      for (const listener of [...listeners]) listener();
    },
  };
}

function clockProbeV1() {
  let currentNow = 0;
  let pendingTick: ((now: number) => void) | null = null;
  let latestTick: ((now: number) => void) | null = null;
  const now = vi.fn(() => currentNow);
  const requestTick = vi.fn((callback: (now: number) => void): () => void => {
    pendingTick = callback;
    latestTick = callback;
    let active = true;
    return vi.fn(() => {
      if (!active) return;
      active = false;
      if (pendingTick === callback) pendingTick = null;
    });
  });
  const clock = Object.freeze({ now, requestTick }) satisfies PresentationClockV1;
  return {
    clock,
    now,
    requestTick,
    pendingTickCount: () => pendingTick === null ? 0 : 1,
    fire(nextNow: number): void {
      currentNow = nextNow;
      const callback = pendingTick;
      pendingTick = null;
      if (callback === null) throw new Error("expected one scheduled conformance tick");
      callback(nextNow);
    },
    latestTick(): (now: number) => void {
      if (latestTick === null) throw new Error("expected a scheduled conformance tick");
      return latestTick;
    },
  };
}

function deferredV1<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function conformanceFixtureV1(
  source = mutableNarrativeSourceV1(),
) {
  const profile = playerProfileProbeV1();
  const clock = clockProbeV1();
  const dispatchResolution = vi.fn(
    async (_request: NarrativeConformanceResolutionRequestV1) => undefined,
  );
  const textResolver = vi.fn((textId: string) => `resolved:${textId}`);
  const voiceReplay = vi.fn(() => true);
  const reportFailure = vi.fn();
  const input = Object.freeze({
    observeNarrative: source.observeNarrative,
    subscribeNarrative: source.subscribeNarrative,
    dispatchResolution,
    playerProfile: profile.store,
    presentationClock: clock.clock,
    textResolver,
    voiceReplay,
    reportFailure,
  }) satisfies CreateNarrativeConformanceRigInputV1;
  return {
    source,
    profile,
    clock,
    dispatchResolution,
    textResolver,
    voiceReplay,
    reportFailure,
    input,
  };
}

function expectExactFrozenDataRecordV1(
  value: object,
  expectedKeys: readonly PropertyKey[],
): void {
  expect(Object.isFrozen(value)).toBe(true);
  expect(Reflect.ownKeys(value)).toEqual(expectedKeys);
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    expect(descriptor).toBeDefined();
    expect(descriptor).toHaveProperty("value");
    expect(descriptor?.get).toBeUndefined();
    expect(descriptor?.set).toBeUndefined();
    expect(descriptor?.enumerable).toBe(true);
    expect(descriptor?.writable).toBe(false);
    expect(descriptor?.configurable).toBe(false);
  }
}

function expectCreationFailureV1(
  result: NarrativeConformanceRigCreationResultV1,
  kind: "rejected" | "faulted",
  code:
    | "narrative.conformance_input_invalid"
    | "narrative.conformance_source_claimed"
    | "narrative.conformance_creation_faulted",
): void {
  expect(result).toEqual({ kind, code });
  expectExactFrozenDataRecordV1(result, ["kind", "code"]);
}

function requireCreatedRigV1(
  result: NarrativeConformanceRigCreationResultV1,
): NarrativeConformanceRigV1 {
  if (result.kind !== "created") {
    throw new Error(`expected created conformance rig, received ${result.code}`);
  }
  return result.rig;
}

describe("Narrative conformance package entry", () => {
  it("exports only the production-clean Narrative conformance rig factory", () => {
    expect(
      Reflect.ownKeys(conformanceModuleV1).filter((key) => typeof key === "string"),
    ).toEqual(["createNarrativeConformanceRigV1"]);
    expect(typeof conformanceModuleV1.createNarrativeConformanceRigV1).toBe(
      "function",
    );
    expectTypeOf(createNarrativeConformanceRigV1)
      .parameter(0)
      .toEqualTypeOf<CreateNarrativeConformanceRigInputV1>();
    expectTypeOf(createNarrativeConformanceRigV1)
      .returns
      .toEqualTypeOf<NarrativeConformanceRigCreationResultV1>();
    expectTypeOf<NarrativeConformanceRigV1["Host"]>()
      .toEqualTypeOf<ComponentType<NarrativeConformanceHostPropsV1>>();
    expectTypeOf<keyof NarrativeConformanceHostPropsV1>()
      .toEqualTypeOf<"inputRouter">();
    expectTypeOf<NarrativeConformanceHostPropsV1["inputRouter"]>()
      .toEqualTypeOf<InputRouterV1>();
  });

  it("returns an exact frozen created result and two-member terminal rig", () => {
    const fixture = conformanceFixtureV1();
    expect(Reflect.ownKeys(fixture.input)).toEqual(conformanceInputKeysV1);

    const result = createNarrativeConformanceRigV1(fixture.input);
    expectExactFrozenDataRecordV1(result, ["kind", "rig"]);
    const rig = requireCreatedRigV1(result);
    expectExactFrozenDataRecordV1(rig, ["Host", "dispose"]);
    expect(typeof rig.Host).toBe("function");
    expect(typeof rig.dispose).toBe("function");
    expect(fixture.source.observeNarrative).toHaveBeenCalledOnce();
    expect(fixture.source.subscribeNarrative).toHaveBeenCalledOnce();
    expect(fixture.source.activeSubscriptions()).toBe(1);

    expect(rig.dispose()).toBeUndefined();
    expect(rig.dispose()).toBeUndefined();
    expect(fixture.source.activeSubscriptions()).toBe(0);
    expect(fixture.source.unsubscribeCalls[0]).toHaveBeenCalledOnce();
    expect(fixture.clock.pendingTickCount()).toBe(0);
    expect(fixture.profile.activeSubscriptions()).toBe(0);
  });

  it("fails closed for non-exact Host props and hostile routers before registration", () => {
    const fixture = conformanceFixtureV1();
    const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(fixture.input));
    const invalidRegister = vi.fn(() => vi.fn());
    const invalidRouter = Object.freeze({
      register: invalidRegister,
      route: vi.fn(() => ({ kind: "ignored" as const })),
      clearTransientInput: vi.fn(),
      extra: true,
    }) as unknown as InputRouterV1;
    const hostileTarget = Object.freeze({});
    const hostileRouter = new Proxy(hostileTarget, {
      ownKeys: () => {
        throw new Error("hostile router ownKeys");
      },
    }) as unknown as InputRouterV1;

    const view = render(<rig.Host inputRouter={invalidRouter} />);
    expect(document.querySelector("[data-narrative-conformance-portal]")).toBeNull();
    expect(invalidRegister).not.toHaveBeenCalled();
    view.rerender(<rig.Host inputRouter={hostileRouter} />);
    expect(document.querySelector("[data-narrative-conformance-portal]")).toBeNull();

    const ExtraPropsHost = rig.Host as ComponentType<{
      readonly inputRouter: InputRouterV1;
      readonly extra: true;
    }>;
    view.rerender(<ExtraPropsHost inputRouter={createInputRouterV1()} extra />);
    expect(document.querySelector("[data-narrative-conformance-portal]")).toBeNull();
    view.unmount();
    rig.dispose();
  });

  it("rejects invalid input descriptors before any raw callable, claim, or allocation", () => {
    const fixture = conformanceFixtureV1();
    const accessorRead = vi.fn(() => fixture.input.observeNarrative);
    const accessorInput = Object.freeze(Object.defineProperty(
      Object.fromEntries(
        conformanceInputKeysV1
          .filter((key) => key !== "observeNarrative")
          .map((key) => [key, fixture.input[key]]),
      ),
      "observeNarrative",
      { enumerable: true, get: accessorRead },
    ));
    /* oxlint-disable unicorn/no-thenable -- hostile callable contract fixture */
    const thenableObserve = Object.assign(
      vi.fn(() => snapshotV1()),
      { then: vi.fn() },
    );
    const inheritedThenObserve = vi.fn(() => snapshotV1());
    Object.setPrototypeOf(
      inheritedThenObserve,
      Object.freeze({ then: vi.fn() }),
    );
    const throwingThenObserve = new Proxy(vi.fn(() => snapshotV1()), {
      get: (target, key, receiver) => {
        if (key === "then") throw new Error("hostile callable then");
        return Reflect.get(target, key, receiver);
      },
    });
    /* oxlint-enable unicorn/no-thenable */
    const inheritedInput = Object.create(fixture.input) as object;
    const foreignInput = Object.assign(
      Object.create(Object.freeze({ foreign: true })),
      fixture.input,
    );
    const hostileProxy = new Proxy(Object.freeze({}), {
      ownKeys: () => {
        throw new Error("hostile input ownKeys");
      },
    });
    const divergentGetInput = new Proxy(fixture.input, {
      get: (target, key, receiver) =>
        key === "observeNarrative" ? vi.fn(() => snapshotV1()) : Reflect.get(target, key, receiver),
    });
    const invalidInputs: readonly unknown[] = [
      null,
      undefined,
      Object.freeze({}),
      Object.freeze({ ...fixture.input, extra: true }),
      Object.freeze(Object.fromEntries(
        conformanceInputKeysV1
          .filter((key) => key !== "reportFailure")
          .map((key) => [key, fixture.input[key]]),
      )),
      accessorInput,
      inheritedInput,
      foreignInput,
      hostileProxy,
      Object.freeze({ ...fixture.input, observeNarrative: true }),
      Object.freeze({ ...fixture.input, observeNarrative: thenableObserve }),
      Object.freeze({ ...fixture.input, observeNarrative: inheritedThenObserve }),
      Object.freeze({ ...fixture.input, observeNarrative: throwingThenObserve }),
      divergentGetInput,
      Object.freeze({ ...fixture.input, voiceReplay: undefined }),
    ];

    for (const input of invalidInputs) {
      expectCreationFailureV1(
        createNarrativeConformanceRigV1(
          input as CreateNarrativeConformanceRigInputV1,
        ),
        "rejected",
        "narrative.conformance_input_invalid",
      );
    }

    expect(accessorRead).not.toHaveBeenCalled();
    expect(thenableObserve).not.toHaveBeenCalled();
    expect(inheritedThenObserve).not.toHaveBeenCalled();
    expect(throwingThenObserve).not.toHaveBeenCalled();
    expect(fixture.source.observeNarrative).not.toHaveBeenCalled();
    expect(fixture.source.subscribeNarrative).not.toHaveBeenCalled();
    expect(fixture.dispatchResolution).not.toHaveBeenCalled();
    expect(fixture.profile.current).not.toHaveBeenCalled();
    expect(fixture.profile.subscribe).not.toHaveBeenCalled();
    expect(fixture.clock.now).not.toHaveBeenCalled();
    expect(fixture.clock.requestTick).not.toHaveBeenCalled();
    expect(fixture.textResolver).not.toHaveBeenCalled();
    expect(fixture.voiceReplay).not.toHaveBeenCalled();
    expect(fixture.reportFailure).not.toHaveBeenCalled();
    expect(fixture.source.activeSubscriptions()).toBe(0);
    expect(fixture.clock.pendingTickCount()).toBe(0);
  });

  it("fails closed before calling a callable with an over-budget fresh Proxy prototype chain", () => {
    const fixture = conformanceFixtureV1();
    const deepObserve = vi.fn(() => snapshotV1());
    let prototype: object | null = Function.prototype;
    for (let depth = 0; depth < 128; depth += 1) {
      const next: object | null = prototype;
      prototype = new Proxy({}, { getPrototypeOf: (): object | null => next });
    }
    Object.setPrototypeOf(deepObserve, prototype);
    const result = createNarrativeConformanceRigV1(Object.freeze({
      ...fixture.input,
      observeNarrative: deepObserve,
    }));
    if (result.kind === "created") result.rig.dispose();

    expectCreationFailureV1(
      result,
      "rejected",
      "narrative.conformance_input_invalid",
    );
    expect(deepObserve).not.toHaveBeenCalled();
    expect(fixture.source.subscribeNarrative).not.toHaveBeenCalled();
  });

  it("keeps descriptor validation ahead of an already-active source-pair claim", () => {
    const fixture = conformanceFixtureV1();
    const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(fixture.input));
    const observeCalls = fixture.source.observeNarrative.mock.calls.length;
    const subscribeCalls = fixture.source.subscribeNarrative.mock.calls.length;

    expectCreationFailureV1(
      createNarrativeConformanceRigV1(
        Object.freeze({ ...fixture.input, extra: true }) as never,
      ),
      "rejected",
      "narrative.conformance_input_invalid",
    );
    expect(fixture.source.observeNarrative).toHaveBeenCalledTimes(observeCalls);
    expect(fixture.source.subscribeNarrative).toHaveBeenCalledTimes(subscribeCalls);
    expect(fixture.source.activeSubscriptions()).toBe(1);
    rig.dispose();
  });

  it("atomically rejects a duplicate exact source pair before observe or subscribe", () => {
    const fixture = conformanceFixtureV1();
    const first = requireCreatedRigV1(
      createNarrativeConformanceRigV1(fixture.input),
    );
    const observeCalls = fixture.source.observeNarrative.mock.calls.length;
    const subscribeCalls = fixture.source.subscribeNarrative.mock.calls.length;

    expectCreationFailureV1(
      createNarrativeConformanceRigV1(Object.freeze({ ...fixture.input })),
      "rejected",
      "narrative.conformance_source_claimed",
    );
    expect(fixture.source.observeNarrative).toHaveBeenCalledTimes(observeCalls);
    expect(fixture.source.subscribeNarrative).toHaveBeenCalledTimes(subscribeCalls);
    expect(fixture.source.activeSubscriptions()).toBe(1);
    expect(fixture.clock.pendingTickCount()).toBe(0);
    first.dispose();
  });

  it("rolls back an initial observe fault, releases the claim, and permits fresh retry", () => {
    const source = mutableNarrativeSourceV1();
    source.failObserve(new Error("initial observe fault"));
    const fixture = conformanceFixtureV1(source);

    expectCreationFailureV1(
      createNarrativeConformanceRigV1(fixture.input),
      "faulted",
      "narrative.conformance_creation_faulted",
    );
    expect(source.observeNarrative).toHaveBeenCalledOnce();
    expect(source.subscribeNarrative).not.toHaveBeenCalled();
    expect(source.activeSubscriptions()).toBe(0);
    expect(fixture.clock.pendingTickCount()).toBe(0);
    expect(fixture.profile.activeSubscriptions()).toBe(0);

    source.restoreObserve();
    const retry = requireCreatedRigV1(
      createNarrativeConformanceRigV1(fixture.input),
    );
    expect(source.activeSubscriptions()).toBe(1);
    retry.dispose();
  });

  it("faults and unclaims exact-descriptor and hostile-Proxy snapshot results", () => {
    const valid = snapshotV1();
    const divergentSnapshot = new Proxy(valid, {
      get: (target, key, receiver) =>
        key === "revision" ? parseNonNegativeSafeInteger(1) : Reflect.get(target, key, receiver),
    });
    const source = mutableNarrativeSourceV1(divergentSnapshot);
    const fixture = conformanceFixtureV1(source);

    expectCreationFailureV1(
      createNarrativeConformanceRigV1(fixture.input),
      "faulted",
      "narrative.conformance_creation_faulted",
    );
    expect(source.activeSubscriptions()).toBe(0);

    const revoked = Proxy.revocable(valid, {});
    revoked.revoke();
    source.replaceSnapshot(revoked.proxy);
    expectCreationFailureV1(
      createNarrativeConformanceRigV1(fixture.input),
      "faulted",
      "narrative.conformance_creation_faulted",
    );
    expect(source.activeSubscriptions()).toBe(0);

    source.replaceSnapshot(valid);
    const retry = requireCreatedRigV1(createNarrativeConformanceRigV1(fixture.input));
    expect(source.activeSubscriptions()).toBe(1);
    retry.dispose();
  });

  it("rolls back a partial subscription fault and a synchronous subscribe reentry", () => {
    const source = mutableNarrativeSourceV1();
    source.failSubscribe(new Error("subscribe fault"));
    const fixture = conformanceFixtureV1(source);

    expectCreationFailureV1(
      createNarrativeConformanceRigV1(fixture.input),
      "faulted",
      "narrative.conformance_creation_faulted",
    );
    expect(source.activeSubscriptions()).toBe(0);
    source.restoreSubscribe();
    source.notifySynchronouslyDuringSubscribe(true);
    expectCreationFailureV1(
      createNarrativeConformanceRigV1(fixture.input),
      "faulted",
      "narrative.conformance_creation_faulted",
    );
    expect(source.activeSubscriptions()).toBe(0);
    expect(source.unsubscribeCalls.at(-1)).toHaveBeenCalledOnce();

    source.notifySynchronouslyDuringSubscribe(false);
    const retry = requireCreatedRigV1(
      createNarrativeConformanceRigV1(fixture.input),
    );
    retry.dispose();
  });

  it("best-effort rolls back a listener installed before an invalid callable cleanup", () => {
    for (const invalidKind of ["thenable", "hostile_proxy"] as const) {
      const source = mutableNarrativeSourceV1();
      const fixture = conformanceFixtureV1(source);
      const listeners = new Set<() => void>();
      const cleanupTargets: Array<ReturnType<typeof vi.fn>> = [];
      let returnInvalidCleanup = true;
      const subscribeNarrative = vi.fn((listener: () => void): () => void => {
        listeners.add(listener);
        let subscribed = true;
        const cleanupTarget = vi.fn(() => {
          if (!subscribed) return;
          subscribed = false;
          listeners.delete(listener);
        });
        cleanupTargets.push(cleanupTarget);
        if (!returnInvalidCleanup) return cleanupTarget;
        if (invalidKind === "thenable") {
          /* oxlint-disable-next-line unicorn/no-thenable -- invalid cleanup fixture */
          return Object.assign(cleanupTarget, { then: vi.fn() });
        }
        return new Proxy(cleanupTarget, {
          get: (target, key, receiver) => {
            if (key === "then") throw new Error("hostile cleanup then");
            return Reflect.get(target, key, receiver);
          },
        });
      });
      const input = Object.freeze({
        ...fixture.input,
        subscribeNarrative,
      }) satisfies CreateNarrativeConformanceRigInputV1;

      expectCreationFailureV1(
        createNarrativeConformanceRigV1(input),
        "faulted",
        "narrative.conformance_creation_faulted",
      );
      expect(listeners.size).toBe(0);
      expect(cleanupTargets[0]).toHaveBeenCalledOnce();

      returnInvalidCleanup = false;
      const retry = requireCreatedRigV1(createNarrativeConformanceRigV1(input));
      expect(listeners.size).toBe(1);
      retry.dispose();
      expect(listeners.size).toBe(0);
      expect(cleanupTargets[1]).toHaveBeenCalledOnce();
    }
  });

  it("terminal-fences unsubscribe reentry and predecessor callbacks before releasing the claim", () => {
    const fixture = conformanceFixtureV1();
    fixture.source.notifySynchronouslyDuringUnsubscribe(true);
    const predecessor = requireCreatedRigV1(
      createNarrativeConformanceRigV1(fixture.input),
    );
    const predecessorCallback = fixture.source.historicalListeners[0];
    const observesBeforeDispose = fixture.source.observeNarrative.mock.calls.length;
    predecessor.dispose();
    predecessor.dispose();
    expect(fixture.source.observeNarrative).toHaveBeenCalledTimes(
      observesBeforeDispose,
    );
    expect(fixture.source.unsubscribeCalls[0]).toHaveBeenCalledOnce();

    fixture.source.notifySynchronouslyDuringUnsubscribe(false);
    const successor = requireCreatedRigV1(
      createNarrativeConformanceRigV1(fixture.input),
    );
    const observesBeforeLateCallback = fixture.source.observeNarrative.mock.calls.length;
    predecessorCallback?.();
    expect(fixture.source.observeNarrative).toHaveBeenCalledTimes(
      observesBeforeLateCallback,
    );
    expect(fixture.source.activeSubscriptions()).toBe(1);
    successor.dispose();
  });

  it.each(["fresh_equal_revision", "revision_regression"] as const)(
    "terminalizes the exact source identity violation %s once and permits a fresh claim",
    (faultKind) => {
      let current = snapshotV1(2);
      const listeners = new Set<() => void>();
      const historicalListeners: Array<() => void> = [];
      const observeReceivers: unknown[] = [];
      const subscribeReceivers: unknown[] = [];
      const failureReceivers: unknown[] = [];
      const cleanupCalls: Array<ReturnType<typeof vi.fn>> = [];
      let exactInput!: CreateNarrativeConformanceRigInputV1;
      function observeNarrative(this: unknown): NarrativeConformanceSnapshotV1 {
        observeReceivers.push(this);
        return current;
      }
      function subscribeNarrative(this: unknown, listener: () => void): () => void {
        subscribeReceivers.push(this);
        historicalListeners.push(listener);
        listeners.add(listener);
        let subscribed = true;
        const sourceCleanup = vi.fn(() => {
          if (!subscribed) return;
          subscribed = false;
          listeners.delete(listener);
        });
        cleanupCalls.push(sourceCleanup);
        return sourceCleanup;
      }
      function reportFailure(this: unknown, _error: unknown): void {
        failureReceivers.push(this);
        historicalListeners[0]?.();
        throw new Error("contained reportFailure reentry");
      }
      const fixture = conformanceFixtureV1();
      exactInput = Object.freeze({
        ...fixture.input,
        observeNarrative,
        subscribeNarrative,
        reportFailure,
      });

      const predecessor = requireCreatedRigV1(createNarrativeConformanceRigV1(exactInput));
      expect(listeners.size).toBe(1);
      historicalListeners[0]?.();
      expect(listeners.size).toBe(1);
      expect(failureReceivers).toHaveLength(0);

      current = faultKind === "fresh_equal_revision" ? snapshotV1(2) : snapshotV1(1);
      historicalListeners[0]?.();
      expect(listeners.size).toBe(0);
      expect(cleanupCalls[0]).toHaveBeenCalledOnce();
      expect(failureReceivers).toEqual([exactInput]);
      expect(observeReceivers).toEqual([exactInput, exactInput, exactInput]);
      expect(subscribeReceivers).toEqual([exactInput]);
      predecessor.dispose();

      current = snapshotV1(3);
      const successor = requireCreatedRigV1(createNarrativeConformanceRigV1(exactInput));
      expect(listeners.size).toBe(1);
      expect(observeReceivers.at(-1)).toBe(exactInput);
      expect(subscribeReceivers.at(-1)).toBe(exactInput);
      successor.dispose();
      expect(listeners.size).toBe(0);
      expect(cleanupCalls[1]).toHaveBeenCalledOnce();
    },
  );

  it("removes 10,000 caller-retained empty outer source-claim buckets in O(1)", () => {
    const fixture = conformanceFixtureV1();
    const retainedObserveFunctions = new Set<
      CreateNarrativeConformanceRigInputV1["observeNarrative"]
    >();
    const weakMapDelete = vi.spyOn(WeakMap.prototype, "delete");
    let faulted = 0;

    for (let sequence = 0; sequence < 10_000; sequence += 1) {
      const observeNarrative = vi.fn((): NarrativeConformanceSnapshotV1 => {
        throw new Error(`observe fault ${String(sequence)}`);
      });
      retainedObserveFunctions.add(observeNarrative);
      const result = createNarrativeConformanceRigV1(Object.freeze({
        ...fixture.input,
        observeNarrative,
        subscribeNarrative: vi.fn((_listener: () => void) => vi.fn()),
      }));
      if (
        result.kind === "faulted" &&
        result.code === "narrative.conformance_creation_faulted"
      ) faulted += 1;
      else if (result.kind === "created") result.rig.dispose();
    }

    const outerDeletes = weakMapDelete.mock.calls.filter(([key]) =>
      retainedObserveFunctions.has(
        key as CreateNarrativeConformanceRigInputV1["observeNarrative"],
      )
    ).length;
    weakMapDelete.mockRestore();
    expect(faulted).toBe(10_000);
    expect(outerDeletes).toBe(10_000);
  }, 20_000);

  it("mounts the dormant Host on the exact router and authenticates renderer actions", async () => {
    const pending = sayPendingV1(1);
    const source = mutableNarrativeSourceV1(snapshotV1());
    const fixture = conformanceFixtureV1(source);
    const dispatchResolution = vi.fn((request: NarrativeConformanceResolutionRequestV1) => {
      expect(request.resolution.kind).toBe("advance");
      source.publish(snapshotV1(2));
      return Promise.resolve();
    });
    const input = Object.freeze({
      ...fixture.input,
      dispatchResolution,
    }) satisfies CreateNarrativeConformanceRigInputV1;
    const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(input));
    const inputRouter = createInputRouterV1();
    const downstreamRouteProbe = vi.fn((_event: unknown) => inputIgnoredV1);
    const unregisterRouteProbe = inputRouter.register({
      context: "debug",
      handle: downstreamRouteProbe,
    });

    const view = render(<rig.Host inputRouter={inputRouter} />);
    await waitFor(() => {
      expect(document.querySelector("[data-narrative-conformance-portal]"))
        .not.toBeNull();
    });
    expect(document.querySelector(
      '[data-narrative-surface-focus-scope="dialogue"]',
    )).toBeNull();
    await act(async () => {
      source.publish(snapshotV1(1, pending));
      await Promise.resolve();
    });
    const dialogueShell = await waitFor(() => {
      const shell = document.querySelector<HTMLElement>(
        '[data-narrative-surface-render-shell="dialogue"]',
      );
      expect(shell).not.toBeNull();
      expect(shell).not.toHaveAttribute("aria-hidden", "true");
      return shell!;
    });
    const primaryAction = dialogueShell.querySelector<HTMLButtonElement>(
      "button:not(:disabled)",
    );
    expect(primaryAction).not.toBeNull();

    fireEvent.click(primaryAction!);
    await waitFor(() => {
      expect(dialogueShell.querySelector("[data-narrative-conformance-text]"))
        .toHaveTextContent("resolved:text.conformance.line");
    });
    expect(dispatchResolution).not.toHaveBeenCalled();

    fireEvent.click(primaryAction!);
    await waitFor(() => expect(dispatchResolution).toHaveBeenCalledOnce());
    const request = dispatchResolution.mock.calls[0]?.[0];
    expect(request).toEqual({
      expectedOccurrenceId: pending.occurrenceId,
      resolution: { kind: "advance" },
    });
    expectExactFrozenDataRecordV1(request!, [
      "expectedOccurrenceId",
      "resolution",
    ]);
    expectExactFrozenDataRecordV1(request!.resolution, ["kind"]);
    expect(downstreamRouteProbe).toHaveBeenCalledTimes(2);
    expect(downstreamRouteProbe.mock.calls.map(([event]) => event)).toEqual([
      { kind: "action", actionId: systemInputActionIdsV1.narrativeAdvance },
      { kind: "action", actionId: systemInputActionIdsV1.narrativeAdvance },
    ]);

    view.unmount();
    unregisterRouteProbe();
    rig.dispose();
    expect(source.activeSubscriptions()).toBe(0);
    expect(fixture.profile.activeSubscriptions()).toBe(0);
    expect(fixture.clock.pendingTickCount()).toBe(0);
  });

  it.each(["debug", "system"] as const)(
    "honors the %s blocker before raw and nested authenticated actions",
    async (blockingContext) => {
      const pending = sayPendingV1(1);
      const source = mutableNarrativeSourceV1(snapshotV1(1, pending));
      const fixture = conformanceFixtureV1(source);
      const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(fixture.input));
      const inputRouter = createInputRouterV1();
      const view = render(<rig.Host inputRouter={inputRouter} />);
      const confirm = await waitFor(() => {
        const button = document.querySelector<HTMLButtonElement>(
          '[data-narrative-conformance-confirm="true"]',
        );
        expect(button).not.toBeNull();
        return button!;
      });
      const text = document.querySelector<HTMLElement>(
        "[data-narrative-conformance-text]",
      );
      expect(text).toHaveTextContent("");
      const blocker = vi.fn(() => inputHandledV1);
      const unregisterBlocker = inputRouter.register(Object.freeze({
        context: blockingContext,
        handle: blocker,
      }));
      const advanceEvent = Object.freeze({
        kind: "action" as const,
        actionId: systemInputActionIdsV1.narrativeAdvance,
      });

      expect(inputRouter.route(advanceEvent)).toEqual({
        kind: "handled",
        context: blockingContext,
      });
      fireEvent.click(confirm);
      expect(blocker).toHaveBeenCalledTimes(2);
      expect(text).toHaveTextContent("");
      expect(fixture.dispatchResolution).not.toHaveBeenCalled();
      unregisterBlocker();
      expect(inputRouter.route(advanceEvent)).toEqual({
        kind: "handled",
        context: "narrative",
      });
      await waitFor(() => {
        expect(text).toHaveTextContent("resolved:text.conformance.line");
      });

      view.unmount();
      rig.dispose();
    },
  );

  it("keeps unavailable History closed, suspends its parent, and restores opener focus", async () => {
    const pending = sayPendingV1(1);
    const source = mutableNarrativeSourceV1(snapshotV1(1, pending));
    const fixture = conformanceFixtureV1(source);
    const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(fixture.input));
    const view = render(<rig.Host inputRouter={createInputRouterV1()} />);
    const emptyHistoryOpener = await waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>(
        '[data-dialogue-history-open="true"]',
      );
      expect(button).not.toBeNull();
      return button!;
    });

    fireEvent.click(emptyHistoryOpener);
    await act(async () => {
      await Promise.resolve();
    });
    expect(document.querySelector('[data-dialogue-history="true"]')).toBeNull();

    await act(async () => {
      source.publish(snapshotV1(2, pending, historyV1(1)));
      await Promise.resolve();
    });
    const opener = await waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>(
        '[data-dialogue-history-open="true"]',
      );
      expect(button).not.toBeNull();
      return button!;
    });
    opener.focus();
    fireEvent.click(opener);
    const history = await waitFor(() => {
      const surface = document.querySelector<HTMLElement>(
        '[data-dialogue-history="true"]',
      );
      expect(surface).toHaveTextContent("resolved:text.conformance.history");
      return surface!;
    });
    expect(document.querySelector(
      '[data-narrative-surface-render-shell="dialogue"]',
    )).toHaveAttribute("aria-hidden", "true");
    const close = history.querySelector<HTMLButtonElement>(
      '[data-dialogue-history-close="true"]',
    );
    expect(close).not.toBeNull();
    fireEvent.click(close!);
    await waitFor(() => {
      expect(document.querySelector('[data-dialogue-history="true"]')).toBeNull();
      expect(document.querySelector(
        '[data-narrative-surface-render-shell="dialogue"]',
      )).not.toHaveAttribute("aria-hidden", "true");
      expect(document.activeElement).toBe(opener);
    });
    expect(fixture.dispatchResolution).not.toHaveBeenCalled();

    view.unmount();
    rig.dispose();
  });

  it("does not re-enter a retired Choice resolver and resolves fresh current props", async () => {
    const predecessor = namedChoicePendingV1(1, "predecessor");
    const successor = namedChoicePendingV1(2, "successor");
    const source = mutableNarrativeSourceV1(snapshotV1(1, predecessor));
    const fixture = conformanceFixtureV1(source);
    let textPrefix = "resolved";
    const textResolver = vi.fn((textId: string) => `${textPrefix}:${textId}`);
    const dispatchResolution = vi.fn(
      (request: NarrativeConformanceResolutionRequestV1): Promise<unknown> => {
        source.publish(snapshotV1(2, successor));
        return Promise.resolve(request);
      },
    );
    const input = Object.freeze({
      ...fixture.input,
      dispatchResolution,
      textResolver,
    }) satisfies CreateNarrativeConformanceRigInputV1;
    const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(input));
    const view = render(<rig.Host inputRouter={createInputRouterV1()} />);
    const predecessorChoice = await waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>(
        '[data-narrative-conformance-choice="choice.conformance.predecessor.first"]',
      );
      expect(button).not.toBeNull();
      return button!;
    });
    const callCount = (textId: string): number =>
      textResolver.mock.calls.filter(([calledTextId]) => calledTextId === textId).length;
    const predecessorTextIds = [
      "text.conformance.predecessor.prompt",
      "text.conformance.predecessor.first",
      "text.conformance.predecessor.second",
    ] as const;
    const predecessorCallCounts = predecessorTextIds.map(callCount);
    for (const count of predecessorCallCounts) expect(count).toBeGreaterThan(0);

    fireEvent.click(predecessorChoice);
    await waitFor(() => {
      expect(document.querySelector(
        '[data-narrative-conformance-choice="choice.conformance.successor.first"]',
      )).not.toBeNull();
      expect(document.querySelector("[data-narrative-conformance-text]"))
        .toHaveTextContent("resolved:text.conformance.successor.prompt");
    });
    predecessorTextIds.forEach((textId, index) => {
      expect(callCount(textId)).toBe(predecessorCallCounts[index]);
    });
    const successorTextIds = [
      "text.conformance.successor.prompt",
      "text.conformance.successor.first",
      "text.conformance.successor.second",
    ] as const;
    const successorCallCounts = successorTextIds.map(callCount);
    for (const count of successorCallCounts) expect(count).toBeGreaterThan(0);

    await act(async () => {
      textPrefix = "churned";
      fixture.profile.publish(Object.freeze({
        ...defaultPlayerProfileV1,
        preferences: Object.freeze({ ...defaultPlayerProfileV1.preferences }),
      }));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(document.querySelector("[data-narrative-conformance-text]"))
        .toHaveTextContent("churned:text.conformance.successor.prompt");
      successorTextIds.forEach((textId, index) => {
        expect(callCount(textId)).toBeGreaterThan(successorCallCounts[index] ?? 0);
      });
    });
    predecessorTextIds.forEach((textId, index) => {
      expect(callCount(textId)).toBe(predecessorCallCounts[index]);
    });

    view.unmount();
    rig.dispose();
    expect(source.activeSubscriptions()).toBe(0);
    expect(fixture.profile.activeSubscriptions()).toBe(0);
  });

  it("reports only a rejected completion that still owns the exact source and Host generation", async () => {
    const runCase = async (
      settlement: "current" | "source_replaced" | "disposed",
    ): Promise<number> => {
      const source = mutableNarrativeSourceV1(snapshotV1(1, sayPendingV1(1)));
      const fixture = conformanceFixtureV1(source);
      const deferred = deferredV1<unknown>();
      const input = Object.freeze({
        ...fixture.input,
        dispatchResolution: vi.fn(() => deferred.promise),
      }) satisfies CreateNarrativeConformanceRigInputV1;
      const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(input));
      const view = render(<rig.Host inputRouter={createInputRouterV1()} />);
      const confirm = await waitFor(() => {
        const button = document.querySelector<HTMLButtonElement>(
          '[data-narrative-conformance-confirm="true"]',
        );
        expect(button).not.toBeNull();
        return button!;
      });

      fireEvent.click(confirm);
      fireEvent.click(confirm);
      await waitFor(() => expect(input.dispatchResolution).toHaveBeenCalledOnce());
      if (settlement === "source_replaced") {
        await act(async () => {
          source.publish(snapshotV1(2, sayPendingV1(2)));
          await Promise.resolve();
        });
      } else if (settlement === "disposed") {
        await act(async () => {
          rig.dispose();
          await Promise.resolve();
        });
      }
      await act(async () => {
        deferred.reject(new Error("semantic completion rejected"));
        await Promise.resolve();
      });
      const reports = fixture.reportFailure.mock.calls.length;
      view.unmount();
      rig.dispose();
      return reports;
    };

    expect(await runCase("current")).toBe(1);
    expect(await runCase("source_replaced")).toBe(0);
    expect(await runCase("disposed")).toBe(0);
  });

  it.each(["current", "source_replaced", "disposed"] as const)(
    "admits only a %s natural Pause tick for semantic resolution",
    async (settlement) => {
      const pending = pausePendingV1(1);
      const source = mutableNarrativeSourceV1(snapshotV1(1, pending));
      const fixture = conformanceFixtureV1(source);
      const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(fixture.input));
      const view = render(<rig.Host inputRouter={createInputRouterV1()} />);

      await waitFor(() => expect(fixture.clock.pendingTickCount()).toBe(1));
      const retainedTick = fixture.clock.latestTick();
      if (settlement === "source_replaced") {
        await act(async () => {
          source.publish(snapshotV1(2, sayPendingV1(2)));
          await Promise.resolve();
        });
      } else if (settlement === "disposed") {
        await act(async () => {
          rig.dispose();
          await Promise.resolve();
        });
      }

      await act(async () => {
        retainedTick(1_000);
        await Promise.resolve();
      });
      if (settlement === "current") {
        await waitFor(() => expect(fixture.dispatchResolution).toHaveBeenCalledOnce());
        expect(fixture.dispatchResolution.mock.calls[0]?.[0]).toEqual({
          expectedOccurrenceId: pending.occurrenceId,
          resolution: { kind: "resume" },
        });
      } else {
        expect(fixture.dispatchResolution).not.toHaveBeenCalled();
      }
      expect(fixture.reportFailure).not.toHaveBeenCalled();

      view.unmount();
      rig.dispose();
    },
  );

  it("reports markSeen rejection only while its exact source, frame, and Host generation remain current", async () => {
    const runCase = async (replaceBeforeReject: boolean): Promise<number> => {
      const source = mutableNarrativeSourceV1(snapshotV1(1, sayPendingV1(1)));
      const fixture = conformanceFixtureV1(source);
      const deferred = deferredV1<void>();
      const markSeen = vi.fn(
        (_definitionId: string, _seenRevision: number): Promise<void> => deferred.promise,
      );
      const playerProfile = Object.freeze({
        ...fixture.profile.store,
        markSeen,
      }) satisfies PlayerProfileStoreV1;
      const input = Object.freeze({
        ...fixture.input,
        playerProfile,
      }) satisfies CreateNarrativeConformanceRigInputV1;
      const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(input));
      const view = render(<rig.Host inputRouter={createInputRouterV1()} />);
      const confirm = await waitFor(() => {
        const button = document.querySelector<HTMLButtonElement>(
          '[data-narrative-conformance-confirm="true"]',
        );
        expect(button).not.toBeNull();
        return button!;
      });

      fireEvent.click(confirm);
      await waitFor(() => expect(markSeen).toHaveBeenCalledOnce());
      if (replaceBeforeReject) {
        await act(async () => {
          source.publish(snapshotV1(2, sayPendingV1(2)));
          await Promise.resolve();
        });
      }
      await act(async () => {
        deferred.reject(new Error("markSeen completion rejected"));
        await Promise.resolve();
      });
      const reports = fixture.reportFailure.mock.calls.length;
      view.unmount();
      rig.dispose();
      return reports;
    };

    expect(await runCase(false)).toBe(1);
    expect(await runCase(true)).toBe(0);
  });

  it("marks a dynamically published instant Say seen before action binding", async () => {
    const pending = sayPendingV1(1);
    const source = mutableNarrativeSourceV1(snapshotV1());
    const fixture = conformanceFixtureV1(source);
    const instantProfile = Object.freeze({
      ...defaultPlayerProfileV1,
      preferences: Object.freeze({
        ...defaultPlayerProfileV1.preferences,
        textRevealCharsPerSecond: 0,
      }),
    });
    const playerProfile = Object.freeze({
      ...fixture.profile.store,
      current: vi.fn(() => instantProfile),
    }) satisfies PlayerProfileStoreV1;
    const input = Object.freeze({
      ...fixture.input,
      playerProfile,
    }) satisfies CreateNarrativeConformanceRigInputV1;
    const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(input));
    const view = render(<rig.Host inputRouter={createInputRouterV1()} />);

    await act(async () => {
      source.publish(snapshotV1(1, pending));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(document.querySelector("[data-narrative-conformance-text]"))
        .toHaveTextContent("resolved:text.conformance.line");
    });
    expect(fixture.profile.markSeen).toHaveBeenCalledExactlyOnceWith(
      pending.definitionId,
      pending.seenRevision,
    );

    view.unmount();
    rig.dispose();
  });

  it("suppresses a pre-binding instant markSeen rejection after exact Host unmount", async () => {
    const pending = sayPendingV1(1);
    const source = mutableNarrativeSourceV1(snapshotV1());
    const fixture = conformanceFixtureV1(source);
    const deferred = deferredV1<void>();
    const instantProfile = Object.freeze({
      ...defaultPlayerProfileV1,
      preferences: Object.freeze({
        ...defaultPlayerProfileV1.preferences,
        textRevealCharsPerSecond: 0,
      }),
    });
    const markSeen = vi.fn(
      (_definitionId: string, _seenRevision: number): Promise<void> => deferred.promise,
    );
    const playerProfile = Object.freeze({
      ...fixture.profile.store,
      current: vi.fn(() => instantProfile),
      markSeen,
    }) satisfies PlayerProfileStoreV1;
    const input = Object.freeze({
      ...fixture.input,
      playerProfile,
    }) satisfies CreateNarrativeConformanceRigInputV1;
    const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(input));
    const view = render(<rig.Host inputRouter={createInputRouterV1()} />);

    await act(async () => {
      source.publish(snapshotV1(1, pending));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(markSeen).toHaveBeenCalledExactlyOnceWith(
        pending.definitionId,
        pending.seenRevision,
      )
    );
    view.unmount();
    await act(async () => {
      deferred.reject(new Error("retired pre-binding markSeen rejected"));
      await Promise.resolve();
    });
    expect(fixture.reportFailure).not.toHaveBeenCalled();

    rig.dispose();
  });

  it("routes choice, skippable pause, and custom controls through exact authenticated attempts", async () => {
    const source = mutableNarrativeSourceV1(snapshotV1());
    const fixture = conformanceFixtureV1(source);
    let revision = 0;
    const dispatchResolution = vi.fn(
      (request: NarrativeConformanceResolutionRequestV1): Promise<unknown> => {
        revision += 1;
        source.publish(snapshotV1(revision));
        return Promise.resolve(request);
      },
    );
    const input = Object.freeze({
      ...fixture.input,
      dispatchResolution,
    }) satisfies CreateNarrativeConformanceRigInputV1;
    const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(input));
    const inputRouter = createInputRouterV1();
    const view = render(<rig.Host inputRouter={inputRouter} />);
    const publishPending = async (pending: PendingInteractionV1): Promise<void> => {
      revision += 1;
      await act(async () => {
        source.publish(snapshotV1(revision, pending));
        await Promise.resolve();
      });
    };

    const choice = choicePendingV1(1);
    await publishPending(choice);
    const choiceButton = await waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>(
        '[data-narrative-conformance-choice="choice.conformance.second"]',
      );
      expect(button).not.toBeNull();
      return button!;
    });
    fireEvent.click(choiceButton);
    await waitFor(() => expect(dispatchResolution).toHaveBeenCalledTimes(1));
    expect(dispatchResolution.mock.calls[0]?.[0]).toEqual({
      expectedOccurrenceId: choice.occurrenceId,
      resolution: { kind: "choose", choiceId: "choice.conformance.second" },
    });

    const pause = pausePendingV1(2);
    await publishPending(pause);
    fireEvent.click(
      await waitFor(() => {
        const button = document.querySelector<HTMLButtonElement>(
          '[data-narrative-conformance-resume="true"]',
        );
        expect(button).not.toBeNull();
        return button!;
      }),
    );
    await waitFor(() => expect(dispatchResolution).toHaveBeenCalledTimes(2));
    expect(dispatchResolution.mock.calls[1]?.[0]).toEqual({
      expectedOccurrenceId: pause.occurrenceId,
      resolution: { kind: "resume" },
    });

    const custom = customPendingV1(3);
    await publishPending(custom);
    expect(
      inputRouter.route(Object.freeze({
        kind: "action",
        actionId: parseInputActionIdV1("narrative.custom"),
      })),
    ).toEqual({ kind: "ignored" });
    expect(dispatchResolution).toHaveBeenCalledTimes(2);
    const customForm = await waitFor(() => {
      const form = document.querySelector<HTMLFormElement>(
        '[data-narrative-conformance-custom="surface.conformance.custom"]',
      );
      expect(form).not.toBeNull();
      return form!;
    });
    const customParams = document.querySelector(
      "[data-narrative-conformance-custom-params]",
    );
    expect(customParams).not.toBeNull();
    expect(JSON.parse(customParams!.textContent ?? "")).toEqual({ min: 1, max: 3 });
    const customPayload = customForm.querySelector<HTMLTextAreaElement>(
      "[data-narrative-conformance-custom-payload]",
    );
    expect(customPayload).not.toBeNull();
    fireEvent.change(customPayload!, { target: { value: "not JSON" } });
    fireEvent.submit(customForm);
    expect(dispatchResolution).toHaveBeenCalledTimes(2);
    fireEvent.change(customPayload!, { target: { value: '{"value":2}' } });
    fireEvent.submit(customForm);
    await waitFor(() => expect(dispatchResolution).toHaveBeenCalledTimes(3));
    expect(dispatchResolution.mock.calls[2]?.[0]).toEqual({
      expectedOccurrenceId: custom.occurrenceId,
      resolution: { kind: "custom", payload: { value: 2 } },
    });

    await publishPending(barrierPendingV1(4));
    await waitFor(() => {
      expect(document.querySelector('[data-lab-narrative="presentation_barrier"]'))
        .not.toBeNull();
    });
    expect(document.querySelector("[data-narrative-conformance-confirm]")).toBeNull();
    expect(dispatchResolution).toHaveBeenCalledTimes(3);

    view.unmount();
    rig.dispose();
    expect(source.activeSubscriptions()).toBe(0);
    expect(fixture.profile.activeSubscriptions()).toBe(0);
    expect(fixture.clock.pendingTickCount()).toBe(0);
  });

  it("keeps one logical Host across the same-component StrictMode probe and fences disposed ingress", async () => {
    const source = mutableNarrativeSourceV1(snapshotV1(1, sayPendingV1(1)));
    const fixture = conformanceFixtureV1(source);
    const rig = requireCreatedRigV1(
      createNarrativeConformanceRigV1(fixture.input),
    );
    const inputRouter = createInputRouterV1();

    const first = render(
      <StrictMode>
        <rig.Host inputRouter={inputRouter} />
      </StrictMode>,
    );
    await waitFor(() => {
      expect(document.querySelectorAll(
        '[data-narrative-surface-focus-scope="dialogue"]',
      )).toHaveLength(1);
    });
    expect(document.querySelectorAll("[data-narrative-conformance-portal]"))
      .toHaveLength(1);
    expect(source.activeSubscriptions()).toBe(1);
    expect(fixture.profile.activeSubscriptions()).toBe(1);
    expect(fixture.clock.pendingTickCount()).toBe(1);

    await act(async () => {
      rig.dispose();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(document.querySelector(
        '[data-narrative-surface-focus-scope="dialogue"]',
      )).toBeNull();
    });
    expect(source.activeSubscriptions()).toBe(0);
    expect(fixture.profile.activeSubscriptions()).toBe(0);
    expect(fixture.clock.pendingTickCount()).toBe(0);

    first.rerender(<rig.Host inputRouter={inputRouter} />);
    expect(document.querySelector("[data-narrative-conformance-portal]"))
      .toBeNull();
    first.unmount();
  });

  it("keeps the exact registered router when the same Host receives an unsupported replacement", async () => {
    const source = mutableNarrativeSourceV1(snapshotV1());
    const fixture = conformanceFixtureV1(source);
    const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(fixture.input));
    const firstRouter = createInputRouterV1();
    const replacementRouter = createInputRouterV1();
    const view = render(<rig.Host inputRouter={firstRouter} />);
    await waitFor(() => {
      expect(document.querySelector("[data-narrative-conformance-portal]"))
        .not.toBeNull();
    });

    view.rerender(<rig.Host inputRouter={replacementRouter} />);
    await act(async () => {
      source.publish(snapshotV1(1, sayPendingV1(1)));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(document.querySelectorAll('[data-narrative-surface-focus-scope="dialogue"]'))
        .toHaveLength(1);
    });
    const advanceEvent = Object.freeze({
      kind: "action" as const,
      actionId: systemInputActionIdsV1.narrativeAdvance,
    });
    expect(replacementRouter.route(advanceEvent)).toEqual({ kind: "ignored" });
    expect(firstRouter.route(advanceEvent)).toEqual({
      kind: "handled",
      context: "narrative",
    });

    view.unmount();
    rig.dispose();
    expect(source.activeSubscriptions()).toBe(0);
    expect(fixture.profile.activeSubscriptions()).toBe(0);
    expect(fixture.clock.pendingTickCount()).toBe(0);
  });

  it("admits only one simultaneous outer Host registration and releases that exact owner", async () => {
    const source = mutableNarrativeSourceV1(snapshotV1(1, sayPendingV1(1)));
    const fixture = conformanceFixtureV1(source);
    const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(fixture.input));
    const inputRouter = createInputRouterV1();
    const view = render(
      <Fragment>
        <rig.Host inputRouter={inputRouter} />
        <rig.Host inputRouter={inputRouter} />
      </Fragment>,
    );

    await waitFor(() => {
      expect(document.querySelectorAll("[data-narrative-conformance-portal]"))
        .toHaveLength(2);
      expect(document.querySelectorAll('[data-narrative-surface-focus-scope="dialogue"]'))
        .toHaveLength(1);
    });
    expect(fixture.profile.activeSubscriptions()).toBe(1);
    expect(fixture.clock.pendingTickCount()).toBe(1);

    await act(async () => {
      rig.dispose();
      await Promise.resolve();
    });
    expect(source.activeSubscriptions()).toBe(0);
    expect(fixture.profile.activeSubscriptions()).toBe(0);
    expect(fixture.clock.pendingTickCount()).toBe(0);
    view.unmount();
  });

  it("does not reinterpret a full Host unmount as a StrictMode reattach", async () => {
    const source = mutableNarrativeSourceV1(snapshotV1(1, sayPendingV1(1)));
    const fixture = conformanceFixtureV1(source);
    const rig = requireCreatedRigV1(createNarrativeConformanceRigV1(fixture.input));
    const inputRouter = createInputRouterV1();
    const first = render(<rig.Host inputRouter={inputRouter} />);
    await waitFor(() => {
      expect(document.querySelector('[data-narrative-surface-focus-scope="dialogue"]'))
        .not.toBeNull();
    });
    first.unmount();

    const suppressExpectedReactError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<rig.Host inputRouter={inputRouter} />)).toThrow(
      "ui.narrative_stable_host_lease_conflict",
    );
    suppressExpectedReactError.mockRestore();
    rig.dispose();
    expect(source.activeSubscriptions()).toBe(0);
    expect(fixture.profile.activeSubscriptions()).toBe(0);
    expect(fixture.clock.pendingTickCount()).toBe(0);
  });

  it("keeps retained conformance state bounded through 10,000 source replacements", async () => {
    const source = mutableNarrativeSourceV1(snapshotV1());
    const fixture = conformanceFixtureV1(source);
    const rig = requireCreatedRigV1(
      createNarrativeConformanceRigV1(fixture.input),
    );
    const view = render(<rig.Host inputRouter={createInputRouterV1()} />);

    await act(async () => {
      for (let sequence = 1; sequence <= 10_000; sequence += 1) {
        source.publish(snapshotV1(sequence, sayPendingV1(sequence)));
      }
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(
        document.querySelectorAll(
          "[data-narrative-surface-focus-scope]",
        ).length,
      ).toBeGreaterThan(0);
    });
    expect(source.observeNarrative).toHaveBeenCalledTimes(10_001);
    expect(source.subscribeNarrative).toHaveBeenCalledOnce();
    expect(source.activeSubscriptions()).toBe(1);
    expect(source.historicalListeners).toHaveLength(1);
    expect(fixture.profile.activeSubscriptions()).toBe(1);
    expect(fixture.clock.pendingTickCount()).toBe(1);
    expect(document.querySelectorAll("[data-narrative-surface-focus-scope]").length)
      .toBeLessThanOrEqual(3);

    view.unmount();
    rig.dispose();
    expect(source.activeSubscriptions()).toBe(0);
    expect(fixture.profile.activeSubscriptions()).toBe(0);
    expect(fixture.clock.pendingTickCount()).toBe(0);
  }, 20_000);
});
