// SPDX-License-Identifier: MIT

import type { CreatorAgentSubmitV1 } from "../product/contracts.ts";

export const creatorProgramRevisionToolNameV1: "sillyos_propose_program_revision";

export interface DeterministicPiAgentPortV1 {
  prompt(text: string): Promise<{ readonly stopReason: "stop" | "error" | "aborted" }>;
  abort(): void;
  dispose(): void;
}

export function createDeterministicPiAgentV1(input: {
  readonly submit: CreatorAgentSubmitV1;
  readonly runNumber: number;
  readonly onTextDelta: (delta: string) => void;
  readonly onCandidate: (candidate: unknown) => void | Promise<void>;
}): DeterministicPiAgentPortV1;
