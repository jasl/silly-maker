// SPDX-License-Identifier: MIT

export interface LoadedProgramModelPromptOverlayV1 {
  readonly modelPattern: string;
  readonly path: string;
  readonly instructions: string;
}

export function matchesProgramModelPatternV1(
  modelId: string,
  modelPattern: string,
): boolean {
  const normalizedModelId = modelId.toLowerCase();
  const normalizedModelPattern = modelPattern.toLowerCase();
  let modelIndex = 0;
  let patternIndex = 0;
  let starIndex = -1;
  let starModelIndex = 0;

  while (modelIndex < normalizedModelId.length) {
    if (normalizedModelPattern[patternIndex] === "*") {
      starIndex = patternIndex;
      starModelIndex = modelIndex;
      patternIndex += 1;
      continue;
    }
    if (
      patternIndex < normalizedModelPattern.length &&
      normalizedModelPattern[patternIndex] === normalizedModelId[modelIndex]
    ) {
      patternIndex += 1;
      modelIndex += 1;
      continue;
    }
    if (starIndex === -1) return false;
    patternIndex = starIndex + 1;
    starModelIndex += 1;
    modelIndex = starModelIndex;
  }

  while (normalizedModelPattern[patternIndex] === "*") patternIndex += 1;
  return patternIndex === normalizedModelPattern.length;
}

export function composeProgramModelPromptOverlaysV1(input: {
  readonly instructions: string;
  readonly modelId: string;
  readonly overlays: readonly LoadedProgramModelPromptOverlayV1[];
}): string {
  const seenPaths = new Set<string>();
  const matchedInstructions: string[] = [];

  for (const overlay of input.overlays) {
    if (!matchesProgramModelPatternV1(input.modelId, overlay.modelPattern)) continue;
    if (seenPaths.has(overlay.path)) continue;
    seenPaths.add(overlay.path);
    matchedInstructions.push(overlay.instructions);
  }

  if (matchedInstructions.length === 0) return input.instructions;
  return [input.instructions, ...matchedInstructions].join("\n\n");
}
