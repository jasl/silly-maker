// SPDX-License-Identifier: MIT

export const browserWorkspaceQuickJsSourceMaximumBytesV1 = 64 * 1_024;
export const browserWorkspaceQuickJsArgvMaximumV1 = 32;
export const browserWorkspaceQuickJsArgMaximumBytesV1 = 4 * 1_024;
export const browserWorkspaceQuickJsArgvMaximumBytesV1 = 16 * 1_024;
export const browserWorkspaceQuickJsStdinMaximumBytesV1 = 64 * 1_024;
export const browserWorkspaceQuickJsFileMaximumV1 = 32;
export const browserWorkspaceQuickJsFileMaximumBytesV1 = 256 * 1_024;
export const browserWorkspaceQuickJsWorkspaceMaximumBytesV1 = 1 * 1_024 * 1_024;
export const browserWorkspaceQuickJsChangedPathMaximumV1 = 16;
export const browserWorkspaceQuickJsDiffMaximumBytesV1 = 256 * 1_024;
export const browserWorkspaceQuickJsStdoutMaximumBytesV1 = 64 * 1_024;
// These two limits cover only the guest allocator and Wasm linear memory. They
// do not include the staged host objects, module JavaScript, structured clones,
// Worker overhead, or browser-process memory.
export const browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1 = 12 * 1_024 * 1_024;
export const browserWorkspaceQuickJsWasmLinearMemoryBytesV1 = 16 * 1_024 * 1_024;
export const browserWorkspaceQuickJsStackLimitBytesV1 = 512 * 1_024;
export const browserWorkspaceQuickJsDeadlineMillisecondsV1 = 2_000;
export const browserWorkspaceQuickJsOuterWatchdogMillisecondsV1 = 3_000;

const pathMaximumBytesV1 = 1_024;
const requestIdMaximumV1 = 0x7fff_ffff;
const encoderV1 = new TextEncoder();

export interface BrowserWorkspaceQuickJsFileV1 {
  readonly path: string;
  readonly text: string;
}

export interface BrowserWorkspaceQuickJsRequestV1 {
  readonly revision: 1;
  readonly kind: "quickjs_execute";
  readonly requestId: number;
  readonly buildIdentity: string;
  readonly source: string;
  readonly argv: readonly string[];
  readonly stdin: string;
  readonly files: readonly BrowserWorkspaceQuickJsFileV1[];
}

export interface BrowserWorkspaceQuickJsChangeV1 {
  readonly path: string;
  readonly kind: "created" | "updated" | "deleted";
  readonly before: string | null;
  readonly after: string | null;
}

export interface BrowserWorkspaceQuickJsSuccessResponseV1 {
  readonly revision: 1;
  readonly kind: "quickjs_result";
  readonly requestId: number;
  readonly buildIdentity: string;
  readonly ok: true;
  readonly response: {
    readonly changes: readonly BrowserWorkspaceQuickJsChangeV1[];
    readonly stdout: string;
    readonly moduleStartupMilliseconds: number;
    readonly executionMilliseconds: number;
    readonly runtimeAllocatorLimitBytes: number;
    readonly wasmLinearMemoryBytes: number;
    readonly stackLimitBytes: number;
  };
}

export type BrowserWorkspaceQuickJsFailureCodeV1 =
  | "invalid_request"
  | "async_unsupported"
  | "deadline_exceeded"
  | "memory_limit"
  | "output_limit"
  | "execution_failed";

export interface BrowserWorkspaceQuickJsFailureResponseV1 {
  readonly revision: 1;
  readonly kind: "quickjs_result";
  readonly requestId: number | null;
  readonly buildIdentity: string;
  readonly ok: false;
  readonly code: BrowserWorkspaceQuickJsFailureCodeV1;
  readonly wasmLinearMemoryBytes: number | null;
}

export type BrowserWorkspaceQuickJsResponseV1 =
  | BrowserWorkspaceQuickJsSuccessResponseV1
  | BrowserWorkspaceQuickJsFailureResponseV1;

export interface BrowserWorkspaceQuickJsSnapshotV1 {
  readonly files: readonly BrowserWorkspaceQuickJsFileV1[];
  readonly stdout: string;
}

