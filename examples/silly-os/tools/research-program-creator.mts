// SPDX-License-Identifier: MIT

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type AssistantMessage, getSupportedThinkingLevels, Type } from "@earendil-works/pi-ai";
import { builtinModels } from "@earendil-works/pi-ai/providers/all";

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

const compatibilityReferencesV1 = ["sillyos.harness.translation@1"] as const;
const workflowStagesV1 = [
  "intake",
  "planning",
  "translate",
  "validate",
  "review",
  "commit",
  "verify",
  "export",
] as const;
const deterministicAssetIdsV1 = [
  "script.translation_project",
  "operation.parse_document",
  "operation.export_document",
] as const;
const resourceIdsV1 = [
  "reference.translation_rules",
  "prompt.translate",
] as const;
const modelRoleIdsV1 = ["translate", "review", "ocr"] as const;
const settingIdsV1 = [
  "targetLocale",
  "defaultStyle",
  "reviewPolicy",
  "modelRoles.translate",
  "modelRoles.review",
  "modelRoles.ocr",
  "pdf.ocr",
  "pdf.output",
] as const;

const toolNameV1 = "sillyos_propose_program_blueprint" as const;
// This is a research-request envelope, not a Program or product content limit.
const blueprintOutputTokenEnvelopeV1 = 4_096;
// Pi exposes this as a requested transport timeout; the runner records wall time
// independently and does not claim that providers enforce a hard deadline.
const requestedTimeoutMillisecondsV1 = 180_000;
const systemPromptV1 = `You are the SillyOS Program Creator research capability.

Map the user's product request onto one cohesive Program blueprint using only the identifiers offered by the completion schema. A Program combines reusable workflow instructions, packaged deterministic assets, selected model roles, settings, and an ordinary product workbench. SillyOS already owns Provider credentials, Pi, the VFS, fixed interpreters, tool implementations, persistence, and admission. Never invent another runtime, Provider, credential store, interpreter, tool, capability identifier, or file format.

Prefer deterministic assets for parsing, stable identity, batching, validation, commit, verification, and export. Select model roles only for semantic judgment. Include OCR only as a configurable role; do not imply that it is delivered by the first born-digital PDF path. The review surface must keep final acceptance with the human.

Call ${toolNameV1} exactly once. Return no blueprint outside that tool call.`;

const literalUnionV1 = <TValue extends readonly [string, ...string[]]>(values: TValue) =>
  Type.Union(values.map((value) => Type.Literal(value)));

const blueprintToolV1 = {
  name: toolNameV1,
  description: "Submit one closed SillyOS Program blueprint for human review.",
  parameters: Type.Object({
    name: Type.String({ minLength: 1 }),
    purpose: Type.String({ minLength: 1 }),
    compatibilityReference: literalUnionV1(compatibilityReferencesV1),
    workflowStages: Type.Array(literalUnionV1(workflowStagesV1), { minItems: 1 }),
    deterministicAssetIds: Type.Array(literalUnionV1(deterministicAssetIdsV1)),
    resourceIds: Type.Array(literalUnionV1(resourceIdsV1)),
    modelRoleIds: Type.Array(literalUnionV1(modelRoleIdsV1)),
    settingIds: Type.Array(literalUnionV1(settingIdsV1)),
    reviewSurface: Type.Literal("structured_human_workbench"),
  }, { additionalProperties: false }),
  constrainedSampling: { type: "json_schema", strict: "prefer" } as const,
};

type DataRecordV1 = Readonly<Record<string, unknown>>;

function isRecordV1(value: unknown): value is DataRecordV1 {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeysV1(value: DataRecordV1, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function admittedIdentifierArrayV1<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
): readonly TValue[] | null {
  if (!Array.isArray(value)) return null;
  const result: TValue[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (
      typeof candidate !== "string" || !allowed.includes(candidate as TValue) || seen.has(candidate)
    ) {
      return null;
    }
    seen.add(candidate);
    result.push(candidate as TValue);
  }
  return result;
}

function admitBlueprintV1(value: unknown) {
  if (
    !isRecordV1(value) || !exactKeysV1(value, [
      "name",
      "purpose",
      "compatibilityReference",
      "workflowStages",
      "deterministicAssetIds",
      "resourceIds",
      "modelRoleIds",
      "settingIds",
      "reviewSurface",
    ]) || typeof value.name !== "string" || value.name.trim().length === 0 ||
    typeof value.purpose !== "string" || value.purpose.trim().length === 0 ||
    value.compatibilityReference !== compatibilityReferencesV1[0] ||
    value.reviewSurface !== "structured_human_workbench"
  ) return null;
  const workflowStages = admittedIdentifierArrayV1(value.workflowStages, workflowStagesV1);
  const deterministicAssetIds = admittedIdentifierArrayV1(
    value.deterministicAssetIds,
    deterministicAssetIdsV1,
  );
  const resourceIds = admittedIdentifierArrayV1(value.resourceIds, resourceIdsV1);
  const modelRoleIds = admittedIdentifierArrayV1(value.modelRoleIds, modelRoleIdsV1);
  const settingIds = admittedIdentifierArrayV1(value.settingIds, settingIdsV1);
  if (
    workflowStages === null || deterministicAssetIds === null || resourceIds === null ||
    modelRoleIds === null || settingIds === null
  ) return null;
  return {
    name: value.name.trim(),
    purpose: value.purpose.trim(),
    compatibilityReference: compatibilityReferencesV1[0],
    workflowStages,
    deterministicAssetIds,
    resourceIds,
    modelRoleIds,
    settingIds,
    reviewSurface: "structured_human_workbench" as const,
  };
}

function terminalToolCallV1(message: AssistantMessage): unknown {
  const calls = message.content.filter((part) => part.type === "toolCall");
  if (calls.length !== 1 || calls[0]?.name !== toolNameV1) return null;
  return calls[0].arguments;
}

function coverageV1<TValue extends string>(actual: readonly TValue[], expected: readonly TValue[]) {
  const actualSet = new Set(actual);
  return {
    complete: expected.every((value) => actualSet.has(value)),
    missing: expected.filter((value) => !actualSet.has(value)),
  };
}

function usageV1(): never {
  console.error(
    "Usage: deno run ... research-program-creator.mts <deepseek|openrouter> [--output <json-path>]",
  );
  Deno.exit(2);
}

function parseArgumentsV1() {
  const args = Deno.args[0] === "--" ? Deno.args.slice(1) : Deno.args;
  const profileId = args[0];
  if (profileId !== "deepseek" && profileId !== "openrouter") usageV1();
  let output: string | null = null;
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] !== "--output" || output !== null || args[index + 1] === undefined) usageV1();
    output = resolve(args[index + 1]);
    index += 1;
  }
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  return {
    profile: profilesV1[profileId],
    output: output ?? resolve(
      fileURLToPath(new URL("../../../tmp/sillyos-program-creator-research/", import.meta.url)),
      `${profileId}-${timestamp}.json`,
    ),
  };
}

