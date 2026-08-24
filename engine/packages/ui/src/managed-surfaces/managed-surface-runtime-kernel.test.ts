// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import { parseManagedSurfaceOwnerIdV1 } from "./managed-surface-contracts.ts";
import {
  createManagedSurfaceReducerStateV1,
  type ManagedSurfaceReducerStateV1,
} from "./managed-surface-reducer.ts";
import {
  createManagedSurfaceRuntimeKernelInternalV1,
  type ManagedSurfaceRuntimeKernelInternalV1,
  type ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1,
  type ManagedSurfaceRuntimeStateInstallParticipantInternalV1,
} from "./managed-surface-runtime-kernel.ts";

interface RuntimeStateV1 {
  readonly transientState: ManagedSurfaceReducerStateV1;
  readonly marker: number;
}

type AssignmentPathV1 = "transient" | "state" | "prepared";

interface KernelFixtureV1 {
  readonly kernel: ManagedSurfaceRuntimeKernelInternalV1<RuntimeStateV1>;
  readonly initialState: RuntimeStateV1;
  readonly trace: string[];
}

interface ParticipantCountsV1 {
  prepare: number;
  validate: number;
  commit: number;
  abort: number;
  complete: number;
}

interface PreparedContextV1 {
  readonly previousState: RuntimeStateV1;
  readonly nextState: RuntimeStateV1;
  readonly prepareIndex: number;
}

interface PreparedBehaviorV1 {
  readonly validate?: (context: PreparedContextV1) => unknown;
  readonly commit?: (context: PreparedContextV1) => void;
  readonly abort?: (context: PreparedContextV1) => void;
  readonly complete?: (context: PreparedContextV1) => void;
}

interface ParticipantPrepareContextV1 extends PreparedContextV1 {
  createPrepared(
    behavior?: PreparedBehaviorV1,
  ): ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1;
}

interface ParticipantBundleV1 {
  readonly participant: ManagedSurfaceRuntimeStateInstallParticipantInternalV1<RuntimeStateV1>;
  readonly counts: ParticipantCountsV1;
  resetCounts(): void;
}

const applicationEpochV1 = parseNonNegativeSafeInteger(73);
const ownerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.runtime-participant");
const unknownOwnerIdV1 = parseManagedSurfaceOwnerIdV1(
  "surface-owner.runtime-participant-unknown",
);

function runtimeStateV1(
  transientState: ManagedSurfaceReducerStateV1,
  marker: number,
): RuntimeStateV1 {
  return Object.freeze({ transientState, marker });
}

function createKernelFixtureV1(
  input: Readonly<{ readonly terminalGate?: () => void }> = {},
): KernelFixtureV1 {
  const trace: string[] = [];
  const initialState = runtimeStateV1(
    createManagedSurfaceReducerStateV1(applicationEpochV1, [ownerIdV1], []),
    0,
  );
  const kernel = createManagedSurfaceRuntimeKernelInternalV1<RuntimeStateV1>({
    initialState,
    stateAdapter: Object.freeze({
      getTransientState: (state: RuntimeStateV1) => state.transientState,
      replaceTransientState: (
        state: RuntimeStateV1,
        transientState: ManagedSurfaceReducerStateV1,
      ) => {
        trace.push("adapter:replace");
        return runtimeStateV1(transientState, state.marker);
      },
      prepareTerminalTransientTransition(
        _currentState: RuntimeStateV1,
        reducerSuccessorState: RuntimeStateV1,
      ) {
        return Object.freeze({
          state: reducerSuccessorState,
          commitGate: () => {
            trace.push("operation:terminal-gate");
            input.terminalGate?.();
          },
        });
      },
      validateInstallState() {
        trace.push("adapter:validate");
      },
      finalizeInstallState() {
        trace.push("adapter:finalize");
      },
    }),
  });
  return Object.freeze({ kernel, initialState, trace });
}

function createPreparedV1(
  fixture: KernelFixtureV1,
  counts: ParticipantCountsV1,
  context: PreparedContextV1,
  behavior: PreparedBehaviorV1 = {},
): ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 {
  return {
    validateInternalV1(): boolean {
      counts.validate += 1;
      fixture.trace.push("prepared:validate");
      return (behavior.validate?.(context) ?? true) as boolean;
    },
    commitLogicalInternalV1(): void {
      counts.commit += 1;
      fixture.trace.push("prepared:commit");
      behavior.commit?.(context);
    },
    abortInternalV1(): void {
      counts.abort += 1;
      fixture.trace.push("prepared:abort");
      behavior.abort?.(context);
    },
    completeInstalledInternalV1(): void {
      counts.complete += 1;
      fixture.trace.push("prepared:complete");
      behavior.complete?.(context);
    },
  };
}

