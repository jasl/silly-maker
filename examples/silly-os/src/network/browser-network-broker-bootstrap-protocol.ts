// SPDX-License-Identifier: MIT

export const browserNetworkBrokerBootstrapRevisionV1 = 1 as const;

const bootstrapIdentityPatternV1 = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,127}$/u;

export interface BrowserNetworkBrokerFrameReadyV1 {
  readonly revision: 1;
  readonly kind: "network_broker_frame_ready";
  readonly nonce: string;
  readonly buildIdentity: string;
}

export interface BrowserNetworkBrokerFrameBindV1 {
  readonly revision: 1;
  readonly kind: "network_broker_frame_bind";
  readonly nonce: string;
  readonly buildIdentity: string;
}

export interface BrowserNetworkBrokerWorkerBindV1 {
  readonly revision: 1;
  readonly kind: "network_broker_worker_bind";
  readonly nonce: string;
  readonly buildIdentity: string;
}

export interface BrowserNetworkBrokerWorkerBoundV1 {
  readonly revision: 1;
  readonly kind: "network_broker_worker_bound";
  readonly nonce: string;
  readonly buildIdentity: string;
}

export interface BrowserNetworkBrokerFrameFailedV1 {
  readonly revision: 1;
  readonly kind: "network_broker_frame_failed";
  readonly nonce: string;
  readonly buildIdentity: string;
  readonly code: "bootstrap_rejected" | "worker_unavailable";
}

type BootstrapKindV1 =
  | BrowserNetworkBrokerFrameReadyV1["kind"]
  | BrowserNetworkBrokerFrameBindV1["kind"]
  | BrowserNetworkBrokerWorkerBindV1["kind"]
  | BrowserNetworkBrokerWorkerBoundV1["kind"]
  | BrowserNetworkBrokerFrameFailedV1["kind"];

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
  kind: BootstrapKindV1,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  const record = exactRecordV1(value, keys);
  if (
    record === null || ownDataValueV1(record, "revision") !== 1 ||
    ownDataValueV1(record, "kind") !== kind
  ) return null;
  const nonce = ownDataValueV1(record, "nonce");
  const buildIdentity = ownDataValueV1(record, "buildIdentity");
  return typeof nonce === "string" && bootstrapIdentityPatternV1.test(nonce) &&
      typeof buildIdentity === "string" && bootstrapIdentityPatternV1.test(buildIdentity)
    ? record
    : null;
}

const commonKeysV1 = Object.freeze(["revision", "kind", "nonce", "buildIdentity"]);

export function admitBrowserNetworkBrokerFrameReadyV1(
  value: unknown,
): BrowserNetworkBrokerFrameReadyV1 | null {
  return commonRecordV1(value, "network_broker_frame_ready", commonKeysV1) as
    | BrowserNetworkBrokerFrameReadyV1
    | null;
}

export function admitBrowserNetworkBrokerFrameBindV1(
  value: unknown,
): BrowserNetworkBrokerFrameBindV1 | null {
  return commonRecordV1(value, "network_broker_frame_bind", commonKeysV1) as
    | BrowserNetworkBrokerFrameBindV1
    | null;
}

export function admitBrowserNetworkBrokerWorkerBindV1(
  value: unknown,
): BrowserNetworkBrokerWorkerBindV1 | null {
  return commonRecordV1(value, "network_broker_worker_bind", commonKeysV1) as
    | BrowserNetworkBrokerWorkerBindV1
    | null;
}

export function admitBrowserNetworkBrokerWorkerBoundV1(
  value: unknown,
): BrowserNetworkBrokerWorkerBoundV1 | null {
  return commonRecordV1(value, "network_broker_worker_bound", commonKeysV1) as
    | BrowserNetworkBrokerWorkerBoundV1
    | null;
}

export function admitBrowserNetworkBrokerFrameFailedV1(
  value: unknown,
): BrowserNetworkBrokerFrameFailedV1 | null {
  const record = commonRecordV1(value, "network_broker_frame_failed", [
    ...commonKeysV1,
    "code",
  ]);
  if (record === null) return null;
  const code = ownDataValueV1(record, "code");
  return code === "bootstrap_rejected" || code === "worker_unavailable"
    ? record as unknown as BrowserNetworkBrokerFrameFailedV1
    : null;
}

export function createBrowserNetworkBrokerFrameReadyV1(
  nonce: string,
  buildIdentity: string,
): BrowserNetworkBrokerFrameReadyV1 {
  return Object.freeze({
    revision: browserNetworkBrokerBootstrapRevisionV1,
    kind: "network_broker_frame_ready",
    nonce,
    buildIdentity,
  });
}

export function createBrowserNetworkBrokerFrameBindV1(
  nonce: string,
  buildIdentity: string,
): BrowserNetworkBrokerFrameBindV1 {
  return Object.freeze({
    revision: browserNetworkBrokerBootstrapRevisionV1,
    kind: "network_broker_frame_bind",
    nonce,
    buildIdentity,
  });
}

export function createBrowserNetworkBrokerWorkerBindV1(
  nonce: string,
  buildIdentity: string,
): BrowserNetworkBrokerWorkerBindV1 {
  return Object.freeze({
    revision: browserNetworkBrokerBootstrapRevisionV1,
    kind: "network_broker_worker_bind",
    nonce,
    buildIdentity,
  });
}

export function createBrowserNetworkBrokerWorkerBoundV1(
  nonce: string,
  buildIdentity: string,
): BrowserNetworkBrokerWorkerBoundV1 {
  return Object.freeze({
    revision: browserNetworkBrokerBootstrapRevisionV1,
    kind: "network_broker_worker_bound",
    nonce,
    buildIdentity,
  });
}

export function createBrowserNetworkBrokerFrameFailedV1(
  nonce: string,
  buildIdentity: string,
  code: BrowserNetworkBrokerFrameFailedV1["code"],
): BrowserNetworkBrokerFrameFailedV1 {
  return Object.freeze({
    revision: browserNetworkBrokerBootstrapRevisionV1,
    kind: "network_broker_frame_failed",
    nonce,
    buildIdentity,
    code,
  });
}
