// SPDX-License-Identifier: MIT
import {
  defineCommand,
  type Command,
  type ExecResult,
  type ResolvedCommandContext,
} from "just-bash/browser";

import { browserWorkspaceSandboxArtifactBuildIdentityV1 } from "./browser-workspace-sandbox-build-identity.ts";
import {
  admitBrowserWorkspaceQuickJsRequestV1,
  admitBrowserWorkspaceQuickJsResponseV1,
  browserWorkspaceQuickJsFileMaximumBytesV1,
  browserWorkspaceQuickJsOuterWatchdogMillisecondsV1,
  canonicalBrowserWorkspaceQuickJsPathV1,
  type BrowserWorkspaceQuickJsFileV1,
  type BrowserWorkspaceQuickJsFailureResponseV1,
  type BrowserWorkspaceQuickJsRequestV1,
  type BrowserWorkspaceQuickJsResponseV1,
  type BrowserWorkspaceQuickJsSuccessResponseV1,
} from "./browser-workspace-quickjs-protocol.ts";

const usageV1 = "Usage: qjs [--file PATH]... SCRIPT [ARG...]\n";
const fatalUtf8DecoderV1 = new TextDecoder("utf-8", { fatal: true });

export interface BrowserWorkspaceQuickJsWorkerV1 {
  postMessage(message: BrowserWorkspaceQuickJsRequestV1): void;
  addEventListener(
    type: "message" | "messageerror" | "error",
    listener: EventListenerOrEventListenerObject,
  ): void;
  removeEventListener(
    type: "message" | "messageerror" | "error",
    listener: EventListenerOrEventListenerObject,
  ): void;
  terminate(): void;
}

export type BrowserWorkspaceQuickJsWorkerRunResultV1 =
  | { readonly kind: "completed"; readonly response: BrowserWorkspaceQuickJsResponseV1 }
  | { readonly kind: "aborted" | "wall_timeout" | "worker_failed" };

type TimerHandleV1 = ReturnType<typeof setTimeout>;

export interface BrowserWorkspaceQuickJsWorkerRunnerOptionsV1 {
  readonly createWorker?: () => BrowserWorkspaceQuickJsWorkerV1;
  readonly watchdogMilliseconds?: number;
  readonly setTimer?: (callback: () => void, milliseconds: number) => TimerHandleV1;
  readonly clearTimer?: (handle: TimerHandleV1) => void;
}

function createProductQuickJsWorkerV1(): BrowserWorkspaceQuickJsWorkerV1 {
  return new Worker(
    new URL("../workspace-sandbox/browser-workspace-quickjs.worker.ts", import.meta.url),
    { type: "module", name: "sillyos-workspace-qjs-v1" },
  );
}

/**
 * Run one exact request in a fresh child Worker. Every terminal path first
 * terminates the Worker, so guest code cannot continue after the caller sees a
 * result, abort, error, or outer wall-clock deadline.
 */
export async function runBrowserWorkspaceQuickJsWorkerV1(
  request: BrowserWorkspaceQuickJsRequestV1,
  signal: AbortSignal,
  options: BrowserWorkspaceQuickJsWorkerRunnerOptionsV1 = {},
): Promise<BrowserWorkspaceQuickJsWorkerRunResultV1> {
  const createWorker = options.createWorker ?? createProductQuickJsWorkerV1;
  const watchdogMilliseconds = options.watchdogMilliseconds ??
    browserWorkspaceQuickJsOuterWatchdogMillisecondsV1;
  const setTimer = options.setTimer ??
    ((callback: () => void, milliseconds: number): TimerHandleV1 =>
      globalThis.setTimeout(callback, milliseconds));
  const clearTimer = options.clearTimer ??
    ((handle: TimerHandleV1): void => globalThis.clearTimeout(handle));
  return await new Promise((resolve) => {
    let worker: BrowserWorkspaceQuickJsWorkerV1 | null = null;
    let settled = false;
    let terminated = false;
    let watchdogHandle: TimerHandleV1 | null = null;
    const terminate = (): void => {
      if (terminated) return;
      terminated = true;
      worker?.terminate();
    };
    const removeListeners = (): void => {
      signal.removeEventListener("abort", onAbort);
      worker?.removeEventListener("message", onMessage);
      worker?.removeEventListener("messageerror", onMessageError);
      worker?.removeEventListener("error", onError);
    };
    const settle = (result: BrowserWorkspaceQuickJsWorkerRunResultV1): void => {
      if (settled) return;
      settled = true;
      // Termination is intentionally first. No validation or diff work happens
      // while the child can still post a late continuation.
      terminate();
      if (watchdogHandle !== null) clearTimer(watchdogHandle);
      removeListeners();
      resolve(result);
    };
    const onAbort = (): void => settle({ kind: "aborted" });
    const onMessage = (event: Event): void => {
      const data = (event as MessageEvent<unknown>).data;
      terminate();
      const response = admitBrowserWorkspaceQuickJsResponseV1(data, {
        requestId: request.requestId,
        buildIdentity: request.buildIdentity,
      });
      settle(response === null ? { kind: "worker_failed" } : { kind: "completed", response });
    };
    const onMessageError = (): void => settle({ kind: "worker_failed" });
    const onError = (event: Event): void => {
      event.preventDefault();
      settle({ kind: "worker_failed" });
    };
    watchdogHandle = setTimer(
      () => settle({ kind: "wall_timeout" }),
      watchdogMilliseconds,
    );
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    try {
      worker = createWorker();
      worker.addEventListener("message", onMessage);
      worker.addEventListener("messageerror", onMessageError);
      worker.addEventListener("error", onError);
      if (signal.aborted) {
        onAbort();
        return;
      }
      // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker.postMessage has no targetOrigin argument.
      worker.postMessage(request);
    } catch {
      settle({ kind: "worker_failed" });
    }
  });
}