export class BrowserWorkspaceQuickJsFailureV1 extends Error {
  readonly code: Exclude<BrowserWorkspaceQuickJsFailureCodeV1, "invalid_request">;
  wasmLinearMemoryBytes: number | null = null;

  constructor(
    code: Exclude<BrowserWorkspaceQuickJsFailureCodeV1, "invalid_request">,
    message: string,
  ) {
    super(message);
    this.name = "BrowserWorkspaceQuickJsFailureV1";
    this.code = code;
  }
}

export function browserWorkspaceQuickJsByteLengthV1(value: string): number {
  return encoderV1.encode(value).byteLength;
}

function exactRecordV1(
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) return null;
  if (Object.getOwnPropertySymbols(value).length !== 0) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== keys.length || names.some((name) => !keys.includes(name))) return null;
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) return null;
    result[key] = descriptor.value;
  }
  return result;
}

function positiveRequestIdV1(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1 &&
    (value as number) <= requestIdMaximumV1;
}

function finiteNonNegativeNumberV1(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function admittedBuildIdentityV1(value: unknown): string | null {
  return typeof value === "string" &&
      /^sillyos\.workspace-sandbox\.(?:development|(?:[0-9a-f]{40}|[0-9a-f]{64})(?:-dirty)?)$/u
        .test(value)
    ? value
    : null;
}

export function canonicalBrowserWorkspaceQuickJsPathV1(value: unknown): string | null {
  if (
    typeof value !== "string" || browserWorkspaceQuickJsByteLengthV1(value) > pathMaximumBytesV1
  ) {
    return null;
  }
  if (!value.startsWith("/workspace/") || value.includes("\\") || value.includes("\0")) {
    return null;
  }
  const parts = value.split("/");
  if (
    parts.length < 3 || parts[0] !== "" || parts[1] !== "workspace" ||
    parts.slice(2).some((part) => part.length === 0 || part === "." || part === "..")
  ) return null;
  return value;
}

function admitFileV1(value: unknown): BrowserWorkspaceQuickJsFileV1 | null {
  const record = exactRecordV1(value, ["path", "text"]);
  if (record === null) return null;
  const path = canonicalBrowserWorkspaceQuickJsPathV1(record.path);
  if (
    path === null || typeof record.text !== "string" ||
    browserWorkspaceQuickJsByteLengthV1(record.text) >
      browserWorkspaceQuickJsFileMaximumBytesV1
  ) return null;
  return Object.freeze({ path, text: record.text });
}

function admitFilesV1(value: unknown): readonly BrowserWorkspaceQuickJsFileV1[] | null {
  if (!Array.isArray(value) || value.length > browserWorkspaceQuickJsFileMaximumV1) return null;
  let workspaceBytes = 0;
  const paths = new Set<string>();
  const files: BrowserWorkspaceQuickJsFileV1[] = [];
  for (const candidate of value) {
    const file = admitFileV1(candidate);
    if (file === null || paths.has(file.path)) return null;
    paths.add(file.path);
    workspaceBytes += browserWorkspaceQuickJsByteLengthV1(file.text);
    if (workspaceBytes > browserWorkspaceQuickJsWorkspaceMaximumBytesV1) return null;
    files.push(file);
  }
  return Object.freeze(files);
}

export function admitBrowserWorkspaceQuickJsRequestV1(
  value: unknown,
): BrowserWorkspaceQuickJsRequestV1 | null {
  const record = exactRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "buildIdentity",
    "source",
    "argv",
    "stdin",
    "files",
  ]);
  const buildIdentity = admittedBuildIdentityV1(record?.buildIdentity);
  if (
    record === null || record.revision !== 1 || record.kind !== "quickjs_execute" ||
    !positiveRequestIdV1(record.requestId) || buildIdentity === null ||
    typeof record.source !== "string" ||
    browserWorkspaceQuickJsByteLengthV1(record.source) >
      browserWorkspaceQuickJsSourceMaximumBytesV1 ||
    !Array.isArray(record.argv) || record.argv.length > browserWorkspaceQuickJsArgvMaximumV1 ||
    typeof record.stdin !== "string" ||
    browserWorkspaceQuickJsByteLengthV1(record.stdin) > browserWorkspaceQuickJsStdinMaximumBytesV1
  ) return null;

  let argvBytes = 0;
  const argv: string[] = [];
  for (const arg of record.argv) {
    if (typeof arg !== "string") return null;
    const bytes = browserWorkspaceQuickJsByteLengthV1(arg);
    if (bytes > browserWorkspaceQuickJsArgMaximumBytesV1) return null;
    argvBytes += bytes;
    if (argvBytes > browserWorkspaceQuickJsArgvMaximumBytesV1) return null;
    argv.push(arg);
  }
  const files = admitFilesV1(record.files);
  if (files === null) return null;
  return Object.freeze({
    revision: 1,
    kind: "quickjs_execute",
    requestId: record.requestId,
    buildIdentity,
    source: record.source,
    argv: Object.freeze(argv),
    stdin: record.stdin,
    files,
  });
}

