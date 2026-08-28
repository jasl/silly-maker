// SPDX-License-Identifier: MIT

import { validBrowserWorkspaceDownloadFileNameV1 } from "./browser-workspace-host-protocol.ts";

const identifierPatternV1 = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export interface BrowserWorkspaceSandboxDownloadRequestV1 {
  readonly revision: 1;
  readonly kind: "workspace_sandbox_download_request";
  readonly requestId: string;
  readonly exportId: string;
  readonly downloadUrl: string;
  readonly fileName: string;
}

export type BrowserWorkspaceSandboxDownloadResponseV1 =
  | {
    readonly revision: 1;
    readonly kind: "workspace_sandbox_download_started";
    readonly requestId: string;
    readonly exportId: string;
  }
  | {
    readonly revision: 1;
    readonly kind: "workspace_sandbox_download_failed";
    readonly requestId: string;
    readonly exportId: string;
    readonly code: "invalid_request" | "download_unavailable";
  };

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
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !Object.hasOwn(descriptor, "value")) return null;
  }
  return value as Readonly<Record<string, unknown>>;
}

export function admitBrowserWorkspaceSandboxDownloadRequestV1(
  value: unknown,
): BrowserWorkspaceSandboxDownloadRequestV1 | null {
  const record = exactRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "exportId",
    "downloadUrl",
    "fileName",
  ]);
  if (
    record === null || record.revision !== 1 ||
    record.kind !== "workspace_sandbox_download_request" ||
    typeof record.requestId !== "string" || !identifierPatternV1.test(record.requestId) ||
    typeof record.exportId !== "string" || !identifierPatternV1.test(record.exportId) ||
    typeof record.downloadUrl !== "string" || record.downloadUrl.length > 4_096 ||
    !record.downloadUrl.startsWith("blob:") ||
    !validBrowserWorkspaceDownloadFileNameV1(record.fileName)
  ) return null;
  return record as unknown as BrowserWorkspaceSandboxDownloadRequestV1;
}

export function admitBrowserWorkspaceSandboxDownloadResponseV1(
  value: unknown,
): BrowserWorkspaceSandboxDownloadResponseV1 | null {
  const started = exactRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "exportId",
  ]);
  if (
    started !== null && started.revision === 1 &&
    started.kind === "workspace_sandbox_download_started" &&
    typeof started.requestId === "string" && identifierPatternV1.test(started.requestId) &&
    typeof started.exportId === "string" && identifierPatternV1.test(started.exportId)
  ) return started as unknown as BrowserWorkspaceSandboxDownloadResponseV1;

  const failed = exactRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "exportId",
    "code",
  ]);
  if (
    failed === null || failed.revision !== 1 ||
    failed.kind !== "workspace_sandbox_download_failed" ||
    typeof failed.requestId !== "string" || !identifierPatternV1.test(failed.requestId) ||
    typeof failed.exportId !== "string" || !identifierPatternV1.test(failed.exportId) ||
    (failed.code !== "invalid_request" && failed.code !== "download_unavailable")
  ) return null;
  return failed as unknown as BrowserWorkspaceSandboxDownloadResponseV1;
}
