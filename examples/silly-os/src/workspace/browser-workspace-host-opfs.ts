// SPDX-License-Identifier: MIT

import {
  browserWorkspaceFormatRevisionV1,
  type BrowserWorkspaceHostFileErrorWireV1,
  type BrowserWorkspaceVolumeAnchorWireV1,
  isBrowserWorkspaceHostNormalizedPathV1,
} from "./browser-workspace-host-protocol.ts";
import {
  admitProgramWorkspaceSnapshotReceiptV1,
  programWorkspaceSnapshotReceiptsEqualV1,
  type ProgramWorkspaceSnapshotReceiptV1,
} from "./contracts.ts";
import {
  type BrowserWorkspaceHostBootstrapPortV1,
  type BrowserWorkspaceHostDirectoryEntryV1,
  type BrowserWorkspaceHostDurableHeadV1,
  type BrowserWorkspaceHostFileMetadataV1,
  type BrowserWorkspaceHostImmutableSnapshotInputV1,
  type BrowserWorkspaceHostPortableArchiveInputV1,
  type BrowserWorkspaceHostPortableArchiveV1,
  type BrowserWorkspaceHostReplaceFileInputV1,
  type BrowserWorkspaceHostReplaceFileResultV1,
  BrowserWorkspaceHostCleanupErrorV1,
  BrowserWorkspaceHostStorageErrorV1,
  type BrowserWorkspaceHostVolumeLeasePortV1,
} from "./browser-workspace-host-runtime.ts";
import {
  BrowserWorkspacePortableArchiveErrorV1,
  browserWorkspacePortableArchiveFileMaximumV1,
  createBrowserWorkspacePortableArchiveV1,
  type BrowserWorkspacePortableArchiveSourceEntryV1,
  type SillyOsWorkspaceExportManifestV1,
} from "./browser-workspace-portable-archive.ts";

const privateRootNameV1 = ".sillyos-workspace-host-v1";
const volumesDirectoryNameV1 = "volumes";
const controlDirectoryNameV1 = "control";
const workspaceDirectoryNameV1 = "workspace";
const stagingDirectoryNameV1 = "staging";
const snapshotsDirectoryNameV1 = "snapshots";
const candidateFileNameV1 = "candidate.json";
const anchorFileNameV1 = "anchor.json";
const headFileNameV1 = "head.json";
const pendingFileNameV1 = "pending.json";
const nextStageFileNameV1 = "next.bin";
const previousStageFileNameV1 = "previous.bin";
const pendingStageFileNameV1 = "pending-stage.json";
const portableExportStageFileNameV1 = "portable-export.zip";
const immutableSnapshotArchiveFileNameV1 = "workspace.zip";
const immutableSnapshotPrepareMarkerFileNameV1 = "snapshot-candidate.json";
const immutableSnapshotCommitFileNameV1 = "commit.json";
const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

export const browserWorkspaceHostIoChunkMaximumBytesV1 = 1024 * 1024;
export const browserWorkspaceHostIoBytesInFlightMaximumV1 = 4 *
  browserWorkspaceHostIoChunkMaximumBytesV1;
export const browserWorkspaceHostControlFileMaximumBytesV1 = 64 * 1024;
export const browserWorkspaceImmutableSnapshotMarkerMaximumBytesV1 = 2 * 1024;
export const browserWorkspaceHostExportDirectoryMaximumV1 = 16_384;
export const browserWorkspaceHostExportDirectoryChildMaximumV1 = 4_096;
export const browserWorkspaceHostDirectoryListChildMaximumV1 = 8_192;

export interface BrowserWorkspaceHostIoObservationV1 {
  /** Largest individual payload buffer covered by this reservation. */
  readonly chunkBytes: number;
  /** Total SillyOS-managed filesystem payload bytes currently reserved. */
  readonly bytesInFlight: number;
}

interface PendingMutationV1 {
  readonly revision: 1;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly path: string;
  readonly baseCheckpointId: string;
  readonly baseGeneration: number;
  readonly nextCheckpointId: string;
  readonly nextGeneration: number;
  readonly previous: "missing" | "file";
  readonly createdDirectories: readonly string[];
}

interface ImmutableSnapshotPrepareMarkerV1 {
  readonly revision: 1;
  readonly snapshotId: string;
  readonly programId: string;
  readonly workspaceId: string;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly proposalId: string;
  readonly programRevision: number;
  readonly baseRepositoryRevision: number;
  readonly checkpointId: string;
  readonly generation: number;
}

interface InspectedWriteTargetV1 {
  readonly name: string;
  readonly existingFile: File | null;
  readonly isDirectory: boolean;
  readonly createdDirectories: readonly string[];
}

export interface BrowserWorkspaceHostExclusiveLeaseV1 {
  release(): Promise<void>;
}

export interface BrowserWorkspaceHostExclusiveLockPortV1 {
  acquire(
    name: string,
    options: { readonly ifAvailable: boolean },
  ): Promise<BrowserWorkspaceHostExclusiveLeaseV1 | null>;
}

interface WebLockManagerV1 {
  request<T>(
    name: string,
    options: { readonly mode: "exclusive"; readonly ifAvailable?: boolean },
    callback: (lock: object | null) => Promise<T>,
  ): Promise<T>;
}

export interface BrowserWorkspaceHostOpfsOptionsV1 {
  readonly getRootDirectory?: () => Promise<FileSystemDirectoryHandle>;
  readonly lockPort?: BrowserWorkspaceHostExclusiveLockPortV1;
  readonly createVolumeId?: (input: {
    readonly programId: string;
    readonly workspaceId: string;
  }) => string | Promise<string>;
  readonly createInitialCheckpointId?: () => string;
  readonly estimateStorage?: () => Promise<{
    readonly quota?: number;
    readonly usage?: number;
  }>;
  readonly observeIo?: (observation: BrowserWorkspaceHostIoObservationV1) => void;
}

interface CandidateStateV1 {
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
}

/** Product-private shared budget; exported only for exact contract tests. */
export class BrowserWorkspaceHostIoBudgetV1 {
  private bytesInFlight = 0;
  private readonly waiters = new Set<() => void>();

  constructor(
    private readonly observe?: (observation: BrowserWorkspaceHostIoObservationV1) => void,
  ) {}

  async withReservation<T>(
    reservationBytes: number,
    chunkBytes: number,
    operation: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    const reservation = await this.acquire(reservationBytes, chunkBytes, signal);
    try {
      return await operation();
    } finally {
      reservation.release();
    }
  }

  async acquire(
    reservationBytes: number,
    chunkBytes: number,
    signal?: AbortSignal,
  ): Promise<{ readonly release: () => void }> {
    if (
      !Number.isSafeInteger(reservationBytes) || reservationBytes < 0 ||
      reservationBytes > browserWorkspaceHostIoBytesInFlightMaximumV1 ||
      !Number.isSafeInteger(chunkBytes) || chunkBytes < 0 ||
      chunkBytes > browserWorkspaceHostIoChunkMaximumBytesV1
    ) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "request_failed",
        "Workspace filesystem I/O reservation is invalid",
      );
    }
    while (
      this.bytesInFlight + reservationBytes > browserWorkspaceHostIoBytesInFlightMaximumV1
    ) {
      if (signal?.aborted) {
        throw signal.reason ??
          new DOMException("Workspace filesystem I/O was aborted", "AbortError");
      }
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
          this.waiters.delete(wake);
          signal?.removeEventListener("abort", abort);
        };
        const wake = () => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve();
        };
        const abort = () => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(
            signal?.reason ??
              new DOMException("Workspace filesystem I/O was aborted", "AbortError"),
          );
        };
        this.waiters.add(wake);
        if (signal?.aborted) abort();
        else signal?.addEventListener("abort", abort, { once: true });
      });
    }
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException("Workspace filesystem I/O was aborted", "AbortError");
    }
    this.bytesInFlight += reservationBytes;
    this.report({ chunkBytes, bytesInFlight: this.bytesInFlight });
    let released = false;
    return {
      release: () => {
        if (released) return;
        released = true;
        this.bytesInFlight -= reservationBytes;
        this.report({ chunkBytes: 0, bytesInFlight: this.bytesInFlight });
        const waiters = [...this.waiters];
        this.waiters.clear();
        for (const wake of waiters) wake();
      },
    };
  }

  private report(observation: BrowserWorkspaceHostIoObservationV1): void {
    try {
      this.observe?.(observation);
    } catch {
      // Numeric qualification observers cannot change filesystem behavior.
    }
  }
}

function randomIdentityV1(prefix: string): string {
  return `${prefix}.${crypto.randomUUID()}`;
}