export function admitBrowserWorkspaceQuickJsSnapshotV1(
  value: unknown,
): BrowserWorkspaceQuickJsSnapshotV1 | null {
  const record = exactRecordV1(value, ["files", "stdout"]);
  if (
    record === null || typeof record.stdout !== "string" ||
    browserWorkspaceQuickJsByteLengthV1(record.stdout) >
      browserWorkspaceQuickJsStdoutMaximumBytesV1
  ) return null;
  const files = admitFilesV1(record.files);
  return files === null ? null : Object.freeze({ files, stdout: record.stdout });
}

export function exactBrowserWorkspaceQuickJsDiffV1(
  beforeFiles: readonly BrowserWorkspaceQuickJsFileV1[],
  afterFiles: readonly BrowserWorkspaceQuickJsFileV1[],
): readonly BrowserWorkspaceQuickJsChangeV1[] {
  const before = new Map(beforeFiles.map((file) => [file.path, file.text] as const));
  const after = new Map(afterFiles.map((file) => [file.path, file.text] as const));
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort();
  const changes: BrowserWorkspaceQuickJsChangeV1[] = [];
  for (const path of paths) {
    const beforeText = before.get(path);
    const afterText = after.get(path);
    if (beforeText === afterText) continue;
    changes.push(Object.freeze({
      path,
      kind: beforeText === undefined ? "created" : afterText === undefined ? "deleted" : "updated",
      before: beforeText ?? null,
      after: afterText ?? null,
    }));
  }
  if (changes.length > browserWorkspaceQuickJsChangedPathMaximumV1) {
    throw new BrowserWorkspaceQuickJsFailureV1(
      "output_limit",
      "QuickJS changed too many paths",
    );
  }
  if (
    browserWorkspaceQuickJsByteLengthV1(JSON.stringify(changes)) >
      browserWorkspaceQuickJsDiffMaximumBytesV1
  ) {
    throw new BrowserWorkspaceQuickJsFailureV1(
      "output_limit",
      "QuickJS diff exceeded its wire bound",
    );
  }
  return Object.freeze(changes);
}

function admitChangeV1(value: unknown): BrowserWorkspaceQuickJsChangeV1 | null {
  const record = exactRecordV1(value, ["path", "kind", "before", "after"]);
  if (record === null) return null;
  const path = canonicalBrowserWorkspaceQuickJsPathV1(record.path);
  if (path === null || !["created", "updated", "deleted"].includes(String(record.kind))) {
    return null;
  }
  if (
    record.before !== null &&
    (typeof record.before !== "string" ||
      browserWorkspaceQuickJsByteLengthV1(record.before) >
        browserWorkspaceQuickJsFileMaximumBytesV1)
  ) return null;
  if (
    record.after !== null &&
    (typeof record.after !== "string" ||
      browserWorkspaceQuickJsByteLengthV1(record.after) >
        browserWorkspaceQuickJsFileMaximumBytesV1)
  ) return null;
  if (
    record.kind === "created" && (record.before !== null || typeof record.after !== "string") ||
    record.kind === "updated" &&
      (typeof record.before !== "string" || typeof record.after !== "string") ||
    record.kind === "deleted" && (typeof record.before !== "string" || record.after !== null)
  ) return null;
  return Object.freeze({
    path,
    kind: record.kind as BrowserWorkspaceQuickJsChangeV1["kind"],
    before: record.before as string | null,
    after: record.after as string | null,
  });
}

