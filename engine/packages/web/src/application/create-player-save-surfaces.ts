// SPDX-License-Identifier: MIT
import type { HostFilePortV1 } from "@sillymaker/base";
import type {
  SaveOverlayLabelsV1,
  SaveOverlayPortV1,
  SystemDialogCustomSavesV1,
} from "@sillymaker/ui";

import {
  createPlayerSaveUiPortV1,
  type PlayerUiPersistenceSourceV1,
} from "./create-player-ui-ports.ts";

interface PlayerSaveGuardV1 {
  readonly allowed: boolean;
  readonly reasonText?: string;
}

interface PlayerSaveUiV1 {
  readonly port: SaveOverlayPortV1;
  readonly labels: SaveOverlayLabelsV1;
  evaluateGuard?(publication: unknown): PlayerSaveGuardV1;
}

export interface PlayerSaveSurfacesV1 {
  /** Always available to the capability-gated built-in DevDock panel. */
  readonly maintenanceSavePort: SaveOverlayPortV1;
  /** Present only when the Story opts into the default player Save dialog. */
  readonly saveUi?: PlayerSaveUiV1;
  /** Declarative Story renderer hosted by the existing System saves authority. */
  readonly customSaves?: SystemDialogCustomSavesV1;
}

/**
 * Creates one player-safe persistence adapter and projects it into the
 * optional default Save UI plus the always-wired DevDock maintenance path.
 */
export function createPlayerSaveSurfacesV1(input: {
  readonly files: HostFilePortV1;
  readonly persistence: PlayerUiPersistenceSourceV1;
  readonly saveLabels?: SaveOverlayLabelsV1;
  readonly saveGuard?: (publication: unknown) => PlayerSaveGuardV1;
  readonly customSaves?: SystemDialogCustomSavesV1;
}): PlayerSaveSurfacesV1 {
  if (
    input.customSaves !== undefined &&
    (input.saveLabels !== undefined || input.saveGuard !== undefined)
  ) {
    throw new TypeError("web.system_saves_ambiguous");
  }
  const maintenanceSavePort = createPlayerSaveUiPortV1({
    files: input.files,
    persistence: input.persistence,
  });
  if (input.customSaves !== undefined) {
    return Object.freeze({ maintenanceSavePort, customSaves: input.customSaves });
  }
  if (input.saveLabels === undefined) return Object.freeze({ maintenanceSavePort });
  return Object.freeze({
    maintenanceSavePort,
    saveUi: Object.freeze({
      port: maintenanceSavePort,
      labels: input.saveLabels,
      ...(input.saveGuard === undefined ? {} : { evaluateGuard: input.saveGuard }),
    }),
  });
}
