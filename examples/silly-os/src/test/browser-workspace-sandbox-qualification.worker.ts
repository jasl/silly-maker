// SPDX-License-Identifier: MIT

import {
  createBrowserWorkspaceEnvironmentClientV1,
  type BrowserWorkspaceEnvironmentClientV1,
  type BrowserWorkspaceEnvironmentMessagePortV1,
} from "../agent/browser-workspace-environment-client.ts";
import { createReadTool, createWriteTool } from "../agent/pi-workspace-runtime-bridge.js";
import {
  bindPiWorkspaceReadToolV1,
  bindPiWorkspaceWriteToolV1,
} from "../agent/pi-workspace-tool-binder.ts";
import type {
  WorkspaceAgentRunV1,
  WorkspaceExecutionDescriptorV1,
  WorkspaceMutationRecordV1,
} from "../workspace/contracts.ts";
import {
  admitBrowserWorkspaceHostEnvironmentOutboundMessageV1,
  admitBrowserWorkspaceHostEnvironmentRequestV1,
  browserWorkspaceHostReceiptMaximumV1,
  browserWorkspaceNativePiToolPayloadMaximumBytesV1,
} from "../workspace/browser-workspace-host-protocol.ts";

const qualificationProtocolRevisionV1 = 1 as const;
const qualificationCreateInitialGenerationV1 = 1;
export const qualificationCorpusFileBytesV1 = browserWorkspaceNativePiToolPayloadMaximumBytesV1;
export const qualificationCorpusFileCountV1 = 80;
export const qualificationCorpusTotalBytesV1 = qualificationCorpusFileBytesV1 *
  qualificationCorpusFileCountV1;
const qualificationMutationCountV1 = qualificationCorpusFileCountV1 + 1;
export const qualificationCreateFinalGenerationV1 = qualificationCreateInitialGenerationV1 +
  qualificationMutationCountV1;
const qualificationReceiptAcknowledgementBatchV1 = 16;
const qualificationTimeoutMillisecondsV1 = 180_000;
const qualificationCleanupTimeoutMillisecondsV1 = 1_000;
const qualificationTextPathV1 = "qualification/native-pi-round-trip.txt";
export const qualificationTextV1 = "SillyOS independent-origin native Pi round trip.\n";
const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u;

interface QualificationRequestV1 {
  readonly revision: 1;
  readonly kind: "workspace_sandbox_qualification_request";
  readonly requestId: number;
  readonly mode: "create" | "verify";
  readonly descriptor: WorkspaceExecutionDescriptorV1;
}

interface QualificationIoMaximumsV1 {
  readonly writePayloadBytes: number;
  readonly readPayloadBytes: number;
  readonly hashInputBytes: number;
  readonly receiptQueueDepth: number;
}

interface QualificationSuccessMetadataV1 {
  readonly mode: "create" | "verify";
  readonly anchor: {
    readonly programId: string;
    readonly workspaceId: string;
  };
  readonly head: {
    readonly generation: number;
    readonly hash: string;
  };
  readonly initialGeneration: number;
  readonly fileCount: number;
  readonly totalBytes: number;
  readonly corpusHash: string;
  readonly ioMaximums: QualificationIoMaximumsV1;
}

export interface QualificationSuccessResponseV1 {
  readonly revision: 1;
  readonly kind: "workspace_sandbox_qualification_response";
  readonly requestId: number;
  readonly ok: true;
  readonly response: QualificationSuccessMetadataV1;
}

type QualificationFailureCodeV1 =
  | "invalid_request"
  | "invalid_port"
  | "run_rejected"
  | "timeout"
  | "execution_failed";

interface QualificationFailureResponseV1 {
  readonly revision: 1;
  readonly kind: "workspace_sandbox_qualification_response";
  readonly requestId: number | null;
  readonly ok: false;
  readonly code: QualificationFailureCodeV1;
}

type QualificationResponseV1 =
  | QualificationSuccessResponseV1
  | QualificationFailureResponseV1;

interface QualificationWorkerMessageEventV1 {
  readonly data: unknown;
  readonly ports: readonly MessagePort[];
}

interface QualificationWorkerScopeV1 {
  sendMessage(message: QualificationResponseV1): void;
  receiveMessage(listener: (event: QualificationWorkerMessageEventV1) => void): void;
  closeWorker(): void;
}

