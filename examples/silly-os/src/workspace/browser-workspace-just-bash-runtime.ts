// SPDX-License-Identifier: MIT

import {
  Bash,
  defineCommand,
  InMemoryFs,
  MountableFs,
  type BufferEncoding,
  type Command,
  type CommandName,
  type CpOptions,
  type FileContent,
  type FsStat,
  type IFileSystem,
  type LazyCommand,
  type MkdirOptions,
  type RmOptions,
} from "just-bash/browser";
import {
  workspaceGrepMatchTextMaximumCharactersV1,
  workspaceGrepResultMaximumUtf8BytesV1,
  type WorkspaceGrepMatchV1,
  type WorkspaceGrepQueryV1,
  type WorkspaceGrepResultV1,
} from "./contracts.ts";

const kibibyteV1 = 1024;
const mebibyteV1 = 1024 * kibibyteV1;
const workspaceMountV1 = "/workspace";
const maximumPathViewEntriesV1 = 8_192;
const maximumPersistentMutationAttemptsV1 = 128;
const maximumChangedPathsV1 = 64;
const maximumShellReadBytesV1 = 16 * mebibyteV1;
const maximumEnvironmentEntriesV1 = 32;
const maximumEnvironmentBytesV1 = 8 * kibibyteV1;
const maximumCommandSourceBytesV1 = 16 * kibibyteV1;
const maximumRequestedTimeoutSecondsV1 = 30;
const ephemeralFileSystemMaximumBytesV1 = 2 * mebibyteV1;

export const browserWorkspaceJustBashCommandAllowlistV1 = Object.freeze(
  [
    "basename",
    "cat",
    "cp",
    "cut",
    "dirname",
    "echo",
    "env",
    "false",
    "find",
    "grep",
    "head",
    "ls",
    "mkdir",
    "mv",
    "printenv",
    "printf",
    "pwd",
    "rg",
    "rm",
    "sed",
    "sleep",
    "sort",
    "stat",
    "tail",
    "tee",
    "tr",
    "true",
    "uniq",
    "wc",
  ] satisfies readonly CommandName[],
);

export const browserWorkspaceJustBashLimitsV1 = Object.freeze(
  {
    ephemeralFileSystemBytes: ephemeralFileSystemMaximumBytesV1,
    environmentEntries: maximumEnvironmentEntriesV1,
    environmentBytes: maximumEnvironmentBytesV1,
    commandSourceBytes: maximumCommandSourceBytesV1,
    shellReadBytes: maximumShellReadBytesV1,
    inputBytes: 32 * mebibyteV1,
    liveBytes: 64 * mebibyteV1,
    outputBytes: 256 * kibibyteV1,
    heredocBytes: mebibyteV1,
    traversalEntries: maximumPathViewEntriesV1,
    traversalDepth: 32,
    commandCount: 512,
    loopIterations: 10_000,
    workUnits: 100_000,
    fileDescriptors: 128,
    executionMilliseconds: 30_000,
    persistentMutationAttempts: maximumPersistentMutationAttemptsV1,
    changedPaths: maximumChangedPathsV1,
    requestedTimeoutSeconds: maximumRequestedTimeoutSecondsV1,
  } as const,
);

/** Closed truth for the only Browser Local shell selected by this checkpoint. */
export const browserWorkspaceJustBashExecutionProfileV1 = Object.freeze(
  {
    revision: 1,
    provider: "browser_local_just_bash",
    outputMode: "terminal_aggregate",
    commandAllowlist: browserWorkspaceJustBashCommandAllowlistV1,
    customCommandAllowlist: Object.freeze(["qjs", "touch"] as const),
    limits: browserWorkspaceJustBashLimitsV1,
  } as const,
);

const browserWorkspaceQuickJsLazyCommandV1: LazyCommand = Object.freeze({
  name: "qjs",
  trusted: true,
  load: async () =>
    (await import("./browser-workspace-quickjs-command.ts")).browserWorkspaceQuickJsCommandV1,
});

export type BrowserWorkspaceJustBashEntryKindV1 = "file" | "directory";

export interface BrowserWorkspaceJustBashPathViewEntryV1 {
  /** Normalized path relative to `/workspace`; the root is implicit. */
  readonly path: string;
  readonly kind: BrowserWorkspaceJustBashEntryKindV1;
}

export interface BrowserWorkspaceJustBashPathViewV1 {
  readonly generation: number;
  readonly entries: readonly BrowserWorkspaceJustBashPathViewEntryV1[];
}

export interface BrowserWorkspaceJustBashFileMetadataV1 {
  readonly kind: BrowserWorkspaceJustBashEntryKindV1;
  readonly size: number;
  readonly mtimeMs: number;
}

export interface BrowserWorkspaceJustBashDirectoryEntryV1 {
  readonly name: string;
  readonly kind: BrowserWorkspaceJustBashEntryKindV1;
}

export interface BrowserWorkspaceJustBashMutationInputV1 {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly expectedGeneration: number;
  readonly signal: AbortSignal;
}

export interface BrowserWorkspaceJustBashMutationResultV1 {
  readonly changed: boolean;
  readonly generation: number;
}

export type BrowserWorkspaceJustBashEntryMutationV1 =
  | "create_directory"
  | "remove_file"
  | "remove_directory";

export interface BrowserWorkspaceJustBashEntryMutationInputV1 {
  readonly operation: BrowserWorkspaceJustBashEntryMutationV1;
  readonly path: string;
  readonly expectedGeneration: number;
  readonly signal: AbortSignal;
}

/**
 * The sole persistent byte authority injected by the Workspace Host. Paths are
 * normalized and relative to `/workspace`; the empty string denotes its root.
 */
export interface BrowserWorkspaceJustBashVolumePortV1 {
  stat(
    path: string,
    signal: AbortSignal,
  ): Promise<BrowserWorkspaceJustBashFileMetadataV1 | null>;
  list(
    path: string,
    signal: AbortSignal,
  ): Promise<readonly BrowserWorkspaceJustBashDirectoryEntryV1[]>;
  read(path: string, signal: AbortSignal): Promise<Uint8Array>;
  replace(
    input: BrowserWorkspaceJustBashMutationInputV1,
  ): Promise<BrowserWorkspaceJustBashMutationResultV1>;
  append(
    input: BrowserWorkspaceJustBashMutationInputV1,
  ): Promise<BrowserWorkspaceJustBashMutationResultV1>;
  mutateEntry(
    input: BrowserWorkspaceJustBashEntryMutationInputV1,
  ): Promise<BrowserWorkspaceJustBashMutationResultV1>;
}

