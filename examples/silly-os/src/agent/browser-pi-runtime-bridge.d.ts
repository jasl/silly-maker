// SPDX-License-Identifier: MIT

import type { AgentTool } from "./pi-workspace-runtime-bridge.js";

import type { BrowserPiAgentDispatchV1 } from "./browser-pi-agent-dispatch.ts";
import type { CreatorAgentSubmitV1 } from "../product/contracts.ts";
import type { BrowserPiReasoningEffortV1 } from "./browser-pi-worker-protocol.ts";
import type { BrowserBuiltinProgramPackageV1 } from "./browser-builtin-program-package.ts";

export const deterministicCancellationHoldPrefixV1: "Hold this deterministic run until cancelled:";
export const deterministicPersistenceReadPrefixV1:
  "Verify the persisted workspace contains exactly: ";
export const deterministicEditProbePrefixV1:
  "Exercise the pinned native Pi edit tool with exact text: ";
export const deterministicBashProbePrefixV1:
  "Exercise the pinned native Pi bash tool with exact text: ";
export const deterministicFileOpsProbePrefixV1:
  "Exercise the pinned native Pi workspace file operations lifecycle: ";
export const deterministicGrepProbePrefixV1:
  "Exercise the product-fixed Pi grep tool with exact text: ";
export const deterministicFetchUrlProbePrefixV1:
  "Exercise the product-fixed Pi fetch_url tool for exact URL: ";
export const deterministicDownloadProbePrefixV1:
  "Exercise the product-fixed Pi download tool for exact URL: ";
export const deterministicDownloadDestinationV1: "/workspace/.sillyos/n2-download.bin";
export const deterministicOversizedReadProbeV1:
  "Verify the qualification workspace rejects an oversized native Pi read.";

export interface PiAgentPortV1 {
  prompt(text: string): Promise<{ readonly stopReason: "stop" | "error" | "aborted" }>;
  abort(): void;
  dispose(): void;
}

export interface PiAgentRunInputV1 {
  readonly dispatch: BrowserPiAgentDispatchV1;
  readonly programPackage: BrowserBuiltinProgramPackageV1;
  readonly workspaceTools: readonly AgentTool[];
  readonly onTextDelta: (delta: string) => void;
  readonly onCandidate: (candidate: unknown) => void | Promise<void>;
  readonly reasoningEffort: BrowserPiReasoningEffortV1;
}

/**
 * Product-local structural boundary for the fixed Pi runtime.
 *
 * The implementation owns Pi's concrete provider/model/event types. Keeping
 * them opaque here prevents third-party Provider SDK declarations from becoming
 * part of SillyOS's public TypeScript surface.
 */
export interface PiSimpleStreamOptionsV1 {
  readonly reasoning?: BrowserPiReasoningEffortV1;
}

export type PiStreamFnV1 = (
  model: unknown,
  context: unknown,
  options?: PiSimpleStreamOptionsV1,
) => unknown;

export interface PiAgentRuntimeInputV1 {
  readonly instructions: string;
  readonly workspaceTools: readonly AgentTool[];
  readonly completionTool: AgentTool;
  readonly onTextDelta: (delta: string) => void;
  readonly reasoningEffort: BrowserPiReasoningEffortV1;
  readonly streamFn: PiStreamFnV1;
  readonly getApiKey?: (provider: string) => Promise<string | undefined> | string | undefined;
  readonly model: unknown;
}

export type DeterministicPiAgentPortV1 = PiAgentPortV1;

export function createPiAgentV1(input: PiAgentRuntimeInputV1): PiAgentPortV1;

export function createDeterministicPiAgentV1(
  input: Omit<PiAgentRunInputV1, "dispatch"> & {
    readonly submit: CreatorAgentSubmitV1;
    readonly runNumber: number;
  },
): PiAgentPortV1;
