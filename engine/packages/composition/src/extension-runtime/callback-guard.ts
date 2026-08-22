// SPDX-License-Identifier: MIT
import type { ExtensionLifecycleCallbackGuardInternalV1 } from "./contracts.ts";

export function createExtensionLifecycleCallbackGuardInternalV1(): ExtensionLifecycleCallbackGuardInternalV1 {
  const activeOwners = new Map<string, number>();
  const release = (ownerId: string): void => {
    const remaining = (activeOwners.get(ownerId) ?? 1) - 1;
    if (remaining === 0) activeOwners.delete(ownerId);
    else activeOwners.set(ownerId, remaining);
  };
  return Object.freeze({
    isActive(ownerId: string): boolean {
      return (activeOwners.get(ownerId) ?? 0) > 0;
    },
    run<T>(ownerId: string, _phase: unknown, callback: () => T): T {
      activeOwners.set(ownerId, (activeOwners.get(ownerId) ?? 0) + 1);
      let result: T;
      try {
        result = callback();
      } catch (error) {
        release(ownerId);
        throw error;
      }
      try {
        if (
          result !== null && (typeof result === "object" || typeof result === "function") &&
          "then" in result && typeof result.then === "function"
        ) {
          return Promise.resolve(result).finally(() => release(ownerId)) as T;
        }
      } catch (error) {
        release(ownerId);
        throw error;
      }
      release(ownerId);
      return result;
    },
  });
}