export interface BrowserWorkspaceJustBashExecuteInputV1 {
  readonly command: string;
  readonly cwd: string;
  readonly environment?: Readonly<Record<string, string>>;
  readonly inheritEnv?: boolean;
  readonly requestedTimeoutSeconds?: number;
  readonly signal?: AbortSignal;
  /** Host-owned first-cause deadline that may start before this module is loaded. */
  readonly cancellation?: {
    readonly signal: AbortSignal;
    readonly cause: () => "aborted" | "timeout" | null;
  };
  readonly pathView: BrowserWorkspaceJustBashPathViewV1;
  readonly volume: BrowserWorkspaceJustBashVolumePortV1;
}

interface BrowserWorkspaceJustBashExecutionStateV1 {
  readonly generation: number;
  readonly mutationAttempts: number;
  readonly changedPaths: readonly string[];
}

export type BrowserWorkspaceJustBashFailureCodeV1 =
  | "aborted"
  | "timeout"
  | "capacity_exceeded"
  | "unknown";

export type BrowserWorkspaceJustBashExecuteResultV1 =
  | (BrowserWorkspaceJustBashExecutionStateV1 & {
    readonly ok: true;
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number;
  })
  | (BrowserWorkspaceJustBashExecutionStateV1 & {
    readonly ok: false;
    readonly code: BrowserWorkspaceJustBashFailureCodeV1;
    readonly message: string;
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: null;
  });

class BrowserWorkspaceJustBashRequestErrorV1 extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrowserWorkspaceJustBashRequestErrorV1";
  }
}

function fileSystemErrorV1(code: string, message: string, path?: string): Error {
  const error = new Error(`${code}: ${message}${path === undefined ? "" : `, '${path}'`}`);
  error.name = "BrowserWorkspaceJustBashFileSystemErrorV1";
  Object.defineProperty(error, "code", { configurable: true, enumerable: true, value: code });
  if (path !== undefined) {
    Object.defineProperty(error, "path", { configurable: true, enumerable: true, value: path });
  }
  return error;
}

function errorMessageV1(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compareCodeUnitsV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Product-fixed narrow touch: ensure a regular file exists. OPFS modification
 * times are observable metadata, not portable workspace authority, so date and
 * timestamp mutation flags are deliberately rejected instead of silently
 * claiming POSIX mtime behavior.
 */
const browserWorkspaceTouchCommandV1: Command = defineCommand(
  "touch",
  async (args, context) => {
    let noCreate = false;
    const paths: string[] = [];
    for (let index = 0; index < args.length; index += 1) {
      const argument = args[index]!;
      if (argument === "--") {
        paths.push(...args.slice(index + 1));
        break;
      }
      if (argument === "-c" || argument === "--no-create") {
        noCreate = true;
        continue;
      }
      if (argument === "--help") {
        return {
          stdout: "Usage: touch [-c|--no-create] FILE...\n",
          stderr: "",
          exitCode: 0,
        };
      }
      if (argument.startsWith("-")) {
        return {
          stdout: "",
          stderr: `touch: unsupported option '${argument}'\n`,
          exitCode: 2,
        };
      }
      paths.push(argument);
    }
    if (paths.length === 0) {
      return { stdout: "", stderr: "touch: missing file operand\n", exitCode: 1 };
    }
    let stderr = "";
    let exitCode = 0;
    for (const inputPath of paths) {
      try {
        const path = context.fs.resolvePath(context.cwd, inputPath);
        if (await context.fs.exists(path)) {
          if (!(await context.fs.stat(path)).isFile) {
            throw fileSystemErrorV1("EISDIR", "path is a directory", path);
          }
          continue;
        }
        if (!noCreate) await context.fs.writeFile(path, "");
      } catch (error) {
        stderr += `touch: cannot touch '${inputPath}': ${errorMessageV1(error)}\n`;
        exitCode = 1;
      }
    }
    return { stdout: "", stderr, exitCode };
  },
  { trusted: true },
);

function positiveSafeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function utf8LengthV1(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function normalizedMountedPathV1(path: string): string {
  if (path.includes("\0")) throw fileSystemErrorV1("EINVAL", "path contains NUL", path);
  const source = path.startsWith("/") ? path : `/${path}`;
  const parts: string[] = [];
  for (const part of source.split("/")) {
    if (part.length === 0 || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) {
        throw fileSystemErrorV1("EACCES", "path escapes the mounted filesystem", path);
      }
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.length === 0 ? "/" : `/${parts.join("/")}`;
}

function volumePathV1(path: string): string {
  const normalized = normalizedMountedPathV1(path);
  return normalized === "/" ? "" : normalized.slice(1);
}

function mountedPathV1(path: string): string {
  return path.length === 0 ? "/" : `/${path}`;
}

function parentVolumePathV1(path: string): string {
  const separator = path.lastIndexOf("/");
  return separator < 0 ? "" : path.slice(0, separator);
}

function immediateChildNameV1(parent: string, candidate: string): string | null {
  const prefix = parent.length === 0 ? "" : `${parent}/`;
  if (!candidate.startsWith(prefix)) return null;
  const remainder = candidate.slice(prefix.length);
  return remainder.length > 0 && !remainder.includes("/") ? remainder : null;
}

function latin1FromBytesV1(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.byteLength; offset += 8_192) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8_192)));
  }
  return chunks.join("");
}

