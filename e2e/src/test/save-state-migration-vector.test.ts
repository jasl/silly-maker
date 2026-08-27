// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  collectSaveStateMigrationVectorV1,
  saveStateMigrationVectorExpectedV1,
} from "../testing/save-state-migration-driver.ts";

describe("M2e Save State migration determinism vector", () => {
  it("executes the synthetic vectors and maintained release corpus exactly", async () => {
    const first = await collectSaveStateMigrationVectorV1();
    const second = await collectSaveStateMigrationVectorV1();

    expect(first).toEqual(saveStateMigrationVectorExpectedV1);
    expect(JSON.stringify(first)).toBe(JSON.stringify(saveStateMigrationVectorExpectedV1));
    expect(second).toEqual(first);
    expect(first.cases.map(({ caseId, outcome, callbackCount }) => ({
      caseId,
      outcome,
      callbackCount,
    }))).toEqual([
      { caseId: "one_step", outcome: "exact", callbackCount: 1 },
      { caseId: "two_step", outcome: "exact", callbackCount: 2 },
      { caseId: "explicit_reject", outcome: "rejected", callbackCount: 1 },
      { caseId: "callback_throw", outcome: "faulted", callbackCount: 1 },
      { caseId: "invalid_output", outcome: "rejected", callbackCount: 1 },
      { caseId: "migration_plus_adoption", outcome: "adopted", callbackCount: 2 },
    ]);
    expect(first.releaseCorpus.map(({ fixtureId, callbackCount, migrationSteps }) => ({
      fixtureId,
      callbackCount,
      migrationSteps,
    }))).toEqual([
      {
        fixtureId: "engine-lab-state-3",
        callbackCount: 3,
        migrationSteps: [
          "migration.engine-lab.revision-3-to-4",
          "migration.engine-lab.revision-4-to-5",
          "migration.engine-lab.revision-5-to-6",
        ],
      },
      {
        fixtureId: "engine-lab-state-4",
        callbackCount: 2,
        migrationSteps: [
          "migration.engine-lab.revision-4-to-5",
          "migration.engine-lab.revision-5-to-6",
        ],
      },
      {
        fixtureId: "engine-lab-state-5",
        callbackCount: 1,
        migrationSteps: ["migration.engine-lab.revision-5-to-6"],
      },
      { fixtureId: "engine-lab-state-6", callbackCount: 0, migrationSteps: [] },
    ]);
  });
});
