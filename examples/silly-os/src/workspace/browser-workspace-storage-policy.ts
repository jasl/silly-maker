// SPDX-License-Identifier: MIT

export interface BrowserWorkspaceStorageEstimateValueV1 {
  readonly usage?: number;
  readonly quota?: number;
}

/** Explicit page-owned boundary. Workers must not manufacture this Window port. */
export interface BrowserWorkspaceWindowStoragePortV1 {
  readonly kind: "window";
  readonly estimate?: () => Promise<BrowserWorkspaceStorageEstimateValueV1>;
  readonly persisted?: () => Promise<boolean>;
  readonly persist?: () => Promise<boolean>;
}

export type BrowserWorkspaceStorageInspectionV1 =
  | {
    readonly kind: "available";
    readonly persisted: boolean;
    readonly usageBytes?: number;
    readonly quotaBytes?: number;
    readonly remainingBytes?: number;
  }
  | { readonly kind: "unavailable" };

export type BrowserWorkspaceStoragePersistenceResultV1 =
  | { readonly kind: "available"; readonly persisted: boolean }
  | { readonly kind: "unavailable" };

function optionalByteCountV1(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

/**
 * Creates the only persistence-request-capable adapter from an explicit Window.
 * Merely creating or inspecting this port never invokes `persist()`.
 */
export function createBrowserWorkspaceWindowStoragePortV1(
  windowObject: Pick<Window, "navigator">,
): BrowserWorkspaceWindowStoragePortV1 {
  const storage = (windowObject.navigator as unknown as {
    readonly storage?: Partial<StorageManager>;
  }).storage;
  if (storage === undefined) return Object.freeze({ kind: "window" });
  return Object.freeze({
    kind: "window",
    ...(typeof storage.estimate === "function" ? { estimate: () => storage.estimate!() } : {}),
    ...(typeof storage.persisted === "function" ? { persisted: () => storage.persisted!() } : {}),
    ...(typeof storage.persist === "function" ? { persist: () => storage.persist!() } : {}),
  });
}

/** Reads advisory origin state without requesting persistence. */
export async function inspectBrowserWorkspaceStorageV1(
  port: BrowserWorkspaceWindowStoragePortV1,
): Promise<BrowserWorkspaceStorageInspectionV1> {
  if (port.kind !== "window" || port.estimate === undefined || port.persisted === undefined) {
    return { kind: "unavailable" };
  }
  try {
    const [estimate, persisted] = await Promise.all([port.estimate(), port.persisted()]);
    if (
      estimate === null || typeof estimate !== "object" || Array.isArray(estimate) ||
      typeof persisted !== "boolean"
    ) return { kind: "unavailable" };
    const usageBytes = optionalByteCountV1(estimate.usage);
    const quotaBytes = optionalByteCountV1(estimate.quota);
    const remainingBytes = usageBytes === undefined || quotaBytes === undefined
      ? undefined
      : Math.max(0, quotaBytes - usageBytes);
    return {
      kind: "available",
      persisted,
      ...(usageBytes === undefined ? {} : { usageBytes }),
      ...(quotaBytes === undefined ? {} : { quotaBytes }),
      ...(remainingBytes === undefined ? {} : { remainingBytes }),
    };
  } catch {
    return { kind: "unavailable" };
  }
}

/** Explicit user-action path. A resolved `false` is a supported, denied outcome. */
export async function requestBrowserWorkspaceStoragePersistenceV1(
  port: BrowserWorkspaceWindowStoragePortV1,
): Promise<BrowserWorkspaceStoragePersistenceResultV1> {
  if (port.kind !== "window" || port.persist === undefined) return { kind: "unavailable" };
  try {
    const persisted = await port.persist();
    return typeof persisted === "boolean"
      ? { kind: "available", persisted }
      : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}