function bytesFromLatin1V1(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function hexFromBytesV1(bytes: Uint8Array): string {
  let result = "";
  for (const byte of bytes) result += byte.toString(16).padStart(2, "0");
  return result;
}

function bytesFromHexV1(value: string): Uint8Array {
  if (value.length % 2 !== 0 || !/^[\da-f]*$/iu.test(value)) {
    throw fileSystemErrorV1("EINVAL", "invalid hexadecimal file content");
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.byteLength; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function readEncodingV1(
  options: Parameters<IFileSystem["readFile"]>[1],
): BufferEncoding | null {
  if (typeof options === "string") return options;
  return options?.encoding ?? null;
}

function writeEncodingV1(
  options: Parameters<IFileSystem["writeFile"]>[2],
): BufferEncoding | null {
  if (typeof options === "string") return options;
  return options?.encoding ?? null;
}

function decodeFileContentV1(bytes: Uint8Array, encoding: BufferEncoding | null): string {
  switch (encoding) {
    case "binary":
    case "latin1":
      return latin1FromBytesV1(bytes);
    case "base64":
      return btoa(latin1FromBytesV1(bytes));
    case "hex":
      return hexFromBytesV1(bytes);
    case "ascii":
      return latin1FromBytesV1(bytes).replace(
        /[\u0080-\u00ff]/gu,
        (character) => String.fromCharCode(character.charCodeAt(0) & 0x7f),
      );
    case "utf-8":
    case "utf8":
    case null:
      return new TextDecoder().decode(bytes);
  }
  throw fileSystemErrorV1("EINVAL", `unsupported read encoding: ${String(encoding)}`);
}

function encodeFileContentV1(
  content: FileContent,
  encoding: BufferEncoding | null,
): Uint8Array {
  if (content instanceof Uint8Array) return content.slice();
  switch (encoding) {
    case "binary":
    case "latin1":
      return bytesFromLatin1V1(content);
    case "base64":
      try {
        return bytesFromLatin1V1(atob(content));
      } catch (error) {
        throw fileSystemErrorV1("EINVAL", `invalid base64 file content: ${errorMessageV1(error)}`);
      }
    case "hex":
      return bytesFromHexV1(content);
    case "ascii":
    case "utf-8":
    case "utf8":
    case null:
      return new TextEncoder().encode(content);
  }
  throw fileSystemErrorV1("EINVAL", `unsupported write encoding: ${String(encoding)}`);
}

function validateMetadataV1(
  metadata: BrowserWorkspaceJustBashFileMetadataV1,
  path: string,
): void {
  if (
    (metadata.kind !== "file" && metadata.kind !== "directory") ||
    !Number.isSafeInteger(metadata.size) || metadata.size < 0 ||
    !Number.isFinite(metadata.mtimeMs) || metadata.mtimeMs < 0
  ) throw fileSystemErrorV1("EIO", "persistent volume returned invalid metadata", path);
}

class PersistentWorkspaceFileSystemV1 implements IFileSystem {
  private readonly entryKinds = new Map<string, BrowserWorkspaceJustBashEntryKindV1>();
  private readonly changedPathSet = new Set<string>();
  private readonly changedPathOrder: string[] = [];
  private generation: number;
  private mutationAttempts = 0;
  private capacityExceeded = false;
  private persistentAuthorityFailed = false;

  constructor(
    private readonly volume: BrowserWorkspaceJustBashVolumePortV1,
    pathView: BrowserWorkspaceJustBashPathViewV1,
    private readonly signal: AbortSignal,
  ) {
    if (!positiveSafeIntegerV1(pathView.generation)) {
      throw new BrowserWorkspaceJustBashRequestErrorV1("Workspace path view generation is invalid");
    }
    if (pathView.entries.length > maximumPathViewEntriesV1) {
      throw new BrowserWorkspaceJustBashRequestErrorV1(
        `Workspace path view exceeds ${maximumPathViewEntriesV1} entries`,
      );
    }
    this.generation = pathView.generation;
    for (const entry of pathView.entries) {
      if (entry.kind !== "file" && entry.kind !== "directory") {
        throw new BrowserWorkspaceJustBashRequestErrorV1("Workspace path view kind is invalid");
      }
      const normalized = volumePathV1(entry.path);
      if (normalized.length === 0 || normalized !== entry.path || this.entryKinds.has(normalized)) {
        throw new BrowserWorkspaceJustBashRequestErrorV1(
          `Workspace path view contains an invalid or duplicate path: ${entry.path}`,
        );
      }
      this.entryKinds.set(normalized, entry.kind);
    }
    for (const [path] of this.entryKinds) {
      const parent = parentVolumePathV1(path);
      if (parent.length > 0 && this.entryKinds.get(parent) !== "directory") {
        throw new BrowserWorkspaceJustBashRequestErrorV1(
          `Workspace path view omits directory parent: ${parent}`,
        );
      }
    }
  }

  state(): BrowserWorkspaceJustBashExecutionStateV1 {
    return {
      generation: this.generation,
      mutationAttempts: this.mutationAttempts,
      changedPaths: [...this.changedPathOrder],
    };
  }

  capacityWasExceeded(): boolean {
    return this.capacityExceeded;
  }

  authorityFailureWasObserved(): boolean {
    return this.persistentAuthorityFailed;
  }

  hasDirectory(path: string): boolean {
    const relative = volumePathV1(path);
    return relative.length === 0 || this.entryKinds.get(relative) === "directory";
  }

  private throwIfAborted(): void {
    if (this.signal.aborted) throw fileSystemErrorV1("ECANCELED", "filesystem operation aborted");
  }

  private async metadata(path: string): Promise<BrowserWorkspaceJustBashFileMetadataV1 | null> {
    this.throwIfAborted();
    const relative = volumePathV1(path);
    try {
      const metadata = await this.volume.stat(relative, this.signal);
      this.throwIfAborted();
      const expectedKind = relative.length === 0 ? "directory" : this.entryKinds.get(relative);
      if (metadata === null) {
        if (expectedKind !== undefined) {
          throw fileSystemErrorV1("ESTALE", "path view names a missing volume entry", path);
        }
        return null;
      }
      validateMetadataV1(metadata, path);
      if (expectedKind === undefined || metadata.kind !== expectedKind) {
        throw fileSystemErrorV1("ESTALE", "path view and volume metadata disagree", path);
      }
      return metadata;
    } catch (error) {
      this.persistentAuthorityFailed = true;
      throw error;
    }
  }

  private validateParent(path: string): string {
    const relative = volumePathV1(path);
    if (relative.length === 0) throw fileSystemErrorV1("EISDIR", "cannot replace mount root", path);
    const existingKind = this.entryKinds.get(relative);
    if (existingKind === "directory") {
      throw fileSystemErrorV1("EISDIR", "persistent path is a directory", path);
    }
    const parent = parentVolumePathV1(relative);
    if (parent.length > 0 && this.entryKinds.get(parent) !== "directory") {
      throw fileSystemErrorV1("ENOENT", "persistent parent directory does not exist", path);
    }
    return relative;
  }

  private beginPersistentMutationAttempt(path: string): void {
    if (this.mutationAttempts >= maximumPersistentMutationAttemptsV1) {
      this.capacityExceeded = true;
      throw fileSystemErrorV1(
        "E2BIG",
        `persistent mutation attempt limit exceeded (${maximumPersistentMutationAttemptsV1})`,
        path,
      );
    }
    this.mutationAttempts += 1;
  }

  private admitPersistentChangedPath(path: string, relative: string): void {
    if (
      !this.changedPathSet.has(relative) &&
      this.changedPathSet.size >= maximumChangedPathsV1
    ) {
      this.capacityExceeded = true;
      throw fileSystemErrorV1(
        "E2BIG",
        `persistent changed-path limit exceeded (${maximumChangedPathsV1})`,
        path,
      );
    }
  }

  private publishMutationResult(
    path: string,
    relative: string,
    result: BrowserWorkspaceJustBashMutationResultV1,
  ): void {
    if (typeof result.changed !== "boolean") {
      throw fileSystemErrorV1("ESTALE", "persistent mutation returned an invalid result", path);
    }
    const expectedGeneration = result.changed ? this.generation + 1 : this.generation;
    if (!positiveSafeIntegerV1(result.generation) || result.generation !== expectedGeneration) {
      throw fileSystemErrorV1("ESTALE", "persistent mutation returned an invalid generation", path);
    }
    this.generation = result.generation;
    if (!result.changed) return;
    if (!this.changedPathSet.has(relative)) {
      this.changedPathSet.add(relative);
      this.changedPathOrder.push(relative);
    }
    // A completed volume mutation remains authoritative even if cancellation
    // raced with its reply. Publish its returned head before reporting abort.
    this.throwIfAborted();
  }

  private async mutate(
    operation: "replace" | "append",
    path: string,
    bytes: Uint8Array,
  ): Promise<void> {
    this.throwIfAborted();
    // An admitted persistent write request consumes an attempt even when its
    // parent path is absent. This preserves the existing per-bash abuse bound.
    this.beginPersistentMutationAttempt(path);
    const relative = this.validateParent(path);
    this.admitPersistentChangedPath(path, relative);
    try {
      const result = await this.volume[operation]({
        path: relative,
        bytes: bytes.slice(),
        expectedGeneration: this.generation,
        signal: this.signal,
      });
      this.publishMutationResult(path, relative, result);
      if (result.changed) this.entryKinds.set(relative, "file");
    } catch (error) {
      this.persistentAuthorityFailed = true;
      throw error;
    }
  }

  private async mutateEntry(
    operation: BrowserWorkspaceJustBashEntryMutationV1,
    path: string,
  ): Promise<void> {
    this.throwIfAborted();
    const relative = volumePathV1(path);
    if (relative.length === 0) {
      throw fileSystemErrorV1("EBUSY", "cannot mutate the workspace root", path);
    }
    this.beginPersistentMutationAttempt(path);
    this.admitPersistentChangedPath(path, relative);
    try {
      const result = await this.volume.mutateEntry({
        operation,
        path: relative,
        expectedGeneration: this.generation,
        signal: this.signal,
      });
      if (!result.changed) {
        throw fileSystemErrorV1("ESTALE", "entry mutation reported no effect", path);
      }
      this.publishMutationResult(path, relative, result);
      if (operation === "create_directory") this.entryKinds.set(relative, "directory");
      else this.entryKinds.delete(relative);
    } catch (error) {
      this.persistentAuthorityFailed = true;
      throw error;
    }
  }

  async readFile(
    path: string,
    options?: Parameters<IFileSystem["readFile"]>[1],
  ): Promise<string> {
    return decodeFileContentV1(await this.readFileBuffer(path), readEncodingV1(options));
  }

  async readFileBuffer(path: string): Promise<Uint8Array> {
    const metadata = await this.metadata(path);
    if (metadata === null) throw fileSystemErrorV1("ENOENT", "file does not exist", path);
    if (metadata.kind === "directory") {
      throw fileSystemErrorV1("EISDIR", "path is a directory", path);
    }
    if (metadata.size > maximumShellReadBytesV1) {
      this.capacityExceeded = true;
      throw fileSystemErrorV1(
        "EFBIG",
        `shell read exceeds ${maximumShellReadBytesV1} bytes`,
        path,
      );
    }
    try {
      this.throwIfAborted();
      const bytes = await this.volume.read(volumePathV1(path), this.signal);
      this.throwIfAborted();
      if (bytes.byteLength !== metadata.size || bytes.byteLength > maximumShellReadBytesV1) {
        throw fileSystemErrorV1("ESTALE", "persistent read disagrees with metadata", path);
      }
      return bytes.slice();
    } catch (error) {
      this.persistentAuthorityFailed = true;
      throw error;
    }
  }

  async writeFile(
    path: string,
    content: FileContent,
    options?: Parameters<IFileSystem["writeFile"]>[2],
  ): Promise<void> {
    await this.mutate("replace", path, encodeFileContentV1(content, writeEncodingV1(options)));
  }

  async appendFile(
    path: string,
    content: FileContent,
    options?: Parameters<IFileSystem["appendFile"]>[2],
  ): Promise<void> {
    await this.mutate("append", path, encodeFileContentV1(content, writeEncodingV1(options)));
  }

  async exists(path: string): Promise<boolean> {
    return await this.metadata(path) !== null;
  }

  async stat(path: string): Promise<FsStat> {
    const metadata = await this.metadata(path);
    if (metadata === null) throw fileSystemErrorV1("ENOENT", "path does not exist", path);
    return {
      isFile: metadata.kind === "file",
      isDirectory: metadata.kind === "directory",
      isSymbolicLink: false,
      mode: metadata.kind === "directory" ? 0o755 : 0o644,
      size: metadata.size,
      mtime: new Date(metadata.mtimeMs),
      identity: `sillyos:${volumePathV1(path)}`,
    };
  }

  async lstat(path: string): Promise<FsStat> {
    return await this.stat(path);
  }

  async readdir(path: string): Promise<string[]> {
    const metadata = await this.metadata(path);
    if (metadata === null) throw fileSystemErrorV1("ENOENT", "directory does not exist", path);
    if (metadata.kind !== "directory") {
      throw fileSystemErrorV1("ENOTDIR", "path is not a directory", path);
    }
    const relative = volumePathV1(path);
    try {
      this.throwIfAborted();
      const entries = await this.volume.list(relative, this.signal);
      this.throwIfAborted();
      const actual = new Map<string, BrowserWorkspaceJustBashEntryKindV1>();
      for (const entry of entries) {
        if (
          entry.name.length === 0 || entry.name === "." || entry.name === ".." ||
          entry.name.includes("/") || entry.name.includes("\0") ||
          (entry.kind !== "file" && entry.kind !== "directory") || actual.has(entry.name)
        ) {
          throw fileSystemErrorV1(
            "EIO",
            "persistent volume returned an invalid directory entry",
            path,
          );
        }
        actual.set(entry.name, entry.kind);
      }
      const expected = new Map<string, BrowserWorkspaceJustBashEntryKindV1>();
      for (const [candidate, kind] of this.entryKinds) {
        const name = immediateChildNameV1(relative, candidate);
        if (name !== null) expected.set(name, kind);
      }
      if (
        actual.size !== expected.size ||
        [...expected].some(([name, kind]) => actual.get(name) !== kind)
      ) throw fileSystemErrorV1("ESTALE", "path view and directory listing disagree", path);
      return [...actual.keys()].sort();
    } catch (error) {
      this.persistentAuthorityFailed = true;
      throw error;
    }
  }

  resolvePath(base: string, path: string): string {
    return normalizedMountedPathV1(path.startsWith("/") ? path : `${base}/${path}`);
  }

  getAllPaths(): string[] {
    return ["/", ...[...this.entryKinds.keys()].map(mountedPathV1)].sort();
  }

  async realpath(path: string): Promise<string> {
    await this.stat(path);
    return normalizedMountedPathV1(path);
  }

  async mkdir(path: string, options?: MkdirOptions): Promise<void> {
    const relative = volumePathV1(path);
    if (relative.length === 0) {
      if (options?.recursive) return;
      throw fileSystemErrorV1("EEXIST", "directory already exists", path);
    }
    const existing = this.entryKinds.get(relative);
    if (existing !== undefined) {
      if (options?.recursive && existing === "directory") return;
      throw fileSystemErrorV1("EEXIST", "path already exists", path);
    }
    if (!options?.recursive) {
      const parent = parentVolumePathV1(relative);
      if (parent.length > 0 && this.entryKinds.get(parent) !== "directory") {
        throw fileSystemErrorV1("ENOENT", "parent directory does not exist", path);
      }
      await this.mutateEntry("create_directory", path);
      return;
    }
    let current = "";
    for (const part of relative.split("/")) {
      current = current.length === 0 ? part : `${current}/${part}`;
      const kind = this.entryKinds.get(current);
      if (kind === "file") {
        throw fileSystemErrorV1(
          "ENOTDIR",
          "path component is not a directory",
          mountedPathV1(current),
        );
      }
      if (kind === undefined) await this.mutateEntry("create_directory", mountedPathV1(current));
    }
  }

  async rm(path: string, options?: RmOptions): Promise<void> {
    const relative = volumePathV1(path);
    if (relative.length === 0) {
      throw fileSystemErrorV1("EBUSY", "cannot remove the workspace root", path);
    }
    const kind = this.entryKinds.get(relative);
    if (kind === undefined) {
      if (options?.force) return;
      throw fileSystemErrorV1("ENOENT", "path does not exist", path);
    }
    if (kind === "file") {
      await this.mutateEntry("remove_file", path);
      return;
    }
    const descendants = [...this.entryKinds.keys()]
      .filter((candidate) => candidate.startsWith(`${relative}/`))
      .sort((left, right) => {
        const depth = right.split("/").length - left.split("/").length;
        return depth !== 0 ? depth : compareCodeUnitsV1(left, right);
      });
    if (descendants.length > 0 && !options?.recursive) {
      throw fileSystemErrorV1("ENOTEMPTY", "directory is not empty", path);
    }
    for (const descendant of descendants) {
      await this.mutateEntry(
        this.entryKinds.get(descendant) === "directory" ? "remove_directory" : "remove_file",
        mountedPathV1(descendant),
      );
    }
    await this.mutateEntry("remove_directory", path);
  }

  async cp(source: string, destination: string, options?: CpOptions): Promise<void> {
    const sourceRelative = volumePathV1(source);
    const destinationRelative = volumePathV1(destination);
    if (sourceRelative.length === 0 || destinationRelative.length === 0) {
      throw fileSystemErrorV1("EBUSY", "workspace root copy is not supported", source);
    }
    const sourceKind = this.entryKinds.get(sourceRelative);
    if (sourceKind === undefined) {
      throw fileSystemErrorV1("ENOENT", "source does not exist", source);
    }
    if (sourceKind === "file") {
      if (this.entryKinds.get(destinationRelative) === "directory") {
        throw fileSystemErrorV1("EISDIR", "copy target is a directory", destination);
      }
      await this.writeFile(destination, await this.readFileBuffer(source));
      return;
    }
    if (!options?.recursive) {
      throw fileSystemErrorV1("EISDIR", "source is a directory", source);
    }
    if (this.entryKinds.get(destinationRelative) === "file") {
      throw fileSystemErrorV1("ENOTDIR", "copy target is not a directory", destination);
    }
    if (!this.entryKinds.has(destinationRelative)) await this.mkdir(destination);
    for (const name of await this.readdir(source)) {
      await this.cp(`${source}/${name}`, `${destination}/${name}`, { recursive: true });
    }
  }

  async mv(source: string, destination: string): Promise<void> {
    const sourceRelative = volumePathV1(source);
    const sourceKind = this.entryKinds.get(sourceRelative);
    if (sourceRelative.length === 0 || sourceKind === undefined) {
      throw fileSystemErrorV1(
        sourceRelative.length === 0 ? "EBUSY" : "ENOENT",
        sourceRelative.length === 0
          ? "workspace root move is not supported"
          : "source does not exist",
        source,
      );
    }
    await this.cp(source, destination, { recursive: sourceKind === "directory" });
    await this.rm(source, { recursive: sourceKind === "directory" });
  }

  async chmod(path: string, _mode: number): Promise<void> {
    // MountableFs uses chmod while copying between /tmp and /workspace. The
    // VFS has fixed file/directory modes, so this validates existence without
    // pretending mutable permissions are workspace state.
    await this.stat(path);
  }

  async symlink(_target: string, linkPath: string): Promise<void> {
    throw fileSystemErrorV1(
      "ENOTSUP",
      "symbolic links are not supported by Browser Local C2",
      linkPath,
    );
  }

  async link(_existingPath: string, newPath: string): Promise<void> {
    throw fileSystemErrorV1("ENOTSUP", "hard links are not supported by Browser Local C2", newPath);
  }

  async readlink(path: string): Promise<string> {
    throw fileSystemErrorV1(
      "ENOTSUP",
      "symbolic links are not supported by Browser Local C2",
      path,
    );
  }

  async utimes(path: string, _atime: Date, _mtime: Date): Promise<void> {
    throw fileSystemErrorV1("ENOTSUP", "utimes is not supported by Browser Local C2", path);
  }
}

const productEnvironmentV1 = Object.freeze({
  HOME: workspaceMountV1,
  PWD: workspaceMountV1,
  OLDPWD: workspaceMountV1,
  PATH: "/usr/bin:/bin",
  TMPDIR: "/tmp",
  LANG: "C.UTF-8",
  LC_ALL: "C.UTF-8",
});

function admittedEnvironmentV1(
  value: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  const entries = Object.entries(value ?? {});
  if (entries.length > maximumEnvironmentEntriesV1) {
    throw new BrowserWorkspaceJustBashRequestErrorV1(
      `Shell environment exceeds ${maximumEnvironmentEntriesV1} entries`,
    );
  }
  let bytes = 0;
  const admitted: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [key, entryValue] of entries) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/u.test(key) || typeof entryValue !== "string") {
      throw new BrowserWorkspaceJustBashRequestErrorV1("Shell environment entry is invalid");
    }
    bytes += utf8LengthV1(key) + utf8LengthV1(entryValue);
    if (bytes > maximumEnvironmentBytesV1) {
      throw new BrowserWorkspaceJustBashRequestErrorV1(
        `Shell environment exceeds ${maximumEnvironmentBytesV1} UTF-8 bytes`,
      );
    }
    admitted[key] = entryValue;
  }
  return admitted;
}

