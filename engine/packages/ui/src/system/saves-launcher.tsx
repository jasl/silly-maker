// SPDX-License-Identifier: MIT
import type { ButtonPropsV1 } from "../primitives/button.tsx";
import { Button } from "../primitives/button.tsx";
import type { ReactElement } from "react";
import { useSystemDialogControllerV1 } from "./system-dialog-host.tsx";

export type SavesLauncherPropsV1 =
  & Omit<
    ButtonPropsV1,
    "aria-label" | "aria-labelledby" | "children" | "onClick" | "type"
  >
  & {
    readonly label: string;
  };

/** Opens the system Save dialog (mutually exclusive with Settings). */
export function SavesLauncherV1({ label, ...props }: SavesLauncherPropsV1): ReactElement {
  const controller = useSystemDialogControllerV1();
  return (
    <Button {...props} onClick={(event) => controller.openSaves(event.currentTarget)}>
      {label}
    </Button>
  );
}
