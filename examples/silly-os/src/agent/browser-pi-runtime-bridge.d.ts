// SPDX-License-Identifier: MIT

import type { CreatorAgentSubmitV1 } from "../product/contracts.ts";

export const creatorProgramRevisionToolNameV1: "sillyos_propose_program_revision";

export interface PiAgentPortV1 {
  prompt(text: string): Promise<{ readonly stopReason: "stop" | "error" | "aborted" }>;
  abort(): void;
  dispose(): void;
}

export interface PiAgentRunInputV1 {
  readonly submit: CreatorAgentSubmitV1;
  readonly onTextDelta: (delta: string) => void;
  readonly onCandidate: (candidate: unknown) => void | Promise<void>;
}

export type DeterministicPiAgentPortV1 = PiAgentPortV1;

export function createDeterministicPiAgentV1(
  input: PiAgentRunInputV1 & { readonly runNumber: number },
): PiAgentPortV1;
