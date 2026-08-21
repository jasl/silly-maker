// SPDX-License-Identifier: MIT
import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

import {
  createInstrumentedRecordFileStoreInternalV1,
  createRecordFileStoreV1,
  type RecordFileStorePhaseInternalV1,
} from "./record-file-store.mts";

const execFileAsyncV1 = promisify(execFile);
let cleanupDirV1: string | null = null;

afterEach(async () => {
  if (cleanupDirV1 !== null) {
    await rm(cleanupDirV1, { recursive: true, force: true });
  }
  cleanupDirV1 = null;
});

async function fixtureV1(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sillymaker-record-fault-"));
  cleanupDirV1 = root;
  return root;
}

function createPrecheckGateV1(): {
  readonly reached: (point: RecordFileStorePhaseInternalV1) => Promise<void>;
  readonly arrived: Promise<void>;
  readonly release: () => void;
} {
  let resolveArrived: (() => void) | undefined;
  let resolveRelease: (() => void) | undefined;
  const arrived = new Promise<void>((resolve) => {
    resolveArrived = resolve;
  });
  const released = new Promise<void>((resolve) => {
    resolveRelease = resolve;
  });
  return Object.freeze({
    async reached(point) {
      if (point.kind !== "between_checks_and_writes") return;
      resolveArrived?.();
      await released;
    },
    arrived,
    release: () => resolveRelease?.(),
  });
}

async function seedPartialPairV1(root: string): Promise<void> {
  await createRecordFileStoreV1(root).commit([
    {
      kind: "put",
      namespace: "save",
      key: "fault.partial.left",
      expectedRevision: null,
      bytesBase64: "b2xkLWxlZnQ=",
    },
    {
      kind: "put",
      namespace: "save",
      key: "fault.partial.right",
      expectedRevision: null,
      bytesBase64: "b2xkLXJpZ2h0",
    },
  ]);
}

async function runFaultChildV1(root: string): Promise<{
  readonly code: number;
  readonly stderr: string;
}> {
  const args = [
    "run",
    "--quiet",
    // Keeps the child deno from re-materializing workspace node_modules
    // symlinks (racing concurrent realpath walks in the parallel suite);
    // the fixture only imports relative files and node builtins.
    "--node-modules-dir=none",
    "--allow-read",
    "--allow-write",
    fileURLToPath(new URL("./record-file-store-fault-child.fixture.mts", import.meta.url)),
    root,
  ];
  try {
    const result = await execFileAsyncV1(process.execPath, args, {
      encoding: "utf8",
      timeout: 10_000,
      killSignal: "SIGKILL",
    });
    return Object.freeze({ code: 0, stderr: result.stderr });
  } catch (error) {
    if (typeof error !== "object" || error === null) throw error;
    const code = Reflect.get(error, "code");
    const stderr = Reflect.get(error, "stderr");
    if (typeof code !== "number" || typeof stderr !== "string") throw error;
    return Object.freeze({ code, stderr });
  }
}

async function requirePrecheckArrivalV1(
  arrived: Promise<void>,
  commit: Promise<unknown>,
): Promise<void> {
  const earlySettlement = commit.then(
    () => {
      throw new TypeError("desktop record commit settled before its precheck gate");
    },
    (error: unknown) => {
      throw error;
    },
  );
  await Promise.race([arrived, earlySettlement]);
}

interface ProcessCasChildV1 {
  readonly processId: number;
  readonly ready: Promise<void>;
  readonly completion: Promise<unknown>;
  readonly exited: Promise<void>;
  readonly release: () => Promise<void>;
  readonly terminate: () => void;
}

