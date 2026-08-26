// SPDX-License-Identifier: MIT

import type { PiAgentPortV1, PiAgentRunInputV1 } from "./browser-pi-runtime-bridge.js";

export const browserOpenAiModelIdV1: "gpt-4.1-nano";

export function createOpenAiPiAgentV1(
  input: PiAgentRunInputV1 & { readonly apiKey: string },
): PiAgentPortV1;
