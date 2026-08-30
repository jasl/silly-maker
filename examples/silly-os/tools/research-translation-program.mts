// SPDX-License-Identifier: MIT

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type AssistantMessage, getSupportedThinkingLevels, Type } from "@earendil-works/pi-ai";
import { builtinModels } from "@earendil-works/pi-ai/providers/all";

import {
  prepareTranslationDocumentV1,
  type PreparedTranslationDocumentV1,
} from "../src/product/translation/translation-document-codec.ts";
import {
  admitTranslationBatchCandidateV1,
  translationBatchOutputTokenEnvelopeV1,
  createTranslationBatchUserPromptV1,
  translationBatchToolNameV1,
  translationProgramHarnessReferenceV1,
  translationProgramPromptRevisionV1,
  translationProgramSystemPromptV1,
  type TranslationBatchRequestV1,
} from "../src/product/translation/translation-batch-protocol.ts";
import {
  sanitizeResearchErrorV1,
  sanitizeResearchProviderMessageV1,
} from "./research-evidence-sanitizer.ts";

interface ResearchProfileV1 {
  readonly id: "deepseek" | "openrouter";
  readonly providerId: string;
  readonly modelId: string;
  readonly apiKeyEnvironmentVariable: string;
}

interface CorpusCaseV1 {
  readonly id: string;
  readonly fileName: string;
  readonly mediaType: string;
  readonly documentPurpose: string;
  readonly style: string;
}

const profilesV1: Readonly<Record<ResearchProfileV1["id"], ResearchProfileV1>> = {
  deepseek: {
    id: "deepseek",
    providerId: "deepseek",
    modelId: "deepseek-v4-flash",
    apiKeyEnvironmentVariable: "DEEPSEEK_API_KEY",
  },
  openrouter: {
    id: "openrouter",
    providerId: "openrouter",
    modelId: "z-ai/glm-5.3-flash",
    apiKeyEnvironmentVariable: "OPENROUTER_API_KEY",
  },
};

const corpusCasesV1: readonly CorpusCaseV1[] = [
  {
    id: "brief.txt",
    fileName: "brief.zh-CN.txt",
    mediaType: "text/plain; charset=utf-8",
    documentPurpose: "A fictional operations brief for a narrative game.",
    style: "Clear natural English; preserve dialogue tone and technical identifiers.",
  },
  {
    id: "release-guide.md",
    fileName: "release-guide.zh-CN.md",
    mediaType: "text/markdown; charset=utf-8",
    documentPurpose: "A fictional software release guide.",
    style: "Concise technical English with consistent UI and product terminology.",
  },
  {
    id: "platform-night.srt",
    fileName: "platform-night.zh-CN.srt",
    mediaType: "application/x-subrip; charset=utf-8",
    documentPurpose: "Subtitles for a fictional visual-novel scene.",
    style: "Natural concise spoken English suitable for subtitle timing.",
  },
  {
    id: "station-dialogue.json",
    fileName: "station-dialogue.zh-CN.json",
    mediaType: "application/json; charset=utf-8",
    documentPurpose: "Structured dialogue resources for a fictional game scene.",
    style: "Natural character dialogue; keep project codenames and control tags exact.",
  },
];
const modelRegistryV1 = builtinModels();

const corpusDirectoryV1 = fileURLToPath(
  new URL("../research/translation/corpus/", import.meta.url),
);
const evidenceDirectoryV1 = fileURLToPath(
  new URL("../../../tmp/sillyos-translation-research/", import.meta.url),
);
const requestTimeoutMillisecondsV1 = 120_000;

function usageV1(): never {
  console.error(
    "Usage: deno task research:translation -- <deepseek|openrouter> [--output <ignored-json-path>]",
  );
  Deno.exit(2);
}

function parseArgumentsV1(): { readonly profile: ResearchProfileV1; readonly output: string } {
  const args = Deno.args[0] === "--" ? Deno.args.slice(1) : Deno.args;
  const profileId = args[0];
  if (profileId !== "deepseek" && profileId !== "openrouter") usageV1();
  let output: string | null = null;
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] !== "--output" || output !== null || args[index + 1] === undefined) {
      usageV1();
    }
    output = resolve(args[index + 1]);
    index += 1;
  }
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  return {
    profile: profilesV1[profileId],
    output: output ?? resolve(evidenceDirectoryV1, `${profileId}-${timestamp}.json`),
  };
}

