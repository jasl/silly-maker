// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitQuickJsFeasibilityRequestV1,
  canonicalQuickJsWorkspacePathV1,
  exactQuickJsFeasibilityDiffV1,
  quickJsFeasibilityChangedPathMaximumV1,
  quickJsFeasibilityDeadlineMillisecondsV1,
  quickJsFeasibilityDiffMaximumBytesV1,
  quickJsFeasibilityFailureResponseV1,
  quickJsFeasibilityFileMaximumBytesV1,
  quickJsFeasibilityRuntimeAllocatorLimitBytesV1,
  quickJsFeasibilitySourceMaximumBytesV1,
  quickJsFeasibilityStackLimitBytesV1,
  quickJsFeasibilityWasmLinearMemoryBytesV1,
} from "./browser-workspace-quickjs-feasibility.worker.ts";

const validRequestV1 = {
  revision: 1,
  kind: "quickjs_feasibility_execute",
  requestId: 1,
  source: 'workspace.writeFile("result.txt", argv.join(":") + stdin);',
  argv: ["one", "two"],
  stdin: "input",
  files: [{ path: "/workspace/source.txt", text: "source" }],
} as const;

describe("SillyOS QuickJS feasibility Worker", () => {
  it("exact-admits only a bounded source, argv, stdin, and canonical staged file set", () => {
    expect(admitQuickJsFeasibilityRequestV1(validRequestV1)).toEqual(validRequestV1);
    expect(admitQuickJsFeasibilityRequestV1({ ...validRequestV1, extra: true })).toBeNull();
    expect(admitQuickJsFeasibilityRequestV1({
      ...validRequestV1,
      source: "x".repeat(quickJsFeasibilitySourceMaximumBytesV1 + 1),
    })).toBeNull();
    expect(admitQuickJsFeasibilityRequestV1({
      ...validRequestV1,
      files: [
        { path: "/workspace/source.txt", text: "first" },
        { path: "/workspace/source.txt", text: "duplicate" },
      ],
    })).toBeNull();
    expect(admitQuickJsFeasibilityRequestV1({
      ...validRequestV1,
      files: [{
        path: "/workspace/large.txt",
        text: "x".repeat(quickJsFeasibilityFileMaximumBytesV1 + 1),
      }],
    })).toBeNull();
    expect(admitQuickJsFeasibilityRequestV1(Object.defineProperty(
      { ...validRequestV1 },
      "source",
      { enumerable: true, get: () => "secret getter" },
    ))).toBeNull();
    expect(admitQuickJsFeasibilityRequestV1({
      ...validRequestV1,
      [Symbol("untrusted")]: true,
    })).toBeNull();
  });

  it("rejects traversal and non-canonical paths before execution", () => {
    expect(canonicalQuickJsWorkspacePathV1("/workspace/file.txt")).toBe(
      "/workspace/file.txt",
    );
    expect(canonicalQuickJsWorkspacePathV1("relative.txt")).toBeNull();
    expect(canonicalQuickJsWorkspacePathV1("/workspace/../secret")).toBeNull();
    expect(canonicalQuickJsWorkspacePathV1("/workspace//file.txt")).toBeNull();
    expect(canonicalQuickJsWorkspacePathV1("/tmp/file.txt")).toBeNull();
    expect(canonicalQuickJsWorkspacePathV1("/workspace\\file.txt")).toBeNull();
  });

  it("returns an exact, sorted terminal diff without unchanged files", () => {
    expect(exactQuickJsFeasibilityDiffV1(
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
  });

  it("fails closed when the terminal diff crosses changed-path or byte bounds", () => {
    const tooMany = Array.from(
      { length: quickJsFeasibilityChangedPathMaximumV1 + 1 },
      (_, index) => ({ path: `/workspace/${String(index)}.txt`, text: "value" }),
    );
    expect(() => exactQuickJsFeasibilityDiffV1([], tooMany)).toThrow("too many paths");

    const halfDiff = Math.floor(quickJsFeasibilityDiffMaximumBytesV1 / 2);
    expect(() =>
      exactQuickJsFeasibilityDiffV1(
        [{ path: "/workspace/large.txt", text: "a".repeat(halfDiff) }],
        [{ path: "/workspace/large.txt", text: "b".repeat(halfDiff) }],
      )
    ).toThrow("wire bound");
  });

  it("pins finite runtime limits and returns only a closed failure code", () => {
    expect(quickJsFeasibilityRuntimeAllocatorLimitBytesV1).toBe(12 * 1_024 * 1_024);
    expect(quickJsFeasibilityWasmLinearMemoryBytesV1).toBe(16 * 1_024 * 1_024);
    expect(quickJsFeasibilityStackLimitBytesV1).toBe(512 * 1_024);
    expect(quickJsFeasibilityDeadlineMillisecondsV1).toBe(2_000);
    expect(quickJsFeasibilityFailureResponseV1(7, new Error("API_KEY=secret"))).toEqual({
      revision: 1,
      kind: "quickjs_feasibility_result",
      requestId: 7,
      ok: false,
      code: "execution_failed",
      wasmLinearMemoryBytes: null,
    });
  });
});
