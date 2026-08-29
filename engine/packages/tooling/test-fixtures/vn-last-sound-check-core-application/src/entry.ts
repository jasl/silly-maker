// SPDX-License-Identifier: MIT
import { startWebGameApplicationV1 } from "@sillymaker/web";
import { createDefaultVnPlayerCoreV1 } from "@sillymaker/vn/ui";

import { createVnLastSoundCheckGameApplicationV1 } from "../../../../../../examples/vn-last-sound-check/src/application/composition.tsx";

const applicationV1 = createVnLastSoundCheckGameApplicationV1((input) => ({
  player: {
    ...createDefaultVnPlayerCoreV1({
      heldInput: input.heldInput,
      rollback: input.instance.rollback,
    }),
    history: null,
  },
}));
void startWebGameApplicationV1(applicationV1);
