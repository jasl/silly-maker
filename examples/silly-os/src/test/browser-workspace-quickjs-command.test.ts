// SPDX-License-Identifier: MIT
/// <reference lib="webworker" />

import { createCommandContext, InMemoryFs } from "just-bash/browser";
import { describe, expect, it } from "vitest";

import {
  createBrowserWorkspaceQuickJsCommandV1,
  runBrowserWorkspaceQuickJsWorkerV1,
  type BrowserWorkspaceQuickJsWorkerV1,
} from "../workspace/browser-workspace-quickjs-command.ts";
import {
  browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1,
  browserWorkspaceQuickJsStackLimitBytesV1,
  browserWorkspaceQuickJsWasmLinearMemoryBytesV1,
  type BrowserWorkspaceQuickJsChangeV1,
  type BrowserWorkspaceQuickJsRequestV1,
  type BrowserWorkspaceQuickJsSuccessResponseV1,
} from "../workspace/browser-workspace-quickjs-protocol.ts";
import { browserWorkspaceSandboxArtifactBuildIdentityV1 } from "../workspace/browser-workspace-sandbox-build-identity.ts";

function successResponseV1(
  request: BrowserWorkspaceQuickJsRequestV1,
  changes: readonly BrowserWorkspaceQuickJsChangeV1[] = [],
  stdout = "",
): BrowserWorkspaceQuickJsSuccessResponseV1 {
  return {
    revision: 1,
    kind: "quickjs_result",
    requestId: request.requestId,
    buildIdentity: request.buildIdentity,
    ok: true,
    response: {
      changes,
      stdout,
      moduleStartupMilliseconds: 1,
      executionMilliseconds: 1,
      runtimeAllocatorLimitBytes: browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1,
      wasmLinearMemoryBytes: browserWorkspaceQuickJsWasmLinearMemoryBytesV1,
      stackLimitBytes: browserWorkspaceQuickJsStackLimitBytesV1,
    },
  };
}

class FakeQuickJsWorkerV1 implements BrowserWorkspaceQuickJsWorkerV1 {
  readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  terminateCount = 0;

  constructor(
    private readonly onPost: (
      request: BrowserWorkspaceQuickJsRequestV1,
      worker: FakeQuickJsWorkerV1,
    ) => void = () => undefined,
  ) {}

  postMessage(request: BrowserWorkspaceQuickJsRequestV1): void {
    this.onPost(request, this);
  }

  addEventListener(
    type: "message" | "messageerror" | "error",
    listener: EventListenerOrEventListenerObject,
  ): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(
    type: "message" | "messageerror" | "error",
    listener: EventListenerOrEventListenerObject,
  ): void {
    this.listeners.get(type)?.delete(listener);
  }

  terminate(): void {
    this.terminateCount += 1;
  }

  emit(type: "message" | "messageerror" | "error", data?: unknown): void {
    const event = {
      data,
      preventDefault: () => undefined,
    } as unknown as Event;
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === "function") listener(event);
      else listener.handleEvent(event);
    }
  }
}

const requestV1: BrowserWorkspaceQuickJsRequestV1 = {
  revision: 1,
  kind: "quickjs_execute",
  requestId: 1,
  buildIdentity: browserWorkspaceSandboxArtifactBuildIdentityV1,
  source: "print('ok');",
  argv: [],
  stdin: "",
  files: [{ path: "/workspace/script.js", text: "print('ok');" }],
};

describe("SillyOS Browser Workspace qjs Worker broker", () => {
  it("terminates before returning an exact response and ignores late messages", async () => {
    const worker = new FakeQuickJsWorkerV1((request, active) => {
      queueMicrotask(() => active.emit("message", successResponseV1(request, [], "ok\n")));
    });
    await expect(runBrowserWorkspaceQuickJsWorkerV1(
      requestV1,
      new AbortController().signal,
      { createWorker: () => worker },
    )).resolves.toEqual({
      kind: "completed",
      response: successResponseV1(requestV1, [], "ok\n"),
    });
    expect(worker.terminateCount).toBe(1);
    worker.emit("message", successResponseV1(requestV1));
    expect(worker.terminateCount).toBe(1);
  });

  it("hard-terminates abort, wall timeout and spoofed responses", async () => {
    const abortController = new AbortController();
    const abortedWorker = new FakeQuickJsWorkerV1(() =>
      queueMicrotask(() => abortController.abort())
    );
    await expect(runBrowserWorkspaceQuickJsWorkerV1(
      requestV1,
      abortController.signal,
      { createWorker: () => abortedWorker },
    )).resolves.toEqual({ kind: "aborted" });
    expect(abortedWorker.terminateCount).toBe(1);

    const timedOutWorker = new FakeQuickJsWorkerV1();
    await expect(runBrowserWorkspaceQuickJsWorkerV1(
      requestV1,
      new AbortController().signal,
      { createWorker: () => timedOutWorker, watchdogMilliseconds: 1 },
    )).resolves.toEqual({ kind: "wall_timeout" });
    expect(timedOutWorker.terminateCount).toBe(1);

    const spoofedWorker = new FakeQuickJsWorkerV1((request, active) => {
      queueMicrotask(() =>
        active.emit("message", {
          ...successResponseV1(request),
          requestId: request.requestId + 1,
        })
      );
    });
    await expect(runBrowserWorkspaceQuickJsWorkerV1(
      requestV1,
      new AbortController().signal,
      { createWorker: () => spoofedWorker },
    )).resolves.toEqual({ kind: "worker_failed" });
    expect(spoofedWorker.terminateCount).toBe(1);
  });
});

