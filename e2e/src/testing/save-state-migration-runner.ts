// SPDX-License-Identifier: MIT
import {
  saveStateMigrationVectorExpectedV1,
  type SaveStateMigrationDeterminismVectorV1,
} from "./save-state-migration-driver.ts";

declare const Deno: unknown;

type WorkerRuntimeV1 = "deno" | "browser";

interface WorkerMessageEventV1 {
  readonly data: unknown;
}

interface WorkerErrorEventV1 {
  readonly error?: unknown;
}

export interface SaveStateMigrationWorkerLikeV1 {
  addEventListener(
    type: "message",
    listener: (event: WorkerMessageEventV1) => void,
  ): void;
  addEventListener(
    type: "error",
    listener: (event: WorkerErrorEventV1) => void,
  ): void;
  postMessage(message: unknown): void;
  terminate(): void;
}

export type SaveStateMigrationWorkerResultV1 =
  | {
    readonly kind: "passed";
    readonly runtime: WorkerRuntimeV1;
    readonly value: SaveStateMigrationDeterminismVectorV1;
  }
  | {
    readonly kind: "driver_failed";
    readonly runtime: WorkerRuntimeV1;
    readonly phase: "protocol" | "module_import" | "driver_run" | "worker";
  };

export interface SaveStateMigrationWorkerReceiptV1 {
  readonly result: SaveStateMigrationWorkerResultV1;
  readonly workerTerminations: 1;
}

type WorkerFactoryV1 = (
  url: URL,
  options: { readonly type: "module"; readonly name: string },
) => SaveStateMigrationWorkerLikeV1;
type TimeoutSchedulerV1 = (callback: () => void) => () => void;

function runtimeV1(): WorkerRuntimeV1 {
  return typeof Deno === "object" ? "deno" : "browser";
}

function failedV1(
  runtime: WorkerRuntimeV1,
  phase: Extract<SaveStateMigrationWorkerResultV1, { readonly kind: "driver_failed" }>["phase"],
): SaveStateMigrationWorkerResultV1 {
  return Object.freeze({ kind: "driver_failed", runtime, phase });
}

function isExactRecordV1(value: unknown, fields: readonly string[]): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const keys = Reflect.ownKeys(value);
  return keys.length === fields.length && fields.every((field) => Object.hasOwn(value, field));
}

function validResultV1(
  value: unknown,
  runtime: WorkerRuntimeV1,
): value is SaveStateMigrationWorkerResultV1 {
  if (
    !isExactRecordV1(value, ["kind", "runtime", "value"]) &&
    !isExactRecordV1(value, ["kind", "runtime", "phase"])
  ) return false;
  const record = value as Readonly<Record<string, unknown>>;
  if (record.runtime !== runtime) return false;
  if (record.kind === "passed") {
    try {
      return JSON.stringify(record.value) === JSON.stringify(saveStateMigrationVectorExpectedV1);
    } catch {
      return false;
    }
  }
  return record.kind === "driver_failed" &&
    (record.phase === "protocol" || record.phase === "module_import" ||
      record.phase === "driver_run");
}

function defaultWorkerFactoryV1(
  url: URL,
  options: { readonly type: "module"; readonly name: string },
): SaveStateMigrationWorkerLikeV1 {
  return new Worker(url, options);
}

function defaultTimeoutSchedulerV1(callback: () => void): () => void {
  const timeout = setTimeout(callback, 10_000);
  return () => clearTimeout(timeout);
}

export async function runSaveStateMigrationWorkerV1(
  options: {
    readonly createWorker?: WorkerFactoryV1;
    readonly scheduleTimeout?: TimeoutSchedulerV1;
  } = {},
): Promise<SaveStateMigrationWorkerReceiptV1> {
  const runtime = runtimeV1();
  const worker = (options.createWorker ?? defaultWorkerFactoryV1)(
    new URL("./save-state-migration-worker.ts", import.meta.url),
    Object.freeze({ type: "module", name: "sillymaker-save-state-migration" }),
  );
  let cancelTimeout = () => {};
  let terminations = 0;
  let result: SaveStateMigrationWorkerResultV1;
  try {
    result = await new Promise((resolve) => {
      let settled = false;
      const settle = (candidate: SaveStateMigrationWorkerResultV1) => {
        if (settled) return;
        settled = true;
        cancelTimeout();
        resolve(candidate);
      };
      worker.addEventListener("message", (event) => {
        settle(validResultV1(event.data, runtime) ? event.data : failedV1(runtime, "protocol"));
      });
      worker.addEventListener("error", () => settle(failedV1(runtime, "worker")));
      const scheduledCancel = (options.scheduleTimeout ?? defaultTimeoutSchedulerV1)(() =>
        settle(failedV1(runtime, "worker"))
      );
      cancelTimeout = scheduledCancel;
      if (settled) scheduledCancel();
      try {
        Reflect.apply(worker.postMessage, worker, [Object.freeze({ schemaVersion: 1 })]);
      } catch {
        settle(failedV1(runtime, "protocol"));
      }
    });
  } finally {
    cancelTimeout();
    worker.terminate();
    terminations += 1;
  }
  if (terminations !== 1) throw new TypeError("migration Worker termination count changed");
  return Object.freeze({ result, workerTerminations: 1 });
}
