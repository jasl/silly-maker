// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createDeterministicPiAgentV1,
  createPiAgentV1,
} from "../agent/browser-pi-runtime-bridge.js";
import { Type, type AgentTool } from "../agent/pi-workspace-runtime-bridge.js";
import {
  creatorProgramRuntimeProfileImplementationV1,
  creatorProgramRuntimeProfileV1,
} from "../../programs/creator/runtime-profile/creator-runtime-profile.ts";
import {
  translationBatchToolNameV1,
  translationProgramRuntimeProfileImplementationV1,
  translationProgramRuntimeProfileV1,
} from "../../programs/translation/runtime-profile/translation-runtime-profile.ts";
import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "./pi-faux-runtime.js";

const creatorProgramPackageV1 = {
  programId: "sillyos.creator",
  packageVersion: "1.0.0",
} as const;
const translationProgramPackageV1 = {
  programId: "sillyos.translation",
  packageVersion: "1.0.0",
} as const;

function createTranslationWorkspaceToolsV1(): readonly AgentTool[] {
  const files = new Map<string, string>();
  const inertTool = (name: string): AgentTool => ({
    name,
    label: name,
    description: `${name} test tool`,
    parameters: Type.Object({}),
    async execute() {
      return { content: [{ type: "text", text: "" }], details: undefined };
    },
  });
  return [
    inertTool("sillyos_read_program_resource"),
    {
      name: "read",
      label: "read",
      description: "read test file",
      parameters: Type.Object({ path: Type.String() }),
      async execute(_toolCallId, params) {
        const path = (params as { readonly path: string }).path;
        return {
          content: [{ type: "text", text: files.get(path) ?? "" }],
          details: undefined,
        };
      },
    },
    {
      name: "write",
      label: "write",
      description: "write test file",
      parameters: Type.Object({ path: Type.String(), content: Type.String() }),
      async execute(_toolCallId, params) {
        const { path, content } = params as {
          readonly path: string;
          readonly content: string;
        };
        files.set(path, content);
        return {
          content: [{ type: "text", text: `Wrote ${path}` }],
          details: undefined,
        };
      },
    },
    inertTool("edit"),
    inertTool("grep"),
  ];
}

