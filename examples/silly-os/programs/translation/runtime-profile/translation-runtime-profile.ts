// SPDX-License-Identifier: MIT

import { Type } from "@earendil-works/pi-ai";

import {
  admitTranslationBatchCandidateV1,
  admitTranslationBatchRequestV1,
  classifyTranslationBatchCandidateRejectionV1,
  type TranslationBatchRequestV1,
} from "../runtime/translation-batch-protocol.ts";
import { createTranslationAgentUserPromptV1 } from "../runtime/translation-agent-prompt.ts";
export { createTranslationBatchUserPromptV1 } from "../runtime/translation-agent-prompt.ts";
import type {
  TranslationBatchBudgetV1,
  TranslationBatchOutputTokenEnvelopeV1,
} from "../runtime/translation-batch-planner.ts";
import {
  serializeBrowserPiAgentDispatchV1,
  type BrowserPiAgentDispatchV1,
} from "../../../src/agent/browser-pi-agent-dispatch.ts";
import type { BrowserProgramRuntimeProfileV1 } from "../../../src/agent/browser-program-runtime-profile.ts";
import type { InstalledProgramPackageReferenceV1 } from "../../../src/program-platform/package/program-package-archive.ts";
import { translationAgentInstructionMaximumCharactersV1 } from "../runtime/translation-agent-contracts.ts";
import {
  translationProgramRuntimeProfileDescriptorV1,
  translationProgramRuntimeProfileV1,
} from "./translation-runtime-profile-descriptor.ts";

export { translationProgramRuntimeProfileV1 } from "./translation-runtime-profile-descriptor.ts";

export const translationBatchToolNameV1 = "sillyos_submit_translation_batch" as const;

