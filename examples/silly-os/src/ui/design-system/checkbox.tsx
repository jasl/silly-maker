// SPDX-License-Identifier: MIT
import { type ComponentProps, forwardRef, type ReactNode, type Ref } from "react";

import { cnV1 } from "./utils.ts";

export type CheckboxPropsV1 = Omit<ComponentProps<"input">, "type">;

export const CheckboxV1 = forwardRef(function CheckboxV1(
  { className, ...props }: CheckboxPropsV1,
  ref: Ref<HTMLInputElement>,
): ReactNode {
  return (
    <input
      {...props}
      ref={ref}
      type="checkbox"
      data-slot="checkbox"
      className={cnV1("sos-checkbox", className)}
    />
  );
});
