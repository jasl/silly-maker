// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger, type RuntimeSchemaV1 } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import { createManagedSurfaceReducerStateV1 } from "../managed-surfaces/managed-surface-reducer.ts";
import { createManagedSurfaceStableAdmissionAuthorityInternalV1 } from "../managed-surfaces/managed-surface-stable-admission.ts";
import { createManagedSurfaceStableCompositeRuntimeKernelInternalV1 } from "../managed-surfaces/managed-surface-stable-composite-state.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "../managed-surfaces/managed-surface-stable-publisher-lease.ts";
import {
  createWholeCanvasManagedSurfaceFamilyContractInternalV1,
  type WholeCanvasManagedSurfaceCatalogRowInternalV1,
} from "./whole-canvas-managed-surface-family.ts";
import {
  createWholeCanvasManagedSurfaceSessionInternalV1,
  type WholeCanvasManagedSurfaceHostCommitInputInternalV1,
  type WholeCanvasManagedSurfaceHostCommitPortInternalV1,
  type WholeCanvasManagedSurfaceHostCommitRequestInternalV1,
  type WholeCanvasManagedSurfacePreparedHostCommitInternalV1,
  type WholeCanvasManagedSurfaceResolvedTargetInternalV1,
  type WholeCanvasManagedSurfaceResolveTargetRequestInternalV1,
  type WholeCanvasManagedSurfaceRootDesiredInternalV1,
  type WholeCanvasManagedSurfaceSessionInternalV1,
  type WholeCanvasManagedSurfaceTargetInternalV1,
} from "./whole-canvas-managed-surface-session.ts";

function targetV1(targetId: string, parameters: unknown = {}) {
  return Object.freeze({ targetId, parameters: Object.freeze(parameters) });
}

function ownerActionV1(actionId: string, payload: unknown = {}) {
  return Object.freeze({
    actionId,
    status: "enabled" as const,
    reasonTextIds: Object.freeze([]),
    intent: Object.freeze({ kind: "owner" as const, payload: Object.freeze(payload) }),
  });
}

function openDetailActionV1(actionId: string, target: WholeCanvasManagedSurfaceTargetInternalV1) {
  return Object.freeze({
    actionId,
    status: "enabled" as const,
    reasonTextIds: Object.freeze([]),
    intent: Object.freeze({ kind: "open_detail" as const, target }),
  });
}

function backActionV1(actionId: string) {
  return Object.freeze({
    actionId,
    status: "enabled" as const,
    reasonTextIds: Object.freeze([]),
    intent: Object.freeze({ kind: "back" as const }),
  });
}

function resolvedV1(input: {
  readonly targetId: string;
  readonly actions?: readonly unknown[];
  readonly version?: number;
}): WholeCanvasManagedSurfaceResolvedTargetInternalV1 {
  return Object.freeze({
    accessibleNameTextId: `text.${input.targetId}`,
    view: Object.freeze({ version: input.version ?? 1 }),
    actions: Object.freeze(input.actions ?? []),
  }) as WholeCanvasManagedSurfaceResolvedTargetInternalV1;
}

function catalogRowV1(input: {
  readonly targetId: string;
  readonly placements: readonly ("primary" | "detail")[];
  readonly actionIds?: readonly string[];
  readonly defaultActionId?: string | null;
}): WholeCanvasManagedSurfaceCatalogRowInternalV1 {
  return Object.freeze({
    targetId: input.targetId,
    contractRevision: 1,
    placements: Object.freeze([...input.placements]),
    actionIds: Object.freeze([...(input.actionIds ?? [])]),
    defaultActionId: input.defaultActionId ?? null,
  });
}

function defaultCatalogV1(): readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[] {
  return Object.freeze([
    catalogRowV1({ targetId: "test.whole-canvas.a", placements: ["primary"] }),
    catalogRowV1({ targetId: "test.whole-canvas.b", placements: ["primary"] }),
    catalogRowV1({ targetId: "test.whole-canvas.detail-d", placements: ["detail"] }),
    catalogRowV1({ targetId: "test.whole-canvas.detail-e", placements: ["detail"] }),
    catalogRowV1({ targetId: "test.whole-canvas.detail", placements: ["detail"] }),
  ]);
}

interface HarnessV1 {
  readonly session: WholeCanvasManagedSurfaceSessionInternalV1;
  readonly resolutions: Map<string, WholeCanvasManagedSurfaceResolvedTargetInternalV1>;
  readonly dispatchOwner: ReturnType<typeof vi.fn>;
  readonly registry: ReturnType<typeof createManagedSurfaceStablePublisherLeaseRegistryInternalV1>;
  readonly authority: ReturnType<typeof createManagedSurfaceStableAdmissionAuthorityInternalV1>;
  readonly kernel: ReturnType<typeof createManagedSurfaceStableCompositeRuntimeKernelInternalV1>;
  readonly contract: ReturnType<typeof createWholeCanvasManagedSurfaceFamilyContractInternalV1>;
}

function harnessV1(
  input: Readonly<{
    readonly applicationEpoch?: number;
    readonly catalog?: readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[];
    readonly hostCommitPortInternalV1?: WholeCanvasManagedSurfaceHostCommitPortInternalV1 | null;
  }> = {},
): HarnessV1 {
  const applicationEpoch = input.applicationEpoch ?? 101;
  const catalog = input.catalog ?? defaultCatalogV1();
  const contract = createWholeCanvasManagedSurfaceFamilyContractInternalV1(catalog);
  const registry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: parseNonNegativeSafeInteger(applicationEpoch),
    resolvedOwnerIds: contract.resolvedOwnerIds,
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
  const authority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry: registry,
    definitionSidecars: contract.stableDefinitionSidecars,
    resolvedSlotDescriptors: contract.resolvedSlotDescriptors,
  });
  const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority: authority,
    publisherLeaseRegistry: registry,
    initialTransientState: createManagedSurfaceReducerStateV1(
      parseNonNegativeSafeInteger(applicationEpoch),
      contract.resolvedOwnerIds,
      contract.resolvedSlotDescriptors,
    ),
  });
  const resolutions = new Map<string, WholeCanvasManagedSurfaceResolvedTargetInternalV1>();
  const dispatchOwner = vi.fn(() => Promise.resolve());
  const resolveTargetInternalV1 = (
    request: WholeCanvasManagedSurfaceResolveTargetRequestInternalV1,
  ) => resolutions.get(`${request.placement}:${request.target.targetId}`) ?? null;
  const session = createWholeCanvasManagedSurfaceSessionInternalV1(Object.freeze({
    publisherLeaseRegistry: registry,
    admissionAuthority: authority,
    compositeRuntimeKernel: kernel,
    exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
    exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
    catalog: contract.catalog,
    resolveTargetInternalV1,
    dispatchOwnerActionInternalV1: dispatchOwner,
    hostCommitPortInternalV1: input.hostCommitPortInternalV1 ?? null,
  }));
  return { session, resolutions, dispatchOwner, registry, authority, kernel, contract };
}

function desiredV1(
  target: WholeCanvasManagedSurfaceTargetInternalV1,
  sourceKind: "publication" | "application" = "application",
  rootKind: "boot_splash" | "title" | "primary" = "primary",
): WholeCanvasManagedSurfaceRootDesiredInternalV1 {
  if (rootKind === "boot_splash") {
    return Object.freeze({ bootSplash: target, title: null, story: null });
  }
  if (rootKind === "title") {
    return Object.freeze({ bootSplash: null, title: target, story: null });
  }
  return Object.freeze({
    bootSplash: null,
    title: null,
    story: Object.freeze({ sourceKind, target }),
  });
}

interface HostCommitHarnessV1 {
  readonly port: WholeCanvasManagedSurfaceHostCommitPortInternalV1;
  readonly requests: WholeCanvasManagedSurfaceHostCommitRequestInternalV1[];
  readonly prepared: WholeCanvasManagedSurfacePreparedHostCommitInternalV1[];
  readonly commitInputs: WholeCanvasManagedSurfaceHostCommitInputInternalV1[];
  readonly events: string[];
  readonly completeGenerations: number[];
  readonly abort: ReturnType<typeof vi.fn>;
  readonly complete: ReturnType<typeof vi.fn>;
  readonly terminalize: ReturnType<typeof vi.fn>;
  setCommitResult(value: boolean): void;
  setPrepareEffect(effect: (() => void) | null): void;
  setCommitEffect(effect: (() => void) | null): void;
  setCompleteEffect(effect: (() => void) | null): void;
  setTerminalizeEffect(effect: (() => void) | null): void;
}

function hostCommitHarnessV1(): HostCommitHarnessV1 {
  const requests: WholeCanvasManagedSurfaceHostCommitRequestInternalV1[] = [];
  const prepared: WholeCanvasManagedSurfacePreparedHostCommitInternalV1[] = [];
  const commitInputs: WholeCanvasManagedSurfaceHostCommitInputInternalV1[] = [];
  const events: string[] = [];
  const completeGenerations: number[] = [];
  const abort = vi.fn();
  const complete = vi.fn();
  const terminalize = vi.fn();
  let generation = 0;
  let commitResult = true;
  let prepareEffect: (() => void) | null = null;
  let commitEffect: (() => void) | null = null;
  let completeEffect: (() => void) | null = null;
  let terminalizeEffect: (() => void) | null = null;
  const port = Object.freeze({
    prepareCommitInternalV1(
      request: WholeCanvasManagedSurfaceHostCommitRequestInternalV1,
    ): WholeCanvasManagedSurfacePreparedHostCommitInternalV1 {
      requests.push(request);
      generation += 1;
      const candidateGeneration = generation;
      prepareEffect?.();
      const candidate = Object.freeze({
        hostGeneration: candidateGeneration,
        commitInternalV1(input: WholeCanvasManagedSurfaceHostCommitInputInternalV1): boolean {
          events.push("host.commit");
          commitInputs.push(input);
          commitEffect?.();
          return commitResult;
        },
        abortInternalV1: abort,
        completeInstalledInternalV1(): void {
          complete();
          completeGenerations.push(candidateGeneration);
          completeEffect?.();
        },
      }) as WholeCanvasManagedSurfacePreparedHostCommitInternalV1;
      prepared.push(candidate);
      return candidate;
    },
    terminalizeInternalV1(): void {
      terminalize();
      terminalizeEffect?.();
    },
  });
  return {
    port,
    requests,
    prepared,
    commitInputs,
    events,
    completeGenerations,
    abort,
    complete,
    terminalize,
    setCommitResult(value: boolean): void {
      commitResult = value;
    },
    setPrepareEffect(effect: (() => void) | null): void {
      prepareEffect = effect;
    },
    setCommitEffect(effect: (() => void) | null): void {
      commitEffect = effect;
    },
    setCompleteEffect(effect: (() => void) | null): void {
      completeEffect = effect;
    },
    setTerminalizeEffect(effect: (() => void) | null): void {
      terminalizeEffect = effect;
    },
  };
}

