// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  parseChromeLayoutDocumentV1,
  parseRegionsDocumentV1,
  parseSceneDocumentV1,
} from "@sillymaker/base";
import type { ChromeLayoutDocumentV1, RegionsDocumentV1, SceneDocumentV1 } from "@sillymaker/base";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type { ChromeLayoutSourceIoV1 } from "./chrome-layout-io.ts";
import {
  createAuthoringHostInternalV1,
  resolveAuthoringHostOwnerInternalV1,
} from "./authoring-host.ts";
import type { AuthoringCloseParticipantInternalV1 } from "./authoring-host.ts";
import type { RegionsSourceIoV1 } from "./regions-io.ts";
import type { SceneSourceIoV1 } from "./scene-io.ts";
import {
  authoringWorkspaceContractInternalV1,
  authoringWorkspaceManifestInternalV1,
} from "../workspaces/workspace-manifest.ts";
import type {
  AuthoringWorkspaceManifestEntryInternalV1,
} from "../workspaces/workspace-manifest.ts";

const allWorkspacesV1 = authoringWorkspaceManifestInternalV1({
  hasFlow: true,
  hasRegionsIo: true,
  hasChromeIo: true,
});
const unavailableResultV1 = Object.freeze({
  kind: "error" as const,
  code: "unavailable" as const,
});

const unavailableSceneIoV1: SceneSourceIoV1 = Object.freeze({
  list: () => Promise.resolve(unavailableResultV1),
  read: () => Promise.resolve(unavailableResultV1),
  write: () => Promise.resolve(unavailableResultV1),
  create: () => Promise.resolve(unavailableResultV1),
});

const unavailableMotionIoV1: MotionSourceIoV1 = Object.freeze({
  list: () => Promise.resolve(unavailableResultV1),
  read: () => Promise.resolve(unavailableResultV1),
  write: () => Promise.resolve(unavailableResultV1),
  create: () => Promise.resolve(unavailableResultV1),
});

const unavailableRegionsIoV1: RegionsSourceIoV1 = Object.freeze({
  list: () => Promise.resolve(unavailableResultV1),
  read: () => Promise.resolve(unavailableResultV1),
  write: () => Promise.resolve(unavailableResultV1),
  create: () => Promise.resolve(unavailableResultV1),
});

const unavailableChromeIoV1: ChromeLayoutSourceIoV1 = Object.freeze({
  list: () => Promise.resolve(unavailableResultV1),
  read: () => Promise.resolve(unavailableResultV1),
  write: () => Promise.resolve(unavailableResultV1),
  create: () => Promise.resolve(unavailableResultV1),
});

function createHostV1(
  workspaceManifest: readonly AuthoringWorkspaceManifestEntryInternalV1[] = allWorkspacesV1,
) {
  return createAuthoringHostInternalV1({
    workspaceManifest,
    sceneIo: unavailableSceneIoV1,
    motionIo: unavailableMotionIoV1,
    ...(workspaceManifest.some((workspace) => workspace.id === "regions")
      ? { regionsIo: unavailableRegionsIoV1 }
      : {}),
    ...(workspaceManifest.some((workspace) => workspace.id === "chrome")
      ? { chromeIo: unavailableChromeIoV1 }
      : {}),
  });
}

function sceneDocumentV1(label: string): SceneDocumentV1 {
  return parseSceneDocumentV1({
    format: "sillymaker.scene",
    version: 1,
    sceneId: "scene.test.host",
    label,
    canvas: { width: 1280, height: 720 },
    entries: [],
    cues: [],
  });
}

function regionsDocumentV1(label: string): RegionsDocumentV1 {
  return parseRegionsDocumentV1({
    format: "sillymaker.regions",
    version: 1,
    regionsId: "regions.test.host",
    label,
    regions: [],
  });
}

function chromeDocumentV1(label: string): ChromeLayoutDocumentV1 {
  return parseChromeLayoutDocumentV1({
    format: "sillymaker.chrome-layout",
    version: 1,
    layoutId: "layout.test.host",
    label,
    canvas: { width: 1280, height: 720 },
    boxes: {},
    anchors: {},
    offsets: {},
  });
}

function controllableParticipantV1() {
  let dirty = false;
  const listeners = new Set<() => void>();
  const participant: AuthoringCloseParticipantInternalV1 = Object.freeze({
    getState: () => Object.freeze({ dirty, busy: false, canSave: true }),
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    save: () => Promise.resolve(true),
    discard: () => {
      dirty = false;
    },
  });
  return Object.freeze({
    participant,
    setDirty(next: boolean): void {
      dirty = next;
      for (const listener of [...listeners]) listener();
    },
  });
}

