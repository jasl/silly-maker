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

interface PlayerSaveMaintenanceV1 {
  readonly savePort: SaveOverlayPortV1;
  /** Runs Core's authoritative cleanup barrier. */
  clearAllSaves(): Promise<void>;
}

export interface PlayerSaveSurfacesV1 {
  /** Neutral maintenance port consumed only by an explicitly selected outer UI. */
  readonly maintenance: PlayerSaveMaintenanceV1;
  /** Present only when the Story opts into the default player Save dialog. */
  readonly saveUi?: PlayerSaveUiV1;
  /** Declarative Story component hosted by the managed System saves authority. */
  readonly customSaves?: SystemDialogCustomSavesV1;
}

/**
 * Creates one player-safe persistence adapter and projects it into the
 * optional default Save UI plus a neutral maintenance path for outer UI.
 */
export function createPlayerSaveSurfacesV1(input: {
  readonly files: HostFilePortV1;
  readonly persistence: PlayerUiPersistenceSourceV1;
  readonly clearAllSaves: () => Promise<void>;
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
  const maintenance: PlayerSaveMaintenanceV1 = {
    savePort: maintenanceSavePort,
    clearAllSaves: input.clearAllSaves,
  };
  if (input.customSaves !== undefined) {
    return ({ maintenance, customSaves: input.customSaves });
  }
  if (input.saveLabels === undefined) return ({ maintenance });
  return ({
    maintenance,
    saveUi: {
      port: maintenanceSavePort,
      labels: input.saveLabels,
      ...(input.saveGuard === undefined ? {} : { evaluateGuard: input.saveGuard }),
    },
  });
}
