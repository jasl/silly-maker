// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createBrowserWorkspaceEnvironmentClientV1,
  type BrowserWorkspaceEnvironmentMessagePortV1,
} from "../agent/browser-workspace-environment-client.ts";
import {
  admitBrowserWorkspaceHostEnvironmentOutboundMessageV1,
  admitBrowserWorkspaceHostEnvironmentRequestV1,
  type BrowserWorkspaceHostEnvironmentRequestV1,
} from "../workspace/browser-workspace-host-protocol.ts";
import {
  executeBrowserWorkspaceStructuredGrepV1,
  type BrowserWorkspaceJustBashVolumePortV1,
} from "../workspace/browser-workspace-just-bash-runtime.ts";
import {
  createWorkspaceGrepQueryV1,
  workspaceGrepDeadlineMillisecondsV1,
  workspaceGrepGlobMaximumUtf8BytesV1,
  WorkspaceGrepErrorV1,
  workspaceGrepPatternMaximumUtf8BytesV1,
  workspaceGrepPathMaximumUtf8BytesV1,
  workspaceGrepResultMaximumUtf8BytesV1,
} from "../workspace/contracts.ts";

class FakeGrepVolumeV1 implements BrowserWorkspaceJustBashVolumePortV1 {
  readonly files = new Map<string, Uint8Array>();
  readonly mutationAttempts: string[] = [];

  constructor(files: Readonly<Record<string, string>>) {
    for (const [path, content] of Object.entries(files)) {
      this.files.set(path, new TextEncoder().encode(content));
    }
  }

  async stat(path: string) {
    if (path.length === 0) return { kind: "directory" as const, size: 0, mtimeMs: 0 };
    const file = this.files.get(path);
    if (file !== undefined) {
      return { kind: "file" as const, size: file.byteLength, mtimeMs: 1 };
    }
    return [...this.files.keys()].some((candidate) => candidate.startsWith(`${path}/`))
      ? { kind: "directory" as const, size: 0, mtimeMs: 0 }
      : null;
  }

  async list(path: string) {
    const prefix = path.length === 0 ? "" : `${path}/`;
    const entries = new Map<string, "file" | "directory">();
    for (const candidate of this.files.keys()) {
      if (!candidate.startsWith(prefix)) continue;
      const remainder = candidate.slice(prefix.length);
      if (remainder.length === 0) continue;
      const separator = remainder.indexOf("/");
      entries.set(
        separator < 0 ? remainder : remainder.slice(0, separator),
        separator < 0 ? "file" : "directory",
      );
    }
    return [...entries].sort(([left], [right]) => left.localeCompare(right)).map(
      ([name, kind]) => ({ name, kind }),
    );
  }

  async read(path: string, signal: AbortSignal): Promise<Uint8Array> {
    if (signal.aborted) throw new DOMException("grep read aborted", "AbortError");
    const bytes = this.files.get(path);
    if (bytes === undefined) throw new Error(`missing fake file: ${path}`);
    return bytes.slice();
  }

  replace(): Promise<never> {
    this.mutationAttempts.push("replace");
    return Promise.reject(new Error("structured grep must not replace"));
  }

  append(): Promise<never> {
    this.mutationAttempts.push("append");
    return Promise.reject(new Error("structured grep must not append"));
  }

  mutateEntry(): Promise<never> {
    this.mutationAttempts.push("mutateEntry");
    return Promise.reject(new Error("structured grep must not mutate entries"));
  }
}

function pathViewV1(files: Readonly<Record<string, string>>) {
  const paths = new Map<string, "file" | "directory">();
  for (const path of Object.keys(files)) {
    const parts = path.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      paths.set(parts.slice(0, index).join("/"), "directory");
    }
    paths.set(path, "file");
  }
  return {
    generation: 7,
    entries: [...paths].sort(([left], [right]) => left.localeCompare(right)).map(
      ([path, kind]) => ({ path, kind }),
    ),
  } as const;
}

