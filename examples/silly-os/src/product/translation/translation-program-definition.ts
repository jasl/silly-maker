// SPDX-License-Identifier: MIT

import type { ProgramDefinitionRevisionV1 } from "../program-process-repository.ts";

export const builtinTranslationProgramIdV1 = "sillyos.builtin.translation" as const;
/** Fixed SillyOS harness compatibility generation, not a package source revision. */
export const translationProgramHarnessReferenceV1 = "sillyos.harness.translation@1" as const;

/**
 * Intended build-known Translation definition. It is not published during
 * Creator bootstrap: an ordinary Translation Process must first freeze the
 * profile and compatibility behavior. Tool capabilities therefore belong to a
 * later selected definition rather than being advertised here prematurely.
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