export class QualificationFailureV1 extends Error {
  readonly code: Exclude<QualificationFailureCodeV1, "invalid_request" | "invalid_port">;

  constructor(
    code: Exclude<QualificationFailureCodeV1, "invalid_request" | "invalid_port">,
    message: string,
  ) {
    super(message);
    this.name = "QualificationFailureV1";
    this.code = code;
  }
}

export class QualificationIoTrackerV1 {
  private maximumWritePayloadBytes = 0;
  private maximumReadPayloadBytes = 0;
  private maximumHashInputBytes = 0;
  private maximumReceiptQueueDepth = 0;

  observeWritePayload(byteLength: number): void {
    this.assertPayload(byteLength);
    this.maximumWritePayloadBytes = Math.max(this.maximumWritePayloadBytes, byteLength);
  }

  observeReadPayload(byteLength: number): void {
    this.assertPayload(byteLength);
    this.maximumReadPayloadBytes = Math.max(this.maximumReadPayloadBytes, byteLength);
  }

  observeHashInput(byteLength: number): void {
    this.assertPayload(byteLength);
    this.maximumHashInputBytes = Math.max(this.maximumHashInputBytes, byteLength);
  }

  observeReceiptQueue(depth: number): void {
    if (
      !Number.isSafeInteger(depth) || depth < 0 ||
      depth > browserWorkspaceHostReceiptMaximumV1
    ) {
      throw new QualificationFailureV1(
        "execution_failed",
        "Workspace receipt queue exceeded its fixed bound",
      );
    }
    this.maximumReceiptQueueDepth = Math.max(this.maximumReceiptQueueDepth, depth);
  }

  snapshot(): QualificationIoMaximumsV1 {
    return Object.freeze({
      writePayloadBytes: this.maximumWritePayloadBytes,
      readPayloadBytes: this.maximumReadPayloadBytes,
      hashInputBytes: this.maximumHashInputBytes,
      receiptQueueDepth: this.maximumReceiptQueueDepth,
    });
  }

  private assertPayload(byteLength: number): void {
    if (
      !Number.isSafeInteger(byteLength) || byteLength < 0 ||
      byteLength > browserWorkspaceNativePiToolPayloadMaximumBytesV1
    ) {
      throw new QualificationFailureV1(
        "execution_failed",
        "Workspace qualification payload exceeded 256 KiB",
      );
    }
  }
}

class ObservedEnvironmentPortV1 implements BrowserWorkspaceEnvironmentMessagePortV1 {
  private readonly messageListeners = new Set<(event: Readonly<{ data: unknown }>) => void>();
  private readonly messageErrorListeners = new Set<() => void>();
  private endRunRequestId: number | null = null;
  private endRunPromise: Promise<void> | null = null;
  private resolveEndRun: (() => void) | null = null;
  private rejectEndRun: ((error: Error) => void) | null = null;
  private closed = false;

  constructor(
    private readonly port: MessagePort,
    private readonly tracker: QualificationIoTrackerV1,
  ) {
    this.port.addEventListener("message", this.receivePortMessage);
    this.port.addEventListener("messageerror", this.receivePortMessageError);
  }

  postMessage(message: unknown, transfer: readonly Transferable[] = []): void {
    if (this.closed) throw new Error("Workspace qualification environment port is closed");
    const admitted = admitBrowserWorkspaceHostEnvironmentRequestV1(message);
    if (admitted === null) {
      throw new QualificationFailureV1(
        "execution_failed",
        "Workspace client emitted a malformed environment request",
      );
    }
    if (admitted.record.method === "write_file") {
      this.tracker.observeWritePayload(admitted.record.bytes.byteLength);
    }
    if (admitted.record.method === "end_run") {
      if (this.endRunPromise !== null) {
        throw new QualificationFailureV1(
          "execution_failed",
          "Workspace client emitted more than one end-run request",
        );
      }
      this.endRunRequestId = admitted.requestId;
      this.endRunPromise = new Promise<void>((resolve, reject) => {
        this.resolveEndRun = resolve;
        this.rejectEndRun = reject;
      });
    }
    this.port.postMessage(message, [...transfer]);
  }

