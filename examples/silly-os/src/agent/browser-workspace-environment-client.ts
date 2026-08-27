// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import { err, ExecutionError, FileError, ok } from "./pi-workspace-runtime-bridge.js";
import type {
  ExecutionEnv,
  FileInfo,
  Result,
  ShellExecOptions,
} from "./pi-workspace-runtime-bridge.d.ts";

import type {
  CreatorAgentExecutionBindingV1,
  WorkspaceAgentRunV1,
  WorkspaceBeginRunRejectionCodeV1,
  WorkspaceExecutionDescriptorV1,
  WorkspaceMutationRecordV1,
  WorkspaceToolCallInputV1,
} from "../workspace/contracts.ts";
import { WorkspaceToolCallAdmissionErrorV1 } from "../workspace/contracts.ts";
import {
  admitBrowserWorkspaceHostEnvironmentOutboundMessageV1,
  type BrowserWorkspaceHostEnvironmentFailureCodeV1,
  type BrowserWorkspaceHostEnvironmentRequestRecordV1,
  type BrowserWorkspaceHostEnvironmentSuccessV1,
  type BrowserWorkspaceHostFileErrorWireV1,
  type BrowserWorkspaceHostMutationReceiptWireV1,
} from "../workspace/browser-workspace-host-protocol.ts";

interface BrowserWorkspaceMessageEventV1 {
  readonly data: unknown;
}

export interface BrowserWorkspaceEnvironmentMessagePortV1 {
  postMessage(message: unknown, transfer?: readonly Transferable[]): void;
  addEventListener(
    type: "message",
    listener: (event: BrowserWorkspaceMessageEventV1) => void,
  ): void;
  addEventListener(type: "messageerror", listener: () => void): void;
  removeEventListener(
    type: "message",
    listener: (event: BrowserWorkspaceMessageEventV1) => void,
  ): void;
  removeEventListener(type: "messageerror", listener: () => void): void;
  start(): void;
  close(): void;
}

export interface BrowserWorkspaceEnvironmentClientV1 {
  getDescriptor(): WorkspaceExecutionDescriptorV1;
  beginAgentRun(input: {
    readonly binding: CreatorAgentExecutionBindingV1;
    readonly piSessionId: string;
    readonly piRunId: string;
  }): Promise<
    | { readonly kind: "started"; readonly run: WorkspaceAgentRunV1 }
    | {
      readonly kind: "rejected";
      readonly code: WorkspaceBeginRunRejectionCodeV1;
      readonly current: WorkspaceExecutionDescriptorV1;
    }
  >;
  queryMutationRecords(): readonly WorkspaceMutationRecordV1[];
  acknowledgeMutationRecords(throughSequence: number): Promise<void>;
  dispose(): void;
}

interface PendingCallV1 {
  readonly method: BrowserWorkspaceHostEnvironmentRequestRecordV1["method"];
  readonly resolve: (response: BrowserWorkspaceHostEnvironmentSuccessV1) => void;
  readonly reject: (error: BrowserWorkspaceEnvironmentCallErrorV1) => void;
}

interface ActiveRunStateV1 {
  readonly piSessionId: string;
  readonly piRunId: string;
  readonly expectedGeneration: number;
  readonly abortController: AbortController;
  readonly toolCallIds: Set<string>;
  cursor: number;
  activeCall: Promise<unknown> | null;
  activeToolCallId: string | null;
  finished: boolean;
  drainPromise: Promise<void> | null;
}

class BrowserWorkspaceEnvironmentCallErrorV1 extends Error {
  readonly code: BrowserWorkspaceHostEnvironmentFailureCodeV1;
  readonly fileError: BrowserWorkspaceHostFileErrorWireV1 | null;

  constructor(
    code: BrowserWorkspaceHostEnvironmentFailureCodeV1,
    fileError: BrowserWorkspaceHostFileErrorWireV1 | null,
  ) {
    super(`sillyos.workspace_environment.${code}`);
    this.name = "BrowserWorkspaceEnvironmentCallErrorV1";
    this.code = code;
    this.fileError = fileError;
  }
}

function remoteFileErrorV1(
  error: BrowserWorkspaceEnvironmentCallErrorV1,
  fallbackPath?: string,
): FileError {
  const remote = error.fileError;
  if (remote === null) return new FileError("unknown", error.message, fallbackPath, error);
  return new FileError(remote.code, remote.message, remote.path ?? fallbackPath, error);
}