const translationBatchToolSchemaV1 = Type.Object(
  {
    targets: Type.Array(Type.Object(
      {
        unitId: Type.String({ minLength: 1 }),
        target: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    )),
    ambiguities: Type.Array(Type.Object(
      {
        unitId: Type.String({ minLength: 1 }),
        question: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    )),
  },
  { additionalProperties: false },
);

const textEncoderV1 = new TextEncoder();
const translationToolDefinitionV1 = {
  name: translationBatchToolNameV1,
  label: "Submit translation batch",
  description:
    "Submit one complete translation candidate for the exact admitted batch and its ambiguities.",
  parameters: translationBatchToolSchemaV1,
};

// A tokenizer cannot produce more tokens than the UTF-8 bytes supplied for
// ordinary text. Counting bytes therefore gives every supported model a
// conservative, tokenizer-independent input bound without a model-specific
// magic ratio. This is the exact fixed Host-owned tool payload; the caller
// supplies the exact Process-pinned package instructions below.
const translationToolDefinitionUtf8BytesV1 =
  textEncoderV1.encode(JSON.stringify(translationToolDefinitionV1)).byteLength;

const translationBatchOutputTokenEnvelopeV1: TranslationBatchOutputTokenEnvelopeV1 = {
  fixedCandidateReserveTokens: 512,
  perUnitCandidateReserveTokens: 96,
  targetTokensPerSourceCodePoint: { numerator: 2, denominator: 1 },
};

/** Model-aware product policy used before a Translation Process acquires execution. */
export function createTranslationBatchBudgetForModelV1(input: {
  readonly contextWindow: number;
  readonly maximumOutputTokens: number;
  /** Exact instruction text decoded from the Process-pinned Program package. */
  readonly instructions: string;
}): TranslationBatchBudgetV1 | null {
  if (
    !Number.isSafeInteger(input.contextWindow) || input.contextWindow <= 0 ||
    !Number.isSafeInteger(input.maximumOutputTokens) || input.maximumOutputTokens <= 0 ||
    input.maximumOutputTokens > input.contextWindow ||
    typeof input.instructions !== "string" || input.instructions.trim().length === 0
  ) return null;
  const instructionUtf8Bytes = textEncoderV1.encode(input.instructions).byteLength;
  const maximumRequestBytes = input.contextWindow - input.maximumOutputTokens -
    instructionUtf8Bytes - translationToolDefinitionUtf8BytesV1;
  if (maximumRequestBytes <= 0) return null;
  return {
    maximumRequestBytes,
    maximumOutputTokens: input.maximumOutputTokens,
    outputEnvelope: translationBatchOutputTokenEnvelopeV1,
  };
}

export const translationProgramRuntimeProfileImplementationV1: BrowserProgramRuntimeProfileV1 = {
  runtimeProfile: translationProgramRuntimeProfileV1,
  packageDescriptor: translationProgramRuntimeProfileDescriptorV1,
  harnessToolIds: ["program_resource"],
  providerTimeoutMilliseconds: 180_000,
  admitDispatch(dispatch) {
    if (dispatch.runtimeProfile !== translationProgramRuntimeProfileV1) {
      return { kind: "rejected" };
    }
    const payload = dispatch.payload;
    if (
      payload === null || typeof payload !== "object" || Array.isArray(payload) ||
      Object.keys(payload).length !== 3 ||
      !Object.hasOwn(payload, "requestedOutputTokens") ||
      !Object.hasOwn(payload, "instruction") || !Object.hasOwn(payload, "request")
    ) return { kind: "rejected" };
    const payloadRecord = payload as Readonly<Record<string, unknown>>;
    const requestedOutputTokens = payloadRecord.requestedOutputTokens;
    const instruction = payloadRecord.instruction;
    if (
      typeof requestedOutputTokens !== "number" ||
      !Number.isSafeInteger(requestedOutputTokens) || requestedOutputTokens <= 0 ||
      typeof instruction !== "string" || instruction.length === 0 ||
      instruction.length > translationAgentInstructionMaximumCharactersV1 ||
      instruction !== instruction.trim()
    ) return { kind: "rejected" };
    const admittedRequest = admitTranslationBatchRequestV1(payloadRecord.request);
    if (admittedRequest.kind === "rejected") return { kind: "rejected" };
    const request = admittedRequest.request;
    return {
      kind: "admitted",
      invocation: {
        requestedOutputTokens,
        userPrompt: createTranslationAgentUserPromptV1({ instruction, request }),
        textOutput: { kind: "discard" },
        deterministicTest: {
          completionArguments: {
            targets: request.units.map((unit) => ({
              unitId: unit.unitId,
              target: `[deterministic] ${unit.source}`,
            })),
            ambiguities: [],
          },
          finalReply: "Deterministic completion candidate ready.",
        },
        createCompletionTool(input) {
          return {
            ...translationToolDefinitionV1,
            execute: async (_toolCallId, params, signal) => {
              if (signal?.aborted) throw new Error("Translation run was cancelled");
              const candidate = params as {
                readonly targets: readonly { readonly unitId: string; readonly target: string }[];
                readonly ambiguities: readonly {
                  readonly unitId: string;
                  readonly question: string;
                }[];
              };
              await input.onCandidate(candidate);
              return {
                content: [{ type: "text", text: "Translation batch candidate recorded." }],
                details: candidate,
              };
            },
          };
        },
        admitCandidate(value) {
          const admitted = admitTranslationBatchCandidateV1(value, request);
          if (admitted.kind === "admitted") {
            return { kind: "admitted", candidate: admitted.candidate };
          }
          // Shape/coverage failures describe a malformed completion envelope.
          // Content failures are a well-shaped candidate that does not satisfy
          // the exact admitted batch. Keep them distinct for truthful Product
          // diagnostics without repairing or publishing either rejected form.
          return {
            kind: "rejected",
            failure: classifyTranslationBatchCandidateRejectionV1(admitted) ===
                "content_constraint"
              ? "candidate_context_mismatch"
              : "candidate_invalid",
          };
        },
      },
    };
  },
};

export function serializeBrowserPiTranslationAgentDispatchV1(input: {
  readonly programPackage: InstalledProgramPackageReferenceV1;
  readonly programId: string;
  readonly requestedOutputTokens: number;
  readonly instruction: string;
  readonly request: TranslationBatchRequestV1;
}): string {
  return serializeBrowserPiAgentDispatchV1(
    {
      revision: 1,
      runtimeProfile: translationProgramRuntimeProfileV1,
      programPackage: input.programPackage,
      workspaceProgramId: input.programId,
      payload: {
        requestedOutputTokens: input.requestedOutputTokens,
        instruction: input.instruction,
        request: input.request,
      },
    } satisfies BrowserPiAgentDispatchV1,
  );
}
