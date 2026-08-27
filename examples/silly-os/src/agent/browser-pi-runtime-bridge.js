// SPDX-License-Identifier: MIT

import { Agent } from "@earendil-works/pi-agent-core";
import { fauxAssistantMessage, fauxProvider, fauxToolCall, Type } from "@earendil-works/pi-ai";

import { creatorAgentTextMaximumCharactersV1 } from "../product/contracts.ts";

export const creatorProgramRevisionToolNameV1 = "sillyos_propose_program_revision";
export const deterministicCancellationHoldPrefixV1 = "Hold this deterministic run until cancelled:";
export const deterministicPersistenceReadPrefixV1 =
  "Verify the persisted workspace contains exactly: ";
export const deterministicOversizedReadProbeV1 =
  "Verify the qualification workspace rejects an oversized native Pi read.";

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
      tools: [...input.workspaceTools, tool],
    },
    toolExecution: "sequential",
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
  const holdForCancellation = input.submit.text.startsWith(
    deterministicCancellationHoldPrefixV1,
  );
  const verifyPersistentRead = input.submit.text.startsWith(
    deterministicPersistenceReadPrefixV1,
  );
  const verifyOversizedRead = input.submit.text === deterministicOversizedReadProbeV1;
  const faux = fauxProvider({
    tokenSize: { min: 64, max: 64 },
    tokensPerSecond: 0,
  });
  const readResponse = fauxAssistantMessage(
    fauxToolCall("read", {
      path: verifyOversizedRead
        ? "/workspace/qualification/large.bin"
        : "/workspace/.sillyos/p3a-round-trip.txt",
    }, {
      id: `sillyos-read-${input.runNumber}`,
    }),
    { stopReason: "toolUse" },
  );
  const proposalResponse = fauxAssistantMessage(
    fauxToolCall(creatorProgramRevisionToolNameV1, { requirement: input.submit.text }, {
      id: `sillyos-tool-${input.runNumber}`,
    }),
    { stopReason: "toolUse" },
  );
  if (verifyPersistentRead || verifyOversizedRead) {
    const expected = input.submit.text.slice(deterministicPersistenceReadPrefixV1.length);
    faux.setResponses([
      readResponse,
      (context) => {
        const result = context.messages.toReversed().find((message) =>
          message.role === "toolResult" && message.toolName === "read"
        );
        const actual = result?.role === "toolResult"
          ? result.content.filter((block) => block.type === "text").map((block) => block.text)
            .join("\n")
          : null;
        if (verifyOversizedRead) {
          if (
            result?.role !== "toolResult" || !result.isError || actual === null ||
            !actual.includes("Workspace file exceeds the 256 KiB native Pi read ceiling")
          ) {
            throw new Error("Oversized workspace read did not return the fixed Pi FileError");
          }
        } else if (result?.role !== "toolResult" || result.isError || actual !== expected) {
          throw new Error("Persistent workspace read did not match the exact prior bytes");
        }
        return proposalResponse;
      },
      fauxAssistantMessage(deterministicFinalReplyV1),
    ]);
  } else {
    faux.setResponses([
      fauxAssistantMessage(
        fauxToolCall("write", {
          path: "/workspace/.sillyos/p3a-round-trip.txt",
          content: input.submit.text,
        }, {
          id: `sillyos-write-${input.runNumber}`,
        }),
        { stopReason: "toolUse" },
      ),
      holdForCancellation
        ? async (_context, options) => {
          if (!options?.signal?.aborted) {
            await new Promise((resolve) => {
              const timeout = setTimeout(resolve, 30_000);
              options?.signal?.addEventListener("abort", () => {
                clearTimeout(timeout);
                resolve();
              }, { once: true });
            });
          }
          return readResponse;
        }
        : readResponse,
      proposalResponse,
      fauxAssistantMessage(deterministicFinalReplyV1),
    ]);
  }

  return createPiAgentV1({
    ...input,
    streamFn: faux.provider.streamSimple,
    model: faux.getModel(),
    systemPrompt:
      "You are the deterministic SillyOS Creator Agent test runtime. Exercise the pinned native Pi read/write tools against the current Program workspace, then propose one Program revision.",
  });
}

export { createPiAgentV1 };