function admitChangesV1(value: unknown): readonly BrowserWorkspaceQuickJsChangeV1[] | null {
  if (!Array.isArray(value) || value.length > browserWorkspaceQuickJsChangedPathMaximumV1) {
    return null;
  }
  const changes: BrowserWorkspaceQuickJsChangeV1[] = [];
  let previousPath = "";
  for (const candidate of value) {
    const change = admitChangeV1(candidate);
    if (change === null || change.path <= previousPath) return null;
    previousPath = change.path;
    changes.push(change);
  }
  return browserWorkspaceQuickJsByteLengthV1(JSON.stringify(changes)) <=
      browserWorkspaceQuickJsDiffMaximumBytesV1
    ? Object.freeze(changes)
    : null;
}

export function admitBrowserWorkspaceQuickJsResponseV1(
  value: unknown,
  expected: Readonly<{ requestId: number; buildIdentity: string }>,
): BrowserWorkspaceQuickJsResponseV1 | null {
  if (typeof value !== "object" || value === null || !("ok" in value)) return null;
  const okDescriptor = Object.getOwnPropertyDescriptor(value, "ok");
  if (okDescriptor === undefined || !("value" in okDescriptor)) return null;
  if (okDescriptor.value === true) {
    const record = exactRecordV1(value, [
      "revision",
      "kind",
      "requestId",
      "buildIdentity",
      "ok",
      "response",
    ]);
    const response = exactRecordV1(record?.response, [
      "changes",
      "stdout",
      "moduleStartupMilliseconds",
      "executionMilliseconds",
      "runtimeAllocatorLimitBytes",
      "wasmLinearMemoryBytes",
      "stackLimitBytes",
    ]);
    const changes = admitChangesV1(response?.changes);
    if (
      record === null || record.revision !== 1 || record.kind !== "quickjs_result" ||
      record.requestId !== expected.requestId || record.buildIdentity !== expected.buildIdentity ||
      record.ok !== true || response === null || changes === null ||
      typeof response.stdout !== "string" ||
      browserWorkspaceQuickJsByteLengthV1(response.stdout) >
        browserWorkspaceQuickJsStdoutMaximumBytesV1 ||
      !finiteNonNegativeNumberV1(response.moduleStartupMilliseconds) ||
      !finiteNonNegativeNumberV1(response.executionMilliseconds) ||
      response.runtimeAllocatorLimitBytes !== browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1 ||
      response.wasmLinearMemoryBytes !== browserWorkspaceQuickJsWasmLinearMemoryBytesV1 ||
      response.stackLimitBytes !== browserWorkspaceQuickJsStackLimitBytesV1
    ) return null;
    return Object.freeze({
      revision: 1,
      kind: "quickjs_result",
      requestId: expected.requestId,
      buildIdentity: expected.buildIdentity,
      ok: true,
      response: Object.freeze({
        changes,
        stdout: response.stdout,
        moduleStartupMilliseconds: response.moduleStartupMilliseconds,
        executionMilliseconds: response.executionMilliseconds,
        runtimeAllocatorLimitBytes: browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1,
        wasmLinearMemoryBytes: browserWorkspaceQuickJsWasmLinearMemoryBytesV1,
        stackLimitBytes: browserWorkspaceQuickJsStackLimitBytesV1,
      }),
    });
  }
  const record = exactRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "buildIdentity",
    "ok",
    "code",
    "wasmLinearMemoryBytes",
  ]);
  const codes: readonly BrowserWorkspaceQuickJsFailureCodeV1[] = [
    "invalid_request",
    "async_unsupported",
    "deadline_exceeded",
    "memory_limit",
    "output_limit",
    "execution_failed",
  ];
  if (
    record === null || record.revision !== 1 || record.kind !== "quickjs_result" ||
    record.requestId !== expected.requestId || record.buildIdentity !== expected.buildIdentity ||
    record.ok !== false || !codes.includes(record.code as BrowserWorkspaceQuickJsFailureCodeV1) ||
    (record.wasmLinearMemoryBytes !== null &&
      record.wasmLinearMemoryBytes !== browserWorkspaceQuickJsWasmLinearMemoryBytesV1)
  ) return null;
  return Object.freeze({
    revision: 1,
    kind: "quickjs_result",
    requestId: expected.requestId,
    buildIdentity: expected.buildIdentity,
    ok: false,
    code: record.code as BrowserWorkspaceQuickJsFailureCodeV1,
    wasmLinearMemoryBytes: record.wasmLinearMemoryBytes as number | null,
  });
}