function createParticipantV1(
  fixture: KernelFixtureV1,
  input: Readonly<{
    prepare?: (
      context: ParticipantPrepareContextV1,
    ) => ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 | null;
    prepared?: PreparedBehaviorV1;
  }> = {},
): ParticipantBundleV1 {
  const counts: ParticipantCountsV1 = {
    prepare: 0,
    validate: 0,
    commit: 0,
    abort: 0,
    complete: 0,
  };
  const participant: ManagedSurfaceRuntimeStateInstallParticipantInternalV1<RuntimeStateV1> = {
    prepareStateInstallInternalV1(
      previousState: RuntimeStateV1,
      nextState: RuntimeStateV1,
    ): ManagedSurfaceRuntimePreparedStateInstallParticipantInternalV1 | null {
      counts.prepare += 1;
      fixture.trace.push("participant:prepare");
      const context: ParticipantPrepareContextV1 = Object.freeze({
        previousState,
        nextState,
        prepareIndex: counts.prepare,
        createPrepared: (behavior: PreparedBehaviorV1 = input.prepared ?? {}) =>
          createPreparedV1(fixture, counts, context, behavior),
      });
      return input.prepare === undefined ? context.createPrepared() : input.prepare(context);
    },
  };
  return Object.freeze({
    participant,
    counts,
    resetCounts(): void {
      counts.prepare = 0;
      counts.validate = 0;
      counts.commit = 0;
      counts.abort = 0;
      counts.complete = 0;
    },
  });
}

function setParticipantV1(
  fixture: KernelFixtureV1,
  bundle: ParticipantBundleV1,
): void {
  fixture.kernel.setStateInstallParticipantInternalV1(bundle.participant);
}

function executeChangedPathV1(
  path: AssignmentPathV1,
  fixture: KernelFixtureV1,
  input: Readonly<{
    gate?: () => boolean;
    clearPreparedPlanningTrace?: boolean;
  }> = {},
): unknown {
  if (path === "transient") {
    return fixture.kernel.transitionTransientInternalV1(Object.freeze({
      kind: "dispose_owner" as const,
      applicationEpoch: applicationEpochV1,
      ownerId: ownerIdV1,
    }));
  }
  if (path === "state") {
    return fixture.kernel.transitionStateInternalV1((currentState) => {
      fixture.trace.push("operation:plan");
      return Object.freeze({
        state: runtimeStateV1(currentState.transientState, 10),
        result: "state-result" as const,
      });
    });
  }
  const currentState = fixture.kernel.getStateInternalV1();
  const prepared = fixture.kernel.prepareStateInstallInternalV1(
    currentState,
    runtimeStateV1(currentState.transientState, 10),
  );
  if (input.clearPreparedPlanningTrace === true) fixture.trace.length = 0;
  return fixture.kernel.commitPreparedStateInstallInternalV1(
    prepared,
    input.gate ?? (() => {
      fixture.trace.push("operation:gate");
      return true;
    }),
  );
}

function expectChangedPathSuccessV1(path: AssignmentPathV1, result: unknown): void {
  if (path === "transient") {
    expect(result).toMatchObject({
      kind: "applied",
      code: "surface.owner_disposed",
    });
    return;
  }
  expect(result).toBe(path === "state" ? "state-result" : "installed");
}

function expectParticipantFailureV1(
  path: AssignmentPathV1,
  fixture: KernelFixtureV1,
  expectedKind: "stale" | "fault",
): void {
  const run = () => executeChangedPathV1(path, fixture);
  if (path === "state") {
    expect(run).toThrowError(
      expectedKind === "stale"
        ? "ui.managed_surface_runtime_state_stale"
        : "ui.managed_surface_runtime_state_install_participant_faulted",
    );
    return;
  }
  const result = run();
  if (path === "prepared") {
    expect(result).toBe(expectedKind === "stale" ? "stale" : "aborted");
    return;
  }
  expect(result).toEqual({
    kind: expectedKind === "stale" ? "rejected" : "faulted",
    code: expectedKind === "stale" ? "surface.invalid_transition" : "surface.transition_faulted",
    beforeTopologyRevision: 0,
    afterTopologyRevision: 0,
  });
}

