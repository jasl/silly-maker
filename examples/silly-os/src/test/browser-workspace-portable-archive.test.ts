// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  browserWorkspacePortableArchiveFileMaximumV1,
  browserWorkspacePortableArchiveFileModeV1,
  browserWorkspacePortableArchiveManifestNameV1,
  browserWorkspacePortableArchiveMetadataMaximumBytesV1,
  browserWorkspacePortableArchiveSourceChunkMaximumBytesV1,
  BrowserWorkspacePortableArchiveErrorV1,
  createBrowserWorkspacePortableArchiveV1,
  type BrowserWorkspacePortableArchiveProgressV1,
  type BrowserWorkspacePortableArchiveSourceEntryV1,
  type SillyOsWorkspaceExportManifestV1,
} from "../workspace/browser-workspace-portable-archive.ts";

interface ParsedZipEntryV1 {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly mode: number;
  readonly dosTime: number;
  readonly dosDate: number;
}

const decoderV1 = new TextDecoder();

const manifestV1: SillyOsWorkspaceExportManifestV1 = {
  revision: 1,
  kind: "sillyos-workspace",
  exportFormat: 1,
  workspaceFormat: 1,
  programId: "program.preview.1",
  workspaceId: "workspace.preview.1",
  sourceRevision: 4,
  baseRevision: 7,
  checkpointId: "checkpoint.preview.9",
  generation: 9,
};

function uint32V1(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function findEndOfCentralDirectoryV1(bytes: Uint8Array): number {
  const minimumOffset = Math.max(0, bytes.byteLength - 65_557);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = bytes.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (uint32V1(view, offset) === 0x06054b50) return offset;
  }
  throw new Error("missing ZIP end of central directory");
}

