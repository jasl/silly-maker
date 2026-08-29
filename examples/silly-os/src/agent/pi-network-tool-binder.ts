// SPDX-License-Identifier: MIT

import type { AgentTool } from "./pi-workspace-runtime-bridge.js";
import { Type } from "./pi-workspace-runtime-bridge.js";

export const piFetchUrlToolNameV1 = "fetch_url";
export const piFetchUrlUntrustedContentPrefixV1 = "[Untrusted remote content]\n";

export interface PiFetchUrlParametersV1 {
  readonly url: string;
}

export interface PiFetchUrlResultV1 {
  readonly status: number;
  readonly contentType: string | null;
  readonly bytes: number;
  readonly text: string;
}

const piFetchUrlSchemaV1 = Type.Object(
  {
    url: Type.String({
      minLength: 1,
      maxLength: 8_192,
      description: "One absolute HTTPS URL to fetch as bounded text.",
    }),
  },
  { additionalProperties: false },
);

/**
 * Product-fixed Pi AgentTool for one bounded Browser network capability.
 * Pi owns tool dispatch; the supplied handler owns authorization and the
 * independent Broker request for the exact current run.
 */
export function createPiFetchUrlToolV1(input: {
  readonly execute: (
    toolCallId: string,
    url: string,
    signal?: AbortSignal,
  ) => Promise<PiFetchUrlResultV1>;
}): AgentTool<PiFetchUrlParametersV1, PiFetchUrlResultV1> {
  return {
    name: piFetchUrlToolNameV1,
    label: "Fetch URL",
    description:
      "Fetch one user-authorized HTTPS URL as bounded text. Browser CORS and the target server still decide whether the response is readable.",
    parameters: piFetchUrlSchemaV1,
    executionMode: "sequential",
    async execute(toolCallId, params, signal) {
      const result = await input.execute(toolCallId, params.url, signal);
      return {
        content: [{
          type: "text",
          text: `${piFetchUrlUntrustedContentPrefixV1}${result.text}`,
        }],
        details: result,
      };
    },
  };
}
