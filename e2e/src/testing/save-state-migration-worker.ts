// SPDX-License-Identifier: MIT
import type { SaveStateMigrationDeterminismVectorV1 } from "./save-state-migration-driver.ts";

declare const Deno: unknown;

type WorkerRuntimeV1 = "deno" | "browser";
type WorkerResultV1 =
  | {
    readonly kind: "passed";
    readonly runtime: WorkerRuntimeV1;
    readonly value: SaveStateMigrationDeterminismVectorV1;
  }
  | {
    readonly kind: "driver_failed";
    readonly runtime: WorkerRuntimeV1;
    readonly phase: "protocol" | "module_import" | "driver_run";
  };

const workerRuntimeV1: WorkerRuntimeV1 = typeof Deno === "object" ? "deno" : "browser";

function postWorkerMessageV1(value: WorkerResultV1): void {
  Reflect.apply(globalThis.postMessage, globalThis, [value]);
}

function isRequestV1(value: unknown): value is { readonly schemaVersion: 1 } {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === 1 && Reflect.get(value, "schemaVersion") === 1;
}

let handled = false;
globalThis.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (handled) return;
  handled = true;
  void (async () => {
    if (!isRequestV1(event.data)) {
      postWorkerMessageV1({ kind: "driver_failed", runtime: workerRuntimeV1, phase: "protocol" });
      return;
    }
    let driver: typeof import("./save-state-migration-driver.ts");
    try {
      driver = await import("./save-state-migration-driver.ts");
    } catch {
      postWorkerMessageV1({
        kind: "driver_failed",
        runtime: workerRuntimeV1,
        phase: "module_import",
      });
      return;
    }
    try {
      postWorkerMessageV1({
        kind: "passed",
        runtime: workerRuntimeV1,
        value: await driver.collectSaveStateMigrationVectorV1(),
      });
    } catch {
      postWorkerMessageV1({
        kind: "driver_failed",
        runtime: workerRuntimeV1,
        phase: "driver_run",
      });
    }
  })();
});
