// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  isProgramModelManualSelectionCurrentV1,
  type ProgramModelDefaultChoiceV1,
  resolveProgramModelDefaultV1,
} from "./program-model-default.ts";

function builtinChoiceV1(
  providerId: string,
  modelId: string,
): ProgramModelDefaultChoiceV1 {
  return {
    value: `${providerId}/${modelId}`,
    modelId,
    modelRef: { kind: "builtin", providerId, modelId },
  };
}

function customChoiceV1(profileId: string, modelId: string): ProgramModelDefaultChoiceV1 {
  return {
    value: profileId,
    modelId,
    modelRef: { kind: "custom", profileId },
  };
}

describe("Program model default", () => {
  it("uses the first recommended model pattern that has a usable route", () => {
    const fallback = builtinChoiceV1("openrouter", "fallback-model");
    const recommended = builtinChoiceV1("deepseek", "deepseek-v4-flash");

    expect(resolveProgramModelDefaultV1({
      recommendedModelPatterns: ["missing-model", "deepseek-v4-flash", "fallback-model"],
      choices: [fallback, recommended],
      lastSuccessfulModel: fallback.modelRef,
    })).toBe(recommended);
  });

  it("matches a dated model snapshot through the shared pattern contract", () => {
    const snapshot = builtinChoiceV1("openrouter", "Z-AI/GLM-5.3-Flash-2026-08-21");

    expect(resolveProgramModelDefaultV1({
      recommendedModelPatterns: ["*glm-5.3-flash*"],
      choices: [snapshot],
      lastSuccessfulModel: null,
    })).toBe(snapshot);
  });

  it("falls back to the exact saved last-successful model when no recommendation is usable", () => {
    const lastSuccessful = customChoiceV1("custom.translation", "translation-model");

    expect(resolveProgramModelDefaultV1({
      recommendedModelPatterns: ["missing-model"],
      choices: [builtinChoiceV1("openrouter", "other-model"), lastSuccessful],
      lastSuccessfulModel: lastSuccessful.modelRef,
    })).toBe(lastSuccessful);
  });

  it("requires a manual choice when recommendations and history are unavailable", () => {
    expect(resolveProgramModelDefaultV1({
      recommendedModelPatterns: ["missing-model"],
      choices: [builtinChoiceV1("openrouter", "other-model")],
      lastSuccessfulModel: null,
    })).toBeNull();
  });

  it("does not choose an arbitrary route when a recommended pattern is ambiguous", () => {
    expect(resolveProgramModelDefaultV1({
      recommendedModelPatterns: ["shared-model", "lower-priority-model"],
      choices: [
        builtinChoiceV1("provider-a", "shared-model"),
        builtinChoiceV1("provider-b", "shared-model"),
        builtinChoiceV1("provider-c", "lower-priority-model"),
      ],
      lastSuccessfulModel: null,
    })).toBeNull();
  });

  it("uses the exact saved last-successful model to disambiguate a recommendation", () => {
    const lastSuccessful = builtinChoiceV1("provider-b", "shared-model");

    expect(resolveProgramModelDefaultV1({
      recommendedModelPatterns: ["shared-model"],
      choices: [builtinChoiceV1("provider-a", "shared-model"), lastSuccessful],
      lastSuccessfulModel: lastSuccessful.modelRef,
    })).toBe(lastSuccessful);
  });

  it("does not let a merely active model override the saved last-successful model", () => {
    const active = builtinChoiceV1("provider-a", "shared-model-snapshot-a");
    const lastSuccessful = builtinChoiceV1("provider-b", "shared-model-snapshot-b");

    expect(resolveProgramModelDefaultV1({
      recommendedModelPatterns: ["shared-model-*"],
      choices: [active, lastSuccessful],
      lastSuccessfulModel: lastSuccessful.modelRef,
    })).toBe(lastSuccessful);
  });
});

describe("Program model manual selection", () => {
  it("keeps an explicit choice inside the exact Program package scope", () => {
    const selection = { scopeKey: "translation@1#digest-a", choiceValue: "deepseek" };

    expect(
      isProgramModelManualSelectionCurrentV1(
        selection,
        "translation@1#digest-a",
        "deepseek",
      ),
    ).toBe(true);
    expect(
      isProgramModelManualSelectionCurrentV1(
        selection,
        "creator@1#digest-b",
        "deepseek",
      ),
    ).toBe(false);
    expect(
      isProgramModelManualSelectionCurrentV1(
        selection,
        "translation@1#digest-a",
        "glm",
      ),
    ).toBe(false);
  });
});
