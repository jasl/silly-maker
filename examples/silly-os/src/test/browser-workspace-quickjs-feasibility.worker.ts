// SPDX-License-Identifier: MIT

import quickJsVariant from "@jitl/quickjs-singlefile-browser-release-sync";
import {
  DefaultIntrinsics,
  newQuickJSWASMModuleFromVariant,
  newVariant,
} from "quickjs-emscripten-core";

export const quickJsFeasibilitySourceMaximumBytesV1 = 64 * 1_024;
export const quickJsFeasibilityArgvMaximumV1 = 32;
export const quickJsFeasibilityArgMaximumBytesV1 = 4 * 1_024;
export const quickJsFeasibilityArgvMaximumBytesV1 = 16 * 1_024;
export const quickJsFeasibilityStdinMaximumBytesV1 = 64 * 1_024;
export const quickJsFeasibilityFileMaximumV1 = 32;
export const quickJsFeasibilityFileMaximumBytesV1 = 256 * 1_024;
export const quickJsFeasibilityWorkspaceMaximumBytesV1 = 1 * 1_024 * 1_024;
export const quickJsFeasibilityChangedPathMaximumV1 = 16;
export const quickJsFeasibilityDiffMaximumBytesV1 = 256 * 1_024;
export const quickJsFeasibilityStdoutMaximumBytesV1 = 64 * 1_024;
// This allocator budget does not include the staged host Map, source, response,
// Worker module JavaScript, or other browser-owned memory.
export const quickJsFeasibilityRuntimeAllocatorLimitBytesV1 = 12 * 1_024 * 1_024;
export const quickJsFeasibilityWasmLinearMemoryBytesV1 = 16 * 1_024 * 1_024;
export const quickJsFeasibilityStackLimitBytesV1 = 512 * 1_024;
export const quickJsFeasibilityDeadlineMillisecondsV1 = 2_000;

const pathMaximumBytesV1 = 1_024;
const requestIdMaximumV1 = 0x7fff_ffff;
const encoderV1 = new TextEncoder();

export interface QuickJsFeasibilityFileV1 {
  readonly path: string;
  readonly text: string;
}

export interface QuickJsFeasibilityRequestV1 {
  readonly revision: 1;
  readonly kind: "quickjs_feasibility_execute";
  readonly requestId: number;
  readonly source: string;
  readonly argv: readonly string[];
  readonly stdin: string;
  readonly files: readonly QuickJsFeasibilityFileV1[];
}

export interface QuickJsFeasibilityChangeV1 {
  readonly path: string;
  readonly kind: "created" | "updated" | "deleted";
  readonly before: string | null;
  readonly after: string | null;
}

export interface QuickJsFeasibilitySuccessResponseV1 {
  readonly revision: 1;
  readonly kind: "quickjs_feasibility_result";
  readonly requestId: number;
  readonly ok: true;
  readonly response: {
    readonly changes: readonly QuickJsFeasibilityChangeV1[];
    readonly stdout: string;
    readonly moduleStartupMilliseconds: number;
    readonly executionMilliseconds: number;
    readonly runtimeAllocatorLimitBytes: number;
    readonly wasmLinearMemoryBytes: number;
    readonly stackLimitBytes: number;
  };
}

export type QuickJsFeasibilityFailureCodeV1 =
  | "invalid_request"
  | "async_unsupported"
  | "deadline_exceeded"
  | "memory_limit"
  | "output_limit"
  | "execution_failed";

export interface QuickJsFeasibilityFailureResponseV1 {
  readonly revision: 1;
  readonly kind: "quickjs_feasibility_result";
  readonly requestId: number | null;
  readonly ok: false;
  readonly code: QuickJsFeasibilityFailureCodeV1;
  readonly wasmLinearMemoryBytes: number | null;
}

export type QuickJsFeasibilityResponseV1 =
  | QuickJsFeasibilitySuccessResponseV1
  | QuickJsFeasibilityFailureResponseV1;

interface QuickJsFeasibilitySnapshotV1 {
  readonly files: readonly QuickJsFeasibilityFileV1[];
  readonly stdout: string;
}

class QuickJsFeasibilityFailureV1 extends Error {
  readonly code: Exclude<QuickJsFeasibilityFailureCodeV1, "invalid_request">;
  wasmLinearMemoryBytes: number | null = null;

  constructor(
    code: Exclude<QuickJsFeasibilityFailureCodeV1, "invalid_request">,
    message: string,
  ) {
    super(message);
    this.name = "QuickJsFeasibilityFailureV1";
    this.code = code;
  }
}

