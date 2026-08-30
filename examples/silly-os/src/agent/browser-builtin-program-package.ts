// SPDX-License-Identifier: MIT

import type { AgentTool } from "./pi-workspace-runtime-bridge.js";
import type { BrowserPiAgentDispatchV1 } from "./browser-pi-agent-dispatch.ts";

export type BrowserBuiltinProgramHarnessToolIdV1 =
  | "read"
  | "write"
  | "edit"
  | "bash"
  | "grep"
  | "fetch_url"
  | "download";

export type BrowserBuiltinProgramCandidateAdmissionV1 =
  | { readonly kind: "admitted"; readonly candidate: object }
  | {
    readonly kind: "rejected";
    readonly failure: "candidate_invalid" | "candidate_context_mismatch";
  };

/**
 * One current, build-known built-in Program prototype. It carries the
 * Program-owned instructions and completion policy while selecting a subset of
 * the fixed Browser harness tools. Its reference identifies the compatible
 * harness contract; a refreshed product may select newer compatible Program
 * instructions or policy for the same reference.
 *
 * This is neither the harness implementation nor the final dynamic Program
 * package format. It is not a manifest, resolver, workflow language, or public
 * Program SDK. Unknown harness contracts never fall back.
 */
export interface BrowserBuiltinProgramPackageV1 {
  readonly reference: BrowserPiAgentDispatchV1["harnessReference"];
  readonly instructions: string;
  readonly harnessToolIds: readonly BrowserBuiltinProgramHarnessToolIdV1[];
  readonly providerTimeoutMilliseconds: number;
  readonly publishTextDeltas: boolean;
  requestedOutputTokens(dispatch: BrowserPiAgentDispatchV1): number;
  createUserPrompt(dispatch: BrowserPiAgentDispatchV1): string;
  createCompletionTool(input: {
    readonly dispatch: BrowserPiAgentDispatchV1;
    readonly onCandidate: (candidate: unknown) => void | Promise<void>;
  }): AgentTool;
  admitCandidate(
    value: unknown,
    dispatch: BrowserPiAgentDispatchV1,
  ): BrowserBuiltinProgramCandidateAdmissionV1;
}