describe("managed surface runtime state-install participant", () => {
  it("accepts ordinary unfrozen participant and prepared objects with extra fields", () => {
    const fixture = createKernelFixtureV1();
    const trace: string[] = [];
    const participant = {
      description: "package-internal participant",
      prepareStateInstallInternalV1() {
        trace.push("prepare");
        return {
          description: "package-internal prepared value",
          validateInternalV1() {
            trace.push("validate");
            return true;
          },
          commitLogicalInternalV1() {
            trace.push("commit");
          },
          abortInternalV1() {
            trace.push("abort");
          },
          completeInstalledInternalV1() {
            trace.push("complete");
          },
        };
      },
    };
    fixture.kernel.setStateInstallParticipantInternalV1(participant);

    expect(executeChangedPathV1("state", fixture)).toBe("state-result");
    expect(trace).toEqual(["prepare", "validate", "commit", "complete"]);
  });

  it.each<AssignmentPathV1>(["transient", "state", "prepared"])(
    "keeps %s assignment ordered before notification and physical completion",
    (path) => {
      const fixture = createKernelFixtureV1();
      let capturedPrevious!: RuntimeStateV1;
      let capturedNext!: RuntimeStateV1;
      const bundle = createParticipantV1(fixture, {
        prepare(context) {
          capturedPrevious = context.previousState;
          capturedNext = context.nextState;
          expect(fixture.kernel.getStateInternalV1()).toBe(context.previousState);
          return context.createPrepared({
            validate() {
              expect(fixture.kernel.getStateInternalV1()).toBe(capturedPrevious);
              return true;
            },
            commit() {
              expect(fixture.kernel.getStateInternalV1()).toBe(capturedPrevious);
            },
            complete() {
              expect(fixture.kernel.getStateInternalV1()).toBe(capturedNext);
            },
          });
        },
      });
      setParticipantV1(fixture, bundle);

      fixture.kernel.subscribeTransientInternalV1(() => {
        fixture.trace.push("listener:transient");
        expect(fixture.kernel.getStateInternalV1()).toBe(capturedNext);
      });
      fixture.kernel.subscribeStateInternalV1(() => {
        fixture.trace.push("listener:state");
        expect(fixture.kernel.getStateInternalV1()).toBe(capturedNext);
      });
      const result = executeChangedPathV1(path, fixture, {
        clearPreparedPlanningTrace: path === "prepared",
      });

      expectChangedPathSuccessV1(path, result);
      expect(bundle.counts).toEqual({
        prepare: 1,
        validate: 1,
        commit: 1,
        abort: 0,
        complete: 1,
      });
      expect(fixture.trace).toEqual(
        path === "transient"
          ? [
            "adapter:replace",
            "adapter:validate",
            "participant:prepare",
            "prepared:validate",
            "prepared:commit",
            "adapter:finalize",
            "listener:transient",
            "listener:state",
            "prepared:complete",
          ]
          : path === "state"
          ? [
            "operation:plan",
            "adapter:validate",
            "participant:prepare",
            "prepared:validate",
            "prepared:commit",
            "adapter:finalize",
            "listener:state",
            "prepared:complete",
          ]
          : [
            "participant:prepare",
            "prepared:validate",
            "operation:gate",
            "prepared:commit",
            "adapter:finalize",
            "listener:state",
            "prepared:complete",
          ],
      );
    },
  );

  it("does not read the participant for previous-equals-next across all three paths", () => {
    const fixture = createKernelFixtureV1();
    const bundle = createParticipantV1(fixture);
    setParticipantV1(fixture, bundle);
    const gateTrace: string[] = [];

    expect(fixture.kernel.transitionTransientInternalV1(Object.freeze({
      kind: "dispose_owner" as const,
      applicationEpoch: applicationEpochV1,
      ownerId: unknownOwnerIdV1,
    }))).toMatchObject({ kind: "rejected", code: "surface.unknown_owner" });
    expect(
      fixture.kernel.transitionStateInternalV1((currentState) =>
        Object.freeze({ state: currentState, result: "same" as const })
      ),
    ).toBe("same");
    const currentState = fixture.kernel.getStateInternalV1();
    const token = fixture.kernel.prepareStateInstallInternalV1(currentState, currentState);
    expect(
      fixture.kernel.commitPreparedStateInstallInternalV1(token, () => {
        gateTrace.push("gate");
        return true;
      }),
    ).toBe("installed");

    expect(bundle.counts.prepare).toBe(0);
    expect(gateTrace).toEqual(["gate"]);
  });

  it.each<AssignmentPathV1>(["transient", "state", "prepared"])(
    "treats null prepare as a non-participating %s install",
    (path) => {
      const fixture = createKernelFixtureV1();
      const bundle = createParticipantV1(fixture, { prepare: () => null });
      setParticipantV1(fixture, bundle);

      const result = executeChangedPathV1(path, fixture);

      expectChangedPathSuccessV1(path, result);
      expect(bundle.counts).toEqual({
        prepare: 1,
        validate: 0,
        commit: 0,
        abort: 0,
        complete: 0,
      });
      expect(fixture.kernel.getStateInternalV1()).not.toBe(fixture.initialState);
    },
  );

  it("rejects invalid, foreign, consumed, and initially stale prepared tokens before callback", () => {
    const fixture = createKernelFixtureV1();
    const foreign = createKernelFixtureV1();
    const bundle = createParticipantV1(fixture);
    setParticipantV1(fixture, bundle);
    const initialState = fixture.kernel.getStateInternalV1();
    const nextState = runtimeStateV1(initialState.transientState, 1);
    const token = fixture.kernel.prepareStateInstallInternalV1(initialState, nextState);
    const clone = Object.freeze({ ...token }) as typeof token;

    expect(fixture.kernel.commitPreparedStateInstallInternalV1(clone, () => true)).toBe(
      "invalid",
    );
    expect(foreign.kernel.commitPreparedStateInstallInternalV1(token, () => true)).toBe(
      "invalid",
    );
    expect(bundle.counts.prepare).toBe(0);

    expect(fixture.kernel.commitPreparedStateInstallInternalV1(token, () => true)).toBe(
      "installed",
    );
    bundle.resetCounts();
    expect(fixture.kernel.commitPreparedStateInstallInternalV1(token, () => true)).toBe(
      "invalid",
    );
    expect(bundle.counts.prepare).toBe(0);

    const currentState = fixture.kernel.getStateInternalV1();
    const staleToken = fixture.kernel.prepareStateInstallInternalV1(
      currentState,
      runtimeStateV1(currentState.transientState, 2),
    );
    fixture.kernel.transitionStateInternalV1((state) =>
      Object.freeze({
        state: runtimeStateV1(state.transientState, 3),
        result: undefined,
      })
    );
    bundle.resetCounts();
    expect(
      fixture.kernel.commitPreparedStateInstallInternalV1(staleToken, () => true),
    ).toBe("stale");
    expect(bundle.counts.prepare).toBe(0);
  });

  it("detects prepared-token ABA before participant callback", () => {
    const fixture = createKernelFixtureV1();
    const bundle = createParticipantV1(fixture, { prepare: () => null });
    setParticipantV1(fixture, bundle);
    const originalState = fixture.kernel.getStateInternalV1();
    const token = fixture.kernel.prepareStateInstallInternalV1(
      originalState,
      runtimeStateV1(originalState.transientState, 10),
    );
    fixture.kernel.transitionStateInternalV1((state) =>
      Object.freeze({
        state: runtimeStateV1(state.transientState, 1),
        result: undefined,
      })
    );
    fixture.kernel.transitionStateInternalV1(() =>
      Object.freeze({ state: originalState, result: undefined })
    );
    bundle.resetCounts();

    expect(fixture.kernel.getStateInternalV1()).toBe(originalState);
    expect(fixture.kernel.commitPreparedStateInstallInternalV1(token, () => true)).toBe(
      "stale",
    );
    expect(bundle.counts.prepare).toBe(0);
  });

  it.each<AssignmentPathV1>(["transient", "state", "prepared"])(
    "rejects post-prepare ABA on the %s path and aborts the outer prepared value",
    (path) => {
      const fixture = createKernelFixtureV1();
      const originalState = fixture.kernel.getStateInternalV1();
      let reentering = false;
      const bundle = createParticipantV1(fixture, {
        prepare(context) {
          if (reentering) return null;
          const prepared = context.createPrepared();
          reentering = true;
          try {
            fixture.kernel.transitionStateInternalV1((state) =>
              Object.freeze({
                state: runtimeStateV1(state.transientState, 1),
                result: undefined,
              })
            );
            fixture.kernel.transitionStateInternalV1(() =>
              Object.freeze({ state: context.previousState, result: undefined })
            );
          } finally {
            reentering = false;
          }
          fixture.trace.length = 0;
          return prepared;
        },
      });
      setParticipantV1(fixture, bundle);

      expectParticipantFailureV1(path, fixture, "stale");

      expect(fixture.kernel.getStateInternalV1()).toBe(originalState);
      expect(bundle.counts).toEqual({
        prepare: 3,
        validate: 0,
        commit: 0,
        abort: 1,
        complete: 0,
      });
      expect(fixture.trace).not.toContain("adapter:finalize");
    },
  );

  it.each([
    ["false", "stale" as const],
    ["throw", "fault" as const],
  ])("maps validate %s across all three assignment paths", (variant, expectedKind) => {
    for (const path of ["transient", "state", "prepared"] as const) {
      const fixture = createKernelFixtureV1();
      const bundle = createParticipantV1(fixture, {
        prepared: {
          validate() {
            if (variant === "throw") throw new Error("validate failed");
            return false;
          },
        },
      });
      setParticipantV1(fixture, bundle);

      expectParticipantFailureV1(path, fixture, expectedKind);

      expect(fixture.kernel.getStateInternalV1()).toBe(fixture.initialState);
      expect(bundle.counts).toEqual({
        prepare: 1,
        validate: 1,
        commit: 0,
        abort: 1,
        complete: 0,
      });
      expect(fixture.trace).not.toContain("adapter:finalize");
    }
  });

  it("contains a throwing prepare as a participant fault on all three paths", () => {
    for (const path of ["transient", "state", "prepared"] as const) {
      const fixture = createKernelFixtureV1();
      const bundle = createParticipantV1(fixture, {
        prepare() {
          throw new Error("prepare failed");
        },
      });
      setParticipantV1(fixture, bundle);

      expectParticipantFailureV1(path, fixture, "fault");

      expect(fixture.kernel.getStateInternalV1()).toBe(fixture.initialState);
      expect(bundle.counts).toEqual({
        prepare: 1,
        validate: 0,
        commit: 0,
        abort: 0,
        complete: 0,
      });
      expect(fixture.trace).not.toContain("adapter:finalize");
    }
  });

  it.each<AssignmentPathV1>(["transient", "state", "prepared"])(
    "maps commitLogical throw on the %s path to participant fault with one abort",
    (path) => {
      const fixture = createKernelFixtureV1();
      let notifications = 0;
      const bundle = createParticipantV1(fixture, {
        prepared: {
          commit() {
            throw new Error("logical commit failed");
          },
        },
      });
      setParticipantV1(fixture, bundle);
      fixture.kernel.subscribeTransientInternalV1(() => {
        notifications += 1;
      });
      fixture.kernel.subscribeStateInternalV1(() => {
        notifications += 1;
      });

      expectParticipantFailureV1(path, fixture, "fault");

      expect(fixture.kernel.getStateInternalV1()).toBe(fixture.initialState);
      expect(bundle.counts).toEqual({
        prepare: 1,
        validate: 1,
        commit: 1,
        abort: 1,
        complete: 0,
      });
      expect(notifications).toBe(0);
      expect(fixture.trace).not.toContain("adapter:finalize");
    },
  );

  it.each(["false", "throw"])(
    "aborts an authenticated prepared participant when the install gate returns %s",
    (variant) => {
      const fixture = createKernelFixtureV1();
      const bundle = createParticipantV1(fixture);
      setParticipantV1(fixture, bundle);
      const initialState = fixture.kernel.getStateInternalV1();
      const token = fixture.kernel.prepareStateInstallInternalV1(
        initialState,
        runtimeStateV1(initialState.transientState, 1),
      );
      fixture.trace.length = 0;
      const gateError = new Error("prepared gate failed");
      const commit = () =>
        fixture.kernel.commitPreparedStateInstallInternalV1(token, () => {
          fixture.trace.push("operation:gate");
          if (variant === "throw") throw gateError;
          return false;
        });

      if (variant === "throw") {
        expect(commit).toThrow(gateError);
      } else {
        expect(commit()).toBe("aborted");
      }
      expect(fixture.kernel.getStateInternalV1()).toBe(initialState);
      expect(bundle.counts).toEqual({
        prepare: 1,
        validate: 1,
        commit: 0,
        abort: 1,
        complete: 0,
      });
      expect(fixture.trace).toEqual([
        "participant:prepare",
        "prepared:validate",
        "operation:gate",
        "prepared:abort",
      ]);

      bundle.resetCounts();
      expect(fixture.kernel.commitPreparedStateInstallInternalV1(token, () => true)).toBe(
        "invalid",
      );
      expect(bundle.counts.prepare).toBe(0);
    },
  );

  it("aborts the participant and preserves the original terminal commit-gate error", () => {
    const terminalError = new Error("terminal gate failed");
    const fixture = createKernelFixtureV1({
      terminalGate: () => {
        throw terminalError;
      },
    });
    const bundle = createParticipantV1(fixture);
    setParticipantV1(fixture, bundle);

    expect(() => fixture.kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" }))
      .toThrow(terminalError);

    expect(fixture.kernel.getTransientSnapshotInternalV1().coordinatorDisposed).toBe(false);
    expect(bundle.counts).toEqual({
      prepare: 1,
      validate: 1,
      commit: 0,
      abort: 1,
      complete: 0,
    });
    expect(fixture.trace.slice(-3)).toEqual([
      "prepared:validate",
      "operation:terminal-gate",
      "prepared:abort",
    ]);
  });

  it("completes a listener-installed successor before the stale predecessor completion", () => {
    const fixture = createKernelFixtureV1();
    const bundle = createParticipantV1(fixture, {
      prepared: {
        complete(context) {
          fixture.trace.push(
            `completion:${context.nextState.marker}:at:${fixture.kernel.getStateInternalV1().marker}`,
          );
        },
      },
    });
    setParticipantV1(fixture, bundle);
    fixture.kernel.subscribeStateInternalV1(() => {
      const marker = fixture.kernel.getStateInternalV1().marker;
      fixture.trace.push(`listener:${marker}`);
      if (marker !== 1) return;
      fixture.kernel.transitionStateInternalV1((currentState) =>
        Object.freeze({
          state: runtimeStateV1(currentState.transientState, 2),
          result: undefined,
        })
      );
    });

    expect(
      fixture.kernel.transitionStateInternalV1((currentState) =>
        Object.freeze({
          state: runtimeStateV1(currentState.transientState, 1),
          result: "outer" as const,
        })
      ),
    ).toBe("outer");

    expect(fixture.kernel.getStateInternalV1().marker).toBe(2);
    expect(bundle.counts).toEqual({
      prepare: 2,
      validate: 2,
      commit: 2,
      abort: 0,
      complete: 2,
    });
    const successorCompletion = fixture.trace.indexOf("completion:2:at:2");
    const predecessorCompletion = fixture.trace.indexOf("completion:1:at:2");
    expect(successorCompletion).toBeGreaterThan(fixture.trace.indexOf("listener:2"));
    expect(predecessorCompletion).toBeGreaterThan(successorCompletion);
  });

  it("contains completeInstalled failure after the committed result and notification", () => {
    const fixture = createKernelFixtureV1();
    const bundle = createParticipantV1(fixture, {
      prepared: {
        complete() {
          throw new Error("physical completion failed");
        },
      },
    });
    setParticipantV1(fixture, bundle);
    const listenerTrace: number[] = [];
    fixture.kernel.subscribeStateInternalV1(() => {
      listenerTrace.push(fixture.kernel.getStateInternalV1().marker);
    });

    expect(executeChangedPathV1("state", fixture)).toBe("state-result");
    expect(fixture.kernel.getStateInternalV1().marker).toBe(10);
    expect(listenerTrace).toEqual([10]);
    expect(bundle.counts).toEqual({
      prepare: 1,
      validate: 1,
      commit: 1,
      abort: 0,
      complete: 1,
    });
  });

  it("fences the participant before terminal listeners and never replays completion", () => {
    const fixture = createKernelFixtureV1();
    const bundle = createParticipantV1(fixture);
    setParticipantV1(fixture, bundle);
    const listenerTrace: string[] = [];
    let participantFencedDuringListener = false;
    fixture.kernel.subscribeTransientInternalV1(() => {
      listenerTrace.push("transient");
      fixture.trace.push("listener:transient");
    });
    fixture.kernel.subscribeStateInternalV1(() => {
      listenerTrace.push("state");
      fixture.trace.push("listener:state");
      try {
        fixture.kernel.setStateInstallParticipantInternalV1(bundle.participant);
      } catch (error) {
        participantFencedDuringListener = error instanceof TypeError &&
          error.message === "ui.managed_surface_runtime_state_install_participant_invalid";
      }
    });

    expect(fixture.kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" }))
      .toEqual({
        kind: "applied",
        code: "surface.coordinator_disposed",
        beforeTopologyRevision: 0,
        afterTopologyRevision: 1,
      });
    expect(listenerTrace).toEqual(["transient", "state"]);
    expect(participantFencedDuringListener).toBe(true);
    expect(bundle.counts).toEqual({
      prepare: 1,
      validate: 1,
      commit: 1,
      abort: 0,
      complete: 1,
    });
    expect(fixture.trace.indexOf("prepared:complete")).toBeGreaterThan(
      fixture.trace.indexOf("listener:state"),
    );
    expect(() => fixture.kernel.setStateInstallParticipantInternalV1(bundle.participant))
      .toThrowError("ui.managed_surface_runtime_state_install_participant_invalid");

    bundle.resetCounts();
    listenerTrace.length = 0;
    expect(fixture.kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" }))
      .toMatchObject({
        kind: "unchanged",
        code: "surface.coordinator_already_disposed",
      });
    expect(bundle.counts.prepare).toBe(0);
    expect(listenerTrace).toEqual([]);
  });

  it.each(["null", "throw"])(
    "gives currentness stale precedence when prepare reentry is followed by %s",
    (variant) => {
      for (const path of ["transient", "state", "prepared"] as const) {
        const fixture = createKernelFixtureV1();
        let reentering = false;
        const bundle = createParticipantV1(fixture, {
          prepare() {
            if (reentering) return null;
            reentering = true;
            try {
              fixture.kernel.transitionStateInternalV1((currentState) =>
                Object.freeze({
                  state: runtimeStateV1(currentState.transientState, 1),
                  result: undefined,
                })
              );
            } finally {
              reentering = false;
            }
            if (variant === "null") return null;
            throw new Error("late prepare failure");
          },
        });
        setParticipantV1(fixture, bundle);

        expectParticipantFailureV1(path, fixture, "stale");

        expect(fixture.kernel.getStateInternalV1().marker).toBe(1);
        expect(bundle.counts).toEqual({
          prepare: 2,
          validate: 0,
          commit: 0,
          abort: 0,
          complete: 0,
        });
      }
    },
  );

  it("keeps 10,000 sequential participant installs bounded to one active prepared value", () => {
    const fixture = createKernelFixtureV1();
    let activePrepared = 0;
    let maximumActivePrepared = 0;
    let overlapDetected = false;
    const bundle = createParticipantV1(fixture, {
      prepare(context) {
        if (activePrepared !== 0) overlapDetected = true;
        activePrepared += 1;
        maximumActivePrepared = Math.max(maximumActivePrepared, activePrepared);
        return context.createPrepared({
          abort() {
            activePrepared -= 1;
          },
          complete() {
            activePrepared -= 1;
          },
        });
      },
    });
    setParticipantV1(fixture, bundle);
    for (let index = 0; index < 10_000; index += 1) {
      fixture.kernel.transitionStateInternalV1((currentState) =>
        Object.freeze({
          state: runtimeStateV1(currentState.transientState, index + 1),
          result: undefined,
        })
      );
      fixture.trace.length = 0;
    }

    expect(fixture.kernel.getStateInternalV1().marker).toBe(10_000);
    expect(activePrepared).toBe(0);
    expect(maximumActivePrepared).toBe(1);
    expect(overlapDetected).toBe(false);
    expect(bundle.counts).toEqual({
      prepare: 10_000,
      validate: 10_000,
      commit: 10_000,
      abort: 0,
      complete: 10_000,
    });
  });
});