function byteLengthV1(value: string): number {
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

export function canonicalQuickJsWorkspacePathV1(value: unknown): string | null {
  if (typeof value !== "string" || byteLengthV1(value) > pathMaximumBytesV1) return null;
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

function admitFileV1(value: unknown): QuickJsFeasibilityFileV1 | null {
  const record = exactRecordV1(value, ["path", "text"]);
  if (record === null) return null;
  const path = canonicalQuickJsWorkspacePathV1(record.path);
  if (
    path === null || typeof record.text !== "string" ||
    byteLengthV1(record.text) > quickJsFeasibilityFileMaximumBytesV1
  ) return null;
  return Object.freeze({ path, text: record.text });
}

export function admitQuickJsFeasibilityRequestV1(
  value: unknown,
): QuickJsFeasibilityRequestV1 | null {
  const record = exactRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "source",
    "argv",
    "stdin",
    "files",
  ]);
  if (
    record === null || record.revision !== 1 || record.kind !== "quickjs_feasibility_execute" ||
    !Number.isSafeInteger(record.requestId) || (record.requestId as number) < 1 ||
    (record.requestId as number) > requestIdMaximumV1 || typeof record.source !== "string" ||
    byteLengthV1(record.source) > quickJsFeasibilitySourceMaximumBytesV1 ||
    !Array.isArray(record.argv) || record.argv.length > quickJsFeasibilityArgvMaximumV1 ||
    typeof record.stdin !== "string" ||
    byteLengthV1(record.stdin) > quickJsFeasibilityStdinMaximumBytesV1 ||
    !Array.isArray(record.files) || record.files.length > quickJsFeasibilityFileMaximumV1
  ) return null;

  let argvBytes = 0;
  const argv: string[] = [];
  for (const arg of record.argv) {
    if (typeof arg !== "string") return null;
    const bytes = byteLengthV1(arg);
    if (bytes > quickJsFeasibilityArgMaximumBytesV1) return null;
    argvBytes += bytes;
    if (argvBytes > quickJsFeasibilityArgvMaximumBytesV1) return null;
    argv.push(arg);
  }

  let workspaceBytes = 0;
  const paths = new Set<string>();
  const files: QuickJsFeasibilityFileV1[] = [];
  for (const candidate of record.files) {
    const file = admitFileV1(candidate);
    if (file === null || paths.has(file.path)) return null;
    paths.add(file.path);
    workspaceBytes += byteLengthV1(file.text);
    if (workspaceBytes > quickJsFeasibilityWorkspaceMaximumBytesV1) return null;
    files.push(file);
  }

  return Object.freeze({
    revision: 1,
    kind: "quickjs_feasibility_execute",
    requestId: record.requestId as number,
    source: record.source,
    argv: Object.freeze(argv),
    stdin: record.stdin,
    files: Object.freeze(files),
  });
}

function admitSnapshotV1(value: unknown): QuickJsFeasibilitySnapshotV1 | null {
  const record = exactRecordV1(value, ["files", "stdout"]);
  if (
    record === null || !Array.isArray(record.files) ||
    record.files.length > quickJsFeasibilityFileMaximumV1 || typeof record.stdout !== "string" ||
    byteLengthV1(record.stdout) > quickJsFeasibilityStdoutMaximumBytesV1
  ) return null;
  let workspaceBytes = 0;
  const paths = new Set<string>();
  const files: QuickJsFeasibilityFileV1[] = [];
  for (const candidate of record.files) {
    const file = admitFileV1(candidate);
    if (file === null || paths.has(file.path)) return null;
    paths.add(file.path);
    workspaceBytes += byteLengthV1(file.text);
    if (workspaceBytes > quickJsFeasibilityWorkspaceMaximumBytesV1) return null;
    files.push(file);
  }
  return Object.freeze({ files: Object.freeze(files), stdout: record.stdout });
}

export function exactQuickJsFeasibilityDiffV1(
  beforeFiles: readonly QuickJsFeasibilityFileV1[],
  afterFiles: readonly QuickJsFeasibilityFileV1[],
): readonly QuickJsFeasibilityChangeV1[] {
  const before = new Map(beforeFiles.map((file) => [file.path, file.text] as const));
  const after = new Map(afterFiles.map((file) => [file.path, file.text] as const));
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort();
  const changes: QuickJsFeasibilityChangeV1[] = [];
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
  if (changes.length > quickJsFeasibilityChangedPathMaximumV1) {
    throw new QuickJsFeasibilityFailureV1(
      "output_limit",
      "QuickJS feasibility changed too many paths",
    );
  }
  if (byteLengthV1(JSON.stringify(changes)) > quickJsFeasibilityDiffMaximumBytesV1) {
    throw new QuickJsFeasibilityFailureV1(
      "output_limit",
      "QuickJS feasibility diff exceeded its wire bound",
    );
  }
  return Object.freeze(changes);
}