interface ParsedQuickJsCommandV1 {
  readonly script: string;
  readonly files: readonly string[];
  readonly argv: readonly string[];
}

function parseQuickJsCommandV1(args: readonly string[]): ParsedQuickJsCommandV1 | null {
  let index = 0;
  const files: string[] = [];
  while (index < args.length) {
    const argument = args[index];
    if (argument === "--") {
      index += 1;
      break;
    }
    if (argument === "--file") {
      const path = args[index + 1];
      if (path === undefined) return null;
      files.push(path);
      index += 2;
      continue;
    }
    if (argument?.startsWith("--file=")) {
      const path = argument.slice("--file=".length);
      if (path.length === 0) return null;
      files.push(path);
      index += 1;
      continue;
    }
    if (argument?.startsWith("-")) return null;
    break;
  }
  const script = args[index];
  return script === undefined ? null : { script, files, argv: args.slice(index + 1) };
}

function resolvedWorkspacePathV1(context: ResolvedCommandContext, input: string): string {
  const resolved = context.fs.resolvePath(context.cwd, input);
  const canonical = canonicalBrowserWorkspaceQuickJsPathV1(resolved);
  if (canonical === null) throw new TypeError("qjs path is outside /workspace");
  return canonical;
}

function fatalUtf8TextV1(bytes: Uint8Array): string {
  return fatalUtf8DecoderV1.decode(bytes);
}

function stdinTextV1(value: string): string {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return fatalUtf8TextV1(bytes);
}

async function readStagedFileV1(
  context: ResolvedCommandContext,
  path: string,
): Promise<BrowserWorkspaceQuickJsFileV1> {
  const metadata = await context.fs.stat(path);
  if (!metadata.isFile || metadata.size > browserWorkspaceQuickJsFileMaximumBytesV1) {
    throw new TypeError("qjs staged path is not a bounded text file");
  }
  return { path, text: fatalUtf8TextV1(await context.fs.readFileBuffer(path)) };
}

async function createQuickJsRequestV1(
  parsed: ParsedQuickJsCommandV1,
  context: ResolvedCommandContext,
): Promise<BrowserWorkspaceQuickJsRequestV1> {
  context.executionScope?.throwIfAborted("qjs staging");
  const scriptPath = resolvedWorkspacePathV1(context, parsed.script);
  const paths = new Set<string>([scriptPath]);
  for (const file of parsed.files) paths.add(resolvedWorkspacePathV1(context, file));
  const files: BrowserWorkspaceQuickJsFileV1[] = [];
  for (const path of [...paths].sort()) {
    context.executionScope?.throwIfAborted("qjs staging");
    files.push(await readStagedFileV1(context, path));
  }
  const source = files.find((file) => file.path === scriptPath)?.text;
  if (source === undefined) throw new TypeError("qjs script is unavailable");
  const request = admitBrowserWorkspaceQuickJsRequestV1({
    revision: 1,
    kind: "quickjs_execute",
    requestId: 1,
    buildIdentity: browserWorkspaceSandboxArtifactBuildIdentityV1,
    source,
    argv: parsed.argv,
    stdin: stdinTextV1(String(context.stdin)),
    files,
  });
  if (request === null) throw new TypeError("qjs input is outside fixed limits");
  return request;
}

function parentPathV1(path: string): string {
  const separator = path.lastIndexOf("/");
  return separator <= "/workspace".length ? "/workspace" : path.slice(0, separator);
}

