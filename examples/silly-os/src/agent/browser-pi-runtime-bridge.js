// SPDX-License-Identifier: MIT

import { Agent } from "@earendil-works/pi-agent-core";
import { fauxAssistantMessage, fauxProvider, fauxToolCall, Type } from "@earendil-works/pi-ai";

import { creatorAgentTextMaximumCharactersV1 } from "../product/contracts.ts";

export const creatorProgramRevisionToolNameV1 = "sillyos_propose_program_revision";

const deterministicFinalReplyV1 = "Deterministic test proposal ready.";

const creatorProgramRevisionToolSchemaV1 = Type.Object(
  {
    requirement: Type.String({ minLength: 1, maxLength: creatorAgentTextMaximumCharactersV1 }),
  },
  { additionalProperties: false },
);

function createPiAgentV1(input) {
  const tool = {
    name: creatorProgramRevisionToolNameV1,
    label: "Propose Program revision",
    description:
      "Propose one concise Program requirement. SillyOS binds it to the current reviewed revision.",
    parameters: creatorProgramRevisionToolSchemaV1,
    execute: async (_toolCallId, params, signal) => {
      if (signal?.aborted) throw new Error("Creator run was cancelled");
      const candidate = {
        revision: 1,
        proposalId: input.submit.proposalId,
        programId: input.submit.programId,
        baseProgramRevision: input.submit.baseProgramRevision,
        text: input.submit.text,
        requirement: params.requirement,
      };
      await input.onCandidate(candidate);
      return {
        content: [{ type: "text", text: "Program revision candidate recorded for review." }],
        details: candidate,
      };
    },
  };
  const agent = new Agent({
    streamFn: input.streamFn,
    ...(input.getApiKey === undefined ? {} : { getApiKey: input.getApiKey }),
    initialState: {
      systemPrompt: input.systemPrompt,
      model: input.model,
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

/**
 * The only place where the Browser product touches Pi's runtime-specific API.
 * The adjacent declaration intentionally exposes only the product's bounded port.
 */
export function createDeterministicPiAgentV1(input) {
  const faux = fauxProvider({
    tokenSize: { min: 64, max: 64 },
    tokensPerSecond: 0,
  });
  faux.setResponses([
    fauxAssistantMessage(
      fauxToolCall(creatorProgramRevisionToolNameV1, { requirement: input.submit.text }, {
        id: `sillyos-tool-${input.runNumber}`,
      }),
      { stopReason: "toolUse" },
    ),
    fauxAssistantMessage(deterministicFinalReplyV1),
  ]);

  return createPiAgentV1({
    ...input,
    streamFn: faux.provider.streamSimple,
    model: faux.getModel(),
    systemPrompt:
      "You are the deterministic SillyOS Creator Agent test runtime. Use the one provided tool exactly once.",
  });
}

export { createPiAgentV1 };
