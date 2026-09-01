// SPDX-License-Identifier: MIT

import type { BrowserProgramRuntimeProfileV1 } from "./browser-program-runtime-profile.ts";
import type { ProgramRuntimeProfileDescriptorV1 } from "../program-platform/package/program-runtime-profile-descriptor.ts";

export type BrowserProgramRuntimeProfileSourceV1 = readonly [
  descriptor: ProgramRuntimeProfileDescriptorV1,
  load: () => Promise<BrowserProgramRuntimeProfileV1>,
];

/**
 * Builds one fixed Host-profile registry. The generic Agent layer has no
 * knowledge of bundled Program IDs or source locations; application
 * composition selects the shipped profile implementations.
 */
export function createBrowserProgramRuntimeProfileLoaderV1(
  sources: readonly BrowserProgramRuntimeProfileSourceV1[],
): (runtimeProfile: string) => Promise<BrowserProgramRuntimeProfileV1 | null> {
  const loaders = new Map<
    string,
    {
      readonly descriptor: ProgramRuntimeProfileDescriptorV1;
      readonly load: () => Promise<BrowserProgramRuntimeProfileV1>;
    }
  >();
  for (const [descriptor, load] of sources) {
    const runtimeProfile = descriptor.runtimeProfile;
    if (runtimeProfile.length === 0 || loaders.has(runtimeProfile)) {
      throw new TypeError("invalid or duplicate Program runtime profile source");
    }
    loaders.set(runtimeProfile, { descriptor, load });
  }
  const loaded = new Map<string, BrowserProgramRuntimeProfileV1>();
  return async (runtimeProfile) => {
    const retained = loaded.get(runtimeProfile);
    if (retained !== undefined) return retained;
    const source = loaders.get(runtimeProfile);
    if (source === undefined) return null;
    const candidate = await source.load();
    if (
      candidate.runtimeProfile !== runtimeProfile ||
      candidate.packageDescriptor.runtimeProfile !== source.descriptor.runtimeProfile
    ) {
      throw new TypeError("Program runtime profile does not match its loader key");
    }
    loaded.set(runtimeProfile, candidate);
    return candidate;
  };
}