function spawnProcessCasChildV1(root: string, bytesBase64: string): ProcessCasChildV1 {
  const args = [
    "run",
    "--quiet",
    // See runFaultChildV1: no node_modules re-materialization in children.
    "--node-modules-dir=none",
    "--allow-read",
    "--allow-write",
    fileURLToPath(new URL("./record-file-store-cas-child.fixture.mts", import.meta.url)),
    root,
    bytesBase64,
  ];
  const child = spawn(process.execPath, args, {
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 20_000,
    killSignal: "SIGKILL",
  });

  let resolveReadyV1: (() => void) | undefined;
  let rejectReadyV1: ((error: unknown) => void) | undefined;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReadyV1 = resolve;
    rejectReadyV1 = reject;
  });
  let resolveCompletionV1: ((result: unknown) => void) | undefined;
  let rejectCompletionV1: ((error: unknown) => void) | undefined;
  const completion = new Promise<unknown>((resolve, reject) => {
    resolveCompletionV1 = resolve;
    rejectCompletionV1 = reject;
  });
  let resolveExitedV1: (() => void) | undefined;
  const exited = new Promise<void>((resolve) => {
    resolveExitedV1 = resolve;
  });
  void ready.catch(() => undefined);
  void completion.catch(() => undefined);

  let readySeenV1 = false;
  let resultSeenV1 = false;
  let resultV1: unknown;
  let stderrV1 = "";
  let closedV1 = false;
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderrV1 += chunk;
  });
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    if (line === "ready") {
      readySeenV1 = true;
      resolveReadyV1?.();
      return;
    }
    if (resultSeenV1) {
      rejectCompletionV1?.(
        new TypeError(`desktop record CAS child emitted an extra line: ${line}`),
      );
      return;
    }
    try {
      resultV1 = JSON.parse(line) as unknown;
      resultSeenV1 = true;
    } catch (error) {
      rejectCompletionV1?.(
        new TypeError(`desktop record CAS child emitted invalid JSON: ${line}`, {
          cause: error,
        }),
      );
    }
  });
  child.on("error", (error) => {
    rejectReadyV1?.(error);
    rejectCompletionV1?.(error);
  });
  child.on("close", (code, signal) => {
    closedV1 = true;
    resolveExitedV1?.();
    if (!readySeenV1) {
      rejectReadyV1?.(
        new TypeError(
          `desktop record CAS child exited before its precheck gate: code=${code} signal=${signal}`,
        ),
      );
    }
    if (code !== 0 || !resultSeenV1) {
      rejectCompletionV1?.(
        new TypeError(
          `desktop record CAS child failed: code=${code} signal=${signal} stderr=${stderrV1.trim()}`,
        ),
      );
      return;
    }
    resolveCompletionV1?.(resultV1);
  });

  return Object.freeze({
    get processId() {
      if (child.pid === undefined) {
        throw new TypeError("desktop record CAS child has no process id after ready");
      }
      return child.pid;
    },
    ready,
    completion,
    exited,
    release: () =>
      new Promise<void>((resolve, reject) => {
        const onErrorV1 = (error: Error) => reject(error);
        child.stdin.once("error", onErrorV1);
        child.stdin.end("release\n", () => {
          child.stdin.off("error", onErrorV1);
          resolve();
        });
      }),
    terminate: () => {
      if (!child.stdin.destroyed) child.stdin.destroy();
      if (!closedV1) child.kill("SIGKILL");
    },
  });
}

async function requireProcessPrecheckArrivalV1(child: ProcessCasChildV1): Promise<void> {
  const earlySettlement = child.completion.then(
    () => {
      throw new TypeError("desktop record CAS child settled before its precheck gate");
    },
    (error: unknown) => {
      throw error;
    },
  );
  await Promise.race([child.ready, earlySettlement]);
}

interface SigkillFaultChildV1 {
  readonly processId: number;
  readonly ready: Promise<void>;
  readonly closed: Promise<{
    readonly code: number | null;
    readonly signal: string | null;
    readonly stdoutLines: readonly string[];
    readonly stderr: string;
    readonly watchdogFired: boolean;
  }>;
  readonly killWithSigkill: () => void;
  readonly terminate: () => void;
}

function spawnSigkillFaultChildV1(root: string): SigkillFaultChildV1 {
  const args = [
    "run",
    "--quiet",
    "--allow-read",
    "--allow-write",
    fileURLToPath(new URL("./record-file-store-sigkill-child.fixture.mts", import.meta.url)),
    root,
  ];
  const child = spawn(process.execPath, args, {
    stdio: ["pipe", "pipe", "pipe"],
  });
  let watchdogFiredV1 = false;
  const watchdogV1 = setTimeout(() => {
    watchdogFiredV1 = true;
    child.kill("SIGKILL");
  }, 20_000);

  let resolveReadyV1: (() => void) | undefined;
  let rejectReadyV1: ((error: unknown) => void) | undefined;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReadyV1 = resolve;
    rejectReadyV1 = reject;
  });
  let resolveClosedV1: ((result: Awaited<SigkillFaultChildV1["closed"]>) => void) | undefined;
  const closed = new Promise<Awaited<SigkillFaultChildV1["closed"]>>((resolve) => {
    resolveClosedV1 = resolve;
  });
  void ready.catch(() => undefined);

  let readySeenV1 = false;
  let closedV1 = false;
  let stderrV1 = "";
  const stdoutLinesV1: string[] = [];
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderrV1 += chunk;
  });
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    stdoutLinesV1.push(line);
    if (!readySeenV1 && line === "ready") {
      readySeenV1 = true;
      resolveReadyV1?.();
      return;
    }
    rejectReadyV1?.(
      new TypeError(`desktop record SIGKILL child emitted an unexpected line: ${line}`),
    );
  });
  child.on("error", (error) => {
    rejectReadyV1?.(error);
  });
  child.on("close", (code, signal) => {
    closedV1 = true;
    clearTimeout(watchdogV1);
    if (!readySeenV1) {
      rejectReadyV1?.(
        new TypeError(
          `desktop record SIGKILL child exited before its mutation gate: code=${code} signal=${signal} stderr=${stderrV1.trim()}`,
        ),
      );
    }
    resolveClosedV1?.(
      Object.freeze({
        code,
        signal,
        stdoutLines: Object.freeze([...stdoutLinesV1]),
        stderr: stderrV1,
        watchdogFired: watchdogFiredV1,
      }),
    );
  });

  return Object.freeze({
    get processId() {
      if (child.pid === undefined) {
        throw new TypeError("desktop record SIGKILL child has no process id after ready");
      }
      return child.pid;
    },
    ready,
    closed,
    killWithSigkill: () => {
      if (!child.kill("SIGKILL")) {
        throw new TypeError("desktop record SIGKILL child could not be terminated");
      }
    },
    terminate: () => {
      if (!child.stdin.destroyed) child.stdin.destroy();
      if (!closedV1) child.kill("SIGKILL");
    },
  });
}

