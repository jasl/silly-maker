// SPDX-License-Identifier: MIT

import { Agent } from "@earendil-works/pi-agent-core";
import { fauxAssistantMessage, fauxProvider, fauxToolCall, Type } from "@earendil-works/pi-ai";

import { creatorAgentTextMaximumCharactersV1 } from "../product/contracts.ts";

export const creatorProgramRevisionToolNameV1 = "sillyos_propose_program_revision";

const creatorIdentifierPatternV1 = "^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$";
const deterministicFinalReplyV1 = "Deterministic test proposal ready.";

const creatorProgramRevisionToolSchemaV1 = Type.Object(
  {
    revision: Type.Literal(1),
    proposalId: Type.String({ minLength: 1, maxLength: 128, pattern: creatorIdentifierPatternV1 }),
    programId: Type.String({ minLength: 1, maxLength: 128, pattern: creatorIdentifierPatternV1 }),
    baseProgramRevision: Type.Integer({ minimum: 1 }),
    text: Type.String({ minLength: 1, maxLength: creatorAgentTextMaximumCharactersV1 }),
    requirement: Type.String({ minLength: 1, maxLength: creatorAgentTextMaximumCharactersV1 }),
  },
  { additionalProperties: false },
);

/**
 * The only place where the Browser product touches Pi's runtime-specific API.
 * The adjacent declaration intentionally exposes only the product's bounded port.
 */
export function createDeterministicPiAgentV1(input) {
  const faux = fauxProvider({
    tokenSize: { min: 64, max: 64 },
    tokensPerSecond: 0,
  });
  const candidate = {
    revision: 1,
    proposalId: input.submit.proposalId,
    programId: input.submit.programId,
    baseProgramRevision: input.submit.baseProgramRevision,
    text: input.submit.text,
    requirement: input.submit.text,
  };
  faux.setResponses([
    fauxAssistantMessage(
      fauxToolCall(creatorProgramRevisionToolNameV1, candidate, {
        id: `sillyos-tool-${input.runNumber}`,
      }),
      { stopReason: "toolUse" },
    ),
    fauxAssistantMessage(deterministicFinalReplyV1),
  ]);

  const tool = {
    name: creatorProgramRevisionToolNameV1,
    label: "Propose Program revision",
    description:
      "Return one complete, inert SillyOS Program revision candidate for product review.",
    parameters: creatorProgramRevisionToolSchemaV1,
    execute: async (_toolCallId, params, signal) => {
      if (signal?.aborted) throw new Error("Creator run was cancelled");
      await input.onCandidate(params);
      return {
        content: [{ type: "text", text: "Program revision candidate recorded for review." }],
        details: params,
      };
    },
  };
  const agent = new Agent({
    streamFn: faux.provider.streamSimple,
    initialState: {
      systemPrompt:
        "You are the deterministic SillyOS Creator Agent test runtime. Use the one provided tool exactly once.",
      model: faux.getModel(),
      thinkingLevel: "off",
      tools: [tool],
    },
  });
  const unsubscribe = agent.subscribe((event) => {
    if (
      event.type === "message_update" &&
      event.assistantMessageEvent.type === "text_delta"
    ) {
      input.onTextDelta(event.assistantMessageEvent.delta);
    }
  });
  let disposed = false;

  return {
    async prompt(text) {
      await agent.prompt(text);
      const finalAssistant = agent.state.messages.toReversed().find((message) =>
        message.role === "assistant"
      );
      if (finalAssistant?.role !== "assistant") return { stopReason: "error" };
      if (finalAssistant.stopReason === "aborted") return { stopReason: "aborted" };
      if (finalAssistant.stopReason === "error") return { stopReason: "error" };
      return { stopReason: "stop" };
    },
    abort() {
      agent.abort();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      agent.abort();
    },
  };
}
