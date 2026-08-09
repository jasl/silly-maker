// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import {
  type ManagedSurfaceOperationV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  type ManagedSurfaceTransitionReceiptV1,
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
} from "./managed-surface-contracts.ts";
import { parseManagedSurfaceResolvedDefinitionV1 } from "./managed-surface-definition.ts";
import {
  createManagedSurfaceRuntimeAttemptIdentityInternalV1,
  createManagedSurfaceTransientIdentityV1,
} from "./managed-surface-identity.ts";
import {
  createManagedSurfaceReducerStateV1,
  type ManagedSurfaceReducerStateV1,
  reduceManagedSurfaceV1,
} from "./managed-surface-reducer.ts";
import {
  createManagedSurfaceCoordinatorRuntimeBundleInternalV1,
} from "./managed-surface-coordinator.ts";
import {
  createManagedSurfaceRuntimeAuthorityBundleInternalV1,
  createManagedSurfaceRuntimeAuthorityInternalV1,
} from "./managed-surface-runtime-authority.ts";
import { createManagedSurfaceRuntimeKernelInternalV1 } from "./managed-surface-runtime-kernel.ts";

const applicationEpochV1 = parseNonNegativeSafeInteger(17);
const ownerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.workspace");
const foreignOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.foreign");
const definitionIdV1 = parseManagedSurfaceDefinitionIdV1("surface.primary");
const resolvedSlotDescriptorsV1 = Object.freeze(
  ["primary", "other", "third"].map((slot) =>
    Object.freeze({
      kind: "root" as const,
      slotId: parseManagedSurfaceSlotIdV1(`surface-slot.${slot}`),
      cardinality: "single" as const,
    })
  ) satisfies readonly ManagedSurfaceResolvedSlotDescriptorV1[],
);

function definitionV1(
  overrides: Partial<ManagedSurfaceResolvedDefinitionV1> = {},
): ManagedSurfaceResolvedDefinitionV1 {
  return {
    definitionId: definitionIdV1,
    contractRevision: parsePositiveSafeInteger(1),
    ownerId: ownerIdV1,
    slotId: parseManagedSurfaceSlotIdV1("surface-slot.primary"),
    layerId: parseManagedSurfaceLayerIdV1("surface-layer.workspace"),
    layerOrder: parseNonNegativeSafeInteger(20),
    placement: "root",
    modality: "non_blocking",
    inputPolicy: { kind: "managed", inputContextId: "overlay" },
    dismissPolicy: {
      back: true,
      escape: true,
      backdrop: true,
      routedCancel: true,
    },
    focusPolicy: {
      kind: "owns_focus",
      initialTargetId: parseManagedSurfaceFocusTargetIdV1("focus-target.primary"),
      trap: true,
      restore: "opener",
    },
    navigationPolicy: { kind: "close" },
    actionIds: [parseManagedSurfaceActionIdV1("surface-action.activate")],
    readiness: {
      initialOpen: "blocking_fallback",
      primaryReplacement: "retain_current",
      childOpen: "blocking_fallback",
    },
    ...overrides,
  };
}

function createBundleV1(
  overrides: Partial<
    Parameters<typeof createManagedSurfaceCoordinatorRuntimeBundleInternalV1>[0]
  > = {},
) {
  return createManagedSurfaceCoordinatorRuntimeBundleInternalV1({
    applicationEpoch: applicationEpochV1,
    resolvedOwnerIds: Object.freeze([ownerIdV1]),
    resolvedSlotDescriptors: resolvedSlotDescriptorsV1,
    ...overrides,
  });
}

function publicationRevisionV1(
  authority: ReturnType<
    typeof createManagedSurfaceCoordinatorRuntimeBundleInternalV1
  >["authority"],
): number {
  return authority.getTransientPublicationInternalV1().publicationRevision;
}

function stateWithHighWaterV1(
  state: ManagedSurfaceReducerStateV1,
  identitySequenceHighWater: number,
): ManagedSurfaceReducerStateV1 {
  return Object.freeze({
    ...state,
    identitySequenceHighWater: parseNonNegativeSafeInteger(identitySequenceHighWater),
  });
}

interface WrappedRuntimeStateV1 {
  readonly transientState: ManagedSurfaceReducerStateV1;
  readonly marker: string;
}

function wrappedRuntimeStateV1(
  transientState: ManagedSurfaceReducerStateV1,
  marker: string,
): WrappedRuntimeStateV1 {
  return Object.freeze({ transientState, marker });
}

