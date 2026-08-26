// SPDX-License-Identifier: MIT

import {
  err,
  ExecutionError,
  FileError,
  ok,
  type ExecutionEnv,
  type FileInfo,
  type Result,
  type ShellExecOptions,
} from "../agent/pi-workspace-runtime-bridge.js";

import {
  type CreatorAgentExecutionBindingV1,
  type WorkspaceAgentRunV1,
  type WorkspaceBeginRunResultV1,
  type WorkspaceCloseResultV1,
  type WorkspaceExecutionDescriptorV1,
  type WorkspaceMutationAcknowledgementResultV1,
  type WorkspaceMutationDiagnosticCodeV1,
  workspaceFileMaximumBytesV1,
  workspaceMutationReceiptMaximumV1,
  type WorkspaceMutationRecordV1,
  type WorkspaceOpenResultV1,
  workspacePathMaximumPartsV1,
  workspacePathMaximumUtf8BytesV1,
  workspaceRootV1,
  type WorkspaceToolCallInputV1,
  WorkspaceToolCallAdmissionErrorV1,
  workspaceVolumeMaximumBytesV1,
  workspaceVolumeMaximumFilesV1,
} from "./contracts.ts";

const identityPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const encoderV1 = new TextEncoder();

interface WorkspaceFileV1 {
  readonly bytes: Uint8Array;
  readonly mtimeMs: number;
}

interface WorkspaceCallScopeV1 {
  readonly kind: "read" | "write";
  readonly toolCallId: string;
  readonly baseGeneration: number;
  readonly effectiveSignal: AbortSignal;
  changedPath: string | null;
  failureDiagnostic: WorkspaceMutationDiagnosticCodeV1 | null;
  writeAttempted: boolean;
}

interface WorkspaceRunStateV1 {
  readonly piSessionId: string;
  readonly piRunId: string;
  readonly expectedGeneration: number;
  readonly abortController: AbortController;
  readonly toolCallIds: Set<string>;
  cursor: number;
  activeCall: Promise<unknown> | null;
  finished: boolean;
}

interface WorkspaceSessionStateV1 {
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly files: Map<string, WorkspaceFileV1>;
  readonly usedPiRunIds: Set<string>;
  readonly env: DisposableWorkspaceExecutionEnvV1;
  readonly mutationRecords: WorkspaceMutationRecordV1[];
  generation: number;
  nextReceiptSequence: number;
  acknowledgedThrough: number;
  reservedReceiptSlots: number;
  activeRun: WorkspaceRunStateV1 | null;
  activeScope: WorkspaceCallScopeV1 | null;
  closeDrain: Promise<void> | null;
  closed: boolean;
}

interface NormalizedWorkspacePathV1 {
  readonly absolute: string;
  readonly relative: string;
  readonly parts: readonly string[];
}

export interface DisposableWorkspaceRuntimeOptionsV1 {
  readonly createWorkspaceSessionId?: () => string;
  readonly now?: () => number;
  readonly onMutationRecord?: (record: WorkspaceMutationRecordV1) => void;
}

export interface DisposableWorkspaceRuntimeV1 {
  openWorkspace(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): WorkspaceOpenResultV1;
  getCurrentDescriptor(): WorkspaceExecutionDescriptorV1 | null;
  getDescriptor(workspaceSessionId: string): WorkspaceExecutionDescriptorV1 | null;
  beginAgentRun(input: {
    readonly binding: CreatorAgentExecutionBindingV1;
    readonly piSessionId: string;
    readonly piRunId: string;
  }): WorkspaceBeginRunResultV1;
  queryMutationRecords(workspaceSessionId: string): readonly WorkspaceMutationRecordV1[];
  acknowledgeMutationRecords(input: {
    readonly workspaceSessionId: string;
    readonly throughSequence: number;
  }): WorkspaceMutationAcknowledgementResultV1;
  closeWorkspace(workspaceSessionId: string): Promise<WorkspaceCloseResultV1>;
  forget(): Promise<void>;
}

