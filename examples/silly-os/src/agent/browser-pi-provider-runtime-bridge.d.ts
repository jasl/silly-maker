// SPDX-License-Identifier: MIT

import type { PiAgentPortV1, PiAgentRunInputV1 } from "./browser-pi-runtime-bridge.js";
import type {
  BrowserPiModelSelectionV1,
  BrowserPiProviderCatalogWireV1,
} from "./browser-pi-worker-protocol.ts";
import type { BrowserPiProviderFetchV1 } from "./browser-pi-provider-fetch-guard.ts";

export function projectBrowserPiProviderCatalogV1(): BrowserPiProviderCatalogWireV1;

/** Returns whether the exact pinned Provider route may be configured in Browser. */
export function isBrowserPiSelectionAvailableV1(
  selection: BrowserPiModelSelectionV1,
): boolean;

export function probeBrowserPiProviderSelectionV1(input: {
  readonly apiKey: string;
  readonly selection: BrowserPiModelSelectionV1;
  readonly signal: AbortSignal;
  readonly fetch: BrowserPiProviderFetchV1;
}): Promise<boolean>;

export function browserPiCreatorToolChoiceV1(proposed: boolean): "auto" | "none";

export function createBrowserPiProviderAgentV1(
  input: PiAgentRunInputV1 & {
    readonly apiKey: string;
    readonly selection: BrowserPiModelSelectionV1;
    readonly fetch: BrowserPiProviderFetchV1;
  },
): PiAgentPortV1;