describe("SillyOS Browser Pi runtime bridge", () => {
  it("passes the effective reasoning effort through Pi Agent to the Provider request", async () => {
    const faux = fauxProvider({
      models: [{ id: "reasoning-model", reasoning: true }],
      tokensPerSecond: 0,
    });
    faux.setResponses([fauxAssistantMessage("Done")]);
    let observedReasoning: string | undefined;
    const streamFn: typeof faux.provider.streamSimple = (model, context, options) => {
      observedReasoning = options?.reasoning;
      return faux.provider.streamSimple(model, context, options);
    };
    const dispatch = {
      revision: 1,
      runtimeProfile: creatorProgramRuntimeProfileV1,
      programPackage: creatorProgramPackageV1,
      workspaceProgramId: creatorProgramPackageV1.programId,
      payload: {
        revision: 1,
        proposalId: "proposal.reasoning.1",
        programId: creatorProgramPackageV1.programId,
        baseProgramRevision: 1,
        text: "Verify the effective reasoning effort.",
      },
    } as const;
    const admission = creatorProgramRuntimeProfileImplementationV1.admitDispatch(dispatch);
    if (admission.kind === "rejected") throw new Error("Creator dispatch was rejected");
    const agent = createPiAgentV1({
      instructions: "Create the requested Program.",
      workspaceTools: [],
      completionTool: admission.invocation.completion.kind === "candidate"
        ? admission.invocation.completion.createTool({
          onCandidate: () => {},
        })
        : null,
      onTextDelta: () => {},
      reasoningEffort: "high",
      streamFn,
      model: faux.getModel(),
    });

    await expect(agent.prompt("Run once.")).resolves.toEqual({ stopReason: "stop" });
    expect(observedReasoning).toBe("high");

    agent.dispose();
  });

  it("preserves a Provider output-length stop reason", async () => {
    const faux = fauxProvider({
      models: [{ id: "length-limited-model" }],
      tokensPerSecond: 0,
    });
    faux.setResponses([fauxAssistantMessage("Partial output", { stopReason: "length" })]);
    const agent = createPiAgentV1({
      instructions: "Return a bounded answer.",
      workspaceTools: [],
      completionTool: null,
      onTextDelta: () => {},
      reasoningEffort: "off",
      streamFn: faux.provider.streamSimple,
      model: faux.getModel(),
    });

    await expect(agent.prompt("Run once.")).resolves.toEqual({ stopReason: "length" });

    agent.dispose();
  });

  it("makes the admitted Translation tool candidate authoritative despite trailing text", async () => {
    const faux = fauxProvider({
      models: [{ id: "translation-model" }],
      tokensPerSecond: 0,
    });
    faux.setResponses([
      fauxAssistantMessage(
        fauxToolCall(translationBatchToolNameV1, {
          targets: [{ unitId: "translation.unit.000001", target: "Hello." }],
          ambiguities: [],
        }),
        { stopReason: "toolUse" },
      ),
      fauxAssistantMessage("The translation is ready."),
    ]);
    const candidates: unknown[] = [];
    const textDeltas: string[] = [];
    const dispatch = {
      revision: 1,
      runtimeProfile: translationProgramRuntimeProfileV1,
      programPackage: translationProgramPackageV1,
      workspaceProgramId: translationProgramPackageV1.programId,
      payload: {
        kind: "batch",
        requestedOutputTokens: 4_608,
        instruction: "Translate the admitted batch faithfully.",
        request: {
          sourceLocale: "zh-CN",
          targetLocale: "en",
          documentPurpose: "Fictional dialogue.",
          style: "Natural.",
          glossary: [],
          confirmedMeaningFacts: [],
          neighboringUnits: { preceding: null, following: null },
          units: [{
            unitId: "translation.unit.000001",
            order: 0,
            locator: "line/1",
            context: null,
            durationMilliseconds: null,
            lineBreakPolicy: "forbidden",
            source: "你好。",
            protectedSegments: [],
          }],
        },
      },
    } as const;
    const onCandidate = (candidate: unknown) => {
      candidates.push(candidate);
    };
    const admission = translationProgramRuntimeProfileImplementationV1.admitDispatch(dispatch);
    if (admission.kind === "rejected") throw new Error("Translation dispatch was rejected");
    const agent = createPiAgentV1({
      instructions: "Translate the admitted batch faithfully.",
      workspaceTools: [],
      completionTool: admission.invocation.completion.kind === "candidate"
        ? admission.invocation.completion.createTool({
          onCandidate,
        })
        : null,
      onTextDelta: (delta: string) => textDeltas.push(delta),
      reasoningEffort: "off",
      streamFn: faux.provider.streamSimple,
      model: faux.getModel(),
    });

    await expect(agent.prompt("Translate the admitted batch.")).resolves.toEqual({
      stopReason: "stop",
    });
    expect(candidates).toEqual([{
      targets: [{ unitId: "translation.unit.000001", target: "Hello." }],
      ambiguities: [],
    }]);
    expect(textDeltas.join("")).toContain("translation is ready");

    agent.dispose();
  });

  it("drives a Translation package through the deterministic product runtime", async () => {
    const candidates: unknown[] = [];
    const dispatch = {
      revision: 1,
      runtimeProfile: translationProgramRuntimeProfileV1,
      programPackage: translationProgramPackageV1,
      workspaceProgramId: translationProgramPackageV1.programId,
      payload: {
        kind: "batch",
        requestedOutputTokens: 4_608,
        instruction: "Translate the admitted batch faithfully.",
        request: {
          sourceLocale: "zh-CN",
          targetLocale: "en",
          documentPurpose: "Fictional dialogue.",
          style: "Natural.",
          glossary: [],
          confirmedMeaningFacts: [],
          neighboringUnits: { preceding: null, following: null },
          units: [{
            unitId: "translation.unit.deterministic.1",
            order: 0,
            locator: "line/1",
            context: null,
            durationMilliseconds: null,
            lineBreakPolicy: "forbidden",
            source: "你好，⟦SM:0⟧。",
            protectedSegments: [{
              token: "⟦SM:0⟧",
              source: "{name}",
              kind: "placeholder",
            }],
          }],
        },
      },
    } as const;
    const admission = translationProgramRuntimeProfileImplementationV1.admitDispatch(dispatch);
    if (admission.kind === "rejected") throw new Error("Translation dispatch was rejected");
    const agent = createDeterministicPiAgentV1({
      instructions: "Translate the admitted batch faithfully.",
      runtimeProfile: translationProgramRuntimeProfileImplementationV1,
      invocation: admission.invocation,
      harnessToolIds: translationProgramRuntimeProfileImplementationV1.harnessToolIds,
      workspaceTools: createTranslationWorkspaceToolsV1(),
      onCandidate: (candidate: unknown) => {
        candidates.push(candidate);
      },
      onTextDelta: () => undefined,
      reasoningEffort: "off",
      runNumber: 1,
    });

    await expect(agent.prompt("Translate the admitted batch.")).resolves.toEqual({
      stopReason: "stop",
    });
    expect(candidates).toEqual([{
      targets: [{
        unitId: "translation.unit.deterministic.1",
        target: "[deterministic] 你好，⟦SM:0⟧。",
      }],
      ambiguities: [],
    }]);

    agent.dispose();
  });
});