function executionEnvironmentV1(
  input: BrowserWorkspaceJustBashExecuteInputV1,
): Record<string, string> {
  const supplied = admittedEnvironmentV1(input.environment);
  const environment = input.inheritEnv === false
    ? supplied
    : { ...productEnvironmentV1, ...supplied };
  environment.PWD = input.cwd;
  return environment;
}

async function initializeEphemeralFileSystemV1(
  commands: readonly CommandName[] = browserWorkspaceJustBashCommandAllowlistV1,
  customCommands: readonly string[] = [],
): Promise<InMemoryFs> {
  const filesystem = new InMemoryFs(undefined, {
    maxTotalBytes: ephemeralFileSystemMaximumBytesV1,
  });
  for (const path of ["/bin", "/usr/bin", "/dev/fd", "/proc/self/fd", "/tmp"]) {
    await filesystem.mkdir(path, { recursive: true });
  }
  for (const command of commands) {
    const stub = `#!/bin/bash\n# SillyOS built-in command: ${command}\n`;
    await filesystem.writeFile(`/bin/${command}`, stub);
    await filesystem.writeFile(`/usr/bin/${command}`, stub);
  }
  for (const command of customCommands) {
    const stub = `#!/bin/bash\n# SillyOS fixed custom command: ${command}\n`;
    await filesystem.writeFile(`/bin/${command}`, stub);
    await filesystem.writeFile(`/usr/bin/${command}`, stub);
  }
  const supportFiles: Readonly<Record<string, string | Uint8Array>> = {
    "/dev/null": "",
    "/dev/zero": new Uint8Array(),
    "/dev/stdin": "",
    "/dev/stdout": "",
    "/dev/stderr": "",
    "/proc/self/exe": "/bin/bash",
    "/proc/self/cmdline": "bash\0",
    "/proc/self/comm": "bash\n",
    "/proc/self/status": "Name:\tbash\nPid:\t1\nPPid:\t0\nUid:\t1000\nGid:\t1000\n",
    "/proc/self/fd/0": "/dev/stdin",
    "/proc/self/fd/1": "/dev/stdout",
    "/proc/self/fd/2": "/dev/stderr",
  };
  for (const [path, content] of Object.entries(supportFiles)) {
    await filesystem.writeFile(path, content);
  }
  return filesystem;
}

