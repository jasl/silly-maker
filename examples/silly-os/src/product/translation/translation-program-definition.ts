// SPDX-License-Identifier: MIT

import type { ProgramDefinitionRevisionV1 } from "../program-process-repository.ts";

export const builtinTranslationProgramIdV1 = "sillyos.builtin.translation" as const;
/** Fixed SillyOS harness compatibility generation, not a package source revision. */
export const translationProgramHarnessReferenceV1 = "sillyos.harness.translation@1" as const;

/**
 * Build-known Translation definition published by the Translation Process
 * controller. Capability IDs remain empty until the Agent execution lane owns
 * and proves its concrete harness surface.
 */
export function createBuiltinTranslationProgramDefinitionRevisionV1(): ProgramDefinitionRevisionV1 {
  return {
    schemaVersion: 1,
    programId: builtinTranslationProgramIdV1,
    revision: 1,
    kind: "translation",
    name: "Translation",
    purpose: "Translate one admitted Process Workspace.",
    harnessReference: translationProgramHarnessReferenceV1,
    capabilityIds: [],
  };
}
