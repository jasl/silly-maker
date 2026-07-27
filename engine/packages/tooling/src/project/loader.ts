// SPDX-License-Identifier: MIT
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { ProjectModuleLoaderV1 } from "./commands.ts";

/**
 * Loads repository modules through dynamic import. Callers running under
 * plain Node with type stripping must register their own `.js` to `.ts`
 * resolution hooks before loading TypeScript sources; Vitest and bundlers
 * resolve them natively.
 */
export function createImportProjectModuleLoaderV1(repositoryRoot: string): ProjectModuleLoaderV1 {
  return Object.freeze({
    loadModule: async (repositoryRelativePath: string) => {
      const url = pathToFileURL(join(repositoryRoot, repositoryRelativePath)).href;
      return (await import(url)) as Record<string, unknown>;
    },
  });
}
