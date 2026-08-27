// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  BrowserWorkspaceHostControlErrorV1,
  createBrowserWorkspaceHostPagePortV1,
} from "../workspace/browser-workspace-host-port.ts";
import type {
  BrowserWorkspaceHostExclusiveLeaseV1,
  BrowserWorkspaceHostExclusiveLockPortV1,
} from "../workspace/browser-workspace-host-opfs.ts";

type WorkerListenerV1 = (event: Readonly<{ data: unknown }>) => void;
type WorkerFailureListenerV1 = (event: Event) => void;

class FakeWorkerV1 {
  readonly listeners = new Set<WorkerListenerV1>();
  readonly failureListeners = new Map<"error" | "messageerror", Set<WorkerFailureListenerV1>>([
    ["error", new Set()],
    ["messageerror", new Set()],
  ]);
  readonly methods: string[] = [];
  readonly dropMethods = new Set<string>();
  terminated = false;

  postMessage(message: unknown): void {
    const request = message as {
      readonly requestId: number;
      readonly record: Readonly<Record<string, unknown>>;
    };
    const anchor = {
      revision: 1,
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
      volumeId: "volume.preview.1",
      workspaceFormat: 1,
    } as const;
    const descriptor = {
      revision: 1,
      programId: anchor.programId,
      workspaceId: anchor.workspaceId,
      workspaceSessionId: "workspace-session.preview.1",
      generation: 1,
    } as const;
    const method = request.record.method;
    if (typeof method !== "string") throw new Error("expected method");
    this.methods.push(method);
    if (this.dropMethods.has(method)) return;
    const response = method === "create_candidate"
      ? { method, anchor }
      : method === "discard_candidate"
      ? { method, volumeId: anchor.volumeId }
      : {
        method,
        snapshot: {
          revision: 1,
          phase: method === "close_workspace" ? "closed" : "open",
          volumeId: anchor.volumeId,
          checkpointId: "checkpoint.preview.1",
          descriptor,
          anchor,
        },
      };
    queueMicrotask(() => {
      for (const listener of this.listeners) {
        listener({
          data: {
            revision: 1,
            kind: "control_response",
            requestId: request.requestId,
            ok: true,
            response,
          },
        });
      }
    });
  }

  addEventListener(type: "message", listener: WorkerListenerV1): void;
  addEventListener(type: "error" | "messageerror", listener: WorkerFailureListenerV1): void;
  addEventListener(
    type: "message" | "error" | "messageerror",
    listener: WorkerListenerV1 | WorkerFailureListenerV1,
  ): void {
    if (type === "message") this.listeners.add(listener as WorkerListenerV1);
    else this.failureListeners.get(type)?.add(listener as WorkerFailureListenerV1);
  }

  removeEventListener(type: "message", listener: WorkerListenerV1): void;
  removeEventListener(type: "error" | "messageerror", listener: WorkerFailureListenerV1): void;
  removeEventListener(
    type: "message" | "error" | "messageerror",
    listener: WorkerListenerV1 | WorkerFailureListenerV1,
  ): void {
    if (type === "message") this.listeners.delete(listener as WorkerListenerV1);
    else this.failureListeners.get(type)?.delete(listener as WorkerFailureListenerV1);
  }

  terminate(): void {
    this.terminated = true;
  }

  fail(type: "error" | "messageerror"): void {
    const event = new Event(type, { cancelable: true });
    for (const listener of this.failureListeners.get(type) ?? []) listener(event);
  }
}

class FakeBootstrapLockPortV1 implements BrowserWorkspaceHostExclusiveLockPortV1 {
  active = false;
  acquisitions = 0;
  releases = 0;

  async acquire(): Promise<BrowserWorkspaceHostExclusiveLeaseV1> {
    this.active = true;
    this.acquisitions += 1;
    return {
      release: async () => {
        this.active = false;
        this.releases += 1;
      },
    };
  }
}

describe("SillyOS Browser Workspace Host page port", () => {
  it("holds the exact page bootstrap lease across candidate creation, external CAS work, and open", async () => {
    const worker = new FakeWorkerV1();
    const lockPort = new FakeBootstrapLockPortV1();
    const port = createBrowserWorkspaceHostPagePortV1({ worker, bootstrapLockPort: lockPort });

    await expect(
      port.createCandidate({
        programId: "program.preview.1",
        workspaceId: "workspace.preview.1",
      }),
    ).rejects.toMatchObject(
      {
        code: "candidate_mismatch",
      } satisfies Partial<BrowserWorkspaceHostControlErrorV1>,
    );

    await port.withBootstrapLease({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
      operation: async () => {
        expect(lockPort.active).toBe(true);
        const anchor = await port.createCandidate({
          programId: "program.preview.1",
          workspaceId: "workspace.preview.1",
        });
        await Promise.resolve(); // The caller's Program Repository CAS belongs here.
        expect(lockPort.active).toBe(true);
        await expect(port.openWorkspace(anchor)).resolves.toMatchObject({
          checkpointId: "checkpoint.preview.1",
          descriptor: { generation: 1 },
        });
        expect(lockPort.active).toBe(true);
      },
    });

    expect(lockPort).toMatchObject({ active: false, acquisitions: 1, releases: 1 });
    port.dispose();
    expect(worker.terminated).toBe(true);
  });

  it("bounds lost mutation outcomes and distinguishes a lost query without deleting a candidate", async () => {
    const candidateWorker = new FakeWorkerV1();
    candidateWorker.dropMethods.add("create_candidate");
    const candidatePort = createBrowserWorkspaceHostPagePortV1({
      worker: candidateWorker,
      bootstrapLockPort: new FakeBootstrapLockPortV1(),
    });
    const candidate = candidatePort.withBootstrapLease({
      programId: "program.preview.1",
      workspaceId: "workspace.preview.1",
      operation: () =>
        candidatePort.createCandidate({
          programId: "program.preview.1",
          workspaceId: "workspace.preview.1",
        }),
    });
    await Promise.resolve();
    candidateWorker.fail("error");
    await expect(candidate).rejects.toMatchObject({ code: "outcome_unknown" });
    expect(candidateWorker.methods).toEqual(["create_candidate"]);
    expect(candidateWorker.methods).not.toContain("discard_candidate");
    expect(candidateWorker.terminated).toBe(true);

    for (
      const [method, expectedCode] of [
        ["open_workspace", "outcome_unknown"],
        ["close_workspace", "outcome_unknown"],
        ["query_workspace", "unavailable"],
      ] as const
    ) {
      const worker = new FakeWorkerV1();
      worker.dropMethods.add(method);
      const port = createBrowserWorkspaceHostPagePortV1({
        worker,
        bootstrapLockPort: new FakeBootstrapLockPortV1(),
      });
      const pending = method === "open_workspace"
        ? port.openWorkspace({
          revision: 1,
          programId: "program.preview.1",
          workspaceId: "workspace.preview.1",
          volumeId: "volume.preview.1",
          workspaceFormat: 1,
        })
        : method === "close_workspace"
        ? port.closeWorkspace("workspace-session.preview.1")
        : port.queryWorkspace("workspace-session.preview.1");
      await Promise.resolve();
      worker.fail("messageerror");
      await expect(pending).rejects.toMatchObject({ code: expectedCode });
      expect(worker.terminated).toBe(true);
    }
  });
});
