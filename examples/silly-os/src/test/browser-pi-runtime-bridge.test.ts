// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createDeterministicPiAgentV1,
  createPiAgentV1,
  type PiSimpleStreamOptionsV1,
  type PiStreamFnV1,
} from "../agent/browser-pi-runtime-bridge.js";
import { creatorProgramHarnessReferenceV1 } from "../agent/browser-pi-agent-dispatch.ts";
import { creatorBundledProgramPackageV1 } from "../agent/bundled-program-packages/creator-current.ts";
import {
  translationBatchToolNameV1,
  translationBundledProgramPackageV1,
} from "../agent/bundled-program-packages/translation-current.ts";
import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "./pi-faux-runtime.js";
import {
  translationProgramHarnessReferenceV1,
} from "../product/translation/translation-batch-protocol.ts";

describe("SillyOS Browser Pi runtime bridge", () => {
  it("passes the effective reasoning effort through Pi Agent to the Provider request", async () => {
    const faux = fauxProvider({
      models: [{ id: "reasoning-model", reasoning: true }],
      tokensPerSecond: 0,
    });
    faux.setResponses([fauxAssistantMessage("Done")]);
    let observedReasoning: PiSimpleStreamOptionsV1["reasoning"];
    const streamFn: PiStreamFnV1 = (model, context, options) => {
      observedReasoning = options?.reasoning;
      return faux.provider.streamSimple(model, context, options);
    };
    const dispatch = {
      revision: 1,
      harnessReference: creatorProgramHarnessReferenceV1,
      programId: "program.reasoning.1",
      submit: {
        revision: 1,
        proposalId: "proposal.reasoning.1",
        programId: "program.reasoning.1",
        baseProgramRevision: 1,
        text: "Verify the effective reasoning effort.",
      },
    } as const;
    const agent = createPiAgentV1({
      instructions: creatorBundledProgramPackageV1.instructions,
      workspaceTools: [],
      completionTool: creatorBundledProgramPackageV1.createCompletionTool({
        dispatch,
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
      harnessReference: translationProgramHarnessReferenceV1,
      programId: "program.translation.1",
      requestedOutputTokens: 4_608,
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
          source: "你好。",
          protectedSegments: [],
        }],
      },
    } as const;
    const onCandidate = (candidate: unknown) => {
      candidates.push(candidate);
    };
    const agent = createPiAgentV1({
      instructions: translationBundledProgramPackageV1.instructions,
      workspaceTools: [],
      completionTool: translationBundledProgramPackageV1.createCompletionTool({
        dispatch,
        onCandidate,
      }),
      onTextDelta: (delta) => textDeltas.push(delta),
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
      harnessReference: translationProgramHarnessReferenceV1,
      programId: "program.translation.deterministic.1",
      requestedOutputTokens: 4_608,
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
          source: "你好，⟦SM:0⟧。",
          protectedSegments: [{
            token: "⟦SM:0⟧",
            source: "{name}",
            kind: "placeholder",
          }],
        }],
      },
    } as const;
    const agent = createDeterministicPiAgentV1({
      dispatch,
      programPackage: translationBundledProgramPackageV1,
      workspaceTools: [],
      onCandidate: (candidate) => {
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
