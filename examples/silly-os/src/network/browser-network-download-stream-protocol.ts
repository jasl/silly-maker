// SPDX-License-Identifier: MIT

import { normalizeBrowserNetworkUrlV1 } from "./browser-network-url.ts";

export const browserNetworkDownloadStreamProtocolRevisionV1 = 1 as const;
export const browserNetworkDownloadChunkMaximumBytesV1 = 1 * 1_024 * 1_024;
export const browserNetworkDownloadTotalMaximumBytesV1 = 32 * 1_024 * 1_024;
export const browserNetworkDownloadContentTypeMaximumBytesV1 = 512;

const requestIdPatternV1 = /^[A-Za-z0-9][A-Za-z0-9._:+-]*$/u;

export interface BrowserNetworkDownloadRequestV1 {
  readonly revision: 1;
  readonly kind: "network_broker_download";
  readonly requestId: string;
  readonly url: string;
}

export interface BrowserNetworkDownloadSinkReadyV1 {
  readonly revision: 1;
  readonly kind: "network_broker_download_sink_ready";
  readonly requestId: string;
}

export interface BrowserNetworkDownloadChunkAckV1 {
  readonly revision: 1;
  readonly kind: "network_broker_download_chunk_ack";
  readonly requestId: string;
  readonly sequence: number;
}

export interface BrowserNetworkDownloadSinkAbortV1 {
  readonly revision: 1;
  readonly kind: "network_broker_download_sink_abort";
  readonly requestId: string;
  readonly code: "cancelled" | "sink_failed";
}

export type BrowserNetworkDownloadSinkMessageV1 =
  | BrowserNetworkDownloadSinkReadyV1
  | BrowserNetworkDownloadChunkAckV1
  | BrowserNetworkDownloadSinkAbortV1;

export interface BrowserNetworkDownloadResponseV1 {
  readonly revision: 1;
  readonly kind: "network_broker_download_response";
  readonly requestId: string;
  readonly status: number;
  readonly contentType: string | null;
  readonly declaredBytes: number | null;
}

export interface BrowserNetworkDownloadChunkV1 {
  readonly revision: 1;
  readonly kind: "network_broker_download_chunk";
  readonly requestId: string;
  readonly sequence: number;
  readonly offset: number;
  readonly bytes: number;
  readonly chunk: ArrayBuffer;
}

export interface BrowserNetworkDownloadCompleteV1 {
  readonly revision: 1;
  readonly kind: "network_broker_download_complete";
  readonly requestId: string;
  readonly bytes: number;
  readonly chunks: number;
}

export interface BrowserNetworkDownloadHttpErrorV1 {
  readonly revision: 1;
  readonly kind: "network_broker_download_http_error";
  readonly requestId: string;
  readonly status: number;
  readonly contentType: string | null;
  readonly declaredBytes: number | null;
}

export type BrowserNetworkDownloadFailureCodeV1 =
  | "network_failed"
  | "response_too_large"
  | "cancelled"
  | "deadline"
  | "sink_failed";

export interface BrowserNetworkDownloadFailedV1 {
  readonly revision: 1;
  readonly kind: "network_broker_download_failed";
  readonly requestId: string;
  readonly code: BrowserNetworkDownloadFailureCodeV1;
}

export type BrowserNetworkDownloadBrokerMessageV1 =
  | BrowserNetworkDownloadResponseV1
  | BrowserNetworkDownloadChunkV1
  | BrowserNetworkDownloadCompleteV1
  | BrowserNetworkDownloadHttpErrorV1
  | BrowserNetworkDownloadFailedV1;

export type BrowserNetworkDownloadTerminalV1 =
  | BrowserNetworkDownloadCompleteV1
  | BrowserNetworkDownloadHttpErrorV1
  | BrowserNetworkDownloadFailedV1;

function ownDataValueV1(record: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor !== undefined && Object.hasOwn(descriptor, "value")
    ? descriptor.value
    : undefined;
}

function exactRecordV1(
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  let ownKeys: readonly PropertyKey[];
  try {
    ownKeys = Reflect.ownKeys(value);
  } catch {
    return null;
  }
  if (
    ownKeys.some((key) => typeof key !== "string") || ownKeys.length !== keys.length ||
    keys.some((key) => !ownKeys.includes(key))
  ) return null;
  return value as Readonly<Record<string, unknown>>;
}

function commonRecordV1(
  value: unknown,
  kind:
    | BrowserNetworkDownloadRequestV1["kind"]
    | BrowserNetworkDownloadSinkMessageV1["kind"]
    | BrowserNetworkDownloadBrokerMessageV1["kind"],
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  const record = exactRecordV1(value, keys);
  if (
    record === null || ownDataValueV1(record, "revision") !== 1 ||
    ownDataValueV1(record, "kind") !== kind
  ) return null;
  const requestId = ownDataValueV1(record, "requestId");
  return typeof requestId === "string" && requestIdPatternV1.test(requestId) ? record : null;
}