function cancellationV1(cause: "aborted" | "timeout" | null = null) {
  const controller = new AbortController();
  if (cause !== null) controller.abort();
  return {
    signal: controller.signal,
    cause: () => cause,
  } as const;
}

function environmentRequestV1(record: unknown): Record<string, unknown> {
  return { revision: 1, kind: "environment_request", requestId: 1, record };
}

describe("SillyOS Browser structured Workspace grep", () => {
  it("admits only the exact bounded normalized query and rejects traversal", () => {
    expect(workspaceGrepDeadlineMillisecondsV1).toBe(5_000);
    expect(createWorkspaceGrepQueryV1({ pattern: "TODO" })).toEqual({
      pattern: "TODO",
      path: "/workspace",
      glob: null,
      ignoreCase: false,
      literal: false,
      limit: 100,
    });
    const maximumPattern = "p".repeat(workspaceGrepPatternMaximumUtf8BytesV1);
    const maximumPath = `/workspace/${"p".repeat(workspaceGrepPathMaximumUtf8BytesV1 - 11)}`;
    const maximumGlob = "g".repeat(workspaceGrepGlobMaximumUtf8BytesV1);
    expect(createWorkspaceGrepQueryV1({
      pattern: maximumPattern,
      path: maximumPath,
      glob: maximumGlob,
      limit: 1,
    })).toMatchObject({ pattern: maximumPattern, path: maximumPath, glob: maximumGlob, limit: 1 });

    for (
      const input of [
        { pattern: "" },
        { pattern: `${maximumPattern}x` },
        { pattern: "TODO", path: "/workspace/src/../secret" },
        { pattern: "TODO", path: "/workspace//src" },
        { pattern: "TODO", path: `${maximumPath}x` },
        { pattern: "TODO", glob: `${maximumGlob}x` },
        { pattern: "TODO", limit: 0 },
        { pattern: "TODO", limit: 101 },
      ]
    ) {
      expect(() => createWorkspaceGrepQueryV1(input)).toThrow(WorkspaceGrepErrorV1);
    }

    const query = createWorkspaceGrepQueryV1({ pattern: "TODO", glob: "*.ts" });
    expect(admitBrowserWorkspaceHostEnvironmentRequestV1(environmentRequestV1({
      method: "grep_workspace",
      query,
    }))).toMatchObject({ record: { method: "grep_workspace", query } });
    expect(admitBrowserWorkspaceHostEnvironmentRequestV1(environmentRequestV1({
      method: "grep_workspace",
      query: { ...query, path: "/workspace/src/../secret" },
    }))).toBeNull();
    expect(admitBrowserWorkspaceHostEnvironmentRequestV1(environmentRequestV1({
      method: "grep_workspace",
      query,
      endpoint: "https://forbidden.example",
    }))).toBeNull();

    expect(admitBrowserWorkspaceHostEnvironmentOutboundMessageV1({
      revision: 1,
      kind: "environment_response",
      requestId: 1,
      ok: true,
      response: {
        method: "grep_workspace",
        termination: "completed",
        result: {
          revision: 1,
          generation: 1,
          matches: [{ path: "/workspace/a.txt", line: 1, text: "x".repeat(1024 * 1024) }],
          truncated: false,
        },
      },
    })).toBeNull();
  });

  it("returns sorted bounded matches, honors path/glob/case/literal, and never mutates", async () => {
    const literalMetacharacters = "a\\^$.*+?()[]{}|";
    const files = {
      "--hidden.txt": "TODO option-like path\n",
      "notes/metacharacters.txt": `${literalMetacharacters}\n`,
      "notes/readme.md": "TODO first\nTodo second\na+b literal\n",
      "src/a.ts": "const TODO = true;\n",
      "src/b.js": "// TODO js\n",
    };
    const volume = new FakeGrepVolumeV1(files);
    const result = await executeBrowserWorkspaceStructuredGrepV1({
      query: createWorkspaceGrepQueryV1({
        pattern: "todo",
        path: "/workspace/src",
        glob: "*.ts",
        ignoreCase: true,
        literal: true,
      }),
      pathView: pathViewV1(files),
      volume,
      cancellation: cancellationV1(),
    });
    expect(result).toEqual({
      ok: true,
      result: {
        revision: 1,
        generation: 7,
        matches: [{ path: "/workspace/src/a.ts", line: 1, text: "const TODO = true;" }],
        truncated: false,
      },
    });
    expect(volume.mutationAttempts).toEqual([]);

    const optionLikePath = await executeBrowserWorkspaceStructuredGrepV1({
      query: createWorkspaceGrepQueryV1({
        pattern: "option-like",
        path: "/workspace/--hidden.txt",
        literal: true,
      }),
      pathView: pathViewV1(files),
      volume,
      cancellation: cancellationV1(),
    });
    expect(optionLikePath).toMatchObject({
      ok: true,
      result: { matches: [{ path: "/workspace/--hidden.txt", line: 1 }] },
    });

    const literal = await executeBrowserWorkspaceStructuredGrepV1({
      query: createWorkspaceGrepQueryV1({ pattern: "a+b", literal: true }),
      pathView: pathViewV1(files),
      volume,
      cancellation: cancellationV1(),
    });
    expect(literal).toMatchObject({
      ok: true,
      result: { matches: [{ path: "/workspace/notes/readme.md", line: 3 }] },
    });

    const metacharacters = await executeBrowserWorkspaceStructuredGrepV1({
      query: createWorkspaceGrepQueryV1({
        pattern: literalMetacharacters,
        path: "/workspace/notes/metacharacters.txt",
        literal: true,
      }),
      pathView: pathViewV1(files),
      volume,
      cancellation: cancellationV1(),
    });
    expect(metacharacters).toMatchObject({
      ok: true,
      result: {
        matches: [{
          path: "/workspace/notes/metacharacters.txt",
          line: 1,
          text: literalMetacharacters,
        }],
      },
    });
  });

  it("treats no matches as success and truncates count, text, and serialized output", async () => {
    const longLine = `hit ${"x".repeat(1024 * 1024)}`;
    const manyLines = Array.from({ length: 120 }, (_, index) => `needle ${index}`).join("\n");
    const files = {
      "empty.txt": "nothing here\n",
      "long.txt": `${longLine}\n`,
      "many.txt": `${manyLines}\n`,
    };
    const volume = new FakeGrepVolumeV1(files);
    const view = pathViewV1(files);
    await expect(executeBrowserWorkspaceStructuredGrepV1({
      query: createWorkspaceGrepQueryV1({ pattern: "absent" }),
      pathView: view,
      volume,
      cancellation: cancellationV1(),
    })).resolves.toMatchObject({ ok: true, result: { matches: [], truncated: false } });

    const count = await executeBrowserWorkspaceStructuredGrepV1({
      query: createWorkspaceGrepQueryV1({ pattern: "needle", limit: 3 }),
      pathView: view,
      volume,
      cancellation: cancellationV1(),
    });
    expect(count).toMatchObject({ ok: true, result: { truncated: true } });
    if (!count.ok) throw new Error("expected grep result");
    expect(count.result.matches).toHaveLength(3);

    const text = await executeBrowserWorkspaceStructuredGrepV1({
      query: createWorkspaceGrepQueryV1({ pattern: "hit", literal: true }),
      pathView: view,
      volume,
      cancellation: cancellationV1(),
    });
    if (!text.ok) throw new Error("expected grep result");
    expect(text.result.truncated).toBe(true);
    expect(Array.from(text.result.matches[0]!.text)).toHaveLength(500);
    expect(new TextEncoder().encode(JSON.stringify(text.result)).byteLength).toBeLessThanOrEqual(
      workspaceGrepResultMaximumUtf8BytesV1,
    );
    expect(volume.mutationAttempts).toEqual([]);
  });

  it("returns one bounded match for a dense single line when limit is one", async () => {
    const denseLine = "a".repeat(20_000);
    const files = { "dense.txt": `${denseLine}\n` };
    const volume = new FakeGrepVolumeV1(files);
    const result = await executeBrowserWorkspaceStructuredGrepV1({
      query: createWorkspaceGrepQueryV1({
        pattern: "a",
        path: "/workspace/dense.txt",
        literal: true,
        limit: 1,
      }),
      pathView: pathViewV1(files),
      volume,
      cancellation: cancellationV1(),
    });
    expect(result).toMatchObject({
      ok: true,
      result: {
        matches: [{ path: "/workspace/dense.txt", line: 1 }],
        truncated: true,
      },
    });
    if (!result.ok) throw new Error("expected dense grep result");
    expect(result.result.matches).toHaveLength(1);
    expect(result.result.matches[0]?.text).toBe("a".repeat(500));
    expect(volume.mutationAttempts).toEqual([]);
  });

  it("reports caller cancellation and the fixed-deadline cause without returning late data", async () => {
    const files = { "a.txt": "needle\n" };
    const volume = new FakeGrepVolumeV1(files);
    for (const cause of ["aborted", "timeout"] as const) {
      await expect(executeBrowserWorkspaceStructuredGrepV1({
        query: createWorkspaceGrepQueryV1({ pattern: "needle" }),
        pathView: pathViewV1(files),
        volume,
        cancellation: cancellationV1(cause),
      })).resolves.toMatchObject({ ok: false, code: cause });
    }
    expect(volume.mutationAttempts).toEqual([]);
  });
});

