// SPDX-License-Identifier: MIT
import { createElement } from "react";

import type { SceneInspectorContributionSetV1 } from "@sillymaker/studio";

import { VnLastSoundCheckNarrativeInspectorPanelV1 } from "./narrative-inspector-panel.tsx";

/** Product-specific, dev-only read model over the shared Inspector Host. */
export const vnLastSoundCheckSceneInspectorContributionsV1: SceneInspectorContributionSetV1 = {
  properties: [{
    id: "vn-last-sound-check.narrative-bindings",
    title: "叙事绑定",
    render(input) {
      return createElement(VnLastSoundCheckNarrativeInspectorPanelV1, { input });
    },
  }],
};