async function sha256V1(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
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

const { profile, output } = parseArgumentsV1();
const apiKey = Deno.env.get(profile.apiKeyEnvironmentVariable);
if (apiKey === undefined || apiKey.length === 0) {
  console.error(`Missing ${profile.apiKeyEnvironmentVariable}; no request was sent.`);
  Deno.exit(2);
}
const model = builtinModels().getModel(profile.providerId, profile.modelId);
if (model === undefined) {
  console.error(`Pinned Pi catalog does not contain ${profile.providerId}/${profile.modelId}.`);
  Deno.exit(2);
}
if (!getSupportedThinkingLevels(model).includes("low")) {
  console.error("Selected model does not expose low reasoning.");
  Deno.exit(2);
}

const requestText = await Deno.readTextFile(
  new URL("../research/program-creator/cases/translation-workbench.md", import.meta.url),
);
const requestSha256 = await sha256V1(JSON.stringify({
  systemPrompt: systemPromptV1,
  tool: blueprintToolV1,
  requestText,
  settings: { reasoning: "low", temperature: 0, cacheRetention: "short", maxRetries: 0 },
}));
const startedAt = performance.now();
let result: Record<string, unknown>;
try {
  const assistant = await builtinModels().completeSimple(model, {
    systemPrompt: systemPromptV1,
    messages: [{ role: "user", content: requestText, timestamp: Date.now() }],
    tools: [blueprintToolV1],
  }, {
    apiKey,
    reasoning: "low",
    toolChoice: "auto",
    temperature: 0,
    transport: "sse",
    cacheRetention: "short",
    sessionId: "sillyos.research.program-creator.translation.v1",
    maxTokens: blueprintOutputTokenEnvelopeV1,
    timeoutMs: requestedTimeoutMillisecondsV1,
    maxRetries: 0,
  });
  const common = {
    latencyMilliseconds: Math.round(performance.now() - startedAt),
    provider: assistant.provider,
    model: assistant.model,
    responseModel: assistant.responseModel ?? null,
    usage: assistant.usage,
  };
  if (assistant.stopReason === "error") {
    result = {
      outcome: "provider_or_transport_failed",
      code: sanitizeResearchProviderMessageV1(assistant.errorMessage, apiKey),
      ...common,
    };
  } else {
    const candidate = admitBlueprintV1(terminalToolCallV1(assistant));
    result = candidate === null ? { outcome: "candidate_rejected", ...common } : {
      outcome: "candidate_admitted",
      candidate,
      coverage: {
        workflowStages: coverageV1(candidate.workflowStages, workflowStagesV1),
        deterministicAssetIds: coverageV1(
          candidate.deterministicAssetIds,
          deterministicAssetIdsV1,
        ),
        resourceIds: coverageV1(candidate.resourceIds, resourceIdsV1),
        modelRoleIds: coverageV1(candidate.modelRoleIds, modelRoleIdsV1),
        settingIds: coverageV1(candidate.settingIds, settingIdsV1),
      },
      ...common,
    };
  }
} catch (error) {
  result = {
    outcome: "provider_or_transport_failed",
    code: sanitizeResearchErrorV1(error, apiKey),
    latencyMilliseconds: Math.round(performance.now() - startedAt),
  };
}

const evidence = {
  schema: "sillyos.program-creator-research.v1",
  scope: "closed_translation_blueprint",
  recordedAt: new Date().toISOString(),
  repositoryRevision: await repositoryRevisionV1(),
  workingTreeDirty: await repositoryWorkingTreeDirtyV1(),
  requestSha256,
  route: {
    profile: profile.id,
    providerId: profile.providerId,
    modelId: profile.modelId,
    reasoning: "low",
    temperature: 0,
    cacheRetention: "short",
  },
  result,
};

await Deno.mkdir(dirname(output), { recursive: true });
await Deno.writeTextFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({
  evidencePath: output,
  outcome: result.outcome,
  usage: result.usage ?? null,
}));
if (result.outcome !== "candidate_admitted") Deno.exitCode = 1;