describe("SillyOS Browser Workspace qjs command", () => {
  it("stages only the script and explicit text files, then applies a preflighted diff", async () => {
    const filesystem = new InMemoryFs({
      "/workspace/script.js": 'workspace.writeFile("output.txt", "done");',
      "/workspace/input.txt": "before",
      "/workspace/not-staged.txt": "private to the volume",
    });
    const command = createBrowserWorkspaceQuickJsCommandV1(async (request) => {
      expect(request.files).toEqual([
        { path: "/workspace/input.txt", text: "before" },
        {
          path: "/workspace/script.js",
          text: 'workspace.writeFile("output.txt", "done");',
        },
      ]);
      expect(request.argv).toEqual(["ARG"]);
      expect(request.stdin).toBe("");
      return {
        kind: "completed",
        response: successResponseV1(request, [
          {
            path: "/workspace/input.txt",
            kind: "updated",
            before: "before",
            after: "after",
          },
          {
            path: "/workspace/output.txt",
            kind: "created",
            before: null,
            after: "done",
          },
        ], "created\n"),
      };
    });
    const result = await command.execute(
      ["--file", "input.txt", "script.js", "ARG"],
      createCommandContext({ fs: filesystem, cwd: "/workspace" }),
    );
    expect(result).toEqual({ stdout: "created\n", stderr: "", exitCode: 0 });
    await expect(filesystem.readFile("/workspace/input.txt")).resolves.toBe("after");
    await expect(filesystem.readFile("/workspace/output.txt")).resolves.toBe("done");
    await expect(filesystem.readFile("/workspace/not-staged.txt")).resolves.toBe(
      "private to the volume",
    );
  });

  it("rejects delete, overwrite, missing-parent and stale-before diffs before any write", async () => {
    const cases: readonly Readonly<{
      name: string;
      change: BrowserWorkspaceQuickJsChangeV1;
      beforeRun?: (filesystem: InMemoryFs) => Promise<void>;
    }>[] = [
      {
        name: "delete",
        change: {
          path: "/workspace/input.txt",
          kind: "deleted",
          before: "before",
          after: null,
        },
      },
      {
        name: "unstaged overwrite",
        change: {
          path: "/workspace/secret.txt",
          kind: "created",
          before: null,
          after: "overwritten",
        },
      },
      {
        name: "missing parent",
        change: {
          path: "/workspace/missing/output.txt",
          kind: "created",
          before: null,
          after: "created",
        },
      },
      {
        name: "stale before",
        change: {
          path: "/workspace/input.txt",
          kind: "updated",
          before: "before",
          after: "after",
        },
        beforeRun: async (filesystem) =>
          await filesystem.writeFile("/workspace/input.txt", "raced"),
      },
    ];
    for (const testCase of cases) {
      const filesystem = new InMemoryFs({
        "/workspace/script.js": "1 + 1;",
        "/workspace/input.txt": "before",
        "/workspace/secret.txt": "secret",
      });
      const command = createBrowserWorkspaceQuickJsCommandV1(async (request) => {
        await testCase.beforeRun?.(filesystem);
        return {
          kind: "completed",
          response: successResponseV1(request, [testCase.change]),
        };
      });
      const result = await command.execute(
        ["--file", "input.txt", "script.js"],
        createCommandContext({ fs: filesystem, cwd: "/workspace" }),
      );
      expect(result.exitCode, testCase.name).toBe(1);
      await expect(filesystem.readFile("/workspace/secret.txt"), testCase.name).resolves.toBe(
        "secret",
      );
      await expect(filesystem.exists("/workspace/missing/output.txt"), testCase.name).resolves.toBe(
        false,
      );
      await expect(filesystem.readFile("/workspace/input.txt"), testCase.name).resolves.toBe(
        testCase.name === "stale before" ? "raced" : "before",
      );
    }
  });

  it("keeps its CLI bounded and reports only admitted guest diagnostics", async () => {
    const filesystem = new InMemoryFs({ "/workspace/script.js": "1 + 1;" });
    const command = createBrowserWorkspaceQuickJsCommandV1(async () => ({
      kind: "worker_failed",
    }));
    const context = createCommandContext({ fs: filesystem, cwd: "/workspace" });
    await expect(command.execute(["--help"], context)).resolves.toEqual({
      stdout: "Usage: qjs [--file PATH]... SCRIPT [ARG...]\n",
      stderr: "",
      exitCode: 0,
    });
    await expect(command.execute(["--unknown"], context)).resolves.toEqual({
      stdout: "",
      stderr: "Usage: qjs [--file PATH]... SCRIPT [ARG...]\n",
      exitCode: 2,
    });
    await expect(command.execute(["script.js"], context)).resolves.toEqual({
      stdout: "",
      stderr: "qjs: Worker execution failed\n",
      exitCode: 1,
    });

    const diagnosed = createBrowserWorkspaceQuickJsCommandV1(async (request) => ({
      kind: "completed",
      response: {
        revision: 1,
        kind: "quickjs_result",
        requestId: request.requestId,
        buildIdentity: request.buildIdentity,
        ok: false,
        code: "execution_failed",
        diagnostic: {
          kind: "SyntaxError",
          message: "expecting expression",
          line: 4,
          column: 9,
        },
        wasmLinearMemoryBytes: browserWorkspaceQuickJsWasmLinearMemoryBytesV1,
      },
    }));
    await expect(diagnosed.execute(["script.js"], context)).resolves.toEqual({
      stdout: "",
      stderr: "qjs: SyntaxError at 4:9: expecting expression\n",
      exitCode: 1,
    });
  });
});
