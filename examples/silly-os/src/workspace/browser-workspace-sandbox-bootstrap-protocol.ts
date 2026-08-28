// SPDX-License-Identifier: MIT

export const browserWorkspaceSandboxBootstrapRevisionV1 = 1 as const;

const sandboxBootstrapIdentityPatternV1 = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,127}$/u;

export interface BrowserWorkspaceSandboxFrameReadyV1 {
  readonly revision: 1;
  readonly kind: "workspace_sandbox_frame_ready";
  readonly nonce: string;
  readonly buildIdentity: string;
}

export interface BrowserWorkspaceSandboxFrameBindV1 {
  readonly revision: 1;
  readonly kind: "workspace_sandbox_frame_bind";
  readonly nonce: string;
  readonly buildIdentity: string;
}

export interface BrowserWorkspaceSandboxWorkerBindV1 {
  readonly revision: 1;
  readonly kind: "workspace_sandbox_worker_bind";
  readonly nonce: string;
  readonly buildIdentity: string;
}

export interface BrowserWorkspaceSandboxWorkerBoundV1 {
  readonly revision: 1;
  readonly kind: "workspace_sandbox_worker_bound";
  readonly nonce: string;
  readonly buildIdentity: string;
}

export interface BrowserWorkspaceSandboxFrameFailedV1 {
  readonly revision: 1;
  readonly kind: "workspace_sandbox_frame_failed";
  readonly nonce: string;
  readonly buildIdentity: string;
  readonly code: "bootstrap_rejected" | "worker_unavailable";
}

type SandboxBootstrapRecordV1 =
  | BrowserWorkspaceSandboxFrameReadyV1
  | BrowserWorkspaceSandboxFrameBindV1
  | BrowserWorkspaceSandboxWorkerBindV1
  | BrowserWorkspaceSandboxWorkerBoundV1
  | BrowserWorkspaceSandboxFrameFailedV1;

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
  const actualKeys = ownKeys.filter((key): key is string => typeof key === "string");
  if (
    ownKeys.some((key) => typeof key !== "string") ||
    actualKeys.length !== keys.length || keys.some((key) => !actualKeys.includes(key))
  ) return null;
  return value as Readonly<Record<string, unknown>>;
}

function commonRecordV1(
  value: unknown,
  kind: SandboxBootstrapRecordV1["kind"],
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  const record = exactRecordV1(value, keys);
  if (
    record === null || ownDataValueV1(record, "revision") !== 1 ||
    ownDataValueV1(record, "kind") !== kind
  ) return null;
  const nonce = ownDataValueV1(record, "nonce");
  const buildIdentity = ownDataValueV1(record, "buildIdentity");
  return typeof nonce === "string" && sandboxBootstrapIdentityPatternV1.test(nonce) &&
      typeof buildIdentity === "string" && sandboxBootstrapIdentityPatternV1.test(buildIdentity)
    ? record
    : null;
}

const commonKeysV1 = Object.freeze(["revision", "kind", "nonce", "buildIdentity"]);

export function admitBrowserWorkspaceSandboxFrameReadyV1(
  value: unknown,
): BrowserWorkspaceSandboxFrameReadyV1 | null {
  return commonRecordV1(value, "workspace_sandbox_frame_ready", commonKeysV1) as
    | BrowserWorkspaceSandboxFrameReadyV1
    | null;
}

export function admitBrowserWorkspaceSandboxFrameBindV1(
  value: unknown,
): BrowserWorkspaceSandboxFrameBindV1 | null {
  return commonRecordV1(value, "workspace_sandbox_frame_bind", commonKeysV1) as
    | BrowserWorkspaceSandboxFrameBindV1
    | null;
}

export function admitBrowserWorkspaceSandboxWorkerBindV1(
  value: unknown,
): BrowserWorkspaceSandboxWorkerBindV1 | null {
  return commonRecordV1(value, "workspace_sandbox_worker_bind", commonKeysV1) as
    | BrowserWorkspaceSandboxWorkerBindV1
    | null;
}

export function admitBrowserWorkspaceSandboxWorkerBoundV1(
  value: unknown,
): BrowserWorkspaceSandboxWorkerBoundV1 | null {
  return commonRecordV1(value, "workspace_sandbox_worker_bound", commonKeysV1) as
    | BrowserWorkspaceSandboxWorkerBoundV1
    | null;
}

export function admitBrowserWorkspaceSandboxFrameFailedV1(
  value: unknown,
): BrowserWorkspaceSandboxFrameFailedV1 | null {
  const record = commonRecordV1(value, "workspace_sandbox_frame_failed", [
    ...commonKeysV1,
    "code",
  ]);
  if (record === null) return null;
  const code = ownDataValueV1(record, "code");
  return code === "bootstrap_rejected" || code === "worker_unavailable"
    ? record as unknown as BrowserWorkspaceSandboxFrameFailedV1
    : null;
}

export function createBrowserWorkspaceSandboxFrameReadyV1(
  nonce: string,
  buildIdentity: string,
): BrowserWorkspaceSandboxFrameReadyV1 {
  return Object.freeze({
    revision: browserWorkspaceSandboxBootstrapRevisionV1,
    kind: "workspace_sandbox_frame_ready",
    nonce,
    buildIdentity,
  });
}

export function createBrowserWorkspaceSandboxFrameBindV1(
  nonce: string,
  buildIdentity: string,
): BrowserWorkspaceSandboxFrameBindV1 {
  return Object.freeze({
    revision: browserWorkspaceSandboxBootstrapRevisionV1,
    kind: "workspace_sandbox_frame_bind",
    nonce,
    buildIdentity,
  });
}

export function createBrowserWorkspaceSandboxWorkerBindV1(
  nonce: string,
  buildIdentity: string,
): BrowserWorkspaceSandboxWorkerBindV1 {
  return Object.freeze({
    revision: browserWorkspaceSandboxBootstrapRevisionV1,
    kind: "workspace_sandbox_worker_bind",
    nonce,
    buildIdentity,
  });
}

export function createBrowserWorkspaceSandboxWorkerBoundV1(
  nonce: string,
  buildIdentity: string,
): BrowserWorkspaceSandboxWorkerBoundV1 {
  return Object.freeze({
    revision: browserWorkspaceSandboxBootstrapRevisionV1,
    kind: "workspace_sandbox_worker_bound",
    nonce,
    buildIdentity,
  });
}

export function createBrowserWorkspaceSandboxFrameFailedV1(
  nonce: string,
  buildIdentity: string,
  code: BrowserWorkspaceSandboxFrameFailedV1["code"],
): BrowserWorkspaceSandboxFrameFailedV1 {
  return Object.freeze({
    revision: browserWorkspaceSandboxBootstrapRevisionV1,
    kind: "workspace_sandbox_frame_failed",
    nonce,
    buildIdentity,
    code,
  });
}
