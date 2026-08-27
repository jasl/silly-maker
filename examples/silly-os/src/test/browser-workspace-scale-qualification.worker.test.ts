// SPDX-License-Identifier: MIT

import {
  browserWorkspaceHostIoBytesInFlightMaximumV1,
  browserWorkspaceHostIoChunkMaximumBytesV1,
  createBrowserWorkspaceHostOpfsBootstrapV1,
  type BrowserWorkspaceHostIoObservationV1,
} from "../workspace/browser-workspace-host-opfs.ts";
import {
  type BrowserWorkspaceHostBootstrapPortV1,
  type BrowserWorkspaceHostDurableHeadV1,
  type BrowserWorkspaceHostFileRangeSourceV1,
  BrowserWorkspaceHostStorageErrorV1,
  type BrowserWorkspaceHostVolumeLeasePortV1,
} from "../workspace/browser-workspace-host-runtime.ts";
import {
  admitBrowserWorkspaceVolumeAnchorWireV1,
  type BrowserWorkspaceVolumeAnchorWireV1,
} from "../workspace/browser-workspace-host-protocol.ts";

const qualificationSmallFileCountV1 = 1_000;
const qualificationSmallFileBytesV1 = 5 * 1_024;
const qualificationLargeFileBytesV1 = 16 * 1_024 * 1_024;
const qualificationFileCountV1 = qualificationSmallFileCountV1 + 1;
const qualificationTotalBytesV1 = qualificationSmallFileCountV1 * qualificationSmallFileBytesV1 +
  qualificationLargeFileBytesV1;
const qualificationInitialGenerationV1 = 1;
const qualificationFinalGenerationV1 = qualificationInitialGenerationV1 + qualificationFileCountV1;
const qualificationBusyRetryCountV1 = 50;
const qualificationBusyRetryDelayMsV1 = 100;
const identityPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const sha256PatternV1 = /^[a-f0-9]{64}$/u;

interface QualificationFileV1 {
  readonly path: string;
  readonly byteLength: number;
  readonly seed: number;
}

interface QualificationIoMaximumsV1 {
  readonly sourceRangeBytes: number;
  readonly readRangeBytes: number;
  readonly observedChunkBytes: number;
  readonly observedBytesInFlight: number;
}

interface QualificationCreateRequestV1 {
  readonly method: "create";
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
}

interface QualificationVerifyRequestV1 {
  readonly method: "verify";
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
  readonly expectedHead: BrowserWorkspaceHostDurableHeadV1;
  readonly expectedCorpusHash: string;
}

type QualificationRequestRecordV1 =
  | QualificationCreateRequestV1
  | QualificationVerifyRequestV1;

interface QualificationRequestV1 {
  readonly revision: 1;
  readonly kind: "workspace_scale_qualification_request";
  readonly requestId: number;
  readonly record: QualificationRequestRecordV1;
}

interface QualificationSuccessMetadataV1 {
  readonly method: "create" | "verify";
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
  readonly head: BrowserWorkspaceHostDurableHeadV1;
  readonly fileCount: number;
  readonly totalBytes: number;
  readonly corpusHash: string;
  readonly ioMaximums: QualificationIoMaximumsV1;
}

interface QualificationSuccessResponseV1 {
  readonly revision: 1;
  readonly kind: "workspace_scale_qualification_response";
  readonly requestId: number;
  readonly ok: true;
  readonly response: QualificationSuccessMetadataV1;
}

interface QualificationFailureResponseV1 {
  readonly revision: 1;
  readonly kind: "workspace_scale_qualification_response";
  readonly requestId: number | null;
  readonly ok: false;
  readonly code: "invalid_request" | "volume_busy" | "storage_failed";
}

type QualificationResponseV1 =
  | QualificationSuccessResponseV1
  | QualificationFailureResponseV1;

interface QualificationWorkerScopeV1 {
  sendMessage(message: QualificationResponseV1): void;
  receiveMessage(
    listener: (event: Readonly<{ data: unknown }>) => void,
  ): void;
}

class QualificationIoTrackerV1 {
  private maximumSourceRangeBytes = 0;
  private maximumReadRangeBytes = 0;
  private maximumObservedChunkBytes = 0;
  private maximumObservedBytesInFlight = 0;

