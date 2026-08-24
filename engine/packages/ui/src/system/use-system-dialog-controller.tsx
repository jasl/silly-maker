// SPDX-License-Identifier: MIT
import { createContext, useContext, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";

import type {
  SystemDialogOpenResultV1,
  SystemDialogSessionV1,
} from "./system-dialog-managed-contract.ts";

export interface SystemDialogControllerV1 {
  openSettings(): SystemDialogOpenResultV1;
  openSaves(): SystemDialogOpenResultV1;
}

const SystemDialogContextV1 = createContext<SystemDialogControllerV1 | null>(null);

/** @internal The required managed Host is the sole provider of these intents. */
export function SystemDialogControllerProviderInternalV1(props: {
  readonly session: SystemDialogSessionV1;
  readonly children: ReactNode;
}): ReactElement {
  const controller = useMemo<SystemDialogControllerV1>(
    () => ({
      openSettings: () => props.session.openSettings(),
      openSaves: () => props.session.openSaves(),
    }),
    [props.session],
  );
  return (
    <SystemDialogContextV1.Provider value={controller}>
      {props.children}
    </SystemDialogContextV1.Provider>
  );
}

export function useSystemDialogControllerV1(): SystemDialogControllerV1 {
  const controller = useContext(SystemDialogContextV1);
  if (controller === null) throw new Error("ui.system_dialog_host_missing");
  return controller;
}