type MessageListenerV1 = (event: { readonly data: unknown }) => void;

class FakeGrepEnvironmentPortV1 implements BrowserWorkspaceEnvironmentMessagePortV1 {
  readonly requests: BrowserWorkspaceHostEnvironmentRequestV1[] = [];
  readonly lateSuccessAfterCancel: boolean;
  readonly timeout: boolean;
  private readonly listeners = new Set<MessageListenerV1>();

  constructor(
    options: { readonly lateSuccessAfterCancel?: boolean; readonly timeout?: boolean } = {},
  ) {
    this.lateSuccessAfterCancel = options.lateSuccessAfterCancel ?? false;
    this.timeout = options.timeout ?? false;
  }

  postMessage(value: unknown): void {
    const request = admitBrowserWorkspaceHostEnvironmentRequestV1(value);
    if (request === null) throw new Error("fake received malformed request");
    this.requests.push(request);
    queueMicrotask(() => this.respond(request));
  }

  private respond(request: BrowserWorkspaceHostEnvironmentRequestV1): void {
    const record = request.record;
    if (record.method === "grep_workspace" && this.lateSuccessAfterCancel) return;
    const response = record.method === "begin_run"
      ? { method: "begin_run" as const, generation: 7 }
      : record.method === "begin_tool"
      ? { method: "begin_tool" as const, baseGeneration: 7 }
      : record.method === "grep_workspace"
      ? this.timeout
        ? {
          method: "grep_workspace" as const,
          termination: "timeout" as const,
          message: "Workspace grep request timed out",
        }
        : {
          method: "grep_workspace" as const,
          termination: "completed" as const,
          result: {
            revision: 1 as const,
            generation: 7,
            matches: [{ path: "/workspace/a.txt", line: 1, text: "needle" }],
            truncated: false,
          },
        }
      : record.method === "cancel_tool"
      ? { method: "cancel_tool" as const, value: null }
      : record.method === "end_tool"
      ? { method: "end_tool" as const, generation: 7 }
      : record.method === "abort_run"
      ? { method: "abort_run" as const, generation: 7 }
      : record.method === "end_run"
      ? { method: "end_run" as const, generation: 7 }
      : null;
    if (response !== null) {
      this.send({
        revision: 1,
        kind: "environment_response",
        requestId: request.requestId,
        ok: true,
        response,
      });
    }
    if (record.method === "cancel_tool" && this.lateSuccessAfterCancel) {
      const grep = this.requests.findLast((candidate) =>
        candidate.record.method === "grep_workspace"
      );
      if (grep !== undefined) {
        this.send({
          revision: 1,
          kind: "environment_response",
          requestId: grep.requestId,
          ok: true,
          response: {
            method: "grep_workspace",
            termination: "completed",
            result: {
              revision: 1,
              generation: 7,
              matches: [{ path: "/workspace/late.txt", line: 1, text: "must be discarded" }],
              truncated: false,
            },
          },
        });
      }
    }
  }

