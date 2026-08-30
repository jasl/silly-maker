// SPDX-License-Identifier: MIT

import type { WorkspaceExecutionDescriptorV1 } from "../workspace/contracts.ts";

/**
 * Identifies the exact Workspace session acquired for one UI operation. The
 * generation may advance while an Agent edits the Workspace, so ownership is
 * fenced by the session identity rather than the mutable content generation.
 */
export interface AgentWorkspaceSessionTokenV1 {
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
}

export function agentWorkspaceSessionTokenV1(
  descriptor: WorkspaceExecutionDescriptorV1,
): AgentWorkspaceSessionTokenV1 {
  return {
    programId: descriptor.programId,
    workspaceId: descriptor.workspaceId,
    workspaceSessionId: descriptor.workspaceSessionId,
  };
}

export function agentWorkspaceSessionMatchesV1(
  token: AgentWorkspaceSessionTokenV1,
  descriptor: WorkspaceExecutionDescriptorV1 | null,
): boolean {
  return descriptor !== null &&
    descriptor.programId === token.programId &&
    descriptor.workspaceId === token.workspaceId &&
    descriptor.workspaceSessionId === token.workspaceSessionId;
}

export function agentWorkspaceTargetMatchesV1(
  target: { readonly programId: string; readonly workspaceId: string },
  descriptor: WorkspaceExecutionDescriptorV1 | null,
): boolean {
  return descriptor !== null && descriptor.programId === target.programId &&
    descriptor.workspaceId === target.workspaceId;
}

/** Clears every UI owner of one exact Workspace session after release or replacement. */
export function releaseAgentWorkspaceSessionTrackingV1(input: {
  readonly token: AgentWorkspaceSessionTokenV1;
  readonly ownedByRun: Map<string, AgentWorkspaceSessionTokenV1>;
  readonly reservedSessionIds: Set<string>;
  readonly pendingReleases: Map<string, AgentWorkspaceSessionTokenV1>;
}): void {
  for (const [runId, token] of input.ownedByRun) {
    if (token.workspaceSessionId === input.token.workspaceSessionId) {
      input.ownedByRun.delete(runId);
    }
  }
  input.reservedSessionIds.delete(input.token.workspaceSessionId);
  input.pendingReleases.delete(input.token.workspaceSessionId);
}
