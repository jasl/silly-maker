// SPDX-License-Identifier: MIT
// Dialogue slice · module: narrative state folded from cc.narrative_advanced.
// Occurrence-fence evaluation happens in the dialogue command handlers before
// the event is emitted.
import { catcafeNarrativeStateSchemaV1 } from "../../state.ts";
import { createInitialCatcafeNarrativeStateV1 } from "./script.ts";
import { commandSchemaV1, kit } from "../../kernel.ts";

export const narrativeModuleV1 = kit.defineStatefulModule({
  id: "catcafe.narrative",
  contractRevision: 1,
  state: {
    slot: "simulation.narrative",
    schema: catcafeNarrativeStateSchemaV1,
    initial: () => createInitialCatcafeNarrativeStateV1(),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "cc.narrative_advanced": (_state, event) => event.next,
  },
});
