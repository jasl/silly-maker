// SPDX-License-Identifier: MIT

import { makeZip, predictLength } from "client-zip";

import { isBrowserWorkspaceHostNormalizedPathV1 } from "./browser-workspace-host-protocol.ts";

export const browserWorkspacePortableArchiveManifestNameV1 = "sillyos-workspace.json" as const;
export const browserWorkspacePortableArchiveFileMaximumV1 = 16_384;
export const browserWorkspacePortableArchiveMetadataMaximumBytesV1 = 16 * 1024 * 1024;
export const browserWorkspacePortableArchiveManifestMaximumBytesV1 = 1024;
export const browserWorkspacePortableArchiveSourceChunkMaximumBytesV1 = 1024 * 1024;
export const browserWorkspacePortableArchiveFileModeV1 = 0o644;

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u;
const workspaceEntryPrefixV1 = "workspace/";
const centralDirectoryHeaderBytesV1 = 46;
const centralDirectoryZip64ExtraMaximumBytesV1 = 28;
const fixedLocalDosYearV1 = 1980;
const fixedLocalDosMonthIndexV1 = 0;
const fixedLocalDosDayV1 = 1;

export interface SillyOsWorkspaceExportManifestV1 {
  readonly revision: 1;
  readonly kind: "sillyos-workspace";
  readonly exportFormat: 1;
  readonly workspaceFormat: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly sourceRevision: number;
  readonly baseRevision: number;
  readonly checkpointId: string;
  readonly generation: number;
}

/**
 * A range stays reserved until `release` is called after its exact ZIP output
 * chunk settles. This lets the OPFS adapter include live source buffers in its
 * existing bounded I/O budget without teaching this writer about OPFS.
 */
export interface BrowserWorkspacePortableArchiveSourceChunkV1 {
  readonly bytes: Uint8Array;
  release(): void;
}

export interface BrowserWorkspacePortableArchiveSourceEntryV1 {
  readonly path: string;
  readonly size: number;
  readRange(input: {
    readonly offset: number;
    readonly length: number;
    readonly signal: AbortSignal;
  }): Promise<BrowserWorkspacePortableArchiveSourceChunkV1>;
}

export interface BrowserWorkspacePortableArchiveProgressV1 {
  readonly revision: 1;
  readonly filesCompleted: number;
  readonly filesTotal: number;
  readonly sourceBytesRead: number;
  readonly sourceBytes: number;
  readonly bytesWritten: number;
  readonly bytesTotal: number;
}

export interface BrowserWorkspacePortableArchiveResultV1 {
  readonly filesTotal: number;
  readonly sourceBytes: number;
  readonly bytesWritten: number;
  readonly bytesTotal: number;
}

export type BrowserWorkspacePortableArchiveErrorCodeV1 =
  | "invalid_manifest"
  | "invalid_source"
  | "duplicate_path"
  | "file_limit_exceeded"
  | "metadata_limit_exceeded"
  | "archive_length_exceeded"
  | "source_range_mismatch"
  | "archive_length_mismatch";

export class BrowserWorkspacePortableArchiveErrorV1 extends Error {
  constructor(
    readonly code: BrowserWorkspacePortableArchiveErrorCodeV1,
    message: string,
  ) {
    super(message);
    this.name = "BrowserWorkspacePortableArchiveErrorV1";
  }
}

export interface CreateBrowserWorkspacePortableArchiveInputV1 {
  readonly manifest: SillyOsWorkspaceExportManifestV1;
  readonly entries: readonly BrowserWorkspacePortableArchiveSourceEntryV1[];
  readonly sink: WritableStream<Uint8Array>;
  readonly signal: AbortSignal;
  readonly beforeWrite?: (plan: {
    readonly filesTotal: number;
    readonly sourceBytes: number;
    readonly bytesTotal: number;
  }) => void | Promise<void>;
  readonly onProgress?: (progress: BrowserWorkspacePortableArchiveProgressV1) => void;
}

interface AdmittedSourceEntryV1 {
  readonly path: string;
  readonly archiveName: string;
  readonly size: number;
  readonly readRange: BrowserWorkspacePortableArchiveSourceEntryV1["readRange"];
}

