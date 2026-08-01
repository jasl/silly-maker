// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { createInputRouterV1 } from "../input/input-router.ts";
import { defineWorkspaceOverlayV1, maximumOverlayDetailDepthV1 } from "./overlay-session-store.ts";
import {
  createLocalWorkspaceOverlayEpochAllocatorInternalV1,
  createWorkspaceOverlayPublicSessionInternalV1,
  createWorkspaceOverlaySessionInternalV1,
  type OverlaySessionStoreV1,
  type WorkspaceOverlaySessionInternalV1,
} from "./workspace-overlay-session.ts";

const overlayIdsV1 = Object.freeze(
  {
    inventory: "overlay.test.inventory",
    ingredientOne: "overlay.test.ingredient-1",
    sourceOne: "overlay.test.source-1",
    supplierOne: "overlay.test.supplier-1",
    historyOne: "overlay.test.history-1",
    fifthDetail: "overlay.test.fifth-detail",
    ledger: "overlay.test.ledger",
  } as const,
);

type OverlayIdV1 = (typeof overlayIdsV1)[keyof typeof overlayIdsV1];

const definitionsV1 = Object.freeze(
  Object.values(overlayIdsV1).map((id) =>
    defineWorkspaceOverlayV1({
      id,
      contractRevision: 1,
    })
  ),
);

interface OverlayFixtureV1 {
  readonly session: OverlaySessionStoreV1<OverlayIdV1>;
  readonly internal: WorkspaceOverlaySessionInternalV1<OverlayIdV1>;
}

function createOverlayFixtureV1(): OverlayFixtureV1 {
  const internal = createWorkspaceOverlaySessionInternalV1({
    inputRouter: createInputRouterV1(),
    epochAllocator: createLocalWorkspaceOverlayEpochAllocatorInternalV1(),
    definitions: definitionsV1,
  });
  internal.attachRendererResolverInternalV1(Object.freeze({
    resolve: (id: OverlayIdV1) => Object.freeze({ accessibleName: id, content: id }),
  }));
  return Object.freeze({
    internal,
    session: createWorkspaceOverlayPublicSessionInternalV1(internal),
  });
}

async function settleCandidateV1(internal: WorkspaceOverlaySessionInternalV1<OverlayIdV1>) {
  const candidates = internal
    .getRenderSnapshotInternalV1()
    .entries.filter((entry) => entry.readiness === "preparing");
  expect(candidates).toHaveLength(1);
  await expect(
    internal.beginCandidatePreparationInternalV1(candidates[0]!.surfaceInstanceId),
  ).resolves.toEqual({ kind: "ready" });
}

async function openReadyV1(fixture: OverlayFixtureV1, id: OverlayIdV1): Promise<void> {
  expect(fixture.session.openPrimary(id)).toEqual({
    kind: "preparing",
    code: "overlay.preparation_started",
  });
  await settleCandidateV1(fixture.internal);
}

async function pushReadyV1(fixture: OverlayFixtureV1, id: OverlayIdV1): Promise<void> {
  expect(fixture.session.pushDetail(id)).toEqual({
    kind: "preparing",
    code: "overlay.preparation_started",
  });
  await settleCandidateV1(fixture.internal);
}

