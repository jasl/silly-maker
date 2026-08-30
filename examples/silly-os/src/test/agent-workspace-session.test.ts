// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import type { WorkspaceExecutionDescriptorV1 } from "../workspace/contracts.ts";
import {
  agentWorkspaceSessionMatchesV1,
  agentWorkspaceSessionTokenV1,
  agentWorkspaceTargetMatchesV1,
  releaseAgentWorkspaceSessionTrackingV1,
} from "../ui/agent-workspace-session.ts";

const descriptorV1: WorkspaceExecutionDescriptorV1 = {
  revision: 1,
  programId: "program.lazy-workspace.1",
  workspaceId: "workspace.lazy-workspace.1",
  workspaceSessionId: "workspace-session.lazy-workspace.1",
  generation: 3,
};

describe("SillyOS UI Workspace session ownership", () => {
  it("retains one exact session identity while its content generation advances", () => {
    const token = agentWorkspaceSessionTokenV1(descriptorV1);

    expect(agentWorkspaceSessionMatchesV1(token, { ...descriptorV1, generation: 4 })).toBe(true);
  });

  it("does not let an old operation release a later successor session", () => {
    const token = agentWorkspaceSessionTokenV1(descriptorV1);

    expect(agentWorkspaceSessionMatchesV1(token, {
      ...descriptorV1,
      workspaceSessionId: "workspace-session.lazy-workspace.2",
      generation: 1,
    })).toBe(false);
  });

  it("can reuse the current session only for the requested Program Workspace", () => {
    expect(agentWorkspaceTargetMatchesV1({
      programId: descriptorV1.programId,
      workspaceId: descriptorV1.workspaceId,
    }, descriptorV1)).toBe(true);
    expect(agentWorkspaceTargetMatchesV1({
      programId: descriptorV1.programId,
      workspaceId: "workspace.lazy-workspace.other",
    }, descriptorV1)).toBe(false);
  });

  it("clears every owner of one released session without touching a successor", () => {
    const token = agentWorkspaceSessionTokenV1(descriptorV1);
    const successor = agentWorkspaceSessionTokenV1({
      ...descriptorV1,
      workspaceSessionId: "workspace-session.lazy-workspace.2",
    });
    const ownedByRun = new Map([
      ["run.failed-release", token],
      ["run.successor", successor],
    ]);
    const reservedSessionIds = new Set([
      token.workspaceSessionId,
      successor.workspaceSessionId,
    ]);
    const pendingReleases = new Map([
      [token.workspaceSessionId, token],
      [successor.workspaceSessionId, successor],
    ]);

    releaseAgentWorkspaceSessionTrackingV1({
      token,
      ownedByRun,
      reservedSessionIds,
      pendingReleases,
    });

    expect([...ownedByRun]).toEqual([["run.successor", successor]]);
    expect([...reservedSessionIds]).toEqual([successor.workspaceSessionId]);
    expect([...pendingReleases]).toEqual([[successor.workspaceSessionId, successor]]);
  });
});
