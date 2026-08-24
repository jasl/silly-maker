// SPDX-License-Identifier: MIT
import type { SaveStateMigrationStepV1 } from "@sillymaker/base";

/** Deterministic callback dependency used to prove live owner-closure collection. */
export const syntheticSaveStateMigrationCallbackV1: SaveStateMigrationStepV1["migrate"] = (
  _state,
) => ({ kind: "migrated", state: { value: 2 } });