describe("Workspace Overlay public session facade", () => {
  it("keeps one primary Overlay and at most four ordered details", async () => {
    const fixture = createOverlayFixtureV1();
    const { session } = fixture;
    await openReadyV1(fixture, overlayIdsV1.inventory);
    await pushReadyV1(fixture, overlayIdsV1.ingredientOne);
    await pushReadyV1(fixture, overlayIdsV1.sourceOne);
    await pushReadyV1(fixture, overlayIdsV1.supplierOne);
    await pushReadyV1(fixture, overlayIdsV1.historyOne);

    const beforeRejection = session.getSnapshot();
    expect(session.pushDetail(overlayIdsV1.fifthDetail)).toEqual({
      kind: "rejected",
      code: "overlay.detail_limit",
    });
    expect(session.getSnapshot()).toBe(beforeRejection);
    expect(session.getSnapshot()).toEqual({
      primaryId: overlayIdsV1.inventory,
      detailIds: [
        overlayIdsV1.ingredientOne,
        overlayIdsV1.sourceOne,
        overlayIdsV1.supplierOne,
        overlayIdsV1.historyOne,
      ],
    });
    expect(maximumOverlayDetailDepthV1).toBe(4);
  });

  it("derives deeply frozen, identity-stable snapshots from the Coordinator", async () => {
    const fixture = createOverlayFixtureV1();
    const { internal, session } = fixture;
    const initial = session.getSnapshot();

    expect(session.getSnapshot()).toBe(initial);
    expect(Object.isFrozen(initial)).toBe(true);
    expect(Object.isFrozen(initial.detailIds)).toBe(true);
    expect(Object.isFrozen(session)).toBe(true);

    await openReadyV1(fixture, overlayIdsV1.inventory);
    const opened = session.getSnapshot();
    expect(opened).not.toBe(initial);
    expect(session.getSnapshot()).toBe(opened);
    expect(Object.isFrozen(opened)).toBe(true);
    expect(Object.isFrozen(opened.detailIds)).toBe(true);
    expect(internal.getManagedSnapshotInternalV1().orderedInstances).toHaveLength(1);
    expect(internal.getManagedSnapshotInternalV1().orderedInstances[0]!.readiness).toEqual({
      kind: "ready",
    });
  });

  it("rejects invalid detail commands without mutating the Coordinator", async () => {
    const fixture = createOverlayFixtureV1();
    const { internal, session } = fixture;
    const beforeNoPrimary = internal.getManagedSnapshotInternalV1();

    expect(session.pushDetail(overlayIdsV1.ingredientOne)).toEqual({
      kind: "rejected",
      code: "overlay.no_primary",
    });
    expect(internal.getManagedSnapshotInternalV1()).toBe(beforeNoPrimary);

    await openReadyV1(fixture, overlayIdsV1.inventory);
    expect(session.pushDetail(overlayIdsV1.inventory)).toEqual({
      kind: "rejected",
      code: "overlay.duplicate",
    });
    await pushReadyV1(fixture, overlayIdsV1.ingredientOne);
    const beforeDuplicate = internal.getManagedSnapshotInternalV1();
    const duplicate = session.pushDetail(overlayIdsV1.ingredientOne);
    expect(duplicate).toEqual({ kind: "rejected", code: "overlay.duplicate" });
    expect(Object.isFrozen(duplicate)).toBe(true);
    expect(internal.getManagedSnapshotInternalV1()).toBe(beforeDuplicate);

    const beforeUnchanged = session.getSnapshot();
    expect(session.openPrimary(overlayIdsV1.inventory)).toEqual({
      kind: "preparing",
      code: "overlay.preparation_started",
    });
    await settleCandidateV1(internal);
    expect(session.getSnapshot()).toEqual({
      primaryId: overlayIdsV1.inventory,
      detailIds: [],
    });
    expect(session.getSnapshot()).not.toBe(beforeUnchanged);
    expect(session.openPrimary(overlayIdsV1.inventory)).toEqual({
      kind: "unchanged",
      code: "overlay.already_open",
    });
  });

  it("retains the current primary while preparing a replacement, then cuts over once", async () => {
    const fixture = createOverlayFixtureV1();
    const { internal, session } = fixture;
    await openReadyV1(fixture, overlayIdsV1.inventory);
    await pushReadyV1(fixture, overlayIdsV1.ingredientOne);
    await pushReadyV1(fixture, overlayIdsV1.supplierOne);
    const beforeReplacement = session.getSnapshot();
    const listener = vi.fn();
    session.subscribe(listener);

    expect(session.openPrimary(overlayIdsV1.ledger)).toEqual({
      kind: "preparing",
      code: "overlay.preparation_started",
    });
    expect(listener).toHaveBeenCalledOnce();
    expect(session.getSnapshot()).toEqual(beforeReplacement);

    await settleCandidateV1(internal);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(session.getSnapshot()).toEqual({ primaryId: overlayIdsV1.ledger, detailIds: [] });
  });

  it("routes Back to the top detail, then closes details before the primary", async () => {
    const fixture = createOverlayFixtureV1();
    const { internal, session } = fixture;
    await openReadyV1(fixture, overlayIdsV1.inventory);
    await pushReadyV1(fixture, overlayIdsV1.ingredientOne);
    await pushReadyV1(fixture, overlayIdsV1.supplierOne);

    const top = internal
      .getManagedSnapshotInternalV1()
      .orderedInstances.toReversed()
      .find((instance) => instance.readiness.kind === "ready")!;
    const topHandle = internal.getHandleInternalV1(top.surfaceInstanceId)!;
    expect(internal.routeDismissInternalV1(topHandle, "back")).toMatchObject({
      kind: "applied",
      code: "surface.dismissed",
    });
    expect(session.getSnapshot()).toEqual({
      primaryId: overlayIdsV1.inventory,
      detailIds: [overlayIdsV1.ingredientOne],
    });
    expect(session.closeTop()).toBe("detail_closed");
    expect(session.closeTop()).toBe("primary_closed");
    expect(session.getSnapshot()).toEqual({ primaryId: null, detailIds: [] });
    expect(session.closeTop()).toBe("already_closed");
  });

  it("supports idempotent subscription cleanup and no-op closeAll", async () => {
    const fixture = createOverlayFixtureV1();
    const { internal, session } = fixture;
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);

    session.closeAll();
    expect(listener).not.toHaveBeenCalled();
    expect(session.openPrimary(overlayIdsV1.inventory)).toEqual({
      kind: "preparing",
      code: "overlay.preparation_started",
    });
    expect(listener).toHaveBeenCalledOnce();
    await settleCandidateV1(internal);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    unsubscribe();
    session.closeAll();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(session.getSnapshot()).toEqual({ primaryId: null, detailIds: [] });
  });

  it("returns frozen preparing, unchanged, and rejected results", async () => {
    const fixture = createOverlayFixtureV1();
    const { internal, session } = fixture;
    const rejected = session.pushDetail(overlayIdsV1.ingredientOne);
    const preparing = session.openPrimary(overlayIdsV1.inventory);
    await settleCandidateV1(internal);
    const unchanged = session.openPrimary(overlayIdsV1.inventory);

    expect(Object.isFrozen(rejected)).toBe(true);
    expect(Object.isFrozen(preparing)).toBe(true);
    expect(Object.isFrozen(unchanged)).toBe(true);
  });
});
