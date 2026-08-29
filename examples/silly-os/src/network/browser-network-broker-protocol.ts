// SPDX-License-Identifier: MIT

import { normalizeBrowserNetworkUrlV1 } from "./browser-network-url.ts";

export const browserNetworkBrokerProtocolRevisionV1 = 1 as const;
export const browserNetworkBrokerResponseMaximumBytesV1 = 256 * 1_024;
export const browserNetworkBrokerContentTypeMaximumBytesV1 = 512;

const requestIdPatternV1 = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,127}$/u;

export interface BrowserNetworkBrokerFetchUrlRequestV1 {
  readonly revision: 1;
  readonly kind: "network_broker_fetch_url";
  readonly requestId: string;
  readonly url: string;
}

export interface BrowserNetworkBrokerCancelV1 {
  readonly revision: 1;
  readonly kind: "network_broker_cancel";
  readonly requestId: string;
}

export interface BrowserNetworkBrokerFetchUrlResultV1 {
  readonly revision: 1;
  readonly kind: "network_broker_fetch_url_result";
  readonly requestId: string;
  readonly status: number;
  readonly contentType: string | null;
  readonly bytes: number;
  readonly text: string;
}

export type BrowserNetworkBrokerFailureCodeV1 =
  | "network_failed"
  | "unsupported_content_type"
  | "response_too_large"
  | "cancelled";

export interface BrowserNetworkBrokerFetchUrlFailedV1 {
  readonly revision: 1;
  readonly kind: "network_broker_fetch_url_failed";
  readonly requestId: string;
  readonly code: BrowserNetworkBrokerFailureCodeV1;
}

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

function validRequestIdV1(value: unknown): value is string {
  return typeof value === "string" && requestIdPatternV1.test(value);
}

function commonRecordV1(
  value: unknown,
  kind:
    | BrowserNetworkBrokerFetchUrlRequestV1["kind"]
    | BrowserNetworkBrokerCancelV1["kind"]
    | BrowserNetworkBrokerFetchUrlResultV1["kind"]
    | BrowserNetworkBrokerFetchUrlFailedV1["kind"],
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  const record = exactRecordV1(value, keys);
  if (
    record === null || ownDataValueV1(record, "revision") !== 1 ||
    ownDataValueV1(record, "kind") !== kind ||
    !validRequestIdV1(ownDataValueV1(record, "requestId"))
  ) return null;
  return record;
}

export function admitBrowserNetworkBrokerFetchUrlRequestV1(
  value: unknown,
): BrowserNetworkBrokerFetchUrlRequestV1 | null {
  const record = commonRecordV1(value, "network_broker_fetch_url", [
    "revision",
    "kind",
    "requestId",
    "url",
  ]);
  if (record === null) return null;
  const url = ownDataValueV1(record, "url");
  return typeof url === "string" && normalizeBrowserNetworkUrlV1(url) === url
    ? record as unknown as BrowserNetworkBrokerFetchUrlRequestV1
    : null;
}

export function admitBrowserNetworkBrokerCancelV1(
  value: unknown,
): BrowserNetworkBrokerCancelV1 | null {
  return commonRecordV1(value, "network_broker_cancel", [
    "revision",
    "kind",
    "requestId",
  ]) as BrowserNetworkBrokerCancelV1 | null;
}

function validContentTypeV1(value: unknown): value is string | null {
  return value === null ||
    (typeof value === "string" && !/[\r\n]/u.test(value) &&
      new TextEncoder().encode(value).byteLength <= browserNetworkBrokerContentTypeMaximumBytesV1);
}

export function admitBrowserNetworkBrokerFetchUrlResultV1(
  value: unknown,
): BrowserNetworkBrokerFetchUrlResultV1 | null {
  const record = commonRecordV1(value, "network_broker_fetch_url_result", [
    "revision",
    "kind",
    "requestId",
    "status",
    "contentType",
    "bytes",
    "text",
  ]);
  if (record === null) return null;
  const status = ownDataValueV1(record, "status");
  const contentType = ownDataValueV1(record, "contentType");
  const bytes = ownDataValueV1(record, "bytes");
  const text = ownDataValueV1(record, "text");
  return Number.isInteger(status) && (status as number) >= 100 && (status as number) <= 599 &&
      validContentTypeV1(contentType) && Number.isSafeInteger(bytes) && (bytes as number) >= 0 &&
      (bytes as number) <= browserNetworkBrokerResponseMaximumBytesV1 &&
      typeof text === "string" &&
      new TextEncoder().encode(text).byteLength <= browserNetworkBrokerResponseMaximumBytesV1
    ? record as unknown as BrowserNetworkBrokerFetchUrlResultV1
    : null;
}

export function admitBrowserNetworkBrokerFetchUrlFailedV1(
  value: unknown,
): BrowserNetworkBrokerFetchUrlFailedV1 | null {
  const record = commonRecordV1(value, "network_broker_fetch_url_failed", [
    "revision",
    "kind",
    "requestId",
    "code",
  ]);
  if (record === null) return null;
  const code = ownDataValueV1(record, "code");
  return code === "network_failed" || code === "unsupported_content_type" ||
      code === "response_too_large" || code === "cancelled"
    ? record as unknown as BrowserNetworkBrokerFetchUrlFailedV1
    : null;
}

export function createBrowserNetworkBrokerFetchUrlRequestV1(
  requestId: string,
  url: string,
): BrowserNetworkBrokerFetchUrlRequestV1 {
  return Object.freeze({
    revision: browserNetworkBrokerProtocolRevisionV1,
    kind: "network_broker_fetch_url",
    requestId,
    url,
  });
}

export function createBrowserNetworkBrokerCancelV1(
  requestId: string,
): BrowserNetworkBrokerCancelV1 {
  return Object.freeze({
    revision: browserNetworkBrokerProtocolRevisionV1,
    kind: "network_broker_cancel",
    requestId,
  });
}

export function createBrowserNetworkBrokerFetchUrlResultV1(input: {
  readonly requestId: string;
  readonly status: number;
  readonly contentType: string | null;
  readonly bytes: number;
  readonly text: string;
}): BrowserNetworkBrokerFetchUrlResultV1 {
  return Object.freeze({
    revision: browserNetworkBrokerProtocolRevisionV1,
    kind: "network_broker_fetch_url_result",
    ...input,
  });
}

export function createBrowserNetworkBrokerFetchUrlFailedV1(
  requestId: string,
  code: BrowserNetworkBrokerFailureCodeV1,
): BrowserNetworkBrokerFetchUrlFailedV1 {
  return Object.freeze({
    revision: browserNetworkBrokerProtocolRevisionV1,
    kind: "network_broker_fetch_url_failed",
    requestId,
    code,
  });
}