function aggregateV1(input: {
  readonly bootSplash?: WholeCanvasManagedSurfaceTargetInternalV1 | null;
  readonly title?: WholeCanvasManagedSurfaceTargetInternalV1 | null;
  readonly story?:
    | Readonly<{
      readonly sourceKind: "publication" | "application";
      readonly target: WholeCanvasManagedSurfaceTargetInternalV1;
    }>
    | null;
}): WholeCanvasManagedSurfaceRootDesiredInternalV1 {
  return Object.freeze({
    bootSplash: input.bootSplash ?? null,
    title: input.title ?? null,
    story: input.story ?? null,
  });
}

function installResolutionV1(
  harness: HarnessV1,
  placement: "primary" | "detail",
  targetId: string,
  resolved: WholeCanvasManagedSurfaceResolvedTargetInternalV1,
): void {
  harness.resolutions.set(`${placement}:${targetId}`, resolved);
}

function settleRootReadyV1(harness: HarnessV1) {
  const pending = harness.session.getSnapshotInternalV1().root.pending;
  if (pending === null) throw new Error("expected pending root");
  expect(harness.session.settleReadinessReadyInternalV1(pending.preparation)).toMatchObject({
    kind: "applied",
  });
  const current = harness.session.getSnapshotInternalV1().root.current;
  if (current === null) throw new Error("expected current root");
  return current;
}

function settleDetailReadyV1(harness: HarnessV1) {
  const pending = harness.session.getSnapshotInternalV1().detail.pending;
  if (pending === null) throw new Error("expected pending detail");
  expect(harness.session.settleReadinessReadyInternalV1(pending.preparation)).toMatchObject({
    kind: "applied",
  });
  const current = harness.session.getSnapshotInternalV1().detail.current;
  if (current === null) throw new Error("expected current detail");
  return current;
}

function openRootV1(
  harness: HarnessV1,
  targetId = "test.whole-canvas.a",
  resolved = resolvedV1({ targetId }),
) {
  installResolutionV1(harness, "primary", targetId, resolved);
  expect(harness.session.reconcileRootInternalV1(desiredV1(targetV1(targetId)))).toMatchObject({
    kind: "applied",
  });
  return settleRootReadyV1(harness);
}