function admittedTimeoutV1(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value <= 0) {
    throw new BrowserWorkspaceJustBashRequestErrorV1(
      "Requested shell timeout must be a finite positive number of seconds",
    );
  }
  if (value > maximumRequestedTimeoutSecondsV1) {
    throw new BrowserWorkspaceJustBashRequestErrorV1(
      `Requested shell timeout exceeds the Browser Local ${maximumRequestedTimeoutSecondsV1}-second limit`,
    );
  }
  return value;
}

interface ExecutionCancellationV1 {
  readonly signal: AbortSignal;
  readonly cause: () => "aborted" | "timeout" | null;
  readonly settle: () => void;
}

function executionCancellationV1(
  externalSignal: AbortSignal | undefined,
  requestedTimeoutSeconds: number | undefined,
): ExecutionCancellationV1 {
  const controller = new AbortController();
  let cause: "aborted" | "timeout" | null = null;
  let settled = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const abort = (nextCause: "aborted" | "timeout"): void => {
    if (settled || cause !== null) return;
    cause = nextCause;
    controller.abort();
  };
  const onExternalAbort = (): void => abort("aborted");
  externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
  if (externalSignal?.aborted) onExternalAbort();
  if (requestedTimeoutSeconds !== undefined && cause === null) {
    timeoutHandle = setTimeout(() => abort("timeout"), requestedTimeoutSeconds * 1_000);
  }
  return {
    signal: controller.signal,
    cause: () => cause,
    settle: () => {
      if (settled) return;
      settled = true;
      externalSignal?.removeEventListener("abort", onExternalAbort);
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    },
  };
}

