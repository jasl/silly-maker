// SPDX-License-Identifier: MIT
import { type ComponentProps, forwardRef, type ReactNode, type Ref } from "react";

import { cnV1 } from "./utils.ts";

export type TextareaPropsV1 = ComponentProps<"textarea">;

/** Native multiline input with SillyOS state styling; surfaces retain geometry authority. */
export const TextareaV1 = forwardRef(function TextareaV1(
  { className, ...props }: TextareaPropsV1,
  ref: Ref<HTMLTextAreaElement>,
): ReactNode {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cnV1("sos-textarea", className)}
      {...props}
    />
  );
});