describe("whole-canvas managed Surface session", () => {
  it("rejects malformed root and resolved action data with exact zero delta", () => {
    const harness = harnessV1({
      catalog: Object.freeze([
        catalogRowV1({
          targetId: "test.whole-canvas.invalid",
          placements: ["primary"],
          actionIds: ["test.action"],
        }),
      ]),
    });
    const before = harness.session.getSnapshotInternalV1();
    const publisherBefore = harness.registry.getSnapshot();
    const revokedConstructorInput = Proxy.revocable({}, {});
    revokedConstructorInput.revoke();
    expect(() =>
      createWholeCanvasManagedSurfaceSessionInternalV1(
        revokedConstructorInput.proxy as never,
      )
    ).toThrowError("ui.whole_canvas_session_invalid");

    const revokedDesired = Proxy.revocable({}, {});
    revokedDesired.revoke();
    expect(() => harness.session.reconcileRootInternalV1(revokedDesired.proxy as never)).not
      .toThrow();
    expect(harness.session.reconcileRootInternalV1(revokedDesired.proxy as never)).toMatchObject({
      kind: "rejected",
    });
    const trappingDesired = new Proxy({}, {
      ownKeys(): never {
        throw new Error("ownKeys trap");
      },
    });
    expect(harness.session.reconcileRootInternalV1(trappingDesired as never)).toMatchObject({
      kind: "rejected",
    });
    const revokedAction = Proxy.revocable({}, {});
    revokedAction.revoke();
    expect(() => harness.session.dispatchActionInternalV1(revokedAction.proxy as never)).not
      .toThrow();
    expect(harness.session.dispatchActionInternalV1(revokedAction.proxy as never)).toMatchObject({
      kind: "stale",
    });

    const dormant = harnessV1({ catalog: Object.freeze([]) });
    installResolutionV1(
      dormant,
      "primary",
      "test.whole-canvas.unknown",
      resolvedV1({ targetId: "test.whole-canvas.unknown" }),
    );
    const dormantBefore = dormant.session.getSnapshotInternalV1();
    const dormantKernelBefore = dormant.kernel.getStateInternalV1();
    expect(dormant.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.unknown")),
    )).toMatchObject({ kind: "rejected" });
    expect(dormant.session.getSnapshotInternalV1()).toBe(dormantBefore);
    expect(dormant.kernel.getStateInternalV1()).toBe(dormantKernelBefore);

    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.detail-d",
      resolvedV1({ targetId: "test.whole-canvas.detail-d" }),
    );
    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.detail-d")),
    )).toMatchObject({ kind: "rejected" });

    expect(harness.session.reconcileRootInternalV1({ rootKind: "primary" } as never)).toMatchObject(
      {
        kind: "rejected",
      },
    );
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.invalid",
      Object.freeze({
        accessibleNameTextId: "text.invalid",
        view: Object.freeze({}),
        actions: Object.freeze([
          Object.freeze({
            actionId: "test.action",
            status: "enabled",
            reasonTextIds: Object.freeze(["text.must-be-empty"]),
            intent: Object.freeze({ kind: "back" }),
          }),
        ]),
      }) as never,
    );
    expect(
      harness.session.reconcileRootInternalV1(
        desiredV1(targetV1("test.whole-canvas.invalid")),
      ),
    ).toMatchObject({ kind: "rejected" });
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.invalid",
      resolvedV1({
        targetId: "test.whole-canvas.invalid",
        actions: [Object.freeze({
          actionId: "test.action",
          status: "enabled",
          reasonTextIds: Object.freeze([]),
          intent: Object.freeze({ kind: "owner", payload: Object.freeze([]) }),
        })],
      }),
    );
    expect(
      harness.session.reconcileRootInternalV1(
        desiredV1(targetV1("test.whole-canvas.invalid")),
      ),
    ).toMatchObject({ kind: "rejected" });
    expect(harness.session.getSnapshotInternalV1()).toBe(before);
    expect(harness.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: publisherBefore.leaseSequenceHighWater,
    });
  });

  it("captures frozen arrays and hostile sidecars without invoking Story getters", () => {
    const harness = harnessV1();
    const actionsGet = vi.fn();
    const actionsTarget = Object.freeze([]);
    const actions = new Proxy(actionsTarget, {
      get(target, key, receiver) {
        actionsGet(key);
        return Reflect.get(target, key, receiver);
      },
    });
    harness.resolutions.set(
      "primary:test.whole-canvas.a",
      Object.freeze({
        accessibleNameTextId: "text.test.whole-canvas.a",
        view: Object.freeze({ version: 1 }),
        actions,
      }) as WholeCanvasManagedSurfaceResolvedTargetInternalV1,
    );
    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.a")),
    )).toMatchObject({ kind: "applied" });
    expect(actionsGet).not.toHaveBeenCalled();
    settleRootReadyV1(harness);

    const definitionGetter = vi.fn(() => "surface.whole-canvas.primary");
    const hostileDefinition = Object.freeze(Object.defineProperty({}, "definitionId", {
      get: definitionGetter,
      enumerable: true,
    }));
    const validSidecars = harness.contract.stableDefinitionSidecars;
    const sidecarGet = vi.fn();
    const hostileSidecarTarget = Object.freeze({
      definition: hostileDefinition,
      parameterSchema: validSidecars[0]!.parameterSchema,
    });
    const hostileSidecar = new Proxy(hostileSidecarTarget, {
      get(target, key, receiver) {
        sidecarGet(key);
        return Reflect.get(target, key, receiver);
      },
    });
    const hostileAggregate = Object.freeze([
      hostileSidecar,
      ...validSidecars.slice(1),
    ]);
    const registryBefore = harness.registry.getSnapshot();
    expect(() =>
      createWholeCanvasManagedSurfaceSessionInternalV1(Object.freeze({
        publisherLeaseRegistry: harness.registry,
        admissionAuthority: harness.authority,
        compositeRuntimeKernel: harness.kernel,
        exactAggregateDefinitionSidecars: hostileAggregate as unknown as typeof validSidecars,
        exactAggregateSlotDescriptors: harness.contract.resolvedSlotDescriptors,
        catalog: harness.contract.catalog,
        resolveTargetInternalV1: () => null,
        dispatchOwnerActionInternalV1: null,
        hostCommitPortInternalV1: null,
      }))
    ).toThrowError("ui.whole_canvas_session_invalid");
    expect(sidecarGet).not.toHaveBeenCalled();
    expect(definitionGetter).not.toHaveBeenCalled();
    expect(harness.registry.getSnapshot()).toEqual(registryBefore);

    const wrongSchema = Object.freeze({
      parse: (value: unknown): unknown => value,
    }) satisfies RuntimeSchemaV1<unknown>;
    const schemaSidecarGet = vi.fn();
    const wrongPrimaryTarget = Object.freeze({
      definition: validSidecars[0]!.definition,
      parameterSchema: wrongSchema,
    });
    const wrongPrimary = new Proxy(wrongPrimaryTarget, {
      get(target, key, receiver) {
        schemaSidecarGet(key);
        return Reflect.get(target, key, receiver);
      },
    });
    const wrongSidecars = Object.freeze([
      wrongPrimary,
      validSidecars[1]!,
      validSidecars[2]!,
    ]) as typeof validSidecars;
    const wrongRegistry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
      applicationEpoch: parseNonNegativeSafeInteger(202),
      resolvedOwnerIds: harness.contract.resolvedOwnerIds,
      leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
    });
    const wrongAuthority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
      publisherLeaseRegistry: wrongRegistry,
      definitionSidecars: wrongSidecars,
      resolvedSlotDescriptors: harness.contract.resolvedSlotDescriptors,
    });
    const wrongKernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
      admissionAuthority: wrongAuthority,
      publisherLeaseRegistry: wrongRegistry,
      initialTransientState: createManagedSurfaceReducerStateV1(
        parseNonNegativeSafeInteger(202),
        harness.contract.resolvedOwnerIds,
        harness.contract.resolvedSlotDescriptors,
      ),
    });
    schemaSidecarGet.mockClear();
    const wrongRegistryBefore = wrongRegistry.getSnapshot();
    expect(() =>
      createWholeCanvasManagedSurfaceSessionInternalV1(Object.freeze({
        publisherLeaseRegistry: wrongRegistry,
        admissionAuthority: wrongAuthority,
        compositeRuntimeKernel: wrongKernel,
        exactAggregateDefinitionSidecars: wrongSidecars,
        exactAggregateSlotDescriptors: harness.contract.resolvedSlotDescriptors,
        catalog: harness.contract.catalog,
        resolveTargetInternalV1: () => null,
        dispatchOwnerActionInternalV1: null,
        hostCommitPortInternalV1: null,
      }))
    ).toThrowError("ui.whole_canvas_session_invalid");
    expect(schemaSidecarGet).not.toHaveBeenCalled();
    expect(wrongRegistry.getSnapshot()).toEqual(wrongRegistryBefore);
  });

  it("selects and directly advances Boot Splash to Title to the latest cached Story", () => {
    const harness = harnessV1();
    const splash = targetV1("whole-canvas.builtin.splash");
    const title = targetV1("whole-canvas.builtin.title");
    const storyA = targetV1("test.whole-canvas.a");
    const storyB = targetV1("test.whole-canvas.b");
    installResolutionV1(
      harness,
      "primary",
      splash.targetId,
      resolvedV1({ targetId: splash.targetId }),
    );
    installResolutionV1(
      harness,
      "primary",
      title.targetId,
      resolvedV1({
        targetId: title.targetId,
        actions: [Object.freeze({
          actionId: "whole-canvas.title.continue",
          status: "enabled" as const,
          reasonTextIds: Object.freeze([]),
          intent: Object.freeze({ kind: "close_primary" as const }),
        })],
      }),
    );
    for (const target of [storyA, storyB]) {
      installResolutionV1(
        harness,
        "primary",
        target.targetId,
        resolvedV1({ targetId: target.targetId }),
      );
    }

    expect(harness.session.reconcileRootInternalV1(aggregateV1({
      bootSplash: splash,
      title,
      story: Object.freeze({ sourceKind: "application", target: storyA }),
    }))).toMatchObject({ kind: "applied" });
    const splashEntry = settleRootReadyV1(harness);
    expect(splashEntry.rootKind).toBe("boot_splash");

    const splashSourceRevision = splashEntry.frame.sourceRevision;
    expect(harness.session.reconcileRootInternalV1(aggregateV1({
      bootSplash: splash,
      title,
      story: Object.freeze({ sourceKind: "application", target: storyB }),
    }))).toMatchObject({ kind: "unchanged" });
    expect(harness.session.getSnapshotInternalV1().root.current).toBe(splashEntry);
    expect(harness.session.getSnapshotInternalV1().root.pending).toBeNull();
    expect(splashEntry.frame.sourceRevision).toBe(splashSourceRevision);

    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: splashEntry.frame,
      actionId: "ui.cancel",
    }))).toMatchObject({ kind: "applied" });
    expect(harness.session.getSnapshotInternalV1().root.current).toBe(splashEntry);
    expect(harness.session.getSnapshotInternalV1().root.pending?.renderEntry.rootKind).toBe(
      "title",
    );
    const titleEntry = settleRootReadyV1(harness);
    expect(titleEntry.rootKind).toBe("title");

    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: titleEntry.frame,
      actionId: "whole-canvas.title.continue",
    }))).toMatchObject({ kind: "applied" });
    expect(harness.session.getSnapshotInternalV1().root.current).toBe(titleEntry);
    expect(harness.session.getSnapshotInternalV1().root.pending?.renderEntry.target).toEqual(
      storyB,
    );
    const storyEntry = settleRootReadyV1(harness);
    expect(storyEntry.rootKind).toBe("primary");
    expect(storyEntry.target).toEqual(storyB);

    expect(harness.session.reconcileRootInternalV1(aggregateV1({}))).toMatchObject({
      kind: "applied",
    });
    expect(harness.session.getSnapshotInternalV1().root.current).toBeNull();
  });

  it("keeps stable target equivalence and never reuses a closed occurrence", () => {
    const harness = harnessV1();
    const a = targetV1("test.whole-canvas.a", Object.freeze({ z: 2, a: true }));
    installResolutionV1(harness, "primary", a.targetId, resolvedV1({ targetId: a.targetId }));
    expect(harness.session.reconcileRootInternalV1(desiredV1(a))).toMatchObject({
      kind: "applied",
    });
    const first = settleRootReadyV1(harness);

    const canonicalEqual = targetV1(
      "test.whole-canvas.a",
      Object.freeze({ a: true, z: 2 }),
    );
    expect(harness.session.reconcileRootInternalV1(desiredV1(canonicalEqual))).toMatchObject({
      kind: "unchanged",
    });
    expect(harness.session.getSnapshotInternalV1().root.current).toBe(first);

    const b = targetV1("test.whole-canvas.b");
    installResolutionV1(harness, "primary", b.targetId, resolvedV1({ targetId: b.targetId }));
    expect(harness.session.reconcileRootInternalV1(desiredV1(b))).toMatchObject({
      kind: "applied",
    });
    expect(harness.session.getSnapshotInternalV1().root.current).toBe(first);
    const second = settleRootReadyV1(harness);
    expect(second.frame.primaryTargetOccurrenceId).not.toBe(
      first.frame.primaryTargetOccurrenceId,
    );
    expect(second.frame.primaryInstanceId).not.toBe(first.frame.primaryInstanceId);

    expect(harness.session.reconcileRootInternalV1(null)).toMatchObject({ kind: "applied" });
    expect(harness.session.getSnapshotInternalV1().root.current).toBeNull();
    expect(harness.session.reconcileRootInternalV1(desiredV1(a))).toMatchObject({
      kind: "applied",
    });
    const reopened = settleRootReadyV1(harness);
    expect(reopened.frame.primaryTargetOccurrenceId).not.toBe(
      first.frame.primaryTargetOccurrenceId,
    );
    expect(reopened.frame.primaryInstanceId).not.toBe(first.frame.primaryInstanceId);
  });

  it("refreshes initial and replacement pending roots without rerunning their preparation", () => {
    const harness = harnessV1();
    const a = targetV1("test.whole-canvas.a");
    installResolutionV1(
      harness,
      "primary",
      a.targetId,
      resolvedV1({ targetId: a.targetId, version: 1 }),
    );
    expect(harness.session.reconcileRootInternalV1(desiredV1(a))).toMatchObject({
      kind: "applied",
    });
    const initialPending = harness.session.getSnapshotInternalV1().root.pending!;

    installResolutionV1(
      harness,
      "primary",
      a.targetId,
      resolvedV1({ targetId: a.targetId, version: 2 }),
    );
    expect(harness.session.reconcileRootInternalV1(desiredV1(a))).toMatchObject({
      kind: "applied",
    });
    const refreshedInitial = harness.session.getSnapshotInternalV1().root.pending!;
    expect(refreshedInitial.preparation).toBe(initialPending.preparation);
    expect(refreshedInitial.renderEntry.frame.primaryTargetOccurrenceId).toBe(
      initialPending.renderEntry.frame.primaryTargetOccurrenceId,
    );
    expect(refreshedInitial.renderEntry.frame.primaryInstanceId).toBe(
      initialPending.renderEntry.frame.primaryInstanceId,
    );
    expect(refreshedInitial.renderEntry.frame.sourceRevision).toBe(
      initialPending.renderEntry.frame.sourceRevision + 1,
    );
    expect(refreshedInitial.renderEntry.resolved.view).toEqual({ version: 2 });
    const currentA = settleRootReadyV1(harness);
    expect(currentA.resolved.view).toEqual({ version: 2 });

    const b = targetV1("test.whole-canvas.b");
    installResolutionV1(
      harness,
      "primary",
      b.targetId,
      resolvedV1({ targetId: b.targetId, version: 1 }),
    );
    expect(harness.session.reconcileRootInternalV1(desiredV1(b))).toMatchObject({
      kind: "applied",
    });
    const replacementPending = harness.session.getSnapshotInternalV1().root.pending!;
    installResolutionV1(
      harness,
      "primary",
      b.targetId,
      resolvedV1({ targetId: b.targetId, version: 2 }),
    );
    expect(harness.session.reconcileRootInternalV1(desiredV1(b))).toMatchObject({
      kind: "applied",
    });
    const refreshedReplacement = harness.session.getSnapshotInternalV1().root.pending!;
    expect(refreshedReplacement.preparation).toBe(replacementPending.preparation);
    expect(refreshedReplacement.renderEntry.frame.primaryTargetOccurrenceId).toBe(
      replacementPending.renderEntry.frame.primaryTargetOccurrenceId,
    );
    expect(refreshedReplacement.renderEntry.frame.primaryInstanceId).toBe(
      replacementPending.renderEntry.frame.primaryInstanceId,
    );
    expect(harness.session.getSnapshotInternalV1().root.current).toBe(currentA);
    expect(harness.session.isFrameCurrentInternalV1(currentA.frame)).toBe(true);
    const currentB = settleRootReadyV1(harness);
    expect(currentB.resolved.view).toEqual({ version: 2 });
  });

  it("publishes exact view and action churn deltas while retaining occurrence and instance", () => {
    const harness = harnessV1({
      catalog: Object.freeze([
        catalogRowV1({
          targetId: "test.whole-canvas.a",
          placements: ["primary"],
          actionIds: ["test.action.run"],
        }),
      ]),
    });
    const action = ownerActionV1("test.action.run", { version: 1 });
    const first = openRootV1(
      harness,
      "test.whole-canvas.a",
      resolvedV1({ targetId: "test.whole-canvas.a", actions: [action] }),
    );
    const capturedPointerActivation = Object.freeze({
      frame: first.frame,
      actionId: "test.action.run",
    });

    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        version: 2,
        actions: [action],
      }),
    );
    expect(
      harness.session.reconcileRootInternalV1(
        desiredV1(targetV1("test.whole-canvas.a")),
      ),
    ).toMatchObject({ kind: "applied" });
    const viewCurrent = harness.session.getSnapshotInternalV1().root.current!;
    expect(viewCurrent).not.toBe(first);
    expect(viewCurrent.frame.sourceRevision).toBe(first.frame.sourceRevision + 1);
    expect(viewCurrent.frame.surfacePublicationRevision).toBe(
      first.frame.surfacePublicationRevision + 1,
    );
    expect(viewCurrent.frame.surfaceTopologyRevision).toBe(
      first.frame.surfaceTopologyRevision,
    );
    expect(viewCurrent.frame.inputPublicationRevision).toBe(
      first.frame.inputPublicationRevision,
    );
    expect(viewCurrent.frame.primaryTargetOccurrenceId).toBe(
      first.frame.primaryTargetOccurrenceId,
    );
    expect(viewCurrent.frame.primaryInstanceId).toBe(first.frame.primaryInstanceId);
    expect(Object.isFrozen(viewCurrent.frame)).toBe(true);
    expect(Reflect.ownKeys(viewCurrent.frame)).toEqual([
      "applicationEpoch",
      "sourceRevision",
      "primaryTargetOccurrenceId",
      "primaryInstanceId",
      "detailTargetOccurrenceId",
      "detailInstanceId",
      "surfacePublicationRevision",
      "surfaceTopologyRevision",
      "inputPublicationRevision",
      "hostGeneration",
    ]);
    expect(harness.session.dispatchActionInternalV1(capturedPointerActivation)).toMatchObject({
      kind: "stale",
    });
    expect(harness.dispatchOwner).not.toHaveBeenCalled();

    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        version: 2,
        actions: [ownerActionV1("test.action.run", { version: 2 })],
      }),
    );
    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.a")),
    )).toMatchObject({ kind: "applied" });
    const actionCurrent = harness.session.getSnapshotInternalV1().root.current!;
    expect(actionCurrent.frame.sourceRevision).toBe(viewCurrent.frame.sourceRevision + 1);
    expect(actionCurrent.frame.surfacePublicationRevision).toBe(
      viewCurrent.frame.surfacePublicationRevision + 1,
    );
    expect(actionCurrent.frame.surfaceTopologyRevision).toBe(
      viewCurrent.frame.surfaceTopologyRevision + 1,
    );
    expect(actionCurrent.frame.inputPublicationRevision).toBe(
      viewCurrent.frame.inputPublicationRevision + 1,
    );
    expect(actionCurrent.frame.primaryTargetOccurrenceId).toBe(
      first.frame.primaryTargetOccurrenceId,
    );
    expect(actionCurrent.frame.primaryInstanceId).toBe(first.frame.primaryInstanceId);
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: viewCurrent.frame,
      actionId: "test.action.run",
    }))).toMatchObject({ kind: "stale" });
  });

  it("enforces one exact-parent detail through open, equal, replace, close, and primary cascade", () => {
    const harness = harnessV1({
      catalog: Object.freeze([
        catalogRowV1({
          targetId: "test.whole-canvas.a",
          placements: ["primary"],
          actionIds: ["test.action.open-detail"],
        }),
        catalogRowV1({ targetId: "test.whole-canvas.b", placements: ["primary"] }),
        catalogRowV1({
          targetId: "test.whole-canvas.detail-d",
          placements: ["detail"],
          actionIds: ["test.action.open-same-detail", "test.action.open-next-detail"],
        }),
        catalogRowV1({
          targetId: "test.whole-canvas.detail-e",
          placements: ["detail"],
          actionIds: ["test.action.open-self-detail"],
        }),
      ]),
    });
    const detailD = targetV1("test.whole-canvas.detail-d");
    const root = openRootV1(
      harness,
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        actions: [openDetailActionV1("test.action.open-detail", detailD)],
      }),
    );
    installResolutionV1(
      harness,
      "detail",
      detailD.targetId,
      resolvedV1({
        targetId: detailD.targetId,
        actions: [
          openDetailActionV1("test.action.open-same-detail", detailD),
          openDetailActionV1(
            "test.action.open-next-detail",
            targetV1("test.whole-canvas.detail-e"),
          ),
        ],
      }),
    );
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: root.frame,
      actionId: "test.action.open-detail",
    }))).toMatchObject({ kind: "applied" });
    const firstDetail = settleDetailReadyV1(harness);
    expect(firstDetail.frame.primaryTargetOccurrenceId).toBe(
      root.frame.primaryTargetOccurrenceId,
    );
    expect(firstDetail.frame.primaryInstanceId).toBe(root.frame.primaryInstanceId);
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: root.frame,
      actionId: "test.action.open-detail",
    }))).toMatchObject({ kind: "stale" });

    installResolutionV1(
      harness,
      "detail",
      detailD.targetId,
      resolvedV1({
        targetId: detailD.targetId,
        version: 2,
        actions: [
          openDetailActionV1("test.action.open-same-detail", detailD),
          openDetailActionV1(
            "test.action.open-next-detail",
            targetV1("test.whole-canvas.detail-e"),
          ),
        ],
      }),
    );
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        version: 2,
        actions: [openDetailActionV1("test.action.open-detail", detailD)],
      }),
    );
    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.a")),
    )).toMatchObject({ kind: "applied" });
    let refreshedDetail = harness.session.getSnapshotInternalV1().detail.current!;
    expect(refreshedDetail.resolved.view).toEqual({ version: 2 });
    expect(refreshedDetail.frame.primaryTargetOccurrenceId).toBe(
      firstDetail.frame.primaryTargetOccurrenceId,
    );
    expect(refreshedDetail.frame.primaryInstanceId).toBe(firstDetail.frame.primaryInstanceId);
    expect(refreshedDetail.frame.detailTargetOccurrenceId).toBe(
      firstDetail.frame.detailTargetOccurrenceId,
    );
    expect(refreshedDetail.frame.detailInstanceId).toBe(firstDetail.frame.detailInstanceId);
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: firstDetail.frame,
      actionId: "test.action.open-next-detail",
    }))).toMatchObject({ kind: "stale" });

    installResolutionV1(
      harness,
      "detail",
      detailD.targetId,
      resolvedV1({
        targetId: detailD.targetId,
        version: 3,
        actions: [
          openDetailActionV1("test.action.open-same-detail", detailD),
          openDetailActionV1(
            "test.action.open-next-detail",
            targetV1(
              "test.whole-canvas.detail-e",
              Object.freeze({ variant: 2 }),
            ),
          ),
        ],
      }),
    );
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: refreshedDetail.frame,
      actionId: "test.action.open-same-detail",
    }))).toMatchObject({ kind: "applied" });
    const directlyRefreshedDetail = harness.session.getSnapshotInternalV1().detail.current!;
    expect(directlyRefreshedDetail.resolved.view).toEqual({ version: 3 });
    expect(directlyRefreshedDetail.frame.detailTargetOccurrenceId).toBe(
      refreshedDetail.frame.detailTargetOccurrenceId,
    );
    expect(directlyRefreshedDetail.frame.detailInstanceId).toBe(
      refreshedDetail.frame.detailInstanceId,
    );
    expect(directlyRefreshedDetail.frame.surfacePublicationRevision).toBe(
      refreshedDetail.frame.surfacePublicationRevision + 1,
    );
    expect(directlyRefreshedDetail.frame.sourceRevision).toBe(
      refreshedDetail.frame.sourceRevision + 1,
    );
    expect(harness.session.getSnapshotInternalV1().root.current?.frame.sourceRevision).toBe(
      directlyRefreshedDetail.frame.sourceRevision,
    );
    expect(directlyRefreshedDetail.frame.surfaceTopologyRevision).toBe(
      refreshedDetail.frame.surfaceTopologyRevision + 1,
    );
    expect(directlyRefreshedDetail.frame.inputPublicationRevision).toBe(
      refreshedDetail.frame.inputPublicationRevision + 1,
    );
    refreshedDetail = directlyRefreshedDetail;

    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: refreshedDetail.frame,
      actionId: "test.action.open-same-detail",
    }))).toMatchObject({ kind: "unchanged" });
    expect(harness.session.getSnapshotInternalV1().detail.current).toBe(refreshedDetail);

    const detailE = targetV1("test.whole-canvas.detail-e");
    installResolutionV1(
      harness,
      "detail",
      detailE.targetId,
      resolvedV1({
        targetId: detailE.targetId,
        actions: [openDetailActionV1("test.action.open-self-detail", detailE)],
      }),
    );
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: refreshedDetail.frame,
      actionId: "test.action.open-next-detail",
    }))).toMatchObject({ kind: "applied" });
    expect(harness.session.getSnapshotInternalV1().detail.current).toBeNull();
    let secondDetail = settleDetailReadyV1(harness);
    expect(secondDetail.frame.detailTargetOccurrenceId).not.toBe(
      refreshedDetail.frame.detailTargetOccurrenceId,
    );
    expect(secondDetail.frame.detailInstanceId).not.toBe(refreshedDetail.frame.detailInstanceId);

    for (const kind of ["back", "escape", "backdrop", "routed_cancel"] as const) {
      expect(harness.session.dismissInternalV1(Object.freeze({
        frame: secondDetail.frame,
        kind,
      }))).toMatchObject({ kind: "applied" });
      expect(harness.session.getSnapshotInternalV1().detail.current).toBeNull();
      const resumedRoot = harness.session.getSnapshotInternalV1().root.current!;
      expect(resumedRoot.frame.primaryInstanceId).toBe(root.frame.primaryInstanceId);
      expect(harness.session.dispatchActionInternalV1(Object.freeze({
        frame: root.frame,
        actionId: "test.action.open-detail",
      }))).toMatchObject({ kind: "stale" });
      expect(harness.session.dispatchActionInternalV1(Object.freeze({
        frame: resumedRoot.frame,
        actionId: "test.action.open-detail",
      }))).toMatchObject({ kind: "applied" });
      const reopened = settleDetailReadyV1(harness);
      expect(reopened.frame.detailTargetOccurrenceId).not.toBe(
        secondDetail.frame.detailTargetOccurrenceId,
      );
      secondDetail = reopened;
    }

    const b = targetV1("test.whole-canvas.b");
    installResolutionV1(harness, "primary", b.targetId, resolvedV1({ targetId: b.targetId }));
    installResolutionV1(
      harness,
      "detail",
      detailD.targetId,
      resolvedV1({
        targetId: detailD.targetId,
        version: 4,
        actions: [
          openDetailActionV1("test.action.open-same-detail", detailD),
          openDetailActionV1(
            "test.action.open-next-detail",
            targetV1("test.whole-canvas.detail-e"),
          ),
        ],
      }),
    );
    expect(harness.session.reconcileRootInternalV1(desiredV1(b))).toMatchObject({
      kind: "applied",
    });
    const pendingB = harness.session.getSnapshotInternalV1().root.pending;
    expect(harness.session.getSnapshotInternalV1().root.current?.target.targetId).toBe(
      "test.whole-canvas.a",
    );
    expect(harness.session.getSnapshotInternalV1().detail.current).toBe(secondDetail);
    expect(harness.session.isFrameCurrentInternalV1(secondDetail.frame)).toBe(true);
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: secondDetail.frame,
      actionId: "test.action.open-same-detail",
    }))).toMatchObject({ kind: "unchanged" });
    expect(harness.session.getSnapshotInternalV1().detail.current).toBe(secondDetail);
    expect(harness.session.getSnapshotInternalV1().root.pending).toBe(pendingB);
    settleRootReadyV1(harness);
    expect(harness.session.getSnapshotInternalV1().detail.current).toBeNull();
    expect(harness.session.dismissInternalV1(Object.freeze({
      frame: secondDetail.frame,
      kind: "back",
    }))).toMatchObject({ kind: "stale" });
  });

  it("opens a claimant-bound detail from a retained root and cascades it at replacement cutover", () => {
    const detailTarget = targetV1("test.whole-canvas.detail");
    const harness = harnessV1({
      catalog: Object.freeze([
        catalogRowV1({
          targetId: "test.whole-canvas.a",
          placements: ["primary"],
          actionIds: ["test.action.open-detail"],
        }),
        catalogRowV1({ targetId: "test.whole-canvas.b", placements: ["primary"] }),
        catalogRowV1({ targetId: detailTarget.targetId, placements: ["detail"] }),
      ]),
    });
    const currentA = openRootV1(
      harness,
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        actions: [openDetailActionV1("test.action.open-detail", detailTarget)],
      }),
    );
    installResolutionV1(
      harness,
      "detail",
      detailTarget.targetId,
      resolvedV1({ targetId: detailTarget.targetId }),
    );
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.b",
      resolvedV1({ targetId: "test.whole-canvas.b" }),
    );

    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.b")),
    )).toMatchObject({ kind: "applied" });
    const pendingB = harness.session.getSnapshotInternalV1().root.pending!;
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: currentA.frame,
      actionId: "test.action.open-detail",
    }))).toMatchObject({ kind: "applied" });
    const retainedDetail = settleDetailReadyV1(harness);
    expect(harness.session.getSnapshotInternalV1().root.current?.target.targetId).toBe(
      "test.whole-canvas.a",
    );
    expect(harness.session.getSnapshotInternalV1().root.pending).toBe(pendingB);
    expect(retainedDetail.target).toEqual(detailTarget);

    expect(harness.session.settleReadinessReadyInternalV1(pendingB.preparation)).toMatchObject({
      kind: "applied",
    });
    expect(harness.session.getSnapshotInternalV1().root.current?.target.targetId).toBe(
      "test.whole-canvas.b",
    );
    expect(harness.session.getSnapshotInternalV1().detail.current).toBeNull();
    expect(harness.session.dismissInternalV1(Object.freeze({
      frame: retainedDetail.frame,
      kind: "back",
    }))).toMatchObject({ kind: "stale" });
  });

  it("refreshes a pending detail projection in place with its current root source", () => {
    const detailTarget = targetV1("test.whole-canvas.detail");
    const harness = harnessV1({
      catalog: Object.freeze([
        catalogRowV1({
          targetId: "test.whole-canvas.a",
          placements: ["primary"],
          actionIds: ["test.action.open-detail"],
        }),
        catalogRowV1({
          targetId: detailTarget.targetId,
          placements: ["detail"],
          actionIds: ["test.action.pending-owner"],
        }),
      ]),
    });
    const rootTarget = targetV1("test.whole-canvas.a");
    const root = openRootV1(
      harness,
      rootTarget.targetId,
      resolvedV1({
        targetId: rootTarget.targetId,
        version: 1,
        actions: [openDetailActionV1("test.action.open-detail", detailTarget)],
      }),
    );
    installResolutionV1(
      harness,
      "detail",
      detailTarget.targetId,
      resolvedV1({
        targetId: detailTarget.targetId,
        version: 1,
        actions: [ownerActionV1("test.action.pending-owner", { version: 1 })],
      }),
    );
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: root.frame,
      actionId: "test.action.open-detail",
    }))).toMatchObject({ kind: "applied" });
    const pending = harness.session.getSnapshotInternalV1().detail.pending!;

    installResolutionV1(
      harness,
      "primary",
      rootTarget.targetId,
      resolvedV1({
        targetId: rootTarget.targetId,
        version: 2,
        actions: [openDetailActionV1("test.action.open-detail", detailTarget)],
      }),
    );
    installResolutionV1(
      harness,
      "detail",
      detailTarget.targetId,
      resolvedV1({
        targetId: detailTarget.targetId,
        version: 2,
        actions: [ownerActionV1("test.action.pending-owner", { version: 2 })],
      }),
    );
    expect(harness.session.reconcileRootInternalV1(desiredV1(rootTarget))).toMatchObject({
      kind: "applied",
    });
    const refreshed = harness.session.getSnapshotInternalV1().detail.pending!;
    expect(refreshed.preparation).toBe(pending.preparation);
    expect(refreshed.renderEntry.frame.detailTargetOccurrenceId).toBe(
      pending.renderEntry.frame.detailTargetOccurrenceId,
    );
    expect(refreshed.renderEntry.frame.detailInstanceId).toBe(
      pending.renderEntry.frame.detailInstanceId,
    );
    expect(refreshed.renderEntry.frame.sourceRevision).toBe(
      pending.renderEntry.frame.sourceRevision + 1,
    );
    expect(refreshed.renderEntry.frame.surfacePublicationRevision).toBe(
      pending.renderEntry.frame.surfacePublicationRevision + 1,
    );
    expect(refreshed.renderEntry.frame.surfaceTopologyRevision).toBe(
      pending.renderEntry.frame.surfaceTopologyRevision,
    );
    expect(refreshed.renderEntry.frame.inputPublicationRevision).toBe(
      pending.renderEntry.frame.inputPublicationRevision,
    );
    expect(refreshed.renderEntry.resolved.view).toEqual({ version: 2 });

    expect(harness.session.settleReadinessReadyInternalV1(pending.preparation)).toMatchObject({
      kind: "applied",
    });
    const current = harness.session.getSnapshotInternalV1().detail.current!;
    expect(current.resolved.view).toEqual({ version: 2 });
    expect(current.frame.sourceRevision).toBe(refreshed.renderEntry.frame.sourceRevision);
    expect(current.frame.detailTargetOccurrenceId).toBe(
      pending.renderEntry.frame.detailTargetOccurrenceId,
    );
    expect(current.frame.detailInstanceId).toBe(pending.renderEntry.frame.detailInstanceId);
  });

  it("handles initial, replacement, and detail readiness failure, cancel, and retry", () => {
    const initialCancel = harnessV1();
    installResolutionV1(
      initialCancel,
      "primary",
      "test.whole-canvas.a",
      resolvedV1({ targetId: "test.whole-canvas.a" }),
    );
    expect(initialCancel.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.a")),
    )).toMatchObject({ kind: "applied" });
    const cancelledInitial = initialCancel.session.getSnapshotInternalV1().root.pending!
      .preparation;
    expect(initialCancel.session.cancelReadinessInternalV1(cancelledInitial)).toMatchObject({
      kind: "faulted",
    });
    expect(initialCancel.session.getSnapshotInternalV1().root.current).toBeNull();
    expect(initialCancel.session.getSnapshotInternalV1().root.failure).not.toBeNull();

    const initial = harnessV1();
    installResolutionV1(
      initial,
      "primary",
      "test.whole-canvas.a",
      resolvedV1({ targetId: "test.whole-canvas.a" }),
    );
    expect(initial.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.a")),
    )).toMatchObject({ kind: "applied" });
    const firstPreparation = initial.session.getSnapshotInternalV1().root.pending!.preparation;
    expect(initial.session.settleReadinessFailedInternalV1(firstPreparation)).toMatchObject({
      kind: "faulted",
    });
    expect(initial.session.getSnapshotInternalV1().root.failure).not.toBeNull();
    expect(initial.session.retryCurrentInternalV1()).toMatchObject({ kind: "applied" });
    const retryPreparation = initial.session.getSnapshotInternalV1().root.pending!.preparation;
    expect(retryPreparation).not.toBe(firstPreparation);
    expect(initial.session.settleReadinessReadyInternalV1(firstPreparation)).toMatchObject({
      kind: "stale",
    });
    const a = settleRootReadyV1(initial);

    installResolutionV1(
      initial,
      "primary",
      "test.whole-canvas.b",
      resolvedV1({ targetId: "test.whole-canvas.b" }),
    );
    expect(initial.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.b")),
    )).toMatchObject({ kind: "applied" });
    const replacement = initial.session.getSnapshotInternalV1().root.pending!.preparation;
    expect(initial.session.cancelReadinessInternalV1(replacement)).toMatchObject({
      kind: "faulted",
    });
    expect(initial.session.getSnapshotInternalV1().root.current).toBe(a);
    expect(initial.session.retryCurrentInternalV1()).toMatchObject({ kind: "applied" });
    const b = settleRootReadyV1(initial);

    expect(initial.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.a")),
    )).toMatchObject({ kind: "applied" });
    const failedReplacement = initial.session.getSnapshotInternalV1().root.pending!.preparation;
    expect(initial.session.settleReadinessFailedInternalV1(failedReplacement)).toMatchObject({
      kind: "faulted",
    });
    expect(initial.session.getSnapshotInternalV1().root.current).toBe(b);
    expect(initial.session.getSnapshotInternalV1().root.current!.frame.primaryInstanceId).toBe(
      b.frame.primaryInstanceId,
    );

    const detailHarness = harnessV1({
      catalog: Object.freeze([
        catalogRowV1({
          targetId: "test.whole-canvas.a",
          placements: ["primary"],
          actionIds: ["test.action.open-detail"],
        }),
        catalogRowV1({ targetId: "test.whole-canvas.detail", placements: ["detail"] }),
      ]),
    });
    const detail = targetV1("test.whole-canvas.detail");
    const detailRoot = openRootV1(
      detailHarness,
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        actions: [openDetailActionV1("test.action.open-detail", detail)],
      }),
    );
    installResolutionV1(
      detailHarness,
      "detail",
      detail.targetId,
      resolvedV1({ targetId: detail.targetId }),
    );
    expect(detailHarness.session.dispatchActionInternalV1(Object.freeze({
      frame: detailRoot.frame,
      actionId: "test.action.open-detail",
    }))).toMatchObject({ kind: "applied" });
    const detailPreparation = detailHarness.session.getSnapshotInternalV1().detail.pending!
      .preparation;
    expect(detailHarness.session.cancelReadinessInternalV1(detailPreparation)).toMatchObject({
      kind: "faulted",
    });
    expect(detailHarness.session.getSnapshotInternalV1().detail.failure).not.toBeNull();
    expect(detailHarness.session.retryCurrentInternalV1()).toMatchObject({ kind: "applied" });
    const detailRetry = detailHarness.session.getSnapshotInternalV1().detail.pending!.preparation;
    expect(detailRetry).not.toBe(detailPreparation);
    expect(detailHarness.session.settleReadinessReadyInternalV1(detailPreparation)).toMatchObject({
      kind: "stale",
    });
    const readyDetail = settleDetailReadyV1(detailHarness);
    expect(detailHarness.session.dismissInternalV1(Object.freeze({
      frame: readyDetail.frame,
      kind: "back",
    }))).toMatchObject({ kind: "applied" });
    const resumedRoot = detailHarness.session.getSnapshotInternalV1().root.current!;
    expect(detailHarness.session.dispatchActionInternalV1(Object.freeze({
      frame: resumedRoot.frame,
      actionId: "test.action.open-detail",
    }))).toMatchObject({ kind: "applied" });
    const failedDetail = detailHarness.session.getSnapshotInternalV1().detail.pending!.preparation;
    expect(detailHarness.session.settleReadinessFailedInternalV1(failedDetail)).toMatchObject({
      kind: "faulted",
    });
    expect(detailHarness.session.getSnapshotInternalV1().root.current!.frame.primaryInstanceId)
      .toBe(resumedRoot.frame.primaryInstanceId);
    expect(detailHarness.session.getSnapshotInternalV1().detail.current).toBeNull();
    expect(detailHarness.session.retryCurrentInternalV1()).toMatchObject({ kind: "applied" });
    settleDetailReadyV1(detailHarness);
  });

  it("keeps a failed replacement predecessor actionable and rotates it on retry", () => {
    const detailTarget = targetV1("test.whole-canvas.detail");
    const harness = harnessV1({
      catalog: Object.freeze([
        catalogRowV1({
          targetId: "test.whole-canvas.a",
          placements: ["primary"],
          actionIds: ["test.action.owner", "test.action.open-detail"],
        }),
        catalogRowV1({ targetId: "test.whole-canvas.b", placements: ["primary"] }),
        catalogRowV1({ targetId: detailTarget.targetId, placements: ["detail"] }),
      ]),
    });
    const currentA = openRootV1(
      harness,
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        actions: [
          ownerActionV1("test.action.owner"),
          openDetailActionV1("test.action.open-detail", detailTarget),
        ],
      }),
    );
    installResolutionV1(
      harness,
      "detail",
      detailTarget.targetId,
      resolvedV1({ targetId: detailTarget.targetId }),
    );
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.b",
      resolvedV1({ targetId: "test.whole-canvas.b" }),
    );

    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.b")),
    )).toMatchObject({ kind: "applied" });
    const failedPreparation = harness.session.getSnapshotInternalV1().root.pending!.preparation;
    expect(harness.session.settleReadinessFailedInternalV1(failedPreparation)).toMatchObject({
      kind: "faulted",
    });
    expect(harness.session.getSnapshotInternalV1().root.current).toBe(currentA);
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: currentA.frame,
      actionId: "test.action.owner",
    }))).toMatchObject({ kind: "applied" });
    expect(harness.dispatchOwner).toHaveBeenCalledOnce();
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: currentA.frame,
      actionId: "test.action.open-detail",
    }))).toMatchObject({ kind: "applied" });
    const detail = settleDetailReadyV1(harness);
    expect(harness.session.dismissInternalV1(Object.freeze({
      frame: detail.frame,
      kind: "back" as const,
    }))).toMatchObject({ kind: "applied" });
    const failedA = harness.session.getSnapshotInternalV1().root.current!;

    expect(harness.session.retryCurrentInternalV1()).toMatchObject({ kind: "applied" });
    const retry = harness.session.getSnapshotInternalV1();
    expect(retry.root.pending!.preparation).not.toBe(failedPreparation);
    expect(retry.root.current!.frame.primaryInstanceId).toBe(
      failedA.frame.primaryInstanceId,
    );
    expect(retry.root.current!.frame).not.toBe(failedA.frame);
    expect(harness.session.isFrameCurrentInternalV1(failedA.frame)).toBe(false);
    expect(harness.session.isFrameCurrentInternalV1(retry.root.current!.frame)).toBe(true);
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: failedA.frame,
      actionId: "test.action.owner",
    }))).toMatchObject({ kind: "stale" });
    expect(harness.dispatchOwner).toHaveBeenCalledOnce();
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: retry.root.current!.frame,
      actionId: "test.action.owner",
    }))).toMatchObject({ kind: "applied" });
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(2);

    expect(harness.session.settleReadinessReadyInternalV1(
      retry.root.pending!.preparation,
    )).toMatchObject({ kind: "applied" });
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: retry.root.current!.frame,
      actionId: "test.action.owner",
    }))).toMatchObject({ kind: "stale" });
    expect(harness.session.isFrameCurrentInternalV1(retry.root.current!.frame)).toBe(false);

    const closeHarness = harnessV1({
      catalog: Object.freeze([
        catalogRowV1({
          targetId: "test.whole-canvas.a",
          placements: ["primary"],
          actionIds: ["test.action.owner"],
        }),
        catalogRowV1({ targetId: "test.whole-canvas.b", placements: ["primary"] }),
      ]),
    });
    const closeA = openRootV1(
      closeHarness,
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        actions: [ownerActionV1("test.action.owner")],
      }),
    );
    installResolutionV1(
      closeHarness,
      "primary",
      "test.whole-canvas.b",
      resolvedV1({ targetId: "test.whole-canvas.b" }),
    );
    expect(closeHarness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.b")),
    )).toMatchObject({ kind: "applied" });
    const closeFailure = closeHarness.session.getSnapshotInternalV1().root.pending!.preparation;
    expect(closeHarness.session.settleReadinessFailedInternalV1(closeFailure)).toMatchObject({
      kind: "faulted",
    });
    expect(closeHarness.session.reconcileRootInternalV1(null)).toMatchObject({ kind: "applied" });
    expect(closeHarness.session.dispatchActionInternalV1(Object.freeze({
      frame: closeA.frame,
      actionId: "test.action.owner",
    }))).toMatchObject({ kind: "stale" });
    expect(closeHarness.dispatchOwner).not.toHaveBeenCalled();
    expect(closeHarness.session.isFrameCurrentInternalV1(closeA.frame)).toBe(false);
    expect(closeHarness.session.retryCurrentInternalV1()).toMatchObject({ kind: "unchanged" });
  });

  it("routes current/default actions, rejects disabled actions, and consumes primary cancel", async () => {
    const harness = harnessV1({
      catalog: Object.freeze([
        catalogRowV1({
          targetId: "test.whole-canvas.a",
          placements: ["primary"],
          actionIds: ["test.action.enabled", "test.action.disabled"],
          defaultActionId: "test.action.enabled",
        }),
      ]),
    });
    const enabled = ownerActionV1("test.action.enabled", { command: "run" });
    const disabled = Object.freeze({
      actionId: "test.action.disabled",
      status: "disabled" as const,
      reasonTextIds: Object.freeze(["text.reason.disabled"]),
      intent: Object.freeze({ kind: "back" as const }),
    });
    const frame = openRootV1(
      harness,
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        actions: [enabled, disabled],
      }),
    );

    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: frame.frame,
      actionId: "ui.confirm",
    }))).toMatchObject({ kind: "applied" });
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(1);
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: frame.frame,
      actionId: "test.action.disabled",
    }))).toMatchObject({ kind: "rejected" });
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: frame.frame,
      actionId: "test.action.unknown",
    }))).toMatchObject({ kind: "rejected" });
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: frame.frame,
      actionId: "ui.cancel",
    }))).toMatchObject({ kind: "unchanged" });
    expect(harness.session.getSnapshotInternalV1().root.current).toBe(frame);
    await Promise.resolve();
  });

  it("aliases detail confirm to the current detail catalog default", () => {
    const detailTarget = targetV1("test.whole-canvas.detail");
    const harness = harnessV1({
      catalog: Object.freeze([
        catalogRowV1({
          targetId: "test.whole-canvas.a",
          placements: ["primary"],
          actionIds: ["test.action.open-detail"],
        }),
        catalogRowV1({
          targetId: detailTarget.targetId,
          placements: ["detail"],
          actionIds: ["test.action.detail-default"],
          defaultActionId: "test.action.detail-default",
        }),
      ]),
    });
    const root = openRootV1(
      harness,
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        actions: [openDetailActionV1("test.action.open-detail", detailTarget)],
      }),
    );
    installResolutionV1(
      harness,
      "detail",
      detailTarget.targetId,
      resolvedV1({
        targetId: detailTarget.targetId,
        actions: [ownerActionV1("test.action.detail-default", { command: "detail" })],
      }),
    );
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: root.frame,
      actionId: "test.action.open-detail",
    }))).toMatchObject({ kind: "applied" });
    const detail = settleDetailReadyV1(harness);

    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: detail.frame,
      actionId: "ui.confirm",
    }))).toMatchObject({ kind: "applied" });
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(1);
    expect(harness.dispatchOwner).toHaveBeenLastCalledWith(expect.objectContaining({
      placement: "detail",
      actionId: "test.action.detail-default",
    }));
  });

  it("allows one owner effect to reconcile synchronously and ignores late completion", async () => {
    const harness = harnessV1({
      catalog: Object.freeze([
        catalogRowV1({
          targetId: "test.whole-canvas.a",
          placements: ["primary"],
          actionIds: ["test.action.owner"],
        }),
        catalogRowV1({ targetId: "test.whole-canvas.b", placements: ["primary"] }),
      ]),
    });
    const current = openRootV1(
      harness,
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        actions: [ownerActionV1("test.action.owner", { command: "replace" })],
      }),
    );
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.b",
      resolvedV1({ targetId: "test.whole-canvas.b" }),
    );
    let nestedResult: unknown = null;
    let settleOwner!: () => void;
    const ownerCompletion = new Promise<void>((resolve) => {
      settleOwner = resolve;
    });
    harness.dispatchOwner.mockImplementation(() => {
      nestedResult = harness.session.reconcileRootInternalV1(
        desiredV1(targetV1("test.whole-canvas.b")),
      );
      return ownerCompletion;
    });

    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: current.frame,
      actionId: "test.action.owner",
    }))).toMatchObject({ kind: "applied" });
    expect(nestedResult).toMatchObject({ kind: "applied" });
    expect(harness.session.getSnapshotInternalV1().root.current).toBe(current);
    const replacement = settleRootReadyV1(harness);
    settleOwner();
    await ownerCompletion;
    await Promise.resolve();
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(1);
    expect(harness.session.getSnapshotInternalV1().root.current).toBe(replacement);
  });

  it("atomically gates every Host-visible successor and carries only prepared host generations", () => {
    const host = hostCommitHarnessV1();
    const harness = harnessV1({ hostCommitPortInternalV1: host.port });
    const completeSnapshots: ReturnType<
      typeof harness.session.getSnapshotInternalV1
    >[] = [];
    const prepareReentryResults: unknown[] = [];
    const commitReentryResults: unknown[] = [];
    let completeReentryAction: unknown = null;
    host.setPrepareEffect(() => {
      prepareReentryResults.push(harness.session.disposeInternalV1());
    });
    host.setCommitEffect(() => {
      commitReentryResults.push(harness.session.disposeInternalV1());
    });
    host.setCompleteEffect(() => {
      const observed = harness.session.getSnapshotInternalV1();
      completeSnapshots.push(observed);
      if (observed.root.current !== null && observed.root.pending === null) {
        completeReentryAction = harness.session.dispatchActionInternalV1(Object.freeze({
          frame: observed.root.current.frame,
          actionId: "ui.cancel",
        }));
      }
    });
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.a",
      resolvedV1({ targetId: "test.whole-canvas.a" }),
    );
    const before = harness.kernel.getStateInternalV1();
    harness.session.subscribeInternalV1(() => host.events.push("session.notify"));

    host.setCommitResult(false);
    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.a")),
    )).toMatchObject({ kind: "faulted" });
    expect(harness.kernel.getStateInternalV1()).toBe(before);
    expect(harness.session.getSnapshotInternalV1().root.pending).toBeNull();
    expect(host.abort).toHaveBeenCalledTimes(1);
    expect(host.complete).not.toHaveBeenCalled();
    expect(prepareReentryResults.at(-1)).toMatchObject({ kind: "stale" });
    expect(commitReentryResults.at(-1)).toMatchObject({ kind: "stale" });
    expect(harness.session.getSnapshotInternalV1().disposed).toBe(false);

    host.setCommitResult(true);
    host.events.length = 0;
    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.a")),
    )).toMatchObject({ kind: "applied" });
    const pending = harness.session.getSnapshotInternalV1().root.pending!;
    expect(completeSnapshots.at(-1)?.root.pending).toBe(pending);
    expect(host.requests.at(-1)).toMatchObject({
      kind: "root_admission",
      transition: "initial_open",
      currentRootFrame: null,
      currentDetailFrame: null,
    });
    expect(Object.isFrozen(host.requests.at(-1))).toBe(true);
    expect(host.complete).toHaveBeenCalledTimes(1);
    expect(host.events).toEqual(["host.commit", "session.notify"]);
    host.events.length = 0;
    expect(harness.session.settleReadinessReadyInternalV1(pending.preparation)).toMatchObject({
      kind: "applied",
    });
    const current = harness.session.getSnapshotInternalV1().root.current!;
    expect(completeSnapshots.at(-1)?.root.current).toBe(current);
    expect(completeReentryAction).toMatchObject({ kind: "stale" });
    expect(current.frame.hostGeneration).toBe(host.prepared.at(-1)!.hostGeneration);
    expect(host.requests.at(-1)).toMatchObject({
      kind: "root_readiness",
      outcome: "ready",
      preparation: pending.preparation,
    });
    expect(host.commitInputs.at(-1)).toEqual({
      contract: expect.any(Object),
      nextInputFrame: current.frame,
    });
    expect(host.commitInputs.at(-1)!.nextInputFrame!.hostGeneration).toBe(
      host.prepared.at(-1)!.hostGeneration,
    );
    expect(Object.isFrozen(host.commitInputs.at(-1))).toBe(true);
    expect(Reflect.ownKeys(host.commitInputs.at(-1)!)).toEqual([
      "contract",
      "nextInputFrame",
    ]);
    expect(host.events).toEqual(["host.commit", "session.notify"]);

    const accepted = harness.kernel.getStateInternalV1();
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.a",
      resolvedV1({ targetId: "test.whole-canvas.a", version: 2 }),
    );
    host.setCommitResult(false);
    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.a")),
    )).toMatchObject({ kind: "faulted" });
    expect(harness.kernel.getStateInternalV1()).toBe(accepted);
    expect(harness.session.getSnapshotInternalV1().root.current).toBe(current);

    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.b",
      resolvedV1({ targetId: "test.whole-canvas.b" }),
    );
    host.setCommitResult(true);
    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.b")),
    )).toMatchObject({ kind: "applied" });
    const replacement = settleRootReadyV1(harness);
    expect(replacement.frame.sourceRevision).toBe(current.frame.sourceRevision + 2);
    expect(replacement.frame.primaryTargetOccurrenceId).not.toBe(
      current.frame.primaryTargetOccurrenceId,
    );

    expect(harness.session.disposeInternalV1()).toMatchObject({ kind: "applied" });
    expect(host.terminalize).toHaveBeenCalledTimes(1);
    expect(harness.session.disposeInternalV1()).toMatchObject({ kind: "unchanged" });
    expect(host.terminalize).toHaveBeenCalledTimes(1);
  });

  it("flushes the captured listener vector before completing a historical Host install", () => {
    const host = hostCommitHarnessV1();
    const harness = harnessV1({ hostCommitPortInternalV1: host.port });
    for (const targetId of ["test.whole-canvas.a", "test.whole-canvas.b"]) {
      installResolutionV1(
        harness,
        "primary",
        targetId,
        resolvedV1({ targetId }),
      );
    }
    let nestedResult: unknown = null;
    let installedSuccessor = false;
    harness.session.subscribeInternalV1(() => {
      const pendingTargetId = harness.session.getSnapshotInternalV1().root.pending
        ?.renderEntry.target.targetId;
      if (!installedSuccessor && pendingTargetId === "test.whole-canvas.a") {
        installedSuccessor = true;
        nestedResult = harness.session.reconcileRootInternalV1(
          desiredV1(targetV1("test.whole-canvas.b")),
        );
      }
    });

    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.a")),
    )).toMatchObject({ kind: "applied" });
    expect(nestedResult).toMatchObject({ kind: "applied" });
    expect(harness.session.getSnapshotInternalV1().root.pending?.renderEntry.target.targetId)
      .toBe("test.whole-canvas.b");
    expect(host.completeGenerations).toEqual([2, 1]);
  });

  it("fences raw kernel transition reentry while allowing a staged family successor", () => {
    const host = hostCommitHarnessV1();
    const detailTarget = targetV1("test.whole-canvas.detail");
    const harness = harnessV1({
      hostCommitPortInternalV1: host.port,
      catalog: Object.freeze([
        catalogRowV1({ targetId: "test.whole-canvas.a", placements: ["primary"] }),
        catalogRowV1({
          targetId: "test.whole-canvas.b",
          placements: ["primary"],
          actionIds: ["test.action.open-detail"],
        }),
        catalogRowV1({ targetId: detailTarget.targetId, placements: ["detail"] }),
      ]),
    });
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.a",
      resolvedV1({ targetId: "test.whole-canvas.a" }),
    );
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.b",
      resolvedV1({
        targetId: "test.whole-canvas.b",
        actions: [openDetailActionV1("test.action.open-detail", detailTarget)],
      }),
    );
    installResolutionV1(
      harness,
      "detail",
      detailTarget.targetId,
      resolvedV1({ targetId: detailTarget.targetId }),
    );

    const rawResults: unknown[] = [];
    let rawMutation: (() => unknown) | null = null;
    const unsubscribeKernel = harness.kernel.subscribeStateInternalV1(() => {
      const mutation = rawMutation;
      if (mutation === null) return;
      rawMutation = null;
      rawResults.push(mutation());
    });
    let allowFamilySuccessor = false;
    let familySuccessorResult: unknown = null;
    const unsubscribeFamily = harness.session.subscribeInternalV1(() => {
      const snapshot = harness.session.getSnapshotInternalV1();
      if (
        allowFamilySuccessor && snapshot.root.current?.target.targetId ===
          "test.whole-canvas.a" &&
        snapshot.root.pending === null
      ) {
        allowFamilySuccessor = false;
        familySuccessorResult = harness.session.reconcileRootInternalV1(
          desiredV1(targetV1("test.whole-canvas.b")),
        );
      }
    });
    const nestedReplaceWith = (targetId: string): () => unknown => () =>
      harness.session.reconcileRootInternalV1(
        desiredV1(targetV1(targetId)),
      );

    rawMutation = nestedReplaceWith("test.whole-canvas.b");
    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.a")),
    )).toMatchObject({ kind: "applied" });
    const pendingA = harness.session.getSnapshotInternalV1().root.pending!;
    expect(rawResults.at(-1)).toMatchObject({ kind: "stale" });
    expect(pendingA.renderEntry.target.targetId).toBe("test.whole-canvas.a");
    expect(host.prepared).toHaveLength(1);
    expect(host.completeGenerations).toEqual([1]);
    expect(host.abort).not.toHaveBeenCalled();

    allowFamilySuccessor = true;
    rawMutation = nestedReplaceWith("test.whole-canvas.b");
    expect(harness.session.settleReadinessReadyInternalV1(pendingA.preparation)).toMatchObject({
      kind: "applied",
    });
    expect(rawResults.at(-1)).toMatchObject({ kind: "stale" });
    expect(familySuccessorResult).toMatchObject({ kind: "applied" });
    expect(harness.session.getSnapshotInternalV1().root.current?.target.targetId).toBe(
      "test.whole-canvas.a",
    );
    expect(harness.session.getSnapshotInternalV1().root.pending?.renderEntry.target.targetId).toBe(
      "test.whole-canvas.b",
    );
    expect(host.completeGenerations).toEqual([1, 3, 2]);

    const currentB = settleRootReadyV1(harness);
    expect(currentB.target.targetId).toBe("test.whole-canvas.b");

    rawMutation = nestedReplaceWith("test.whole-canvas.a");
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: currentB.frame,
      actionId: "test.action.open-detail",
    }))).toMatchObject({ kind: "applied" });
    expect(rawResults.at(-1)).toMatchObject({ kind: "stale" });
    const pendingDetail = harness.session.getSnapshotInternalV1().detail.pending!;
    expect(pendingDetail.renderEntry.target).toEqual(detailTarget);

    rawMutation = nestedReplaceWith("test.whole-canvas.a");
    expect(harness.session.settleReadinessReadyInternalV1(pendingDetail.preparation)).toMatchObject(
      {
        kind: "applied",
      },
    );
    expect(rawResults.at(-1)).toMatchObject({ kind: "stale" });
    const currentDetail = harness.session.getSnapshotInternalV1().detail.current!;

    rawMutation = nestedReplaceWith("test.whole-canvas.a");
    expect(harness.session.dismissInternalV1(Object.freeze({
      frame: currentDetail.frame,
      kind: "back",
    }))).toMatchObject({ kind: "applied" });
    expect(rawResults.at(-1)).toMatchObject({ kind: "stale" });
    expect(rawResults).toHaveLength(5);
    expect(harness.session.getSnapshotInternalV1().root.current?.target.targetId).toBe(
      "test.whole-canvas.b",
    );
    expect(harness.session.getSnapshotInternalV1().detail.current).toBeNull();
    expect(host.complete).toHaveBeenCalledTimes(host.prepared.length);
    expect(new Set(host.completeGenerations).size).toBe(host.prepared.length);
    expect(host.abort).not.toHaveBeenCalled();
    unsubscribeFamily();
    unsubscribeKernel();
  });

  it("covers the closed Host commit request table and contains terminal teardown reentry", () => {
    const host = hostCommitHarnessV1();
    const harness = harnessV1({
      hostCommitPortInternalV1: host.port,
      catalog: Object.freeze([
        catalogRowV1({
          targetId: "test.whole-canvas.a",
          placements: ["primary"],
          actionIds: ["test.action.open-detail"],
        }),
        catalogRowV1({ targetId: "test.whole-canvas.b", placements: ["primary"] }),
        catalogRowV1({
          targetId: "test.whole-canvas.detail-d",
          placements: ["detail"],
          actionIds: ["test.action.replace-detail", "test.action.close-detail"],
        }),
        catalogRowV1({
          targetId: "test.whole-canvas.detail-e",
          placements: ["detail"],
          actionIds: ["test.action.close-detail"],
        }),
      ]),
    });
    const detailD = targetV1("test.whole-canvas.detail-d");
    const detailE = targetV1("test.whole-canvas.detail-e");
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        actions: [openDetailActionV1("test.action.open-detail", detailD)],
      }),
    );
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.b",
      resolvedV1({ targetId: "test.whole-canvas.b" }),
    );
    installResolutionV1(
      harness,
      "detail",
      detailD.targetId,
      resolvedV1({
        targetId: detailD.targetId,
        actions: [
          openDetailActionV1("test.action.replace-detail", detailE),
          backActionV1("test.action.close-detail"),
        ],
      }),
    );
    installResolutionV1(
      harness,
      "detail",
      detailE.targetId,
      resolvedV1({
        targetId: detailE.targetId,
        actions: [backActionV1("test.action.close-detail")],
      }),
    );

    let root = openRootV1(
      harness,
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        actions: [openDetailActionV1("test.action.open-detail", detailD)],
      }),
    );
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: root.frame,
      actionId: "test.action.open-detail",
    }))).toMatchObject({ kind: "applied" });
    let detail = settleDetailReadyV1(harness);
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: detail.frame,
      actionId: "test.action.replace-detail",
    }))).toMatchObject({ kind: "applied" });
    let pending = harness.session.getSnapshotInternalV1().detail.pending!.preparation;
    expect(harness.session.cancelReadinessInternalV1(pending)).toMatchObject({ kind: "faulted" });
    expect(harness.session.retryCurrentInternalV1()).toMatchObject({ kind: "applied" });
    pending = harness.session.getSnapshotInternalV1().detail.pending!.preparation;
    expect(harness.session.settleReadinessFailedInternalV1(pending)).toMatchObject({
      kind: "faulted",
    });
    expect(harness.session.retryCurrentInternalV1()).toMatchObject({ kind: "applied" });
    detail = settleDetailReadyV1(harness);
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: detail.frame,
      actionId: "test.action.close-detail",
    }))).toMatchObject({ kind: "applied" });

    root = harness.session.getSnapshotInternalV1().root.current!;
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: root.frame,
      actionId: "test.action.open-detail",
    }))).toMatchObject({ kind: "applied" });
    detail = settleDetailReadyV1(harness);
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: detail.frame,
      actionId: "ui.cancel",
    }))).toMatchObject({ kind: "applied" });

    root = harness.session.getSnapshotInternalV1().root.current!;
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: root.frame,
      actionId: "test.action.open-detail",
    }))).toMatchObject({ kind: "applied" });
    detail = settleDetailReadyV1(harness);
    expect(harness.session.dismissInternalV1(Object.freeze({
      frame: detail.frame,
      kind: "backdrop" as const,
    }))).toMatchObject({ kind: "applied" });

    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.b")),
    )).toMatchObject({ kind: "applied" });
    pending = harness.session.getSnapshotInternalV1().root.pending!.preparation;
    expect(harness.session.settleReadinessFailedInternalV1(pending)).toMatchObject({
      kind: "faulted",
    });
    expect(harness.session.retryCurrentInternalV1()).toMatchObject({ kind: "applied" });
    settleRootReadyV1(harness);
    expect(harness.session.reconcileRootInternalV1(null)).toMatchObject({ kind: "applied" });

    expect(host.requests.map((request) => [
      request.kind,
      "transition" in request ? request.transition : undefined,
    ])).toEqual([
      ["root_admission", "initial_open"],
      ["root_readiness", undefined],
      ["detail_prepare", "open"],
      ["detail_readiness", undefined],
      ["detail_prepare", "replace"],
      ["detail_readiness", undefined],
      ["detail_prepare", "open"],
      ["detail_readiness", undefined],
      ["detail_prepare", "open"],
      ["detail_readiness", undefined],
      ["detail_lifecycle", "close"],
      ["detail_prepare", "open"],
      ["detail_readiness", undefined],
      ["detail_lifecycle", "dismiss"],
      ["detail_prepare", "open"],
      ["detail_readiness", undefined],
      ["detail_lifecycle", "dismiss"],
      ["root_admission", "primary_replacement"],
      ["root_readiness", undefined],
      ["root_admission", "primary_replacement"],
      ["root_readiness", undefined],
      ["root_admission", "primary_close"],
    ]);
    expect(
      host.requests.filter((request) => request.kind === "detail_readiness")
        .map((request) => request.outcome),
    ).toEqual(["ready", "failed", "failed", "ready", "ready", "ready"]);
    expect(
      host.requests.filter((request) => request.kind === "detail_lifecycle")
        .map((request) => [request.transition, request.dismissKind]),
    ).toEqual([
      ["close", null],
      ["dismiss", "routed_cancel"],
      ["dismiss", "backdrop"],
    ]);
    expect(
      host.requests.filter((request) => request.kind === "root_readiness")
        .map((request) => request.outcome),
    ).toEqual(["ready", "failed", "ready"]);

    let nestedDispose: unknown = null;
    host.setTerminalizeEffect(() => {
      nestedDispose = harness.session.disposeInternalV1();
      throw new Error("terminalize fault");
    });
    expect(harness.session.disposeInternalV1()).toMatchObject({ kind: "applied" });
    expect(nestedDispose).toMatchObject({ kind: "unchanged" });
    expect(host.terminalize).toHaveBeenCalledTimes(1);
  });

  it("orders no-throw notification, fences reentry, and terminal-disposes every old frame", () => {
    const harness = harnessV1();
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.a",
      resolvedV1({ targetId: "test.whole-canvas.a" }),
    );
    const observations: string[] = [];
    harness.session.subscribeInternalV1(() => {
      observations.push("throwing");
      throw new Error("listener fault");
    });
    harness.session.subscribeInternalV1(() => {
      observations.push("observer");
      expect(harness.session.reconcileRootInternalV1(
        desiredV1(targetV1("test.whole-canvas.a")),
      )).toMatchObject({ kind: "unchanged" });
    });
    expect(harness.session.reconcileRootInternalV1(
      desiredV1(targetV1("test.whole-canvas.a")),
    )).toMatchObject({ kind: "applied" });
    expect(observations).toEqual(["throwing", "observer"]);
    const frame = settleRootReadyV1(harness);

    expect(harness.session.disposeInternalV1()).toMatchObject({ kind: "applied" });
    expect(harness.session.disposeInternalV1()).toMatchObject({ kind: "unchanged" });
    expect(harness.session.getSnapshotInternalV1().disposed).toBe(true);
    expect(harness.session.dispatchActionInternalV1(Object.freeze({
      frame: frame.frame,
      actionId: "ui.cancel",
    }))).toMatchObject({ kind: "stale" });
    expect(harness.session.reconcileRootInternalV1(null)).toMatchObject({ kind: "stale" });

    const successor = harnessV1({ applicationEpoch: 102 });
    const successorFrame = openRootV1(successor);
    expect(successorFrame.frame.primaryTargetOccurrenceId).not.toBe(
      frame.frame.primaryTargetOccurrenceId,
    );
    expect(successorFrame.frame.primaryInstanceId).not.toBe(frame.frame.primaryInstanceId);
  });

  it("keeps 10,000 mixed root/action/detail generations bounded", () => {
    const harness = harnessV1({
      catalog: Object.freeze([
        catalogRowV1({
          targetId: "test.whole-canvas.a",
          placements: ["primary"],
          actionIds: ["test.action.open-detail"],
        }),
        catalogRowV1({ targetId: "test.whole-canvas.detail", placements: ["detail"] }),
      ]),
    });
    const detail = targetV1("test.whole-canvas.detail");
    installResolutionV1(
      harness,
      "detail",
      detail.targetId,
      resolvedV1({ targetId: detail.targetId }),
    );
    installResolutionV1(
      harness,
      "primary",
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        actions: [openDetailActionV1("test.action.open-detail", detail)],
      }),
    );
    let frame = openRootV1(
      harness,
      "test.whole-canvas.a",
      resolvedV1({
        targetId: "test.whole-canvas.a",
        actions: [openDetailActionV1("test.action.open-detail", detail)],
      }),
    );

    for (let step = 0; step < 10_000; step += 1) {
      if (step % 4 === 0) {
        expect(
          harness.session.dispatchActionInternalV1(Object.freeze({
            frame: frame.frame,
            actionId: "test.action.open-detail",
          })).kind,
        ).toBe("applied");
        settleDetailReadyV1(harness);
      } else if (step % 4 === 1) {
        const detailFrame = harness.session.getSnapshotInternalV1().detail.current!;
        expect(
          harness.session.dismissInternalV1(Object.freeze({
            frame: detailFrame.frame,
            kind: "back",
          })).kind,
        ).toBe("applied");
      } else {
        installResolutionV1(
          harness,
          "primary",
          "test.whole-canvas.a",
          resolvedV1({
            targetId: "test.whole-canvas.a",
            version: step,
            actions: [openDetailActionV1("test.action.open-detail", detail)],
          }),
        );
        expect(
          harness.session.reconcileRootInternalV1(
            desiredV1(targetV1("test.whole-canvas.a")),
          ).kind,
        ).toBe("applied");
        frame = harness.session.getSnapshotInternalV1().root.current!;
      }
    }

    const retained = harness.session.inspectBoundedStateInternalV1();
    expect(retained).toMatchObject({
      liveRootCount: 1,
      pendingRootCount: 0,
      liveDetailCount: 0,
      pendingDetailCount: 0,
      retainedFrameCount: 1,
      retainedPreparationCount: 0,
    });
    expect(retained.retainedListenerCount).toBe(0);
    expect(harness.registry.getSnapshot()).toMatchObject({
      currentPublisherCount: 1,
      disposed: false,
    });
    const kernelState = harness.kernel.getStateInternalV1();
    expect(kernelState.stableAcceptedBaselines).toHaveLength(1);
    expect(kernelState.stableRuntimeBindings).toHaveLength(1);
    expect(kernelState.transientState.publication.orderedInstances).toHaveLength(0);
  }, 30_000);
});