interface AdmittedArchiveV1 {
  readonly manifestBytes: Uint8Array;
  readonly entries: readonly AdmittedSourceEntryV1[];
  readonly sourceBytes: number;
  readonly bytesTotal: number;
}

interface TrackedReleaseV1 {
  readonly bytes: Uint8Array;
  readonly release: () => void;
}

const textEncoderV1 = new TextEncoder();

function portableArchiveErrorV1(
  code: BrowserWorkspacePortableArchiveErrorCodeV1,
  message: string,
): BrowserWorkspacePortableArchiveErrorV1 {
  return new BrowserWorkspacePortableArchiveErrorV1(code, message);
}

function positiveSafeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function identifierV1(value: unknown): value is string {
  return typeof value === "string" && identifierPatternV1.test(value);
}

function admitManifestV1(raw: SillyOsWorkspaceExportManifestV1): {
  readonly value: SillyOsWorkspaceExportManifestV1;
  readonly bytes: Uint8Array;
} {
  if (
    raw === null || typeof raw !== "object" || raw.revision !== 1 ||
    raw.kind !== "sillyos-workspace" || raw.exportFormat !== 1 ||
    raw.workspaceFormat !== 1 || !identifierV1(raw.programId) ||
    !identifierV1(raw.workspaceId) || !positiveSafeIntegerV1(raw.sourceRevision) ||
    !positiveSafeIntegerV1(raw.baseRevision) || !identifierV1(raw.checkpointId) ||
    !positiveSafeIntegerV1(raw.generation)
  ) {
    throw portableArchiveErrorV1(
      "invalid_manifest",
      "Workspace export manifest is invalid",
    );
  }
  const value: SillyOsWorkspaceExportManifestV1 = {
    revision: 1,
    kind: "sillyos-workspace",
    exportFormat: 1,
    workspaceFormat: 1,
    programId: raw.programId,
    workspaceId: raw.workspaceId,
    sourceRevision: raw.sourceRevision,
    baseRevision: raw.baseRevision,
    checkpointId: raw.checkpointId,
    generation: raw.generation,
  };
  const bytes = textEncoderV1.encode(`${JSON.stringify(value)}\n`);
  if (bytes.byteLength > browserWorkspacePortableArchiveManifestMaximumBytesV1) {
    throw portableArchiveErrorV1(
      "invalid_manifest",
      "Workspace export manifest exceeds its encoded byte limit",
    );
  }
  return { value, bytes };
}

function compareCodeUnitsV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function fixedLocalDosTimestampV1(): Date {
  return new Date(
    fixedLocalDosYearV1,
    fixedLocalDosMonthIndexV1,
    fixedLocalDosDayV1,
    0,
    0,
    0,
    0,
  );
}

function centralMetadataBytesV1(archiveName: string): number {
  return centralDirectoryHeaderBytesV1 + centralDirectoryZip64ExtraMaximumBytesV1 +
    textEncoderV1.encode(archiveName).byteLength;
}

