// SPDX-License-Identifier: MIT

import type { ProgramRuntimeProfileDescriptorV1 } from "../../../src/program-platform/package/program-runtime-profile-descriptor.ts";

export const translationProgramRuntimeProfileV1 = "agent.translation.v1" as const;

export const translationProgramRuntimeProfileDescriptorV1 = {
  runtimeProfile: translationProgramRuntimeProfileV1,
  capabilityIds: [
    "agent.text",
    "translation.batch",
  ],
  scriptRuntimes: [],
  initialUiSurfaceIds: ["translation.intake.v1"],
} as const satisfies ProgramRuntimeProfileDescriptorV1;
