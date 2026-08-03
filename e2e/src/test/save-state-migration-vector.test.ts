// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  collectSaveStateMigrationVectorV1,
  saveStateMigrationVectorExpectedV1,
} from "../testing/save-state-migration-driver.ts";

describe("M2e Save State migration determinism vector", () => {
  it("executes the real one/two-step owner and bounded failure/adoption cases exactly", () => {
    const first = collectSaveStateMigrationVectorV1();
    const second = collectSaveStateMigrationVectorV1();

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
  });
});
