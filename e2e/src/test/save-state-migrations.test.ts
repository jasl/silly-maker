// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { resolveCoreGameApplicationV1 } from "@sillymaker/base/runtime";

import { labCoreApplicationDefinitionV1 } from "../application/core-definition.ts";
import { labSaveStateMigrationRegistryV1 } from "../save-state-migrations.ts";
import { labCurrentStateContractIdentityV1 } from "../save-state-migrations.ts";

describe("Engine Lab Save State migration owner", () => {
  it("binds the exact app-local registry to the resolved current State contract", () => {
    expect(labCoreApplicationDefinitionV1.saveStateMigrations).toBe(
      labSaveStateMigrationRegistryV1,
    );
    const resolved = resolveCoreGameApplicationV1(labCoreApplicationDefinitionV1);
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") throw new TypeError("Engine Lab Core did not resolve");
    expect(resolved.application.definition.saveStateMigrations).toBe(
      labSaveStateMigrationRegistryV1,
    );
    expect(resolved.application.provenance.resolved).toMatchObject(
      labCurrentStateContractIdentityV1,
    );
  });
});
