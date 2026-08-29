// SPDX-License-Identifier: MIT

import type { StreamFn } from "@earendil-works/pi-agent-core";
import type { Api, Model } from "@earendil-works/pi-ai";

import type { AgentTool } from "./pi-workspace-runtime-bridge.js";

import type { CreatorAgentSubmitV1 } from "../product/contracts.ts";
import type { BrowserPiReasoningEffortV1 } from "./browser-pi-worker-protocol.ts";

export const creatorProgramRevisionToolNameV1: "sillyos_propose_program_revision";
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
  readonly submit: CreatorAgentSubmitV1;
  readonly workspaceTools: readonly AgentTool[];
  readonly onTextDelta: (delta: string) => void;
  readonly onCandidate: (candidate: unknown) => void | Promise<void>;
  readonly reasoningEffort: BrowserPiReasoningEffortV1;
}

export interface PiAgentRuntimeInputV1 extends PiAgentRunInputV1 {
  readonly streamFn: StreamFn;
  readonly getApiKey?: (provider: string) => Promise<string | undefined> | string | undefined;
  readonly model: Model<Api>;
  readonly systemPrompt: string;
}

export type DeterministicPiAgentPortV1 = PiAgentPortV1;

export function createPiAgentV1(input: PiAgentRuntimeInputV1): PiAgentPortV1;

export function createDeterministicPiAgentV1(
  input: PiAgentRunInputV1 & { readonly runNumber: number },
): PiAgentPortV1;
