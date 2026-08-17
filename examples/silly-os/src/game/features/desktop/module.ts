// SPDX-License-Identifier: MIT
// Desktop slice · module: wallpaper and other desktop preferences (saveable; window layout is UI-transient and not here).
import type { OsDesktopStateV1 } from "../../state.ts";
import { osDesktopStateSchemaV1, osWallpaperIdsV1 } from "../../state.ts";
import type { OsFactV1 } from "../../kernel.ts";
import { commandSchemaV1, kit, operationSchemaV1 } from "../../kernel.ts";

export type DesktopOperationV1 = {
  readonly kind: "set_wallpaper";
  readonly wallpaperId: string;
};

export const desktopModuleV1 = kit.defineStatefulModule({
  id: "os.desktop",
  contractRevision: 1,
  state: {
    slot: "simulation.desktop",
    schema: osDesktopStateSchemaV1,
    initial: (): OsDesktopStateV1 => Object.freeze({ wallpaperId: "teal" }),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<DesktopOperationV1>("desktop"),
    propose(_state, operation) {
      if (!osWallpaperIdsV1.includes(operation.wallpaperId as never)) {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "os.desktop.unknown_wallpaper" as const }),
        });
      }
      const facts: readonly OsFactV1[] = Object.freeze([
        Object.freeze({
          kind: "os.desktop.wallpaper_changed" as const,
          wallpaperId: operation.wallpaperId,
        }),
      ]);
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({ payload: operation, facts }),
      });
    },
    apply: (_state, proposal) => Object.freeze({ wallpaperId: proposal.payload.wallpaperId }),
  },
});
