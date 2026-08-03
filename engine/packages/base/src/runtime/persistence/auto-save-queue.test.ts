// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  commitPreparedAutoSaveAnchorInternalV1,
  createAutoSaveQueueInternalV1,
  createAutoSaveQueueV1,
  enqueueAutoSaveWithReceiptInternalV1,
  establishAutoSaveAnchorWithReceiptInternalV1,
  prepareAutoSaveAnchorWithReceiptInternalV1,
  runPreparedAutoSaveAnchorPostCommitInternalV1,
} from "./auto-save-queue.ts";
import { parseNonNegativeSafeInteger } from "../../contracts/values.ts";

interface DeferredV1<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

function deferredV1<T>(): DeferredV1<T> {
  let resolvePromise: ((value: T) => void) | undefined;
  let rejectPromise: ((error: unknown) => void) | undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return Object.freeze({
    promise,
    resolve(value: T) {
      resolvePromise?.(value);
    },
    reject(error: unknown) {
      rejectPromise?.(error);
    },
  });
}

async function flushV1(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("Auto Save queue", () => {
  it("prepares an anchor epoch and receipt without mutation, I/O, or publication", async () => {
    const written: number[] = [];
    const visible: Array<readonly [number, string]> = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        written.push(candidate);
        return Promise.resolve(`saved:${candidate}`);
      },
      onCurrentResult(candidate, result) {
        visible.push([candidate, result]);
      },
    });

    const plan = prepareAutoSaveAnchorWithReceiptInternalV1<number, string>(queue, 7);

    expect(queue.anchorEpoch()).toBe(0);
    expect(queue.isIdle()).toBe(true);
    expect(written).toEqual([]);
    expect(visible).toEqual([]);
    expect(() => commitPreparedAutoSaveAnchorInternalV1(plan.prepared)).not.toThrow();
    expect(queue.anchorEpoch()).toBe(1);
    expect(written).toEqual([]);
    expect(visible).toEqual([]);
    expect(() => runPreparedAutoSaveAnchorPostCommitInternalV1(plan.prepared)).not.toThrow();
    await expect(plan.receipt).resolves.toEqual({ kind: "superseded" });
    expect(written).toEqual([]);
    expect(visible).toEqual([]);
  });

  it("fails epoch exhaustion during prepare without mutating queue state", () => {
    const write = vi.fn((_candidate: number) => Promise.resolve("saved"));
    const queue = createAutoSaveQueueInternalV1<number, string>(
      { write },
      { initialAnchorEpoch: parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER) },
    );

    expect(() => prepareAutoSaveAnchorWithReceiptInternalV1(queue, 7)).toThrow(TypeError);
    expect(queue.anchorEpoch()).toBe(Number.MAX_SAFE_INTEGER);
    expect(queue.isIdle()).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });

  it("rejects fake, spread, stale, and reused prepared anchor tokens before mutation", () => {
    const first = createAutoSaveQueueV1<number, string>({
      write: (candidate) => Promise.resolve(`saved:${candidate}`),
    });
    const second = createAutoSaveQueueV1<number, string>({
      write: (candidate) => Promise.resolve(`saved:${candidate}`),
    });
    const plan = prepareAutoSaveAnchorWithReceiptInternalV1<number, string>(first, 7);
    const stale = prepareAutoSaveAnchorWithReceiptInternalV1<number, string>(first, 8);
    const independent = prepareAutoSaveAnchorWithReceiptInternalV1<number, string>(second, 1);

    expect(() => commitPreparedAutoSaveAnchorInternalV1({} as never)).toThrow(TypeError);
    expect(() => commitPreparedAutoSaveAnchorInternalV1({ ...plan.prepared } as never)).toThrow(
      TypeError,
    );
    expect(() => commitPreparedAutoSaveAnchorInternalV1(plan.prepared)).not.toThrow();
    expect(() => commitPreparedAutoSaveAnchorInternalV1(stale.prepared)).toThrow(TypeError);
    expect(() => commitPreparedAutoSaveAnchorInternalV1(plan.prepared)).toThrow(TypeError);
    expect(first.anchorEpoch()).toBe(1);
    expect(() => commitPreparedAutoSaveAnchorInternalV1(independent.prepared)).not.toThrow();
    expect(second.anchorEpoch()).toBe(1);
  });

  it("defers pending settlement and repair I/O until prepared-anchor post-commit", async () => {
    const running = deferredV1<string>();
    const written: number[] = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        written.push(candidate);
        return candidate === 1 ? running.promise : Promise.resolve(`saved:${candidate}`);
      },
    });
    queue.enqueue(1);
    let pendingSettled = false;
    const pending = enqueueAutoSaveWithReceiptInternalV1<number, string>(queue, 2).then(
      (receipt) => {
        pendingSettled = true;
        return receipt;
      },
    );
    const plan = prepareAutoSaveAnchorWithReceiptInternalV1<number, string>(queue, 7);

    commitPreparedAutoSaveAnchorInternalV1(plan.prepared);
    await flushV1();
    expect(written).toEqual([1]);
    expect(pendingSettled).toBe(false);

    runPreparedAutoSaveAnchorPostCommitInternalV1(plan.prepared);
    await expect(pending).resolves.toEqual({ kind: "superseded" });
    expect(written).toEqual([1]);

    running.resolve("saved:1");
    await expect(plan.receipt).resolves.toEqual({ kind: "fulfilled", result: "saved:7" });
    await queue.idle();
    expect(written).toEqual([1, 7]);
  });

  it("invalidates a prepared anchor created reentrantly by a settlement callback", async () => {
    let prepared:
      | ReturnType<typeof prepareAutoSaveAnchorWithReceiptInternalV1<number, string>>
      | undefined;
    let queue!: ReturnType<typeof createAutoSaveQueueV1<number, string>>;
    queue = createAutoSaveQueueV1<number, string>({
      write: (candidate) => Promise.resolve(`saved:${candidate}`),
      onCurrentResult(candidate) {
        if (candidate === 1) {
          prepared = prepareAutoSaveAnchorWithReceiptInternalV1<number, string>(queue, 7);
        }
      },
    });

    queue.enqueue(1);
    await queue.idle();
    if (prepared === undefined) throw new TypeError("missing reentrant prepared anchor");
    const reentrantPlan = prepared;
    expect(() => commitPreparedAutoSaveAnchorInternalV1(reentrantPlan.prepared)).toThrow(TypeError);
    expect(queue.anchorEpoch()).toBe(0);
  });

  it("does not start a displaced repair when the queue changes between commit and post-commit", async () => {
    const latest = deferredV1<string>();
    const written: number[] = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        written.push(candidate);
        if (candidate === 0) return Promise.resolve("failed");
        if (candidate === 9) return latest.promise;
        return Promise.resolve(`saved:${candidate}`);
      },
      isSuccessfulResult: (result) => result !== "failed",
    });
    queue.enqueue(1);
    queue.establishAnchor(0);
    await flushV1();
    await flushV1();
    expect(written).toEqual([1, 0]);
    expect(queue.isIdle()).toBe(false);

    const plan = prepareAutoSaveAnchorWithReceiptInternalV1<number, string>(queue, 7);
    commitPreparedAutoSaveAnchorInternalV1(plan.prepared);
    queue.enqueue(9);
    runPreparedAutoSaveAnchorPostCommitInternalV1(plan.prepared);

    await expect(plan.receipt).resolves.toEqual({ kind: "superseded" });
    expect(written).toEqual([1, 0, 9]);
    latest.resolve("saved:9");
    await queue.idle();
    expect(written).toEqual([1, 0, 9]);
  });
  it("coalesces only candidates that have not started", async () => {
    const first = deferredV1<string>();
    const written: number[] = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        written.push(candidate);
        return candidate === 1 ? first.promise : Promise.resolve(`saved:${candidate}`);
      },
    });

    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    expect(written).toEqual([1]);

    first.resolve("saved:1");
    await queue.idle();

    expect(written).toEqual([1, 3]);
  });

  it("repairs a blocked old-epoch write with the latest anchor", async () => {
    const oldWrite = deferredV1<string>();
    const written: number[] = [];
    const visible: Array<readonly [number, string]> = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        written.push(candidate);
        return candidate === 3 ? oldWrite.promise : Promise.resolve(`saved:${candidate}`);
      },
      onCurrentResult(candidate, result) {
        visible.push([candidate, result]);
      },
    });

    queue.enqueue(3);
    queue.establishAnchor(0);
    expect(queue.anchorEpoch()).toBe(1);
    queue.establishAnchor(7);
    expect(queue.anchorEpoch()).toBe(2);
    oldWrite.resolve("saved:3");
    await queue.idle();

    expect(written).toEqual([3, 7]);
    expect(visible).toEqual([[7, "saved:7"]]);
  });

  it("drops old-epoch pending candidates before the anchor repair", async () => {
    const oldWrite = deferredV1<string>();
    const written: number[] = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        written.push(candidate);
        return candidate === 1 ? oldWrite.promise : Promise.resolve(`saved:${candidate}`);
      },
    });

    queue.enqueue(1);
    queue.enqueue(2);
    queue.establishAnchor(0);
    oldWrite.resolve("saved:1");
    await queue.idle();

    expect(written).toEqual([1, 0]);
  });

  it("does not resolve idle until a required repair finishes", async () => {
    const oldWrite = deferredV1<string>();
    const repairWrite = deferredV1<string>();
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        return candidate === 4 ? oldWrite.promise : repairWrite.promise;
      },
    });

    queue.enqueue(4);
    queue.establishAnchor(0);
    let idle = false;
    const idlePromise = queue.idle().then(() => {
      idle = true;
    });

    oldWrite.resolve("saved:4");
    await flushV1();
    expect(idle).toBe(false);

    repairWrite.resolve("saved:0");
    await idlePromise;
    expect(idle).toBe(true);
  });

  it("keeps a rejected repair non-idle until a later current-epoch candidate succeeds", async () => {
    type ResultV1 =
      | { readonly kind: "saved"; readonly sequence: number }
      | { readonly kind: "rejected"; readonly code: "conflict" };

    const oldWrite = deferredV1<ResultV1>();
    const repairAttempted = deferredV1<void>();
    const written: number[] = [];
    let currentSequence: number | null = null;
    const queue = createAutoSaveQueueV1<number, ResultV1>({
      async write(candidate) {
        written.push(candidate);
        if (candidate === 3) {
          const result = await oldWrite.promise;
          currentSequence = candidate;
          return result;
        }
        if (candidate === 0) {
          repairAttempted.resolve();
          return Object.freeze({
            kind: "rejected" as const,
            code: "conflict" as const,
          });
        }
        currentSequence = candidate;
        return Object.freeze({ kind: "saved" as const, sequence: candidate });
      },
      isSuccessfulResult(result) {
        return result.kind === "saved";
      },
    });

    queue.enqueue(3);
    queue.establishAnchor(0);
    let idle = false;
    const idlePromise = queue.idle().then(() => {
      idle = true;
    });

    oldWrite.resolve(Object.freeze({ kind: "saved", sequence: 3 }));
    await repairAttempted.promise;
    await flushV1();
    expect(currentSequence).toBe(3);
    expect(queue.isIdle()).toBe(false);
    expect(idle).toBe(false);

    queue.enqueue(7);
    await idlePromise;
    expect(written).toEqual([3, 0, 7]);
    expect(currentSequence).toBe(7);
    expect(queue.isIdle()).toBe(true);
    expect(idle).toBe(true);
  });

  it("settles an exact failed attempt without waiting for queue idle and permits retry", async () => {
    type ResultV1 =
      | { readonly kind: "saved"; readonly sequence: number }
      | { readonly kind: "rejected"; readonly code: "unavailable" };

    const oldWrite = deferredV1<ResultV1>();
    const failedRepair = deferredV1<void>();
    let exactAttempt = false;
    const written: number[] = [];
    const queue = createAutoSaveQueueV1<number, ResultV1>({
      async write(candidate): Promise<ResultV1> {
        written.push(candidate);
        if (candidate === 1) return await oldWrite.promise;
        if (!exactAttempt) {
          failedRepair.resolve();
          return Object.freeze({
            kind: "rejected" as const,
            code: "unavailable" as const,
          });
        }
        return Object.freeze({ kind: "saved" as const, sequence: candidate });
      },
      isSuccessfulResult(result) {
        return result.kind === "saved";
      },
    });

    queue.enqueue(1);
    queue.establishAnchor(4);
    oldWrite.resolve(Object.freeze({ kind: "saved", sequence: 1 }));
    await failedRepair.promise;
    expect(queue.isIdle()).toBe(false);

    await expect(enqueueAutoSaveWithReceiptInternalV1(queue, 4)).resolves.toEqual({
      kind: "fulfilled",
      result: { kind: "rejected", code: "unavailable" },
    });
    expect(queue.isIdle()).toBe(false);

    exactAttempt = true;
    await expect(enqueueAutoSaveWithReceiptInternalV1(queue, 4)).resolves.toEqual({
      kind: "fulfilled",
      result: { kind: "saved", sequence: 4 },
    });
    expect(written).toEqual([1, 4, 4, 4]);
    expect(queue.isIdle()).toBe(true);
  });

  it("marks exact pending and old-epoch attempts superseded", async () => {
    const first = deferredV1<string>();
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        return candidate === 1 ? first.promise : Promise.resolve(`saved:${candidate}`);
      },
    });

    queue.enqueue(1);
    const replaced = enqueueAutoSaveWithReceiptInternalV1(queue, 2);
    queue.enqueue(3);
    await expect(replaced).resolves.toEqual({ kind: "superseded" });

    const stale = enqueueAutoSaveWithReceiptInternalV1(queue, 4);
    queue.establishAnchor(0);
    first.resolve("saved:1");
    await expect(stale).resolves.toEqual({ kind: "superseded" });
    await queue.idle();
  });

  it("never acknowledges a physically fulfilled old-epoch exact attempt", async () => {
    const oldWrite = deferredV1<string>();
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        return candidate === 1 ? oldWrite.promise : Promise.resolve(`saved:${candidate}`);
      },
    });

    const exactOldEpoch = enqueueAutoSaveWithReceiptInternalV1(queue, 1);
    queue.establishAnchor(0);
    oldWrite.resolve("saved:1");

    await expect(exactOldEpoch).resolves.toEqual({ kind: "superseded" });
    await queue.idle();
  });

  it.each(["result", "success"] as const)(
    "rechecks the exact receipt epoch after a synchronous %s callback",
    async (callback) => {
      const written: number[] = [];
      let queue!: ReturnType<typeof createAutoSaveQueueV1<number, string>>;
      queue = createAutoSaveQueueV1<number, string>({
        async write(candidate) {
          written.push(candidate);
          return `saved:${candidate}`;
        },
        onCurrentResult(candidate) {
          if (callback === "result" && candidate === 1) queue.establishAnchor(0);
        },
        isSuccessfulResult(result) {
          if (callback === "success" && result === "saved:1") queue.establishAnchor(0);
          return true;
        },
      });

      const exactOldEpoch = enqueueAutoSaveWithReceiptInternalV1(queue, 1);

      await expect(exactOldEpoch).resolves.toEqual({ kind: "superseded" });
      await queue.idle();
      expect(written).toEqual([1, 0]);
    },
  );

  it("exposes the required anchor repair as the exact current receipt", async () => {
    const oldWrite = deferredV1<string>();
    const written: number[] = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        written.push(candidate);
        return candidate === 1 ? oldWrite.promise : Promise.resolve(`saved:${candidate}`);
      },
    });

    queue.enqueue(1);
    const repair = establishAutoSaveAnchorWithReceiptInternalV1(queue, 0);
    oldWrite.resolve("saved:1");

    await expect(repair).resolves.toEqual({
      kind: "fulfilled",
      result: "saved:0",
    });
    await queue.idle();
    expect(written).toEqual([1, 0]);
  });

  it("isolates a rejected write and keeps the tail usable", async () => {
    const failure = new Error("storage rejected");
    const failures: unknown[] = [];
    const visible: Array<readonly [number, string]> = [];
    const written: number[] = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write(candidate) {
        written.push(candidate);
        return candidate === 1 ? Promise.reject(failure) : Promise.resolve(`saved:${candidate}`);
      },
      onFailure(error) {
        failures.push(error);
      },
      onCurrentResult(candidate, result) {
        visible.push([candidate, result]);
      },
    });

    queue.enqueue(1);
    queue.enqueue(2);
    await queue.idle();

    expect(written).toEqual([1, 2]);
    expect(failures).toEqual([failure]);
    expect(visible).toEqual([[2, "saved:2"]]);
  });

  it("isolates callback failures and accepts later work", async () => {
    const callbackFailure = new Error("result callback failed");
    const onFailure = vi.fn(() => {
      throw new Error("failure callback failed");
    });
    const queue = createAutoSaveQueueV1<number, string>({
      write: async (candidate) => `saved:${candidate}`,
      onCurrentResult() {
        throw callbackFailure;
      },
      onFailure,
    });

    queue.enqueue(1);
    await queue.idle();
    queue.enqueue(2);
    await queue.idle();

    expect(onFailure).toHaveBeenCalledTimes(2);
    expect(onFailure).toHaveBeenNthCalledWith(1, callbackFailure);
  });

  it("isolates a throwing success predicate without poisoning the tail", async () => {
    const predicateFailure = new Error("success predicate failed");
    const failures: unknown[] = [];
    const queue = createAutoSaveQueueV1<number, string>({
      write: async (candidate) => `saved:${candidate}`,
      isSuccessfulResult() {
        throw predicateFailure;
      },
      onFailure(error) {
        failures.push(error);
      },
    });

    queue.enqueue(1);
    await queue.idle();
    queue.enqueue(2);
    await queue.idle();

    expect(failures).toEqual([predicateFailure, predicateFailure]);
  });
});