function failedExecutionV1(
  code: BrowserWorkspaceJustBashFailureCodeV1,
  message: string,
  state: BrowserWorkspaceJustBashExecutionStateV1,
  output?: { readonly stdout: string; readonly stderr: string },
): BrowserWorkspaceJustBashExecuteResultV1 {
  return {
    ok: false,
    code,
    message,
    stdout: output?.stdout ?? "",
    stderr: output?.stderr ?? "",
    exitCode: null,
    ...state,
  };
}

/** Execute one terminal-aggregate Browser Local shell call against one exact workspace view. */
export async function executeBrowserWorkspaceJustBashV1(
  input: BrowserWorkspaceJustBashExecuteInputV1,
): Promise<BrowserWorkspaceJustBashExecuteResultV1> {
  let persistentFileSystem: PersistentWorkspaceFileSystemV1 | null = null;
  let cancellation: ExecutionCancellationV1 | null = null;
  try {
    if (utf8LengthV1(input.command) > maximumCommandSourceBytesV1) {
      throw new BrowserWorkspaceJustBashRequestErrorV1(
        `Shell command exceeds ${maximumCommandSourceBytesV1} UTF-8 bytes`,
      );
    }
    if (
      input.cancellation !== undefined &&
      (input.requestedTimeoutSeconds !== undefined || input.signal !== undefined)
    ) {
      throw new BrowserWorkspaceJustBashRequestErrorV1(
        "Shell execution cannot own and inherit cancellation",
      );
    }
    const requestedTimeoutSeconds = admittedTimeoutV1(input.requestedTimeoutSeconds);
    const environment = executionEnvironmentV1(input);
    cancellation = input.cancellation === undefined
      ? executionCancellationV1(input.signal, requestedTimeoutSeconds)
      : {
        signal: input.cancellation.signal,
        cause: input.cancellation.cause,
        settle: () => undefined,
      };
    const initialCause = cancellation.cause();
    if (initialCause !== null) {
      return failedExecutionV1(
        initialCause,
        initialCause === "aborted"
          ? "Workspace shell request was aborted"
          : "Workspace shell request timed out",
        {
          generation: input.pathView.generation,
          mutationAttempts: 0,
          changedPaths: [],
        },
      );
    }
    persistentFileSystem = new PersistentWorkspaceFileSystemV1(
      input.volume,
      input.pathView,
      cancellation.signal,
    );
    if (!input.cwd.startsWith(`${workspaceMountV1}/`) && input.cwd !== workspaceMountV1) {
      throw new BrowserWorkspaceJustBashRequestErrorV1("Shell cwd is outside /workspace");
    }
    const mountedCwd = normalizedMountedPathV1(
      input.cwd.slice(workspaceMountV1.length) || "/",
    );
    const canonicalCwd = mountedCwd === "/" ? workspaceMountV1 : `${workspaceMountV1}${mountedCwd}`;
    if (input.cwd !== canonicalCwd) {
      throw new BrowserWorkspaceJustBashRequestErrorV1(
        "Shell cwd is not a normalized /workspace path",
      );
    }
    if (!persistentFileSystem.hasDirectory(mountedCwd)) {
      throw new BrowserWorkspaceJustBashRequestErrorV1("Shell cwd is not an existing directory");
    }
    const ephemeral = await initializeEphemeralFileSystemV1(
      browserWorkspaceJustBashExecutionProfileV1.commandAllowlist,
      browserWorkspaceJustBashExecutionProfileV1.customCommandAllowlist,
    );
    const filesystem = new MountableFs({
      base: ephemeral,
      mounts: [{ mountPoint: workspaceMountV1, filesystem: persistentFileSystem }],
    });
    const bash = new Bash({
      cwd: workspaceMountV1,
      env: productEnvironmentV1,
      fs: filesystem,
      commands: [...browserWorkspaceJustBashExecutionProfileV1.commandAllowlist],
      customCommands: [browserWorkspaceQuickJsLazyCommandV1, browserWorkspaceTouchCommandV1],
      python: false,
      javascript: false,
      executionLimitProfile: "normal",
      executionLimits: {
        maxSourceBytes: maximumCommandSourceBytesV1,
        maxCommandCount: 512,
        maxLoopIterations: 10_000,
        maxSedIterations: 10_000,
        maxWorkUnits: 100_000,
        maxTraversalEntries: maximumPathViewEntriesV1,
        maxTraversalDepth: 32,
        maxTraversalWork: 100_000,
        maxLiveBytes: 64 * mebibyteV1,
        maxInputBytes: 32 * mebibyteV1,
        maxExecutionTimeMs: 30_000,
        maxGlobOperations: 100_000,
        maxStringLength: 64 * mebibyteV1,
        maxHeredocSize: mebibyteV1,
        maxOutputSize: 256 * kibibyteV1,
        maxFileDescriptors: 128,
      },
    });
    const result = await bash.exec(input.command, {
      cwd: input.cwd,
      env: environment,
      replaceEnv: true,
      rawScript: true,
      signal: cancellation.signal,
    });
    const cause = cancellation.cause();
    cancellation.settle();
    const state = persistentFileSystem.state();
    if (cause !== null) {
      return failedExecutionV1(
        cause,
        cause === "aborted"
          ? "Workspace shell request was aborted"
          : "Workspace shell request timed out",
        state,
        result,
      );
    }
    if (persistentFileSystem.capacityWasExceeded()) {
      return failedExecutionV1(
        "capacity_exceeded",
        "Workspace shell persistent capacity limit was reached",
        state,
        result,
      );
    }
    if (persistentFileSystem.authorityFailureWasObserved()) {
      return failedExecutionV1(
        "unknown",
        "Workspace shell persistent authority failed",
        state,
        result,
      );
    }
    return {
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      ...state,
    };
  } catch (error) {
    const cause = cancellation?.cause() ?? null;
    return failedExecutionV1(
      cause ?? (persistentFileSystem?.capacityWasExceeded() ? "capacity_exceeded" : "unknown"),
      cause === "aborted"
        ? "Workspace shell request was aborted"
        : cause === "timeout"
        ? "Workspace shell request timed out"
        : persistentFileSystem?.capacityWasExceeded()
        ? "Workspace shell persistent capacity limit was reached"
        : errorMessageV1(error),
      persistentFileSystem?.state() ?? {
        generation: positiveSafeIntegerV1(input.pathView.generation)
          ? input.pathView.generation
          : 0,
        mutationAttempts: 0,
        changedPaths: [],
      },
    );
  } finally {
    cancellation?.settle();
  }
}

