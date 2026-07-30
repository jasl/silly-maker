// SPDX-License-Identifier: MIT
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
        result.kind === "committed" ? result.records.map((record) => record.revision) : [],
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
});
