// SPDX-License-Identifier: MIT
import { createDefaultVnPlayerV1 } from "@sillymaker/vn/preset";

import {
  createVnLastSoundCheckGameApplicationV1,
  vnLastSoundCheckVnPlayerCoreLabelTextIdsV1,
  vnLastSoundCheckVnPlayerHistoryLabelTextIdsV1,
} from "./composition.tsx";

/** Production explicitly selects the official History presentation Mod. */
export const vnLastSoundCheckGameApplicationV1 = createVnLastSoundCheckGameApplicationV1(
  (input) => ({
    player: createDefaultVnPlayerV1({
      heldInput: input.heldInput,
      rollback: input.instance.rollback,
      labelTextIds: {
        ...vnLastSoundCheckVnPlayerCoreLabelTextIdsV1,
        ...vnLastSoundCheckVnPlayerHistoryLabelTextIdsV1,
      },
    }),
  }),
);
