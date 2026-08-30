// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createPiAgentV1,
  type PiSimpleStreamOptionsV1,
  type PiStreamFnV1,
} from "../agent/browser-pi-runtime-bridge.js";
import { creatorProgramHarnessReferenceV1 } from "../agent/browser-pi-agent-dispatch.ts";
import { creatorBuiltinProgramPackageV1 } from "../agent/builtin-program-packages/creator-current.ts";
import {
  translationBatchToolNameV1,
  translationBuiltinProgramPackageV1,
} from "../agent/builtin-program-packages/translation-current.ts";
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
      instructions: creatorBuiltinProgramPackageV1.instructions,
      workspaceTools: [],
      completionTool: creatorBuiltinProgramPackageV1.createCompletionTool({
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
      request: {
        sourceLocale: "zh-CN",
        targetLocale: "en",
        documentPurpose: "Fictional dialogue.",
        style: "Natural.",
        glossary: [],
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
      instructions: translationBuiltinProgramPackageV1.instructions,
      workspaceTools: [],
      completionTool: translationBuiltinProgramPackageV1.createCompletionTool({
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
});