  addEventListener(
    type: "message",
    listener: (event: Readonly<{ data: unknown }>) => void,
  ): void;
  addEventListener(type: "messageerror", listener: () => void): void;
  addEventListener(
    type: "message" | "messageerror",
    listener: ((event: Readonly<{ data: unknown }>) => void) | (() => void),
  ): void {
    if (type === "message") {
      this.messageListeners.add(listener as (event: Readonly<{ data: unknown }>) => void);
    } else {
      this.messageErrorListeners.add(listener as () => void);
    }
  }

  removeEventListener(
    type: "message",
    listener: (event: Readonly<{ data: unknown }>) => void,
  ): void;
  removeEventListener(type: "messageerror", listener: () => void): void;
  removeEventListener(
    type: "message" | "messageerror",
    listener: ((event: Readonly<{ data: unknown }>) => void) | (() => void),
  ): void {
    if (type === "message") {
      this.messageListeners.delete(listener as (event: Readonly<{ data: unknown }>) => void);
    } else {
      this.messageErrorListeners.delete(listener as () => void);
    }
  }

  start(): void {
    this.port.start();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.port.removeEventListener("message", this.receivePortMessage);
    this.port.removeEventListener("messageerror", this.receivePortMessageError);
    this.port.close();
    this.rejectEndRun?.(new Error("Workspace qualification environment port closed"));
    this.resolveEndRun = null;
    this.rejectEndRun = null;
    this.messageListeners.clear();
    this.messageErrorListeners.clear();
  }

  async waitForEndRun(): Promise<void> {
    if (this.endRunPromise === null) {
      throw new QualificationFailureV1(
        "execution_failed",
        "Workspace run did not emit an end-run request",
      );
    }
    await this.endRunPromise;
  }

  private readonly receivePortMessage = (event: MessageEvent<unknown>): void => {
    if (this.closed) return;
    const admitted = admitBrowserWorkspaceHostEnvironmentOutboundMessageV1(event.data);
    if (admitted !== null && admitted.kind === "environment_response") {
      if (admitted.ok && admitted.response.method === "read_binary_file") {
        this.tracker.observeReadPayload(admitted.response.value.byteLength);
      }
      if (admitted.requestId === this.endRunRequestId) {
        if (admitted.ok && admitted.response.method === "end_run") {
          this.resolveEndRun?.();
        } else {
          this.rejectEndRun?.(new Error("Workspace end-run request failed"));
        }
        this.resolveEndRun = null;
        this.rejectEndRun = null;
      }
    }
    const forwarded = Object.freeze({ data: event.data });
    for (const listener of this.messageListeners) listener(forwarded);
  };

  private readonly receivePortMessageError = (): void => {
    if (this.closed) return;
    this.rejectEndRun?.(new Error("Workspace environment message could not be decoded"));
    this.resolveEndRun = null;
    this.rejectEndRun = null;
    for (const listener of this.messageErrorListeners) listener();
  };
}

class RollingCorpusHashV1 {
  private state = new Uint8Array(32);
  private readonly encoder = new TextEncoder();

  constructor(private readonly tracker: QualificationIoTrackerV1) {}

  async addFile(index: number, bytes: Uint8Array): Promise<void> {
    this.tracker.observeHashInput(bytes.byteLength);
    const fileDigest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", exactArrayBufferV1(bytes)),
    );
    const record = this.encoder.encode(
      `file\0${qualificationCorpusPathV1(index)}\0${bytes.byteLength}`,
    );
    const input = new Uint8Array(this.state.byteLength + record.byteLength + fileDigest.byteLength);
    input.set(this.state, 0);
    input.set(record, this.state.byteLength);
    input.set(fileDigest, this.state.byteLength + record.byteLength);
    this.state = new Uint8Array(
      await crypto.subtle.digest("SHA-256", exactArrayBufferV1(input)),
    );
  }

  hex(): string {
    return bytesToHexV1(this.state);
  }
}

