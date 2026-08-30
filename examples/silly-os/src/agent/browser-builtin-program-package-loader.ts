// SPDX-License-Identifier: MIT

import { creatorProgramHarnessReferenceV1 } from "./browser-pi-agent-dispatch.ts";
import { translationProgramHarnessReferenceV1 } from "../product/translation/translation-batch-protocol.ts";
import type { BrowserBuiltinProgramPackageV1 } from "./browser-builtin-program-package.ts";

const selectedPackageLoadersV1 = new Map<
  string,
  () => Promise<BrowserBuiltinProgramPackageV1>
>([
  [creatorProgramHarnessReferenceV1, async () => {
    const module = await import("./builtin-program-packages/creator-current.ts");
    return module.creatorBuiltinProgramPackageV1;
  }],
  [translationProgramHarnessReferenceV1, async () => {
    const module = await import("./builtin-program-packages/translation-current.ts");
    return module.translationBuiltinProgramPackageV1;
  }],
]);

const loadedPackagesV1 = new Map<string, BrowserBuiltinProgramPackageV1>();

/** Resolve only an explicitly selected build-known built-in Program, without fallback. */
export async function loadBrowserBuiltinProgramPackageV1(
  reference: string,
): Promise<BrowserBuiltinProgramPackageV1 | null> {
  const loaded = loadedPackagesV1.get(reference);
  if (loaded !== undefined) return loaded;
  const load = selectedPackageLoadersV1.get(reference);
  if (load === undefined) return null;
  const candidate = await load();
  if (candidate.reference !== reference) {
    throw new TypeError("Built-in Program package reference does not match its loader key");
  }
  loadedPackagesV1.set(reference, candidate);
  return candidate;
}
