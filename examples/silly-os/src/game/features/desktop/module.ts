// SPDX-License-Identifier: MIT
// Desktop slice · module: wallpaper and other desktop preferences (saveable; window layout is UI-transient and not here).
import type { OsDesktopStateV1 } from "../../state.ts";
import { osDesktopStateSchemaV1 } from "../../state.ts";
import { commandSchemaV1, kit } from "../../kernel.ts";

export const desktopModuleV1 = kit.defineStatefulModule({
  id: "os.desktop",
  contractRevision: 1,
  state: {
    slot: "simulation.desktop",
    schema: osDesktopStateSchemaV1,
    initial: (): OsDesktopStateV1 => ({ wallpaperId: "teal" }),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "os.desktop.wallpaper_changed": (_state, event) => ({ wallpaperId: event.wallpaperId }),
  },
});