async function preflightQuickJsChangesV1(
  response: BrowserWorkspaceQuickJsSuccessResponseV1,
  request: BrowserWorkspaceQuickJsRequestV1,
  context: ResolvedCommandContext,
): Promise<void> {
  const staged = new Map(request.files.map((file) => [file.path, file.text] as const));
  const parents = new Set<string>();
  for (const change of response.response.changes) {
    context.executionScope?.throwIfAborted("qjs diff preflight");
    if (change.kind === "deleted") {
      throw new TypeError("qjs deletion is not supported by this execution profile");
    }
    const exists = await context.fs.exists(change.path);
    if (change.kind === "created") {
      if (exists || staged.has(change.path) || change.before !== null) {
        throw new TypeError("qjs create target is not current");
      }
    } else {
      const stagedBefore = staged.get(change.path);
      if (!exists || stagedBefore === undefined || stagedBefore !== change.before) {
        throw new TypeError("qjs update target is not current");
      }
      const metadata = await context.fs.stat(change.path);
      if (!metadata.isFile || metadata.size > browserWorkspaceQuickJsFileMaximumBytesV1) {
        throw new TypeError("qjs update target is not a bounded text file");
      }
      const current = fatalUtf8TextV1(await context.fs.readFileBuffer(change.path));
      if (current !== change.before) throw new TypeError("qjs update target changed after staging");
    }
    parents.add(parentPathV1(change.path));
  }
  for (const parent of [...parents].sort()) {
    const metadata = await context.fs.stat(parent);
    if (!metadata.isDirectory) throw new TypeError("qjs output parent is unavailable");
  }
}

async function applyQuickJsChangesV1(
  response: BrowserWorkspaceQuickJsSuccessResponseV1,
  context: ResolvedCommandContext,
): Promise<void> {
  for (const change of response.response.changes) {
    context.executionScope?.throwIfAborted("qjs diff commit");
    if (change.after === null) throw new TypeError("qjs deletion is not supported");
    await context.fs.writeFile(change.path, change.after, "utf8");
  }
}

function commandFailureV1(message: string, exitCode = 1): ExecResult {
  return { stdout: "", stderr: `qjs: ${message}\n`, exitCode };
}

function workerFailureMessageV1(response: BrowserWorkspaceQuickJsFailureResponseV1): string {
  const diagnostic = response.diagnostic;
  if (diagnostic !== null) {
    const location = diagnostic.line === null
      ? ""
      : ` at ${String(diagnostic.line)}${
        diagnostic.column === null ? "" : `:${String(diagnostic.column)}`
      }`;
    return `${diagnostic.kind}${location}: ${diagnostic.message}`;
  }
  return response.code === "deadline_exceeded"
    ? "guest deadline exceeded"
    : response.code.replaceAll("_", " ");
}

async function executeQuickJsCommandV1(
  args: string[],
  context: ResolvedCommandContext,
  runWorker: typeof runBrowserWorkspaceQuickJsWorkerV1,
): Promise<ExecResult> {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    return { stdout: usageV1, stderr: "", exitCode: 0 };
  }
  const parsed = parseQuickJsCommandV1(args);
  if (parsed === null) return { stdout: "", stderr: usageV1, exitCode: 2 };
  try {
    const request = await createQuickJsRequestV1(parsed, context);
    const result = await runWorker(
      request,
      context.signal ?? new AbortController().signal,
    );
    if (result.kind === "aborted") {
      context.executionScope?.throwIfAborted("qjs child Worker");
      return commandFailureV1("execution aborted", 130);
    }
    if (result.kind === "wall_timeout") return commandFailureV1("wall-clock limit exceeded", 124);
    if (result.kind === "worker_failed") return commandFailureV1("Worker execution failed");
    if (result.kind !== "completed") return commandFailureV1("Worker execution failed");
    if (!result.response.ok) {
      return commandFailureV1(
        workerFailureMessageV1(result.response),
        result.response.code === "deadline_exceeded" ? 124 : 1,
      );
    }
    await preflightQuickJsChangesV1(result.response, request, context);
    context.executionScope?.throwIfAborted("qjs diff commit");
    await applyQuickJsChangesV1(result.response, context);
    return { stdout: result.response.response.stdout, stderr: "", exitCode: 0 };
  } catch (error) {
    context.executionScope?.throwIfAborted("qjs failure");
    return commandFailureV1(error instanceof TypeError ? error.message : "execution failed");
  }
}

/** Product-shipped trusted broker; guest JavaScript runs only in the child Worker. */
export function createBrowserWorkspaceQuickJsCommandV1(
  runWorker: typeof runBrowserWorkspaceQuickJsWorkerV1 = runBrowserWorkspaceQuickJsWorkerV1,
): Command {
  return defineCommand(
    "qjs",
    async (args, context) => await executeQuickJsCommandV1(args, context, runWorker),
    { trusted: true },
  );
}

export const browserWorkspaceQuickJsCommandV1: Command = createBrowserWorkspaceQuickJsCommandV1();
