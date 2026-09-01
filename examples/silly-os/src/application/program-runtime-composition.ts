// SPDX-License-Identifier: MIT

import { creatorProgramRuntimeProfileDescriptorV1 } from "../../programs/creator/runtime-profile/creator-runtime-profile-descriptor.ts";
import { translationProgramRuntimeProfileDescriptorV1 } from "../../programs/translation/runtime-profile/translation-runtime-profile-descriptor.ts";
import type {
  LoadProgramRuntimeControllerAdapterV1,
  ProgramRuntimeControllerAdapterV1,
} from "./program-runtime-controller.ts";

const runtimeControllerAdapterLoadersV1 = new Map<
  string,
  () => Promise<ProgramRuntimeControllerAdapterV1>
>([
  [creatorProgramRuntimeProfileDescriptorV1.runtimeProfile, async () => {
    const module = await import(
      "../../programs/creator/runtime-profile/creator-controller-adapter.ts"
    );
    return module.creatorProgramRuntimeControllerAdapterV1;
  }],
  [translationProgramRuntimeProfileDescriptorV1.runtimeProfile, async () => {
    const module = await import(
      "../../programs/translation/runtime-profile/translation-controller-adapter.ts"
    );
    return module.translationProgramRuntimeControllerAdapterV1;
  }],
]);

/** Cold, build-known Host composition. Package origin never participates. */
export const loadSillyOsProgramRuntimeControllerAdapterV1: LoadProgramRuntimeControllerAdapterV1 =
  async (runtimeProfile) => {
    const load = runtimeControllerAdapterLoadersV1.get(runtimeProfile);
    return load === undefined ? null : await load();
  };
