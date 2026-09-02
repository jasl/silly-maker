// SPDX-License-Identifier: MIT

import type { AgentTool } from "./pi-workspace-runtime-bridge.js";
import type { BrowserPiAgentDispatchV1 } from "./browser-pi-agent-dispatch.ts";
import type { ProgramRuntimeProfileDescriptorV1 } from "../program-platform/package/program-runtime-profile-descriptor.ts";
import type { LoadedProgramModelPromptOverlayV1 } from "../program-platform/package/program-model-prompt-overlays.ts";

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

export type BrowserProgramCompletionProtocolV1 =
  | {
    readonly kind: "candidate";
    readonly deterministicArguments: Readonly<Record<string, unknown>>;
    createTool(input: {
      readonly onCandidate: (candidate: unknown) => void | Promise<void>;
    }): AgentTool;
    admitCandidate(value: unknown): BrowserProgramCandidateAdmissionV1;
  }
  | { readonly kind: "text" };

/** One profile-admitted execution plan. No generic Agent code interprets its payload. */
export interface BrowserProgramRuntimeInvocationV1 {
  readonly requestedOutputTokens: number;
  readonly userPrompt: string;
  readonly textOutput: BrowserProgramTextOutputPolicyV1;
  readonly deterministicTest: { readonly finalReply: string };
  /** Candidate workflows publish one admitted object; conversational runs finish with text only. */
  readonly completion: BrowserProgramCompletionProtocolV1;
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
 * come from the current installed implementation compatible with the Process.
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

/** One read-only file from the current Program implementation snapshot. */
export interface BrowserProgramPackageResourceV1 {
  readonly path: string;
  readonly mediaType: string;
  readonly bytes: Uint8Array;
}

/** The current Program implementation paired with one admitted fixed runtime invocation. */
export interface BrowserProgramExecutionV1 {
  readonly instructions: string;
  /** Package text whose matching is deferred until the Provider resolves the model ID. */
  readonly modelPromptOverlays: readonly LoadedProgramModelPromptOverlayV1[];
  /** Read-only resources from the mounted current compatible Program implementation. */
  readonly packageResources: readonly BrowserProgramPackageResourceV1[];
  /** Package scripts staged into this Process VFS before the Agent receives control. */
  readonly workspaceScripts: readonly BrowserProgramWorkspaceScriptV1[];
  readonly runtimeProfile: BrowserProgramRuntimeProfileV1;
  readonly invocation: BrowserProgramRuntimeInvocationV1;
}
