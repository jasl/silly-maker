// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserWorkspaceQuickJsRequestV1,
  admitBrowserWorkspaceQuickJsResponseV1,
  browserWorkspaceQuickJsChangedPathMaximumV1,
  browserWorkspaceQuickJsDeadlineMillisecondsV1,
  browserWorkspaceQuickJsDiffMaximumBytesV1,
  browserWorkspaceQuickJsFileMaximumBytesV1,
  browserWorkspaceQuickJsOuterWatchdogMillisecondsV1,
  browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1,
  browserWorkspaceQuickJsSourceMaximumBytesV1,
  browserWorkspaceQuickJsStackLimitBytesV1,
  browserWorkspaceQuickJsWasmLinearMemoryBytesV1,
  canonicalBrowserWorkspaceQuickJsPathV1,
  exactBrowserWorkspaceQuickJsDiffV1,
} from "../workspace/browser-workspace-quickjs-protocol.ts";

const buildIdentityV1 = "sillyos.workspace-sandbox.development";
const validRequestV1 = {
  revision: 1,
  kind: "quickjs_execute",
  requestId: 1,
  buildIdentity: buildIdentityV1,
  source: 'workspace.writeFile("result.txt", argv.join(":"));',
  argv: ["one", "two"],
  stdin: "input",
  files: [{ path: "/workspace/source.txt", text: "source" }],
} as const;

