// SPDX-License-Identifier: MIT

import type { PiStreamFnV1 } from "../agent/browser-pi-runtime-bridge.js";

export function fauxAssistantMessage(text: string): unknown;

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