function admitArchiveV1(input: CreateBrowserWorkspacePortableArchiveInputV1): AdmittedArchiveV1 {
  const manifest = admitManifestV1(input.manifest);
  if (!Array.isArray(input.entries)) {
    throw portableArchiveErrorV1("invalid_source", "Workspace export files are invalid");
  }
  if (input.entries.length > browserWorkspacePortableArchiveFileMaximumV1) {
    throw portableArchiveErrorV1(
      "file_limit_exceeded",
      "Workspace export exceeds its file-count limit",
    );
  }

  const entries: AdmittedSourceEntryV1[] = [];
  const paths = new Set<string>();
  let sourceBytesBigInt = 0n;
  let metadataBytes = centralMetadataBytesV1(browserWorkspacePortableArchiveManifestNameV1);
  for (const raw of input.entries) {
    if (
      raw === null || typeof raw !== "object" ||
      !isBrowserWorkspaceHostNormalizedPathV1(raw.path) ||
      !Number.isSafeInteger(raw.size) || raw.size < 0 ||
      typeof raw.readRange !== "function"
    ) {
      throw portableArchiveErrorV1("invalid_source", "Workspace export file is invalid");
    }
    if (paths.has(raw.path)) {
      throw portableArchiveErrorV1(
        "duplicate_path",
        `Workspace export contains duplicate path ${raw.path}`,
      );
    }
    paths.add(raw.path);
    const archiveName = `${workspaceEntryPrefixV1}${raw.path}`;
    metadataBytes += centralMetadataBytesV1(archiveName);
    if (metadataBytes > browserWorkspacePortableArchiveMetadataMaximumBytesV1) {
      throw portableArchiveErrorV1(
        "metadata_limit_exceeded",
        "Workspace export exceeds its encoded metadata limit",
      );
    }
    sourceBytesBigInt += BigInt(raw.size);
    entries.push({
      path: raw.path,
      archiveName,
      size: raw.size,
      readRange: raw.readRange.bind(raw),
    });
  }
  entries.sort((left, right) => compareCodeUnitsV1(left.path, right.path));

  const metadata = [
    {
      name: browserWorkspacePortableArchiveManifestNameV1,
      size: manifest.bytes.byteLength,
    },
    ...entries.map((entry) => ({ name: entry.archiveName, size: entry.size })),
  ];
  const predictedLength = predictLength(metadata);
  if (
    predictedLength > BigInt(Number.MAX_SAFE_INTEGER) ||
    sourceBytesBigInt > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw portableArchiveErrorV1(
      "archive_length_exceeded",
      "Workspace export predicted length exceeds the safe-integer limit",
    );
  }
  return {
    manifestBytes: manifest.bytes,
    entries,
    sourceBytes: Number(sourceBytesBigInt),
    bytesTotal: Number(predictedLength),
  };
}

function throwIfAbortedV1(signal: AbortSignal): void {
  if (!signal.aborted) return;
  if (signal.reason !== undefined) throw signal.reason;
  throw new DOMException("Workspace export aborted", "AbortError");
}

function reportProgressV1(
  observer: CreateBrowserWorkspacePortableArchiveInputV1["onProgress"],
  progress: BrowserWorkspacePortableArchiveProgressV1,
): void {
  try {
    observer?.(progress);
  } catch {
    // A page-side progress observer cannot change the Host export result.
  }
}

async function settleQuietlyV1(operation: () => Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch {
    // Preserve the primary writer/source settlement.
  }
}

/**
 * Writes one canonical, store-only portable archive directly into `sink`.
 * The function validates all metadata and predicts the exact length before
 * opening the first source range.
 */
