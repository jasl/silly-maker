// SPDX-License-Identifier: MIT

import type { PiStreamFnV1 } from "../agent/browser-pi-runtime-bridge.js";

export function fauxAssistantMessage(
  content: unknown,
  options?: { readonly stopReason?: "stop" | "length" | "toolUse" | "error" | "aborted" },
): unknown;

export function fauxToolCall(
  name: string,
  argumentsValue: Readonly<Record<string, unknown>>,
  options?: { readonly id?: string },
): unknown;

export function fauxProvider(input: {
  readonly models: readonly {
    readonly id: string;
    readonly reasoning?: boolean;
  }[];
  readonly tokensPerSecond?: number;
}): {
  readonly provider: {
    readonly streamSimple: PiStreamFnV1;
  };
  readonly setResponses: (responses: readonly unknown[]) => void;
  readonly getModel: () => unknown;
};