describe("SillyOS Browser Workspace QuickJS protocol", () => {
  it("exact-admits only bounded source, argv, stdin, build identity and staged files", () => {
    expect(admitBrowserWorkspaceQuickJsRequestV1(validRequestV1)).toEqual(validRequestV1);
    expect(admitBrowserWorkspaceQuickJsRequestV1({ ...validRequestV1, extra: true })).toBeNull();
    expect(admitBrowserWorkspaceQuickJsRequestV1({
      ...validRequestV1,
      buildIdentity: "host-selected",
    })).toBeNull();
    expect(admitBrowserWorkspaceQuickJsRequestV1({
      ...validRequestV1,
      source: "x".repeat(browserWorkspaceQuickJsSourceMaximumBytesV1 + 1),
    })).toBeNull();
    expect(admitBrowserWorkspaceQuickJsRequestV1({
      ...validRequestV1,
      files: [
        { path: "/workspace/source.txt", text: "first" },
        { path: "/workspace/source.txt", text: "duplicate" },
      ],
    })).toBeNull();
    expect(admitBrowserWorkspaceQuickJsRequestV1({
      ...validRequestV1,
      files: [{
        path: "/workspace/large.txt",
        text: "x".repeat(browserWorkspaceQuickJsFileMaximumBytesV1 + 1),
      }],
    })).toBeNull();
    expect(admitBrowserWorkspaceQuickJsRequestV1(Object.defineProperty(
      { ...validRequestV1 },
      "source",
      { enumerable: true, get: () => "secret getter" },
    ))).toBeNull();
    expect(admitBrowserWorkspaceQuickJsRequestV1({
      ...validRequestV1,
      [Symbol("untrusted")]: true,
    })).toBeNull();
  });

  it("rejects traversal and non-canonical paths before execution", () => {
    expect(canonicalBrowserWorkspaceQuickJsPathV1("/workspace/file.txt")).toBe(
      "/workspace/file.txt",
    );
    expect(canonicalBrowserWorkspaceQuickJsPathV1("relative.txt")).toBeNull();
    expect(canonicalBrowserWorkspaceQuickJsPathV1("/workspace/../secret")).toBeNull();
    expect(canonicalBrowserWorkspaceQuickJsPathV1("/workspace//file.txt")).toBeNull();
    expect(canonicalBrowserWorkspaceQuickJsPathV1("/tmp/file.txt")).toBeNull();
    expect(canonicalBrowserWorkspaceQuickJsPathV1("/workspace\\file.txt")).toBeNull();
  });

  it("returns an exact sorted terminal diff and enforces its output bounds", () => {
    expect(exactBrowserWorkspaceQuickJsDiffV1(
      [
        { path: "/workspace/unchanged.txt", text: "same" },
        { path: "/workspace/updated.txt", text: "before" },
        { path: "/workspace/deleted.txt", text: "delete me" },
      ],
      [
        { path: "/workspace/created.txt", text: "created" },
        { path: "/workspace/updated.txt", text: "after" },
        { path: "/workspace/unchanged.txt", text: "same" },
      ],
    )).toEqual([
      {
        path: "/workspace/created.txt",
        kind: "created",
        before: null,
        after: "created",
      },
      {
        path: "/workspace/deleted.txt",
        kind: "deleted",
        before: "delete me",
        after: null,
      },
      {
        path: "/workspace/updated.txt",
        kind: "updated",
        before: "before",
        after: "after",
      },
    ]);
    const tooMany = Array.from(
      { length: browserWorkspaceQuickJsChangedPathMaximumV1 + 1 },
      (_, index) => ({ path: `/workspace/${String(index)}.txt`, text: "value" }),
    );
    expect(() => exactBrowserWorkspaceQuickJsDiffV1([], tooMany)).toThrow("too many paths");
    const halfDiff = Math.floor(browserWorkspaceQuickJsDiffMaximumBytesV1 / 2);
    expect(() =>
      exactBrowserWorkspaceQuickJsDiffV1(
        [{ path: "/workspace/large.txt", text: "a".repeat(halfDiff) }],
        [{ path: "/workspace/large.txt", text: "b".repeat(halfDiff) }],
      )
    ).toThrow("wire bound");
  });

  it("exact-admits a matching terminal response and rejects spoofed metadata", () => {
    const response = {
      revision: 1,
      kind: "quickjs_result",
      requestId: 1,
      buildIdentity: buildIdentityV1,
      ok: true,
      response: {
        changes: [{
          path: "/workspace/output.txt",
          kind: "created",
          before: null,
          after: "done",
        }],
        stdout: "ok\n",
        moduleStartupMilliseconds: 10,
        executionMilliseconds: 2,
        runtimeAllocatorLimitBytes: browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1,
        wasmLinearMemoryBytes: browserWorkspaceQuickJsWasmLinearMemoryBytesV1,
        stackLimitBytes: browserWorkspaceQuickJsStackLimitBytesV1,
      },
    } as const;
    expect(admitBrowserWorkspaceQuickJsResponseV1(response, {
      requestId: 1,
      buildIdentity: buildIdentityV1,
    })).toEqual(response);
    expect(admitBrowserWorkspaceQuickJsResponseV1({ ...response, requestId: 2 }, {
      requestId: 1,
      buildIdentity: buildIdentityV1,
    })).toBeNull();
    expect(admitBrowserWorkspaceQuickJsResponseV1({
      ...response,
      buildIdentity: "sillyos.workspace-sandbox." + "a".repeat(40),
    }, {
      requestId: 1,
      buildIdentity: buildIdentityV1,
    })).toBeNull();
    expect(admitBrowserWorkspaceQuickJsResponseV1({
      ...response,
      response: {
        ...response.response,
        changes: [...response.response.changes, response.response.changes[0]],
      },
    }, {
      requestId: 1,
      buildIdentity: buildIdentityV1,
    })).toBeNull();
  });

  it("pins finite runtime and parent hard-watchdog limits", () => {
    expect(browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1).toBe(12 * 1_024 * 1_024);
    expect(browserWorkspaceQuickJsWasmLinearMemoryBytesV1).toBe(16 * 1_024 * 1_024);
    expect(browserWorkspaceQuickJsStackLimitBytesV1).toBe(512 * 1_024);
    expect(browserWorkspaceQuickJsDeadlineMillisecondsV1).toBe(2_000);
    expect(browserWorkspaceQuickJsOuterWatchdogMillisecondsV1).toBe(3_000);
  });
});
