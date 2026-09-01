// SPDX-License-Identifier: MIT

import type { AgentTool } from "./pi-workspace-runtime-bridge.js";
import { Type } from "./pi-workspace-runtime-bridge.js";

export const piFetchUrlToolNameV1 = "fetch_url";
export const piFetchUrlUntrustedContentPrefixV1 = "[Untrusted remote content]\n";
export const piDownloadToolNameV1 = "download";
export const piNetworkDisabledErrorCodeV1 = "network_disabled";

export interface PiFetchUrlParametersV1 {
  readonly url: string;
}

export interface PiFetchUrlResultV1 {
  readonly status: number;
  readonly contentType: string | null;
  readonly bytes: number;
  readonly text: string;
}

export interface PiDownloadParametersV1 {
  readonly url: string;
  readonly destination: string;
  readonly overwrite?: boolean;
}

export interface PiDownloadResultV1 {
  readonly status: number;
  readonly contentType: string | null;
  readonly bytes: number;
  readonly destination: string;
  readonly generation: number;
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

const piDownloadSchemaV1 = Type.Object(
  {
    url: Type.String({
      minLength: 1,
      maxLength: 8_192,
      description: "One absolute HTTPS URL to download.",
    }),
    destination: Type.String({
      minLength: 1,
      maxLength: 1_024,
      description: "One absolute destination path below /workspace.",
    }),
    overwrite: Type.Optional(Type.Boolean({
      description: "Replace an existing destination only when explicitly true.",
    })),
  },
  { additionalProperties: false },
);

/**
 * Product-fixed Pi AgentTool for one bounded Browser network capability.
 * Pi owns tool dispatch; the supplied handler enforces the current Process's
 * network setting and owns the independent Broker request.
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
      "Fetch one HTTPS URL as bounded text when network access is enabled for the current Process. Browser CORS and the target server still decide whether the response is readable.",
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

/**
 * Product-fixed Pi AgentTool for one bounded remote-to-Workspace transfer.
 * The handler enforces the current Process's network setting, binds current
 * run/Workspace authority, and moves the response over a private streamed
 * channel; Pi receives only the final bounded receipt.
 */
export function createPiDownloadToolV1(input: {
  readonly execute: (
    toolCallId: string,
    params: Required<PiDownloadParametersV1>,
    signal?: AbortSignal,
  ) => Promise<PiDownloadResultV1>;
}): AgentTool<PiDownloadParametersV1, PiDownloadResultV1> {
  return {
    name: piDownloadToolNameV1,
    label: "Download",
    description:
      "Download one HTTPS response into the current Program workspace when network access is enabled for the current Process. The complete response body is not returned to the model.",
    parameters: piDownloadSchemaV1,
    executionMode: "sequential",
    async execute(toolCallId, params, signal) {
      const normalized = Object.freeze({
        url: params.url,
        destination: params.destination,
        overwrite: params.overwrite ?? false,
      });
      const result = await input.execute(toolCallId, normalized, signal);
      return {
        content: [{
          type: "text",
          text: `Downloaded ${String(result.bytes)} bytes to ${result.destination}.`,
        }],
        details: result,
      };
    },
  };
}