export function browserWorkspaceQuickJsGuestBootstrapV1(
  request: BrowserWorkspaceQuickJsRequestV1,
): string {
  const files = JSON.stringify(request.files.map((file) => [file.path, file.text] as const));
  const argv = JSON.stringify(request.argv);
  const stdin = JSON.stringify(request.stdin);
  return `
"use strict";
(() => {
  const files = new Map(${files});
  const stdout = [];
  const utf8Bytes = (text) => {
    let bytes = 0;
    for (let index = 0; index < text.length; index += 1) {
      const point = text.codePointAt(index);
      if (point > 0xffff) index += 1;
      bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    }
    return bytes;
  };
  const normalizePath = (input) => {
    if (typeof input !== "string" || input.includes("\\\\") || input.includes("\\0")) {
      throw new TypeError("invalid workspace path");
    }
    const path = input.startsWith("/") ? input : "/workspace/" + input;
    if (utf8Bytes(path) > ${String(pathMaximumBytesV1)} || !path.startsWith("/workspace/")) {
      throw new TypeError("invalid workspace path");
    }
    const parts = path.split("/");
    if (parts.length < 3 || parts.slice(2).some((part) => !part || part === "." || part === "..")) {
      throw new TypeError("invalid workspace path");
    }
    return path;
  };
  const workspaceBytes = (replacementPath, replacementText) => {
    let total = 0;
    for (const [path, text] of files) {
      total += utf8Bytes(path === replacementPath ? replacementText : text);
    }
    if (!files.has(replacementPath)) total += utf8Bytes(replacementText);
    return total;
  };
  const workspace = Object.freeze({
    readFile(input) {
      const path = normalizePath(input);
      if (!files.has(path)) throw new Error("workspace file not found");
      return files.get(path);
    },
    writeFile(input, text) {
      const path = normalizePath(input);
      if (typeof text !== "string" || utf8Bytes(text) > ${
    String(browserWorkspaceQuickJsFileMaximumBytesV1)
  }) {
        throw new RangeError("workspace file limit exceeded");
      }
      if (!files.has(path) && files.size >= ${String(browserWorkspaceQuickJsFileMaximumV1)}) {
        throw new RangeError("workspace file count exceeded");
      }
      if (workspaceBytes(path, text) > ${String(browserWorkspaceQuickJsWorkspaceMaximumBytesV1)}) {
        throw new RangeError("workspace size exceeded");
      }
      files.set(path, text);
    },
    listFiles() {
      return Array.from(files.keys()).sort();
    },
  });
  const print = (...values) => {
    const line = values.map((value) => String(value)).join(" ") + "\\n";
    const next = stdout.join("") + line;
    if (utf8Bytes(next) > ${String(browserWorkspaceQuickJsStdoutMaximumBytesV1)}) {
      throw new RangeError("stdout limit exceeded");
    }
    stdout.push(line);
  };
  const snapshot = () => ({
    files: Array.from(files, ([path, text]) => ({ path, text })),
    stdout: stdout.join(""),
  });
  Object.defineProperties(globalThis, {
    workspace: { value: workspace, enumerable: true, writable: false, configurable: false },
    argv: { value: Object.freeze(${argv}), enumerable: true, writable: false, configurable: false },
    stdin: { value: ${stdin}, enumerable: true, writable: false, configurable: false },
    print: { value: print, enumerable: true, writable: false, configurable: false },
    __sillyosQuickJsSnapshotV1: {
      value: snapshot,
      enumerable: false,
      writable: false,
      configurable: false,
    },
  });
})();
`;
}
