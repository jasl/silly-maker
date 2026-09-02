// SPDX-License-Identifier: MIT

import type { InstalledProgramPackageReferenceV1 } from "../package/program-package-archive.ts";

/**
 * Opaque application-session UI state for one Program compatibility version.
 *
 * The Host scopes this store before handing it to a Program surface. A Program
 * can therefore release its rendered subtree while retaining Process-local
 * draft, selection, and scroll state, without reading another package's state
 * or turning presentation state into durable Process authority.
 */
export interface ProgramSurfaceSessionStateV1 {
  read(key: string): unknown;
  write(key: string, value: unknown): void;
  delete(key: string): void;
}

export interface ProgramSurfaceSessionStateOwnerV1 {
  forPackage(reference: InstalledProgramPackageReferenceV1): ProgramSurfaceSessionStateV1;
  clear(): void;
}

function programCompatibilityKeyV1(reference: InstalledProgramPackageReferenceV1): string {
  return `${reference.programId}\0${reference.packageVersion}`;
}

export function createProgramSurfaceSessionStateOwnerV1(): ProgramSurfaceSessionStateOwnerV1 {
  const packages = new Map<string, ProgramSurfaceSessionStateV1>();

  return {
    forPackage(reference) {
      const packageKey = programCompatibilityKeyV1(reference);
      let scope = packages.get(packageKey);
      if (scope === undefined) {
        const state = new Map<string, unknown>();
        scope = {
          read: (key) => state.get(key),
          write: (key, value) => state.set(key, value),
          delete: (key) => {
            state.delete(key);
          },
        };
        packages.set(packageKey, scope);
      }
      return scope;
    },
    clear() {
      packages.clear();
    },
  };
}