function crc32V1(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function parseStoredZipV1(bytes: Uint8Array): readonly ParsedZipEntryV1[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = findEndOfCentralDirectoryV1(bytes);
  const entryCount = view.getUint16(endOffset + 10, true);
  let centralOffset = uint32V1(view, endOffset + 16);
  const entries: ParsedZipEntryV1[] = [];
  for (let index = 0; index < entryCount; index += 1) {
    expect(uint32V1(view, centralOffset)).toBe(0x02014b50);
    expect(view.getUint16(centralOffset + 10, true)).toBe(0);
    const dosTime = view.getUint16(centralOffset + 12, true);
    const dosDate = view.getUint16(centralOffset + 14, true);
    const expectedCrc = uint32V1(view, centralOffset + 16);
    const compressedSize = uint32V1(view, centralOffset + 20);
    const uncompressedSize = uint32V1(view, centralOffset + 24);
    expect(compressedSize).toBe(uncompressedSize);
    const nameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const externalMode = view.getUint16(centralOffset + 40, true) & 0o777;
    const localOffset = uint32V1(view, centralOffset + 42);
    const nameBytes = bytes.subarray(centralOffset + 46, centralOffset + 46 + nameLength);
    const name = decoderV1.decode(nameBytes);

    expect(uint32V1(view, localOffset)).toBe(0x04034b50);
    expect(view.getUint16(localOffset + 8, true)).toBe(0);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const localName = decoderV1.decode(
      bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength),
    );
    expect(localName).toBe(name);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const data = bytes.slice(dataOffset, dataOffset + uncompressedSize);
    expect(crc32V1(data)).toBe(expectedCrc);
    entries.push({ name, bytes: data, mode: externalMode, dosTime, dosDate });
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function concatenateV1(chunks: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function memorySourceV1(
  path: string,
  bytes: Uint8Array,
  observations?: {
    readonly ranges: { offset: number; length: number }[];
    readonly releases: number[];
  },
): BrowserWorkspacePortableArchiveSourceEntryV1 {
  return {
    path,
    size: bytes.byteLength,
    async readRange(input) {
      if (input.signal.aborted) throw input.signal.reason;
      observations?.ranges.push({ offset: input.offset, length: input.length });
      const range = bytes.slice(input.offset, input.offset + input.length);
      let released = false;
      return {
        bytes: range,
        release() {
          if (released) throw new Error("source range released twice");
          released = true;
          observations?.releases.push(range.byteLength);
        },
      };
    },
  };
}

async function createInMemoryArchiveV1(input: {
  readonly entries: readonly BrowserWorkspacePortableArchiveSourceEntryV1[];
  readonly progress?: BrowserWorkspacePortableArchiveProgressV1[];
}): Promise<{
  readonly bytes: Uint8Array;
  readonly result: Awaited<ReturnType<typeof createBrowserWorkspacePortableArchiveV1>>;
}> {
  const chunks: Uint8Array[] = [];
  const progress = input.progress;
  const result = await createBrowserWorkspacePortableArchiveV1({
    manifest: manifestV1,
    entries: input.entries,
    sink: new WritableStream<Uint8Array>({
      write(chunk) {
        chunks.push(chunk.slice());
      },
    }),
    signal: new AbortController().signal,
    ...(progress === undefined ? {} : { onProgress: (next) => progress.push(next) }),
  });
  return { bytes: concatenateV1(chunks), result };
}

describe("SillyOS portable workspace archive", () => {
  it("writes one deterministic canonical archive with bounded range reads", async () => {
    const largeBytes = new Uint8Array(
      browserWorkspacePortableArchiveSourceChunkMaximumBytesV1 + 17,
    );
    largeBytes.forEach((_byte, index) => {
      largeBytes[index] = index % 251;
    });
    const observations = {
      ranges: [] as { offset: number; length: number }[],
      releases: [] as number[],
    };
    const smallBytes = new TextEncoder().encode("small\n");
    const progress: BrowserWorkspacePortableArchiveProgressV1[] = [];
    const first = await createInMemoryArchiveV1({
      entries: [
        memorySourceV1("z.bin", largeBytes, observations),
        memorySourceV1("a/猫.txt", smallBytes),
      ],
      progress,
    });
    const second = await createInMemoryArchiveV1({
      entries: [
        memorySourceV1("a/猫.txt", smallBytes),
        memorySourceV1("z.bin", largeBytes),
      ],
    });

    expect(bytesEqualV1(first.bytes, second.bytes)).toBe(true);
    expect(first.result).toEqual({
      filesTotal: 2,
      sourceBytes: largeBytes.byteLength + smallBytes.byteLength,
      bytesWritten: first.bytes.byteLength,
      bytesTotal: first.bytes.byteLength,
    });
    expect(observations.ranges).toEqual([
      { offset: 0, length: browserWorkspacePortableArchiveSourceChunkMaximumBytesV1 },
      { offset: browserWorkspacePortableArchiveSourceChunkMaximumBytesV1, length: 17 },
    ]);
    expect(observations.releases).toEqual([
      browserWorkspacePortableArchiveSourceChunkMaximumBytesV1,
      17,
    ]);

    const entries = parseStoredZipV1(first.bytes);
    expect(entries.map((entry) => entry.name)).toEqual([
      browserWorkspacePortableArchiveManifestNameV1,
      "workspace/a/猫.txt",
      "workspace/z.bin",
    ]);
    expect(decoderV1.decode(entries[0]?.bytes)).toBe(`${JSON.stringify(manifestV1)}\n`);
    expect(entries[1]?.bytes).toEqual(smallBytes);
    expect(entries[2]?.bytes).toEqual(largeBytes);
    for (const entry of entries) {
      expect(entry.mode).toBe(browserWorkspacePortableArchiveFileModeV1);
      expect(entry.dosTime).toBe(0);
      expect(entry.dosDate).toBe(33);
    }

    expect(progress.length).toBeGreaterThan(2);
    for (let index = 1; index < progress.length; index += 1) {
      const previous = progress[index - 1];
      const current = progress[index];
      expect(current?.filesCompleted).toBeGreaterThanOrEqual(previous?.filesCompleted ?? 0);
      expect(current?.sourceBytesRead).toBeGreaterThanOrEqual(previous?.sourceBytesRead ?? 0);
      expect(current?.bytesWritten).toBeGreaterThanOrEqual(previous?.bytesWritten ?? 0);
      expect(current?.filesTotal).toBe(2);
      expect(current?.sourceBytes).toBe(largeBytes.byteLength + smallBytes.byteLength);
      expect(current?.bytesTotal).toBe(first.bytes.byteLength);
    }
    expect(progress.at(-1)).toMatchObject({
      filesCompleted: 2,
      sourceBytesRead: largeBytes.byteLength + smallBytes.byteLength,
      bytesWritten: first.bytes.byteLength,
    });
  });

  it("awaits destination backpressure before asking for source bytes", async () => {
    let allowFirstWrite = () => {};
    const firstWriteGate = new Promise<void>((resolve) => {
      allowFirstWrite = resolve;
    });
    let firstWriteEntered: (() => void) | null = null;
    const entered = new Promise<void>((resolve) => {
      firstWriteEntered = resolve;
    });
    let writes = 0;
    let reads = 0;
    const source = memorySourceV1("file.txt", new TextEncoder().encode("payload"));
    const operation = createBrowserWorkspacePortableArchiveV1({
      manifest: manifestV1,
      entries: [{
        ...source,
        async readRange(input) {
          reads += 1;
          return await source.readRange(input);
        },
      }],
      sink: new WritableStream<Uint8Array>({
        async write() {
          writes += 1;
          if (writes === 1) {
            firstWriteEntered?.();
            await firstWriteGate;
          }
        },
      }),
      signal: new AbortController().signal,
    });

    await entered;
    await Promise.resolve();
    expect(writes).toBe(1);
    expect(reads).toBe(0);
    allowFirstWrite();
    await operation;
    expect(reads).toBe(1);
    expect(writes).toBeGreaterThan(1);
  });

  it("bounds source prefetch while a data write is stalled", async () => {
    const chunkBytes = browserWorkspacePortableArchiveSourceChunkMaximumBytesV1;
    const payloadBytes = chunkBytes * 4;
    let reads = 0;
    let releases = 0;
    let maximumOutstanding = 0;
    let allowDataWrite = () => {};
    const dataWriteGate = new Promise<void>((resolve) => {
      allowDataWrite = resolve;
    });
    let dataWriteEntered: (() => void) | null = null;
    const entered = new Promise<void>((resolve) => {
      dataWriteEntered = resolve;
    });
    let heldFirstDataWrite = false;
    const operation = createBrowserWorkspacePortableArchiveV1({
      manifest: manifestV1,
      entries: [{
        path: "payload.bin",
        size: payloadBytes,
        async readRange({ length }) {
          reads += 1;
          maximumOutstanding = Math.max(maximumOutstanding, reads - releases);
          return {
            bytes: new Uint8Array(length),
            release() {
              releases += 1;
            },
          };
        },
      }],
      sink: new WritableStream<Uint8Array>({
        async write(chunk) {
          if (!heldFirstDataWrite && chunk.byteLength === chunkBytes) {
            heldFirstDataWrite = true;
            dataWriteEntered?.();
            await dataWriteGate;
          }
        },
      }),
      signal: new AbortController().signal,
    });

    await entered;
    await Promise.resolve();
    await Promise.resolve();
    expect(reads).toBe(2);
    expect(releases).toBe(0);
    expect(maximumOutstanding).toBe(2);
    allowDataWrite();
    await operation;
    expect(reads).toBe(4);
    expect(releases).toBe(4);
    expect(maximumOutstanding).toBe(2);
  });

  it("propagates cancellation and releases a live source range exactly once", async () => {
    const controller = new AbortController();
    const payload = new Uint8Array(
      browserWorkspacePortableArchiveSourceChunkMaximumBytesV1,
    );
    let releases = 0;
    const cancellation = new DOMException("cancelled by test", "AbortError");
    const operation = createBrowserWorkspacePortableArchiveV1({
      manifest: manifestV1,
      entries: [{
        path: "payload.bin",
        size: payload.byteLength,
        async readRange() {
          return {
            bytes: payload,
            release() {
              releases += 1;
            },
          };
        },
      }],
      sink: new WritableStream<Uint8Array>({
        write(chunk) {
          if (chunk === payload) {
            controller.abort(cancellation);
            throw cancellation;
          }
        },
      }),
      signal: controller.signal,
    });

    await expect(operation).rejects.toBe(cancellation);
    expect(releases).toBe(1);
  });

  it("rejects file-count and safe-length bounds before reading or writing", async () => {
    let reads = 0;
    let writes = 0;
    const tooManyEntries = Array.from(
      { length: browserWorkspacePortableArchiveFileMaximumV1 + 1 },
      (_unused, index): BrowserWorkspacePortableArchiveSourceEntryV1 => ({
        path: `file-${String(index)}`,
        size: 0,
        async readRange() {
          reads += 1;
          return { bytes: new Uint8Array(), release() {} };
        },
      }),
    );
    const sink = new WritableStream<Uint8Array>({
      write() {
        writes += 1;
      },
    });

    await expect(createBrowserWorkspacePortableArchiveV1({
      manifest: manifestV1,
      entries: tooManyEntries,
      sink,
      signal: new AbortController().signal,
    })).rejects.toMatchObject(
      { code: "file_limit_exceeded" } satisfies Partial<BrowserWorkspacePortableArchiveErrorV1>,
    );
    await expect(createBrowserWorkspacePortableArchiveV1({
      manifest: manifestV1,
      entries: [{
        path: "huge.bin",
        size: Number.MAX_SAFE_INTEGER,
        async readRange() {
          reads += 1;
          return { bytes: new Uint8Array(), release() {} };
        },
      }],
      sink,
      signal: new AbortController().signal,
    })).rejects.toMatchObject(
      { code: "archive_length_exceeded" } satisfies Partial<
        BrowserWorkspacePortableArchiveErrorV1
      >,
    );
    expect(reads).toBe(0);
    expect(writes).toBe(0);
    expect(browserWorkspacePortableArchiveMetadataMaximumBytesV1).toBe(16 * 1024 * 1024);
  });

  it("rejects non-normalized and duplicate VFS paths before opening a source", async () => {
    let reads = 0;
    const source = (path: string): BrowserWorkspacePortableArchiveSourceEntryV1 => ({
      path,
      size: 0,
      async readRange() {
        reads += 1;
        return { bytes: new Uint8Array(), release() {} };
      },
    });
    const sink = new WritableStream<Uint8Array>();
    await expect(createBrowserWorkspacePortableArchiveV1({
      manifest: manifestV1,
      entries: [source("../escape")],
      sink,
      signal: new AbortController().signal,
    })).rejects.toMatchObject(
      { code: "invalid_source" } satisfies Partial<BrowserWorkspacePortableArchiveErrorV1>,
    );
    await expect(createBrowserWorkspacePortableArchiveV1({
      manifest: manifestV1,
      entries: [source("same.txt"), source("same.txt")],
      sink,
      signal: new AbortController().signal,
    })).rejects.toMatchObject(
      { code: "duplicate_path" } satisfies Partial<BrowserWorkspacePortableArchiveErrorV1>,
    );
    expect(reads).toBe(0);
  });
});
