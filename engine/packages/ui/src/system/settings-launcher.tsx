// SPDX-License-Identifier: MIT
import type { ButtonPropsV1 } from "../primitives/button.tsx";
import { Button } from "../primitives/button.tsx";
import type { ReactElement } from "react";
import { useSystemDialogControllerV1 } from "./system-dialog-host.tsx";

export type SettingsLauncherPropsV1 = Omit<
  ButtonPropsV1,
  "aria-label" | "aria-labelledby" | "children" | "onClick" | "type"
> & {
  readonly label: string;
};

export function SettingsLauncherV1({ label, ...props }: SettingsLauncherPropsV1): ReactElement {
  const controller = useSystemDialogControllerV1();
  return (
    <Button {...props} onClick={(event) => controller.openSettings(event.currentTarget)}>
      {label}
    </Button>
  );
}
