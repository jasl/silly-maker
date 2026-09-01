// SPDX-License-Identifier: MIT

import { matchesProgramModelPatternV1 } from "../../program-platform/package/program-model-prompt-overlays.ts";
import type { BrowserProviderLastSuccessfulModelRefV1 } from "./browser-provider-settings-repository.ts";

export interface ProgramModelDefaultChoiceV1 {
  readonly value: string;
  readonly modelId: string;
  readonly modelRef: BrowserProviderLastSuccessfulModelRefV1;
}

export interface ProgramModelManualSelectionV1 {
  readonly scopeKey: string;
  readonly choiceValue: string;
}

export function isProgramModelManualSelectionCurrentV1(
  selection: ProgramModelManualSelectionV1 | null,
  scopeKey: string,
  activeChoiceValue: string | null,
): boolean {
  return selection?.scopeKey === scopeKey && selection.choiceValue === activeChoiceValue;
}

function modelRefsEqualV1(
  left: BrowserProviderLastSuccessfulModelRefV1 | null,
  right: BrowserProviderLastSuccessfulModelRefV1,
): boolean {
  if (left === null || left.kind !== right.kind) return false;
  return left.kind === "builtin" && right.kind === "builtin"
    ? left.providerId === right.providerId && left.modelId === right.modelId
    : left.kind === "custom" && right.kind === "custom" &&
      left.profileId === right.profileId;
}

function exactChoiceV1<Choice extends ProgramModelDefaultChoiceV1>(
  choices: readonly Choice[],
  lastSuccessfulModel: BrowserProviderLastSuccessfulModelRefV1 | null,
): Choice | null {
  return choices.find((choice) => modelRefsEqualV1(lastSuccessfulModel, choice.modelRef)) ?? null;
}

/**
 * Resolves one automatic model without inventing a Provider route.
 *
 * A Program recommends resolved model-id patterns using the same matcher as
 * prompt overlays. When one pattern matches several usable routes or model
 * snapshots, only the exact saved last-successful model reference may
 * disambiguate it;
 * otherwise the user must choose. Explicit current-scope selection is owned by
 * the caller and never inferred here.
 */
export function resolveProgramModelDefaultV1<Choice extends ProgramModelDefaultChoiceV1>(input: {
  readonly recommendedModelPatterns: readonly string[];
  readonly choices: readonly Choice[];
  readonly lastSuccessfulModel: BrowserProviderLastSuccessfulModelRefV1 | null;
}): Choice | null {
  for (const modelPattern of input.recommendedModelPatterns) {
    const matching = input.choices.filter((choice) =>
      matchesProgramModelPatternV1(choice.modelId, modelPattern)
    );
    if (matching.length === 0) continue;
    if (matching.length === 1) return matching[0]!;
    return exactChoiceV1(matching, input.lastSuccessfulModel);
  }
  return exactChoiceV1(input.choices, input.lastSuccessfulModel);
}
