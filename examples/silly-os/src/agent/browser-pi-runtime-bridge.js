// SPDX-License-Identifier: MIT

import { Agent } from "@earendil-works/pi-agent-core";
import { fauxAssistantMessage, fauxProvider, fauxToolCall, Type } from "@earendil-works/pi-ai";

import { creatorAgentTextMaximumCharactersV1 } from "../product/contracts.ts";

export const creatorProgramRevisionToolNameV1 = "sillyos_propose_program_revision";
export const deterministicCancellationHoldPrefixV1 = "Hold this deterministic run until cancelled:";
export const deterministicPersistenceReadPrefixV1 =
  "Verify the persisted workspace contains exactly: ";
export const deterministicEditProbePrefixV1 =
  "Exercise the pinned native Pi edit tool with exact text: ";
export const deterministicBashProbePrefixV1 =
  "Exercise the pinned native Pi bash tool with exact text: ";
export const deterministicFileOpsProbePrefixV1 =
  "Exercise the pinned native Pi workspace file operations lifecycle: ";
export const deterministicGrepProbePrefixV1 =
  "Exercise the product-fixed Pi grep tool with exact text: ";
export const deterministicFetchUrlProbePrefixV1 =
  "Exercise the product-fixed Pi fetch_url tool for exact URL: ";
export const deterministicOversizedReadProbeV1 =
  "Verify the qualification workspace rejects an oversized native Pi read.";

const deterministicFinalReplyV1 = "Deterministic test proposal ready.";