function localFileFailureV1(message: string, path?: string): Promise<Result<never, FileError>> {
  return Promise.resolve(err(new FileError("not_supported", message, path)));
}

function mergeAbortSignalsV1(
  runSignal: AbortSignal,
  callSignal: AbortSignal | undefined,
): { readonly signal: AbortSignal; readonly dispose: () => void } {
  if (callSignal === undefined) return { signal: runSignal, dispose: () => undefined };
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  runSignal.addEventListener("abort", abort, { once: true });
  callSignal.addEventListener("abort", abort, { once: true });
  if (runSignal.aborted || callSignal.aborted) controller.abort();
  return {
    signal: controller.signal,
    dispose: () => {
      runSignal.removeEventListener("abort", abort);
      callSignal.removeEventListener("abort", abort);
    },
  };
}

function beginRunRejectionV1(
  code: BrowserWorkspaceHostEnvironmentFailureCodeV1,
): WorkspaceBeginRunRejectionCodeV1 {
  switch (code) {
    case "invalid_binding":
      return "invalid_binding";
    case "workspace_closed":
      return "workspace_not_open";
    case "run_busy":
      return "agent_run_busy";
    case "duplicate_run":
      return "duplicate_run";
    default:
      return "workspace_not_open";
  }
}

function toolAdmissionCodeV1(
  code: BrowserWorkspaceHostEnvironmentFailureCodeV1,
): ConstructorParameters<typeof WorkspaceToolCallAdmissionErrorV1>[0] {
  switch (code) {
    case "duplicate_tool_call":
      return "duplicate_tool_call";
    case "scope_busy":
      return "scope_busy";
    case "cursor_mismatch":
      return "cursor_mismatch";
    case "receipt_queue_full":
      return "receipt_queue_full";
    case "workspace_closed":
      return "workspace_closed";
    case "run_not_current":
      return "run_not_current";
    default:
      return "invalid_identity";
  }
}

class RemoteWorkspaceExecutionEnvV1 implements ExecutionEnv {
  cwd = "/workspace";
  private readonly call: (
    record: BrowserWorkspaceHostEnvironmentRequestRecordV1,
  ) => Promise<BrowserWorkspaceHostEnvironmentSuccessV1>;
  private readonly isClosed: () => boolean;

  constructor(
    call: (
      record: BrowserWorkspaceHostEnvironmentRequestRecordV1,
    ) => Promise<BrowserWorkspaceHostEnvironmentSuccessV1>,
    isClosed: () => boolean,
  ) {
    this.call = call;
    this.isClosed = isClosed;
  }

  private async pathCall<TValue>(
    method: "absolute_path" | "exists" | "canonical_path" | "read_binary_file" | "file_info",
    path: string,
    abortSignal?: AbortSignal,
  ): Promise<Result<TValue, FileError>> {
    if (this.isClosed()) {
      return err(new FileError("invalid", "Workspace execution environment is closed"));
    }
    if (abortSignal?.aborted) {
      return err(new FileError("aborted", "Workspace filesystem operation was aborted", path));
    }
    try {
      const response = await this.call({ method, path });
      if (response.method !== method) {
        throw new TypeError("workspace environment response mismatch");
      }
      return ok(response.value as TValue);
    } catch (error) {
      return err(
        error instanceof BrowserWorkspaceEnvironmentCallErrorV1
          ? remoteFileErrorV1(error, path)
          : new FileError("unknown", error instanceof Error ? error.message : String(error), path),
      );
    }
  }

  absolutePath(path: string, abortSignal?: AbortSignal): Promise<Result<string, FileError>> {
    return this.pathCall("absolute_path", path, abortSignal);
  }

  joinPath(parts: string[]): Promise<Result<string, FileError>> {
    return localFileFailureV1("Path joining is not available in P3c-B0", parts.join("/"));
  }

