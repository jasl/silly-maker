// SPDX-License-Identifier: MIT
import { parseCapabilityRequestV1 } from "@sillymaker/web";
import { createReferencePlayerOuterUiV1 } from "@sillymaker/web/reference";

import { vnReferenceTourGameApplicationV1 } from "../application/composition.tsx";

const productionUiV1 = vnReferenceTourGameApplicationV1.ui;

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
export const vnReferenceTourDevelopmentApplicationV1 = {
  ...vnReferenceTourGameApplicationV1,
  ui(input) {
    const ui = productionUiV1(input);
    return {
      ...ui,
      outerUi: createReferencePlayerOuterUiV1({
        instance: input.instance,
        capabilities: input.capabilities,
        playerProfile: input.playerProfile,
        presentationFreeze: input.presentationFreeze,
        presentationRate: input.presentationRate,
        includeSettingsSections: false,
        movableChip: true,
      }),
    };
  },
} satisfies typeof vnReferenceTourGameApplicationV1;
