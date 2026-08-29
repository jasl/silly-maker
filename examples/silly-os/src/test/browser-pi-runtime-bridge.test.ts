// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createPiAgentV1,
  type PiSimpleStreamOptionsV1,
  type PiStreamFnV1,
} from "../agent/browser-pi-runtime-bridge.js";
import { fauxAssistantMessage, fauxProvider } from "./pi-faux-runtime.js";

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
    const agent = createPiAgentV1({
      submit: {
        revision: 1,
        proposalId: "proposal.reasoning.1",
        programId: "program.reasoning.1",
        baseProgramRevision: 1,
        text: "Verify the effective reasoning effort.",
      },
      workspaceTools: [],
      onTextDelta: () => {},
      onCandidate: () => {},
      reasoningEffort: "high",
      streamFn,
      model: faux.getModel(),
      systemPrompt: "Test the fixed Pi Agent reasoning path.",
    });

    await expect(agent.prompt("Run once.")).resolves.toEqual({ stopReason: "stop" });
    expect(observedReasoning).toBe("high");

    agent.dispose();
  });
});
