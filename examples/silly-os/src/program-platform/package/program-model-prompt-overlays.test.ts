// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  composeProgramModelPromptOverlaysV1,
  matchesProgramModelPatternV1,
} from "./program-model-prompt-overlays.ts";

describe("Program model prompt overlays", () => {
  it.each([
    ["glm-5.3-flash", "*glm-5.3-flash*"],
    ["z-ai/glm-5.3-flash", "*glm-5.3-flash*"],
    ["openrouter/z-ai/glm-5.3-flash", "openrouter/*"],
    ["z-ai/glm-5.3-flash-2026-08-21", "*glm-5.3-flash*"],
    ["DeepSeek/deepseek-v4-flash", "deepseek/*"],
    ["GLM-5.3-FLASH", "*glm-5.3-flash*"],
    ["anything/including/slashes", "*"],
    ["", "*"],
    ["provider/family/model", "provider/*/model"],
  ])("matches the complete model ID %j with %j", (modelId, modelPattern) => {
    expect(matchesProgramModelPatternV1(modelId, modelPattern)).toBe(true);
  });

  it.each([
    ["prefix-glm-5.3-flash", "glm-5.3-flash"],
    ["glm-5.3-flash-suffix", "glm-5.3-flash"],
    ["z-ai/glm-5.2-flash", "*glm-5.3-flash*"],
  ])("does not match the complete model ID %j with %j", (modelId, modelPattern) => {
    expect(matchesProgramModelPatternV1(modelId, modelPattern)).toBe(false);
  });

  it("treats regular-expression syntax as literal text", () => {
    const modelId = "provider/model.+(test)?[x]^{1}$|";

    expect(matchesProgramModelPatternV1(modelId, modelId)).toBe(true);
    expect(matchesProgramModelPatternV1(modelId, "provider/model.+(*)?[x]^{1}$|")).toBe(
      true,
    );
    expect(matchesProgramModelPatternV1("provider/modelX", "provider/model.")).toBe(false);
  });

  it("appends every match in declaration order and inserts each path once", () => {
    expect(composeProgramModelPromptOverlaysV1({
      instructions: "Base instructions.",
      modelId: "openrouter/z-ai/glm-5.3-flash",
      overlays: [
        {
          modelPattern: "*glm-5.3-flash*",
          path: "prompts/models/glm.md",
          instructions: "GLM guidance.",
        },
        {
          modelPattern: "openrouter/*",
          path: "prompts/models/openrouter.md",
          instructions: "Namespace guidance.",
        },
        {
          modelPattern: "*",
          path: "prompts/models/glm.md",
          instructions: "Duplicate path content.",
        },
      ],
    })).toBe("Base instructions.\n\nGLM guidance.\n\nNamespace guidance.");
  });

  it("deduplicates only paths belonging to matched declarations", () => {
    expect(composeProgramModelPromptOverlaysV1({
      instructions: "Base instructions.",
      modelId: "deepseek-v4-flash",
      overlays: [
        {
          modelPattern: "*glm*",
          path: "prompts/models/shared.md",
          instructions: "Unmatched content.",
        },
        {
          modelPattern: "*deepseek*",
          path: "prompts/models/shared.md",
          instructions: "Matched content.",
        },
      ],
    })).toBe("Base instructions.\n\nMatched content.");
  });

  it("returns unchanged base instructions when no overlay matches", () => {
    const instructions = "  Base instructions.\n";

    expect(composeProgramModelPromptOverlaysV1({
      instructions,
      modelId: "deepseek-v4-flash",
      overlays: [{
        modelPattern: "*glm*",
        path: "prompts/models/glm.md",
        instructions: "GLM guidance.",
      }],
    })).toBe(instructions);
  });

  it("uses a stable separator without trimming either input", () => {
    const instructions = "  Base instructions.\n";
    const overlay = "\nOverlay instructions.  ";

    expect(composeProgramModelPromptOverlaysV1({
      instructions,
      modelId: "glm-5.3-flash",
      overlays: [{
        modelPattern: "*glm*",
        path: "prompts/models/glm.md",
        instructions: overlay,
      }],
    })).toBe(`${instructions}\n\n${overlay}`);
  });
});
