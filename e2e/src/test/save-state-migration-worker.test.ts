// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { saveStateMigrationVectorExpectedV1 } from "../testing/save-state-migration-driver.ts";
import {
  runSaveStateMigrationWorkerV1,
  type SaveStateMigrationWorkerLikeV1,
} from "../testing/save-state-migration-runner.ts";

describe("M2e isolated Save State migration Worker", () => {
  it("executes the exact vector in a fresh Deno Worker and terminates once", async () => {
    const first = await runSaveStateMigrationWorkerV1();
    const second = await runSaveStateMigrationWorkerV1();

    expect(first).toEqual({
      result: { kind: "passed", runtime: "deno", value: saveStateMigrationVectorExpectedV1 },
      workerTerminations: 1,
    });
    expect(second).toEqual(first);
  });

  it("fails closed on a malformed Worker response and still terminates once", async () => {
    let messageListener: ((event: { readonly data: unknown }) => void) | undefined;
    let terminations = 0;
    const worker: SaveStateMigrationWorkerLikeV1 = {
      addEventListener(type, listener) {
        if (type === "message") {
          messageListener = listener as (event: { readonly data: unknown }) => void;
        }
      },
      postMessage() {
        messageListener?.({ data: { kind: "passed", runtime: "deno", value: {} } });
      },
      terminate() {
        terminations += 1;
      },
    };

    const receipt = await runSaveStateMigrationWorkerV1({
      createWorker: () => worker,
      scheduleTimeout: () => () => {},
    });

    expect(receipt).toEqual({
      result: { kind: "driver_failed", runtime: "deno", phase: "protocol" },
      workerTerminations: 1,
    });
    expect(terminations).toBe(1);
  });
});