  readonly observeProductionIo = (observation: BrowserWorkspaceHostIoObservationV1): void => {
    if (
      !Number.isSafeInteger(observation.chunkBytes) || observation.chunkBytes < 0 ||
      observation.chunkBytes > browserWorkspaceHostIoChunkMaximumBytesV1 ||
      !Number.isSafeInteger(observation.bytesInFlight) || observation.bytesInFlight < 0 ||
      observation.bytesInFlight > browserWorkspaceHostIoBytesInFlightMaximumV1
    ) {
      throw new Error("Production OPFS I/O exceeded the qualification bounds");
    }
    this.maximumObservedChunkBytes = Math.max(
      this.maximumObservedChunkBytes,
      observation.chunkBytes,
    );
    this.maximumObservedBytesInFlight = Math.max(
      this.maximumObservedBytesInFlight,
      observation.bytesInFlight,
    );
  };

  observeSourceRange(length: number): void {
    this.assertRange(length);
    this.maximumSourceRangeBytes = Math.max(this.maximumSourceRangeBytes, length);
  }

  observeReadRange(length: number): void {
    this.assertRange(length);
    this.maximumReadRangeBytes = Math.max(this.maximumReadRangeBytes, length);
  }

  snapshot(): QualificationIoMaximumsV1 {
    return {
      sourceRangeBytes: this.maximumSourceRangeBytes,
      readRangeBytes: this.maximumReadRangeBytes,
      observedChunkBytes: this.maximumObservedChunkBytes,
      observedBytesInFlight: this.maximumObservedBytesInFlight,
    };
  }

  private assertRange(length: number): void {
    if (
      !Number.isSafeInteger(length) || length < 0 ||
      length > browserWorkspaceHostIoChunkMaximumBytesV1
    ) {
      throw new Error("Qualification I/O range exceeded one MiB");
    }
  }
}

class RollingCorpusHashV1 {
  private state = new Uint8Array(32);
  private readonly encoder = new TextEncoder();

  async beginFile(file: QualificationFileV1): Promise<void> {
    await this.mixSmallRecord(
      this.encoder.encode(`file\0${file.path}\0${file.byteLength}`),
    );
  }