describe("Authoring Host workspace focus", () => {
  it("owns bounded active and visited state for one Host lifetime", async () => {
    const host = createHostV1();
    const owner = resolveAuthoringHostOwnerInternalV1(host);
    const listener = vi.fn();
    host.subscribe(listener);

    const initial = host.getSnapshot();
    expect(initial.activeWorkspaceId).toBe("scene");
    expect(initial.visitedWorkspaceIds).toEqual(["scene"]);
    expect(initial.workspaceIds).toEqual(["scene", "motion", "regions", "chrome", "flow"]);

    expect(owner.focusWorkspace("chrome")).toBe(true);
    const focused = host.getSnapshot();
    expect(focused.activeWorkspaceId).toBe("chrome");
    expect(focused.visitedWorkspaceIds).toEqual(["scene", "chrome"]);
    expect(focused.revision).toBe(initial.revision + 1);
    expect(listener).toHaveBeenCalledTimes(1);

    expect(owner.focusWorkspace("chrome")).toBe(true);
    expect(host.getSnapshot()).toBe(focused);
    expect(listener).toHaveBeenCalledTimes(1);

    for (const workspaceId of initial.workspaceIds) owner.focusWorkspace(workspaceId);
    expect(host.getSnapshot().visitedWorkspaceIds).toEqual(initial.workspaceIds);

    const beforeHide = host.getSnapshot();
    owner.markViewConnected(1, true);
    owner.markViewConnected(1, false);
    expect(host.getSnapshot().activeWorkspaceId).toBe(beforeHide.activeWorkspaceId);
    expect(host.getSnapshot().visitedWorkspaceIds).toEqual(beforeHide.visitedWorkspaceIds);

    const limitedHost = createHostV1(authoringWorkspaceManifestInternalV1({
      hasFlow: false,
      hasRegionsIo: false,
      hasChromeIo: false,
    }));
    const limitedOwner = resolveAuthoringHostOwnerInternalV1(limitedHost);
    const limitedSnapshot = limitedHost.getSnapshot();
    expect(limitedOwner.focusWorkspace("flow")).toBe(false);
    expect(limitedHost.getSnapshot()).toBe(limitedSnapshot);

    const freshHost = createHostV1();
    expect(freshHost.getSnapshot().activeWorkspaceId).toBe("scene");
    expect(freshHost.getSnapshot().visitedWorkspaceIds).toEqual(["scene"]);
    await Promise.all([host.dispose(), limitedHost.dispose(), freshHost.dispose()]);
  });

  it("derives dirty workspace ids from their actual authorities in manifest order", async () => {
    const host = createHostV1();
    const owner = resolveAuthoringHostOwnerInternalV1(host);
    const motion = controllableParticipantV1();
    const sceneParticipant = controllableParticipantV1();
    const unregisterMotion = owner.registerCloseParticipant("motion", motion.participant);
    owner.registerCloseParticipant("scene", sceneParticipant.participant);
    const regionsSession = owner.regionsSession;
    const chromeSession = owner.chromeSession;
    if (regionsSession === null || chromeSession === null) {
      throw new TypeError("Full Host fixture must own Regions and Chrome sessions");
    }

    sceneParticipant.setDirty(true);
    expect(host.getSnapshot().dirtyWorkspaceIds).toEqual([]);

    owner.sceneSession.installSaved({
      path: "scene.json",
      document: sceneDocumentV1("Saved scene"),
      digest: "sha256:scene",
    });
    owner.sceneSession.replaceDraft(sceneDocumentV1("Draft scene"));
    expect(host.getSnapshot().dirtyWorkspaceIds).toEqual(["scene"]);

    regionsSession.installSaved({
      path: "regions.json",
      document: regionsDocumentV1("Saved regions"),
      digest: "sha256:regions",
    });
    regionsSession.replaceDraft(regionsDocumentV1("Draft regions"));
    motion.setDirty(true);
    expect(host.getSnapshot().dirtyWorkspaceIds).toEqual(["scene", "motion", "regions"]);

    chromeSession.installSaved({
      path: "chrome.json",
      document: chromeDocumentV1("Saved chrome"),
      digest: "sha256:chrome",
    });
    chromeSession.replaceDraft(chromeDocumentV1("Draft chrome"));
    expect(host.getSnapshot().dirtyWorkspaceIds).toEqual([
      "scene",
      "motion",
      "regions",
      "chrome",
    ]);
    expect(host.getSnapshot().dirty).toBe(true);

    unregisterMotion();
    expect(host.getSnapshot().dirtyWorkspaceIds).toEqual(["scene", "regions", "chrome"]);
    owner.sceneSession.discard();
    regionsSession.discard();
    chromeSession.discard();
    expect(host.getSnapshot().dirtyWorkspaceIds).toEqual([]);
    expect(host.getSnapshot().dirty).toBe(false);
    await host.dispose();
  });

  it("freezes observable navigation after disposal", async () => {
    const host = createHostV1();
    const owner = resolveAuthoringHostOwnerInternalV1(host);
    const motion = controllableParticipantV1();
    owner.registerCloseParticipant("motion", motion.participant);
    owner.focusWorkspace("chrome");
    motion.setDirty(true);
    const listener = vi.fn();
    host.subscribe(listener);
    const captured = host.getSnapshot();

    await host.dispose();
    await host.dispose();
    expect(owner.focusWorkspace("flow")).toBe(false);
    owner.markViewConnected(1, true);
    motion.setDirty(false);
    owner.sceneSession.installSaved({
      path: "scene.json",
      document: sceneDocumentV1("Saved scene"),
      digest: "sha256:scene",
    });
    owner.sceneSession.replaceDraft(sceneDocumentV1("Draft scene"));

    expect(host.getSnapshot()).toBe(captured);
    expect(listener).not.toHaveBeenCalled();
  });

  it("treats order and lifecycle metadata, but not labels, as R1 identity", () => {
    const base = allWorkspacesV1;
    const baseSignature = authoringWorkspaceContractInternalV1(base).signature;
    const relabeled = Object.freeze(
      base.map((workspace) => Object.freeze({ ...workspace, label: `${workspace.label}!` })),
    );
    expect(authoringWorkspaceContractInternalV1(relabeled).signature).toBe(baseSignature);

    const reordered = Object.freeze([base[1]!, base[0]!, ...base.slice(2)]);
    const activationChanged = Object.freeze([
      Object.freeze({ ...base[0]!, activation: "progressive" as const }),
      ...base.slice(1),
    ]);
    const readinessChanged = Object.freeze([
      Object.freeze({ ...base[0]!, readiness: "connected" as const }),
      ...base.slice(1),
    ]);
    for (const incompatible of [reordered, activationChanged, readinessChanged]) {
      expect(authoringWorkspaceContractInternalV1(incompatible).signature).not.toBe(
        baseSignature,
      );
    }
  });
});
