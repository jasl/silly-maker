// SPDX-License-Identifier: MIT

import type { PiAgentPortV1, PiAgentRunInputV1 } from "./browser-pi-runtime-bridge.js";
import type {
  BrowserPiModelSelectionV1,
  BrowserPiProviderCatalogWireV1,
  BrowserPiReasoningEffortV1,
} from "./browser-pi-worker-protocol.ts";
import type { BrowserPiProviderFetchV1 } from "./browser-pi-provider-fetch-guard.ts";
import type {
  BrowserProgramRuntimeInvocationV1,
  BrowserProgramRuntimeProfileV1,
} from "./browser-program-runtime-profile.ts";
import type { LoadedProgramModelPromptOverlayV1 } from "../program-platform/package/program-model-prompt-overlays.ts";

export function projectBrowserPiProviderCatalogV1(): BrowserPiProviderCatalogWireV1;

/** Returns whether the exact pinned Provider route may be configured in Browser. */
export function isBrowserPiSelectionAvailableV1(
  selection: BrowserPiModelSelectionV1,
): boolean;

/** Resolves one product preference through the pinned Pi model's exact support map. */
export function resolveBrowserPiReasoningEffortV1(
  selection: BrowserPiModelSelectionV1 | null,
  preferredReasoningEffort: BrowserPiReasoningEffortV1,
): BrowserPiReasoningEffortV1;

export function probeBrowserPiProviderSelectionV1(input: {
  readonly apiKey: string;
  readonly selection: BrowserPiModelSelectionV1;
  readonly signal: AbortSignal;
  readonly fetch: BrowserPiProviderFetchV1;
}): Promise<boolean>;

export function browserPiCompletionToolChoiceV1(proposed: boolean): "auto" | "none";

export function browserPiAgentProviderTimeoutMillisecondsV1(
  runtimeProfile: BrowserProgramRuntimeProfileV1,
): number;

export function browserPiAgentMaximumOutputTokensV1(
  invocation: BrowserProgramRuntimeInvocationV1,
  modelMaximumTokens: number,
): number;

export function createBrowserPiProviderAgentV1(
  input: PiAgentRunInputV1 & {
    readonly apiKey: string;
    readonly selection: BrowserPiModelSelectionV1;
    readonly reasoningEffort: BrowserPiReasoningEffortV1;
    readonly fetch: BrowserPiProviderFetchV1;
    readonly modelPromptOverlays?: readonly LoadedProgramModelPromptOverlayV1[];
  },
): PiAgentPortV1;