  async addRange(offset: number, bytes: Uint8Array): Promise<void> {
    const rangeDigest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", exactArrayBufferV1(bytes)),
    );
    await this.mixSmallRecord(
      this.encoder.encode(`range\0${offset}\0${bytes.byteLength}`),
      rangeDigest,
    );
  }

  hex(): string {
    return [...this.state].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  private async mixSmallRecord(record: Uint8Array, digest?: Uint8Array): Promise<void> {
    const input = new Uint8Array(
      this.state.byteLength + record.byteLength + (digest?.byteLength ?? 0),
    );
    input.set(this.state, 0);
    input.set(record, this.state.byteLength);
    if (digest !== undefined) input.set(digest, this.state.byteLength + record.byteLength);
    this.state = new Uint8Array(
      await crypto.subtle.digest("SHA-256", exactArrayBufferV1(input)),
    );
  }
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

function admitHeadV1(
  value: unknown,
  anchor: BrowserWorkspaceVolumeAnchorWireV1,
): BrowserWorkspaceHostDurableHeadV1 | null {
  const record = exactRecordV1(value, [
    "revision",
    "volumeId",
    "workspaceFormat",
    "checkpointId",
    "generation",
  ]);
  if (
    record === null || record.revision !== 1 || record.volumeId !== anchor.volumeId ||
    record.workspaceFormat !== 1 || typeof record.checkpointId !== "string" ||
    !identityPatternV1.test(record.checkpointId) ||
    !Number.isSafeInteger(record.generation) || (record.generation as number) < 1
  ) return null;
  return {
    revision: 1,
    volumeId: anchor.volumeId,
    workspaceFormat: 1,
    checkpointId: record.checkpointId,
    generation: record.generation as number,
  };
}

function admitQualificationRequestV1(value: unknown): QualificationRequestV1 | null {
  const envelope = exactRecordV1(value, ["revision", "kind", "requestId", "record"]);
  if (
    envelope === null || envelope.revision !== 1 ||
    envelope.kind !== "workspace_scale_qualification_request" ||
    !Number.isSafeInteger(envelope.requestId) || (envelope.requestId as number) < 1
  ) return null;

  const methodRecord = exactRecordV1(envelope.record, ["method", "anchor"]);
  if (methodRecord !== null && methodRecord.method === "create") {
    const anchor = admitBrowserWorkspaceVolumeAnchorWireV1(methodRecord.anchor);
    return anchor === null ? null : {
      revision: 1,
      kind: "workspace_scale_qualification_request",
      requestId: envelope.requestId as number,
      record: { method: "create", anchor },
    };
  }

  const verifyRecord = exactRecordV1(envelope.record, [
    "method",
    "anchor",
    "expectedHead",
    "expectedCorpusHash",
  ]);
  if (
    verifyRecord === null || verifyRecord.method !== "verify" ||
    typeof verifyRecord.expectedCorpusHash !== "string" ||
    !sha256PatternV1.test(verifyRecord.expectedCorpusHash)
  ) return null;
  const anchor = admitBrowserWorkspaceVolumeAnchorWireV1(verifyRecord.anchor);
  if (anchor === null) return null;
  const expectedHead = admitHeadV1(verifyRecord.expectedHead, anchor);
  if (expectedHead === null || expectedHead.generation !== qualificationFinalGenerationV1) {
    return null;
  }
  return {
    revision: 1,
    kind: "workspace_scale_qualification_request",
    requestId: envelope.requestId as number,
    record: {
      method: "verify",
      anchor,
      expectedHead,
      expectedCorpusHash: verifyRecord.expectedCorpusHash,
    },
  };
}

function requestIdForFailureV1(value: unknown): number | null {
  const envelope = exactRecordV1(value, ["revision", "kind", "requestId", "record"]);
  return envelope !== null && Number.isSafeInteger(envelope.requestId) &&
      (envelope.requestId as number) >= 1
    ? envelope.requestId as number
    : null;
}

function qualificationFileV1(index: number): QualificationFileV1 {
  if (index < qualificationSmallFileCountV1) {
    return {
      path: `qualification/small/${index.toString().padStart(4, "0")}.bin`,
      byteLength: qualificationSmallFileBytesV1,
      seed: index + 1,
    };
  }
  if (index === qualificationSmallFileCountV1) {
    return {
      path: "qualification/large.bin",
      byteLength: qualificationLargeFileBytesV1,
      seed: qualificationFileCountV1,
    };
  }
  throw new Error("Qualification file index is outside the fixed corpus");
}

function qualificationByteV1(seed: number, offset: number): number {
  return (seed * 131 + offset * 17 + Math.floor(offset / 256) * 29) & 0xff;
}

function qualificationSourceV1(
  file: QualificationFileV1,
  tracker: QualificationIoTrackerV1,
): BrowserWorkspaceHostFileRangeSourceV1 {
  return {
    byteLength: file.byteLength,
    async readRange({ offset, length, signal }) {
      if (
        signal.aborted || !Number.isSafeInteger(offset) || offset < 0 ||
        !Number.isSafeInteger(length) || length < 0 ||
        !Number.isSafeInteger(offset + length) || offset + length > file.byteLength
      ) {
        throw new Error("Qualification source received an invalid range");
      }
      tracker.observeSourceRange(length);
      const bytes = new Uint8Array(length);
      for (let index = 0; index < length; index += 1) {
        bytes[index] = qualificationByteV1(file.seed, offset + index);
      }
      return bytes;
    },
  };
}

function exactArrayBufferV1(bytes: Uint8Array): ArrayBuffer {
  if (
    bytes.buffer instanceof ArrayBuffer && bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength
  ) return bytes.buffer;
  const owned = new Uint8Array(bytes.byteLength);
  owned.set(bytes);
  return owned.buffer;
}

function sameHeadV1(
  left: BrowserWorkspaceHostDurableHeadV1,
  right: BrowserWorkspaceHostDurableHeadV1,
): boolean {
  return left.revision === right.revision && left.volumeId === right.volumeId &&
    left.workspaceFormat === right.workspaceFormat &&
    left.checkpointId === right.checkpointId && left.generation === right.generation;
}

function assertInitialHeadV1(
  head: BrowserWorkspaceHostDurableHeadV1,
  anchor: BrowserWorkspaceVolumeAnchorWireV1,
): void {
  if (
    head.revision !== 1 || head.volumeId !== anchor.volumeId ||
    head.workspaceFormat !== anchor.workspaceFormat ||
    head.generation !== qualificationInitialGenerationV1
  ) {
    throw new Error("Qualification create requires the exact initial volume head");
  }
}

function assertSuccessorHeadV1(
  head: BrowserWorkspaceHostDurableHeadV1,
  previous: BrowserWorkspaceHostDurableHeadV1,
  checkpointId: string,
): void {
  if (
    head.revision !== 1 || head.volumeId !== previous.volumeId || head.workspaceFormat !== 1 ||
    head.checkpointId !== checkpointId || head.generation !== previous.generation + 1
  ) throw new Error("Qualification write returned an invalid durable successor");
}

async function hashCorpusV1(
  lease: BrowserWorkspaceHostVolumeLeasePortV1,
  tracker: QualificationIoTrackerV1,
): Promise<string> {
  const rollingHash = new RollingCorpusHashV1();
  const signal = new AbortController().signal;
  let totalBytes = 0;
  for (let index = 0; index < qualificationFileCountV1; index += 1) {
    const file = qualificationFileV1(index);
    const metadata = await lease.stat(file.path);
    if (metadata.kind !== "file" || metadata.size !== file.byteLength) {
      throw new Error("Qualification file metadata did not match the fixed corpus");
    }
    await rollingHash.beginFile(file);
    for (let offset = 0; offset < file.byteLength;) {
      const length = Math.min(
        browserWorkspaceHostIoChunkMaximumBytesV1,
        file.byteLength - offset,
      );
      tracker.observeReadRange(length);
      const bytes = await lease.readFileRange({ path: file.path, offset, length, signal });
      if (
        bytes.byteLength !== length ||
        bytes.buffer.byteLength > browserWorkspaceHostIoChunkMaximumBytesV1
      ) throw new Error("Qualification file read returned an invalid range");
      await rollingHash.addRange(offset, bytes);
      offset += length;
    }
    totalBytes += file.byteLength;
  }
  if (totalBytes !== qualificationTotalBytesV1) {
    throw new Error("Qualification corpus did not match its fixed total size");
  }
  return rollingHash.hex();
}

function successResponseV1(input: {
  readonly requestId: number;
  readonly method: "create" | "verify";
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
  readonly head: BrowserWorkspaceHostDurableHeadV1;
  readonly corpusHash: string;
  readonly tracker: QualificationIoTrackerV1;
}): QualificationSuccessResponseV1 {
  return {
    revision: 1,
    kind: "workspace_scale_qualification_response",
    requestId: input.requestId,
    ok: true,
    response: {
      method: input.method,
      anchor: input.anchor,
      head: input.head,
      fileCount: qualificationFileCountV1,
      totalBytes: qualificationTotalBytesV1,
      corpusHash: input.corpusHash,
      ioMaximums: input.tracker.snapshot(),
    },
  };
}

function failureResponseV1(
  requestId: number | null,
  error: unknown,
): QualificationFailureResponseV1 {
  return {
    revision: 1,
    kind: "workspace_scale_qualification_response",
    requestId,
    ok: false,
    code: error instanceof BrowserWorkspaceHostStorageErrorV1 && error.code === "volume_busy"
      ? "volume_busy"
      : "storage_failed",
  };
}

const retainedCreateAuthoritiesV1 = new Set<
  Readonly<{
    bootstrap: BrowserWorkspaceHostBootstrapPortV1;
    lease: BrowserWorkspaceHostVolumeLeasePortV1;
  }>
>();

async function createQualificationV1(
  requestId: number,
  record: QualificationCreateRequestV1,
): Promise<QualificationSuccessResponseV1> {
  const tracker = new QualificationIoTrackerV1();
  const bootstrap = createBrowserWorkspaceHostOpfsBootstrapV1({
    observeIo: tracker.observeProductionIo,
  });
  let lease: BrowserWorkspaceHostVolumeLeasePortV1 | null = null;
  try {
    lease = await bootstrap.openVolume(record.anchor);
    let head = await lease.readHead();
    assertInitialHeadV1(head, record.anchor);
    const signal = new AbortController().signal;
    for (let index = 0; index < qualificationFileCountV1; index += 1) {
      const file = qualificationFileV1(index);
      const nextCheckpointId = `qualification.checkpoint.${head.generation + 1}`;
      const result = await lease.replaceFile({
        path: file.path,
        source: qualificationSourceV1(file, tracker),
        expectedHead: head,
        nextCheckpointId,
        signal,
      });
      if (!result.changed) throw new Error("Qualification file was not a new mutation");
      assertSuccessorHeadV1(result.head, head, nextCheckpointId);
      head = result.head;
    }
    if (head.generation !== qualificationFinalGenerationV1) {
      throw new Error("Qualification create did not reach generation 1002");
    }
    const corpusHash = await hashCorpusV1(lease, tracker);
    retainedCreateAuthoritiesV1.add({ bootstrap, lease });
    return successResponseV1({
      requestId,
      method: "create",
      anchor: record.anchor,
      head,
      corpusHash,
      tracker,
    });
  } catch (error) {
    if (lease !== null) await lease.close().catch(() => undefined);
    await bootstrap.dispose().catch(() => undefined);
    throw error;
  }
}

async function delayV1(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function openWithBusyRetryV1(
  bootstrap: BrowserWorkspaceHostBootstrapPortV1,
  anchor: BrowserWorkspaceVolumeAnchorWireV1,
): Promise<BrowserWorkspaceHostVolumeLeasePortV1> {
  for (let attempt = 1; attempt <= qualificationBusyRetryCountV1; attempt += 1) {
    try {
      return await bootstrap.openVolume(anchor);
    } catch (error) {
      if (
        !(error instanceof BrowserWorkspaceHostStorageErrorV1) || error.code !== "volume_busy" ||
        attempt === qualificationBusyRetryCountV1
      ) throw error;
      await delayV1(qualificationBusyRetryDelayMsV1);
    }
  }
  throw new Error("Qualification busy retry bound was exhausted");
}

async function verifyQualificationV1(
  requestId: number,
  record: QualificationVerifyRequestV1,
): Promise<QualificationSuccessResponseV1> {
  const tracker = new QualificationIoTrackerV1();
  const bootstrap = createBrowserWorkspaceHostOpfsBootstrapV1({
    observeIo: tracker.observeProductionIo,
  });
  let lease: BrowserWorkspaceHostVolumeLeasePortV1 | null = null;
  try {
    lease = await openWithBusyRetryV1(bootstrap, record.anchor);
    const head = await lease.readHead();
    if (!sameHeadV1(head, record.expectedHead)) {
      throw new Error("Qualification cold-open head did not match the create receipt");
    }
    const corpusHash = await hashCorpusV1(lease, tracker);
    if (corpusHash !== record.expectedCorpusHash) {
      throw new Error("Qualification cold-open corpus hash did not match the create receipt");
    }
    await lease.close();
    lease = null;
    await bootstrap.dispose();
    return successResponseV1({
      requestId,
      method: "verify",
      anchor: record.anchor,
      head,
      corpusHash,
      tracker,
    });
  } catch (error) {
    if (lease !== null) await lease.close().catch(() => undefined);
    await bootstrap.dispose().catch(() => undefined);
    throw error;
  }
}

function currentQualificationWorkerScopeV1(): QualificationWorkerScopeV1 | null {
  const candidate = globalThis as typeof globalThis & {
    readonly document?: unknown;
    readonly postMessage?: unknown;
    readonly addEventListener?: unknown;
  };
  if (
    "document" in candidate || typeof candidate.postMessage !== "function" ||
    typeof candidate.addEventListener !== "function"
  ) return null;
  const postMessage = candidate.postMessage;
  const addEventListener = candidate.addEventListener;
  return {
    sendMessage(message) {
      Reflect.apply(postMessage, candidate, [message]);
    },
    receiveMessage(listener) {
      Reflect.apply(addEventListener, candidate, ["message", listener]);
    },
  };
}

function installQualificationWorkerV1(scope: QualificationWorkerScopeV1): void {
  let received = false;
  scope.receiveMessage((event) => {
    if (received) {
      scope.sendMessage({
        revision: 1,
        kind: "workspace_scale_qualification_response",
        requestId: requestIdForFailureV1(event.data),
        ok: false,
        code: "invalid_request",
      });
      return;
    }
    received = true;
    const request = admitQualificationRequestV1(event.data);
    if (request === null) {
      scope.sendMessage({
        revision: 1,
        kind: "workspace_scale_qualification_response",
        requestId: requestIdForFailureV1(event.data),
        ok: false,
        code: "invalid_request",
      });
      return;
    }
    const operation = request.record.method === "create"
      ? createQualificationV1(request.requestId, request.record)
      : verifyQualificationV1(request.requestId, request.record);
    void operation.then(
      (response) => scope.sendMessage(response),
      (error: unknown) => scope.sendMessage(failureResponseV1(request.requestId, error)),
    );
  });
}

function containsVolumePayloadV1(value: unknown, visited = new Set<object>()): boolean {
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return true;
  if (typeof Blob !== "undefined" && value instanceof Blob) return true;
  if (typeof value !== "object" || value === null || visited.has(value)) return false;
  visited.add(value);
  return Object.values(value).some((entry) => containsVolumePayloadV1(entry, visited));
}

const workerScopeV1 = currentQualificationWorkerScopeV1();
if (workerScopeV1 !== null) {
  installQualificationWorkerV1(workerScopeV1);
} else {
  // The qualification URL is first discovered by a live Vite page. Keeping
  // Vitest out of that Worker graph avoids an optimize-dependency reload; this
  // branch runs only when the same test-only module is loaded by the unit runner.
  const { describe, expect, it } = await import(/* @vite-ignore */ "vitest");

  const anchor: BrowserWorkspaceVolumeAnchorWireV1 = {
    revision: 1,
    programId: "program.scale.qualification",
    workspaceId: "workspace.scale.qualification",
    volumeId: "volume.scale.qualification",
    workspaceFormat: 1,
  };
  const expectedHead: BrowserWorkspaceHostDurableHeadV1 = {
    revision: 1,
    volumeId: anchor.volumeId,
    workspaceFormat: 1,
    checkpointId: "qualification.checkpoint.1002",
    generation: qualificationFinalGenerationV1,
  };

  describe("SillyOS Browser Workspace scale qualification Worker", () => {
    it("exact-admits only the fixed create and verify commands", () => {
      expect(admitQualificationRequestV1({
        revision: 1,
        kind: "workspace_scale_qualification_request",
        requestId: 1,
        record: { method: "create", anchor },
      })).toEqual({
        revision: 1,
        kind: "workspace_scale_qualification_request",
        requestId: 1,
        record: { method: "create", anchor },
      });
      expect(admitQualificationRequestV1({
        revision: 1,
        kind: "workspace_scale_qualification_request",
        requestId: 2,
        record: {
          method: "verify",
          anchor,
          expectedHead,
          expectedCorpusHash: "a".repeat(64),
        },
      })).toEqual({
        revision: 1,
        kind: "workspace_scale_qualification_request",
        requestId: 2,
        record: {
          method: "verify",
          anchor,
          expectedHead,
          expectedCorpusHash: "a".repeat(64),
        },
      });
      expect(admitQualificationRequestV1({
        revision: 1,
        kind: "workspace_scale_qualification_request",
        requestId: 3,
        record: { method: "create", anchor, extra: true },
      })).toBeNull();
      expect(admitQualificationRequestV1({
        revision: 1,
        kind: "workspace_scale_qualification_request",
        requestId: 4,
        record: {
          method: "verify",
          anchor,
          expectedHead: { ...expectedHead, generation: 1_003 },
          expectedCorpusHash: "a".repeat(64),
        },
      })).toBeNull();
    });

    it("serves deterministic source ranges without admitting a range over one MiB", async () => {
      const tracker = new QualificationIoTrackerV1();
      const file = qualificationFileV1(qualificationSmallFileCountV1);
      const source = qualificationSourceV1(file, tracker);
      const signal = new AbortController().signal;
      const first = await source.readRange({ offset: 1_048_000, length: 576, signal });
      const second = await source.readRange({ offset: 1_048_000, length: 576, signal });
      expect(first).toEqual(second);
      expect(first[0]).toBe(qualificationByteV1(file.seed, 1_048_000));
      await expect(source.readRange({
        offset: 0,
        length: browserWorkspaceHostIoChunkMaximumBytesV1 + 1,
        signal,
      })).rejects.toThrow("one MiB");
      expect(tracker.snapshot().sourceRangeBytes).toBe(576);
    });

    it("builds only fixed small scalar receipts", () => {
      const tracker = new QualificationIoTrackerV1();
      tracker.observeProductionIo({
        chunkBytes: browserWorkspaceHostIoChunkMaximumBytesV1,
        bytesInFlight: 2 * browserWorkspaceHostIoChunkMaximumBytesV1,
      });
      const response = successResponseV1({
        requestId: 5,
        method: "verify",
        anchor,
        head: expectedHead,
        corpusHash: "b".repeat(64),
        tracker,
      });
      expect(response.response).toMatchObject({
        fileCount: 1_001,
        totalBytes: 21_897_216,
        corpusHash: "b".repeat(64),
        ioMaximums: {
          sourceRangeBytes: 0,
          readRangeBytes: 0,
          observedChunkBytes: 1_048_576,
          observedBytesInFlight: 2_097_152,
        },
      });
      expect(containsVolumePayloadV1(response)).toBe(false);
      expect(containsVolumePayloadV1(failureResponseV1(5, new Error("private")))).toBe(false);
    });
  });
}
