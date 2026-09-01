// SPDX-License-Identifier: MIT

import type { ProgramRuntimeProfileDescriptorV1 } from "../../../src/program-platform/package/program-runtime-profile-descriptor.ts";

export const creatorProgramRuntimeProfileV1 = "agent.creator.v1" as const;

export const creatorProgramRuntimeProfileDescriptorV1 = {
  runtimeProfile: creatorProgramRuntimeProfileV1,
  capabilityIds: [
    "agent.text",
    "creator.catalog",
    "network.optional",
    "quickjs.sync",
    "workspace.read",
    "workspace.search",
    "workspace.write",
  ],
  requiredCapabilityIds: ["creator.catalog"],
  scriptRuntimes: ["quickjs"],
  initialUiSurfaceIds: [],
} as const satisfies ProgramRuntimeProfileDescriptorV1;
