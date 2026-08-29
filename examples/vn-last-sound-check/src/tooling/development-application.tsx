// SPDX-License-Identifier: MIT
import { parseCapabilityRequestV1 } from "@sillymaker/web";
import { createReferencePlayerOuterUiV1 } from "@sillymaker/web/reference";
import { createVnHistoryPresentationBridgeV1 } from "@sillymaker/vn/ui";
import { createDefaultVnPlayerCoreV1 } from "@sillymaker/vn/ui/core";

import {
  createVnLastSoundCheckGameApplicationV1,
  vnLastSoundCheckVnPlayerCoreLabelTextIdsV1,
  vnLastSoundCheckVnPlayerHistoryLabelTextIdsV1,
} from "../application/composition.tsx";

/** Add development capabilities without repairing a rejected external query. */
export function developmentCapabilitySearchV1(search: string): string {
  const parsed = parseCapabilityRequestV1(search);
  if (parsed.kind === "rejected") return search;

  const requested = new Set(parsed.requested);
  requested.add("debug_tools");
  requested.add("cheats");
  const result = new URLSearchParams();
  for (const capability of requested) result.append("capability", capability);
  return `?${result.toString()}`;
}

/** Development-only composition: product Settings stay put; full tooling is interaction-lazy. */
export const vnLastSoundCheckDevelopmentApplicationV1 = createVnLastSoundCheckGameApplicationV1(
  (input) => {
    const historyBridge = createVnHistoryPresentationBridgeV1();
    const player = createDefaultVnPlayerCoreV1({
      heldInput: input.heldInput,
      rollback: input.instance.rollback,
      labelTextIds: vnLastSoundCheckVnPlayerCoreLabelTextIdsV1,
      renderAuxiliaryPlaybackControl: historyBridge.renderOpenControl,
    });
    return {
      player: {
        ...player,
        history: historyBridge.feature,
      },
      outerUi: createReferencePlayerOuterUiV1({
        instance: input.instance,
        capabilities: input.capabilities,
        playerProfile: input.playerProfile,
        presentationFreeze: input.presentationFreeze,
        presentationRate: input.presentationRate,
        loadContributions: () =>
          import("./history-mod-development.tsx").then((module) =>
            module.loadVnLastSoundCheckHistoryModDevelopmentV1({
              applicationGeneration: "vn-last-sound-check.development",
              bridge: historyBridge,
              labelTextIds: vnLastSoundCheckVnPlayerHistoryLabelTextIdsV1,
              reportFailure: input.reportFailure,
            })
          ),
        includeSettingsSections: false,
        movableChip: true,
      }),
      dispose: () => historyBridge.dispose(),
    };
  },
);
