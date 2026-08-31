// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

export type Result<TValue, TError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

export type FileErrorCode =
  | "aborted"
  | "not_found"
  | "permission_denied"
  | "not_directory"
  | "is_directory"
  | "invalid"
  | "not_supported"
  | "unknown";

export class FileError extends Error {
  code: FileErrorCode;
  path?: string;
  constructor(code: FileErrorCode, message: string, path?: string, cause?: Error);
}

export type ExecutionErrorCode =
  | "aborted"
  | "timeout"
  | "shell_unavailable"
  | "spawn_error"
  | "callback_error"
  | "unknown";

export class ExecutionError extends Error {
  code: ExecutionErrorCode;
  constructor(code: ExecutionErrorCode, message: string, cause?: Error);
}

export interface FileInfo {
  name: string;
  path: string;
  kind: "file" | "directory" | "symlink";
  size: number;
  mtimeMs: number;
}

export interface ShellExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  inheritEnv?: boolean;
  timeout?: number;
  abortSignal?: AbortSignal;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

export interface ExecutionEnv {
  cwd: string;
  absolutePath(path: string, abortSignal?: AbortSignal): Promise<Result<string, FileError>>;
  joinPath(parts: string[], abortSignal?: AbortSignal): Promise<Result<string, FileError>>;
  readTextFile(path: string, abortSignal?: AbortSignal): Promise<Result<string, FileError>>;
  readTextLines(
    path: string,
    options?: { readonly maxLines?: number; readonly abortSignal?: AbortSignal },
  ): Promise<Result<string[], FileError>>;
  readBinaryFile(path: string, abortSignal?: AbortSignal): Promise<Result<Uint8Array, FileError>>;
  writeFile(
    path: string,
    content: string | Uint8Array,
    abortSignal?: AbortSignal,
  ): Promise<Result<void, FileError>>;
  appendFile(
    path: string,
    content: string | Uint8Array,
    abortSignal?: AbortSignal,
  ): Promise<Result<void, FileError>>;
  renameFile(
    sourcePath: string,
    destinationPath: string,
    abortSignal?: AbortSignal,
  ): Promise<Result<void, FileError>>;
  fileInfo(path: string, abortSignal?: AbortSignal): Promise<Result<FileInfo, FileError>>;
  listDir(path: string, abortSignal?: AbortSignal): Promise<Result<FileInfo[], FileError>>;
  canonicalPath(path: string, abortSignal?: AbortSignal): Promise<Result<string, FileError>>;
  exists(path: string, abortSignal?: AbortSignal): Promise<Result<boolean, FileError>>;
  createDir(
    path: string,
    options?: { readonly recursive?: boolean; readonly abortSignal?: AbortSignal },
  ): Promise<Result<void, FileError>>;
  remove(
    path: string,
    options?: {
      readonly recursive?: boolean;
      readonly force?: boolean;
      readonly abortSignal?: AbortSignal;
    },
  ): Promise<Result<void, FileError>>;
  createTempDir(
    prefix?: string,
    abortSignal?: AbortSignal,
  ): Promise<Result<string, FileError>>;
  createTempFile(options?: {
    readonly prefix?: string;
    readonly suffix?: string;
    readonly abortSignal?: AbortSignal;
  }): Promise<Result<string, FileError>>;
  exec(
    command: string,
    options?: ShellExecOptions,
  ): Promise<Result<{ stdout: string; stderr: string; exitCode: number }, ExecutionError>>;
  cleanup(): Promise<void>;
}

export interface AgentToolResult<TDetails = unknown> {
  readonly content: readonly unknown[];
  readonly details: TDetails;
  readonly usage?: unknown;
  readonly addedToolNames?: readonly string[];
  readonly terminate?: boolean;
}

export type AgentToolUpdateCallback<TDetails = unknown> = (
  partialResult: AgentToolResult<TDetails>,
) => void;

export interface AgentTool<TParameters = unknown, TDetails = unknown> {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly parameters: unknown;
  readonly prepareArguments?: (args: unknown) => TParameters;
  readonly executionMode?: "sequential" | "parallel";
  execute(
    toolCallId: string,
    params: TParameters,
    signal?: AbortSignal,
    onUpdate?: AgentToolUpdateCallback<TDetails>,
  ): Promise<AgentToolResult<TDetails>>;
}

export interface ExecutionToolContext {
  readonly env: ExecutionEnv;
}

export type AgentHarnessTool<
  TContext extends object | undefined = ExecutionToolContext,
  TParameters = unknown,
  TDetails = unknown,
> = Omit<AgentTool<TParameters, TDetails>, "execute"> & {
  execute(
    toolCallId: string,
    params: TParameters,
    signal: AbortSignal | undefined,
    onUpdate: AgentToolUpdateCallback<TDetails> | undefined,
    context: TContext,
  ): Promise<AgentToolResult<TDetails>>;
};

export const Type: {
  Object(
    properties: Readonly<Record<string, unknown>>,
    options?: Readonly<Record<string, unknown>>,
  ): unknown;
  String(options?: Readonly<Record<string, unknown>>): unknown;
  Boolean(options?: Readonly<Record<string, unknown>>): unknown;
  Integer(options?: Readonly<Record<string, unknown>>): unknown;
  Optional(schema: unknown): unknown;
};

export function ok<TValue, TError = never>(value: TValue): Result<TValue, TError>;
export function err<TValue = never, TError = Error>(error: TError): Result<TValue, TError>;
export function createBashTool(): AgentHarnessTool<ExecutionToolContext>;
export function createEditTool(): AgentHarnessTool<ExecutionToolContext>;
export function createReadTool(): AgentHarnessTool<ExecutionToolContext>;
export function createWriteTool(): AgentHarnessTool<ExecutionToolContext>;