function validContentTypeV1(value: unknown): value is string | null {
  return value === null ||
    (typeof value === "string" && !/[\r\n]/u.test(value) &&
      new TextEncoder().encode(value).byteLength <=
        browserNetworkDownloadContentTypeMaximumBytesV1);
}

function validDeclaredBytesV1(value: unknown): value is number | null {
  return value === null || (Number.isSafeInteger(value) && (value as number) >= 0);
}

function positiveSafeIntegerV1(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function nonNegativeSafeIntegerV1(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function admitBrowserNetworkDownloadRequestV1(
  value: unknown,
): BrowserNetworkDownloadRequestV1 | null {
  const record = commonRecordV1(value, "network_broker_download", [
    "revision",
    "kind",
    "requestId",
    "url",
  ]);
  if (record === null) return null;
  const url = ownDataValueV1(record, "url");
  return typeof url === "string" && normalizeBrowserNetworkUrlV1(url) === url
    ? record as unknown as BrowserNetworkDownloadRequestV1
    : null;
}

export function admitBrowserNetworkDownloadSinkReadyV1(
  value: unknown,
): BrowserNetworkDownloadSinkReadyV1 | null {
  return commonRecordV1(value, "network_broker_download_sink_ready", [
    "revision",
    "kind",
    "requestId",
  ]) as BrowserNetworkDownloadSinkReadyV1 | null;
}

export function admitBrowserNetworkDownloadChunkAckV1(
  value: unknown,
): BrowserNetworkDownloadChunkAckV1 | null {
  const record = commonRecordV1(value, "network_broker_download_chunk_ack", [
    "revision",
    "kind",
    "requestId",
    "sequence",
  ]);
  return record !== null && positiveSafeIntegerV1(ownDataValueV1(record, "sequence"))
    ? record as unknown as BrowserNetworkDownloadChunkAckV1
    : null;
}

export function admitBrowserNetworkDownloadSinkAbortV1(
  value: unknown,
): BrowserNetworkDownloadSinkAbortV1 | null {
  const record = commonRecordV1(value, "network_broker_download_sink_abort", [
    "revision",
    "kind",
    "requestId",
    "code",
  ]);
  if (record === null) return null;
  const code = ownDataValueV1(record, "code");
  return code === "cancelled" || code === "sink_failed"
    ? record as unknown as BrowserNetworkDownloadSinkAbortV1
    : null;
}

export function admitBrowserNetworkDownloadSinkMessageV1(
  value: unknown,
): BrowserNetworkDownloadSinkMessageV1 | null {
  return admitBrowserNetworkDownloadSinkReadyV1(value) ??
    admitBrowserNetworkDownloadChunkAckV1(value) ??
    admitBrowserNetworkDownloadSinkAbortV1(value);
}

export function admitBrowserNetworkDownloadResponseV1(
  value: unknown,
): BrowserNetworkDownloadResponseV1 | null {
  const record = commonRecordV1(value, "network_broker_download_response", [
    "revision",
    "kind",
    "requestId",
    "status",
    "contentType",
    "declaredBytes",
  ]);
  if (record === null) return null;
  const status = ownDataValueV1(record, "status");
  const contentType = ownDataValueV1(record, "contentType");
  const declaredBytes = ownDataValueV1(record, "declaredBytes");
  return Number.isInteger(status) && (status as number) >= 200 && (status as number) <= 299 &&
      validContentTypeV1(contentType) && validDeclaredBytesV1(declaredBytes) &&
      (declaredBytes === null || declaredBytes <= browserNetworkDownloadTotalMaximumBytesV1)
    ? record as unknown as BrowserNetworkDownloadResponseV1
    : null;
}

export function admitBrowserNetworkDownloadChunkV1(
  value: unknown,
): BrowserNetworkDownloadChunkV1 | null {
  const record = commonRecordV1(value, "network_broker_download_chunk", [
    "revision",
    "kind",
    "requestId",
    "sequence",
    "offset",
    "bytes",
    "chunk",
  ]);
  if (record === null) return null;
  const sequence = ownDataValueV1(record, "sequence");
  const offset = ownDataValueV1(record, "offset");
  const bytes = ownDataValueV1(record, "bytes");
  const chunk = ownDataValueV1(record, "chunk");
  return positiveSafeIntegerV1(sequence) && nonNegativeSafeIntegerV1(offset) &&
      positiveSafeIntegerV1(bytes) && bytes <= browserNetworkDownloadChunkMaximumBytesV1 &&
      chunk instanceof ArrayBuffer && chunk.byteLength === bytes &&
      offset + bytes <= browserNetworkDownloadTotalMaximumBytesV1
    ? record as unknown as BrowserNetworkDownloadChunkV1
    : null;
}

export function admitBrowserNetworkDownloadCompleteV1(
  value: unknown,
): BrowserNetworkDownloadCompleteV1 | null {
  const record = commonRecordV1(value, "network_broker_download_complete", [
    "revision",
    "kind",
    "requestId",
    "bytes",
    "chunks",
  ]);
  if (record === null) return null;
  const bytes = ownDataValueV1(record, "bytes");
  const chunks = ownDataValueV1(record, "chunks");
  return nonNegativeSafeIntegerV1(bytes) && bytes <= browserNetworkDownloadTotalMaximumBytesV1 &&
      nonNegativeSafeIntegerV1(chunks) && (bytes === 0 ? chunks === 0 : chunks > 0)
    ? record as unknown as BrowserNetworkDownloadCompleteV1
    : null;
}

export function admitBrowserNetworkDownloadHttpErrorV1(
  value: unknown,
): BrowserNetworkDownloadHttpErrorV1 | null {
  const record = commonRecordV1(value, "network_broker_download_http_error", [
    "revision",
    "kind",
    "requestId",
    "status",
    "contentType",
    "declaredBytes",
  ]);
  if (record === null) return null;
  const status = ownDataValueV1(record, "status");
  const contentType = ownDataValueV1(record, "contentType");
  const declaredBytes = ownDataValueV1(record, "declaredBytes");
  return Number.isInteger(status) && (status as number) >= 400 && (status as number) <= 599 &&
      validContentTypeV1(contentType) && validDeclaredBytesV1(declaredBytes)
    ? record as unknown as BrowserNetworkDownloadHttpErrorV1
    : null;
}

export function admitBrowserNetworkDownloadFailedV1(
  value: unknown,
): BrowserNetworkDownloadFailedV1 | null {
  const record = commonRecordV1(value, "network_broker_download_failed", [
    "revision",
    "kind",
    "requestId",
    "code",
  ]);
  if (record === null) return null;
  const code = ownDataValueV1(record, "code");
  return code === "network_failed" || code === "response_too_large" ||
      code === "cancelled" || code === "deadline" || code === "sink_failed"
    ? record as unknown as BrowserNetworkDownloadFailedV1
    : null;
}

export function admitBrowserNetworkDownloadBrokerMessageV1(
  value: unknown,
): BrowserNetworkDownloadBrokerMessageV1 | null {
  return admitBrowserNetworkDownloadResponseV1(value) ??
    admitBrowserNetworkDownloadChunkV1(value) ??
    admitBrowserNetworkDownloadCompleteV1(value) ??
    admitBrowserNetworkDownloadHttpErrorV1(value) ??
    admitBrowserNetworkDownloadFailedV1(value);
}

export function createBrowserNetworkDownloadRequestV1(
  requestId: string,
  url: string,
): BrowserNetworkDownloadRequestV1 {
  return Object.freeze({ revision: 1, kind: "network_broker_download", requestId, url });
}

export function createBrowserNetworkDownloadSinkReadyV1(
  requestId: string,
): BrowserNetworkDownloadSinkReadyV1 {
  return Object.freeze({
    revision: 1,
    kind: "network_broker_download_sink_ready",
    requestId,
  });
}

export function createBrowserNetworkDownloadChunkAckV1(
  requestId: string,
  sequence: number,
): BrowserNetworkDownloadChunkAckV1 {
  return Object.freeze({
    revision: 1,
    kind: "network_broker_download_chunk_ack",
    requestId,
    sequence,
  });
}

export function createBrowserNetworkDownloadSinkAbortV1(
  requestId: string,
  code: BrowserNetworkDownloadSinkAbortV1["code"],
): BrowserNetworkDownloadSinkAbortV1 {
  return Object.freeze({
    revision: 1,
    kind: "network_broker_download_sink_abort",
    requestId,
    code,
  });
}

export function createBrowserNetworkDownloadResponseV1(input: {
  readonly requestId: string;
  readonly status: number;
  readonly contentType: string | null;
  readonly declaredBytes: number | null;
}): BrowserNetworkDownloadResponseV1 {
  return Object.freeze({ revision: 1, kind: "network_broker_download_response", ...input });
}

export function createBrowserNetworkDownloadChunkV1(input: {
  readonly requestId: string;
  readonly sequence: number;
  readonly offset: number;
  readonly chunk: ArrayBuffer;
}): BrowserNetworkDownloadChunkV1 {
  return Object.freeze({
    revision: 1,
    kind: "network_broker_download_chunk",
    requestId: input.requestId,
    sequence: input.sequence,
    offset: input.offset,
    bytes: input.chunk.byteLength,
    chunk: input.chunk,
  });
}

export function createBrowserNetworkDownloadCompleteV1(input: {
  readonly requestId: string;
  readonly bytes: number;
  readonly chunks: number;
}): BrowserNetworkDownloadCompleteV1 {
  return Object.freeze({ revision: 1, kind: "network_broker_download_complete", ...input });
}

export function createBrowserNetworkDownloadHttpErrorV1(input: {
  readonly requestId: string;
  readonly status: number;
  readonly contentType: string | null;
  readonly declaredBytes: number | null;
}): BrowserNetworkDownloadHttpErrorV1 {
  return Object.freeze({ revision: 1, kind: "network_broker_download_http_error", ...input });
}

export function createBrowserNetworkDownloadFailedV1(
  requestId: string,
  code: BrowserNetworkDownloadFailureCodeV1,
): BrowserNetworkDownloadFailedV1 {
  return Object.freeze({
    revision: 1,
    kind: "network_broker_download_failed",
    requestId,
    code,
  });
}
