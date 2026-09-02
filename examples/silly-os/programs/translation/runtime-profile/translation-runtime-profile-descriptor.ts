// SPDX-License-Identifier: MIT

import type { ProgramRuntimeProfileDescriptorV1 } from "../../../src/program-platform/package/program-runtime-profile-descriptor.ts";

export const translationProgramRuntimeProfileV1 = "agent.translation.v1" as const;

export const translationProgramRuntimeProfileDescriptorV1 = {
  runtimeProfile: translationProgramRuntimeProfileV1,
  capabilityIds: [
    "agent.text",
    "program.resource.read",
    "translation.batch",
    "workspace.read",
    "workspace.search",
    "workspace.write",
  ],
  requiredCapabilityIds: [
    "program.resource.read",
    "workspace.read",
    "workspace.search",
    "workspace.write",
  ],
  scriptRuntimes: [],
  initialUiSurfaceIds: ["translation.workspace.v1"],
} as const satisfies ProgramRuntimeProfileDescriptorV1;