describe("managed surface runtime authority", () => {
  it("derives runtime-attempt identity without changing the existing transient identity shape", () => {
    const epoch = parseNonNegativeSafeInteger(21);
    const sequence = parsePositiveSafeInteger(4);
    const attempt = createManagedSurfaceRuntimeAttemptIdentityInternalV1(epoch, sequence);

    expect(attempt).toEqual({
      allocation: {
        applicationEpoch: 21,
        sequence: 4,
      },
      surfaceInstanceId: "surface-instance.e21.n4",
      routingLeaseId: "surface-lease.e21.n4",
    });
    expect(Object.keys(attempt)).toEqual([
      "allocation",
      "surfaceInstanceId",
      "routingLeaseId",
    ]);
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(Object.isFrozen(attempt.allocation)).toBe(true);

    const transient = createManagedSurfaceTransientIdentityV1(epoch, sequence);
    expect(transient).toEqual({
      allocation: attempt.allocation,
      occurrenceId: "surface-occurrence.e21.n4",
      surfaceInstanceId: attempt.surfaceInstanceId,
      routingLeaseId: attempt.routingLeaseId,
    });
    expect(Object.keys(transient)).toEqual([
      "allocation",
      "occurrenceId",
      "surfaceInstanceId",
      "routingLeaseId",
    ]);
  });

  it("exposes the exact installed state and transient projection through one shared authority", () => {
    const { authority, coordinator } = createBundleV1();
    const listener = vi.fn();
    authority.subscribeInternalV1(listener);

    const initialState = authority.observeStateInternalV1();
    const initialPublication = authority.getTransientPublicationInternalV1();
    expect(authority.observeStateInternalV1()).toBe(initialState);
    expect(initialState.publication).toBe(initialPublication);
    expect(coordinator.getSnapshot()).toBe(initialPublication);
    expect(initialState.identitySequenceHighWater).toBe(0);
    expect(Object.isFrozen(initialState)).toBe(true);
    expect(Object.isFrozen(initialPublication)).toBe(true);

    expect(
      coordinator.openTransientPrimary({
        definition: definitionV1({ ownerId: foreignOwnerIdV1 }),
        semanticOccurrenceId: null,
      }),
    ).toEqual({
      receipt: {
        kind: "rejected",
        code: "surface.unknown_owner",
        beforeTopologyRevision: 0,
        afterTopologyRevision: 0,
      },
      handle: null,
      readiness: null,
    });
    expect(authority.observeStateInternalV1()).toBe(initialState);
    expect(authority.getTransientPublicationInternalV1()).toBe(initialPublication);
    expect(listener).not.toHaveBeenCalled();

    const opened = coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: "semantic.primary",
    });
    expect(opened.receipt).toEqual({
      kind: "applied",
      code: "surface.preparation_started",
      beforeTopologyRevision: 0,
      afterTopologyRevision: 1,
      surfaceInstanceId: "surface-instance.e17.n1",
    });

    const successorState = authority.observeStateInternalV1();
    const successorPublication = authority.getTransientPublicationInternalV1();
    expect(successorState).not.toBe(initialState);
    expect(successorPublication).not.toBe(initialPublication);
    expect(successorState.publication).toBe(successorPublication);
    expect(coordinator.getSnapshot()).toBe(successorPublication);
    expect(successorState.identitySequenceHighWater).toBe(1);
    expect(successorPublication).toMatchObject({
      applicationEpoch: 17,
      publicationRevision: 1,
      topologyRevision: 1,
      orderedInstances: [
        {
          surfaceInstanceId: "surface-instance.e17.n1",
          routingLeaseId: "surface-lease.e17.n1",
          semanticOccurrenceId: "semantic.primary",
          target: {
            kind: "transient",
            occurrenceId: "surface-occurrence.e17.n1",
          },
        },
      ],
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps synchronous nested notification order and the outer captured listener vector", () => {
    const { authority, coordinator } = createBundleV1();
    const calls: string[] = [];

    authority.subscribeInternalV1(() => {
      const revision = publicationRevisionV1(authority);
      calls.push(`a:${revision}`);
      if (revision === 1) coordinator.closeTop();
    });
    authority.subscribeInternalV1(() => {
      calls.push(`b:${publicationRevisionV1(authority)}`);
    });

    coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });

    expect(calls).toEqual(["a:1", "a:2", "b:2", "b:2"]);
    expect(authority.getTransientPublicationInternalV1()).toMatchObject({
      publicationRevision: 2,
      topologyRevision: 2,
      orderedInstances: [],
    });
  });

  it("applies listener removal only to later captured vectors", () => {
    const { authority, coordinator } = createBundleV1();
    const calls: string[] = [];
    let unsubscribeB = (): void => {};

    authority.subscribeInternalV1(() => {
      const revision = publicationRevisionV1(authority);
      calls.push(`a:${revision}`);
      if (revision === 1) {
        unsubscribeB();
        coordinator.closeTop();
      }
    });
    unsubscribeB = authority.subscribeInternalV1(() => {
      calls.push(`b:${publicationRevisionV1(authority)}`);
    });

    coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });

    expect(calls).toEqual(["a:1", "a:2", "b:2"]);
  });

  it("applies listener addition to nested and later vectors but not the active outer vector", () => {
    const { authority, coordinator } = createBundleV1();
    const calls: string[] = [];

    authority.subscribeInternalV1(() => {
      const revision = publicationRevisionV1(authority);
      calls.push(`a:${revision}`);
      if (revision === 1) {
        authority.subscribeInternalV1(() => {
          calls.push(`c:${publicationRevisionV1(authority)}`);
        });
        coordinator.closeTop();
      }
    });
    authority.subscribeInternalV1(() => {
      calls.push(`b:${publicationRevisionV1(authority)}`);
    });

    coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });

    expect(calls).toEqual(["a:1", "a:2", "b:2", "c:2", "b:2"]);
  });

  it("contains listener and diagnostic failures while allowing diagnostic reentry", () => {
    const calls: string[] = [];
    let coordinator: ReturnType<typeof createBundleV1>["coordinator"];
    const bundle = createBundleV1({
      reportSubscriberFailure(failure) {
        const revision = publicationRevisionV1(bundle.authority);
        calls.push(`diagnostic:${revision}`);
        expect(failure).toEqual({
          code: "surface.subscriber_failed",
          summary: "Managed Surface publication subscriber failed.",
          details: { applicationEpoch: 17 },
        });
        expect(Object.isFrozen(failure)).toBe(true);
        expect(Object.isFrozen(failure.details)).toBe(true);
        if (revision === 1) coordinator.closeTop();
        throw new Error("diagnostic failure");
      },
    });
    coordinator = bundle.coordinator;

    bundle.authority.subscribeInternalV1(() => {
      calls.push(`a:${publicationRevisionV1(bundle.authority)}`);
      throw new Error("listener failure");
    });
    bundle.authority.subscribeInternalV1(() => {
      calls.push(`b:${publicationRevisionV1(bundle.authority)}`);
    });

    expect(() =>
      coordinator.openTransientPrimary({
        definition: definitionV1(),
        semanticOccurrenceId: null,
      })
    ).not.toThrow();
    expect(calls).toEqual([
      "a:1",
      "diagnostic:1",
      "a:2",
      "diagnostic:2",
      "b:2",
      "b:2",
    ]);
  });

  it("installs nested disposal before notification and clears only future listener vectors", () => {
    const { authority, coordinator } = createBundleV1();
    const calls: string[] = [];

    authority.subscribeInternalV1(() => {
      const revision = publicationRevisionV1(authority);
      calls.push(`a:${revision}`);
      if (revision === 1) coordinator.dispose();
    });
    authority.subscribeInternalV1(() => {
      calls.push(`b:${publicationRevisionV1(authority)}`);
    });

    coordinator.openTransientPrimary({
      definition: definitionV1(),
      semanticOccurrenceId: null,
    });

    expect(calls).toEqual(["a:1", "a:2", "b:2", "b:2"]);
    expect(authority.getTransientPublicationInternalV1()).toMatchObject({
      publicationRevision: 2,
      topologyRevision: 2,
      orderedInstances: [],
      coordinatorDisposed: true,
    });
    expect(coordinator.dispose()).toEqual({
      kind: "unchanged",
      code: "surface.coordinator_already_disposed",
      beforeTopologyRevision: 2,
      afterTopologyRevision: 2,
    });
    expect(() => authority.subscribeInternalV1(() => {})).toThrowError(
      "ui.managed_surface_coordinator_disposed",
    );
    expect(calls).toEqual(["a:1", "a:2", "b:2", "b:2"]);
  });

  it("peeks the next transient attempt without burning the shared identity cursor", () => {
    const { authority, coordinator } = createBundleV1();
    const resolvedDefinition = parseManagedSurfaceResolvedDefinitionV1(definitionV1());
    const request = Object.freeze({
      definition: resolvedDefinition,
      semanticOccurrenceId: "semantic.peek",
    });
    const initialState = authority.observeStateInternalV1();

    const first = authority.peekTransientCandidateInternalV1(request);
    const second = authority.peekTransientCandidateInternalV1(request);
    expect(first).toEqual({
      identityAllocation: {
        applicationEpoch: 17,
        sequence: 1,
      },
      definition: resolvedDefinition,
      target: {
        kind: "transient",
        occurrenceId: "surface-occurrence.e17.n1",
      },
      surfaceInstanceId: "surface-instance.e17.n1",
      routingLeaseId: "surface-lease.e17.n1",
      semanticOccurrenceId: "semantic.peek",
    });
    expect(second).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.identityAllocation)).toBe(true);
    expect(Object.isFrozen(first.target)).toBe(true);
    expect(authority.observeStateInternalV1()).toBe(initialState);

    expect(
      coordinator.openTransientPrimary({
        definition: definitionV1({ ownerId: foreignOwnerIdV1 }),
        semanticOccurrenceId: null,
      }).receipt,
    ).toMatchObject({ kind: "rejected", code: "surface.unknown_owner" });
    expect(authority.observeStateInternalV1()).toBe(initialState);
    expect(authority.peekTransientCandidateInternalV1(request)).toEqual(first);

    const opened = coordinator.openTransientPrimary(request);
    expect(opened.receipt).toMatchObject({
      kind: "applied",
      surfaceInstanceId: "surface-instance.e17.n1",
    });
    expect(authority.observeStateInternalV1().identitySequenceHighWater).toBe(1);
    expect(opened.readiness).not.toBeNull();
    expect(opened.readiness!.fail()).toMatchObject({
      kind: "applied",
      code: "surface.readiness_failed",
    });

    expect(authority.peekTransientCandidateInternalV1(request)).toMatchObject({
      identityAllocation: { applicationEpoch: 17, sequence: 2 },
      target: { occurrenceId: "surface-occurrence.e17.n2" },
      surfaceInstanceId: "surface-instance.e17.n2",
      routingLeaseId: "surface-lease.e17.n2",
    });
    expect(authority.observeStateInternalV1().identitySequenceHighWater).toBe(1);
  });

  it("fails identity exhaustion without state, listener, or partial candidate mutation", () => {
    const initial = createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      Object.freeze([ownerIdV1]),
      resolvedSlotDescriptorsV1,
    );
    const exhaustedState = Object.freeze({
      ...initial,
      identitySequenceHighWater: parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER),
    }) satisfies ManagedSurfaceReducerStateV1;
    const authority = createManagedSurfaceRuntimeAuthorityInternalV1({
      initialState: exhaustedState,
    });
    const listener = vi.fn();
    authority.subscribeInternalV1(listener);
    const request = Object.freeze({
      definition: parseManagedSurfaceResolvedDefinitionV1(definitionV1()),
      semanticOccurrenceId: null,
    });

    expect(() => authority.peekTransientCandidateInternalV1(request)).toThrowError(
      "ui.managed_surface_id_sequence_exhausted",
    );
    expect(authority.observeStateInternalV1()).toBe(exhaustedState);
    expect(authority.getTransientPublicationInternalV1()).toBe(exhaustedState.publication);
    expect(listener).not.toHaveBeenCalled();
  });

  it("re-reads the shared cursor after definition Proxy reentry before allocating", () => {
    const { authority, coordinator } = createBundleV1();
    const innerDefinition = definitionV1();
    const outerTarget = definitionV1({
      slotId: parseManagedSurfaceSlotIdV1("surface-slot.other"),
    });
    let reentered = false;
    const outerDefinition = new Proxy(outerTarget, {
      getPrototypeOf(target) {
        if (!reentered) {
          reentered = true;
          const inner = coordinator.openTransientPrimary({
            definition: innerDefinition,
            semanticOccurrenceId: "semantic.inner",
          });
          expect(inner.receipt).toMatchObject({
            kind: "applied",
            surfaceInstanceId: "surface-instance.e17.n1",
          });
        }
        return Reflect.getPrototypeOf(target);
      },
    });

    const outer = coordinator.openTransientPrimary({
      definition: outerDefinition,
      semanticOccurrenceId: "semantic.outer",
    });

    expect(reentered).toBe(true);
    expect(outer.receipt).toMatchObject({
      kind: "applied",
      surfaceInstanceId: "surface-instance.e17.n2",
    });
    expect(authority.observeStateInternalV1().identitySequenceHighWater).toBe(2);
    expect(
      authority.getTransientPublicationInternalV1().orderedInstances.map((instance) =>
        instance.surfaceInstanceId
      ),
    ).toEqual(["surface-instance.e17.n1", "surface-instance.e17.n2"]);
  });

  it("fences planner reentry without blocking synchronous listener reentry", () => {
    const initialState = createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      Object.freeze([ownerIdV1]),
      resolvedSlotDescriptorsV1,
    );
    const runtime = createManagedSurfaceRuntimeAuthorityBundleInternalV1({ initialState });
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    runtime.kernel.subscribeStateInternalV1(stateListener);
    runtime.kernel.subscribeTransientInternalV1(transientListener);

    expect(
      runtime.kernel.transitionStateInternalV1((current) => {
        expect(() =>
          runtime.kernel.transitionStateInternalV1((nested) => ({
            state: stateWithHighWaterV1(nested, 2),
            result: undefined,
          }))
        ).toThrowError("ui.managed_surface_runtime_transition_in_progress");
        expect(() => runtime.kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" }))
          .toThrowError("ui.managed_surface_runtime_transition_in_progress");
        expect(() =>
          runtime.kernel.prepareStateInstallInternalV1(
            current,
            stateWithHighWaterV1(current, 2),
          )
        ).toThrowError("ui.managed_surface_runtime_transition_in_progress");
        return Object.freeze({
          state: stateWithHighWaterV1(current, 1),
          result: "outer",
        });
      }),
    ).toBe("outer");
    expect(runtime.kernel.getStateInternalV1().identitySequenceHighWater).toBe(1);
    expect(runtime.kernel.getTransientSnapshotInternalV1().coordinatorDisposed).toBe(false);
    expect(stateListener).toHaveBeenCalledOnce();
    expect(transientListener).not.toHaveBeenCalled();

    const beforeFailure = runtime.kernel.getStateInternalV1();
    expect(() =>
      runtime.kernel.transitionStateInternalV1(() => {
        runtime.kernel.transitionStateInternalV1((nested) => ({
          state: stateWithHighWaterV1(nested, 3),
          result: undefined,
        }));
        return Object.freeze({
          state: stateWithHighWaterV1(beforeFailure, 4),
          result: undefined,
        });
      })
    ).toThrowError("ui.managed_surface_runtime_transition_in_progress");
    expect(runtime.kernel.getStateInternalV1()).toBe(beforeFailure);
    expect(stateListener).toHaveBeenCalledOnce();

    const nestedCalls: string[] = [];
    runtime.kernel.subscribeStateInternalV1(() => {
      const highWater = runtime.kernel.getStateInternalV1().identitySequenceHighWater;
      nestedCalls.push(`a:${highWater}`);
      if (highWater === 5) {
        runtime.kernel.transitionStateInternalV1((current) => ({
          state: stateWithHighWaterV1(current, 6),
          result: undefined,
        }));
      }
    });
    runtime.kernel.subscribeStateInternalV1(() => {
      nestedCalls.push(`b:${runtime.kernel.getStateInternalV1().identitySequenceHighWater}`);
    });
    runtime.kernel.transitionStateInternalV1((current) => ({
      state: stateWithHighWaterV1(current, 5),
      result: undefined,
    }));
    expect(nestedCalls).toEqual(["a:5", "a:6", "b:6", "b:6"]);
    expect(runtime.kernel.getStateInternalV1().identitySequenceHighWater).toBe(6);
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("keeps the exact reducer state and receipt when no transient or terminal preparer is present", () => {
    const initialTransientState = createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      Object.freeze([ownerIdV1]),
      resolvedSlotDescriptorsV1,
    );
    const initialState = wrappedRuntimeStateV1(initialTransientState, "initial");
    const operation = Object.freeze({ kind: "dispose_coordinator" as const });
    const expected = reduceManagedSurfaceV1(initialTransientState, operation);
    const kernel = createManagedSurfaceRuntimeKernelInternalV1<WrappedRuntimeStateV1>({
      initialState,
      stateAdapter: Object.freeze({
        getTransientState: (state: WrappedRuntimeStateV1) => state.transientState,
        replaceTransientState: (
          state: WrappedRuntimeStateV1,
          transientState: ManagedSurfaceReducerStateV1,
        ) => wrappedRuntimeStateV1(transientState, state.marker),
      }),
    });

    expect(kernel.transitionTransientInternalV1(operation)).toEqual(expected.receipt);
    expect(kernel.getStateInternalV1()).not.toBe(initialState);
    expect(kernel.getStateInternalV1()).toEqual({
      transientState: expected.state,
      marker: "initial",
    });
    expect(kernel.getTransientStateInternalV1()).toEqual(expected.state);
  });

  it("captures one exact-receiver transient finalizer and installs its combined successor", () => {
    type WrappedKernelV1 = ReturnType<
      typeof createManagedSurfaceRuntimeKernelInternalV1<WrappedRuntimeStateV1>
    >;
    const initialTransientState = createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      Object.freeze([ownerIdV1]),
      resolvedSlotDescriptorsV1,
    );
    const initialState = wrappedRuntimeStateV1(initialTransientState, "initial");
    const trace: string[] = [];
    let captureCount = 0;
    let callbackCount = 0;
    let kernel!: WrappedKernelV1;
    let expectedOperation!: ManagedSurfaceOperationV1;
    let combinedState: WrappedRuntimeStateV1 | null = null;

    const finalizer = function (
      this: unknown,
      currentState: WrappedRuntimeStateV1,
      reducerSuccessorState: WrappedRuntimeStateV1,
      operation: ManagedSurfaceOperationV1,
      reducerReceipt: ManagedSurfaceTransitionReceiptV1,
    ) {
      callbackCount += 1;
      expect(this).toBe(stateAdapter);
      expect(currentState).toBe(initialState);
      expect(reducerSuccessorState).not.toBe(currentState);
      expect(reducerSuccessorState.marker).toBe("reducer");
      expect(operation).toBe(expectedOperation);
      expect(reducerReceipt).toMatchObject({
        kind: "applied",
        code: "surface.preparation_started",
        surfaceInstanceId: "surface-instance.e17.n1",
      });
      expect(() => kernel.transitionStateInternalV1((state) => ({ state, result: undefined })))
        .toThrowError("ui.managed_surface_runtime_transition_in_progress");
      expect(() => kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" }))
        .toThrowError("ui.managed_surface_runtime_transition_in_progress");
      combinedState = wrappedRuntimeStateV1(
        reducerSuccessorState.transientState,
        "combined",
      );
      trace.push(`finalizer:${operation.kind}:${reducerReceipt.code}`);
      return Object.freeze({ state: combinedState, receipt: reducerReceipt });
    };
    const stateAdapter = Object.freeze({
      getTransientState: (state: WrappedRuntimeStateV1) => state.transientState,
      replaceTransientState: (
        _state: WrappedRuntimeStateV1,
        transientState: ManagedSurfaceReducerStateV1,
      ) => wrappedRuntimeStateV1(transientState, "reducer"),
      get finalizeTransientTransition() {
        captureCount += 1;
        return finalizer;
      },
    });
    kernel = createManagedSurfaceRuntimeKernelInternalV1<WrappedRuntimeStateV1>({
      initialState,
      stateAdapter,
    });
    expect(captureCount).toBe(1);

    kernel.subscribeTransientInternalV1(() => {
      const current = kernel.getStateInternalV1();
      trace.push(`transient:${current.marker}`);
      expect(current).toBe(combinedState);
      kernel.transitionStateInternalV1((state) => ({
        state: wrappedRuntimeStateV1(state.transientState, "nested"),
        result: undefined,
      }));
    });
    kernel.subscribeStateInternalV1(() => {
      trace.push(`state:${kernel.getStateInternalV1().marker}`);
    });

    const candidate = kernel.peekTransientCandidateInternalV1({
      definition: parseManagedSurfaceResolvedDefinitionV1(definitionV1()),
      semanticOccurrenceId: "semantic.combined",
    });
    expectedOperation = Object.freeze({
      kind: "prepare_initial",
      applicationEpoch: applicationEpochV1,
      candidate,
    });
    const receipt = kernel.transitionTransientInternalV1(expectedOperation);

    expect(receipt).toMatchObject({
      kind: "applied",
      code: "surface.preparation_started",
      surfaceInstanceId: "surface-instance.e17.n1",
    });
    expect(callbackCount).toBe(1);
    expect(captureCount).toBe(1);
    expect(kernel.getStateInternalV1().marker).toBe("nested");
    expect(trace).toEqual([
      "finalizer:prepare_initial:surface.preparation_started",
      "transient:combined",
      "state:nested",
      "state:nested",
    ]);
  });

  it("can atomically replace a transient successor with the old state and an existing fault receipt", () => {
    type WrappedKernelV1 = ReturnType<
      typeof createManagedSurfaceRuntimeKernelInternalV1<WrappedRuntimeStateV1>
    >;
    const initialTransientState = createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      Object.freeze([ownerIdV1]),
      resolvedSlotDescriptorsV1,
    );
    const initialState = wrappedRuntimeStateV1(initialTransientState, "initial");
    let kernel!: WrappedKernelV1;
    const stateAdapter = Object.freeze({
      getTransientState: (state: WrappedRuntimeStateV1) => state.transientState,
      replaceTransientState: (
        _state: WrappedRuntimeStateV1,
        transientState: ManagedSurfaceReducerStateV1,
      ) => wrappedRuntimeStateV1(transientState, "reducer"),
      finalizeTransientTransition(
        currentState: WrappedRuntimeStateV1,
        reducerSuccessorState: WrappedRuntimeStateV1,
        operation: ManagedSurfaceOperationV1,
        reducerReceipt: ManagedSurfaceTransitionReceiptV1,
      ) {
        expect(reducerSuccessorState).not.toBe(currentState);
        expect(operation.kind).toBe("prepare_initial");
        expect(reducerReceipt).toMatchObject({
          kind: "applied",
          code: "surface.preparation_started",
          surfaceInstanceId: "surface-instance.e17.n1",
        });
        expect(() => kernel.prepareStateInstallInternalV1(currentState, reducerSuccessorState))
          .toThrowError("ui.managed_surface_runtime_transition_in_progress");
        return Object.freeze({
          state: currentState,
          receipt: Object.freeze({
            kind: "faulted" as const,
            code: "surface.transition_faulted" as const,
            beforeTopologyRevision: currentState.transientState.publication.topologyRevision,
            afterTopologyRevision: currentState.transientState.publication.topologyRevision,
          }),
        });
      },
    });
    kernel = createManagedSurfaceRuntimeKernelInternalV1<WrappedRuntimeStateV1>({
      initialState,
      stateAdapter,
    });
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    kernel.subscribeStateInternalV1(stateListener);
    kernel.subscribeTransientInternalV1(transientListener);
    const request = Object.freeze({
      definition: parseManagedSurfaceResolvedDefinitionV1(definitionV1()),
      semanticOccurrenceId: "semantic.rollback",
    });
    const candidate = kernel.peekTransientCandidateInternalV1(request);
    const receipt = kernel.transitionTransientInternalV1(Object.freeze({
      kind: "prepare_initial",
      applicationEpoch: applicationEpochV1,
      candidate,
    }));

    expect(receipt).toEqual({
      kind: "faulted",
      code: "surface.transition_faulted",
      beforeTopologyRevision: 0,
      afterTopologyRevision: 0,
    });
    expect(Object.keys(receipt)).toEqual([
      "kind",
      "code",
      "beforeTopologyRevision",
      "afterTopologyRevision",
    ]);
    expect("surfaceInstanceId" in receipt).toBe(false);
    expect(kernel.getStateInternalV1()).toBe(initialState);
    expect(kernel.getTransientStateInternalV1()).toBe(initialTransientState);
    expect(kernel.peekTransientCandidateInternalV1(request)).toEqual(candidate);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("keeps the old state and releases the shared fence when the transient finalizer throws", () => {
    const initialTransientState = createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      Object.freeze([ownerIdV1]),
      resolvedSlotDescriptorsV1,
    );
    const initialState = wrappedRuntimeStateV1(initialTransientState, "initial");
    let shouldThrow = true;
    const stateAdapter = Object.freeze({
      getTransientState: (state: WrappedRuntimeStateV1) => state.transientState,
      replaceTransientState: (
        _state: WrappedRuntimeStateV1,
        transientState: ManagedSurfaceReducerStateV1,
      ) => wrappedRuntimeStateV1(transientState, "reducer"),
      finalizeTransientTransition(
        _currentState: WrappedRuntimeStateV1,
        reducerSuccessorState: WrappedRuntimeStateV1,
        _operation: ManagedSurfaceOperationV1,
        reducerReceipt: ManagedSurfaceTransitionReceiptV1,
      ) {
        if (shouldThrow) {
          shouldThrow = false;
          throw new Error("transient finalizer failed");
        }
        return Object.freeze({ state: reducerSuccessorState, receipt: reducerReceipt });
      },
    });
    const kernel = createManagedSurfaceRuntimeKernelInternalV1<WrappedRuntimeStateV1>({
      initialState,
      stateAdapter,
    });
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    kernel.subscribeStateInternalV1(stateListener);
    kernel.subscribeTransientInternalV1(transientListener);
    const request = Object.freeze({
      definition: parseManagedSurfaceResolvedDefinitionV1(definitionV1()),
      semanticOccurrenceId: "semantic.throw",
    });
    const candidate = kernel.peekTransientCandidateInternalV1(request);
    const operation = Object.freeze({
      kind: "prepare_initial" as const,
      applicationEpoch: applicationEpochV1,
      candidate,
    });

    expect(() => kernel.transitionTransientInternalV1(operation)).toThrowError(
      "transient finalizer failed",
    );
    expect(kernel.getStateInternalV1()).toBe(initialState);
    expect(kernel.getTransientStateInternalV1()).toBe(initialTransientState);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
    expect(
      kernel.transitionStateInternalV1((state) => ({ state, result: "released" })),
    ).toBe("released");

    expect(kernel.transitionTransientInternalV1(operation)).toMatchObject({
      kind: "applied",
      code: "surface.preparation_started",
      surfaceInstanceId: "surface-instance.e17.n1",
    });
    expect(kernel.getStateInternalV1().marker).toBe("reducer");
    expect(kernel.getTransientStateInternalV1().identitySequenceHighWater).toBe(1);
    expect(stateListener).toHaveBeenCalledOnce();
    expect(transientListener).toHaveBeenCalledOnce();
  });

  it("captures the complete transient finalizer output before installing its state", () => {
    const initialTransientState = createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      Object.freeze([ownerIdV1]),
      resolvedSlotDescriptorsV1,
    );
    const initialState = wrappedRuntimeStateV1(initialTransientState, "initial");
    let stateReads = 0;
    let receiptReads = 0;
    const stateAdapter = Object.freeze({
      getTransientState: (state: WrappedRuntimeStateV1) => state.transientState,
      replaceTransientState: (
        _state: WrappedRuntimeStateV1,
        transientState: ManagedSurfaceReducerStateV1,
      ) => wrappedRuntimeStateV1(transientState, "reducer"),
      finalizeTransientTransition(
        _currentState: WrappedRuntimeStateV1,
        reducerSuccessorState: WrappedRuntimeStateV1,
      ) {
        return Object.freeze({
          get state(): WrappedRuntimeStateV1 {
            stateReads += 1;
            if (stateReads !== 1) throw new Error("transient state re-read");
            return reducerSuccessorState;
          },
          get receipt(): never {
            receiptReads += 1;
            throw new Error("transient receipt capture failed");
          },
        });
      },
    });
    const kernel = createManagedSurfaceRuntimeKernelInternalV1<WrappedRuntimeStateV1>({
      initialState,
      stateAdapter,
    });
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    kernel.subscribeStateInternalV1(stateListener);
    kernel.subscribeTransientInternalV1(transientListener);
    const request = Object.freeze({
      definition: parseManagedSurfaceResolvedDefinitionV1(definitionV1()),
      semanticOccurrenceId: "semantic.receipt-capture",
    });
    const candidate = kernel.peekTransientCandidateInternalV1(request);

    expect(() =>
      kernel.transitionTransientInternalV1(Object.freeze({
        kind: "prepare_initial",
        applicationEpoch: applicationEpochV1,
        candidate,
      }))
    ).toThrowError("transient receipt capture failed");
    expect(stateReads).toBe(1);
    expect(receiptReads).toBe(1);
    expect(kernel.getStateInternalV1()).toBe(initialState);
    expect(kernel.getTransientStateInternalV1()).toBe(initialTransientState);
    expect(kernel.peekTransientCandidateInternalV1(request)).toEqual(candidate);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
    expect(
      kernel.transitionStateInternalV1((state) => ({ state, result: "released" })),
    ).toBe("released");
  });

  it("keeps terminal coordinator disposal outside the generic transient finalizer", () => {
    const initialTransientState = createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      Object.freeze([ownerIdV1]),
      resolvedSlotDescriptorsV1,
    );
    const initialState = wrappedRuntimeStateV1(initialTransientState, "initial");
    const finalizer = vi.fn((
      _currentState: WrappedRuntimeStateV1,
      _reducerSuccessorState: WrappedRuntimeStateV1,
      _operation: ManagedSurfaceOperationV1,
      reducerReceipt: ManagedSurfaceTransitionReceiptV1,
    ) => Object.freeze({ state: initialState, receipt: reducerReceipt }));
    const kernel = createManagedSurfaceRuntimeKernelInternalV1<WrappedRuntimeStateV1>({
      initialState,
      stateAdapter: Object.freeze({
        getTransientState: (state: WrappedRuntimeStateV1) => state.transientState,
        replaceTransientState: (
          _state: WrappedRuntimeStateV1,
          transientState: ManagedSurfaceReducerStateV1,
        ) => wrappedRuntimeStateV1(transientState, "terminal"),
        finalizeTransientTransition: finalizer,
      }),
    });
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    kernel.subscribeStateInternalV1(stateListener);
    kernel.subscribeTransientInternalV1(transientListener);

    expect(kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" })).toEqual({
      kind: "applied",
      code: "surface.coordinator_disposed",
      beforeTopologyRevision: 0,
      afterTopologyRevision: 1,
    });
    const terminalState = kernel.getStateInternalV1();
    expect(terminalState).not.toBe(initialState);
    expect(terminalState.marker).toBe("terminal");
    expect(terminalState.transientState.publication.coordinatorDisposed).toBe(true);
    expect(finalizer).not.toHaveBeenCalled();
    expect(transientListener).toHaveBeenCalledOnce();
    expect(stateListener).toHaveBeenCalledOnce();

    expect(kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" })).toEqual({
      kind: "unchanged",
      code: "surface.coordinator_already_disposed",
      beforeTopologyRevision: 1,
      afterTopologyRevision: 1,
    });
    expect(kernel.getStateInternalV1()).toBe(terminalState);
    expect(finalizer).not.toHaveBeenCalled();
    expect(transientListener).toHaveBeenCalledOnce();
    expect(stateListener).toHaveBeenCalledOnce();
  });

  it("prepares and gates only a first terminal reducer result before notifying", () => {
    type WrappedKernelV1 = ReturnType<
      typeof createManagedSurfaceRuntimeKernelInternalV1<WrappedRuntimeStateV1>
    >;
    const initialTransientState = createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      Object.freeze([ownerIdV1]),
      resolvedSlotDescriptorsV1,
    );
    const initialState = wrappedRuntimeStateV1(initialTransientState, "initial");
    const trace: string[] = [];
    let captureCount = 0;
    let terminalPrepareCount = 0;
    let gateCount = 0;
    let kernel!: WrappedKernelV1;
    let terminalState: WrappedRuntimeStateV1 | null = null;

    const terminalPreparer = function (
      this: unknown,
      currentState: WrappedRuntimeStateV1,
      reducerSuccessorState: WrappedRuntimeStateV1,
      operation: ManagedSurfaceOperationV1,
      reducerReceipt: ManagedSurfaceTransitionReceiptV1,
    ): Readonly<{
      readonly state: WrappedRuntimeStateV1;
      readonly commitGate: () => void;
    }> {
      terminalPrepareCount += 1;
      expect(this).toBe(stateAdapter);
      expect(currentState).toBe(kernel.getStateInternalV1());
      expect(reducerSuccessorState).not.toBe(currentState);
      expect(reducerSuccessorState.marker).toBe("reducer");
      expect(operation).toBe(dynamicTerminalOperation);
      expect(reducerReceipt).toEqual({
        kind: "applied",
        code: "surface.coordinator_disposed",
        beforeTopologyRevision: 1,
        afterTopologyRevision: 2,
      });
      terminalState = wrappedRuntimeStateV1(
        reducerSuccessorState.transientState,
        "terminal",
      );
      const preparedTerminalState = terminalState;
      trace.push("prepare");
      return Object.freeze({
        get state(): WrappedRuntimeStateV1 {
          trace.push("capture:state");
          return preparedTerminalState;
        },
        get commitGate(): () => void {
          trace.push("capture:gate");
          return () => {
            gateCount += 1;
            trace.push("gate");
            expect(() =>
              kernel.transitionStateInternalV1((state) => ({ state, result: undefined }))
            ).toThrowError("ui.managed_surface_runtime_transition_in_progress");
            expect(kernel.getStateInternalV1()).toBe(currentState);
          };
        },
      });
    };
    const stateAdapter = Object.freeze({
      getTransientState: (state: WrappedRuntimeStateV1) => state.transientState,
      replaceTransientState: (
        _state: WrappedRuntimeStateV1,
        transientState: ManagedSurfaceReducerStateV1,
      ) => wrappedRuntimeStateV1(transientState, "reducer"),
      get prepareTerminalTransientTransition() {
        captureCount += 1;
        return terminalPreparer;
      },
      validateInstallState() {
        trace.push("validate");
      },
      finalizeInstallState(nextState: WrappedRuntimeStateV1) {
        trace.push("finalize");
        if (terminalState !== null) {
          expect(nextState).toBe(terminalState);
          expect(kernel.getStateInternalV1()).toBe(terminalState);
        }
      },
    });
    kernel = createManagedSurfaceRuntimeKernelInternalV1<WrappedRuntimeStateV1>({
      initialState,
      stateAdapter,
    });
    expect(captureCount).toBe(1);

    const candidate = kernel.peekTransientCandidateInternalV1({
      definition: parseManagedSurfaceResolvedDefinitionV1(definitionV1()),
      semanticOccurrenceId: "semantic.terminal-gate",
    });
    expect(kernel.transitionTransientInternalV1(Object.freeze({
      kind: "prepare_initial",
      applicationEpoch: applicationEpochV1,
      candidate,
    }))).toMatchObject({
      kind: "applied",
      code: "surface.preparation_started",
    });
    expect(terminalPrepareCount).toBe(0);
    trace.length = 0;

    kernel.subscribeTransientInternalV1(() => {
      trace.push(`transient:${kernel.getStateInternalV1().marker}`);
      expect(kernel.getStateInternalV1()).toBe(terminalState);
      expect(kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" })).toEqual({
        kind: "unchanged",
        code: "surface.coordinator_already_disposed",
        beforeTopologyRevision: 2,
        afterTopologyRevision: 2,
      });
      trace.push("nested-repeat");
    });
    kernel.subscribeStateInternalV1(() => {
      trace.push(`state:${kernel.getStateInternalV1().marker}`);
      expect(kernel.getStateInternalV1()).toBe(terminalState);
    });

    let kindReads = 0;
    const dynamicTerminalOperation = new Proxy(
      Object.freeze({}) as unknown as ManagedSurfaceOperationV1,
      {
        get(_target, property) {
          if (property !== "kind") return undefined;
          kindReads += 1;
          return kindReads < 3 ? "close_top" : "dispose_coordinator";
        },
      },
    );
    expect(kernel.transitionTransientInternalV1(dynamicTerminalOperation)).toEqual({
      kind: "applied",
      code: "surface.coordinator_disposed",
      beforeTopologyRevision: 1,
      afterTopologyRevision: 2,
    });

    expect(kindReads).toBeGreaterThanOrEqual(3);
    expect(captureCount).toBe(1);
    expect(terminalPrepareCount).toBe(1);
    expect(gateCount).toBe(1);
    expect(kernel.getStateInternalV1()).toBe(terminalState);
    expect(trace).toEqual([
      "prepare",
      "capture:state",
      "capture:gate",
      "validate",
      "gate",
      "finalize",
      "transient:terminal",
      "validate",
      "finalize",
      "nested-repeat",
      "state:terminal",
    ]);

    expect(kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" })).toEqual({
      kind: "unchanged",
      code: "surface.coordinator_already_disposed",
      beforeTopologyRevision: 2,
      afterTopologyRevision: 2,
    });
    expect(terminalPrepareCount).toBe(1);
    expect(gateCount).toBe(1);
    expect(kernel.transitionTransientInternalV1({
      kind: "close_top",
      applicationEpoch: applicationEpochV1,
    })).toEqual({
      kind: "rejected",
      code: "surface.coordinator_disposed",
      beforeTopologyRevision: 2,
      afterTopologyRevision: 2,
    });
    expect(terminalPrepareCount).toBe(1);
    expect(gateCount).toBe(1);
    expect(trace).toEqual([
      "prepare",
      "capture:state",
      "capture:gate",
      "validate",
      "gate",
      "finalize",
      "transient:terminal",
      "validate",
      "finalize",
      "nested-repeat",
      "state:terminal",
      "validate",
      "finalize",
      "validate",
      "finalize",
    ]);
  });

  it.each(
    [
      "callback",
      "state_output",
      "gate_output",
      "validation",
      "gate_call",
    ] as const,
  )(
    "keeps the old state and releases the fence when terminal %s fails before assignment",
    (
      failurePoint:
        | "callback"
        | "state_output"
        | "gate_output"
        | "validation"
        | "gate_call",
    ) => {
      const initialTransientState = createManagedSurfaceReducerStateV1(
        applicationEpochV1,
        Object.freeze([ownerIdV1]),
        resolvedSlotDescriptorsV1,
      );
      const initialState = wrappedRuntimeStateV1(initialTransientState, "initial");
      const gate = vi.fn(() => {
        if (failurePoint === "gate_call") throw new Error("terminal gate call failed");
      });
      let validationShouldFail = failurePoint === "validation";
      const stateAdapter = Object.freeze({
        getTransientState: (state: WrappedRuntimeStateV1) => state.transientState,
        replaceTransientState: (
          _state: WrappedRuntimeStateV1,
          transientState: ManagedSurfaceReducerStateV1,
        ) => wrappedRuntimeStateV1(transientState, "reducer"),
        prepareTerminalTransientTransition(
          _currentState: WrappedRuntimeStateV1,
          reducerSuccessorState: WrappedRuntimeStateV1,
        ): Readonly<{
          readonly state: WrappedRuntimeStateV1;
          readonly commitGate: () => void;
        }> {
          if (failurePoint === "callback") throw new Error("terminal callback failed");
          return Object.freeze({
            get state(): WrappedRuntimeStateV1 {
              if (failurePoint === "state_output") {
                throw new Error("terminal state failed");
              }
              return reducerSuccessorState;
            },
            get commitGate(): () => void {
              if (failurePoint === "gate_output") {
                throw new Error("terminal gate failed");
              }
              return gate;
            },
          });
        },
        validateInstallState() {
          if (validationShouldFail) {
            validationShouldFail = false;
            throw new Error("terminal validation failed");
          }
        },
      });
      const kernel = createManagedSurfaceRuntimeKernelInternalV1<WrappedRuntimeStateV1>({
        initialState,
        stateAdapter,
      });
      const stateListener = vi.fn();
      const transientListener = vi.fn();
      kernel.subscribeStateInternalV1(stateListener);
      kernel.subscribeTransientInternalV1(transientListener);

      const expectedError = failurePoint === "gate_call"
        ? "terminal gate call failed"
        : `terminal ${failurePoint.replace("_output", "")} failed`;
      expect(() => kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" }))
        .toThrowError(expectedError);
      expect(kernel.getStateInternalV1()).toBe(initialState);
      expect(kernel.getTransientStateInternalV1()).toBe(initialTransientState);
      if (failurePoint === "gate_call") {
        expect(gate).toHaveBeenCalledOnce();
      } else {
        expect(gate).not.toHaveBeenCalled();
      }
      expect(stateListener).not.toHaveBeenCalled();
      expect(transientListener).not.toHaveBeenCalled();
      expect(
        kernel.transitionStateInternalV1((state) => ({ state, result: "released" })),
      ).toBe("released");
    },
  );

  it("commits only same-kernel exact-current one-shot prepared installs", () => {
    const initialState = createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      Object.freeze([ownerIdV1]),
      resolvedSlotDescriptorsV1,
    );
    const runtime = createManagedSurfaceRuntimeAuthorityBundleInternalV1({ initialState });
    const foreign = createManagedSurfaceRuntimeAuthorityBundleInternalV1({ initialState });
    const nextState = stateWithHighWaterV1(initialState, 1);
    const token = runtime.kernel.prepareStateInstallInternalV1(initialState, nextState);
    const clonedToken = { ...token } as typeof token;
    const rejectedGate = vi.fn(() => true);

    expect(
      runtime.kernel.transitionStateInternalV1((current) => {
        expect(() => runtime.kernel.commitPreparedStateInstallInternalV1(token, rejectedGate))
          .toThrowError("ui.managed_surface_runtime_transition_in_progress");
        return Object.freeze({ state: current, result: "planned" });
      }),
    ).toBe("planned");
    expect(rejectedGate).not.toHaveBeenCalled();

    expect(
      runtime.kernel.commitPreparedStateInstallInternalV1(clonedToken, rejectedGate),
    ).toBe("invalid");
    expect(
      foreign.kernel.commitPreparedStateInstallInternalV1(token, rejectedGate),
    ).toBe("invalid");
    expect(rejectedGate).not.toHaveBeenCalled();
    expect(runtime.kernel.getStateInternalV1()).toBe(initialState);

    const stateListener = vi.fn();
    const transientListener = vi.fn();
    runtime.kernel.subscribeStateInternalV1(stateListener);
    runtime.kernel.subscribeTransientInternalV1(transientListener);
    expect(
      runtime.kernel.commitPreparedStateInstallInternalV1(token, () => true),
    ).toBe("installed");
    expect(runtime.kernel.getStateInternalV1()).toBe(nextState);
    expect(stateListener).toHaveBeenCalledOnce();
    expect(transientListener).not.toHaveBeenCalled();
    expect(
      runtime.kernel.commitPreparedStateInstallInternalV1(token, rejectedGate),
    ).toBe("invalid");
    expect(rejectedGate).not.toHaveBeenCalled();

    const staleNext = stateWithHighWaterV1(nextState, 2);
    const staleToken = runtime.kernel.prepareStateInstallInternalV1(nextState, staleNext);
    runtime.kernel.transitionStateInternalV1((current) => ({
      state: stateWithHighWaterV1(current, 3),
      result: undefined,
    }));
    expect(
      runtime.kernel.commitPreparedStateInstallInternalV1(staleToken, rejectedGate),
    ).toBe("stale");
    expect(rejectedGate).not.toHaveBeenCalled();
    expect(runtime.kernel.getStateInternalV1().identitySequenceHighWater).toBe(3);

    const current = runtime.kernel.getStateInternalV1();
    const aborted = runtime.kernel.prepareStateInstallInternalV1(
      current,
      stateWithHighWaterV1(current, 4),
    );
    expect(
      runtime.kernel.commitPreparedStateInstallInternalV1(aborted, () => false),
    ).toBe("aborted");
    expect(runtime.kernel.getStateInternalV1()).toBe(current);
    expect(
      runtime.kernel.commitPreparedStateInstallInternalV1(aborted, rejectedGate),
    ).toBe("invalid");

    const throwing = runtime.kernel.prepareStateInstallInternalV1(
      current,
      stateWithHighWaterV1(current, 4),
    );
    expect(() =>
      runtime.kernel.commitPreparedStateInstallInternalV1(throwing, () => {
        throw new Error("gate failed");
      })
    ).toThrowError("gate failed");
    expect(runtime.kernel.getStateInternalV1()).toBe(current);
    expect(
      runtime.kernel.commitPreparedStateInstallInternalV1(throwing, rejectedGate),
    ).toBe("invalid");
    expect(rejectedGate).not.toHaveBeenCalled();
    expect(
      runtime.kernel.transitionStateInternalV1((state) => ({ state, result: "released" })),
    ).toBe("released");
  });

  it("performs no adapter read between a prepared gate and assignment", () => {
    interface GenericStateV1 {
      readonly transientState: ManagedSurfaceReducerStateV1;
      readonly marker: number;
    }
    const trace: string[] = [];
    const initialTransientState = createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      Object.freeze([ownerIdV1]),
      resolvedSlotDescriptorsV1,
    );
    const initialState: GenericStateV1 = Object.freeze({
      transientState: initialTransientState,
      marker: 0,
    });
    const kernel = createManagedSurfaceRuntimeKernelInternalV1<GenericStateV1>({
      initialState,
      stateAdapter: Object.freeze({
        getTransientState(state: GenericStateV1): ManagedSurfaceReducerStateV1 {
          trace.push(`adapter:${state.marker}`);
          return state.transientState;
        },
        replaceTransientState(
          state: GenericStateV1,
          transientState: ManagedSurfaceReducerStateV1,
        ): GenericStateV1 {
          trace.push(`replace:${state.marker}`);
          return Object.freeze({ ...state, transientState });
        },
        finalizeInstallState(state: GenericStateV1): void {
          trace.push(`finalize:${state.marker}`);
        },
      }),
    });
    const nextState: GenericStateV1 = Object.freeze({
      transientState: initialTransientState,
      marker: 1,
    });
    kernel.subscribeStateInternalV1(() => {
      trace.push(`listener:${kernel.getStateInternalV1().marker}`);
    });
    const token = kernel.prepareStateInstallInternalV1(initialState, nextState);
    trace.length = 0;

    expect(
      kernel.commitPreparedStateInstallInternalV1(token, () => {
        trace.push("gate");
        return true;
      }),
    ).toBe("installed");
    expect(trace).toEqual(["gate", "finalize:1", "listener:1"]);
  });

  it("cannot reinstall a captured predecessor after runtime disposal", () => {
    const initialState = createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      Object.freeze([ownerIdV1]),
      resolvedSlotDescriptorsV1,
    );
    const runtime = createManagedSurfaceRuntimeAuthorityBundleInternalV1({ initialState });
    const prepared = runtime.kernel.prepareStateInstallInternalV1(
      initialState,
      stateWithHighWaterV1(initialState, 1),
    );
    expect(runtime.kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" })).toEqual({
      kind: "applied",
      code: "surface.coordinator_disposed",
      beforeTopologyRevision: 0,
      afterTopologyRevision: 1,
    });
    const disposedState = runtime.kernel.getStateInternalV1();
    const gate = vi.fn(() => true);

    expect(
      runtime.kernel.commitPreparedStateInstallInternalV1(prepared, gate),
    ).toBe("stale");
    expect(gate).not.toHaveBeenCalled();
    expect(runtime.kernel.getStateInternalV1()).toBe(disposedState);
    expect(() =>
      runtime.kernel.transitionStateInternalV1(() => ({
        state: initialState,
        result: undefined,
      }))
    ).toThrowError("ui.managed_surface_coordinator_disposed");
    expect(() => runtime.kernel.prepareStateInstallInternalV1(disposedState, initialState))
      .toThrowError("ui.managed_surface_coordinator_disposed");
    expect(runtime.kernel.getTransientSnapshotInternalV1().coordinatorDisposed).toBe(true);
    expect(runtime.kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" })).toEqual({
      kind: "unchanged",
      code: "surface.coordinator_already_disposed",
      beforeTopologyRevision: 1,
      afterTopologyRevision: 1,
    });
  });
});
