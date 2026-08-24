// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  defineSaveStateMigrationRegistryV1,
  parseDigest,
  parsePositiveSafeInteger,
  parseSaveStateMigrationIdV1,
  parseSaveStateMigrationNamespaceV1,
} from "../index.ts";
import {
  evaluateDeterminismSaveSummaryProjectionV1,
  saveMetadataCompactExpectedV1,
} from "./determinism-vectors.ts";
import { inspectDeterminismSaveStateMigrationRegistryV1 } from "./save-state-migration-determinism.ts";

describe("DET4 determinism vector facade", () => {
  it("synchronously normalizes one synthetic Save summary projection", () => {
    const state = { checkpoint: 7, scene: "Neutral scene" };
    const sourceSummary = ["Checkpoint 7", "Neutral scene"];
    let callbackCount = 0;
    let receivedState: typeof state | undefined;

    const actual = evaluateDeterminismSaveSummaryProjectionV1({
      state,
      summarizeSave(currentState) {
        callbackCount += 1;
        receivedState = currentState;
        return sourceSummary;
      },
    });

    sourceSummary[0] = "mutated after projection";

    expect(callbackCount).toBe(1);
    expect(receivedState).toBe(state);
    expect(actual).toEqual(saveMetadataCompactExpectedV1.summaries.valid);
  });

  it("exposes exact registry callback identities only through the testkit seam", () => {
    const namespace = parseSaveStateMigrationNamespaceV1("state.testkit.aggregate");
    const source = {
      stateContractRevision: parsePositiveSafeInteger(1),
      stateContractDigest: parseDigest(
        "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      ),
    };
    const target = {
      stateContractRevision: parsePositiveSafeInteger(2),
      stateContractDigest: parseDigest(
        "sha256:2222222222222222222222222222222222222222222222222222222222222222",
      ),
    };
    let callbackCount = 0;
    const migrate = () => {
      callbackCount += 1;
      return ({ kind: "migrated" as const, state: null });
    };
    const registry = defineSaveStateMigrationRegistryV1({
      namespace,
      minimumSupported: source,
      current: target,
      steps: [
        {
          migrationId: parseSaveStateMigrationIdV1("migration.testkit.one"),
          namespace,
          from: source,
          to: target,
          references: { renames: [], deletions: [] },
          migrate,
        },
      ],
    });

    const inspection = inspectDeterminismSaveStateMigrationRegistryV1(registry);

    expect(inspection).toEqual({
      namespace,
      minimumSupported: source,
      current: target,
      steps: [{
        migrationId: "migration.testkit.one",
        from: source,
        to: target,
        migrate,
      }],
    });
    expect(inspection.steps[0]?.migrate).toBe(migrate);
    expect(callbackCount).toBe(0);
  });
});
