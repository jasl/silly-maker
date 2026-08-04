// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import { createInputRouterV1 } from "../input/input-router.ts";
import {
  createLocalManagedSurfaceEpochAllocatorInternalV1,
  createManagedSurfaceCompositionRuntimeInternalV1,
  type ManagedSurfaceCompositionRuntimeInternalV1,
  type ManagedSurfaceFamilyActivationGateInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
import type {
  ManagedSurfaceApplicationEpochAllocatorV1,
  ManagedSurfaceCoordinatorSuccessorKindV1,
} from "../managed-surfaces/managed-surface-coordinator-lifetime.ts";
import {
  createWorkspaceOverlaySessionConfigurationInternalV1,
  createWorkspaceOverlaySessionInternalV1 as createWorkspaceOverlaySessionWithRuntimeInternalV1,
  defineWorkspaceOverlayV1,
  type CreateWorkspaceOverlaySessionConfigurationInternalInputV1,
  type WorkspaceOverlaySessionInternalV1,
} from "./workspace-overlay-session.ts";

interface CreateWorkspaceOverlayTestSessionInputV1<TOverlayId extends string>
  extends CreateWorkspaceOverlaySessionConfigurationInternalInputV1<TOverlayId> {
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
  readonly epochAllocator: ManagedSurfaceApplicationEpochAllocatorV1;
}

interface WorkspaceOverlayTestFixtureV1<TOverlayId extends string> {
  readonly runtimeOwner: ManagedSurfaceCompositionRuntimeInternalV1;
  readonly session: WorkspaceOverlaySessionInternalV1<TOverlayId>;
}

function createWorkspaceOverlayTestFixtureV1<TOverlayId extends string>(
  input: CreateWorkspaceOverlayTestSessionInputV1<TOverlayId>,
): WorkspaceOverlayTestFixtureV1<TOverlayId> {
  const configuration = createWorkspaceOverlaySessionConfigurationInternalV1({
    definitions: input.definitions,
    ...(input.availablePorts === undefined ? {} : { availablePorts: input.availablePorts }),
    ...(input.reportFailure === undefined ? {} : { reportFailure: input.reportFailure }),
  });
  const runtimeOwner = createManagedSurfaceCompositionRuntimeInternalV1({
    inputRouter: input.inputRouter,
    epochAllocator: input.epochAllocator,
    recipe: configuration.recipeContribution,
  });
  const session = createWorkspaceOverlaySessionWithRuntimeInternalV1({
    runtime: runtimeOwner.getCurrent(),
    configuration,
  });
  return Object.freeze({ runtimeOwner, session });
}

function replaceWorkspaceOverlayRuntimeInternalV1<TOverlayId extends string>(
  runtimeOwner: ManagedSurfaceCompositionRuntimeInternalV1,
  session: WorkspaceOverlaySessionInternalV1<TOverlayId>,
  kind: ManagedSurfaceCoordinatorSuccessorKindV1,
): void {
  runtimeOwner.replace(kind, [session]);
}

function disposeWorkspaceOverlaySessionInternalV1<TOverlayId extends string>(
  runtimeOwner: ManagedSurfaceCompositionRuntimeInternalV1,
  session: WorkspaceOverlaySessionInternalV1<TOverlayId>,
): void {
  session.detachRuntimeInternalV1();
  runtimeOwner.dispose();
  session.disposeInternalV1();
}

function deferredV1() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function preparingCandidateV1<TOverlayId extends string>(
  session: WorkspaceOverlaySessionInternalV1<TOverlayId>,
) {
  const candidates = session.getRenderSnapshotInternalV1().entries.filter(
    (entry) => entry.readiness === "preparing",
  );
  expect(candidates).toHaveLength(1);
  return candidates[0]!;
}

async function readyOnlyCandidateV1<TOverlayId extends string>(
  session: WorkspaceOverlaySessionInternalV1<TOverlayId>,
): Promise<void> {
  await expect(
    session.beginCandidatePreparationInternalV1(
      preparingCandidateV1(session).surfaceInstanceId,
    ),
  ).resolves.toEqual({ kind: "ready" });
}

const definitionsV1 = Object.freeze([
  defineWorkspaceOverlayV1({
    id: "overlay.test.current",
    contractRevision: 1,
  }),
  defineWorkspaceOverlayV1({
    id: "overlay.test.delayed",
    contractRevision: 1,
  }),
  defineWorkspaceOverlayV1({
    id: "overlay.test.missing-renderer",
    contractRevision: 1,
  }),
  defineWorkspaceOverlayV1({
    id: "overlay.test.port-bound",
    contractRevision: 1,
    requiredPortIds: ["port.test.inventory"],
  }),
]);

describe("Workspace Overlay Coordinator facade", () => {
  it("keeps an armed successor detached until the composition activation gate opens", async () => {
    const first = createWorkspaceOverlayTestFixtureV1({
      inputRouter: createInputRouterV1(),
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: definitionsV1,
    });
    const configuration = createWorkspaceOverlaySessionConfigurationInternalV1({
      definitions: definitionsV1,
    });
    const successor = createManagedSurfaceCompositionRuntimeInternalV1({
      inputRouter: createInputRouterV1(),
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      recipe: configuration.recipeContribution,
    });
    const gateState = { open: false };
    const gate: ManagedSurfaceFamilyActivationGateInternalV1 = Object.freeze({
      isOpen: () => gateState.open,
    });
    first.session.attachRendererResolverInternalV1(Object.freeze({
      resolve: (id: string) => Object.freeze({ accessibleName: id, content: id }),
    }));
    expect(first.session.openPrimary("overlay.test.current")).toMatchObject({
      kind: "preparing",
    });
    await readyOnlyCandidateV1(first.session);
    const predecessorInstanceId = first.session.getRenderSnapshotInternalV1().entries[0]!
      .surfaceInstanceId;
    const predecessorHandle = first.session.getHandleInternalV1(predecessorInstanceId)!;
    let notifications = 0;
    const unsubscribe = first.session.subscribe(() => {
      notifications += 1;
    });

    first.session.detachRuntimeInternalV1();
    first.session.prepareRuntimeAttachmentInternalV1(successor.getCurrent(), gate);
    const notifyActivation = first.session.activateRuntimeAttachmentInternalV1();
    const before = first.session.getManagedSnapshotInternalV1();
    expect(first.session.closeExpectedInternalV1(predecessorHandle)).toMatchObject({
      kind: "stale",
      code: "surface.stale_topology_revision",
    });
    expect(first.session.openPrimary("overlay.test.current")).toEqual({
      kind: "rejected",
      code: "overlay.disposed",
    });
    expect(first.session.getManagedSnapshotInternalV1()).toBe(before);
    expect(notifications).toBe(0);

    gateState.open = true;
    notifyActivation();
    expect(notifications).toBe(1);
    expect(first.session.openPrimary("overlay.test.current")).toMatchObject({
      kind: "preparing",
    });

    unsubscribe();
    first.session.disposeInternalV1();
    first.runtimeOwner.dispose();
    successor.dispose();
  });

  it("closes a pending-only initial fallback and fences its late readiness", async () => {
    const delayed = deferredV1();
    const { session } = createWorkspaceOverlayTestFixtureV1({
      inputRouter: createInputRouterV1(),
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: definitionsV1,
    });
    session.attachRendererResolverInternalV1(Object.freeze({
      resolve: (id: string) =>
        Object.freeze({
          accessibleName: id,
          content: id,
          prepare: () => delayed.promise,
        }),
    }));

    expect(session.openPrimary("overlay.test.current")).toMatchObject({ kind: "preparing" });
    const candidate = preparingCandidateV1(session);
    const readiness = session.beginCandidatePreparationInternalV1(candidate.surfaceInstanceId);
    const beforeClose = session.getManagedSnapshotInternalV1();
    const listener = vi.fn();
    session.subscribe(listener);

    expect(session.closeTop()).toBe("primary_closed");
    const afterClose = session.getManagedSnapshotInternalV1();
    expect(afterClose.publicationRevision).toBe(beforeClose.publicationRevision + 1);
    expect(afterClose.topologyRevision).toBe(beforeClose.topologyRevision + 1);
    expect(afterClose.orderedInstances).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);

    delayed.resolve();
    await expect(readiness).resolves.toEqual({
      kind: "stale",
      code: "overlay.stale_readiness",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(afterClose);
  });

  it("rejects renderer and required-port gaps before mutation, then fences late readiness", async () => {
    const delayed = deferredV1();
    const { session } = createWorkspaceOverlayTestFixtureV1<string>({
      inputRouter: createInputRouterV1(),
      epochAllocator: Object.freeze({
        allocate: () => parseNonNegativeSafeInteger(7),
      }),
      definitions: definitionsV1,
      availablePorts: [],
    });
    session.attachRendererResolverInternalV1(Object.freeze({
      resolve(id: string) {
        if (id === "overlay.test.missing-renderer") return null;
        return Object.freeze({
          accessibleName: id,
          content: id,
          ...(id === "overlay.test.delayed" ? { prepare: () => delayed.promise } : {}),
        });
      },
    }));

    const beforeAdmission = session.getManagedSnapshotInternalV1();
    const listener = vi.fn();
    session.subscribe(listener);

    expect(session.openPrimary("overlay.test.missing-renderer")).toEqual({
      kind: "rejected",
      code: "overlay.renderer_missing",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(beforeAdmission);
    expect(listener).not.toHaveBeenCalled();

    expect(session.openPrimary("overlay.test.port-bound")).toEqual({
      kind: "rejected",
      code: "overlay.required_port_missing",
      portId: "port.test.inventory",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(beforeAdmission);
    expect(listener).not.toHaveBeenCalled();

    expect(session.openPrimary("overlay.test.current")).toEqual({
      kind: "preparing",
      code: "overlay.preparation_started",
    });
    const initialCandidate = session.getRenderSnapshotInternalV1().entries[0]!;
    await expect(
      session.beginCandidatePreparationInternalV1(initialCandidate.surfaceInstanceId),
    ).resolves.toEqual({ kind: "ready" });

    const current = session.getManagedSnapshotInternalV1();
    const currentInstanceId = current.orderedInstances[0]!.surfaceInstanceId;
    expect(current.inputOwner?.surfaceInstanceId).toBe(currentInstanceId);
    expect(current.focusOwner?.surfaceInstanceId).toBe(currentInstanceId);

    expect(session.openPrimary("overlay.test.delayed")).toEqual({
      kind: "preparing",
      code: "overlay.preparation_started",
    });
    const replacement = session.getManagedSnapshotInternalV1();
    const replacementCandidate = replacement.orderedInstances.find(
      (instance) => instance.readiness.kind === "preparing",
    )!;
    expect(replacement.topologyRevision).toBe(current.topologyRevision);
    expect(replacement.inputOwner).toEqual(current.inputOwner);
    expect(replacement.focusOwner).toEqual(current.focusOwner);
    expect(replacement.orderedInstances).toHaveLength(2);

    const readiness = session.beginCandidatePreparationInternalV1(
      replacementCandidate.surfaceInstanceId,
    );
    expect(session.closeTop()).toBe("primary_closed");
    const closed = session.getManagedSnapshotInternalV1();
    expect(closed.orderedInstances).toEqual([]);
    expect(closed.inputOwner).toBeNull();
    expect(closed.focusOwner).toBeNull();

    delayed.resolve();
    await expect(readiness).resolves.toEqual({
      kind: "stale",
      code: "overlay.stale_readiness",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(closed);
  });

  it("rejects malformed contract revision and target schema without allocating an instance", () => {
    const { session } = createWorkspaceOverlayTestFixtureV1({
      inputRouter: createInputRouterV1(),
      epochAllocator: Object.freeze({
        allocate: () => parseNonNegativeSafeInteger(9),
      }),
      definitions: [
        {
          id: "overlay.test.bad-revision",
          contractRevision: 0,
          targetSchema: { kind: "exact_id" },
          dismissible: true,
          requiredPortIds: [],
        },
        {
          id: "overlay.test.bad-schema",
          contractRevision: 1,
          dismissible: true,
          requiredPortIds: [],
        },
      ] as never,
      availablePorts: [],
    });
    session.attachRendererResolverInternalV1(Object.freeze({
      resolve: (id: string) => Object.freeze({ accessibleName: id, content: id }),
    }));
    const before = session.getManagedSnapshotInternalV1();

    expect(session.openPrimary("overlay.test.bad-revision")).toEqual({
      kind: "rejected",
      code: "overlay.contract_revision_invalid",
    });
    expect(session.openPrimary("overlay.test.bad-schema")).toEqual({
      kind: "rejected",
      code: "overlay.schema_invalid",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(before);
    expect(session.getManagedSnapshotInternalV1().orderedInstances).toEqual([]);
  });

  it("rejects sparse or method-overridden required-port catalogs without invoking caller code", () => {
    const sparsePortIds: string[] = [];
    sparsePortIds.length = 1;
    const callerMap = vi.fn(() => ["port.test.untrusted"]);
    const methodOverriddenPortIds = ["port.test.inventory"];
    Object.defineProperty(methodOverriddenPortIds, "map", { value: callerMap });

    expect(() =>
      defineWorkspaceOverlayV1({
        id: "overlay.test.sparse-ports",
        contractRevision: 1,
        requiredPortIds: sparsePortIds,
      })
    ).toThrowError("ui.workspace_overlay_required_port_ids_invalid");
    expect(() =>
      defineWorkspaceOverlayV1({
        id: "overlay.test.method-overridden-ports",
        contractRevision: 1,
        requiredPortIds: methodOverriddenPortIds,
      })
    ).toThrowError("ui.workspace_overlay_required_port_ids_invalid");
    expect(callerMap).not.toHaveBeenCalled();
  });

  it("admits required ports only from concrete composition bindings", async () => {
    const inventoryPort = Object.freeze({ observe: () => Object.freeze([]) });
    const { session } = createWorkspaceOverlayTestFixtureV1({
      inputRouter: createInputRouterV1(),
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: [definitionsV1[3]!],
      availablePorts: [Object.freeze({ id: "port.test.inventory", port: inventoryPort })],
    });
    session.attachRendererResolverInternalV1(Object.freeze({
      resolve: (id: string) => Object.freeze({ accessibleName: id, content: id }),
    }));

    expect(session.openPrimary("overlay.test.port-bound")).toEqual({
      kind: "preparing",
      code: "overlay.preparation_started",
    });
    await readyOnlyCandidateV1(session);
    expect(session.getSnapshot()).toEqual({
      primaryId: "overlay.test.port-bound",
      detailIds: [],
    });

    expect(() =>
      createWorkspaceOverlayTestFixtureV1({
        inputRouter: createInputRouterV1(),
        epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
        definitions: [],
        availablePorts: [{ id: "port.test.invalid", port: null }] as never,
      })
    ).toThrowError("ui.workspace_overlay_port_binding_invalid");
  });

  it("isolates diagnostic sink failures before admission and while failing preparation", async () => {
    const preparationFailure = new Error("synthetic preparation failure");
    const { session } = createWorkspaceOverlayTestFixtureV1({
      inputRouter: createInputRouterV1(),
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: [
        defineWorkspaceOverlayV1({
          id: "overlay.test.renderer-fault",
          contractRevision: 1,
        }),
        defineWorkspaceOverlayV1({
          id: "overlay.test.preparation-fault",
          contractRevision: 1,
        }),
      ],
      reportFailure: () => {
        throw new Error("synthetic diagnostic sink failure");
      },
    });
    session.attachRendererResolverInternalV1(Object.freeze({
      resolve(id: string) {
        if (id === "overlay.test.renderer-fault") {
          throw new Error("synthetic renderer failure");
        }
        return Object.freeze({
          accessibleName: id,
          content: id,
          prepare: () => Promise.reject(preparationFailure),
        });
      },
    }));

    const beforeAdmission = session.getManagedSnapshotInternalV1();
    expect(session.openPrimary("overlay.test.renderer-fault")).toEqual({
      kind: "faulted",
      code: "overlay.renderer_faulted",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(beforeAdmission);

    expect(session.openPrimary("overlay.test.preparation-fault")).toEqual({
      kind: "preparing",
      code: "overlay.preparation_started",
    });
    const candidate = session.getRenderSnapshotInternalV1().entries[0]!;
    await expect(
      session.beginCandidatePreparationInternalV1(candidate.surfaceInstanceId),
    ).resolves.toEqual({ kind: "failed" });
    expect(session.getManagedSnapshotInternalV1().orderedInstances).toEqual([]);
    expect(session.getManagedSnapshotInternalV1().preparationFallbacks).toEqual([]);
  });

  it("maps initial, replacement, and child preparation to the fixed Overlay policy", async () => {
    const replacementFailure = new Error("synthetic replacement failure");
    const childFailure = new Error("synthetic child failure");
    const { session } = createWorkspaceOverlayTestFixtureV1({
      inputRouter: createInputRouterV1(),
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: [
        defineWorkspaceOverlayV1({ id: "overlay.test.root", contractRevision: 1 }),
        defineWorkspaceOverlayV1({ id: "overlay.test.replacement", contractRevision: 1 }),
        defineWorkspaceOverlayV1({ id: "overlay.test.child", contractRevision: 1 }),
      ],
    });
    session.attachRendererResolverInternalV1(Object.freeze({
      resolve(id: string) {
        return Object.freeze({
          accessibleName: id,
          content: id,
          ...(id === "overlay.test.replacement"
            ? { prepare: () => Promise.reject(replacementFailure) }
            : id === "overlay.test.child"
            ? { prepare: () => Promise.reject(childFailure) }
            : {}),
        });
      },
    }));

    expect(session.openPrimary("overlay.test.root")).toMatchObject({ kind: "preparing" });
    const initial = session.getManagedSnapshotInternalV1();
    expect(initial.preparationFallbacks).toHaveLength(1);
    expect(initial.inputOwner).toBeNull();
    expect(initial.focusOwner).toBeNull();
    await readyOnlyCandidateV1(session);

    const activeRoot = session.getManagedSnapshotInternalV1();
    const rootInstanceId = activeRoot.orderedInstances[0]!.surfaceInstanceId;
    expect(activeRoot.inputOwner?.surfaceInstanceId).toBe(rootInstanceId);
    expect(activeRoot.focusOwner?.surfaceInstanceId).toBe(rootInstanceId);

    expect(session.openPrimary("overlay.test.replacement")).toMatchObject({
      kind: "preparing",
    });
    const replacing = session.getManagedSnapshotInternalV1();
    expect(replacing.preparationFallbacks).toEqual([]);
    expect(replacing.inputOwner).toEqual(activeRoot.inputOwner);
    expect(replacing.focusOwner).toEqual(activeRoot.focusOwner);
    await expect(
      session.beginCandidatePreparationInternalV1(
        preparingCandidateV1(session).surfaceInstanceId,
      ),
    ).resolves.toEqual({ kind: "failed" });
    const afterReplacementFailure = session.getManagedSnapshotInternalV1();
    expect(afterReplacementFailure.orderedInstances).toHaveLength(1);
    expect(afterReplacementFailure.orderedInstances[0]!.surfaceInstanceId).toBe(rootInstanceId);
    expect(afterReplacementFailure.inputOwner).toEqual(activeRoot.inputOwner);
    expect(afterReplacementFailure.focusOwner).toEqual(activeRoot.focusOwner);

    expect(session.pushDetail("overlay.test.child")).toMatchObject({ kind: "preparing" });
    const pushingChild = session.getManagedSnapshotInternalV1();
    expect(pushingChild.preparationFallbacks).toHaveLength(1);
    expect(pushingChild.inputOwner).toBeNull();
    expect(pushingChild.focusOwner).toBeNull();
    await expect(
      session.beginCandidatePreparationInternalV1(
        preparingCandidateV1(session).surfaceInstanceId,
      ),
    ).resolves.toEqual({ kind: "failed" });
    const afterChildFailure = session.getManagedSnapshotInternalV1();
    expect(afterChildFailure.orderedInstances).toHaveLength(1);
    expect(afterChildFailure.orderedInstances[0]!.surfaceInstanceId).toBe(rootInstanceId);
    expect(afterChildFailure.inputOwner).toEqual(activeRoot.inputOwner);
    expect(afterChildFailure.focusOwner).toEqual(activeRoot.focusOwner);
  });

  it("never reuses an instance after initial failure and makes repeated receipts stale", async () => {
    let rejectPreparation = true;
    const { session } = createWorkspaceOverlayTestFixtureV1({
      inputRouter: createInputRouterV1(),
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: [
        defineWorkspaceOverlayV1({ id: "overlay.test.retry", contractRevision: 1 }),
      ],
    });
    session.attachRendererResolverInternalV1(Object.freeze({
      resolve: (id: string) =>
        Object.freeze({
          accessibleName: id,
          content: id,
          prepare: () =>
            rejectPreparation ? Promise.reject(new Error("synthetic initial failure")) : undefined,
        }),
    }));

    expect(session.openPrimary("overlay.test.retry")).toMatchObject({ kind: "preparing" });
    const failedCandidate = preparingCandidateV1(session);
    await expect(
      session.beginCandidatePreparationInternalV1(failedCandidate.surfaceInstanceId),
    ).resolves.toEqual({ kind: "failed" });
    const afterFailure = session.getManagedSnapshotInternalV1();
    expect(afterFailure.orderedInstances).toEqual([]);
    expect(
      session.failCandidatePreparationInternalV1(
        failedCandidate.surfaceInstanceId,
        new Error("late duplicate failure"),
      ),
    ).toEqual({ kind: "stale", code: "overlay.stale_readiness" });
    expect(session.getManagedSnapshotInternalV1()).toBe(afterFailure);

    rejectPreparation = false;
    expect(session.openPrimary("overlay.test.retry")).toMatchObject({ kind: "preparing" });
    const retryCandidate = preparingCandidateV1(session);
    expect(retryCandidate.surfaceInstanceId).not.toBe(failedCandidate.surfaceInstanceId);
    await readyOnlyCandidateV1(session);
    expect(session.getManagedSnapshotInternalV1().orderedInstances[0]!.surfaceInstanceId).toBe(
      retryCandidate.surfaceInstanceId,
    );
  });

  it("cancels an older replacement before a second replacement and fences its late readiness", async () => {
    const first = deferredV1();
    const second = deferredV1();
    const { session } = createWorkspaceOverlayTestFixtureV1({
      inputRouter: createInputRouterV1(),
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: [
        defineWorkspaceOverlayV1({ id: "overlay.test.base", contractRevision: 1 }),
        defineWorkspaceOverlayV1({ id: "overlay.test.first", contractRevision: 1 }),
        defineWorkspaceOverlayV1({ id: "overlay.test.second", contractRevision: 1 }),
      ],
    });
    session.attachRendererResolverInternalV1(Object.freeze({
      resolve: (id: string) =>
        Object.freeze({
          accessibleName: id,
          content: id,
          ...(id === "overlay.test.first"
            ? { prepare: () => first.promise }
            : id === "overlay.test.second"
            ? { prepare: () => second.promise }
            : {}),
        }),
    }));

    expect(session.openPrimary("overlay.test.base")).toMatchObject({ kind: "preparing" });
    await readyOnlyCandidateV1(session);
    expect(session.openPrimary("overlay.test.first")).toMatchObject({ kind: "preparing" });
    const firstCandidate = preparingCandidateV1(session);
    const firstReadiness = session.beginCandidatePreparationInternalV1(
      firstCandidate.surfaceInstanceId,
    );

    expect(session.openPrimary("overlay.test.second")).toMatchObject({ kind: "preparing" });
    const secondCandidate = preparingCandidateV1(session);
    expect(secondCandidate.surfaceInstanceId).not.toBe(firstCandidate.surfaceInstanceId);
    const secondReadiness = session.beginCandidatePreparationInternalV1(
      secondCandidate.surfaceInstanceId,
    );

    first.resolve();
    await expect(firstReadiness).resolves.toEqual({
      kind: "stale",
      code: "overlay.stale_readiness",
    });
    const beforeSecondReady = session.getManagedSnapshotInternalV1();
    expect(beforeSecondReady.inputOwner?.surfaceInstanceId).not.toBe(
      secondCandidate.surfaceInstanceId,
    );

    second.resolve();
    await expect(secondReadiness).resolves.toEqual({ kind: "ready" });
    const afterSecondReady = session.getManagedSnapshotInternalV1();
    expect(afterSecondReady.orderedInstances).toHaveLength(1);
    expect(afterSecondReady.orderedInstances[0]!.surfaceInstanceId).toBe(
      secondCandidate.surfaceInstanceId,
    );
    expect(afterSecondReady.inputOwner?.surfaceInstanceId).toBe(secondCandidate.surfaceInstanceId);
    expect(afterSecondReady.focusOwner?.surfaceInstanceId).toBe(secondCandidate.surfaceInstanceId);
  });

  it("classifies the actual top detail while a primary replacement is preparing", async () => {
    const delayed = deferredV1();
    const { session } = createWorkspaceOverlayTestFixtureV1({
      inputRouter: createInputRouterV1(),
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: definitionsV1,
    });
    session.attachRendererResolverInternalV1(Object.freeze({
      resolve: (id: string) =>
        Object.freeze({
          accessibleName: id,
          content: id,
          ...(id === "overlay.test.delayed" ? { prepare: () => delayed.promise } : {}),
        }),
    }));

    expect(session.openPrimary("overlay.test.current")).toMatchObject({ kind: "preparing" });
    await readyOnlyCandidateV1(session);
    expect(session.pushDetail("overlay.test.missing-renderer")).toMatchObject({
      kind: "preparing",
    });
    await readyOnlyCandidateV1(session);
    expect(session.openPrimary("overlay.test.delayed")).toMatchObject({ kind: "preparing" });
    const replacement = preparingCandidateV1(session);
    const replacementReadiness = session.beginCandidatePreparationInternalV1(
      replacement.surfaceInstanceId,
    );
    const beforeClose = session.getManagedSnapshotInternalV1();
    const listener = vi.fn();
    session.subscribe(listener);

    expect(session.closeTop()).toBe("detail_closed");
    const afterClose = session.getManagedSnapshotInternalV1();
    expect(afterClose.publicationRevision).toBe(beforeClose.publicationRevision + 1);
    expect(afterClose.topologyRevision).toBe(beforeClose.topologyRevision + 1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot()).toEqual({
      primaryId: "overlay.test.current",
      detailIds: [],
    });
    expect(
      session.getManagedSnapshotInternalV1().orderedInstances.some((instance) =>
        instance.surfaceInstanceId === replacement.surfaceInstanceId
      ),
    ).toBe(false);

    delayed.resolve();
    await expect(replacementReadiness).resolves.toEqual({
      kind: "stale",
      code: "overlay.stale_readiness",
    });
    expect(session.getSnapshot()).toEqual({
      primaryId: "overlay.test.current",
      detailIds: [],
    });
  });

  it("cancels owner preparation atomically through explicit close and routed dismiss", async () => {
    for (const mode of ["explicit_close", "routed_dismiss"] as const) {
      const delayed = deferredV1();
      const { session } = createWorkspaceOverlayTestFixtureV1({
        inputRouter: createInputRouterV1(),
        epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
        definitions: definitionsV1,
      });
      session.attachRendererResolverInternalV1(Object.freeze({
        resolve: (id: string) =>
          Object.freeze({
            accessibleName: id,
            content: id,
            ...(id === "overlay.test.delayed" ? { prepare: () => delayed.promise } : {}),
          }),
      }));

      expect(session.openPrimary("overlay.test.current")).toMatchObject({ kind: "preparing" });
      await readyOnlyCandidateV1(session);
      const currentRootId = session.getManagedSnapshotInternalV1().orderedInstances[0]!
        .surfaceInstanceId;
      expect(session.pushDetail("overlay.test.missing-renderer")).toMatchObject({
        kind: "preparing",
      });
      await readyOnlyCandidateV1(session);
      const detailId = session.getManagedSnapshotInternalV1().inputOwner!.surfaceInstanceId;
      expect(session.openPrimary("overlay.test.delayed")).toMatchObject({ kind: "preparing" });
      const replacement = preparingCandidateV1(session);
      const replacementReadiness = session.beginCandidatePreparationInternalV1(
        replacement.surfaceInstanceId,
      );
      const detailHandle = session.getHandleInternalV1(detailId)!;
      const beforeClose = session.getManagedSnapshotInternalV1();
      const listener = vi.fn();
      session.subscribe(listener);

      const receipt = mode === "explicit_close"
        ? session.closeExpectedInternalV1(detailHandle)
        : session.routeDismissInternalV1(detailHandle, "escape");
      expect(receipt).toMatchObject({
        kind: "applied",
        code: mode === "explicit_close" ? "surface.closed" : "surface.dismissed",
        surfaceInstanceId: detailId,
      });
      const afterClose = session.getManagedSnapshotInternalV1();
      expect(afterClose.publicationRevision).toBe(beforeClose.publicationRevision + 1);
      expect(afterClose.topologyRevision).toBe(beforeClose.topologyRevision + 1);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(afterClose.orderedInstances.map((instance) => instance.surfaceInstanceId)).toEqual([
        currentRootId,
      ]);

      delayed.resolve();
      await expect(replacementReadiness).resolves.toEqual({
        kind: "stale",
        code: "overlay.stale_readiness",
      });
      expect(session.getSnapshot()).toEqual({
        primaryId: "overlay.test.current",
        detailIds: [],
      });
    }
  });

  it("cancels pending preparation across close, epoch rotation, and terminal disposal", async () => {
    const closePreparation = deferredV1();
    const epochPreparation = deferredV1();
    const disposePreparation = deferredV1();
    const { runtimeOwner, session } = createWorkspaceOverlayTestFixtureV1({
      inputRouter: createInputRouterV1(),
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: [
        defineWorkspaceOverlayV1({ id: "overlay.test.close", contractRevision: 1 }),
        defineWorkspaceOverlayV1({ id: "overlay.test.epoch", contractRevision: 1 }),
        defineWorkspaceOverlayV1({ id: "overlay.test.dispose", contractRevision: 1 }),
      ],
    });
    session.attachRendererResolverInternalV1(Object.freeze({
      resolve(id: string) {
        const preparation = id === "overlay.test.close"
          ? closePreparation
          : id === "overlay.test.epoch"
          ? epochPreparation
          : disposePreparation;
        return Object.freeze({
          accessibleName: id,
          content: id,
          prepare: () => preparation.promise,
        });
      },
    }));

    expect(session.openPrimary("overlay.test.close")).toMatchObject({ kind: "preparing" });
    const closeCandidate = preparingCandidateV1(session);
    const closeReadiness = session.beginCandidatePreparationInternalV1(
      closeCandidate.surfaceInstanceId,
    );
    session.closeAll();
    const afterClose = session.getManagedSnapshotInternalV1();
    closePreparation.resolve();
    await expect(closeReadiness).resolves.toEqual({
      kind: "stale",
      code: "overlay.stale_readiness",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(afterClose);

    expect(session.openPrimary("overlay.test.epoch")).toMatchObject({ kind: "preparing" });
    const epochCandidate = preparingCandidateV1(session);
    const oldEpoch = session.getManagedSnapshotInternalV1().applicationEpoch;
    const epochReadiness = session.beginCandidatePreparationInternalV1(
      epochCandidate.surfaceInstanceId,
    );
    replaceWorkspaceOverlayRuntimeInternalV1(runtimeOwner, session, "hmr_successor");
    const afterEpoch = session.getManagedSnapshotInternalV1();
    expect(afterEpoch.applicationEpoch).toBeGreaterThan(oldEpoch);
    expect(afterEpoch.orderedInstances).toEqual([]);
    epochPreparation.resolve();
    await expect(epochReadiness).resolves.toEqual({
      kind: "stale",
      code: "overlay.stale_readiness",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(afterEpoch);

    expect(session.openPrimary("overlay.test.dispose")).toMatchObject({ kind: "preparing" });
    const disposeCandidate = preparingCandidateV1(session);
    const disposeReadiness = session.beginCandidatePreparationInternalV1(
      disposeCandidate.surfaceInstanceId,
    );
    disposeWorkspaceOverlaySessionInternalV1(runtimeOwner, session);
    const afterDispose = session.getManagedSnapshotInternalV1();
    expect(afterDispose.orderedInstances).toEqual([]);
    expect(afterDispose.coordinatorDisposed).toBe(true);
    disposePreparation.resolve();
    await expect(disposeReadiness).resolves.toEqual({
      kind: "stale",
      code: "overlay.stale_readiness",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(afterDispose);
  });

  it("rejects missing, ambiguous, unavailable, and faulted definitions before mutation", () => {
    const duplicate = defineWorkspaceOverlayV1({
      id: "overlay.test.duplicate-definition",
      contractRevision: 1,
    });
    const { session } = createWorkspaceOverlayTestFixtureV1<string>({
      inputRouter: createInputRouterV1(),
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: [
        defineWorkspaceOverlayV1({ id: "overlay.test.known", contractRevision: 1 }),
        defineWorkspaceOverlayV1({ id: "overlay.test.renderer-fault", contractRevision: 1 }),
        duplicate,
        duplicate,
      ],
    });
    const listener = vi.fn();
    session.subscribe(listener);
    const before = session.getManagedSnapshotInternalV1();

    expect(session.openPrimary("overlay.test.known")).toEqual({
      kind: "rejected",
      code: "overlay.renderer_unavailable",
    });
    session.attachRendererResolverInternalV1(Object.freeze({
      resolve(id: string) {
        if (id === "overlay.test.renderer-fault") throw new Error("synthetic renderer fault");
        return Object.freeze({ accessibleName: id, content: id });
      },
    }));
    expect(session.openPrimary("overlay.test.missing")).toEqual({
      kind: "rejected",
      code: "overlay.definition_missing",
    });
    expect(session.openPrimary("overlay.test.duplicate-definition")).toEqual({
      kind: "rejected",
      code: "overlay.definition_ambiguous",
    });
    expect(session.openPrimary("overlay.test.renderer-fault")).toEqual({
      kind: "faulted",
      code: "overlay.renderer_faulted",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("structures a definition whose derived runtime identity exceeds the stable-ID bound", () => {
    const longId = `overlay.${"a".repeat(88)}`;
    expect(() => defineWorkspaceOverlayV1({ id: longId, contractRevision: 1 })).toThrowError(
      "invalid ModuleId",
    );
    const { session } = createWorkspaceOverlayTestFixtureV1({
      inputRouter: createInputRouterV1(),
      epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
      definitions: [{
        id: longId,
        contractRevision: 1,
        targetSchema: { kind: "exact_id" },
        dismissible: true,
        requiredPortIds: [],
      }] as never,
    });
    session.attachRendererResolverInternalV1(Object.freeze({
      resolve: (id: string) => Object.freeze({ accessibleName: id, content: id }),
    }));
    const before = session.getManagedSnapshotInternalV1();

    expect(session.openPrimary(longId)).toEqual({
      kind: "rejected",
      code: "overlay.schema_invalid",
    });
    expect(session.getManagedSnapshotInternalV1()).toBe(before);
  });
});
