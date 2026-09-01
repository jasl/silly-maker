// SPDX-License-Identifier: MIT

import type {
  ActiveProgramRuntimeHandleV1,
  ProgramRuntimeControllerAdapterV1,
} from "../../../src/application/program-runtime-controller.ts";
import { createTranslationProcessControllerV1 } from "../runtime/translation-process-controller.ts";
import { createTranslationProgramDataRepositoryV1 } from "../persistence/translation-program-data-repository.ts";
import { translationProgramRuntimeProfileV1 } from "./translation-runtime-profile-descriptor.ts";

export const translationProgramRuntimeControllerAdapterV1: ProgramRuntimeControllerAdapterV1 = {
  runtimeProfile: translationProgramRuntimeProfileV1,
  async create(input): Promise<ActiveProgramRuntimeHandleV1> {
    const controller = createTranslationProcessControllerV1({
      repository: createTranslationProgramDataRepositoryV1(input.repository),
      workspace: input.workspace,
      programPackage: input.programPackage,
    });
    try {
      await controller.initialize();
      const opened = input.exactProcessId === null
        ? await controller.createProcess()
        : await controller.openProcess(input.exactProcessId);
      if (opened.kind !== "completed" || !opened.value) {
        throw new Error(
          opened.kind === "failed"
            ? `sillyos.translation.${opened.code}`
            : "sillyos.translation.open_busy",
        );
      }
    } catch (error) {
      controller.dispose();
      throw error;
    }
    return {
      programPackage: input.programPackage,
      controller,
      getSnapshot: controller.getSnapshot,
      subscribe: controller.subscribe,
      loadSurface: async () => {
        const module = await import("../ui/translation-program-surface.tsx");
        return { Surface: module.TranslationProgramSurfaceV1 };
      },
      close: controller.openHome,
      dispose: controller.dispose,
    };
  },
};
