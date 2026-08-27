// SPDX-License-Identifier: MIT
import type { AssetId } from "@sillymaker/base";
import type {
  DefaultGameRootSlotsV1,
  GameUiProjectorV1,
  RuntimePresentationPublicationV1,
} from "@sillymaker/ui";
import type { WebGameApplicationV1 } from "@sillymaker/web";

import type {
  ElectronicPetApplicationInstanceV1,
  ElectronicPetExtensionsV1,
} from "./core-definition.ts";
import { electronicPetCoreApplicationDefinitionV1 } from "./core-definition.ts";
import type {
  ElectronicPetActionDescriptorV1,
  ElectronicPetActionResultV1,
  ElectronicPetInvocationV1,
  ElectronicPetPreviewV1,
} from "./semantic.ts";
import type {
  ElectronicPetGameViewV1,
  ElectronicPetQueriesV1,
  ElectronicPetSimulationTypesV1,
} from "../game/kernel.ts";
import { ElectronicPetSceneSurfaceV1 } from "../presentation/pet-scene-surface.tsx";
import { ElectronicPetCareHudV1 } from "../ui/pet-care-hud.tsx";

type ElectronicPetSemanticPublicationV1 = ReturnType<
  ElectronicPetApplicationInstanceV1["semantic"]["observe"]
>;
type ElectronicPetSemanticPortV1 = ElectronicPetApplicationInstanceV1["semantic"];

export type ElectronicPetPresentationViewV1 = ElectronicPetGameViewV1;

export type ElectronicPetUiPublicationV1 = RuntimePresentationPublicationV1<
  ElectronicPetSemanticPublicationV1,
  ElectronicPetPresentationViewV1,
  AssetId
>;

const projectorV1: GameUiProjectorV1<
  ElectronicPetSemanticPublicationV1,
  null,
  Record<never, never>,
  ElectronicPetPresentationViewV1,
  AssetId
> = {
  resolvedCatalog: null,
  initialUiState: {},
  project: (input) => ({
    view: input.semantic.game,
    requiredAssetIds: [],
  }),
};

function createSlotsV1(input: {
  dispatch(invocation: ElectronicPetInvocationV1): Promise<ElectronicPetActionResultV1>;
  reset(): Promise<void>;
}): DefaultGameRootSlotsV1<
  ElectronicPetUiPublicationV1,
  ElectronicPetSemanticPortV1,
  never
> {
  return {
    sceneInteraction: ({ publication }) => (
      <ElectronicPetSceneSurfaceV1
        context={{
          view: publication.view,
          async dispatchGesture(result) {
            const outcome = await (async () => {
              if (result.interactionKind === "grooming") {
                const { interactionKind: _, ...gesture } = result;
                return await input.dispatch({
                  kind: "pet.groom_complete",
                  ...gesture,
                });
              }
              if (result.interactionKind === "belly") {
                const { interactionKind: _, ...gesture } = result;
                return await input.dispatch({
                  kind: "pet.belly_complete",
                  ...gesture,
                });
              }
              if (result.interactionKind === "play") {
                const { interactionKind: _, ...play } = result;
                return await input.dispatch({ kind: "pet.play_complete", ...play });
              }
              const { interactionKind: _, ...gesture } = result;
              return await input.dispatch({
                kind: "pet.contact_complete",
                ...gesture,
              });
            })();
            if (outcome.kind === "committed" && outcome.game.lastOutcome !== null) {
              return outcome.game.lastOutcome;
            }
            if (outcome.kind === "faulted") {
              throw new TypeError(`pet.gesture_faulted:${outcome.code}`);
            }
            return null;
          },
          reportFailure(error) {
            console.error("electronic_pet.scene_failure", error);
          },
        }}
      />
    ),
    hud: ({ publication }) => (
      <ElectronicPetCareHudV1
        view={publication.view}
        dispatch={input.dispatch}
        reset={input.reset}
      />
    ),
  };
}

export const electronicPetGameApplicationV1: WebGameApplicationV1<
  unknown,
  unknown,
  ElectronicPetSimulationTypesV1,
  ElectronicPetQueriesV1,
  ElectronicPetGameViewV1,
  null,
  ElectronicPetActionDescriptorV1,
  ElectronicPetInvocationV1,
  ElectronicPetPreviewV1,
  ElectronicPetActionResultV1,
  null,
  Record<never, never>,
  ElectronicPetPresentationViewV1,
  AssetId,
  never
> = {
  applicationId: "example-electronic-pet",
  accessibleName: "电子宠物",
  viewport: {
    canvas: { width: 1280, height: 800 },
    mode: "fluid",
    fallbackSize: { width: 1280, height: 800 },
  },
  core: electronicPetCoreApplicationDefinitionV1,
  ui: ({ instance, clearAllSaves }) => {
    const extensions = instance.extensions as ElectronicPetExtensionsV1;
    const settleV1 = async (
      mode: "active" | "session_open",
      elapsedMs = 0,
    ): Promise<void> => {
      const result = await instance.semantic.dispatch({
        kind: "pet.time_settle",
        mode,
        observedAtMs: extensions.sampleWallTimeMs(),
        elapsedMs,
      });
      if (result.kind !== "committed") {
        throw new TypeError(`pet.time_settle_failed:${result.kind}`);
      }
    };
    let startupSettlement = settleV1("session_open");
    const dispatchV1 = async (
      invocation: ElectronicPetInvocationV1,
    ): Promise<ElectronicPetActionResultV1> => {
      await startupSettlement;
      return await instance.semantic.dispatch(invocation);
    };
    const resetV1 = async (): Promise<void> => {
      await startupSettlement.catch(() => undefined);
      await clearAllSaves();
      const restarted = await instance.lifecycle.restart();
      if (restarted.kind !== "anchored") {
        throw new TypeError("pet.reset_restart_rejected");
      }
      startupSettlement = settleV1("session_open");
      await startupSettlement;
    };
    return {
      projector: projectorV1,
      slots: createSlotsV1({ dispatch: dispatchV1, reset: resetV1 }),
      hideSystemMenu: true,
      timeReporting: {
        quantumMs: 60_000,
        enabledWhen: () => true,
        dispatch: async (elapsedMs) => {
          await startupSettlement;
          await settleV1("active", elapsedMs);
        },
      },
    };
  },
};