export async function createBrowserWorkspacePortableArchiveV1(
  input: CreateBrowserWorkspacePortableArchiveInputV1,
): Promise<BrowserWorkspacePortableArchiveResultV1> {
  throwIfAbortedV1(input.signal);
  const archive = admitArchiveV1(input);
  throwIfAbortedV1(input.signal);
  await input.beforeWrite?.({
    filesTotal: archive.entries.length,
    sourceBytes: archive.sourceBytes,
    bytesTotal: archive.bytesTotal,
  });
  throwIfAbortedV1(input.signal);

  const operationAbort = new AbortController();
  const abortOperation = () => operationAbort.abort(input.signal.reason);
  input.signal.addEventListener("abort", abortOperation, { once: true });
  const signal = operationAbort.signal;
  const trackedReleases = new Map<Uint8Array, TrackedReleaseV1[]>();
  const allReleases = new Set<() => void>();
  let filesCompleted = 0;
  let sourceBytesRead = 0;
  let bytesWritten = 0;

  const progress = (): BrowserWorkspacePortableArchiveProgressV1 => ({
    revision: 1,
    filesCompleted,
    filesTotal: archive.entries.length,
    sourceBytesRead,
    sourceBytes: archive.sourceBytes,
    bytesWritten,
    bytesTotal: archive.bytesTotal,
  });
  const report = () => reportProgressV1(input.onProgress, progress());

  const trackRelease = (bytes: Uint8Array, rawRelease: () => void): void => {
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      allReleases.delete(release);
      rawRelease();
    };
    allReleases.add(release);
    const tracked = { bytes, release };
    const existing = trackedReleases.get(bytes);
    if (existing === undefined) trackedReleases.set(bytes, [tracked]);
    else existing.push(tracked);
  };

  const takeRelease = (bytes: Uint8Array): (() => void) | null => {
    const tracked = trackedReleases.get(bytes);
    const current = tracked?.shift();
    if (tracked !== undefined && tracked.length === 0) trackedReleases.delete(bytes);
    return current?.release ?? null;
  };

  const sourceStream = (entry: AdmittedSourceEntryV1): ReadableStream<Uint8Array> => {
    let offset = 0;
    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      filesCompleted += 1;
      report();
    };
    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        throwIfAbortedV1(signal);
        if (offset === entry.size) {
          complete();
          controller.close();
          return;
        }
        const length = Math.min(
          browserWorkspacePortableArchiveSourceChunkMaximumBytesV1,
          entry.size - offset,
        );
        const chunk = await entry.readRange({ offset, length, signal });
        let released = false;
        const release = () => {
          if (released) return;
          released = true;
          chunk.release();
        };
        if (!(chunk.bytes instanceof Uint8Array) || chunk.bytes.byteLength !== length) {
          release();
          throw portableArchiveErrorV1(
            "source_range_mismatch",
            `Workspace export source returned an inexact range for ${entry.path}`,
          );
        }
        try {
          throwIfAbortedV1(signal);
        } catch (error) {
          release();
          throw error;
        }
        trackRelease(chunk.bytes, release);
        offset += length;
        sourceBytesRead += length;
        controller.enqueue(chunk.bytes);
        report();
      },
    }, {
      // client-zip must request each range explicitly. A positive default
      // high-water mark can prefetch several 1 MiB OPFS ranges while the
      // destination is stalled, defeating the shared Host I/O budget.
      highWaterMark: 0,
    });
  };

  const zipInputs = function* () {
    const timestamp = fixedLocalDosTimestampV1();
    yield {
      name: browserWorkspacePortableArchiveManifestNameV1,
      input: archive.manifestBytes,
      size: archive.manifestBytes.byteLength,
      lastModified: timestamp,
      mode: browserWorkspacePortableArchiveFileModeV1,
    };
    for (const entry of archive.entries) {
      throwIfAbortedV1(signal);
      yield {
        name: entry.archiveName,
        input: sourceStream(entry),
        size: entry.size,
        lastModified: timestamp,
        mode: browserWorkspacePortableArchiveFileModeV1,
      };
    }
  };

  const zip = makeZip(zipInputs(), {
    buffersAreUTF8: true,
  });
  const reader = zip.getReader();
  const writer = input.sink.getWriter();
  report();
  try {
    while (true) {
      throwIfAbortedV1(signal);
      const next = await reader.read();
      if (next.done) break;
      const release = takeRelease(next.value);
      try {
        await writer.write(next.value);
      } finally {
        release?.();
      }
      bytesWritten += next.value.byteLength;
      report();
    }
    if (bytesWritten !== archive.bytesTotal) {
      throw portableArchiveErrorV1(
        "archive_length_mismatch",
        "Workspace export writer produced an unexpected byte length",
      );
    }
    await writer.close();
    return {
      filesTotal: archive.entries.length,
      sourceBytes: archive.sourceBytes,
      bytesWritten,
      bytesTotal: archive.bytesTotal,
    };
  } catch (error) {
    operationAbort.abort(error);
    await Promise.all([
      settleQuietlyV1(async () => {
        // Abort the shared source signal, then keep reading so the next source
        // pull rejects inside this awaited task. This observes client-zip's
        // settlement without depending on its current-file cancel behavior.
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          takeRelease(next.value)?.();
        }
      }),
      settleQuietlyV1(() => writer.abort(error)),
    ]);
    throwIfAbortedV1(signal);
    throw error;
  } finally {
    input.signal.removeEventListener("abort", abortOperation);
    for (const release of [...allReleases]) {
      try {
        release();
      } catch {
        // The archive already has a primary settlement.
      }
    }
    trackedReleases.clear();
    reader.releaseLock();
    writer.releaseLock();
  }
}