function exactRecordV1(
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value) as unknown;
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const names = Object.getOwnPropertyNames(value);
    if (names.length !== keys.length || names.some((name) => !keys.includes(name))) return null;
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) return null;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function admitDescriptorV1(value: unknown): WorkspaceExecutionDescriptorV1 | null {
  const descriptor = exactRecordV1(value, [
    "revision",
    "programId",
    "workspaceId",
    "workspaceSessionId",
    "generation",
  ]);
  if (
    descriptor === null || descriptor.revision !== 1 ||
    typeof descriptor.programId !== "string" || !identifierPatternV1.test(descriptor.programId) ||
    typeof descriptor.workspaceId !== "string" ||
    !identifierPatternV1.test(descriptor.workspaceId) ||
    typeof descriptor.workspaceSessionId !== "string" ||
    !identifierPatternV1.test(descriptor.workspaceSessionId) ||
    typeof descriptor.generation !== "number" ||
    !Number.isSafeInteger(descriptor.generation) || descriptor.generation < 1
  ) return null;
  return Object.freeze({
    revision: 1,
    programId: descriptor.programId,
    workspaceId: descriptor.workspaceId,
    workspaceSessionId: descriptor.workspaceSessionId,
    generation: descriptor.generation,
  });
}

export function admitQualificationRequestV1(value: unknown): QualificationRequestV1 | null {
  const request = exactRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "mode",
    "descriptor",
  ]);
  if (
    request === null || request.revision !== qualificationProtocolRevisionV1 ||
    request.kind !== "workspace_sandbox_qualification_request" ||
    typeof request.requestId !== "number" || !Number.isSafeInteger(request.requestId) ||
    request.requestId < 1 || (request.mode !== "create" && request.mode !== "verify")
  ) return null;
  const descriptor = admitDescriptorV1(request.descriptor);
  if (
    descriptor === null ||
    (request.mode === "create" &&
      descriptor.generation !== qualificationCreateInitialGenerationV1) ||
    (request.mode === "verify" &&
      descriptor.generation !== qualificationCreateFinalGenerationV1)
  ) return null;
  return Object.freeze({
    revision: 1,
    kind: "workspace_sandbox_qualification_request",
    requestId: request.requestId,
    mode: request.mode,
    descriptor,
  });
}

function requestIdForFailureV1(value: unknown): number | null {
  const request = exactRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "mode",
    "descriptor",
  ]);
  return request !== null && typeof request.requestId === "number" &&
      Number.isSafeInteger(request.requestId) && request.requestId >= 1
    ? request.requestId
    : null;
}

function qualificationCorpusPathV1(index: number): string {
  if (!Number.isSafeInteger(index) || index < 0 || index >= qualificationCorpusFileCountV1) {
    throw new QualificationFailureV1(
      "execution_failed",
      "Qualification corpus index is outside its fixed bounds",
    );
  }
  return `qualification/corpus/${index.toString().padStart(3, "0")}.bin`;
}

function qualificationCorpusByteV1(index: number, offset: number): number {
  return ((index + 1) * 131 + offset * 17 + Math.floor(offset / 256) * 29) & 0xff;
}

export function qualificationCorpusBytesV1(index: number): Uint8Array {
  const bytes = new Uint8Array(qualificationCorpusFileBytesV1);
  for (let offset = 0; offset < bytes.byteLength; offset += 1) {
    bytes[offset] = qualificationCorpusByteV1(index, offset);
  }
  return bytes;
}

