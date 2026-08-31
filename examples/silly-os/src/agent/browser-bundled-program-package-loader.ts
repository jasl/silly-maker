// SPDX-License-Identifier: MIT

import { creatorProgramHarnessReferenceV1 } from "./browser-pi-agent-dispatch.ts";
import { translationProgramHarnessReferenceV1 } from "../product/translation/translation-program-definition.ts";
import type { BrowserBundledProgramPackageV1 } from "./browser-bundled-program-package.ts";

const selectedPackageLoadersV1 = new Map<
  string,
  () => Promise<BrowserBundledProgramPackageV1>
>([
  [creatorProgramHarnessReferenceV1, async () => {
    const module = await import("./bundled-program-packages/creator-current.ts");
    return module.creatorBundledProgramPackageV1;
  }],
  [translationProgramHarnessReferenceV1, async () => {
    const module = await import("./bundled-program-packages/translation-current.ts");
    return module.translationBundledProgramPackageV1;
  }],
]);

const loadedPackagesV1 = new Map<string, BrowserBundledProgramPackageV1>();

/** Resolve only an explicitly selected build-known bundled Program, without fallback. */
export async function loadBrowserBundledProgramPackageV1(
  reference: string,
): Promise<BrowserBundledProgramPackageV1 | null> {
  const loaded = loadedPackagesV1.get(reference);
  if (loaded !== undefined) return loaded;
  const load = selectedPackageLoadersV1.get(reference);
  if (load === undefined) return null;
  const candidate = await load();
  if (candidate.reference !== reference) {
    throw new TypeError("Bundled Program package reference does not match its loader key");
  }
  loadedPackagesV1.set(reference, candidate);
  return candidate;
}
