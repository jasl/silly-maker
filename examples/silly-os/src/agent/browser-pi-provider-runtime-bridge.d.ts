// SPDX-License-Identifier: MIT

import type { PiAgentPortV1, PiAgentRunInputV1 } from "./browser-pi-runtime-bridge.js";
import type {
  BrowserPiModelSelectionV1,
  BrowserPiProviderCatalogWireV1,
} from "./browser-pi-worker-protocol.ts";

export function projectBrowserPiProviderCatalogV1(): BrowserPiProviderCatalogWireV1;

export function isBrowserPiSelectionQualifiedV1(
  selection: BrowserPiModelSelectionV1,
): boolean;

export function createBrowserPiProviderAgentV1(
  input: PiAgentRunInputV1 & {
    readonly apiKey: string;
    readonly selection: BrowserPiModelSelectionV1;
  },
): PiAgentPortV1;
