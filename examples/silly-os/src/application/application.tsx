// SPDX-License-Identifier: MIT
import type { WebGuiApplicationV1 } from "@sillymaker/web/gui-application";

import { createBrowserProgramWorkspaceAuthorityV1 } from "../product/browser-program-workspace-authority.ts";
import { createBrowserProgramDataRepositoryV1 } from "../product/browser-program-data-repository.ts";
import { createCreatorControllerV1 } from "../product/creator-controller.ts";
import { SillyOsAppV1, type SillyOsAgentDrainRegistryV1 } from "../ui/silly-os-app.tsx";

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
    const controller = createCreatorControllerV1({
      repository,
      workspace: workspaceAuthority,
    });
    const agentDrainOwner = createSillyOsAgentDrainOwnerV1(reportFailure);
    let disposalPromise: Promise<void> | null = null;
    const disposeProduct = (): Promise<void> => {
      disposalPromise ??= disposeSillyOsProductV1({
        agentDrainOwner,
        controller,
        workspaceAuthority,
        reportFailure,
      });
      return disposalPromise;
    };
    return {
      content: (
        <SillyOsAppV1
          controller={controller}
          workspaceAuthority={workspaceAuthority}
          agentDrainRegistry={agentDrainOwner.registry}
          reportFailure={reportFailure}
        />
      ),
      dispose: () => disposeProduct(),
    };
  },
};
