// SPDX-License-Identifier: MIT
import type { WebGuiApplicationV1 } from "@sillymaker/web/gui-application";
import { type ReactNode, useEffect, useSyncExternalStore } from "react";

import { createBrowserProgramDataRepositoryV1 } from "../application/persistence/browser-program-data-repository.ts";
import { SillyOsAppV1, type SillyOsAgentDrainRegistryV1 } from "../ui/silly-os-app.tsx";
import {
  createBrowserProgramPackageServiceV1,
  sillyOsProgramPackageZipDecodeOptionsV1,
} from "./program-composition.ts";
import {
  createBrowserProgramWorkspaceAuthorityV1,
  type BrowserProgramWorkspaceAuthorityHostV1,
} from "./workspace/browser-program-workspace-authority.ts";
import type { ProgramPackageServiceV1 } from "../program-platform/installation/program-package-service.ts";
import {
  createSillyOsProgramControllerOwnerV1,
  type SillyOsProgramControllerOwnerV1,
} from "./program-controller-owner.ts";
import { loadSillyOsProgramRuntimeControllerAdapterV1 } from "./program-runtime-composition.ts";

function SillyOsProductBootstrapV1({
  programControllers,
  workspaceAuthority,
  programPackages,
  agentDrainRegistry,
  reportFailure,
}: {
  readonly programControllers: SillyOsProgramControllerOwnerV1;
  readonly workspaceAuthority: BrowserProgramWorkspaceAuthorityHostV1;
  readonly programPackages: ProgramPackageServiceV1;
  readonly agentDrainRegistry: SillyOsAgentDrainRegistryV1;
  readonly reportFailure: (code: string, error: unknown) => void;
}): ReactNode {
  const runtime = useSyncExternalStore(
    programControllers.subscribe,
    programControllers.getSnapshot,
    programControllers.getSnapshot,
  );
  useEffect(() => {
    void programControllers.initialize().catch((error: unknown) => {
      reportFailure("silly_os.program_packages_initialize_failed", error);
    });
  }, [programControllers, reportFailure]);

  return (
    <SillyOsAppV1
      activeProgram={runtime.activeProgram}
      readOnlyConversationController={runtime.readOnlyConversation}
      workspaceAuthority={workspaceAuthority}
      programPackages={programPackages}
      programPackageZipDecodeOptions={sillyOsProgramPackageZipDecodeOptionsV1}
      onLaunchProgramPackage={programControllers.launch}
      listRecentProcesses={programControllers.listRecentProcesses}
      onOpenRecentProcess={programControllers.openRecentProcess}
      onOpenProgramLibrary={programControllers.openLibrary}
      onCloseReadOnlyProcess={programControllers.closeReadOnlyProcess}
      activeProgramRoute={runtime.activeRoute}
      agentDrainRegistry={agentDrainRegistry}
      reportFailure={reportFailure}
    />
  );
}

export interface SillyOsAgentDrainOwnerV1 {
  readonly registry: SillyOsAgentDrainRegistryV1;
  stopAndDrain(): Promise<void>;
}

export function createSillyOsAgentDrainOwnerV1(
  reportFailure: (code: string, error: unknown) => void,
): SillyOsAgentDrainOwnerV1 {
  let accepting = true;
  const drains = new Set<() => Promise<void>>();
  const settlements = new Set<Promise<void>>();
  let stopPromise: Promise<void> | null = null;

  const track = (drain: () => Promise<void>): Promise<void> => {
    const settlement = Promise.resolve().then(drain).catch((error: unknown) => {
      try {
        reportFailure("silly_os.agent_drain_failed", error);
      } catch {
        // Diagnostics cannot interrupt application-owned disposal ordering.
      }
    });
    settlements.add(settlement);
    void settlement.finally(() => settlements.delete(settlement));
    return settlement;
  };

  const registry: SillyOsAgentDrainRegistryV1 = {
    isAccepting: () => accepting,
    register(drain) {
      if (!accepting) {
        void track(drain);
        return () => {};
      }
      drains.add(drain);
      let registered = true;
      return () => {
        if (!registered) return;
        registered = false;
        if (drains.delete(drain)) void track(drain);
      };
    },
  };

  return {
    registry,
    stopAndDrain(): Promise<void> {
      if (stopPromise !== null) return stopPromise;
      accepting = false;
      const registered = [...drains];
      drains.clear();
      stopPromise = (async (): Promise<void> => {
        for (const drain of registered) void track(drain);
        while (settlements.size > 0) {
          await Promise.all([...settlements]);
        }
      })();
      return stopPromise;
    },
  };
}

export async function disposeSillyOsProductV1(input: {
  readonly agentDrainOwner: Pick<SillyOsAgentDrainOwnerV1, "stopAndDrain">;
  readonly controller: { dispose(): Promise<void> };
  readonly workspaceAuthority: { dispose(): Promise<void> };
  readonly reportFailure: (code: string, error: unknown) => void;
}): Promise<void> {
  for (
    const [code, dispose] of [
      ["silly_os.agent_drain_failed", () => input.agentDrainOwner.stopAndDrain()],
      ["silly_os.controller_dispose_failed", () => input.controller.dispose()],
      ["silly_os.workspace_authority_dispose_failed", () => input.workspaceAuthority.dispose()],
    ] as const
  ) {
    try {
      await dispose();
    } catch (error) {
      try {
        input.reportFailure(code, error);
      } catch {
        // Diagnostics cannot interrupt application-owned disposal ordering.
      }
    }
  }
}

/** Browser and Deno Desktop share the same GUI-only SillyOS product entry. */
export const sillyOsApplicationV1: WebGuiApplicationV1 = {
  applicationId: "example-silly-os",
  viewport: {
    canvas: { width: 1440, height: 900 },
    mode: "fluid",
    fallbackSize: { width: 1440, height: 900 },
  },
  ui: ({ reportFailure }) => {
    const repository = createBrowserProgramDataRepositoryV1();
    const workspaceAuthority = createBrowserProgramWorkspaceAuthorityV1({ repository });
    const programPackages = createBrowserProgramPackageServiceV1();
    const agentDrainOwner = createSillyOsAgentDrainOwnerV1(reportFailure);
    const programControllers = createSillyOsProgramControllerOwnerV1({
      repository,
      workspace: workspaceAuthority,
      packages: programPackages,
      loadRuntimeControllerAdapter: loadSillyOsProgramRuntimeControllerAdapterV1,
      reportFailure,
    });
    let disposalPromise: Promise<void> | null = null;
    const disposeProduct = (): Promise<void> => {
      disposalPromise ??= (async () => {
        await disposeSillyOsProductV1({
          agentDrainOwner,
          controller: programControllers,
          workspaceAuthority,
          reportFailure,
        });
        try {
          await programPackages.dispose();
        } catch (error) {
          reportFailure("silly_os.program_packages_dispose_failed", error);
        }
      })();
      return disposalPromise;
    };
    return {
      content: (
        <SillyOsProductBootstrapV1
          programControllers={programControllers}
          workspaceAuthority={workspaceAuthority}
          programPackages={programPackages}
          agentDrainRegistry={agentDrainOwner.registry}
          reportFailure={reportFailure}
        />
      ),
      dispose: () => disposeProduct(),
    };
  },
};