  private send(value: unknown): void {
    if (admitBrowserWorkspaceHostEnvironmentOutboundMessageV1(value) === null) {
      throw new Error("fake produced malformed response");
    }
    for (const listener of this.listeners) listener({ data: value });
  }

  addEventListener(type: "message" | "messageerror", listener: MessageListenerV1 | (() => void)) {
    if (type === "message") this.listeners.add(listener as MessageListenerV1);
  }
  removeEventListener(
    type: "message" | "messageerror",
    listener: MessageListenerV1 | (() => void),
  ) {
    if (type === "message") this.listeners.delete(listener as MessageListenerV1);
  }
  start(): void {}
  close(): void {}
}

async function startClientRunV1(port: FakeGrepEnvironmentPortV1) {
  const descriptor = {
    revision: 1 as const,
    programId: "program.grep.1",
    workspaceId: "workspace.grep.1",
    workspaceSessionId: "workspace-session.grep.1",
    generation: 7,
  };
  const client = createBrowserWorkspaceEnvironmentClientV1({ port, descriptor });
  const started = await client.beginAgentRun({
    binding: {
      revision: 1,
      programId: descriptor.programId,
      workspaceId: descriptor.workspaceId,
      workspaceSessionId: descriptor.workspaceSessionId,
      expectedGeneration: 7,
    },
    piSessionId: "pi-session.grep.1",
    piRunId: "pi-run.grep.1",
  });
  if (started.kind !== "started") throw new Error("expected fake run");
  return { client, run: started.run };
}

