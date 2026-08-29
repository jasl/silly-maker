// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import type { BrowserPiReasoningEffortV1 } from "../agent/browser-pi-worker-protocol.ts";

export const browserAgentPreferencesStorageKeyV1 =
  "sillymaker.example-silly-os.agent-preferences.v1";
export const browserAgentPreferencesRevisionV1 = 1 as const;
export const defaultBrowserAgentReasoningEffortV1 = "medium" as const;
export const browserAgentPreferencesMaximumSerializedUtf8BytesV1 = 512;

export interface BrowserAgentPreferencesSnapshotV1 {
  readonly revision: 1;
  readonly preferredReasoningEffort: BrowserPiReasoningEffortV1;
}

export type BrowserAgentPreferencesRepositoryOperationV1 = "read" | "set" | "clear";

export type BrowserAgentPreferencesRepositoryFailureCodeV1 =
  | "invalid_reasoning_effort"
  | "schema_invalid"
  | "storage_unavailable";

export class BrowserAgentPreferencesRepositoryErrorV1 extends Error {
  readonly code: BrowserAgentPreferencesRepositoryFailureCodeV1;
  readonly operation: BrowserAgentPreferencesRepositoryOperationV1;

  constructor(
    code: BrowserAgentPreferencesRepositoryFailureCodeV1,
    operation: BrowserAgentPreferencesRepositoryOperationV1,
  ) {
    super(`Browser Agent preferences repository ${operation} failed: ${code}`);
    this.name = "BrowserAgentPreferencesRepositoryErrorV1";
    this.code = code;
    this.operation = operation;
  }
}

export interface BrowserAgentPreferencesStorageV1 {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface BrowserAgentPreferencesRepositoryV1 {
  read(): BrowserAgentPreferencesSnapshotV1;
  setPreferredReasoningEffort(value: unknown): BrowserPiReasoningEffortV1;
  clear(): void;
}

const reasoningEffortsV1 = new Set<BrowserPiReasoningEffortV1>([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);

function isReasoningEffortV1(value: unknown): value is BrowserPiReasoningEffortV1 {
  return typeof value === "string" &&
    reasoningEffortsV1.has(value as BrowserPiReasoningEffortV1);
}

function defaultSnapshotV1(): BrowserAgentPreferencesSnapshotV1 {
  return Object.freeze({
    revision: browserAgentPreferencesRevisionV1,
    preferredReasoningEffort: defaultBrowserAgentReasoningEffortV1,
  });
}

function admitSnapshotV1(value: unknown): BrowserAgentPreferencesSnapshotV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors);
    if (
      keys.length !== 2 || !Object.hasOwn(descriptors, "revision") ||
      !Object.hasOwn(descriptors, "preferredReasoningEffort")
    ) return null;
    const revision = descriptors.revision;
    const preferredReasoningEffort = descriptors.preferredReasoningEffort;
    if (
      revision === undefined || !revision.enumerable || !Object.hasOwn(revision, "value") ||
      revision.value !== browserAgentPreferencesRevisionV1 ||
      preferredReasoningEffort === undefined || !preferredReasoningEffort.enumerable ||
      !Object.hasOwn(preferredReasoningEffort, "value") ||
      !isReasoningEffortV1(preferredReasoningEffort.value)
    ) return null;
    return Object.freeze({
      revision: browserAgentPreferencesRevisionV1,
      preferredReasoningEffort: preferredReasoningEffort.value,
    });
  } catch {
    return null;
  }
}

function parseStoredSnapshotV1(serialized: string): BrowserAgentPreferencesSnapshotV1 | null {
  if (
    new TextEncoder().encode(serialized).byteLength >
      browserAgentPreferencesMaximumSerializedUtf8BytesV1
  ) return null;
  try {
    return admitSnapshotV1(JSON.parse(serialized));
  } catch {
    return null;
  }
}

export function createBrowserAgentPreferencesRepositoryV1(options: {
  readonly storage: BrowserAgentPreferencesStorageV1;
  readonly storageKey?: string;
}): BrowserAgentPreferencesRepositoryV1 {
  const storageKey = options.storageKey ?? browserAgentPreferencesStorageKeyV1;

  const readV1 = (): BrowserAgentPreferencesSnapshotV1 => {
    let serialized: string | null;
    try {
      serialized = options.storage.getItem(storageKey);
    } catch {
      throw new BrowserAgentPreferencesRepositoryErrorV1("storage_unavailable", "read");
    }
    if (serialized === null) return defaultSnapshotV1();
    const snapshot = parseStoredSnapshotV1(serialized);
    if (snapshot === null) {
      throw new BrowserAgentPreferencesRepositoryErrorV1("schema_invalid", "read");
    }
    return snapshot;
  };

  return Object.freeze({
    read: readV1,
    setPreferredReasoningEffort(value: unknown): BrowserPiReasoningEffortV1 {
      if (!isReasoningEffortV1(value)) {
        throw new BrowserAgentPreferencesRepositoryErrorV1(
          "invalid_reasoning_effort",
          "set",
        );
      }
      const serialized = JSON.stringify({
        revision: browserAgentPreferencesRevisionV1,
        preferredReasoningEffort: value,
      });
      try {
        options.storage.setItem(storageKey, serialized);
      } catch {
        throw new BrowserAgentPreferencesRepositoryErrorV1("storage_unavailable", "set");
      }
      return value;
    },
    clear(): void {
      try {
        options.storage.removeItem(storageKey);
      } catch {
        throw new BrowserAgentPreferencesRepositoryErrorV1("storage_unavailable", "clear");
      }
    },
  });
}
