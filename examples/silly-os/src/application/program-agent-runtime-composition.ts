// SPDX-License-Identifier: MIT

import { creatorProgramRuntimeProfileDescriptorV1 } from "../../programs/creator/runtime-profile/creator-runtime-profile-descriptor.ts";
import { translationProgramRuntimeProfileDescriptorV1 } from "../../programs/translation/runtime-profile/translation-runtime-profile-descriptor.ts";
import { createBrowserProgramExecutionLoaderV1 } from "../agent/browser-program-execution-loader.ts";
import { createBrowserProgramRuntimeProfileLoaderV1 } from "../agent/browser-program-runtime-profile-loader.ts";

/** Worker-owned cold composition of the fixed Host execution profiles. */
export const loadSillyOsProgramRuntimeProfileV1 = createBrowserProgramRuntimeProfileLoaderV1([
  [creatorProgramRuntimeProfileDescriptorV1, async () => {
    const module = await import(
      "../../programs/creator/runtime-profile/creator-runtime-profile.ts"
    );
    return module.creatorProgramRuntimeProfileImplementationV1;
  }],
  [translationProgramRuntimeProfileDescriptorV1, async () => {
    const module = await import(
      "../../programs/translation/runtime-profile/translation-runtime-profile.ts"
    );
    return module.translationProgramRuntimeProfileImplementationV1;
  }],
]);

/** Agent Worker selection of current Program storage plus fixed Host profiles. */
export function createSillyOsProgramExecutionLoaderV1() {
  return createBrowserProgramExecutionLoaderV1({
    loadRuntimeProfile: loadSillyOsProgramRuntimeProfileV1,
  });
}