export interface BrowserWorkspaceStructuredGrepExecuteInputV1 {
  readonly query: WorkspaceGrepQueryV1;
  readonly pathView: BrowserWorkspaceJustBashPathViewV1;
  readonly volume: BrowserWorkspaceJustBashVolumePortV1;
  readonly cancellation: {
    readonly signal: AbortSignal;
    readonly cause: () => "aborted" | "timeout" | null;
  };
}

export type BrowserWorkspaceStructuredGrepExecuteResultV1 =
  | { readonly ok: true; readonly result: WorkspaceGrepResultV1 }
  | {
    readonly ok: false;
    readonly code: "aborted" | "timeout" | "execution_failed";
    readonly message: string;
  };

function structuredGrepFailureV1(
  input: BrowserWorkspaceStructuredGrepExecuteInputV1,
  message: string,
): BrowserWorkspaceStructuredGrepExecuteResultV1 {
  const cause = input.cancellation.cause();
  return {
    ok: false,
    code: cause ?? "execution_failed",
    message: cause === "aborted"
      ? "Workspace grep request was aborted"
      : cause === "timeout"
      ? "Workspace grep request timed out"
      : message,
  };
}

function structuredGrepCandidatesV1(
  query: WorkspaceGrepQueryV1,
  pathView: BrowserWorkspaceJustBashPathViewV1,
): readonly string[] {
  const relative = query.path === workspaceMountV1
    ? ""
    : query.path.slice(`${workspaceMountV1}/`.length);
  return pathView.entries
    .filter((entry) =>
      entry.kind === "file" &&
      (relative.length === 0 || entry.path === relative || entry.path.startsWith(`${relative}/`))
    )
    .map((entry) => entry.path)
    .sort();
}

const structuredGrepMatchSentinelV1 = "__SILLYOS_GREP_MATCH__";
const structuredGrepMatchLinePatternV1 = /^([1-9]\d*):__SILLYOS_GREP_MATCH__$/u;

function escapedStructuredGrepLiteralV1(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&");
}

function structuredGrepLineProbePatternV1(query: WorkspaceGrepQueryV1): string {
  const pattern = query.literal ? escapedStructuredGrepLiteralV1(query.pattern) : query.pattern;
  // Consuming the remainder of the matching line makes `--only-matching`
  // produce exactly one bounded sentinel even when the original expression
  // occurs thousands of times on that line.
  return `(?:${pattern})[^\n]*`;
}

function structuredGrepMatchLineNumberV1(value: string): number | null {
  const match = structuredGrepMatchLinePatternV1.exec(value);
  if (match === null) return null;
  const line = Number(match[1]);
  return Number.isSafeInteger(line) && line > 0 ? line : null;
}

function boundedMatchTextV1(
  source: string,
  start: number,
  end: number,
): { readonly text: string; readonly truncated: boolean } {
  const characters: string[] = [];
  for (let index = start; index < end;) {
    const codePoint = source.codePointAt(index);
    if (codePoint === undefined) break;
    if (characters.length === workspaceGrepMatchTextMaximumCharactersV1) {
      return { text: characters.join(""), truncated: true };
    }
    characters.push(String.fromCodePoint(codePoint));
    index += codePoint > 0xffff ? 2 : 1;
  }
  return { text: characters.join(""), truncated: false };
}

