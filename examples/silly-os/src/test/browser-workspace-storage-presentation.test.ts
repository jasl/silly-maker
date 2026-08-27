// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  shouldOfferBrowserWorkspacePersistenceV1,
  type WorkpieceBrowserStorageV1,
  type WorkpieceExecutionWorkspaceV1,
} from "../ui/workpiece-pane.tsx";

function workspaceV1(
  generation: number,
  phase: WorkpieceExecutionWorkspaceV1["phase"] = "open",
): WorkpieceExecutionWorkspaceV1 {
  return {
    phase,
    descriptor: { workspaceSessionId: "workspace-session-1", generation },
    lastReceipt: null,
    diagnostic: null,
  };
}

function storageV1(
  input: Partial<Extract<WorkpieceBrowserStorageV1, { readonly phase: "available" }>> = {},
): WorkpieceBrowserStorageV1 {
  return {
    phase: "available",
    persisted: false,
    persistenceRequest: "idle",
    ...input,
  };
}

describe("SillyOS Browser storage presentation", () => {
  it("offers persistence only for open important work with an explicit request path", () => {
    expect(
      shouldOfferBrowserWorkspacePersistenceV1({
        workspace: workspaceV1(2),
        storage: storageV1(),
        requestAvailable: true,
      }),
    ).toBe(true);
    expect(
      shouldOfferBrowserWorkspacePersistenceV1({
        workspace: workspaceV1(1),
        storage: storageV1(),
        requestAvailable: true,
      }),
    ).toBe(false);
    expect(
      shouldOfferBrowserWorkspacePersistenceV1({
        workspace: workspaceV1(2, "opening"),
        storage: storageV1(),
        requestAvailable: true,
      }),
    ).toBe(false);
    expect(
      shouldOfferBrowserWorkspacePersistenceV1({
        workspace: workspaceV1(2),
        storage: storageV1(),
        requestAvailable: false,
      }),
    ).toBe(false);
  });

  it("does not repeat the action after a granted, denied, unavailable, or pending result", () => {
    for (
      const storage of [
        storageV1({ persisted: true, persistenceRequest: "granted" }),
        storageV1({ persistenceRequest: "denied" }),
        storageV1({ persistenceRequest: "unavailable" }),
        storageV1({ persistenceRequest: "requesting" }),
        { phase: "checking", persistenceRequest: "idle" } as const,
        { phase: "unavailable", persistenceRequest: "idle" } as const,
      ] satisfies readonly WorkpieceBrowserStorageV1[]
    ) {
      expect(
        shouldOfferBrowserWorkspacePersistenceV1({
          workspace: workspaceV1(2),
          storage,
          requestAvailable: true,
        }),
      ).toBe(false);
    }
  });
});
