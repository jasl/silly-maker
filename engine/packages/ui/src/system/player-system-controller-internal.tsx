// SPDX-License-Identifier: MIT
import { createContext, useContext } from "react";
import type { ReactElement, ReactNode } from "react";

import type { PersistenceOperationResultV1 } from "@sillymaker/base";
import type { SystemDialogOpenResultV1 } from "./system-dialog-managed-contract.ts";

/** @internal Engine-owned services consumed by focused Player presets. */
export interface PlayerSystemControllerInternalV1 {
  readonly savesAvailable: boolean;
  readonly quickSave:
    | (() => Promise<
      | PersistenceOperationResultV1
      | { readonly kind: "guarded"; readonly reasonText?: string }
    >)
    | null;
  readonly quickLoad: (() => Promise<PersistenceOperationResultV1>) | null;
  openSettings(): SystemDialogOpenResultV1;
  openSaves(): SystemDialogOpenResultV1;
  returnToTitle(): Promise<void>;
}

const PlayerSystemControllerContextInternalV1 = createContext<
  PlayerSystemControllerInternalV1 | null
>(null);

/** @internal The generic root provides services; presets continue to own their pixels. */
export function PlayerSystemControllerProviderInternalV1(props: {
  readonly controller: PlayerSystemControllerInternalV1;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <PlayerSystemControllerContextInternalV1.Provider value={props.controller}>
      {props.children}
    </PlayerSystemControllerContextInternalV1.Provider>
  );
}

/** @internal Custom hosts may omit the provider, so focused presets degrade cleanly. */
export function usePlayerSystemControllerInternalV1(): PlayerSystemControllerInternalV1 | null {
  return useContext(PlayerSystemControllerContextInternalV1);
}