describe("desktop file-preview deterministic fault characterization", () => {
  it("exposes cross-handle CAS without relying on scheduler timing", async () => {
    const root = await fixtureV1();
    const leftGate = createPrecheckGateV1();
    const rightGate = createPrecheckGateV1();
    const left = createInstrumentedRecordFileStoreInternalV1(root, leftGate);
    const right = createInstrumentedRecordFileStoreInternalV1(root, rightGate);

    const leftCommit = left.commit([
      {
        kind: "put",
        namespace: "lease",
        key: "fault.concurrent",
        expectedRevision: null,
        bytesBase64: "bGVmdA==",
      },
    ]);
    const rightCommit = right.commit([
      {
        kind: "put",
        namespace: "lease",
        key: "fault.concurrent",
        expectedRevision: null,
        bytesBase64: "cmlnaHQ=",
      },
    ]);
    const results = await (async () => {
      try {
        await Promise.all([
          requirePrecheckArrivalV1(leftGate.arrived, leftCommit),
          requirePrecheckArrivalV1(rightGate.arrived, rightCommit),
        ]);
        leftGate.release();
        const leftResult = await leftCommit;
        rightGate.release();
        const rightResult = await rightCommit;
        return [leftResult, rightResult] as const;
      } finally {
        leftGate.release();
        rightGate.release();
        await Promise.allSettled([leftCommit, rightCommit]);
      }
    })();
    expect(results.map((result) => result.kind)).toEqual(["committed", "committed"]);
    expect(
      results.flatMap((result) =>
        result.kind === "committed" ? result.records.map((record) => record.revision) : []
      ),
    ).toEqual([1, 1]);

    const stored = await createRecordFileStoreV1(root).read("lease", "fault.concurrent");
    expect(stored).toMatchObject({ revision: 1, bytesBase64: "cmlnaHQ=" });
  });

  it("keeps ordinary injected failures on the existing rollback path", async () => {
    const root = await fixtureV1();
    await seedPartialPairV1(root);
    const phases: RecordFileStorePhaseInternalV1[] = [];
    const store = createInstrumentedRecordFileStoreInternalV1(root, {
      reached(point) {
        phases.push(point);
        if (point.kind === "between_mutations") {
          throw new Error("injected ordinary write failure");
        }
      },
    });

    await expect(
      store.commit([
        {
          kind: "put",
          namespace: "save",
          key: "fault.partial.left",
          expectedRevision: 1,
          bytesBase64: "bmV3LWxlZnQ=",
        },
        {
          kind: "put",
          namespace: "save",
          key: "fault.partial.right",
          expectedRevision: 1,
          bytesBase64: "bmV3LXJpZ2h0",
        },
      ]),
    ).rejects.toThrow("injected ordinary write failure");

    expect(phases).toEqual([
      { kind: "between_checks_and_writes" },
      { kind: "between_mutations", completedMutationCount: 1, remainingMutationCount: 1 },
    ]);
    expect(phases.every(Object.isFrozen)).toBe(true);
    const reopened = createRecordFileStoreV1(root);
    expect(await reopened.read("save", "fault.partial.left")).toMatchObject({
      revision: 1,
      bytesBase64: "b2xkLWxlZnQ=",
    });
    expect(await reopened.read("save", "fault.partial.right")).toMatchObject({
      revision: 1,
      bytesBase64: "b2xkLXJpZ2h0",
    });
  });

  it("keeps a prewrite injected failure at zero mutations", async () => {
    const root = await fixtureV1();
    await seedPartialPairV1(root);
    const phases: RecordFileStorePhaseInternalV1[] = [];
    const store = createInstrumentedRecordFileStoreInternalV1(root, {
      reached(point) {
        phases.push(point);
        if (point.kind === "between_checks_and_writes") {
          throw new Error("injected prewrite failure");
        }
      },
    });

    await expect(
      store.commit([
        {
          kind: "put",
          namespace: "save",
          key: "fault.partial.left",
          expectedRevision: 1,
          bytesBase64: "bmV3LWxlZnQ=",
        },
        {
          kind: "put",
          namespace: "save",
          key: "fault.partial.right",
          expectedRevision: 1,
          bytesBase64: "bmV3LXJpZ2h0",
        },
      ]),
    ).rejects.toThrow("injected prewrite failure");

    expect(phases).toEqual([{ kind: "between_checks_and_writes" }]);
    expect(phases.every(Object.isFrozen)).toBe(true);
    const reopened = createRecordFileStoreV1(root);
    expect(await reopened.read("save", "fault.partial.left")).toEqual({
      namespace: "save",
      key: "fault.partial.left",
      revision: 1,
      bytesBase64: "b2xkLWxlZnQ=",
    });
    expect(await reopened.read("save", "fault.partial.right")).toEqual({
      namespace: "save",
      key: "fault.partial.right",
      revision: 1,
      bytesBase64: "b2xkLXJpZ2h0",
    });
  });

  it("reopens the partial batch left by a child exit after mutation one", async () => {
    const root = await fixtureV1();
    await seedPartialPairV1(root);

    const child = await runFaultChildV1(root);
    if (child.code !== 86) {
      throw new TypeError(
        `desktop record fault child exited with ${child.code}: ${child.stderr.trim()}`,
      );
    }

    const reopened = createRecordFileStoreV1(root);
    expect(await reopened.read("save", "fault.partial.left")).toMatchObject({
      revision: 2,
      bytesBase64: "bmV3LWxlZnQ=",
    });
    expect(await reopened.read("save", "fault.partial.right")).toMatchObject({
      revision: 1,
      bytesBase64: "b2xkLXJpZ2h0",
    });
  }, 30_000);

  it.skipIf(process.platform === "win32")(
    "reopens the partial batch left by SIGKILL after mutation one",
    async () => {
      const root = await fixtureV1();
      await seedPartialPairV1(root);
      const child = spawnSigkillFaultChildV1(root);

      try {
        await child.ready;
        expect(child.processId).not.toBe(process.pid);
        child.killWithSigkill();
        expect(await child.closed).toEqual({
          code: null,
          signal: "SIGKILL",
          stdoutLines: ["ready"],
          stderr: "",
          watchdogFired: false,
        });

        const reopened = createRecordFileStoreV1(root);
        expect(await reopened.read("save", "fault.partial.left")).toEqual({
          namespace: "save",
          key: "fault.partial.left",
          revision: 2,
          bytesBase64: "bmV3LWxlZnQ=",
        });
        expect(await reopened.read("save", "fault.partial.right")).toEqual({
          namespace: "save",
          key: "fault.partial.right",
          revision: 1,
          bytesBase64: "b2xkLXJpZ2h0",
        });
      } finally {
        child.terminate();
        await child.closed;
      }
    },
    40_000,
  );

  it("exposes independent OS-process CAS without relying on scheduler timing", async () => {
    const root = await fixtureV1();
    let left: ProcessCasChildV1 | undefined;
    let right: ProcessCasChildV1 | undefined;

    try {
      left = spawnProcessCasChildV1(root, "bGVmdA==");
      right = spawnProcessCasChildV1(root, "cmlnaHQ=");
      await Promise.all([
        requireProcessPrecheckArrivalV1(left),
        requireProcessPrecheckArrivalV1(right),
      ]);
      expect(new Set([process.pid, left.processId, right.processId]).size).toBe(3);

      await left.release();
      const leftResult = await left.completion;
      expect(await createRecordFileStoreV1(root).read("lease", "fault.process-concurrent")).toEqual(
        {
          namespace: "lease",
          key: "fault.process-concurrent",
          revision: 1,
          bytesBase64: "bGVmdA==",
        },
      );
      await right.release();
      const rightResult = await right.completion;

      expect(leftResult).toEqual({
        kind: "committed",
        records: [
          {
            namespace: "lease",
            key: "fault.process-concurrent",
            revision: 1,
            bytesBase64: "bGVmdA==",
          },
        ],
      });
      expect(rightResult).toEqual({
        kind: "committed",
        records: [
          {
            namespace: "lease",
            key: "fault.process-concurrent",
            revision: 1,
            bytesBase64: "cmlnaHQ=",
          },
        ],
      });
      expect(await createRecordFileStoreV1(root).read("lease", "fault.process-concurrent")).toEqual(
        {
          namespace: "lease",
          key: "fault.process-concurrent",
          revision: 1,
          bytesBase64: "cmlnaHQ=",
        },
      );
    } finally {
      left?.terminate();
      right?.terminate();
      await Promise.all([left?.exited ?? Promise.resolve(), right?.exited ?? Promise.resolve()]);
    }
  }, 40_000);
});