function toolResultTextV1(message) {
  if (message?.role !== "toolResult") return null;
  let text = "";
  let textBlocks = 0;
  for (const block of message.content) {
    if (block.type !== "text") continue;
    if (textBlocks > 0) text += "\n";
    text += block.text;
    textBlocks += 1;
  }
  return text;
}

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
  const exerciseEdit = input.submit.text.startsWith(deterministicEditProbePrefixV1);
  const exerciseBash = input.submit.text.startsWith(deterministicBashProbePrefixV1);
  const exerciseFileOps = input.submit.text.startsWith(deterministicFileOpsProbePrefixV1);
  const exerciseGrep = input.submit.text.startsWith(deterministicGrepProbePrefixV1);
  const exerciseFetchUrl = input.submit.text.startsWith(deterministicFetchUrlProbePrefixV1);
  const verifyOversizedRead = input.submit.text === deterministicOversizedReadProbeV1;
  const faux = fauxProvider({
    tokenSize: { min: 64, max: 64 },
    tokensPerSecond: 0,
  });
  const roundTripPath = "/workspace/.sillyos/p3a-round-trip.txt";
  const bashRoundTripPath = "/workspace/.sillyos/p3a-bash-round-trip.txt";
  const bashRoundTripText = "SillyOS native bash checkpoint\n";
  const bashRoundTripSearchResult = `1:${bashRoundTripText}`;
  const fileOpsRoot = "/workspace/.sillyos/file-ops";
  const fileOpsText = "SillyOS workspace file operations";
  const editMarker = "SillyOS native edit checkpoint pending:\n";
  const readResponse = fauxAssistantMessage(
    fauxToolCall("read", {
      path: verifyOversizedRead ? "/workspace/qualification/large.bin" : roundTripPath,
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
  const editResponse = fauxAssistantMessage(
    fauxToolCall("edit", {
      path: roundTripPath,
      edits: [{ oldText: editMarker, newText: "" }],
    }, {
      id: `sillyos-edit-${input.runNumber}`,
    }),
    { stopReason: "toolUse" },
  );
  const bashResponse = fauxAssistantMessage(
    fauxToolCall("bash", {
      command:
        `printf 'SillyOS native bash checkpoint\\n' | tee ${bashRoundTripPath} > /dev/null; rg -n 'SillyOS native bash checkpoint' ${bashRoundTripPath}`,
    }, {
      id: `sillyos-bash-${input.runNumber}`,
    }),
    { stopReason: "toolUse" },
  );
  const bashSetupResponse = fauxAssistantMessage(
    fauxToolCall("write", {
      path: roundTripPath,
      content: input.submit.text,
    }, {
      id: `sillyos-bash-setup-${input.runNumber}`,
    }),
    { stopReason: "toolUse" },
  );
  const fileOpsResponse = fauxAssistantMessage(
    fauxToolCall("bash", {
      command: [
        `mkdir -p ${fileOpsRoot}/source/nested`,
        `touch ${fileOpsRoot}/source/nested/empty.txt`,
        `printf '${fileOpsText}\\n' > ${fileOpsRoot}/source/nested/source.txt`,
        `cp ${fileOpsRoot}/source/nested/source.txt ${fileOpsRoot}/source/nested/copied.txt`,
        `mv ${fileOpsRoot}/source/nested/copied.txt ${fileOpsRoot}/moved.txt`,
        `cp -R ${fileOpsRoot}/source ${fileOpsRoot}/copied-tree`,
        `rm ${fileOpsRoot}/source/nested/empty.txt`,
        `find ${fileOpsRoot}/copied-tree -type f -name source.txt -delete`,
        `rm ${fileOpsRoot}/copied-tree/nested/empty.txt`,
        `touch ${fileOpsRoot}/kept-empty.txt`,
        `rm -r ${fileOpsRoot}/source`,
        `[ "$(cat ${fileOpsRoot}/moved.txt)" = "${fileOpsText}" ]`,
        `[ -d ${fileOpsRoot}/copied-tree/nested ]`,
        `[ -f ${fileOpsRoot}/kept-empty.txt ]`,
        `[ ! -s ${fileOpsRoot}/kept-empty.txt ]`,
        "printf 'SILLYOS_FILE_OPS_OK\\n'",
      ].join(" && "),
    }, {
      id: `sillyos-file-ops-${input.runNumber}`,
    }),
    { stopReason: "toolUse" },
  );
  const bashReadResponse = fauxAssistantMessage(
    fauxToolCall("read", { path: bashRoundTripPath }, {
      id: `sillyos-bash-read-${input.runNumber}`,
    }),
    { stopReason: "toolUse" },
  );
  const grepSetupResponse = fauxAssistantMessage(
    fauxToolCall("write", {
      path: roundTripPath,
      content: input.submit.text,
    }, {
      id: `sillyos-grep-setup-${input.runNumber}`,
    }),
    { stopReason: "toolUse" },
  );
  const grepResponse = fauxAssistantMessage(
    fauxToolCall("grep", {
      pattern: "product-fixed Pi grep tool",
      path: roundTripPath,
      literal: true,
      limit: 10,
    }, {
      id: `sillyos-grep-${input.runNumber}`,
    }),
    { stopReason: "toolUse" },
  );
  const fetchUrlResponse = fauxAssistantMessage(
    fauxToolCall("fetch_url", {
      url: input.submit.text.slice(deterministicFetchUrlProbePrefixV1.length),
    }, {
      id: `sillyos-fetch-url-${input.runNumber}`,
    }),
    { stopReason: "toolUse" },
  );
  if (exerciseFetchUrl) {
    faux.setResponses([
      fetchUrlResponse,
      (context) => {
        const result = context.messages.toReversed().find((message) =>
          message.role === "toolResult" && message.toolName === "fetch_url"
        );
        const actual = toolResultTextV1(result);
        const details = result?.role === "toolResult" ? result.details : null;
        if (
          result?.role !== "toolResult" || result.isError || actual === null ||
          details === null || typeof details !== "object" ||
          !Number.isInteger(details.status) || details.status < 100 || details.status > 599 ||
          (details.contentType !== null && typeof details.contentType !== "string") ||
          !Number.isSafeInteger(details.bytes) || details.bytes < 0 ||
          details.bytes > 256 * 1024 ||
          actual !== `[Untrusted remote content]\n${details.text}` ||
          new TextEncoder().encode(details.text).byteLength !== details.bytes
        ) {
          throw new Error("Product-fixed Pi fetch_url did not return the exact bounded result");
        }
        return proposalResponse;
      },
      fauxAssistantMessage(deterministicFinalReplyV1),
    ]);
  } else if (exerciseFileOps) {
    faux.setResponses([
      fileOpsResponse,
      (context) => {
        const result = context.messages.toReversed().find((message) =>
          message.role === "toolResult" && message.toolName === "bash"
        );
        const actual = toolResultTextV1(result);
        if (
          result?.role !== "toolResult" || result.isError ||
          actual !== "SILLYOS_FILE_OPS_OK\n"
        ) {
          throw new Error("Native Pi bash did not complete the exact file-operations lifecycle");
        }
        return proposalResponse;
      },
      fauxAssistantMessage(deterministicFinalReplyV1),
    ]);
  } else if (exerciseGrep) {
    faux.setResponses([
      grepSetupResponse,
      grepResponse,
      (context) => {
        const result = context.messages.toReversed().find((message) =>
          message.role === "toolResult" && message.toolName === "grep"
        );
        const actual = toolResultTextV1(result);
        const expected = `${roundTripPath}:1:${input.submit.text}`;
        const details = result?.role === "toolResult" ? result.details : null;
        if (
          result?.role !== "toolResult" || result.isError || actual !== expected ||
          details === null || typeof details !== "object" || details.revision !== 1 ||
          details.generation !== 2 || !Array.isArray(details.matches) ||
          details.matches.length !== 1 || details.truncated !== false
        ) {
          throw new Error("Product-fixed Pi grep did not return the exact structured result");
        }
        return proposalResponse;
      },
      fauxAssistantMessage(deterministicFinalReplyV1),
    ]);
  } else if (exerciseBash) {
    faux.setResponses([
      bashSetupResponse,
      bashResponse,
      (context) => {
        const result = context.messages.toReversed().find((message) =>
          message.role === "toolResult" && message.toolName === "bash"
        );
        const actual = toolResultTextV1(result);
        if (
          result?.role !== "toolResult" || result.isError ||
          actual !== bashRoundTripSearchResult
        ) {
          throw new Error("Native Pi bash did not return the exact terminal aggregate");
        }
        return bashReadResponse;
      },
      (context) => {
        const result = context.messages.toReversed().find((message) =>
          message.role === "toolResult" && message.toolName === "read"
        );
        const actual = toolResultTextV1(result);
        if (result?.role !== "toolResult" || result.isError || actual !== bashRoundTripText) {
          throw new Error("Bash-written Workspace file did not contain the exact bytes");
        }
        return proposalResponse;
      },
      fauxAssistantMessage(deterministicFinalReplyV1),
    ]);
  } else if (verifyPersistentRead || verifyOversizedRead) {
    const expected = input.submit.text.slice(deterministicPersistenceReadPrefixV1.length);
    faux.setResponses([
      readResponse,
      (context) => {
        const result = context.messages.toReversed().find((message) =>
          message.role === "toolResult" && message.toolName === "read"
        );
        const actual = toolResultTextV1(result);
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
    const readAfterEditResponse = (context) => {
      const result = context.messages.toReversed().find((message) =>
        message.role === "toolResult" && message.toolName === "edit"
      );
      const details = result?.role === "toolResult" ? result.details : null;
      if (
        result?.role !== "toolResult" || result.isError || details === null ||
        typeof details !== "object" || typeof details.diff !== "string" ||
        typeof details.patch !== "string" || details.firstChangedLine !== 1
      ) {
        throw new Error("Native Pi edit did not return its exact structured result");
      }
      return readResponse;
    };
    const proposalAfterReadResponse = (context) => {
      const result = context.messages.toReversed().find((message) =>
        message.role === "toolResult" && message.toolName === "read"
      );
      const actual = toolResultTextV1(result);
      if (result?.role !== "toolResult" || result.isError || actual !== input.submit.text) {
        throw new Error("Workspace read did not match the exact submitted bytes");
      }
      return proposalResponse;
    };
    faux.setResponses([
      fauxAssistantMessage(
        fauxToolCall("write", {
          path: roundTripPath,
          content: exerciseEdit ? editMarker + input.submit.text : input.submit.text,
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
          return exerciseEdit ? editResponse : readResponse;
        }
        : exerciseEdit
        ? editResponse
        : readResponse,
      ...(exerciseEdit ? [readAfterEditResponse] : []),
      proposalAfterReadResponse,
      fauxAssistantMessage(deterministicFinalReplyV1),
    ]);
  }

  return createPiAgentV1({
    ...input,
    streamFn: faux.provider.streamSimple,
    model: faux.getModel(),
    systemPrompt:
      "You are the deterministic SillyOS Creator Agent test runtime. Exercise only the pinned native Pi workspace tools selected by this fixture, then propose one Program revision.",
  });
}

export { createPiAgentV1 };