function structuredGrepLineTextsV1(
  source: string,
  lineNumbers: ReadonlySet<number>,
): ReadonlyMap<number, { readonly text: string; readonly truncated: boolean }> {
  const remaining = new Set(lineNumbers);
  const result = new Map<number, { readonly text: string; readonly truncated: boolean }>();
  let line = 1;
  let start = 0;
  while (start <= source.length && remaining.size > 0) {
    const newline = source.indexOf("\n", start);
    const rawEnd = newline < 0 ? source.length : newline;
    const end = rawEnd > start && source.charCodeAt(rawEnd - 1) === 13 ? rawEnd - 1 : rawEnd;
    if (remaining.delete(line)) result.set(line, boundedMatchTextV1(source, start, end));
    if (newline < 0) break;
    start = newline + 1;
    line += 1;
  }
  return result;
}

function grepResultBytesV1(result: WorkspaceGrepResultV1): number {
  return new TextEncoder().encode(JSON.stringify(result)).byteLength;
}

/**
 * Run the one structured grep primitive. `args` bypasses shell parsing; fixed
 * `rg` remains the only command and receives a read-only persistent mount.
 */
export async function executeBrowserWorkspaceStructuredGrepV1(
  input: BrowserWorkspaceStructuredGrepExecuteInputV1,
): Promise<BrowserWorkspaceStructuredGrepExecuteResultV1> {
  let persistentFileSystem: PersistentWorkspaceFileSystemV1 | null = null;
  try {
    const initialCause = input.cancellation.cause();
    if (initialCause !== null || input.cancellation.signal.aborted) {
      return structuredGrepFailureV1(input, "Workspace grep request was aborted");
    }
    persistentFileSystem = new PersistentWorkspaceFileSystemV1(
      input.volume,
      input.pathView,
      input.cancellation.signal,
    );
    const ephemeral = await initializeEphemeralFileSystemV1(["rg"]);
    const filesystem = new MountableFs({
      base: ephemeral,
      mounts: [{ mountPoint: workspaceMountV1, filesystem: persistentFileSystem }],
    });
    const bash = new Bash({
      cwd: workspaceMountV1,
      env: productEnvironmentV1,
      fs: filesystem,
      commands: ["rg"],
      python: false,
      javascript: false,
      executionLimitProfile: "normal",
      executionLimits: {
        maxSourceBytes: 64,
        maxCommandCount: 1,
        maxLoopIterations: 10_000,
        maxWorkUnits: 100_000,
        maxTraversalEntries: maximumPathViewEntriesV1,
        maxTraversalDepth: 32,
        maxTraversalWork: 100_000,
        maxLiveBytes: 64 * mebibyteV1,
        maxInputBytes: 32 * mebibyteV1,
        maxExecutionTimeMs: 5_000,
        maxGlobOperations: 100_000,
        maxStringLength: 64 * mebibyteV1,
        maxOutputSize: 256 * kibibyteV1,
        maxArrayElements: maximumPathViewEntriesV1,
        maxFileDescriptors: 32,
      },
    });
    const matches: WorkspaceGrepMatchV1[] = [];
    let truncated = false;
    search: for (const path of structuredGrepCandidatesV1(input.query, input.pathView)) {
      const cause = input.cancellation.cause();
      if (cause !== null || input.cancellation.signal.aborted) {
        return structuredGrepFailureV1(input, "Workspace grep request was aborted");
      }
      const remaining = input.query.limit + 1 - matches.length;
      const args = [
        "--hidden",
        "--no-ignore",
        "--sort=path",
        "--only-matching",
        "--replace",
        structuredGrepMatchSentinelV1,
        "--line-number",
        "--no-filename",
        "--max-count",
        String(Math.max(1, remaining)),
      ];
      args.push(input.query.ignoreCase ? "--ignore-case" : "--case-sensitive");
      if (input.query.glob !== null) args.push("--glob", input.query.glob);
      // Prefix the single admitted file operand so an option-like workspace
      // name can never be reinterpreted as an rg flag.
      args.push("--regexp", structuredGrepLineProbePatternV1(input.query), `./${path}`);
      const execution = await bash.exec("rg", {
        cwd: workspaceMountV1,
        env: productEnvironmentV1,
        replaceEnv: true,
        args,
        signal: input.cancellation.signal,
      });
      if (input.cancellation.cause() !== null || input.cancellation.signal.aborted) {
        return structuredGrepFailureV1(input, "Workspace grep request was aborted");
      }
      if (execution.exitCode !== 0 && execution.exitCode !== 1) {
        return structuredGrepFailureV1(
          input,
          execution.stderr.trim() || "Workspace grep execution failed",
        );
      }
      const matchedLines = new Set<number>();
      for (const line of execution.stdout.split("\n")) {
        if (line.length === 0) continue;
        const lineNumber = structuredGrepMatchLineNumberV1(line);
        if (lineNumber === null) {
          return structuredGrepFailureV1(input, "Workspace grep returned malformed output");
        }
        matchedLines.add(lineNumber);
      }
      if (matchedLines.size === 0) continue;
      const fileText = new TextDecoder().decode(
        await persistentFileSystem.readFileBuffer(`./${path}`),
      );
      const lineTexts = structuredGrepLineTextsV1(fileText, matchedLines);
      for (const lineNumber of [...matchedLines].sort((left, right) => left - right)) {
        const bounded = lineTexts.get(lineNumber);
        if (bounded === undefined) {
          return structuredGrepFailureV1(input, "Workspace grep returned an invalid line number");
        }
        if (matches.length >= input.query.limit) {
          truncated = true;
          break search;
        }
        const match: WorkspaceGrepMatchV1 = {
          path: `${workspaceMountV1}/${path}`,
          line: lineNumber,
          text: bounded.text,
        };
        const next: WorkspaceGrepResultV1 = {
          revision: 1,
          generation: input.pathView.generation,
          matches: [...matches, match],
          truncated: false,
        };
        if (grepResultBytesV1(next) > workspaceGrepResultMaximumUtf8BytesV1) {
          truncated = true;
          break search;
        }
        matches.push(match);
        truncated ||= bounded.truncated;
      }
    }
    const state = persistentFileSystem.state();
    if (
      state.generation !== input.pathView.generation || state.mutationAttempts !== 0 ||
      state.changedPaths.length !== 0
    ) return structuredGrepFailureV1(input, "Workspace grep changed its read-only volume");
    const result: WorkspaceGrepResultV1 = {
      revision: 1,
      generation: input.pathView.generation,
      matches,
      truncated,
    };
    if (grepResultBytesV1(result) > workspaceGrepResultMaximumUtf8BytesV1) {
      return structuredGrepFailureV1(input, "Workspace grep result exceeded its output limit");
    }
    return { ok: true, result };
  } catch (error) {
    return structuredGrepFailureV1(input, errorMessageV1(error));
  }
}
