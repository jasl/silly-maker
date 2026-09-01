// SPDX-License-Identifier: MIT

import type { AgentTool } from "./pi-workspace-runtime-bridge.js";
import type { BrowserPiAgentDispatchV1 } from "./browser-pi-agent-dispatch.ts";
import type { ProgramRuntimeProfileDescriptorV1 } from "../program-platform/package/program-runtime-profile-descriptor.ts";

export type BrowserProgramHarnessToolIdV1 =
  | "program_resource"
  | "read"
  | "write"
  | "edit"
  | "bash"
  | "grep"
  | "fetch_url"
  | "download";

export type BrowserProgramCandidateAdmissionV1 =
  | { readonly kind: "admitted"; readonly candidate: object }
  | {
    readonly kind: "rejected";
    readonly failure: "candidate_invalid" | "candidate_context_mismatch";
  };

export type BrowserProgramTextOutputPolicyV1 =
  | { readonly kind: "discard" }
  | {
    readonly kind: "publish";
    readonly maximumCharacters: number;
  };

/** One profile-admitted execution plan. No generic Agent code interprets its payload. */
export interface BrowserProgramRuntimeInvocationV1 {
  readonly requestedOutputTokens: number;
  readonly userPrompt: string;
  readonly textOutput: BrowserProgramTextOutputPolicyV1;
  readonly deterministicTest: {
    readonly completionArguments: Readonly<Record<string, unknown>>;
    readonly finalReply: string;
  };
  createCompletionTool(input: {
    readonly onCandidate: (candidate: unknown) => void | Promise<void>;
  }): AgentTool;
  admitCandidate(value: unknown): BrowserProgramCandidateAdmissionV1;
}

export type BrowserProgramRuntimeInvocationAdmissionV1 =
  | { readonly kind: "admitted"; readonly invocation: BrowserProgramRuntimeInvocationV1 }
  | { readonly kind: "rejected" };

/**
 * One build-known implementation of a fixed SillyOS runtime profile.
 *
 * The profile is Host code, not Program package code: it selects capabilities
 * from the static Browser harness and owns the opaque payload admission,
 * completion protocol, and output budgets. Instructions and scripts always
 * come from the exact installed package pinned by the Process.
 */
export interface BrowserProgramRuntimeProfileV1 {
  readonly runtimeProfile: string;
  readonly packageDescriptor: ProgramRuntimeProfileDescriptorV1;
  readonly harnessToolIds: readonly BrowserProgramHarnessToolIdV1[];
  readonly providerTimeoutMilliseconds: number;
  admitDispatch(dispatch: BrowserPiAgentDispatchV1): BrowserProgramRuntimeInvocationAdmissionV1;
}

export interface BrowserProgramWorkspaceScriptV1 {
  readonly packagePath: string;
  readonly workspacePath: string;
  readonly runtime: "quickjs" | "python";
  readonly bytes: Uint8Array;
}

/** One exact immutable file from the Process-pinned Program package. */
export interface BrowserProgramPackageResourceV1 {
  readonly path: string;
  readonly mediaType: string;
  readonly bytes: Uint8Array;
}

/** The exact immutable package paired with one admitted fixed runtime invocation. */
export interface BrowserProgramExecutionV1 {
  readonly instructions: string;
  /** Read-only package bytes available only through the fixed Program-resource tool. */
  readonly packageResources: readonly BrowserProgramPackageResourceV1[];
  /** Package scripts staged into this Process VFS before the Agent receives control. */
  readonly workspaceScripts: readonly BrowserProgramWorkspaceScriptV1[];
  readonly runtimeProfile: BrowserProgramRuntimeProfileV1;
  readonly invocation: BrowserProgramRuntimeInvocationV1;
}
