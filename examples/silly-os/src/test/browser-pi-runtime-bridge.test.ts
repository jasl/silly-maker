// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createDeterministicPiAgentV1,
  createPiAgentV1,
} from "../agent/browser-pi-runtime-bridge.js";
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
  contentDigest: "c".repeat(64),
} as const;
const translationProgramPackageV1 = {
  programId: "sillyos.translation",
  packageVersion: "1.0.0",
  contentDigest: "d".repeat(64),
} as const;

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
      completionTool: admission.invocation.createCompletionTool({
        onCandidate: () => {},
      }),
      onTextDelta: () => {},
      reasoningEffort: "high",
      streamFn,
      model: faux.getModel(),
    });

    await expect(agent.prompt("Run once.")).resolves.toEqual({ stopReason: "stop" });
    expect(observedReasoning).toBe("high");

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
      completionTool: admission.invocation.createCompletionTool({
        onCandidate,
      }),
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
      workspaceTools: [],
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