describe("SillyOS Browser structured grep client", () => {
  it("keeps the generation unchanged and emits no mutation receipt", async () => {
    const port = new FakeGrepEnvironmentPortV1();
    const { client, run } = await startClientRunV1(port);
    await expect(run.executeGrepCall({
      toolCallId: "pi-tool.grep.1",
      query: createWorkspaceGrepQueryV1({ pattern: "needle" }),
    })).resolves.toMatchObject({ generation: 7, matches: [{ path: "/workspace/a.txt" }] });
    expect(run.getGenerationCursor()).toBe(7);
    expect(client.getDescriptor().generation).toBe(7);
    expect(client.queryMutationRecords()).toEqual([]);
    run.finish();
    client.dispose();
  });

  it("maps timeout and discards a success that arrives after caller cancellation", async () => {
    const timeoutPort = new FakeGrepEnvironmentPortV1({ timeout: true });
    const timeoutRun = await startClientRunV1(timeoutPort);
    await expect(timeoutRun.run.executeGrepCall({
      toolCallId: "pi-tool.grep.timeout.1",
      query: createWorkspaceGrepQueryV1({ pattern: "needle" }),
    })).rejects.toMatchObject({ code: "timeout" });
    timeoutRun.run.finish();
    timeoutRun.client.dispose();

    const cancelledPort = new FakeGrepEnvironmentPortV1({ lateSuccessAfterCancel: true });
    const cancelledRun = await startClientRunV1(cancelledPort);
    const controller = new AbortController();
    const pending = cancelledRun.run.executeGrepCall({
      toolCallId: "pi-tool.grep.cancel.1",
      query: createWorkspaceGrepQueryV1({ pattern: "needle" }),
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "cancelled" });
    expect(cancelledPort.requests.some((request) => request.record.method === "cancel_tool")).toBe(
      true,
    );
    expect(cancelledRun.run.getGenerationCursor()).toBe(7);
    cancelledRun.run.finish();
    cancelledRun.client.dispose();
  });
});
