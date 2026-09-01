// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import { isProgramPlatformIdentifierV1 } from "../../program-platform/identifier.ts";

export const browserDataResetStorageKeyV1 = "sillymaker.example-silly-os.data-reset.v1";

export interface BrowserDataResetIntentV1 {
  readonly revision: 1;
  readonly resetId: string;
  readonly requestedAt: number;
}

export interface BrowserDataResetStorageEventTargetV1 {
  addEventListener(type: "storage", listener: (event: StorageEvent) => void): void;
  removeEventListener(type: "storage", listener: (event: StorageEvent) => void): void;
}

export interface BrowserDataResetCoordinatorV1 {
  publish(): BrowserDataResetIntentV1;
  subscribe(listener: (intent: BrowserDataResetIntentV1) => void): () => void;
}

export interface BrowserDataResetCoordinatorOptionsV1 {
  readonly storage: Storage;
  readonly eventTarget: BrowserDataResetStorageEventTargetV1;
  readonly storageKey?: string;
  readonly createResetId?: () => string;
  readonly now?: () => number;
}

export interface BrowserDataResetRemoteSubscriptionOptionsV1 {
  readonly coordinator: BrowserDataResetCoordinatorV1;
  readonly isLocalResetPending: () => boolean;
  readonly isAccepting: () => boolean;
  readonly onRemoteReset: (intent: BrowserDataResetIntentV1) => void;
}

export interface BrowserDataResetOperationOptionsV1<
  ProgramWorkspaceDataResult,
  CredentialVaultResult,
  ProviderSettingsResult,
  ProgramPackagesResult,
> {
  readonly coordinator: BrowserDataResetCoordinatorV1 | null;
  readonly reportCoordinationFailure: (error: unknown) => void;
  readonly revokeLocalCapabilities: () => void;
  readonly awaitSettledOperations: () => Promise<void>;
  readonly resetProgramWorkspaceData: () => Promise<ProgramWorkspaceDataResult>;
  readonly resetCredentialVault: () => Promise<CredentialVaultResult>;
  readonly resetProviderSettings: () => Promise<ProviderSettingsResult>;
  readonly resetProgramPackages: () => Promise<ProgramPackagesResult>;
}

function defaultResetIdV1(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new TypeError("sillyos.data_reset.identity_unavailable");
  }
  return `reset.local.${crypto.randomUUID()}`;
}

function admittedResetIdV1(value: unknown): value is string {
  return isProgramPlatformIdentifierV1(value);
}

function admitBrowserDataResetIntentV1(value: unknown): BrowserDataResetIntentV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors);
    if (
      keys.length !== 3 ||
      !["revision", "resetId", "requestedAt"].every((key) =>
        Object.hasOwn(descriptors, key) && descriptors[key]?.enumerable === true &&
        Object.hasOwn(descriptors[key] ?? {}, "value")
      )
    ) return null;
    const revision = descriptors.revision?.value;
    const resetId = descriptors.resetId?.value;
    const requestedAt = descriptors.requestedAt?.value;
    if (
      revision !== 1 || !admittedResetIdV1(resetId) ||
      typeof requestedAt !== "number" || !Number.isSafeInteger(requestedAt) || requestedAt < 0
    ) return null;
    return { revision: 1, resetId, requestedAt };
  } catch {
    return null;
  }
}

function decodeIntentV1(serialized: string): BrowserDataResetIntentV1 | null {
  if (serialized.length > 512) return null;
  try {
    return admitBrowserDataResetIntentV1(JSON.parse(serialized));
  } catch {
    return null;
  }
}

/**
 * Same-control-origin reset invalidation only. Authoritative Program, Agent,
 * credential, and Workspace state never enters this localStorage record.
 */
export function createBrowserDataResetCoordinatorV1(
  options: BrowserDataResetCoordinatorOptionsV1,
): BrowserDataResetCoordinatorV1 {
  const storageKey = options.storageKey ?? browserDataResetStorageKeyV1;
  const createResetId = options.createResetId ?? defaultResetIdV1;
  const now = options.now ?? Date.now;
  const listeners = new Set<(intent: BrowserDataResetIntentV1) => void>();
  let listening = false;
  let lastDeliveredResetId: string | null = null;

  const onStorageV1 = (event: StorageEvent): void => {
    if (
      event.key !== storageKey || event.newValue === null ||
      (event.storageArea !== null && event.storageArea !== options.storage)
    ) return;
    const intent = decodeIntentV1(event.newValue);
    if (intent === null || intent.resetId === lastDeliveredResetId) return;
    lastDeliveredResetId = intent.resetId;
    for (const listener of [...listeners]) listener(intent);
  };

  return Object.freeze({
    publish(): BrowserDataResetIntentV1 {
      const resetId = createResetId();
      const requestedAt = now();
      if (!admittedResetIdV1(resetId) || !Number.isSafeInteger(requestedAt) || requestedAt < 0) {
        throw new TypeError("sillyos.data_reset.intent_invalid");
      }
      const intent = { revision: 1, resetId, requestedAt } as const;
      options.storage.setItem(storageKey, JSON.stringify(intent));
      return intent;
    },

    subscribe(listener: (intent: BrowserDataResetIntentV1) => void): () => void {
      listeners.add(listener);
      if (!listening) {
        listening = true;
        options.eventTarget.addEventListener("storage", onStorageV1);
      }
      return () => {
        listeners.delete(listener);
        if (listening && listeners.size === 0) {
          listening = false;
          options.eventTarget.removeEventListener("storage", onStorageV1);
        }
      };
    },
  });
}

/**
 * Binds the strict storage-event coordinator to the application lifecycle.
 * A valid remote reset can revoke this tab only once. A tab already performing
 * the same local reset ignores remote invalidations until its own outcome is
 * known, avoiding reload feedback while its authorities are settling.
 */
export function subscribeBrowserDataResetRemoteV1(
  options: BrowserDataResetRemoteSubscriptionOptionsV1,
): () => void {
  let handled = false;
  return options.coordinator.subscribe((intent) => {
    if (handled || options.isLocalResetPending() || !options.isAccepting()) return;
    handled = true;
    options.onRemoteReset(intent);
  });
}

/**
 * Announces the local reset before revoking capabilities or touching any
 * Product, Program-package, Credential Vault, Provider-settings, or Workspace
 * authority. A coordination failure is advisory and does not prevent the
 * requested local reset from continuing.
 */
export async function runBrowserDataResetOperationV1<
  ProgramWorkspaceDataResult,
  CredentialVaultResult,
  ProviderSettingsResult,
  ProgramPackagesResult,
>(
  options: BrowserDataResetOperationOptionsV1<
    ProgramWorkspaceDataResult,
    CredentialVaultResult,
    ProviderSettingsResult,
    ProgramPackagesResult
  >,
): Promise<
  readonly [
    PromiseSettledResult<ProgramWorkspaceDataResult>,
    PromiseSettledResult<CredentialVaultResult>,
    PromiseSettledResult<ProviderSettingsResult>,
    PromiseSettledResult<ProgramPackagesResult>,
  ]
> {
  if (options.coordinator !== null) {
    try {
      options.coordinator.publish();
    } catch (error) {
      options.reportCoordinationFailure(error);
    }
  }
  options.revokeLocalCapabilities();
  await options.awaitSettledOperations();
  return await Promise.allSettled([
    options.resetProgramWorkspaceData(),
    options.resetCredentialVault(),
    options.resetProviderSettings(),
    options.resetProgramPackages(),
  ]);
}