async function repositoryRevisionV1(): Promise<string | null> {
  try {
    const output = await new Deno.Command("git", {
      args: ["rev-parse", "HEAD"],
      cwd: fileURLToPath(new URL("../../../", import.meta.url)),
      stdout: "piped",
      stderr: "null",
    }).output();
    return output.success ? new TextDecoder().decode(output.stdout).trim() : null;
  } catch {
    return null;
  }
}

async function repositoryWorkingTreeDirtyV1(): Promise<boolean | null> {
  try {
    const output = await new Deno.Command("git", {
      args: ["status", "--porcelain=v1"],
      cwd: fileURLToPath(new URL("../../../", import.meta.url)),
      stdout: "piped",
      stderr: "null",
    }).output();
    return output.success ? output.stdout.length > 0 : null;
  } catch {
    return null;
  }
}

async function sha256V1(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function translationToolV1(unitCount: number) {
  return {
    name: translationBatchToolNameV1,
    description:
      "Submit the complete ordered target text for one admitted SillyOS translation batch.",
    parameters: Type.Object({
      targets: Type.Array(
        Type.Object({
          unitId: Type.String(),
          target: Type.String({ minLength: 1 }),
        }, { additionalProperties: false }),
        { minItems: unitCount, maxItems: unitCount },
      ),
      ambiguities: Type.Array(Type.Object({
        unitId: Type.String(),
        question: Type.String({ minLength: 1 }),
      }, { additionalProperties: false })),
    }, { additionalProperties: false }),
    constrainedSampling: { type: "json_schema", strict: "prefer" } as const,
  };
}

function structuralProjectionV1(document: PreparedTranslationDocumentV1) {
  return document.sourceUnits.map((unit) => ({
    locator: unit.locator,
    context: unit.context,
    durationMilliseconds: unit.durationMilliseconds,
    protectedSegments: unit.protectedSegments,
  }));
}

function timedReadingObservationsV1(
  request: TranslationBatchRequestV1,
  targets: readonly { readonly unitId: string; readonly target: string }[],
) {
  const targetsById = new Map(targets.map((target) => [target.unitId, target.target]));
  return request.units.flatMap((unit) => {
    if (unit.durationMilliseconds === null) return [];
    const target = targetsById.get(unit.unitId);
    if (target === undefined) return [];
    const visibleCharacters = Array.from(target.replaceAll(/⟦SM:\d+⟧/gu, "")).length;
    return [{
      unitId: unit.unitId,
      durationMilliseconds: unit.durationMilliseconds,
      visibleCharacters,
      charactersPerSecond: Number(
        (visibleCharacters / (unit.durationMilliseconds / 1_000)).toFixed(1),
      ),
    }];
  });
}

function terminalToolCallV1(message: AssistantMessage):
  | {
    readonly kind: "candidate";
    readonly value: unknown;
    readonly nonToolTextCharacters: number;
  }
  | {
    readonly kind: "failure";
    readonly code: string;
    readonly nonToolTextCharacters: number;
  } {
  const nonToolTextCharacters = nonToolTextCharactersV1(message);
  const toolCalls = message.content.filter((part) => part.type === "toolCall");
  if (toolCalls.length !== 1) {
    return {
      kind: "failure",
      code: `expected_one_tool_call:${String(toolCalls.length)}`,
      nonToolTextCharacters,
    };
  }
  const [toolCall] = toolCalls;
  if (toolCall.name !== translationBatchToolNameV1) {
    return {
      kind: "failure",
      code: `unexpected_tool:${toolCall.name}`,
      nonToolTextCharacters,
    };
  }
  return { kind: "candidate", value: toolCall.arguments, nonToolTextCharacters };
}

function nonToolTextCharactersV1(message: AssistantMessage): number {
  return message.content.reduce(
    (total, part) => total + (part.type === "text" ? Array.from(part.text.trim()).length : 0),
    0,
  );
}

async function runCorpusCaseV1(input: {
  readonly profile: ResearchProfileV1;
  readonly apiKey: string;
  readonly model: NonNullable<ReturnType<ReturnType<typeof builtinModels>["getModel"]>>;
  readonly corpusCase: CorpusCaseV1;
}) {
  const sourceText = await Deno.readTextFile(resolve(corpusDirectoryV1, input.corpusCase.fileName));
  const sourceSha256 = await sha256V1(sourceText);
  const document = prepareTranslationDocumentV1({
    text: sourceText,
    fileName: input.corpusCase.fileName,
    mediaType: input.corpusCase.mediaType,
  });
  if (document.exportTranslation === null) {
    return {
      corpusCase: input.corpusCase.id,
      sourceSha256,
      outcome: "deterministic_floor_failed",
      capability: document.capability,
    } as const;
  }
  const request: TranslationBatchRequestV1 = {
    sourceLocale: "zh-CN",
    targetLocale: "en",
    documentPurpose: input.corpusCase.documentPurpose,
    style: input.corpusCase.style,
    glossary: [
      { source: "回声", target: "Echo", note: "A project codename when used as a noun." },
      { source: "林澄", target: "Lin Cheng", note: "Character name." },
      { source: "周遥", target: "Zhou Yao", note: "Character name." },
    ],
    units: document.sourceUnits,
  };
  const userPrompt = createTranslationBatchUserPromptV1(request);
  const tool = translationToolV1(document.sourceUnits.length);
  const maxTokens = translationBatchOutputTokenEnvelopeV1(document.sourceUnits.length);
  const requestSha256 = await sha256V1(JSON.stringify({
    systemPrompt: translationProgramSystemPromptV1,
    userPrompt,
    tool,
    settings: {
      reasoning: "low",
      temperature: 0,
      transport: "sse",
      cacheRetention: "none",
      maxTokens,
      maxRetries: 0,
    },
  }));

  const startedAt = performance.now();
  const resultContext = {
    corpusCase: input.corpusCase.id,
    sourceSha256,
    requestSha256,
    sourceUnitCount: document.sourceUnits.length,
    reasoningSetting: "low" as const,
    maxTokens,
  };
  try {
    const assistant = await modelRegistryV1.completeSimple(input.model, {
      systemPrompt: translationProgramSystemPromptV1,
      messages: [{
        role: "user",
        content: userPrompt,
        timestamp: Date.now(),
      }],
      tools: [tool],
    }, {
      apiKey: input.apiKey,
      reasoning: "low",
      toolChoice: "auto",
      temperature: 0,
      transport: "sse",
      cacheRetention: "none",
      maxTokens,
      timeoutMs: requestTimeoutMillisecondsV1,
      maxRetries: 0,
    });
    const latencyMilliseconds = Math.round(performance.now() - startedAt);
    if (
      assistant.provider !== input.profile.providerId || assistant.model !== input.profile.modelId
    ) {
      return {
        ...resultContext,
        outcome: "route_identity_failed",
        expectedProvider: input.profile.providerId,
        expectedModel: input.profile.modelId,
        provider: assistant.provider,
        model: assistant.model,
        responseModel: assistant.responseModel ?? null,
        latencyMilliseconds,
      } as const;
    }
    if (assistant.stopReason === "error") {
      return {
        ...resultContext,
        outcome: "provider_or_transport_failed",
        code: sanitizeResearchProviderMessageV1(assistant.errorMessage, input.apiKey),
        latencyMilliseconds,
        provider: assistant.provider,
        model: assistant.model,
        responseModel: assistant.responseModel ?? null,
        usage: assistant.usage,
        nonToolTextCharacters: nonToolTextCharactersV1(assistant),
      } as const;
    }
    const toolCall = terminalToolCallV1(assistant);
    if (toolCall.kind === "failure") {
      return {
        ...resultContext,
        outcome: "model_protocol_failed",
        code: toolCall.code,
        latencyMilliseconds,
        stopReason: assistant.stopReason,
        provider: assistant.provider,
        model: assistant.model,
        responseModel: assistant.responseModel ?? null,
        usage: assistant.usage,
        nonToolTextCharacters: toolCall.nonToolTextCharacters,
      } as const;
    }
    const admitted = admitTranslationBatchCandidateV1(toolCall.value, request);
    if (admitted.kind === "rejected") {
      return {
        ...resultContext,
        outcome: "candidate_rejected",
        admission: admitted,
        rawCandidate: toolCall.value,
        latencyMilliseconds,
        stopReason: assistant.stopReason,
        provider: assistant.provider,
        model: assistant.model,
        responseModel: assistant.responseModel ?? null,
        usage: assistant.usage,
      } as const;
    }
    const exported = document.exportTranslation(admitted.candidate.targets, {
      targetLocale: request.targetLocale,
    });
    if (exported.kind === "rejected") {
      return {
        ...resultContext,
        outcome: "export_rejected",
        export: exported,
        candidate: admitted.candidate,
        latencyMilliseconds,
        provider: assistant.provider,
        model: assistant.model,
        responseModel: assistant.responseModel ?? null,
        usage: assistant.usage,
      } as const;
    }
    const reopened = prepareTranslationDocumentV1({
      text: exported.text,
      fileName: input.corpusCase.fileName,
      mediaType: input.corpusCase.mediaType,
    });
    const structuralRoundTrip = reopened.exportTranslation !== null &&
      JSON.stringify(structuralProjectionV1(reopened)) ===
        JSON.stringify(structuralProjectionV1(document));
    return {
      ...resultContext,
      outcome: structuralRoundTrip ? "candidate_exported" : "structural_round_trip_failed",
      capability: document.capability,
      targets: admitted.candidate.targets,
      ambiguities: admitted.candidate.ambiguities,
      timedReadingObservations: timedReadingObservationsV1(
        request,
        admitted.candidate.targets,
      ),
      exportedText: exported.text,
      latencyMilliseconds,
      stopReason: assistant.stopReason,
      provider: assistant.provider,
      model: assistant.model,
      responseModel: assistant.responseModel ?? null,
      usage: assistant.usage,
      nonToolTextCharacters: toolCall.nonToolTextCharacters,
    } as const;
  } catch (error) {
    return {
      ...resultContext,
      outcome: "provider_or_transport_failed",
      code: sanitizeResearchErrorV1(error, input.apiKey),
      latencyMilliseconds: Math.round(performance.now() - startedAt),
    } as const;
  }
}

const { profile, output } = parseArgumentsV1();
const apiKey = Deno.env.get(profile.apiKeyEnvironmentVariable);
if (apiKey === undefined || apiKey.length === 0) {
  console.error(`Missing ${profile.apiKeyEnvironmentVariable}; no request was sent.`);
  Deno.exit(2);
}

const model = modelRegistryV1.getModel(profile.providerId, profile.modelId);
if (model === undefined) {
  console.error(`Pinned Pi catalog does not contain ${profile.providerId}/${profile.modelId}.`);
  Deno.exit(2);
}
if (!getSupportedThinkingLevels(model).includes("low")) {
  console.error(`Selected model does not expose the required low reasoning setting.`);
  Deno.exit(2);
}

const results = [];
for (const corpusCase of corpusCasesV1) {
  results.push(await runCorpusCaseV1({ profile, apiKey, model, corpusCase }));
}

const evidence = {
  schema: "sillyos.translation-program-research.v1",
  scope: "model_protocol_smoke",
  recordedAt: new Date().toISOString(),
  repositoryRevision: await repositoryRevisionV1(),
  workingTreeDirty: await repositoryWorkingTreeDirtyV1(),
  harnessReference: translationProgramHarnessReferenceV1,
  promptRevision: translationProgramPromptRevisionV1,
  corpusRevision: 1,
  route: {
    profile: profile.id,
    providerId: profile.providerId,
    modelId: profile.modelId,
    reasoning: "low",
    temperature: 0,
    transport: "sse",
    cacheRetention: "none",
    toolChoice: "auto",
    timeoutMilliseconds: requestTimeoutMillisecondsV1,
    maxRetries: 0,
  },
  results,
};

await Deno.mkdir(dirname(output), { recursive: true });
await Deno.writeTextFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(
  {
    evidencePath: output,
    route: evidence.route,
    outcomes: results.map((result) => ({
      corpusCase: result.corpusCase,
      outcome: result.outcome,
    })),
  },
  null,
  2,
));
if (results.some((result) => result.outcome !== "candidate_exported")) Deno.exitCode = 1;