  async readTextFile(
    path: string,
    abortSignal?: AbortSignal,
  ): Promise<Result<string, FileError>> {
    const read = await this.readBinaryFile(path, abortSignal);
    if (!read.ok) return read;
    if (abortSignal?.aborted) {
      return err(new FileError("aborted", "Workspace filesystem operation was aborted", path));
    }
    try {
      return ok(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(read.value));
    } catch (error) {
      return err(
        new FileError(
          "invalid",
          "Workspace file is not valid UTF-8",
          path,
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  readTextLines(path: string): Promise<Result<string[], FileError>> {
    return localFileFailureV1("Line streaming is not available in P3c-B0", path);
  }

  readBinaryFile(path: string, abortSignal?: AbortSignal): Promise<Result<Uint8Array, FileError>> {
    return this.pathCall("read_binary_file", path, abortSignal);
  }

  async writeFile(
    path: string,
    content: string | Uint8Array,
    abortSignal?: AbortSignal,
  ): Promise<Result<void, FileError>> {
    if (this.isClosed()) {
      return err(new FileError("invalid", "Workspace execution environment is closed"));
    }
    if (abortSignal?.aborted) {
      return err(new FileError("aborted", "Workspace filesystem operation was aborted", path));
    }
    const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content.slice();
    try {
      const response = await this.call({ method: "write_file", path, bytes });
      if (response.method !== "write_file") {
        throw new TypeError("workspace environment response mismatch");
      }
      return ok(undefined);
    } catch (error) {
      return err(
        error instanceof BrowserWorkspaceEnvironmentCallErrorV1
          ? remoteFileErrorV1(error, path)
          : new FileError("unknown", error instanceof Error ? error.message : String(error), path),
      );
    }
  }

  appendFile(path: string): Promise<Result<void, FileError>> {
    return localFileFailureV1("Append is not available in P3c-B0", path);
  }

  renameFile(sourcePath: string): Promise<Result<void, FileError>> {
    return localFileFailureV1("Rename is not available in P3c-B0", sourcePath);
  }

  fileInfo(path: string, abortSignal?: AbortSignal): Promise<Result<FileInfo, FileError>> {
    return this.pathCall("file_info", path, abortSignal);
  }

  listDir(path: string): Promise<Result<FileInfo[], FileError>> {
    return localFileFailureV1("Directory listing is not available in P3c-B0", path);
  }

  canonicalPath(path: string, abortSignal?: AbortSignal): Promise<Result<string, FileError>> {
    return this.pathCall("canonical_path", path, abortSignal);
  }

  exists(path: string, abortSignal?: AbortSignal): Promise<Result<boolean, FileError>> {
    return this.pathCall("exists", path, abortSignal);
  }

  createDir(path: string): Promise<Result<void, FileError>> {
    return localFileFailureV1("Explicit directories are not available in P3c-B0", path);
  }

  remove(path: string): Promise<Result<void, FileError>> {
    return localFileFailureV1("Remove is not available in P3c-B0", path);
  }

  createTempDir(prefix?: string): Promise<Result<string, FileError>> {
    return localFileFailureV1("Temporary directories are not available in P3c-B0", prefix);
  }

  createTempFile(): Promise<Result<string, FileError>> {
    return localFileFailureV1("Temporary files are not available in P3c-B0");
  }

  exec(
    _command: string,
    options?: ShellExecOptions,
  ): Promise<Result<{ stdout: string; stderr: string; exitCode: number }, ExecutionError>> {
    if (options?.abortSignal?.aborted) {
      return Promise.resolve(
        err(new ExecutionError("aborted", "Workspace shell request was aborted")),
      );
    }
    return Promise.resolve(
      err(new ExecutionError("shell_unavailable", "Shell execution is not available in P3c-B0")),
    );
  }

  cleanup(): Promise<void> {
    return Promise.resolve();
  }
}

class RemoteWorkspaceAgentRunV1 implements WorkspaceAgentRunV1 {
  readonly env: ExecutionEnv;
  private readonly owner: BrowserWorkspaceEnvironmentClientOwnerV1;
  private readonly state: ActiveRunStateV1;

  constructor(owner: BrowserWorkspaceEnvironmentClientOwnerV1, state: ActiveRunStateV1) {
    this.owner = owner;
    this.state = state;
    this.env = new RemoteWorkspaceExecutionEnvV1(
      (record) => owner.call(record),
      () => state.finished || owner.isDisposed(),
    );
  }

  getGenerationCursor(): number {
    return this.state.cursor;
  }

  executeReadCall<TValue>(input: WorkspaceToolCallInputV1<TValue>): Promise<TValue> {
    return this.owner.executeToolCall(this.state, "read", input);
  }

  executeWriteCall<TValue>(input: WorkspaceToolCallInputV1<TValue>): Promise<TValue> {
    return this.owner.executeToolCall(this.state, "write", input);
  }

  executeEditCall<TValue>(input: WorkspaceToolCallInputV1<TValue>): Promise<TValue> {
    return this.owner.executeToolCall(this.state, "edit", input);
  }

  abortAndDrain(): Promise<void> {
    return this.owner.abortAndDrain(this.state);
  }

  finish(): void {
    if (this.state.activeCall !== null) {
      throw new WorkspaceToolCallAdmissionErrorV1(
        "scope_busy",
        "Cannot finish a Workspace Agent run while its tool call is active",
      );
    }
    if (this.state.finished) return;
    this.state.finished = true;
    this.owner.finish(this.state);
  }
}

class BrowserWorkspaceEnvironmentClientOwnerV1 implements BrowserWorkspaceEnvironmentClientV1 {
  private readonly port: BrowserWorkspaceEnvironmentMessagePortV1;
  private readonly onMutationRecord: ((record: WorkspaceMutationRecordV1) => void) | undefined;
  private readonly pending = new Map<number, PendingCallV1>();
  private readonly receipts: WorkspaceMutationRecordV1[] = [];
  private descriptor: WorkspaceExecutionDescriptorV1;
  private nextRequestId = 1;
  private lastObservedSequence = 0;
  private activeRun: ActiveRunStateV1 | null = null;
  private disposed = false;

  constructor(input: {
    readonly port: BrowserWorkspaceEnvironmentMessagePortV1;
    readonly descriptor: WorkspaceExecutionDescriptorV1;
    readonly onMutationRecord?: (record: WorkspaceMutationRecordV1) => void;
  }) {
    this.port = input.port;
    this.descriptor = Object.freeze({ ...input.descriptor });
    this.onMutationRecord = input.onMutationRecord;
    this.port.addEventListener("message", this.onMessage);
    this.port.addEventListener("messageerror", this.onMessageError);
    this.port.start();
  }

  private readonly onMessage = (event: BrowserWorkspaceMessageEventV1): void => {
    if (this.disposed) return;
    const message = admitBrowserWorkspaceHostEnvironmentOutboundMessageV1(event.data);
    if (message === null) {
      this.failTransport();
      return;
    }
    if (message.kind === "workspace_receipt") {
      this.acceptReceipt(message.receipt);
      return;
    }
    const pending = this.pending.get(message.requestId);
    if (pending === undefined) {
      this.failTransport();
      return;
    }
    this.pending.delete(message.requestId);
    if (message.ok) {
      if (message.response.method !== pending.method) {
        pending.reject(new BrowserWorkspaceEnvironmentCallErrorV1("request_failed", null));
        this.failTransport();
        return;
      }
      pending.resolve(message.response);
    } else {
      pending.reject(new BrowserWorkspaceEnvironmentCallErrorV1(message.code, message.fileError));
    }
  };

  private readonly onMessageError = (): void => this.failTransport();

  private failTransport(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const pending of this.pending.values()) {
      pending.reject(new BrowserWorkspaceEnvironmentCallErrorV1("request_failed", null));
    }
    this.pending.clear();
    this.port.removeEventListener("message", this.onMessage);
    this.port.removeEventListener("messageerror", this.onMessageError);
    this.port.close();
  }

  private acceptReceipt(value: BrowserWorkspaceHostMutationReceiptWireV1): void {
    const run = this.activeRun;
    if (
      run === null || value.programId !== this.descriptor.programId ||
      value.workspaceId !== this.descriptor.workspaceId ||
      value.workspaceSessionId !== this.descriptor.workspaceSessionId ||
      value.sessionId !== run.piSessionId || value.runId !== run.piRunId ||
      value.sequence !== this.lastObservedSequence + 1 ||
      value.baseGeneration !== this.descriptor.generation
    ) {
      this.failTransport();
      return;
    }
    const record: WorkspaceMutationRecordV1 = Object.freeze({
      revision: 1,
      sequence: value.sequence,
      programId: value.programId,
      workspaceId: value.workspaceId,
      workspaceSessionId: value.workspaceSessionId,
      piSessionId: value.sessionId,
      piRunId: value.runId,
      toolCallId: value.toolCallId,
      tool: value.tool,
      expectedGeneration: value.expectedGeneration,
      baseGeneration: value.baseGeneration,
      resultingGeneration: value.resultingGeneration,
      outcome: value.outcome,
      effect: value.effect,
      changedPaths: Object.freeze([...value.changedPaths]),
      diagnosticCode: value.diagnosticCode,
    });
    this.lastObservedSequence = record.sequence;
    this.receipts.push(record);
    this.descriptor = Object.freeze({ ...this.descriptor, generation: record.resultingGeneration });
    run.cursor = record.resultingGeneration;
    this.onMutationRecord?.(record);
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  getDescriptor(): WorkspaceExecutionDescriptorV1 {
    return this.descriptor;
  }

  call(
    record: BrowserWorkspaceHostEnvironmentRequestRecordV1,
  ): Promise<BrowserWorkspaceHostEnvironmentSuccessV1> {
    if (this.disposed) {
      return Promise.reject(new BrowserWorkspaceEnvironmentCallErrorV1("disposed", null));
    }
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { method: record.method, resolve, reject });
      try {
        this.port.postMessage({
          revision: 1,
          kind: "environment_request",
          requestId,
          record,
        }, []);
      } catch {
        this.pending.delete(requestId);
        reject(new BrowserWorkspaceEnvironmentCallErrorV1("request_failed", null));
      }
    });
  }

  async beginAgentRun(input: {
    readonly binding: CreatorAgentExecutionBindingV1;
    readonly piSessionId: string;
    readonly piRunId: string;
  }): Promise<
    | { readonly kind: "started"; readonly run: WorkspaceAgentRunV1 }
    | {
      readonly kind: "rejected";
      readonly code: WorkspaceBeginRunRejectionCodeV1;
      readonly current: WorkspaceExecutionDescriptorV1;
    }
  > {
    if (this.activeRun !== null && !this.activeRun.finished) {
      return { kind: "rejected", code: "agent_run_busy", current: this.descriptor };
    }
    try {
      const response = await this.call({
        method: "begin_run",
        binding: input.binding,
        sessionId: input.piSessionId,
        runId: input.piRunId,
      });
      if (response.method !== "begin_run") {
        return { kind: "rejected", code: "workspace_not_open", current: this.descriptor };
      }
      this.descriptor = Object.freeze({ ...this.descriptor, generation: response.generation });
      const state: ActiveRunStateV1 = {
        piSessionId: input.piSessionId,
        piRunId: input.piRunId,
        expectedGeneration: input.binding.expectedGeneration,
        abortController: new AbortController(),
        toolCallIds: new Set(),
        cursor: response.generation,
        activeCall: null,
        activeToolCallId: null,
        finished: false,
        drainPromise: null,
      };
      this.activeRun = state;
      return { kind: "started", run: new RemoteWorkspaceAgentRunV1(this, state) };
    } catch (error) {
      return {
        kind: "rejected",
        code: error instanceof BrowserWorkspaceEnvironmentCallErrorV1
          ? beginRunRejectionV1(error.code)
          : "workspace_not_open",
        current: this.descriptor,
      };
    }
  }

  executeToolCall<TValue>(
    state: ActiveRunStateV1,
    tool: "read" | "write" | "edit",
    input: WorkspaceToolCallInputV1<TValue>,
  ): Promise<TValue> {
    if (this.activeRun !== state || state.finished) {
      return Promise.reject(
        new WorkspaceToolCallAdmissionErrorV1(
          "run_not_current",
          "Workspace Agent run is not current",
        ),
      );
    }
    if (state.activeCall !== null) {
      return Promise.reject(
        new WorkspaceToolCallAdmissionErrorV1(
          "scope_busy",
          "A Workspace tool call is already active",
        ),
      );
    }
    if (state.toolCallIds.has(input.toolCallId)) {
      return Promise.reject(
        new WorkspaceToolCallAdmissionErrorV1(
          "duplicate_tool_call",
          "Workspace tool call identity was already used",
        ),
      );
    }
    state.toolCallIds.add(input.toolCallId);
    const operation = this.performToolCall(state, tool, input);
    state.activeCall = operation;
    void operation.finally(() => {
      if (state.activeCall === operation) state.activeCall = null;
    }).catch(() => undefined);
    return operation;
  }

  private async performToolCall<TValue>(
    state: ActiveRunStateV1,
    tool: "read" | "write" | "edit",
    input: WorkspaceToolCallInputV1<TValue>,
  ): Promise<TValue> {
    try {
      const begun = await this.call({ method: "begin_tool", toolCallId: input.toolCallId, tool });
      if (begun.method !== "begin_tool") throw new TypeError("workspace begin-tool mismatch");
      if (begun.baseGeneration !== state.cursor) {
        throw new WorkspaceToolCallAdmissionErrorV1(
          "cursor_mismatch",
          "Workspace generation changed before the tool call began",
        );
      }
    } catch (error) {
      if (error instanceof BrowserWorkspaceEnvironmentCallErrorV1) {
        throw new WorkspaceToolCallAdmissionErrorV1(
          toolAdmissionCodeV1(error.code),
          error.message,
        );
      }
      throw error;
    }
    state.activeToolCallId = input.toolCallId;
    const effective = mergeAbortSignalsV1(state.abortController.signal, input.signal);
    let outcome: "succeeded" | "failed" | "cancelled" = "succeeded";
    let value!: TValue;
    let failure: unknown = null;
    try {
      value = await input.invoke(effective.signal);
      if (effective.signal.aborted) outcome = "cancelled";
    } catch (error) {
      failure = error;
      outcome = effective.signal.aborted ? "cancelled" : "failed";
    } finally {
      effective.dispose();
      try {
        const ended = await this.call({
          method: "end_tool",
          toolCallId: input.toolCallId,
          outcome,
        });
        if (ended.method !== "end_tool") {
          failure ??= new TypeError("workspace end-tool mismatch");
        } else {
          state.cursor = ended.generation;
          this.descriptor = Object.freeze({ ...this.descriptor, generation: ended.generation });
        }
      } catch (error) {
        failure ??= error;
      }
      state.activeToolCallId = null;
    }
    if (failure !== null) throw failure;
    return value;
  }

  abortAndDrain(state: ActiveRunStateV1): Promise<void> {
    if (state.drainPromise !== null) return state.drainPromise;
    state.abortController.abort();
    state.drainPromise = (async () => {
      const active = state.activeCall;
      if (active !== null) await active.then(() => undefined, () => undefined);
      if (!state.finished) {
        try {
          const response = await this.call({ method: "abort_run" });
          if (response.method === "abort_run") {
            state.cursor = response.generation;
            this.descriptor = Object.freeze({
              ...this.descriptor,
              generation: response.generation,
            });
          }
        } catch {
          // Worker disposal and Host close are allowed to race the final drain.
        }
        state.finished = true;
        if (this.activeRun === state) this.activeRun = null;
      }
    })();
    return state.drainPromise;
  }

  finish(state: ActiveRunStateV1): void {
    if (this.activeRun === state) this.activeRun = null;
    void this.call({ method: "end_run" }).catch(() => undefined);
  }

  queryMutationRecords(): readonly WorkspaceMutationRecordV1[] {
    return Object.freeze([...this.receipts]);
  }

  async acknowledgeMutationRecords(throughSequence: number): Promise<void> {
    const response = await this.call({ method: "acknowledge_receipts", throughSequence });
    if (
      response.method !== "acknowledge_receipts" || response.throughSequence !== throughSequence
    ) {
      throw new TypeError("sillyos.workspace_environment.acknowledgement_mismatch");
    }
    const retained = this.receipts.filter((record) => record.sequence > throughSequence);
    this.receipts.splice(0, this.receipts.length, ...retained);
  }

  dispose(): void {
    this.failTransport();
  }
}

export function createBrowserWorkspaceEnvironmentClientV1(input: {
  readonly port: BrowserWorkspaceEnvironmentMessagePortV1;
  readonly descriptor: WorkspaceExecutionDescriptorV1;
  readonly onMutationRecord?: (record: WorkspaceMutationRecordV1) => void;
}): BrowserWorkspaceEnvironmentClientV1 {
  return new BrowserWorkspaceEnvironmentClientOwnerV1(input);
}