export function quickJsFeasibilityGuestBootstrapV1(
  request: QuickJsFeasibilityRequestV1,
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
    String(quickJsFeasibilityFileMaximumBytesV1)
  }) {
        throw new RangeError("workspace file limit exceeded");
      }
      if (!files.has(path) && files.size >= ${String(quickJsFeasibilityFileMaximumV1)}) {
        throw new RangeError("workspace file count exceeded");
      }
      if (workspaceBytes(path, text) > ${String(quickJsFeasibilityWorkspaceMaximumBytesV1)}) {
        throw new RangeError("workspace size exceeded");
      }
      files.set(path, text);
    },
    deleteFile(input) {
      return files.delete(normalizePath(input));
    },
    listFiles() {
      return Array.from(files.keys()).sort();
    },
  });
  const print = (...values) => {
    const line = values.map((value) => String(value)).join(" ") + "\\n";
    const next = stdout.join("") + line;
    if (utf8Bytes(next) > ${String(quickJsFeasibilityStdoutMaximumBytesV1)}) {
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

function executionFailureCodeV1(
  errorValue: unknown,
  deadlineTriggered: boolean,
): Exclude<QuickJsFeasibilityFailureCodeV1, "invalid_request"> {
  if (deadlineTriggered) return "deadline_exceeded";
  const message = typeof errorValue === "object" && errorValue !== null &&
      "message" in errorValue && typeof errorValue.message === "string"
    ? errorValue.message
    : "";
  return /out of memory|memory limit/iu.test(message) ? "memory_limit" : "execution_failed";
}

export async function executeQuickJsFeasibilityV1(
  request: QuickJsFeasibilityRequestV1,
): Promise<QuickJsFeasibilitySuccessResponseV1> {
  const fixedWasmMemory = new WebAssembly.Memory({ initial: 256, maximum: 256 });
  const fixedVariant = newVariant(quickJsVariant, { wasmMemory: fixedWasmMemory });
  const moduleStarted = performance.now();
  const quickJs = await newQuickJSWASMModuleFromVariant(fixedVariant);
  const moduleStartupMilliseconds = performance.now() - moduleStarted;
  const executionStarted = performance.now();
  const deadline = executionStarted + quickJsFeasibilityDeadlineMillisecondsV1;
  let deadlineTriggered = false;
  try {
    const runtime = quickJs.newRuntime({
      memoryLimitBytes: quickJsFeasibilityRuntimeAllocatorLimitBytesV1,
      maxStackSizeBytes: quickJsFeasibilityStackLimitBytesV1,
      interruptHandler: () => {
        deadlineTriggered = performance.now() >= deadline;
        return deadlineTriggered;
      },
    });
    const context = runtime.newContext({ intrinsics: DefaultIntrinsics });
    try {
      const bootstrapResult = context.evalCode(
        quickJsFeasibilityGuestBootstrapV1(request),
        "sillyos:q0-bootstrap",
        { type: "global", strict: true },
      );
      if (bootstrapResult.error !== undefined) {
        const error = context.dump(bootstrapResult.error);
        bootstrapResult.error.dispose();
        throw new QuickJsFeasibilityFailureV1(
          executionFailureCodeV1(error, deadlineTriggered),
          "QuickJS feasibility bootstrap failed",
        );
      }
      bootstrapResult.value.dispose();

      const sourceResult = context.evalCode(request.source, "workspace-script.js", {
        type: "global",
        strict: true,
      });
      if (sourceResult.error !== undefined) {
        const error = context.dump(sourceResult.error);
        sourceResult.error.dispose();
        throw new QuickJsFeasibilityFailureV1(
          executionFailureCodeV1(error, deadlineTriggered),
          "QuickJS feasibility source failed",
        );
      }
      sourceResult.value.dispose();
      if (runtime.hasPendingJob()) {
        throw new QuickJsFeasibilityFailureV1(
          "async_unsupported",
          "QuickJS feasibility supports synchronous scripts only",
        );
      }

      const snapshotResult = context.evalCode(
        "globalThis.__sillyosQuickJsSnapshotV1()",
        "sillyos:q0-snapshot",
        { type: "global", strict: true },
      );
      if (snapshotResult.error !== undefined) {
        const error = context.dump(snapshotResult.error);
        snapshotResult.error.dispose();
        throw new QuickJsFeasibilityFailureV1(
          executionFailureCodeV1(error, deadlineTriggered),
          "QuickJS feasibility snapshot failed",
        );
      }
      const rawSnapshot = context.dump(snapshotResult.value);
      snapshotResult.value.dispose();
      if (runtime.hasPendingJob()) {
        throw new QuickJsFeasibilityFailureV1(
          "async_unsupported",
          "QuickJS feasibility supports synchronous scripts only",
        );
      }
      const snapshot = admitSnapshotV1(rawSnapshot);
      if (snapshot === null) {
        throw new QuickJsFeasibilityFailureV1(
          "output_limit",
          "QuickJS feasibility snapshot was outside its bounds",
        );
      }
      return {
        revision: 1,
        kind: "quickjs_feasibility_result",
        requestId: request.requestId,
        ok: true,
        response: {
          changes: exactQuickJsFeasibilityDiffV1(request.files, snapshot.files),
          stdout: snapshot.stdout,
          moduleStartupMilliseconds,
          executionMilliseconds: performance.now() - executionStarted,
          runtimeAllocatorLimitBytes: quickJsFeasibilityRuntimeAllocatorLimitBytesV1,
          wasmLinearMemoryBytes: fixedWasmMemory.buffer.byteLength,
          stackLimitBytes: quickJsFeasibilityStackLimitBytesV1,
        },
      };
    } finally {
      context.dispose();
      runtime.dispose();
    }
  } catch (error) {
    const failure = error instanceof QuickJsFeasibilityFailureV1
      ? error
      : new QuickJsFeasibilityFailureV1(
        "execution_failed",
        "QuickJS feasibility runtime failed",
      );
    failure.wasmLinearMemoryBytes = fixedWasmMemory.buffer.byteLength;
    throw failure;
  }
}

export function quickJsFeasibilityFailureResponseV1(
  requestId: number | null,
  error: unknown,
): QuickJsFeasibilityFailureResponseV1 {
  return {
    revision: 1,
    kind: "quickjs_feasibility_result",
    requestId,
    ok: false,
    code: error instanceof QuickJsFeasibilityFailureV1 ? error.code : "execution_failed",
    wasmLinearMemoryBytes: error instanceof QuickJsFeasibilityFailureV1
      ? error.wasmLinearMemoryBytes
      : null,
  };
}

function requestIdForFailureV1(value: unknown): number | null {
  if (typeof value !== "object" || value === null || !("requestId" in value)) return null;
  const requestId = value.requestId;
  return Number.isSafeInteger(requestId) && (requestId as number) >= 1 &&
      (requestId as number) <= requestIdMaximumV1
    ? requestId as number
    : null;
}

interface QuickJsFeasibilityWorkerScopeV1 {
  sendMessage(message: QuickJsFeasibilityResponseV1): void;
  receiveMessage(listener: (event: Readonly<{ data: unknown }>) => void): void;
  closeWorker(): void;
}

function currentQuickJsFeasibilityWorkerScopeV1(): QuickJsFeasibilityWorkerScopeV1 | null {
  const candidate = globalThis as typeof globalThis & {
    readonly document?: unknown;
    readonly postMessage?: unknown;
    readonly addEventListener?: unknown;
    readonly close?: unknown;
  };
  if (
    "document" in candidate || typeof candidate.postMessage !== "function" ||
    typeof candidate.addEventListener !== "function" || typeof candidate.close !== "function"
  ) return null;
  const postMessage = candidate.postMessage;
  const addEventListener = candidate.addEventListener;
  const close = candidate.close;
  return {
    sendMessage(message) {
      Reflect.apply(postMessage, candidate, [message]);
    },
    receiveMessage(listener) {
      Reflect.apply(addEventListener, candidate, ["message", listener]);
    },
    closeWorker() {
      Reflect.apply(close, candidate, []);
    },
  };
}

function installQuickJsFeasibilityWorkerV1(scope: QuickJsFeasibilityWorkerScopeV1): void {
  let received = false;
  const sendAndClose = (response: QuickJsFeasibilityResponseV1): void => {
    scope.sendMessage(response);
    queueMicrotask(() => scope.closeWorker());
  };
  scope.receiveMessage((event) => {
    if (received) return;
    received = true;
    const request = admitQuickJsFeasibilityRequestV1(event.data);
    if (request === null) {
      sendAndClose({
        revision: 1,
        kind: "quickjs_feasibility_result",
        requestId: requestIdForFailureV1(event.data),
        ok: false,
        code: "invalid_request",
        wasmLinearMemoryBytes: null,
      });
      return;
    }
    void executeQuickJsFeasibilityV1(request).then(
      sendAndClose,
      (error: unknown) =>
        sendAndClose(
          quickJsFeasibilityFailureResponseV1(request.requestId, error),
        ),
    );
  });
}

const workerScopeV1 = currentQuickJsFeasibilityWorkerScopeV1();
if (workerScopeV1 !== null) installQuickJsFeasibilityWorkerV1(workerScopeV1);