async function stableVolumeIdentityV1(input: {
  readonly programId: string;
  readonly workspaceId: string;
}): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      ownedArrayBufferV1(
        encodedJsonV1([browserWorkspaceFormatRevisionV1, input.programId, input.workspaceId]),
      ),
    ),
  );
  return `sillyos.volume.${[...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function exactKeysV1(value: object, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function admitAnchorV1(value: unknown): BrowserWorkspaceVolumeAnchorWireV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Readonly<Record<string, unknown>>;
  if (
    !exactKeysV1(record, ["revision", "programId", "workspaceId", "volumeId", "workspaceFormat"]) ||
    record.revision !== 1 || typeof record.programId !== "string" ||
    typeof record.workspaceId !== "string" || typeof record.volumeId !== "string" ||
    record.workspaceFormat !== 1
  ) return null;
  return {
    revision: 1,
    programId: record.programId,
    workspaceId: record.workspaceId,
    volumeId: record.volumeId,
    workspaceFormat: 1,
  };
}

function admitHeadV1(value: unknown): BrowserWorkspaceHostDurableHeadV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Readonly<Record<string, unknown>>;
  if (
    !exactKeysV1(record, [
      "revision",
      "volumeId",
      "workspaceFormat",
      "checkpointId",
      "generation",
    ]) ||
    record.revision !== 1 || typeof record.volumeId !== "string" ||
    record.workspaceFormat !== 1 || typeof record.checkpointId !== "string" ||
    typeof record.generation !== "number" || !Number.isSafeInteger(record.generation) ||
    record.generation <= 0
  ) return null;
  return {
    revision: 1,
    volumeId: record.volumeId,
    workspaceFormat: 1,
    checkpointId: record.checkpointId,
    generation: record.generation,
  };
}

function admitImmutableSnapshotPrepareMarkerV1(
  value: unknown,
): ImmutableSnapshotPrepareMarkerV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Readonly<Record<string, unknown>>;
  if (
    !exactKeysV1(record, [
      "revision",
      "snapshotId",
      "programId",
      "workspaceId",
      "volumeId",
      "workspaceFormat",
      "proposalId",
      "programRevision",
      "baseRepositoryRevision",
      "checkpointId",
      "generation",
    ]) || record.revision !== 1 || typeof record.snapshotId !== "string" ||
    typeof record.programId !== "string" || typeof record.workspaceId !== "string" ||
    typeof record.volumeId !== "string" || record.workspaceFormat !== 1 ||
    typeof record.proposalId !== "string" ||
    typeof record.programRevision !== "number" ||
    !Number.isSafeInteger(record.programRevision) || record.programRevision <= 0 ||
    typeof record.baseRepositoryRevision !== "number" ||
    !Number.isSafeInteger(record.baseRepositoryRevision) ||
    record.baseRepositoryRevision <= 0 || typeof record.checkpointId !== "string" ||
    typeof record.generation !== "number" || !Number.isSafeInteger(record.generation) ||
    record.generation <= 0 || !identifierPatternV1.test(record.snapshotId) ||
    !identifierPatternV1.test(record.programId) || !identifierPatternV1.test(record.workspaceId) ||
    !identifierPatternV1.test(record.volumeId) || !identifierPatternV1.test(record.proposalId) ||
    !identifierPatternV1.test(record.checkpointId)
  ) return null;
  return record as unknown as ImmutableSnapshotPrepareMarkerV1;
}

function admitPendingV1(value: unknown): PendingMutationV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Readonly<Record<string, unknown>>;
  if (
    !exactKeysV1(record, [
      "revision",
      "volumeId",
      "workspaceFormat",
      "path",
      "baseCheckpointId",
      "baseGeneration",
      "nextCheckpointId",
      "nextGeneration",
      "previous",
      "createdDirectories",
    ]) || record.revision !== 1 || typeof record.volumeId !== "string" ||
    record.workspaceFormat !== 1 || typeof record.path !== "string" ||
    typeof record.baseCheckpointId !== "string" ||
    typeof record.nextCheckpointId !== "string" ||
    typeof record.baseGeneration !== "number" || !Number.isSafeInteger(record.baseGeneration) ||
    record.baseGeneration <= 0 || typeof record.nextGeneration !== "number" ||
    record.nextGeneration !== record.baseGeneration + 1 ||
    (record.previous !== "missing" && record.previous !== "file") ||
    !Array.isArray(record.createdDirectories) ||
    record.createdDirectories.length > 31 ||
    !record.createdDirectories.every(isBrowserWorkspaceHostNormalizedPathV1)
  ) return null;
  const parentPrefixes = record.path.split("/").slice(0, -1).map((_, index, parts) =>
    parts.slice(0, index + 1).join("/")
  );
  const firstCreated = parentPrefixes.length - record.createdDirectories.length;
  if (
    !isBrowserWorkspaceHostNormalizedPathV1(record.path) || firstCreated < 0 ||
    !record.createdDirectories.every((directory, index) =>
      directory === parentPrefixes[firstCreated + index]
    )
  ) return null;
  return {
    revision: 1,
    volumeId: record.volumeId,
    workspaceFormat: 1,
    path: record.path,
    baseCheckpointId: record.baseCheckpointId,
    baseGeneration: record.baseGeneration,
    nextCheckpointId: record.nextCheckpointId,
    nextGeneration: record.nextGeneration,
    previous: record.previous,
    createdDirectories: [...record.createdDirectories],
  };
}

function fileErrorV1(
  code: BrowserWorkspaceHostFileErrorWireV1["code"],
  message: string,
  path: string | null,
): BrowserWorkspaceHostFileErrorWireV1 {
  return { kind: "file_error", code, message, path };
}

function storageUnavailableDomExceptionV1(error: unknown): error is DOMException {
  return error instanceof DOMException &&
    [
      "SecurityError",
      "UnknownError",
      "NotAllowedError",
      "InvalidStateError",
      "NotSupportedError",
    ].includes(error.name);
}

function quotaExceededDomExceptionV1(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === "QuotaExceededError";
}

function opfsErrorV1(error: unknown, fallback: string): Error {
  if (error instanceof BrowserWorkspaceHostStorageErrorV1) return error;
  if (error instanceof DOMException) {
    if (error.name === "NotFoundError") {
      return new BrowserWorkspaceHostStorageErrorV1("volume_missing", fallback, null, {
        cause: error,
      });
    }
    if (quotaExceededDomExceptionV1(error)) {
      return new BrowserWorkspaceHostStorageErrorV1(
        "capacity_exceeded",
        fallback,
        fileErrorV1("unknown", "Workspace storage quota was exceeded", null),
        { cause: error },
      );
    }
    if (storageUnavailableDomExceptionV1(error)) {
      return new BrowserWorkspaceHostStorageErrorV1("storage_unavailable", fallback, null, {
        cause: error,
      });
    }
  }
  return new BrowserWorkspaceHostStorageErrorV1("request_failed", fallback, null, {
    cause: error instanceof Error ? error : new Error(String(error)),
  });
}

function workspaceWriteErrorV1(error: unknown, path: string): Error {
  if (error instanceof DOMException && error.name === "AbortError") {
    return new BrowserWorkspaceHostStorageErrorV1(
      "request_failed",
      "Workspace write was aborted",
      fileErrorV1(
        "aborted",
        "Workspace filesystem operation was aborted",
        `/workspace/${path}`,
      ),
      { cause: error },
    );
  }
  return opfsErrorV1(error, "Workspace file replacement failed");
}

function decodeFailureV1(error: unknown, message: string): Error {
  if (storageUnavailableDomExceptionV1(error) || quotaExceededDomExceptionV1(error)) {
    return opfsErrorV1(error, message);
  }
  return new BrowserWorkspaceHostStorageErrorV1(
    "volume_corrupt",
    message,
    null,
    { cause: error instanceof Error ? error : new Error(String(error)) },
  );
}

async function readControlJsonV1(
  handle: FileSystemDirectoryHandle,
  name: string,
  budget: BrowserWorkspaceHostIoBudgetV1,
): Promise<unknown> {
  const file = await (await handle.getFileHandle(name)).getFile();
  if (file.size > browserWorkspaceHostControlFileMaximumBytesV1) {
    throw new BrowserWorkspaceHostStorageErrorV1(
      "volume_corrupt",
      "Workspace control file exceeds its admitted size",
    );
  }
  return await budget.withReservation(
    file.size,
    file.size,
    async () => {
      const bytes = new Uint8Array(await file.slice(0, file.size).arrayBuffer());
      return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    },
  );
}

function encodedJsonV1(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

function ownedArrayBufferV1(bytes: Uint8Array): ArrayBuffer {
  const owned = new Uint8Array(bytes.byteLength);
  owned.set(bytes);
  return owned.buffer;
}

async function writeControlFileV1(
  handle: FileSystemDirectoryHandle,
  name: string,
  value: Uint8Array,
  budget: BrowserWorkspaceHostIoBudgetV1,
): Promise<void> {
  if (value.byteLength > browserWorkspaceHostControlFileMaximumBytesV1) {
    throw new BrowserWorkspaceHostStorageErrorV1(
      "request_failed",
      "Workspace control file exceeds its admitted size",
    );
  }
  await budget.withReservation(value.byteLength * 2, value.byteLength, async () => {
    const writable = await (await handle.getFileHandle(name, { create: true })).createWritable();
    try {
      await writable.write(ownedArrayBufferV1(value));
      await writable.close();
    } catch (error) {
      await writable.abort(error).catch(() => undefined);
      throw error;
    }
  });
}

async function removeEntryIfPresentV1(
  directory: FileSystemDirectoryHandle,
  name: string,
  options?: FileSystemRemoveOptions,
): Promise<void> {
  try {
    await directory.removeEntry(name, options);
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== "NotFoundError") throw error;
  }
}

async function fileHandleIfPresentV1(
  directory: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemFileHandle | null> {
  try {
    return await directory.getFileHandle(name);
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "NotFoundError" || error.name === "TypeMismatchError")
    ) return null;
    throw error;
  }
}

async function directoryHandleIfPresentV1(
  directory: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await directory.getDirectoryHandle(name);
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "NotFoundError" || error.name === "TypeMismatchError")
    ) return null;
    throw error;
  }
}

function compareCodeUnitsV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exportLimitErrorV1(message: string): BrowserWorkspaceHostStorageErrorV1 {
  return new BrowserWorkspaceHostStorageErrorV1("capacity_exceeded", message);
}

async function collectPortableArchiveEntriesV1(
  workspace: FileSystemDirectoryHandle,
  budget: BrowserWorkspaceHostIoBudgetV1,
  signal: AbortSignal,
): Promise<readonly BrowserWorkspacePortableArchiveSourceEntryV1[]> {
  const sources: BrowserWorkspacePortableArchiveSourceEntryV1[] = [];
  const pending: Array<{
    readonly path: string;
    readonly handle: FileSystemDirectoryHandle;
  }> = [{ path: "", handle: workspace }];
  let discoveredDirectories = 1;

  while (pending.length > 0) {
    if (signal.aborted) throw new DOMException("Workspace export was aborted", "AbortError");
    const current = pending.pop()!;
    const children: Array<
      [string, FileSystemDirectoryHandle | FileSystemFileHandle]
    > = [];
    if (typeof current.handle.entries !== "function") {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "storage_unavailable",
        "Workspace directory enumeration is unavailable",
      );
    }
    for await (const child of current.handle.entries()) {
      children.push(child);
      if (children.length > browserWorkspaceHostExportDirectoryChildMaximumV1) {
        throw exportLimitErrorV1("Workspace export directory exceeds its child-count limit");
      }
    }
    children.sort(([left], [right]) => compareCodeUnitsV1(left, right));

    const directories: Array<{
      readonly path: string;
      readonly handle: FileSystemDirectoryHandle;
    }> = [];
    for (const [name, handle] of children) {
      const path = current.path.length === 0 ? name : `${current.path}/${name}`;
      if (!isBrowserWorkspaceHostNormalizedPathV1(path)) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "volume_corrupt",
          "Workspace export encountered an invalid stored path",
        );
      }
      if (handle.kind === "directory") {
        discoveredDirectories += 1;
        if (discoveredDirectories > browserWorkspaceHostExportDirectoryMaximumV1) {
          throw exportLimitErrorV1("Workspace export exceeds its directory-count limit");
        }
        directories.push({ path, handle });
        continue;
      }
      if (handle.kind !== "file") {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "volume_corrupt",
          "Workspace export encountered an unsupported stored entry",
        );
      }
      if (sources.length >= browserWorkspacePortableArchiveFileMaximumV1) {
        throw exportLimitErrorV1("Workspace export exceeds its file-count limit");
      }
      const file = await handle.getFile();
      if (!Number.isSafeInteger(file.size) || file.size < 0) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "volume_corrupt",
          "Workspace export encountered an invalid file size",
        );
      }
      sources.push({
        path,
        size: file.size,
        async readRange({ offset, length, signal: rangeSignal }) {
          if (rangeSignal.aborted) {
            throw new DOMException("Workspace export was aborted", "AbortError");
          }
          if (
            !Number.isSafeInteger(offset) || offset < 0 ||
            !Number.isSafeInteger(length) || length < 0 ||
            length > browserWorkspaceHostIoChunkMaximumBytesV1 ||
            offset + length > file.size
          ) {
            throw new BrowserWorkspaceHostStorageErrorV1(
              "volume_corrupt",
              "Workspace export requested an invalid file range",
            );
          }
          const reservation = await budget.acquire(length, length, rangeSignal);
          try {
            if (rangeSignal.aborted) {
              throw new DOMException("Workspace export was aborted", "AbortError");
            }
            const bytes = new Uint8Array(
              await file.slice(offset, offset + length).arrayBuffer(),
            );
            if (rangeSignal.aborted) {
              throw new DOMException("Workspace export was aborted", "AbortError");
            }
            if (bytes.byteLength !== length) {
              throw new BrowserWorkspaceHostStorageErrorV1(
                "volume_corrupt",
                "Workspace export file range changed during its exclusive read",
              );
            }
            return { bytes, release: reservation.release };
          } catch (error) {
            reservation.release();
            throw error;
          }
        },
      });
    }
    for (let index = directories.length - 1; index >= 0; index -= 1) {
      pending.push(directories[index]!);
    }
  }
  return sources;
}

async function assertPortableArchiveQuotaV1(
  estimateStorage: () => Promise<{ readonly quota?: number; readonly usage?: number }>,
  bytesTotal: number,
): Promise<void> {
  let estimate: { readonly quota?: number; readonly usage?: number };
  try {
    estimate = await estimateStorage();
  } catch {
    // Storage estimates are advisory. The OPFS write remains authoritative.
    return;
  }
  const { quota, usage } = estimate;
  if (
    typeof quota !== "number" || !Number.isFinite(quota) || quota < 0 ||
    typeof usage !== "number" || !Number.isFinite(usage) || usage < 0
  ) return;
  if (Math.max(0, quota - usage) < bytesTotal) {
    throw new BrowserWorkspaceHostStorageErrorV1(
      "capacity_exceeded",
      "Workspace storage does not have room for the portable archive",
      fileErrorV1("unknown", "Workspace storage quota is insufficient for export", null),
    );
  }
}

async function copyFileV1(
  source: File,
  destinationDirectory: FileSystemDirectoryHandle,
  destinationName: string,
  budget: BrowserWorkspaceHostIoBudgetV1,
  signal?: AbortSignal,
): Promise<void> {
  const writable = await (
    await destinationDirectory.getFileHandle(destinationName, { create: true })
  ).createWritable();
  try {
    for (let offset = 0; offset < source.size;) {
      if (signal?.aborted) throw new DOMException("Workspace write was aborted", "AbortError");
      const length = Math.min(
        browserWorkspaceHostIoChunkMaximumBytesV1,
        source.size - offset,
      );
      await budget.withReservation(length, length, async () => {
        const buffer = await source.slice(offset, offset + length).arrayBuffer();
        if (buffer.byteLength !== length) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "volume_corrupt",
            "Workspace file range returned an unexpected length",
          );
        }
        await writable.write(buffer);
      });
      offset += length;
    }
    await writable.close();
  } catch (error) {
    await writable.abort(error).catch(() => undefined);
    throw error;
  }
}

async function sameFileBytesV1(
  left: File,
  right: File,
  budget: BrowserWorkspaceHostIoBudgetV1,
  signal?: AbortSignal,
): Promise<boolean> {
  if (left.size !== right.size) return false;
  for (let offset = 0; offset < left.size;) {
    if (signal?.aborted) throw new DOMException("Workspace write was aborted", "AbortError");
    const length = Math.min(
      browserWorkspaceHostIoChunkMaximumBytesV1,
      left.size - offset,
    );
    const equal = await budget.withReservation(length * 2, length, async () => {
      const [leftBuffer, rightBuffer] = await Promise.all([
        left.slice(offset, offset + length).arrayBuffer(),
        right.slice(offset, offset + length).arrayBuffer(),
      ]);
      if (leftBuffer.byteLength !== length || rightBuffer.byteLength !== length) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "volume_corrupt",
          "Workspace file comparison returned an unexpected range length",
        );
      }
      const leftBytes = new Uint8Array(leftBuffer);
      const rightBytes = new Uint8Array(rightBuffer);
      for (let index = 0; index < length; index += 1) {
        if (leftBytes[index] !== rightBytes[index]) return false;
      }
      return true;
    });
    if (!equal) return false;
    offset += length;
  }
  return true;
}

async function writeSourceFileV1(
  destinationDirectory: FileSystemDirectoryHandle,
  destinationName: string,
  source: BrowserWorkspaceHostReplaceFileInputV1["source"],
  budget: BrowserWorkspaceHostIoBudgetV1,
  signal: AbortSignal,
): Promise<void> {
  if (!Number.isSafeInteger(source.byteLength) || source.byteLength < 0) {
    throw new BrowserWorkspaceHostStorageErrorV1(
      "request_failed",
      "Workspace file source length is invalid",
    );
  }
  const writable = await (
    await destinationDirectory.getFileHandle(destinationName, { create: true })
  ).createWritable();
  try {
    for (let offset = 0; offset < source.byteLength;) {
      if (signal.aborted) throw new DOMException("Workspace write was aborted", "AbortError");
      const length = Math.min(
        browserWorkspaceHostIoChunkMaximumBytesV1,
        source.byteLength - offset,
      );
      await budget.withReservation(length * 2, length, async () => {
        const bytes = await source.readRange({ offset, length, signal });
        if (
          bytes.byteLength !== length ||
          bytes.buffer.byteLength > browserWorkspaceHostIoChunkMaximumBytesV1
        ) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "request_failed",
            "Workspace file source returned an invalid range",
          );
        }
        await writable.write(ownedArrayBufferV1(bytes));
      });
      offset += length;
    }
    await writable.close();
  } catch (error) {
    await writable.abort(error).catch(() => undefined);
    throw error;
  }
}

async function resolveParentV1(
  root: FileSystemDirectoryHandle,
  path: string,
  create: boolean,
): Promise<{ readonly parent: FileSystemDirectoryHandle; readonly name: string }> {
  const parts = path.split("/");
  const name = parts.pop() ?? "";
  let parent = root;
  for (const part of parts) parent = await parent.getDirectoryHandle(part, { create });
  return { parent, name };
}

async function inspectWriteTargetV1(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<InspectedWriteTargetV1> {
  const parts = path.split("/");
  const name = parts.at(-1) ?? "";
  const parentParts = parts.slice(0, -1);
  let parent = root;
  for (let index = 0; index < parentParts.length; index += 1) {
    const part = parentParts[index]!;
    try {
      parent = await parent.getDirectoryHandle(part);
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") {
        const createdDirectories = parentParts.slice(index).map((_, suffixIndex) =>
          parentParts.slice(0, index + suffixIndex + 1).join("/")
        );
        return { name, existingFile: null, isDirectory: false, createdDirectories };
      }
      if (error instanceof DOMException && error.name === "TypeMismatchError") {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "request_failed",
          "Workspace write parent is not a directory",
          fileErrorV1(
            "not_directory",
            "Workspace write parent is not a directory",
            `/workspace/${parentParts.slice(0, index + 1).join("/")}`,
          ),
          { cause: error },
        );
      }
      throw error;
    }
  }
  const existingHandle = await fileHandleIfPresentV1(parent, name);
  const existingFile = existingHandle === null ? null : await existingHandle.getFile();
  const directory = existingFile === null ? await directoryHandleIfPresentV1(parent, name) : null;
  return {
    name,
    existingFile,
    isDirectory: directory !== null,
    createdDirectories: [],
  };
}

async function pruneCreatedDirectoriesV1(
  root: FileSystemDirectoryHandle,
  createdDirectories: readonly string[],
): Promise<void> {
  for (const path of createdDirectories.toReversed()) {
    try {
      const { parent, name } = await resolveParentV1(root, path, false);
      await removeEntryIfPresentV1(parent, name);
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") continue;
      throw error;
    }
  }
}

function sameAnchorV1(
  left: BrowserWorkspaceVolumeAnchorWireV1,
  right: BrowserWorkspaceVolumeAnchorWireV1,
): boolean {
  return left.programId === right.programId && left.workspaceId === right.workspaceId &&
    left.volumeId === right.volumeId && left.workspaceFormat === right.workspaceFormat;
}

function sameHeadV1(
  left: BrowserWorkspaceHostDurableHeadV1,
  right: BrowserWorkspaceHostDurableHeadV1,
): boolean {
  return left.volumeId === right.volumeId && left.workspaceFormat === right.workspaceFormat &&
    left.checkpointId === right.checkpointId && left.generation === right.generation;
}

function sameImmutableSnapshotReceiptV1(
  left: ProgramWorkspaceSnapshotReceiptV1,
  right: ProgramWorkspaceSnapshotReceiptV1,
): boolean {
  return programWorkspaceSnapshotReceiptsEqualV1(left, right);
}

function immutableSnapshotPrepareMarkerV1(
  anchor: BrowserWorkspaceVolumeAnchorWireV1,
  input: BrowserWorkspaceHostImmutableSnapshotInputV1,
): ImmutableSnapshotPrepareMarkerV1 {
  return {
    revision: 1,
    snapshotId: input.snapshotId,
    programId: anchor.programId,
    workspaceId: anchor.workspaceId,
    volumeId: anchor.volumeId,
    workspaceFormat: anchor.workspaceFormat,
    proposalId: input.proposalId,
    programRevision: input.programRevision,
    baseRepositoryRevision: input.baseRepositoryRevision,
    checkpointId: input.expectedHead.checkpointId,
    generation: input.expectedHead.generation,
  };
}

function sameImmutableSnapshotPrepareMarkerV1(
  left: ImmutableSnapshotPrepareMarkerV1,
  right: ImmutableSnapshotPrepareMarkerV1,
): boolean {
  return left.snapshotId === right.snapshotId && left.programId === right.programId &&
    left.workspaceId === right.workspaceId && left.volumeId === right.volumeId &&
    left.workspaceFormat === right.workspaceFormat && left.proposalId === right.proposalId &&
    left.programRevision === right.programRevision &&
    left.baseRepositoryRevision === right.baseRepositoryRevision &&
    left.checkpointId === right.checkpointId && left.generation === right.generation;
}

function immutableSnapshotReceiptMatchesMarkerV1(
  receipt: ProgramWorkspaceSnapshotReceiptV1,
  marker: ImmutableSnapshotPrepareMarkerV1,
): boolean {
  return receipt.snapshotId === marker.snapshotId && receipt.programId === marker.programId &&
    receipt.workspaceId === marker.workspaceId && receipt.volumeId === marker.volumeId &&
    receipt.workspaceFormat === marker.workspaceFormat &&
    receipt.proposalId === marker.proposalId &&
    receipt.programRevision === marker.programRevision &&
    receipt.baseRepositoryRevision === marker.baseRepositoryRevision &&
    receipt.checkpointId === marker.checkpointId && receipt.generation === marker.generation;
}

type CandidateMarkerInspectionV1 =
  | { readonly kind: "missing" }
  | { readonly kind: "invalid" }
  | { readonly kind: "valid"; readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 };

interface CompleteCandidateInspectionV1 {
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
  readonly head: BrowserWorkspaceHostDurableHeadV1;
}

async function inspectCandidateMarkerV1(
  volume: FileSystemDirectoryHandle,
  budget: BrowserWorkspaceHostIoBudgetV1,
): Promise<CandidateMarkerInspectionV1> {
  try {
    await volume.getFileHandle(candidateFileNameV1);
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return { kind: "missing" };
    }
    if (error instanceof DOMException && error.name === "TypeMismatchError") {
      return { kind: "invalid" };
    }
    throw error;
  }
  try {
    const anchor = admitAnchorV1(await readControlJsonV1(volume, candidateFileNameV1, budget));
    return anchor === null ? { kind: "invalid" } : { kind: "valid", anchor };
  } catch (error) {
    if (storageUnavailableDomExceptionV1(error) || quotaExceededDomExceptionV1(error)) throw error;
    if (
      error instanceof BrowserWorkspaceHostStorageErrorV1 &&
      error.code !== "volume_corrupt"
    ) throw error;
    return { kind: "invalid" };
  }
}

async function inspectCompleteCandidateV1(
  volume: FileSystemDirectoryHandle,
  budget: BrowserWorkspaceHostIoBudgetV1,
): Promise<CompleteCandidateInspectionV1 | null> {
  try {
    const control = await volume.getDirectoryHandle(controlDirectoryNameV1);
    await control.getDirectoryHandle(stagingDirectoryNameV1);
    await volume.getDirectoryHandle(workspaceDirectoryNameV1);
    const anchor = admitAnchorV1(await readControlJsonV1(control, anchorFileNameV1, budget));
    const head = admitHeadV1(await readControlJsonV1(control, headFileNameV1, budget));
    return anchor === null || head === null ? null : { anchor, head };
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      (error instanceof BrowserWorkspaceHostStorageErrorV1 &&
        error.code === "volume_corrupt") ||
      (error instanceof DOMException &&
        (error.name === "NotFoundError" || error.name === "TypeMismatchError"))
    ) return null;
    throw error;
  }
}

export function createBrowserWorkspaceHostWebLockPortV1(
  lockManager: WebLockManagerV1,
): BrowserWorkspaceHostExclusiveLockPortV1 {
  return {
    acquire(name, options) {
      return new Promise((resolve, reject) => {
        let release!: () => void;
        const held = new Promise<void>((released) => {
          release = released;
        });
        let request: Promise<unknown>;
        request = lockManager.request(
          name,
          { mode: "exclusive", ...(options.ifAvailable ? { ifAvailable: true } : {}) },
          async (lock) => {
            if (lock === null) {
              resolve(null);
              return;
            }
            let released = false;
            resolve({
              async release() {
                if (released) return;
                released = true;
                release();
                await request;
              },
            });
            await held;
          },
        );
        request.catch(reject);
      });
    },
  };
}

class OpfsVolumeLeaseV1 implements BrowserWorkspaceHostVolumeLeasePortV1 {
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
  private readonly volume: FileSystemDirectoryHandle;
  private readonly control: FileSystemDirectoryHandle;
  private readonly staging: FileSystemDirectoryHandle;
  private readonly snapshots: FileSystemDirectoryHandle;
  private readonly workspace: FileSystemDirectoryHandle;
  private readonly volumeLease: BrowserWorkspaceHostExclusiveLeaseV1;
  private readonly ioBudget: BrowserWorkspaceHostIoBudgetV1;
  private readonly estimateStorage: () => Promise<{
    readonly quota?: number;
    readonly usage?: number;
  }>;
  private closed = false;
  private poisoned: BrowserWorkspaceHostStorageErrorV1 | null = null;

  constructor(input: {
    readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
    readonly volume: FileSystemDirectoryHandle;
    readonly control: FileSystemDirectoryHandle;
    readonly staging: FileSystemDirectoryHandle;
    readonly snapshots: FileSystemDirectoryHandle;
    readonly workspace: FileSystemDirectoryHandle;
    readonly volumeLease: BrowserWorkspaceHostExclusiveLeaseV1;
    readonly ioBudget: BrowserWorkspaceHostIoBudgetV1;
    readonly estimateStorage: () => Promise<{
      readonly quota?: number;
      readonly usage?: number;
    }>;
  }) {
    this.anchor = input.anchor;
    this.volume = input.volume;
    this.control = input.control;
    this.staging = input.staging;
    this.snapshots = input.snapshots;
    this.workspace = input.workspace;
    this.volumeLease = input.volumeLease;
    this.ioBudget = input.ioBudget;
    this.estimateStorage = input.estimateStorage;
  }

  private assertOpen(): void {
    if (this.poisoned !== null) throw this.poisoned;
    if (this.closed) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "request_failed",
        "Workspace volume lease is closed",
      );
    }
  }

  async readHead(): Promise<BrowserWorkspaceHostDurableHeadV1> {
    this.assertOpen();
    let rawHead: unknown;
    try {
      rawHead = await readControlJsonV1(this.control, headFileNameV1, this.ioBudget);
    } catch (error) {
      throw decodeFailureV1(error, "Workspace durable head cannot be decoded");
    }
    const head = admitHeadV1(rawHead);
    if (
      head === null || head.volumeId !== this.anchor.volumeId ||
      head.workspaceFormat !== this.anchor.workspaceFormat
    ) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace durable head is invalid",
      );
    }
    return head;
  }

  private async readImmutableSnapshotPrepareMarkerV1(): Promise<
    ImmutableSnapshotPrepareMarkerV1 | null
  > {
    const handle = await fileHandleIfPresentV1(
      this.control,
      immutableSnapshotPrepareMarkerFileNameV1,
    );
    if (handle === null) return null;
    try {
      const file = await handle.getFile();
      if (
        file.size <= 0 || file.size > browserWorkspaceImmutableSnapshotMarkerMaximumBytesV1
      ) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "volume_corrupt",
          "Workspace immutable snapshot marker has an invalid size",
        );
      }
      const bytes = await this.ioBudget.withReservation(
        file.size,
        file.size,
        async () => new Uint8Array(await file.slice(0, file.size).arrayBuffer()),
      );
      const marker = admitImmutableSnapshotPrepareMarkerV1(
        JSON.parse(new TextDecoder().decode(bytes)) as unknown,
      );
      if (
        marker === null || marker.programId !== this.anchor.programId ||
        marker.workspaceId !== this.anchor.workspaceId ||
        marker.volumeId !== this.anchor.volumeId ||
        marker.workspaceFormat !== this.anchor.workspaceFormat
      ) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "volume_corrupt",
          "Workspace immutable snapshot marker is invalid",
        );
      }
      return marker;
    } catch (error) {
      if (error instanceof BrowserWorkspaceHostStorageErrorV1) throw error;
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace immutable snapshot marker cannot be decoded",
        null,
        { cause: error instanceof Error ? error : new Error(String(error)) },
      );
    }
  }

  private async immutableSnapshotDirectoryV1(
    snapshotId: string,
    create: boolean,
  ): Promise<FileSystemDirectoryHandle | null> {
    if (create) return await this.snapshots.getDirectoryHandle(snapshotId, { create: true });
    return await directoryHandleIfPresentV1(this.snapshots, snapshotId);
  }

  private requireImmutableSnapshotReceiptV1(
    value: unknown,
  ): ProgramWorkspaceSnapshotReceiptV1 {
    const receipt = admitProgramWorkspaceSnapshotReceiptV1(value);
    if (
      receipt === null || receipt.programId !== this.anchor.programId ||
      receipt.workspaceId !== this.anchor.workspaceId ||
      receipt.volumeId !== this.anchor.volumeId ||
      receipt.workspaceFormat !== this.anchor.workspaceFormat
    ) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "snapshot_mismatch",
        "Workspace immutable snapshot receipt does not belong to this volume",
      );
    }
    return receipt;
  }

  private async readImmutableSnapshotPackageV1(
    snapshotId: string,
    invalidCommit: "corrupt" | "incomplete" = "corrupt",
  ): Promise<ProgramWorkspaceSnapshotReceiptV1 | null> {
    const directory = await this.immutableSnapshotDirectoryV1(snapshotId, false);
    if (directory === null) return null;
    const handle = await fileHandleIfPresentV1(directory, immutableSnapshotCommitFileNameV1);
    if (handle === null) return null;
    let decoded: unknown;
    try {
      const file = await handle.getFile();
      if (file.size <= 0) {
        if (invalidCommit === "incomplete") return null;
        throw new BrowserWorkspaceHostStorageErrorV1(
          "volume_corrupt",
          "Workspace immutable snapshot commit has an invalid size",
        );
      }
      if (file.size > browserWorkspaceImmutableSnapshotMarkerMaximumBytesV1) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "volume_corrupt",
          "Workspace immutable snapshot commit has an invalid size",
        );
      }
      const bytes = await this.ioBudget.withReservation(
        file.size,
        file.size,
        async () => new Uint8Array(await file.slice(0, file.size).arrayBuffer()),
      );
      decoded = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    } catch (error) {
      if (error instanceof BrowserWorkspaceHostStorageErrorV1) throw error;
      if (invalidCommit === "incomplete") return null;
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace immutable snapshot commit cannot be decoded",
        null,
        { cause: error instanceof Error ? error : new Error(String(error)) },
      );
    }
    const receipt = admitProgramWorkspaceSnapshotReceiptV1(decoded);
    if (receipt === null) {
      if (invalidCommit === "incomplete") return null;
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace immutable snapshot commit is invalid",
      );
    }
    if (
      receipt.snapshotId !== snapshotId || receipt.programId !== this.anchor.programId ||
      receipt.workspaceId !== this.anchor.workspaceId ||
      receipt.volumeId !== this.anchor.volumeId ||
      receipt.workspaceFormat !== this.anchor.workspaceFormat
    ) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace immutable snapshot commit does not match its retained package",
      );
    }
    const archiveHandle = await fileHandleIfPresentV1(
      directory,
      immutableSnapshotArchiveFileNameV1,
    );
    if (archiveHandle === null) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace immutable snapshot archive is missing",
      );
    }
    const archive = await archiveHandle.getFile();
    if (archive.size !== receipt.archiveBytes) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace immutable snapshot archive length does not match its marker",
      );
    }
    return receipt;
  }

  private async readImmutableSnapshotCommitV1(
    marker: ImmutableSnapshotPrepareMarkerV1,
    invalidCommit: "corrupt" | "incomplete" = "corrupt",
  ): Promise<ProgramWorkspaceSnapshotReceiptV1 | null> {
    const receipt = await this.readImmutableSnapshotPackageV1(
      marker.snapshotId,
      invalidCommit,
    );
    if (receipt !== null && !immutableSnapshotReceiptMatchesMarkerV1(receipt, marker)) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace immutable snapshot commit does not match its prepare marker",
      );
    }
    return receipt;
  }

  async recoverImmutableSnapshotCandidate(): Promise<void> {
    this.assertOpen();
    let marker: ImmutableSnapshotPrepareMarkerV1 | null;
    try {
      marker = await this.readImmutableSnapshotPrepareMarkerV1();
    } catch (error) {
      if (
        !(error instanceof BrowserWorkspaceHostStorageErrorV1) ||
        error.code !== "volume_corrupt"
      ) throw error;
      if (typeof this.snapshots.entries !== "function") throw error;
      if (!(await this.snapshots.entries().next()).done) throw error;
      try {
        await removeEntryIfPresentV1(
          this.control,
          immutableSnapshotPrepareMarkerFileNameV1,
        );
      } catch (cleanupError) {
        throw opfsErrorV1(
          cleanupError,
          "Workspace invalid immutable snapshot marker could not be cleaned",
        );
      }
      return;
    }
    if (marker === null) return;
    const receipt = await this.readImmutableSnapshotCommitV1(marker, "incomplete");
    if (receipt !== null) return;
    try {
      await removeEntryIfPresentV1(this.snapshots, marker.snapshotId, { recursive: true });
      await removeEntryIfPresentV1(
        this.control,
        immutableSnapshotPrepareMarkerFileNameV1,
      );
    } catch (error) {
      throw opfsErrorV1(error, "Workspace incomplete immutable snapshot could not be cleaned");
    }
  }

  async stat(path: string): Promise<BrowserWorkspaceHostFileMetadataV1> {
    this.assertOpen();
    if (path.length === 0) return { kind: "directory", size: 0, mtimeMs: 0 };
    try {
      const resolved = await resolveParentV1(this.workspace, path, false);
      const fileHandle = await fileHandleIfPresentV1(resolved.parent, resolved.name);
      if (fileHandle !== null) {
        const file = await fileHandle.getFile();
        return { kind: "file", size: file.size, mtimeMs: file.lastModified };
      }
      const directory = await directoryHandleIfPresentV1(resolved.parent, resolved.name);
      return directory === null
        ? { kind: "missing", size: 0, mtimeMs: 0 }
        : { kind: "directory", size: 0, mtimeMs: 0 };
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") {
        return { kind: "missing", size: 0, mtimeMs: 0 };
      }
      throw opfsErrorV1(error, "Workspace metadata lookup failed");
    }
  }

  async listDirectory(input: {
    readonly path: string;
    readonly signal: AbortSignal;
  }): Promise<readonly BrowserWorkspaceHostDirectoryEntryV1[]> {
    this.assertOpen();
    if (input.signal.aborted) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "request_failed",
        "Workspace directory listing was aborted",
        fileErrorV1(
          "aborted",
          "Workspace filesystem operation was aborted",
          input.path.length === 0 ? "/workspace" : `/workspace/${input.path}`,
        ),
      );
    }
    try {
      const directory = input.path.length === 0 ? this.workspace : await (async () => {
        const { parent, name } = await resolveParentV1(this.workspace, input.path, false);
        return await parent.getDirectoryHandle(name);
      })();
      if (input.signal.aborted) {
        throw new DOMException("Workspace directory listing was aborted", "AbortError");
      }
      if (typeof directory.entries !== "function") {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "storage_unavailable",
          "Workspace directory enumeration is unavailable",
        );
      }
      const children: Array<[string, FileSystemDirectoryHandle | FileSystemFileHandle]> = [];
      for await (const child of directory.entries()) {
        if (input.signal.aborted) {
          throw new DOMException("Workspace directory listing was aborted", "AbortError");
        }
        children.push(child);
        if (children.length > browserWorkspaceHostDirectoryListChildMaximumV1) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "capacity_exceeded",
            "Workspace directory listing exceeds its child-count limit",
          );
        }
      }
      if (input.signal.aborted) {
        throw new DOMException("Workspace directory listing was aborted", "AbortError");
      }
      children.sort(([left], [right]) => compareCodeUnitsV1(left, right));
      const admitted: BrowserWorkspaceHostDirectoryEntryV1[] = [];
      for (const [name, handle] of children) {
        if (input.signal.aborted) {
          throw new DOMException("Workspace directory listing was aborted", "AbortError");
        }
        const path = input.path.length === 0 ? name : `${input.path}/${name}`;
        if (!isBrowserWorkspaceHostNormalizedPathV1(path)) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "volume_corrupt",
            "Workspace directory listing encountered an invalid stored path",
          );
        }
        if (handle.kind === "directory") {
          admitted.push({ name, kind: "directory", size: 0, mtimeMs: 0 });
          continue;
        }
        if (handle.kind !== "file") {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "volume_corrupt",
            "Workspace directory listing encountered an unsupported entry",
          );
        }
        const file = await handle.getFile();
        if (input.signal.aborted) {
          throw new DOMException("Workspace directory listing was aborted", "AbortError");
        }
        admitted.push({ name, kind: "file", size: file.size, mtimeMs: file.lastModified });
      }
      return admitted;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "request_failed",
          "Workspace directory listing was aborted",
          fileErrorV1(
            "aborted",
            "Workspace filesystem operation was aborted",
            input.path.length === 0 ? "/workspace" : `/workspace/${input.path}`,
          ),
        );
      }
      if (error instanceof DOMException && error.name === "TypeMismatchError") {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "request_failed",
          "Workspace path is not a directory",
          fileErrorV1(
            "not_directory",
            "Workspace path is not a directory",
            input.path.length === 0 ? "/workspace" : `/workspace/${input.path}`,
          ),
        );
      }
      throw opfsErrorV1(error, "Workspace directory listing failed");
    }
  }

  async readFileRange(input: {
    readonly path: string;
    readonly offset: number;
    readonly length: number;
    readonly signal: AbortSignal;
  }): Promise<Uint8Array> {
    this.assertOpen();
    if (
      !Number.isSafeInteger(input.offset) || input.offset < 0 ||
      !Number.isSafeInteger(input.length) || input.length < 0 ||
      input.length > browserWorkspaceHostIoChunkMaximumBytesV1 ||
      !Number.isSafeInteger(input.offset + input.length)
    ) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "request_failed",
        "Workspace file range is invalid",
      );
    }
    if (input.signal.aborted) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "request_failed",
        "Workspace file read was aborted",
        fileErrorV1(
          "aborted",
          "Workspace filesystem operation was aborted",
          `/workspace/${input.path}`,
        ),
      );
    }
    try {
      const { parent, name } = await resolveParentV1(this.workspace, input.path, false);
      const file = await (await parent.getFileHandle(name)).getFile();
      if (input.offset + input.length > file.size) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "volume_corrupt",
          "Workspace file range exceeds its current size",
        );
      }
      return await this.ioBudget.withReservation(input.length, input.length, async () => {
        const bytes = new Uint8Array(
          await file.slice(input.offset, input.offset + input.length).arrayBuffer(),
        );
        if (input.signal.aborted) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "request_failed",
            "Workspace file read was aborted",
            fileErrorV1(
              "aborted",
              "Workspace filesystem operation was aborted",
              `/workspace/${input.path}`,
            ),
          );
        }
        if (bytes.byteLength !== input.length) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "volume_corrupt",
            "Workspace file range returned an unexpected length",
          );
        }
        return bytes;
      });
    } catch (error) {
      throw opfsErrorV1(error, "Workspace file read failed");
    }
  }

  private async createArchiveAtV1(
    input: BrowserWorkspaceHostPortableArchiveInputV1,
    outputDirectory: FileSystemDirectoryHandle,
    outputFileName: string,
  ): Promise<BrowserWorkspaceHostPortableArchiveV1> {
    this.assertOpen();
    if (input.signal.aborted) {
      throw new DOMException("Workspace export was aborted", "AbortError");
    }
    const currentHead = await this.readHead();
    if (!sameHeadV1(currentHead, input.expectedHead)) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace durable head changed before export",
      );
    }

    let entries: readonly BrowserWorkspacePortableArchiveSourceEntryV1[];
    try {
      await removeEntryIfPresentV1(outputDirectory, outputFileName);
      entries = await collectPortableArchiveEntriesV1(
        this.workspace,
        this.ioBudget,
        input.signal,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw opfsErrorV1(error, "Workspace portable archive preparation failed");
    }
    const manifest: SillyOsWorkspaceExportManifestV1 = {
      revision: 1,
      kind: "sillyos-workspace",
      exportFormat: 1,
      workspaceFormat: 1,
      programId: this.anchor.programId,
      workspaceId: this.anchor.workspaceId,
      programRevision: input.programRevision,
      repositoryRevision: input.repositoryRevision,
      checkpointId: input.expectedHead.checkpointId,
      generation: input.expectedHead.generation,
    };
    const outputState: {
      handle: FileSystemFileHandle | null;
      writable: FileSystemWritableFileStream | null;
      closed: boolean;
    } = { handle: null, writable: null, closed: false };
    const output = new WritableStream<Uint8Array>({
      write: async (chunk) => {
        if (input.signal.aborted) {
          throw new DOMException("Workspace export was aborted", "AbortError");
        }
        if (chunk.byteLength > browserWorkspaceHostIoChunkMaximumBytesV1) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "request_failed",
            "Workspace archive writer exceeded its output chunk limit",
          );
        }
        outputState.handle ??= await outputDirectory.getFileHandle(
          outputFileName,
          { create: true },
        );
        outputState.writable ??= await outputState.handle.createWritable();
        await this.ioBudget.withReservation(
          chunk.byteLength * 2,
          chunk.byteLength,
          () => outputState.writable!.write(ownedArrayBufferV1(chunk)),
          input.signal,
        );
      },
      close: async () => {
        if (outputState.writable === null) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "request_failed",
            "Workspace archive writer produced no output",
          );
        }
        await outputState.writable.close();
        outputState.closed = true;
      },
      abort: async (reason) => {
        if (outputState.writable !== null && !outputState.closed) {
          await outputState.writable.abort(reason).catch(() => undefined);
        }
      },
    });

    try {
      const result = await createBrowserWorkspacePortableArchiveV1({
        manifest,
        entries,
        sink: output,
        signal: input.signal,
        beforeWrite: ({ bytesTotal }) =>
          assertPortableArchiveQuotaV1(this.estimateStorage, bytesTotal),
        onProgress: (progress) =>
          input.onProgress({
            filesCompleted: progress.filesCompleted,
            filesTotal: progress.filesTotal,
            bytesWritten: progress.bytesWritten,
            bytesTotal: progress.bytesTotal,
          }),
      });
      if (outputState.handle === null || !outputState.closed) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "request_failed",
          "Workspace archive output did not settle",
        );
      }
      const file = await outputState.handle.getFile();
      if (file.size !== result.bytesTotal || result.bytesWritten !== result.bytesTotal) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "request_failed",
          "Workspace archive output length is invalid",
        );
      }
      let released = false;
      return {
        file,
        progress: {
          filesCompleted: result.filesTotal,
          filesTotal: result.filesTotal,
          bytesWritten: result.bytesWritten,
          bytesTotal: result.bytesTotal,
        },
        release: async () => {
          if (released) return;
          released = true;
          await removeEntryIfPresentV1(outputDirectory, outputFileName);
        },
      };
    } catch (error) {
      if (outputState.writable !== null && !outputState.closed) {
        await outputState.writable.abort(error).catch(() => undefined);
      }
      try {
        await removeEntryIfPresentV1(outputDirectory, outputFileName);
      } catch (cleanupError) {
        throw new BrowserWorkspaceHostCleanupErrorV1(
          "Workspace portable archive cleanup failed",
          cleanupError,
        );
      }
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      if (
        error instanceof BrowserWorkspacePortableArchiveErrorV1 &&
        [
          "file_limit_exceeded",
          "metadata_limit_exceeded",
          "archive_length_exceeded",
        ].includes(error.code)
      ) throw exportLimitErrorV1(error.message);
      throw opfsErrorV1(error, "Workspace portable archive failed");
    }
  }

  createPortableArchive(
    input: BrowserWorkspaceHostPortableArchiveInputV1,
  ): Promise<BrowserWorkspaceHostPortableArchiveV1> {
    return this.createArchiveAtV1(input, this.staging, portableExportStageFileNameV1);
  }

  async prepareImmutableSnapshot(
    input: BrowserWorkspaceHostImmutableSnapshotInputV1,
  ): Promise<ProgramWorkspaceSnapshotReceiptV1> {
    this.assertOpen();
    if (input.signal.aborted) {
      throw new DOMException("Workspace immutable snapshot preparation was aborted", "AbortError");
    }
    const desiredMarker = immutableSnapshotPrepareMarkerV1(this.anchor, input);
    const existingMarker = await this.readImmutableSnapshotPrepareMarkerV1();
    if (existingMarker !== null) {
      if (!sameImmutableSnapshotPrepareMarkerV1(existingMarker, desiredMarker)) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "snapshot_mismatch",
          "Workspace volume already retains a different immutable snapshot candidate",
        );
      }
      const existing = await this.readImmutableSnapshotCommitV1(existingMarker, "incomplete");
      if (existing !== null) return existing;
      await removeEntryIfPresentV1(this.snapshots, existingMarker.snapshotId, {
        recursive: true,
      });
      await removeEntryIfPresentV1(
        this.control,
        immutableSnapshotPrepareMarkerFileNameV1,
      );
    }

    if (
      await this.immutableSnapshotDirectoryV1(input.snapshotId, false) !== null ||
      await fileHandleIfPresentV1(this.snapshots, input.snapshotId) !== null
    ) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "snapshot_mismatch",
        "Workspace immutable snapshot identity is already retained",
      );
    }

    const currentHead = await this.readHead();
    if (!sameHeadV1(currentHead, input.expectedHead)) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "snapshot_stale",
        "Workspace immutable snapshot requested a stale durable head",
      );
    }

    const prepareMarkerBytes = encodedJsonV1(desiredMarker);
    if (prepareMarkerBytes.byteLength > browserWorkspaceImmutableSnapshotMarkerMaximumBytesV1) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "request_failed",
        "Workspace immutable snapshot prepare marker exceeds its encoded byte limit",
      );
    }
    let committed = false;
    try {
      await writeControlFileV1(
        this.control,
        immutableSnapshotPrepareMarkerFileNameV1,
        prepareMarkerBytes,
        this.ioBudget,
      );
      const snapshotDirectory = await this.immutableSnapshotDirectoryV1(input.snapshotId, true);
      if (snapshotDirectory === null) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "request_failed",
          "Workspace immutable snapshot directory could not be created",
        );
      }
      const archive = await this.createArchiveAtV1(
        {
          programRevision: input.programRevision,
          repositoryRevision: input.baseRepositoryRevision,
          expectedHead: input.expectedHead,
          signal: input.signal,
          onProgress: () => {},
        },
        snapshotDirectory,
        immutableSnapshotArchiveFileNameV1,
      );
      const settledHead = await this.readHead();
      if (!sameHeadV1(settledHead, input.expectedHead)) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "snapshot_stale",
          "Workspace durable head changed during immutable snapshot preparation",
        );
      }
      const receipt: ProgramWorkspaceSnapshotReceiptV1 = {
        revision: 1,
        snapshotId: input.snapshotId,
        programId: this.anchor.programId,
        workspaceId: this.anchor.workspaceId,
        volumeId: this.anchor.volumeId,
        workspaceFormat: this.anchor.workspaceFormat,
        proposalId: input.proposalId,
        programRevision: input.programRevision,
        baseRepositoryRevision: input.baseRepositoryRevision,
        checkpointId: input.expectedHead.checkpointId,
        generation: input.expectedHead.generation,
        fileCount: archive.progress.filesTotal,
        archiveBytes: archive.progress.bytesTotal,
      };
      const markerBytes = encodedJsonV1(receipt);
      if (markerBytes.byteLength > browserWorkspaceImmutableSnapshotMarkerMaximumBytesV1) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "request_failed",
          "Workspace immutable snapshot marker exceeds its encoded byte limit",
        );
      }
      await writeControlFileV1(
        snapshotDirectory,
        immutableSnapshotCommitFileNameV1,
        markerBytes,
        this.ioBudget,
      );
      committed = true;
      const reopened = await this.readImmutableSnapshotCommitV1(desiredMarker);
      if (reopened === null || !sameImmutableSnapshotReceiptV1(reopened, receipt)) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "volume_corrupt",
          "Workspace immutable snapshot did not reopen after commit",
        );
      }
      return reopened;
    } catch (error) {
      if (!committed) {
        try {
          await removeEntryIfPresentV1(this.snapshots, input.snapshotId, { recursive: true });
          await removeEntryIfPresentV1(
            this.control,
            immutableSnapshotPrepareMarkerFileNameV1,
          );
        } catch (cleanupError) {
          throw new BrowserWorkspaceHostCleanupErrorV1(
            "Workspace immutable snapshot cleanup failed",
            cleanupError,
          );
        }
      }
      throw error;
    }
  }

  async queryCurrentImmutableSnapshotCandidate(): Promise<
    ProgramWorkspaceSnapshotReceiptV1 | null
  > {
    this.assertOpen();
    const marker = await this.readImmutableSnapshotPrepareMarkerV1();
    if (marker === null) return null;
    return await this.readImmutableSnapshotCommitV1(marker);
  }

  async queryRetainedImmutableSnapshot(
    expected: ProgramWorkspaceSnapshotReceiptV1,
  ): Promise<ProgramWorkspaceSnapshotReceiptV1 | null> {
    this.assertOpen();
    const admitted = this.requireImmutableSnapshotReceiptV1(expected);
    const marker = await this.readImmutableSnapshotPrepareMarkerV1();
    if (marker !== null && marker.snapshotId === admitted.snapshotId) {
      const current = await this.readImmutableSnapshotCommitV1(marker);
      if (current === null || !sameImmutableSnapshotReceiptV1(current, admitted)) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "snapshot_mismatch",
          "Workspace retained snapshot query does not match the current candidate",
        );
      }
      return null;
    }
    const retained = await this.readImmutableSnapshotPackageV1(admitted.snapshotId);
    if (retained === null) return null;
    if (!sameImmutableSnapshotReceiptV1(retained, admitted)) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "snapshot_mismatch",
        "Workspace retained snapshot query does not match stored bytes",
      );
    }
    return retained;
  }

  async resumeImmutableSnapshotPublication(
    expected: ProgramWorkspaceSnapshotReceiptV1,
  ): Promise<ProgramWorkspaceSnapshotReceiptV1> {
    this.assertOpen();
    const admitted = this.requireImmutableSnapshotReceiptV1(expected);
    const marker = await this.readImmutableSnapshotPrepareMarkerV1();
    if (marker === null || !immutableSnapshotReceiptMatchesMarkerV1(admitted, marker)) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "snapshot_mismatch",
        "Workspace immutable snapshot candidate no longer matches publication",
      );
    }
    const current = await this.readImmutableSnapshotCommitV1(marker);
    if (current === null || !sameImmutableSnapshotReceiptV1(current, admitted)) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "snapshot_mismatch",
        "Workspace immutable snapshot publication does not match stored bytes",
      );
    }
    const head = await this.readHead();
    if (
      head.checkpointId !== admitted.checkpointId || head.generation !== admitted.generation
    ) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "snapshot_stale",
        "Workspace durable head changed after immutable snapshot preparation",
      );
    }
    return current;
  }

  async adoptImmutableSnapshot(
    expected: ProgramWorkspaceSnapshotReceiptV1,
  ): Promise<"adopted" | "already_retained"> {
    this.assertOpen();
    const admitted = this.requireImmutableSnapshotReceiptV1(expected);
    const marker = await this.readImmutableSnapshotPrepareMarkerV1();
    if (marker !== null && marker.snapshotId === admitted.snapshotId) {
      const current = await this.readImmutableSnapshotCommitV1(marker);
      if (
        current === null || !immutableSnapshotReceiptMatchesMarkerV1(admitted, marker) ||
        !sameImmutableSnapshotReceiptV1(current, admitted)
      ) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "snapshot_mismatch",
          "Workspace immutable snapshot adoption does not match the current candidate",
        );
      }
      await removeEntryIfPresentV1(
        this.control,
        immutableSnapshotPrepareMarkerFileNameV1,
      );
      return "adopted";
    }
    const retained = await this.queryRetainedImmutableSnapshot(admitted);
    if (retained !== null) return "already_retained";
    throw new BrowserWorkspaceHostStorageErrorV1(
      "snapshot_mismatch",
      "Workspace immutable snapshot adoption target is absent",
    );
  }

  async discardImmutableSnapshot(
    expected: ProgramWorkspaceSnapshotReceiptV1,
  ): Promise<"discarded" | "absent" | "retained"> {
    this.assertOpen();
    const admitted = this.requireImmutableSnapshotReceiptV1(expected);
    const marker = await this.readImmutableSnapshotPrepareMarkerV1();
    if (marker === null || marker.snapshotId !== admitted.snapshotId) {
      const retained = await this.queryRetainedImmutableSnapshot(admitted);
      return retained === null ? "absent" : "retained";
    }
    const current = await this.readImmutableSnapshotCommitV1(marker);
    if (
      current === null || !immutableSnapshotReceiptMatchesMarkerV1(admitted, marker) ||
      !sameImmutableSnapshotReceiptV1(current, admitted)
    ) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "snapshot_mismatch",
        "Workspace immutable snapshot discard does not match the current candidate",
      );
    }
    await removeEntryIfPresentV1(this.snapshots, marker.snapshotId, { recursive: true });
    await removeEntryIfPresentV1(
      this.control,
      immutableSnapshotPrepareMarkerFileNameV1,
    );
    return "discarded";
  }

  async replaceFile(
    input: BrowserWorkspaceHostReplaceFileInputV1,
  ): Promise<BrowserWorkspaceHostReplaceFileResultV1> {
    this.assertOpen();
    if (input.signal.aborted) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "request_failed",
        "Workspace write was aborted",
        fileErrorV1(
          "aborted",
          "Workspace filesystem operation was aborted",
          `/workspace/${input.path}`,
        ),
      );
    }
    const currentHead = await this.readHead();
    if (!sameHeadV1(currentHead, input.expectedHead)) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace durable head changed outside its sole Host authority",
      );
    }
    let target: InspectedWriteTargetV1;
    try {
      target = await inspectWriteTargetV1(this.workspace, input.path);
      if (target.isDirectory) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "request_failed",
          "Workspace write target is a directory",
          fileErrorV1("is_directory", "Workspace path is a directory", `/workspace/${input.path}`),
        );
      }
      await writeSourceFileV1(
        this.staging,
        nextStageFileNameV1,
        input.source,
        this.ioBudget,
        input.signal,
      );
      const nextFile = await (await this.staging.getFileHandle(nextStageFileNameV1)).getFile();
      if (
        target.existingFile !== null &&
        await sameFileBytesV1(target.existingFile, nextFile, this.ioBudget, input.signal)
      ) {
        await this.clearStaging();
        return { changed: false, head: currentHead };
      }
      if (target.existingFile !== null) {
        await copyFileV1(
          target.existingFile,
          this.staging,
          previousStageFileNameV1,
          this.ioBudget,
          input.signal,
        );
      } else {
        await removeEntryIfPresentV1(this.staging, previousStageFileNameV1);
      }
      if (input.signal.aborted) {
        await this.clearStaging();
        throw new BrowserWorkspaceHostStorageErrorV1(
          "request_failed",
          "Workspace write was aborted",
          fileErrorV1(
            "aborted",
            "Workspace filesystem operation was aborted",
            `/workspace/${input.path}`,
          ),
        );
      }
    } catch (error) {
      await this.clearStaging().catch(() => undefined);
      throw workspaceWriteErrorV1(error, input.path);
    }

    const pending: PendingMutationV1 = {
      revision: 1,
      volumeId: this.anchor.volumeId,
      workspaceFormat: 1,
      path: input.path,
      baseCheckpointId: currentHead.checkpointId,
      baseGeneration: currentHead.generation,
      nextCheckpointId: input.nextCheckpointId,
      nextGeneration: currentHead.generation + 1,
      previous: target.existingFile === null ? "missing" : "file",
      createdDirectories: target.createdDirectories,
    };
    const nextHead: BrowserWorkspaceHostDurableHeadV1 = {
      revision: 1,
      volumeId: this.anchor.volumeId,
      workspaceFormat: 1,
      checkpointId: input.nextCheckpointId,
      generation: currentHead.generation + 1,
    };
    try {
      await writeControlFileV1(
        this.staging,
        pendingStageFileNameV1,
        encodedJsonV1(pending),
        this.ioBudget,
      );
      await writeControlFileV1(
        this.control,
        pendingFileNameV1,
        encodedJsonV1(pending),
        this.ioBudget,
      );
      const resolved = await resolveParentV1(this.workspace, input.path, true);
      const nextFile = await (await this.staging.getFileHandle(nextStageFileNameV1)).getFile();
      await copyFileV1(
        nextFile,
        resolved.parent,
        resolved.name,
        this.ioBudget,
        input.signal,
      );
      await writeControlFileV1(
        this.control,
        headFileNameV1,
        encodedJsonV1(nextHead),
        this.ioBudget,
      );
      await this.clearPendingAndStaging();
      return { changed: true, head: nextHead };
    } catch (error) {
      return await this.reconcilePublishedFailure(
        workspaceWriteErrorV1(error, input.path),
        currentHead,
        nextHead,
      );
    }
  }

  async recoverPending(): Promise<void> {
    this.assertOpen();
    const pendingHandle = await fileHandleIfPresentV1(this.control, pendingFileNameV1);
    if (pendingHandle === null) {
      // Staging is preparatory and cleanup-only. Only the control journal may
      // authorize target/head reconciliation after a Worker loss.
      await this.clearStaging();
      return;
    }
    const stagedPendingHandle = await fileHandleIfPresentV1(
      this.staging,
      pendingStageFileNameV1,
    );
    const pending = await this.readPendingFile(pendingHandle);
    if (pending === null) {
      // A failed/invalid primary publication did not authorize target replay.
      await this.clearPendingAndStaging();
      return;
    }
    const stagedPending = stagedPendingHandle === null
      ? null
      : await this.readPendingFile(stagedPendingHandle);
    const head = await this.readHead();
    if (
      (stagedPending !== null && JSON.stringify(pending) !== JSON.stringify(stagedPending)) ||
      pending.volumeId !== this.anchor.volumeId ||
      pending.workspaceFormat !== this.anchor.workspaceFormat
    ) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace pending mutation is invalid",
      );
    }
    if (
      head.checkpointId === pending.baseCheckpointId &&
      head.generation === pending.baseGeneration
    ) {
      // The staged successor can no longer become authoritative once the
      // durable head still names the base. Release its bytes before rollback
      // so a capacity failure on head publication cannot prevent restoration.
      await removeEntryIfPresentV1(this.staging, nextStageFileNameV1);
      await removeEntryIfPresentV1(this.staging, pendingStageFileNameV1);
      const resolved = await resolveParentV1(this.workspace, pending.path, true);
      if (pending.previous === "missing") {
        await removeEntryIfPresentV1(resolved.parent, resolved.name);
      } else {
        const previous = await (await this.staging.getFileHandle(previousStageFileNameV1))
          .getFile();
        const currentHandle = await fileHandleIfPresentV1(resolved.parent, resolved.name);
        const current = currentHandle === null ? null : await currentHandle.getFile();
        if (current === null || !await sameFileBytesV1(current, previous, this.ioBudget)) {
          // `previous.bin` remains the recovery authority across this
          // non-atomic remove/copy window. Removing an unpublished successor
          // first also releases the space needed by the atomic writable.
          await removeEntryIfPresentV1(resolved.parent, resolved.name);
          await copyFileV1(previous, resolved.parent, resolved.name, this.ioBudget);
        }
      }
      await pruneCreatedDirectoriesV1(this.workspace, pending.createdDirectories);
    } else if (
      head.checkpointId === pending.nextCheckpointId &&
      head.generation === pending.nextGeneration
    ) {
      // Target bytes close before the durable head is published. Once the head
      // names the successor, staged copies are cleanup debris, not replay input.
    } else {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace pending mutation does not match its durable head",
      );
    }
    await this.clearPendingAndStaging();
  }

  async adoptCandidate(): Promise<void> {
    this.assertOpen();
    const marker = await inspectCandidateMarkerV1(this.volume, this.ioBudget);
    if (marker.kind === "missing") return;
    if (marker.kind === "invalid") {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace candidate marker is invalid",
      );
    }
    if (!sameAnchorV1(marker.anchor, this.anchor)) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "candidate_mismatch",
        "Workspace candidate marker does not match its Program manifest",
      );
    }
    await removeEntryIfPresentV1(this.volume, candidateFileNameV1);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.volumeLease.release();
  }

  private async clearStaging(): Promise<void> {
    await removeEntryIfPresentV1(this.staging, nextStageFileNameV1);
    await removeEntryIfPresentV1(this.staging, previousStageFileNameV1);
    await removeEntryIfPresentV1(this.staging, pendingStageFileNameV1);
  }

  private async clearPendingAndStaging(): Promise<void> {
    await removeEntryIfPresentV1(this.control, pendingFileNameV1);
    await this.clearStaging();
  }

  private async reconcilePublishedFailure(
    originalError: unknown,
    baseHead: BrowserWorkspaceHostDurableHeadV1,
    nextHead: BrowserWorkspaceHostDurableHeadV1,
  ): Promise<BrowserWorkspaceHostReplaceFileResultV1> {
    let reconciledHead: BrowserWorkspaceHostDurableHeadV1;
    try {
      await this.recoverPending();
      reconciledHead = await this.readHead();
    } catch (recoveryError) {
      const poisoned = new BrowserWorkspaceHostStorageErrorV1(
        "volume_corrupt",
        "Workspace mutation could not be reconciled in its live volume lease",
        null,
        {
          cause: new AggregateError(
            [originalError, recoveryError],
            "Workspace mutation and reconciliation both failed",
          ),
        },
      );
      this.poisoned = poisoned;
      throw poisoned;
    }
    if (sameHeadV1(reconciledHead, nextHead)) {
      return { changed: true, head: reconciledHead };
    }
    if (sameHeadV1(reconciledHead, baseHead)) {
      throw opfsErrorV1(originalError, "Workspace file replacement failed and was rolled back");
    }
    const poisoned = new BrowserWorkspaceHostStorageErrorV1(
      "volume_corrupt",
      "Workspace reconciliation returned an unrelated durable head",
    );
    this.poisoned = poisoned;
    throw poisoned;
  }

  private async readPendingFile(handle: FileSystemFileHandle): Promise<PendingMutationV1 | null> {
    try {
      const file = await handle.getFile();
      if (file.size > browserWorkspaceHostControlFileMaximumBytesV1) return null;
      const bytes = await this.ioBudget.withReservation(
        file.size,
        file.size,
        async () => new Uint8Array(await file.slice(0, file.size).arrayBuffer()),
      );
      return admitPendingV1(JSON.parse(new TextDecoder().decode(bytes)) as unknown);
    } catch (error) {
      if (storageUnavailableDomExceptionV1(error) || quotaExceededDomExceptionV1(error)) {
        throw opfsErrorV1(error, "Workspace pending mutation could not be read");
      }
      return null;
    }
  }
}

export function createBrowserWorkspaceHostOpfsBootstrapV1(
  options: BrowserWorkspaceHostOpfsOptionsV1 = {},
): BrowserWorkspaceHostBootstrapPortV1 {
  const getRootDirectory = options.getRootDirectory ?? (() => navigator.storage.getDirectory());
  const lockPort = options.lockPort ?? createBrowserWorkspaceHostWebLockPortV1(navigator.locks);
  const createVolumeId = options.createVolumeId ?? stableVolumeIdentityV1;
  const createInitialCheckpointId = options.createInitialCheckpointId ??
    (() => randomIdentityV1("sillyos.checkpoint"));
  const estimateStorage = options.estimateStorage ?? (() => navigator.storage.estimate());
  const ioBudget = new BrowserWorkspaceHostIoBudgetV1(options.observeIo);
  const candidates = new Map<string, CandidateStateV1>();
  const openLeases = new Set<OpfsVolumeLeaseV1>();
  let volumesPromise: Promise<FileSystemDirectoryHandle> | null = null;

  const volumes = (): Promise<FileSystemDirectoryHandle> => {
    volumesPromise ??= getRootDirectory().then(async (root) => {
      const privateRoot = await root.getDirectoryHandle(privateRootNameV1, { create: true });
      return await privateRoot.getDirectoryHandle(volumesDirectoryNameV1, { create: true });
    });
    return volumesPromise;
  };

  const openLease = async (
    anchor: BrowserWorkspaceVolumeAnchorWireV1,
  ): Promise<OpfsVolumeLeaseV1> => {
    const volumeLease = await lockPort.acquire(`sillyos.workspace.volume.${anchor.volumeId}`, {
      ifAvailable: true,
    });
    if (volumeLease === null) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "volume_busy",
        "Workspace volume is already open",
      );
    }
    try {
      const volume = await (await volumes()).getDirectoryHandle(anchor.volumeId);
      const control = await volume.getDirectoryHandle(controlDirectoryNameV1);
      const workspace = await volume.getDirectoryHandle(workspaceDirectoryNameV1);
      const staging = await control.getDirectoryHandle(stagingDirectoryNameV1);
      const snapshots = await control.getDirectoryHandle(snapshotsDirectoryNameV1, {
        create: true,
      });
      await removeEntryIfPresentV1(staging, portableExportStageFileNameV1);
      let rawAnchor: unknown;
      try {
        rawAnchor = await readControlJsonV1(control, anchorFileNameV1, ioBudget);
      } catch (error) {
        throw decodeFailureV1(error, "Workspace volume anchor cannot be decoded");
      }
      const storedAnchor = admitAnchorV1(rawAnchor);
      if (storedAnchor === null || !sameAnchorV1(storedAnchor, anchor)) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "workspace_mismatch",
          "Workspace volume anchor does not match its Program manifest",
        );
      }
      const lease = new OpfsVolumeLeaseV1({
        anchor,
        volume,
        control,
        staging,
        snapshots,
        workspace,
        volumeLease,
        ioBudget,
        estimateStorage,
      });
      await lease.recoverPending();
      await lease.recoverImmutableSnapshotCandidate();
      await lease.adoptCandidate();
      openLeases.add(lease);
      return lease;
    } catch (error) {
      await volumeLease.release().catch(() => undefined);
      throw opfsErrorV1(error, "Workspace volume could not be opened");
    }
  };

  return {
    async createCandidate(input) {
      let volumeId = "";
      let volumeRoot: FileSystemDirectoryHandle | null = null;
      let removeOwnedVolumeOnFailure = false;
      try {
        volumeId = await createVolumeId(input);
        if (!identifierPatternV1.test(volumeId)) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "request_failed",
            "Workspace identity factory returned an invalid identity",
          );
        }
        const anchor: BrowserWorkspaceVolumeAnchorWireV1 = {
          revision: 1,
          programId: input.programId,
          workspaceId: input.workspaceId,
          volumeId,
          workspaceFormat: browserWorkspaceFormatRevisionV1,
        };
        volumeRoot = await volumes();
        const existing = await directoryHandleIfPresentV1(volumeRoot, volumeId);
        if (existing !== null) {
          const marker = await inspectCandidateMarkerV1(existing, ioBudget);
          const complete = await inspectCompleteCandidateV1(existing, ioBudget);
          if (marker.kind === "valid" && !sameAnchorV1(marker.anchor, anchor)) {
            throw new BrowserWorkspaceHostStorageErrorV1(
              "candidate_mismatch",
              "Workspace candidate identity belongs to another Program workspace",
            );
          }
          if (marker.kind === "valid" && complete !== null) {
            if (
              !sameAnchorV1(complete.anchor, anchor) ||
              complete.head.volumeId !== anchor.volumeId ||
              complete.head.workspaceFormat !== anchor.workspaceFormat ||
              complete.head.generation !== 1
            ) {
              throw new BrowserWorkspaceHostStorageErrorV1(
                "volume_corrupt",
                "Workspace candidate does not contain its exact initial volume",
              );
            }
            candidates.set(volumeId, { anchor });
            return {
              revision: 1,
              anchor,
              checkpointId: complete.head.checkpointId,
              generation: complete.head.generation,
            };
          }
          if (marker.kind !== "valid" && complete !== null) {
            throw new BrowserWorkspaceHostStorageErrorV1(
              marker.kind === "missing" ? "candidate_mismatch" : "volume_corrupt",
              "Workspace volume exists without its exact candidate marker",
            );
          }
          await removeEntryIfPresentV1(volumeRoot, volumeId, { recursive: true });
        }

        const checkpointId = createInitialCheckpointId();
        if (!identifierPatternV1.test(checkpointId)) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "request_failed",
            "Workspace identity factory returned an invalid identity",
          );
        }
        const volume = await volumeRoot.getDirectoryHandle(volumeId, { create: true });
        removeOwnedVolumeOnFailure = true;
        await writeControlFileV1(
          volume,
          candidateFileNameV1,
          encodedJsonV1(anchor),
          ioBudget,
        );
        const control = await volume.getDirectoryHandle(controlDirectoryNameV1, { create: true });
        await control.getDirectoryHandle(stagingDirectoryNameV1, { create: true });
        await control.getDirectoryHandle(snapshotsDirectoryNameV1, { create: true });
        await volume.getDirectoryHandle(workspaceDirectoryNameV1, { create: true });
        await writeControlFileV1(control, anchorFileNameV1, encodedJsonV1(anchor), ioBudget);
        await writeControlFileV1(
          control,
          headFileNameV1,
          encodedJsonV1(
            {
              revision: 1,
              volumeId,
              workspaceFormat: 1,
              checkpointId,
              generation: 1,
            } satisfies BrowserWorkspaceHostDurableHeadV1,
          ),
          ioBudget,
        );
        candidates.set(volumeId, { anchor });
        removeOwnedVolumeOnFailure = false;
        return {
          revision: 1,
          anchor,
          checkpointId,
          generation: 1,
        };
      } catch (error) {
        if (removeOwnedVolumeOnFailure && volumeRoot !== null) {
          await removeEntryIfPresentV1(volumeRoot, volumeId, { recursive: true }).catch(
            () => undefined,
          );
        }
        throw opfsErrorV1(error, "Workspace candidate creation failed");
      }
    },

    async discardCandidate(volumeId) {
      const candidate = candidates.get(volumeId);
      if (candidate === undefined) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "candidate_mismatch",
          "Workspace candidate is not owned by this Host",
        );
      }
      try {
        await removeEntryIfPresentV1(await volumes(), volumeId, { recursive: true });
        candidates.delete(volumeId);
      } catch (error) {
        throw opfsErrorV1(error, "Workspace candidate discard failed");
      }
    },

    async openVolume(anchor) {
      const candidate = candidates.get(anchor.volumeId);
      if (candidate !== undefined && !sameAnchorV1(candidate.anchor, anchor)) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "candidate_mismatch",
          "Workspace candidate anchor does not match",
        );
      }
      const lease = await openLease(anchor);
      if (candidate !== undefined) {
        candidates.delete(anchor.volumeId);
      }
      const originalClose = lease.close.bind(lease);
      lease.close = async () => {
        await originalClose();
        openLeases.delete(lease);
      };
      return lease;
    },

    async dispose() {
      await Promise.allSettled([...openLeases].map((lease) => lease.close()));
      // A retained candidate may already be referenced by a lost/unknown manifest CAS.
      // Physical deletion belongs only to explicit discardCandidate.
      candidates.clear();
    },
  };
}