export function assertQualificationCorpusBytesV1(index: number, bytes: Uint8Array): void {
  if (bytes.byteLength !== qualificationCorpusFileBytesV1) {
    throw new QualificationFailureV1(
      "execution_failed",
      "Qualification corpus file has the wrong length",
    );
  }
  for (let offset = 0; offset < bytes.byteLength; offset += 1) {
    if (bytes[offset] !== qualificationCorpusByteV1(index, offset)) {
      throw new QualificationFailureV1(
        "execution_failed",
        "Qualification corpus file has unexpected bytes",
      );
    }
  }
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

function bytesToHexV1(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function anchorHeadHashV1(input: {
  readonly descriptor: WorkspaceExecutionDescriptorV1;
  readonly generation: number;
  readonly corpusHash: string;
}): Promise<string> {
  const bytes = new TextEncoder().encode([
    "sillyos.workspace_sandbox_qualification.anchor_head.v1",
    input.descriptor.programId,
    input.descriptor.workspaceId,
    String(input.generation),
    input.corpusHash,
  ].join("\0"));
  return bytesToHexV1(
    new Uint8Array(await crypto.subtle.digest("SHA-256", exactArrayBufferV1(bytes))),
  );
}

function toolResultTextV1(value: unknown): string | null {
  const result = exactRecordV1(value, ["content", "details"]);
  if (result === null || !Array.isArray(result.content) || result.content.length !== 1) return null;
  const item = exactRecordV1(result.content[0], ["type", "text"]);
  return item !== null && item.type === "text" && typeof item.text === "string" ? item.text : null;
}

async function runNativePiTextProbeV1(input: {
  readonly mode: "create" | "verify";
  readonly run: WorkspaceAgentRunV1;
  readonly signal: AbortSignal;
}): Promise<void> {
  if (input.mode === "create") {
    const write = bindPiWorkspaceWriteToolV1(createWriteTool(), input.run);
    const result = await write.execute(
      "qualification.native-pi.write.1",
      { path: qualificationTextPathV1, content: qualificationTextV1 },
      input.signal,
    );
    if (
      toolResultTextV1(result) !==
        `Successfully wrote ${qualificationTextV1.length} bytes to ${qualificationTextPathV1}`
    ) {
      throw new QualificationFailureV1(
        "execution_failed",
        "Native Pi write probe returned an unexpected result",
      );
    }
  }

  const read = bindPiWorkspaceReadToolV1(createReadTool(), input.run);
  const result = await read.execute(
    "qualification.native-pi.read.1",
    { path: qualificationTextPathV1 },
    input.signal,
  );
  if (toolResultTextV1(result) !== qualificationTextV1) {
    throw new QualificationFailureV1(
      "execution_failed",
      "Native Pi read probe did not recover the fixed text",
    );
  }
}

async function writeCorpusFileV1(input: {
  readonly run: WorkspaceAgentRunV1;
  readonly index: number;
  readonly bytes: Uint8Array;
  readonly signal: AbortSignal;
}): Promise<void> {
  const path = qualificationCorpusPathV1(input.index);
  await input.run.executeWriteCall({
    toolCallId: `qualification.corpus.write.${input.index + 1}`,
    signal: input.signal,
    invoke: async (signal) => {
      const result = await input.run.env.writeFile(path, input.bytes, signal);
      if (!result.ok) throw result.error;
    },
  });
}

async function readCorpusFileV1(input: {
  readonly run: WorkspaceAgentRunV1;
  readonly index: number;
  readonly signal: AbortSignal;
}): Promise<Uint8Array> {
  const path = qualificationCorpusPathV1(input.index);
  return await input.run.executeReadCall({
    toolCallId: `qualification.corpus.read.${input.index + 1}`,
    signal: input.signal,
    invoke: async (signal) => {
      const info = await input.run.env.fileInfo(path, signal);
      if (!info.ok) throw info.error;
      if (info.value.kind !== "file" || info.value.size !== qualificationCorpusFileBytesV1) {
        throw new QualificationFailureV1(
          "execution_failed",
          "Qualification corpus metadata did not match",
        );
      }
      const result = await input.run.env.readBinaryFile(path, signal);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}

function assertMutationV1(input: {
  readonly record: WorkspaceMutationRecordV1 | undefined;
  readonly toolCallId: string;
  readonly expectedGeneration: number;
}): void {
  const record = input.record;
  if (
    record === undefined || record.toolCallId !== input.toolCallId || record.tool !== "write" ||
    record.outcome !== "succeeded" || record.effect !== "changed" ||
    record.resultingGeneration !== input.expectedGeneration
  ) {
    throw new QualificationFailureV1(
      "execution_failed",
      "Qualification write did not emit the expected mutation receipt",
    );
  }
}

async function acknowledgeIfNeededV1(input: {
  readonly client: BrowserWorkspaceEnvironmentClientV1;
  readonly tracker: QualificationIoTrackerV1;
  readonly force: boolean;
}): Promise<void> {
  const records = input.client.queryMutationRecords();
  input.tracker.observeReceiptQueue(records.length);
  if (
    records.length === 0 ||
    (!input.force && records.length < qualificationReceiptAcknowledgementBatchV1)
  ) {
    return;
  }
  const throughSequence = records.at(-1)?.sequence;
  if (throughSequence === undefined) {
    throw new QualificationFailureV1(
      "execution_failed",
      "Qualification receipt acknowledgement lost its sequence",
    );
  }
  await input.client.acknowledgeMutationRecords(throughSequence);
  if (input.client.queryMutationRecords().length !== 0) {
    throw new QualificationFailureV1(
      "execution_failed",
      "Qualification receipt acknowledgement did not clear the queue",
    );
  }
}

async function settleRunFailureV1(run: WorkspaceAgentRunV1 | null): Promise<void> {
  if (run === null) return;
  await Promise.race([
    run.abortAndDrain().catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, qualificationCleanupTimeoutMillisecondsV1)),
  ]);
}

async function executeQualificationV1(input: {
  readonly request: QualificationRequestV1;
  readonly port: MessagePort;
}): Promise<QualificationSuccessResponseV1> {
  const tracker = new QualificationIoTrackerV1();
  const observedPort = new ObservedEnvironmentPortV1(input.port, tracker);
  const client = createBrowserWorkspaceEnvironmentClientV1({
    port: observedPort,
    descriptor: input.request.descriptor,
  });
  const timeoutController = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
    client.dispose();
  }, qualificationTimeoutMillisecondsV1);
  let run: WorkspaceAgentRunV1 | null = null;
  let runSettled = false;
  try {
    const begun = await client.beginAgentRun({
      binding: {
        revision: 1,
        programId: input.request.descriptor.programId,
        workspaceId: input.request.descriptor.workspaceId,
        workspaceSessionId: input.request.descriptor.workspaceSessionId,
        expectedGeneration: input.request.descriptor.generation,
      },
      piSessionId: `qualification.${input.request.mode}.session.${input.request.requestId}`,
      piRunId: `qualification.${input.request.mode}.run.${input.request.requestId}`,
    });
    if (begun.kind !== "started") {
      throw new QualificationFailureV1("run_rejected", "Workspace qualification run rejected");
    }
    run = begun.run;
    const initialGeneration = run.getGenerationCursor();
    if (initialGeneration !== input.request.descriptor.generation) {
      throw new QualificationFailureV1(
        "execution_failed",
        "Workspace qualification began at an unexpected generation",
      );
    }

    await runNativePiTextProbeV1({
      mode: input.request.mode,
      run,
      signal: timeoutController.signal,
    });
    if (input.request.mode === "create") {
      assertMutationV1({
        record: client.queryMutationRecords().at(-1),
        toolCallId: "qualification.native-pi.write.1",
        expectedGeneration: qualificationCreateInitialGenerationV1 + 1,
      });
      await acknowledgeIfNeededV1({ client, tracker, force: false });
    } else if (run.getGenerationCursor() !== qualificationCreateFinalGenerationV1) {
      throw new QualificationFailureV1(
        "execution_failed",
        "Read-only native Pi probe changed the Workspace generation",
      );
    }

    const rollingHash = new RollingCorpusHashV1(tracker);
    for (let index = 0; index < qualificationCorpusFileCountV1; index += 1) {
      if (timeoutController.signal.aborted) {
        throw new QualificationFailureV1("timeout", "Workspace qualification timed out");
      }
      if (input.request.mode === "create") {
        const bytes = qualificationCorpusBytesV1(index);
        await writeCorpusFileV1({ run, index, bytes, signal: timeoutController.signal });
        const expectedGeneration = qualificationCreateInitialGenerationV1 + index + 2;
        assertMutationV1({
          record: client.queryMutationRecords().at(-1),
          toolCallId: `qualification.corpus.write.${index + 1}`,
          expectedGeneration,
        });
        if (run.getGenerationCursor() !== expectedGeneration) {
          throw new QualificationFailureV1(
            "execution_failed",
            "Qualification corpus write returned an unexpected generation",
          );
        }
        await acknowledgeIfNeededV1({ client, tracker, force: false });
      }

      const persisted = await readCorpusFileV1({
        run,
        index,
        signal: timeoutController.signal,
      });
      assertQualificationCorpusBytesV1(index, persisted);
      await rollingHash.addFile(index, persisted);
    }

    const finalGeneration = run.getGenerationCursor();
    if (
      finalGeneration !== qualificationCreateFinalGenerationV1 ||
      client.getDescriptor().generation !== qualificationCreateFinalGenerationV1
    ) {
      throw new QualificationFailureV1(
        "execution_failed",
        input.request.mode === "create"
          ? "Qualification create did not reach the exact predicted generation"
          : "Qualification verify changed the Workspace generation",
      );
    }
    await acknowledgeIfNeededV1({ client, tracker, force: true });
    if (client.queryMutationRecords().length !== 0) {
      throw new QualificationFailureV1(
        "execution_failed",
        "Qualification completed with retained Workspace receipts",
      );
    }

    const corpusHash = rollingHash.hex();
    const headHash = await anchorHeadHashV1({
      descriptor: input.request.descriptor,
      generation: finalGeneration,
      corpusHash,
    });
    run.finish();
    await observedPort.waitForEndRun();
    runSettled = true;

    return {
      revision: 1,
      kind: "workspace_sandbox_qualification_response",
      requestId: input.request.requestId,
      ok: true,
      response: {
        mode: input.request.mode,
        anchor: {
          programId: input.request.descriptor.programId,
          workspaceId: input.request.descriptor.workspaceId,
        },
        head: { generation: finalGeneration, hash: headHash },
        initialGeneration,
        fileCount: qualificationCorpusFileCountV1,
        totalBytes: qualificationCorpusTotalBytesV1,
        corpusHash,
        ioMaximums: tracker.snapshot(),
      },
    };
  } catch (error) {
    if (timedOut) {
      throw new QualificationFailureV1("timeout", "Workspace qualification timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    if (!runSettled) await settleRunFailureV1(run);
    client.dispose();
  }
}

export function failureResponseV1(
  requestId: number | null,
  error: unknown,
): QualificationFailureResponseV1 {
  return {
    revision: 1,
    kind: "workspace_sandbox_qualification_response",
    requestId,
    ok: false,
    code: error instanceof QualificationFailureV1 ? error.code : "execution_failed",
  };
}

function closePortsV1(ports: readonly MessagePort[]): void {
  for (const port of ports) port.close();
}

function currentQualificationWorkerScopeV1(): QualificationWorkerScopeV1 | null {
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

function installQualificationWorkerV1(scope: QualificationWorkerScopeV1): void {
  let received = false;
  const sendAndClose = (response: QualificationResponseV1): void => {
    scope.sendMessage(response);
    queueMicrotask(() => scope.closeWorker());
  };
  scope.receiveMessage((event) => {
    if (received) {
      closePortsV1(event.ports);
      sendAndClose({
        revision: 1,
        kind: "workspace_sandbox_qualification_response",
        requestId: requestIdForFailureV1(event.data),
        ok: false,
        code: "invalid_request",
      });
      return;
    }
    received = true;
    const request = admitQualificationRequestV1(event.data);
    if (request === null) {
      closePortsV1(event.ports);
      sendAndClose({
        revision: 1,
        kind: "workspace_sandbox_qualification_response",
        requestId: requestIdForFailureV1(event.data),
        ok: false,
        code: "invalid_request",
      });
      return;
    }
    if (event.ports.length !== 1) {
      closePortsV1(event.ports);
      sendAndClose({
        revision: 1,
        kind: "workspace_sandbox_qualification_response",
        requestId: request.requestId,
        ok: false,
        code: "invalid_port",
      });
      return;
    }
    const port = event.ports[0];
    if (port === undefined) {
      sendAndClose({
        revision: 1,
        kind: "workspace_sandbox_qualification_response",
        requestId: request.requestId,
        ok: false,
        code: "invalid_port",
      });
      return;
    }
    void executeQualificationV1({ request, port }).then(
      (response) => sendAndClose(response),
      (error: unknown) => sendAndClose(failureResponseV1(request.requestId, error)),
    );
  });
}

export function containsPayloadV1(value: unknown, visited = new Set<object>()): boolean {
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return true;
  if (typeof Blob !== "undefined" && value instanceof Blob) return true;
  if (typeof value !== "object" || value === null || visited.has(value)) return false;
  visited.add(value);
  return Object.values(value).some((entry) => containsPayloadV1(entry, visited));
}

const workerScopeV1 = currentQualificationWorkerScopeV1();
if (workerScopeV1 !== null) installQualificationWorkerV1(workerScopeV1);
