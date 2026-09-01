// SPDX-License-Identifier: MIT

import type {
  ActiveProgramRuntimeHandleV1,
  ProgramRuntimeControllerAdapterV1,
} from "../../../src/application/program-runtime-controller.ts";
import { createCreatorControllerV1 } from "../runtime/creator-controller.ts";
import { createCreatorProgramDataRepositoryV1 } from "../persistence/creator-program-data-repository.ts";
import { createBrowserCreatorProgramWorkspaceAuthorityV1 } from "../persistence/browser-creator-program-workspace-authority.ts";
import { creatorProgramRuntimeProfileV1 } from "./creator-runtime-profile-descriptor.ts";

export const creatorProgramRuntimeControllerAdapterV1: ProgramRuntimeControllerAdapterV1 = {
  runtimeProfile: creatorProgramRuntimeProfileV1,
  async create(input): Promise<ActiveProgramRuntimeHandleV1> {
    const repository = createCreatorProgramDataRepositoryV1(input.repository);
    const workspace = createBrowserCreatorProgramWorkspaceAuthorityV1({
      repository,
      authorityHost: input.workspace,
    });
    const controller = createCreatorControllerV1({
      repository,
      workspace,
      programPackage: input.programPackage.reference,
      onWorkspaceReleaseFailure: (error) => {
        input.reportFailure("silly_os.browser_workspace_temporary_close_failed", error);
      },
    });
    try {
      await controller.initialize();
      if (input.exactProcessId !== null) {
        const opened = await controller.openProcess(input.exactProcessId);
        if (opened.kind !== "completed" || !opened.value) {
          throw new Error(
            `sillyos.creator.${opened.kind === "failed" ? opened.code : "open_busy"}`,
          );
        }
      }
    } catch (error) {
      await controller.dispose();
      throw error;
    }
    return {
      programPackage: input.programPackage,
      controller,
      getSnapshot: controller.getSnapshot,
      subscribe: controller.subscribe,
      loadSurface: async () => {
        const module = await import("../ui/creator-program-surface.tsx");
        return { Surface: module.CreatorProgramSurfaceV1 };
      },
      close: controller.openHome,
      dispose: controller.dispose,
    };
  },
};