function validIdentityV1(value: string): boolean {
  return identityPatternV1.test(value);
}

function positiveSafeIntegerV1(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function sameBytesV1(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((value, index) => value === right[index]);
}

function descriptorV1(session: WorkspaceSessionStateV1): WorkspaceExecutionDescriptorV1 {
  return Object.freeze({
    revision: 1,
    programId: session.programId,
    workspaceId: session.workspaceId,
    workspaceSessionId: session.workspaceSessionId,
    generation: session.generation,
  });
}

function normalizedPathV1(path: string): Result<NormalizedWorkspacePathV1, FileError> {
  if (path.includes("\0")) {
    return err(new FileError("invalid", "Workspace paths cannot contain NUL", path));
  }
  const absolute = path.startsWith("/");
  const rawParts = path.split("/");
  const rootOffset = absolute && rawParts[1] === "workspace" ? 2 : 0;
  if (absolute && rootOffset === 0) {
    return err(new FileError("permission_denied", "Path is outside /workspace", path));
  }

  const parts: string[] = [];
  for (const part of rawParts.slice(rootOffset)) {
    if (part.length === 0 || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) {
        return err(new FileError("permission_denied", "Path escapes /workspace", path));
      }
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  const relative = parts.join("/");
  if (
    parts.length > workspacePathMaximumPartsV1 ||
    encoderV1.encode(relative).byteLength > workspacePathMaximumUtf8BytesV1
  ) {
    return err(new FileError("invalid", "Workspace path exceeds its admitted ceiling", path));
  }
  return ok({
    absolute: relative.length === 0 ? workspaceRootV1 : `${workspaceRootV1}/${relative}`,
    relative,
    parts,
  });
}

function fileNameV1(path: NormalizedWorkspacePathV1): string {
  return path.parts.at(-1) ?? "workspace";
}

class DisposableWorkspaceExecutionEnvV1 implements ExecutionEnv {
  cwd = workspaceRootV1;
  private cleaned = false;
  private readonly now: () => number;
  private readonly session: WorkspaceSessionStateV1;

  constructor(session: WorkspaceSessionStateV1, now: () => number) {
    this.session = session;
    this.now = now;
  }

  private fileOperation<TValue>(
    abortSignal: AbortSignal | undefined,
    operation: (scope: WorkspaceCallScopeV1) => Result<TValue, FileError>,
  ): Promise<Result<TValue, FileError>> {
    const scope = this.session.activeScope;
    if (this.cleaned || this.session.closed) {
      return Promise.resolve(
        err(new FileError("invalid", "Workspace execution environment is closed")),
      );
    }
    if (scope === null) {
      return Promise.resolve(
        err(
          new FileError(
            "permission_denied",
            "Workspace filesystem operation has no active tool scope",
          ),
        ),
      );
    }
    if (abortSignal?.aborted || scope.effectiveSignal.aborted) {
      scope.failureDiagnostic = "cancelled";
      return Promise.resolve(
        err(new FileError("aborted", "Workspace filesystem operation was aborted")),
      );
    }
    try {
      return Promise.resolve(operation(scope));
    } catch (error) {
      scope.failureDiagnostic ??= "execution_failed";
      const cause = error instanceof Error ? error : new Error(String(error));
      return Promise.resolve(err(new FileError("unknown", cause.message, undefined, cause)));
    }
  }

  private resolvePath(
    scope: WorkspaceCallScopeV1,
    path: string,
  ): Result<NormalizedWorkspacePathV1, FileError> {
    const result = normalizedPathV1(path);
    if (!result.ok) scope.failureDiagnostic = "path_rejected";
    return result;
  }

  private isDirectory(relative: string): boolean {
    if (relative.length === 0) return true;
    const prefix = `${relative}/`;
    return [...this.session.files.keys()].some((path) => path.startsWith(prefix));
  }

  private volumeBytes(): number {
    let total = 0;
    for (const file of this.session.files.values()) total += file.bytes.byteLength;
    return total;
  }

  absolutePath(path: string, abortSignal?: AbortSignal): Promise<Result<string, FileError>> {
    return this.fileOperation(abortSignal, (scope) => {
      const normalized = this.resolvePath(scope, path);
      return normalized.ok ? ok(normalized.value.absolute) : normalized;
    });
  }

  joinPath(parts: string[], abortSignal?: AbortSignal): Promise<Result<string, FileError>> {
    return this.fileOperation(abortSignal, (scope) => {
      scope.failureDiagnostic ??= "execution_failed";
      return err(
        new FileError("not_supported", "Path joining is not available in P3a-B0", parts.join("/")),
      );
    });
  }

  readTextFile(path: string, abortSignal?: AbortSignal): Promise<Result<string, FileError>> {
    return this.fileOperation(abortSignal, (scope) => {
      scope.failureDiagnostic ??= "execution_failed";
      return err(new FileError("not_supported", "Text reads are not available in P3a-B0", path));
    });
  }

  readTextLines(
    path: string,
    options?: { readonly maxLines?: number; readonly abortSignal?: AbortSignal },
  ): Promise<Result<string[], FileError>> {
    return this.fileOperation(options?.abortSignal, (scope) => {
      scope.failureDiagnostic ??= "execution_failed";
      return err(new FileError("not_supported", "Line streaming is not available in P3a-B0", path));
    });
  }

  readBinaryFile(path: string, abortSignal?: AbortSignal): Promise<Result<Uint8Array, FileError>> {
    return this.fileOperation(abortSignal, (scope) => {
      const normalized = this.resolvePath(scope, path);
      if (!normalized.ok) return normalized;
      const file = this.session.files.get(normalized.value.relative);
      if (file === undefined) {
        if (this.isDirectory(normalized.value.relative)) {
          return err(
            new FileError(
              "is_directory",
              "Workspace path is a directory",
              normalized.value.absolute,
            ),
          );
        }
        return err(
          new FileError("not_found", "Workspace file does not exist", normalized.value.absolute),
        );
      }
      return ok(file.bytes.slice());
    });
  }

  writeFile(
    path: string,
    content: string | Uint8Array,
    abortSignal?: AbortSignal,
  ): Promise<Result<void, FileError>> {
    return this.fileOperation(abortSignal, (scope) => {
      if (scope.kind !== "write" || scope.writeAttempted) {
        scope.failureDiagnostic = "execution_failed";
        return err(
          new FileError(
            "permission_denied",
            "Write is outside its admitted native tool call",
            path,
          ),
        );
      }
      scope.writeAttempted = true;
      const normalized = this.resolvePath(scope, path);
      if (!normalized.ok) return normalized;
      if (normalized.value.relative.length === 0 || this.isDirectory(normalized.value.relative)) {
        scope.failureDiagnostic = "path_rejected";
        return err(
          new FileError(
            "is_directory",
            "Workspace write target is a directory",
            normalized.value.absolute,
          ),
        );
      }
      for (let index = 1; index < normalized.value.parts.length; index += 1) {
        const ancestor = normalized.value.parts.slice(0, index).join("/");
        if (this.session.files.has(ancestor)) {
          scope.failureDiagnostic = "path_rejected";
          return err(
            new FileError(
              "not_directory",
              "Workspace write parent is a file",
              normalized.value.absolute,
            ),
          );
        }
      }

      const bytes = typeof content === "string" ? encoderV1.encode(content) : content.slice();
      const previous = this.session.files.get(normalized.value.relative);
      if (previous !== undefined && sameBytesV1(previous.bytes, bytes)) return ok(undefined);

      const nextFileCount = this.session.files.size + (previous === undefined ? 1 : 0);
      const nextVolumeBytes = this.volumeBytes() - (previous?.bytes.byteLength ?? 0) +
        bytes.byteLength;
      if (
        bytes.byteLength > workspaceFileMaximumBytesV1 ||
        nextFileCount > workspaceVolumeMaximumFilesV1 ||
        nextVolumeBytes > workspaceVolumeMaximumBytesV1
      ) {
        scope.failureDiagnostic = "capacity_exceeded";
        return err(
          new FileError("invalid", "Workspace volume capacity exceeded", normalized.value.absolute),
        );
      }

      this.session.files.set(normalized.value.relative, {
        bytes,
        mtimeMs: this.now(),
      });
      this.session.generation += 1;
      scope.changedPath = normalized.value.relative;
      return ok(undefined);
    });
  }

  appendFile(
    path: string,
    _content: string | Uint8Array,
    abortSignal?: AbortSignal,
  ): Promise<Result<void, FileError>> {
    return this.fileOperation(abortSignal, (scope) => {
      scope.failureDiagnostic ??= "execution_failed";
      return err(new FileError("not_supported", "Append is not available in P3a-B0", path));
    });
  }

  renameFile(
    sourcePath: string,
    _destinationPath: string,
    abortSignal?: AbortSignal,
  ): Promise<Result<void, FileError>> {
    return this.fileOperation(abortSignal, (scope) => {
      scope.failureDiagnostic ??= "execution_failed";
      return err(new FileError("not_supported", "Rename is not available in P3a-B0", sourcePath));
    });
  }

  fileInfo(path: string, abortSignal?: AbortSignal): Promise<Result<FileInfo, FileError>> {
    return this.fileOperation(abortSignal, (scope) => {
      const normalized = this.resolvePath(scope, path);
      if (!normalized.ok) return normalized;
      const file = this.session.files.get(normalized.value.relative);
      if (file !== undefined) {
        return ok({
          name: fileNameV1(normalized.value),
          path: normalized.value.absolute,
          kind: "file",
          size: file.bytes.byteLength,
          mtimeMs: file.mtimeMs,
        });
      }
      if (this.isDirectory(normalized.value.relative)) {
        return ok({
          name: fileNameV1(normalized.value),
          path: normalized.value.absolute,
          kind: "directory",
          size: 0,
          mtimeMs: 0,
        });
      }
      return err(
        new FileError("not_found", "Workspace path does not exist", normalized.value.absolute),
      );
    });
  }

  listDir(path: string, abortSignal?: AbortSignal): Promise<Result<FileInfo[], FileError>> {
    return this.fileOperation(abortSignal, (scope) => {
      scope.failureDiagnostic ??= "execution_failed";
      return err(
        new FileError("not_supported", "Directory listing is not available in P3a-B0", path),
      );
    });
  }

  canonicalPath(path: string, abortSignal?: AbortSignal): Promise<Result<string, FileError>> {
    return this.fileOperation(abortSignal, (scope) => {
      const normalized = this.resolvePath(scope, path);
      if (!normalized.ok) return normalized;
      if (
        this.session.files.has(normalized.value.relative) ||
        this.isDirectory(normalized.value.relative)
      ) {
        return ok(normalized.value.absolute);
      }
      return err(
        new FileError("not_found", "Workspace path does not exist", normalized.value.absolute),
      );
    });
  }

  exists(path: string, abortSignal?: AbortSignal): Promise<Result<boolean, FileError>> {
    return this.fileOperation(abortSignal, (scope) => {
      const normalized = this.resolvePath(scope, path);
      return normalized.ok
        ? ok(
          this.session.files.has(normalized.value.relative) ||
            this.isDirectory(normalized.value.relative),
        )
        : normalized;
    });
  }

  createDir(
    path: string,
    options?: { readonly recursive?: boolean; readonly abortSignal?: AbortSignal },
  ): Promise<Result<void, FileError>> {
    return this.fileOperation(options?.abortSignal, (scope) => {
      scope.failureDiagnostic ??= "execution_failed";
      return err(
        new FileError("not_supported", "Explicit directories are not available in P3a-B0", path),
      );
    });
  }

  remove(
    path: string,
    options?: {
      readonly recursive?: boolean;
      readonly force?: boolean;
      readonly abortSignal?: AbortSignal;
    },
  ): Promise<Result<void, FileError>> {
    return this.fileOperation(options?.abortSignal, (scope) => {
      scope.failureDiagnostic ??= "execution_failed";
      return err(new FileError("not_supported", "Remove is not available in P3a-B0", path));
    });
  }

  createTempDir(prefix?: string, abortSignal?: AbortSignal): Promise<Result<string, FileError>> {
    return this.fileOperation(abortSignal, (scope) => {
      scope.failureDiagnostic ??= "execution_failed";
      return err(
        new FileError("not_supported", "Temporary directories are not available in P3a-B0", prefix),
      );
    });
  }

  createTempFile(options?: {
    readonly prefix?: string;
    readonly suffix?: string;
    readonly abortSignal?: AbortSignal;
  }): Promise<Result<string, FileError>> {
    return this.fileOperation(options?.abortSignal, (scope) => {
      scope.failureDiagnostic ??= "execution_failed";
      return err(new FileError("not_supported", "Temporary files are not available in P3a-B0"));
    });
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
    if (this.cleaned || this.session.closed) {
      return Promise.resolve(
        err(new ExecutionError("unknown", "Workspace execution environment is closed")),
      );
    }
    return Promise.resolve(
      err(new ExecutionError("shell_unavailable", "Shell execution is not available in P3a-B0")),
    );
  }

  cleanup(): Promise<void> {
    if (!this.cleaned) {
      this.cleaned = true;
      this.session.files.clear();
    }
    return Promise.resolve();
  }
}

class WorkspaceAgentRunHandleV1 implements WorkspaceAgentRunV1 {
  readonly env: ExecutionEnv;
  private readonly runtime: DisposableWorkspaceRuntimeOwnerV1;
  private readonly session: WorkspaceSessionStateV1;
  private readonly state: WorkspaceRunStateV1;

  constructor(
    runtime: DisposableWorkspaceRuntimeOwnerV1,
    session: WorkspaceSessionStateV1,
    state: WorkspaceRunStateV1,
  ) {
    this.runtime = runtime;
    this.session = session;
    this.state = state;
    this.env = session.env;
  }

  getGenerationCursor(): number {
    return this.state.cursor;
  }

  executeReadCall<TValue>(input: WorkspaceToolCallInputV1<TValue>): Promise<TValue> {
    return this.runtime.executeToolCall(this.session, this.state, "read", input);
  }

  executeWriteCall<TValue>(input: WorkspaceToolCallInputV1<TValue>): Promise<TValue> {
    return this.runtime.executeToolCall(this.session, this.state, "write", input);
  }

  async abortAndDrain(): Promise<void> {
    this.state.abortController.abort();
    const active = this.state.activeCall;
    if (active !== null) await active.then(() => undefined, () => undefined);
    if (this.state.finished) return;
    this.state.finished = true;
    if (this.session.activeRun === this.state) this.session.activeRun = null;
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
    if (this.session.activeRun === this.state) this.session.activeRun = null;
  }
}

class DisposableWorkspaceRuntimeOwnerV1 implements DisposableWorkspaceRuntimeV1 {
  private readonly createWorkspaceSessionId: () => string;
  private readonly now: () => number;
  private readonly onMutationRecord: ((record: WorkspaceMutationRecordV1) => void) | undefined;
  private readonly sessions = new Map<string, WorkspaceSessionStateV1>();
  private current: WorkspaceSessionStateV1 | null = null;
  private forgotten = false;

  constructor(options: DisposableWorkspaceRuntimeOptionsV1) {
    this.createWorkspaceSessionId = options.createWorkspaceSessionId ??
      (() => `workspace.session.${crypto.randomUUID()}`);
    this.now = options.now ?? Date.now;
    this.onMutationRecord = options.onMutationRecord;
  }

  openWorkspace(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): WorkspaceOpenResultV1 {
    if (this.forgotten) return { kind: "rejected", code: "forgotten", current: null };
    if (!validIdentityV1(input.programId) || !validIdentityV1(input.workspaceId)) {
      return {
        kind: "rejected",
        code: "invalid_identity",
        current: this.current === null ? null : descriptorV1(this.current),
      };
    }
    if (this.current !== null) {
      const descriptor = descriptorV1(this.current);
      if (
        this.current.programId === input.programId &&
        this.current.workspaceId === input.workspaceId
      ) return { kind: "current", descriptor };
      return { kind: "rejected", code: "workspace_busy", current: descriptor };
    }

    const workspaceSessionId = this.createWorkspaceSessionId();
    if (!validIdentityV1(workspaceSessionId) || this.sessions.has(workspaceSessionId)) {
      return { kind: "rejected", code: "invalid_identity", current: null };
    }
    const session = {} as WorkspaceSessionStateV1;
    Object.assign(session, {
      programId: input.programId,
      workspaceId: input.workspaceId,
      workspaceSessionId,
      files: new Map<string, WorkspaceFileV1>(),
      usedPiRunIds: new Set<string>(),
      mutationRecords: [],
      generation: 1,
      nextReceiptSequence: 1,
      acknowledgedThrough: 0,
      reservedReceiptSlots: 0,
      activeRun: null,
      activeScope: null,
      closeDrain: null,
      closed: false,
    });
    Object.assign(session, { env: new DisposableWorkspaceExecutionEnvV1(session, this.now) });
    this.sessions.set(workspaceSessionId, session);
    this.current = session;
    return { kind: "opened", descriptor: descriptorV1(session) };
  }

  getCurrentDescriptor(): WorkspaceExecutionDescriptorV1 | null {
    return this.current === null ? null : descriptorV1(this.current);
  }

  getDescriptor(workspaceSessionId: string): WorkspaceExecutionDescriptorV1 | null {
    const session = this.sessions.get(workspaceSessionId);
    return session === undefined ? null : descriptorV1(session);
  }

  beginAgentRun(input: {
    readonly binding: CreatorAgentExecutionBindingV1;
    readonly piSessionId: string;
    readonly piRunId: string;
  }): WorkspaceBeginRunResultV1 {
    const current = this.current === null ? null : descriptorV1(this.current);
    if (this.forgotten) return { kind: "rejected", code: "forgotten", current };
    if (this.current === null || this.current.closed) {
      return { kind: "rejected", code: "workspace_not_open", current };
    }
    const binding = input.binding;
    if (
      binding.revision !== 1 ||
      !validIdentityV1(input.piSessionId) ||
      !validIdentityV1(input.piRunId) ||
      !validIdentityV1(binding.programId) ||
      !validIdentityV1(binding.workspaceId) ||
      !validIdentityV1(binding.workspaceSessionId) ||
      !positiveSafeIntegerV1(binding.expectedGeneration) ||
      binding.programId !== this.current.programId ||
      binding.workspaceId !== this.current.workspaceId ||
      binding.workspaceSessionId !== this.current.workspaceSessionId
    ) return { kind: "rejected", code: "invalid_binding", current };
    if (binding.expectedGeneration !== this.current.generation) {
      return { kind: "rejected", code: "stale_generation", current };
    }
    if (this.current.activeRun !== null) {
      return { kind: "rejected", code: "agent_run_busy", current };
    }
    const piRunKey = `${input.piSessionId}\0${input.piRunId}`;
    if (this.current.usedPiRunIds.has(piRunKey)) {
      return { kind: "rejected", code: "duplicate_run", current };
    }

    const state: WorkspaceRunStateV1 = {
      piSessionId: input.piSessionId,
      piRunId: input.piRunId,
      expectedGeneration: binding.expectedGeneration,
      abortController: new AbortController(),
      toolCallIds: new Set(),
      cursor: binding.expectedGeneration,
      activeCall: null,
      finished: false,
    };
    this.current.usedPiRunIds.add(piRunKey);
    this.current.activeRun = state;
    return {
      kind: "started",
      run: new WorkspaceAgentRunHandleV1(this, this.current, state),
    };
  }

  executeToolCall<TValue>(
    session: WorkspaceSessionStateV1,
    run: WorkspaceRunStateV1,
    kind: "read" | "write",
    input: WorkspaceToolCallInputV1<TValue>,
  ): Promise<TValue> {
    if (!validIdentityV1(input.toolCallId)) {
      return Promise.reject(
        new WorkspaceToolCallAdmissionErrorV1("invalid_identity", "Invalid Pi tool-call identity"),
      );
    }
    if (session.closed || this.current !== session) {
      return Promise.reject(
        new WorkspaceToolCallAdmissionErrorV1(
          "workspace_closed",
          "Workspace execution session is closed",
        ),
      );
    }
    if (run.finished || session.activeRun !== run) {
      return Promise.reject(
        new WorkspaceToolCallAdmissionErrorV1(
          "run_not_current",
          "Workspace Agent run is not current",
        ),
      );
    }
    if (run.toolCallIds.has(input.toolCallId)) {
      return Promise.reject(
        new WorkspaceToolCallAdmissionErrorV1(
          "duplicate_tool_call",
          "Duplicate Pi tool-call identity",
        ),
      );
    }
    if (session.activeScope !== null || run.activeCall !== null) {
      return Promise.reject(
        new WorkspaceToolCallAdmissionErrorV1(
          "scope_busy",
          "Another Workspace tool call is active",
        ),
      );
    }
    if (run.cursor !== session.generation) {
      return Promise.reject(
        new WorkspaceToolCallAdmissionErrorV1(
          "cursor_mismatch",
          "Workspace generation cursor is stale",
        ),
      );
    }
    if (
      kind === "write" &&
      session.mutationRecords.length + session.reservedReceiptSlots >=
        workspaceMutationReceiptMaximumV1
    ) {
      return Promise.reject(
        new WorkspaceToolCallAdmissionErrorV1(
          "receipt_queue_full",
          "Workspace mutation receipt queue is full",
        ),
      );
    }

    run.toolCallIds.add(input.toolCallId);
    if (kind === "write") session.reservedReceiptSlots += 1;
    const effectiveSignal = input.signal === undefined
      ? run.abortController.signal
      : AbortSignal.any([run.abortController.signal, input.signal]);
    const scope: WorkspaceCallScopeV1 = {
      kind,
      toolCallId: input.toolCallId,
      baseGeneration: run.cursor,
      effectiveSignal,
      changedPath: null,
      failureDiagnostic: null,
      writeAttempted: false,
    };
    session.activeScope = scope;

    const execute = async (): Promise<TValue> => {
      let value: TValue | undefined;
      let failure: unknown;
      let succeeded = false;
      try {
        value = await input.invoke(effectiveSignal);
        succeeded = true;
      } catch (error) {
        failure = error;
      }

      if (kind === "write") {
        const cancelled = effectiveSignal.aborted || scope.failureDiagnostic === "cancelled";
        const outcome = cancelled ? "cancelled" : succeeded ? "succeeded" : "failed";
        const diagnosticCode = outcome === "succeeded"
          ? null
          : outcome === "cancelled"
          ? "cancelled"
          : (scope.failureDiagnostic ?? "execution_failed");
        const record: WorkspaceMutationRecordV1 = Object.freeze({
          revision: 1,
          sequence: session.nextReceiptSequence++,
          programId: session.programId,
          workspaceId: session.workspaceId,
          workspaceSessionId: session.workspaceSessionId,
          piSessionId: run.piSessionId,
          piRunId: run.piRunId,
          toolCallId: input.toolCallId,
          tool: "write",
          expectedGeneration: run.expectedGeneration,
          baseGeneration: scope.baseGeneration,
          resultingGeneration: session.generation,
          outcome,
          effect: scope.changedPath === null ? "none" : "changed",
          changedPaths: Object.freeze(scope.changedPath === null ? [] : [scope.changedPath]),
          diagnosticCode,
        });
        session.mutationRecords.push(record);
        session.reservedReceiptSlots -= 1;
        try {
          this.onMutationRecord?.(record);
        } catch {
          // Mutation observers cannot alter the settled environment effect.
        }
      }
      run.cursor = session.generation;
      session.activeScope = null;
      if (!succeeded) throw failure;
      return value as TValue;
    };

    const active = execute();
    const settled = active.finally(() => {
      if (run.activeCall === settled) run.activeCall = null;
      if (session.activeScope === scope) session.activeScope = null;
    });
    run.activeCall = settled;
    return settled;
  }

  queryMutationRecords(workspaceSessionId: string): readonly WorkspaceMutationRecordV1[] {
    if (!validIdentityV1(workspaceSessionId)) return Object.freeze([]);
    const session = this.sessions.get(workspaceSessionId);
    return Object.freeze(session === undefined ? [] : [...session.mutationRecords]);
  }

  acknowledgeMutationRecords(input: {
    readonly workspaceSessionId: string;
    readonly throughSequence: number;
  }): WorkspaceMutationAcknowledgementResultV1 {
    if (
      !validIdentityV1(input.workspaceSessionId) ||
      !positiveSafeIntegerV1(input.throughSequence)
    ) return { kind: "rejected", code: "invalid_identity" };
    const session = this.sessions.get(input.workspaceSessionId);
    if (session === undefined) return { kind: "rejected", code: "sequence_unavailable" };
    if (input.throughSequence <= session.acknowledgedThrough) {
      return {
        kind: "unchanged",
        workspaceSessionId: input.workspaceSessionId,
        throughSequence: session.acknowledgedThrough,
      };
    }
    const targetIndex = session.mutationRecords.findIndex((record) =>
      record.sequence === input.throughSequence
    );
    if (targetIndex < 0) return { kind: "rejected", code: "sequence_unavailable" };
    session.mutationRecords.splice(0, targetIndex + 1);
    session.acknowledgedThrough = input.throughSequence;
    return {
      kind: "acknowledged",
      workspaceSessionId: input.workspaceSessionId,
      throughSequence: input.throughSequence,
    };
  }

  async closeWorkspace(workspaceSessionId: string): Promise<WorkspaceCloseResultV1> {
    if (!validIdentityV1(workspaceSessionId)) {
      return {
        kind: "rejected",
        code: "invalid_identity",
        current: this.current === null ? null : descriptorV1(this.current),
      };
    }
    const session = this.sessions.get(workspaceSessionId);
    if (session === undefined) {
      return {
        kind: "rejected",
        code: "workspace_not_found",
        current: this.current === null ? null : descriptorV1(this.current),
      };
    }
    if (this.current !== null && this.current !== session && !session.closed) {
      return { kind: "rejected", code: "workspace_mismatch", current: descriptorV1(this.current) };
    }
    if (session.closed) {
      if (session.closeDrain !== null) await session.closeDrain;
      return { kind: "unchanged", descriptor: descriptorV1(session) };
    }

    session.closed = true;
    session.closeDrain = Promise.resolve().then(async () => {
      const run = session.activeRun;
      if (run !== null) {
        run.abortController.abort();
        if (run.activeCall !== null) await run.activeCall.then(() => undefined, () => undefined);
        run.finished = true;
        session.activeRun = null;
      }
      await session.env.cleanup();
      if (this.current === session) this.current = null;
    });
    await session.closeDrain;
    return { kind: "closed", descriptor: descriptorV1(session) };
  }

  async forget(): Promise<void> {
    if (this.forgotten) return;
    const current = this.current;
    if (current !== null) await this.closeWorkspace(current.workspaceSessionId);
    this.sessions.clear();
    this.current = null;
    this.forgotten = true;
  }
}

export function createDisposableWorkspaceRuntimeV1(
  options: DisposableWorkspaceRuntimeOptionsV1 = {},
): DisposableWorkspaceRuntimeV1 {
  return new DisposableWorkspaceRuntimeOwnerV1(options);
}
