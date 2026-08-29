// SPDX-License-Identifier: MIT
import { type ComponentProps, forwardRef, type ReactNode, type Ref } from "react";

import { cnV1 } from "./utils.ts";

export type InputSizeV1 = "sm" | "base";

export type InputPropsV1 = ComponentProps<"input"> & {
  readonly controlSize?: InputSizeV1;
};

export const InputV1 = forwardRef(function InputV1(
  { className, controlSize = "base", ...props }: InputPropsV1,
  ref: Ref<HTMLInputElement>,
): ReactNode {
  return (
    <input
      ref={ref}
      data-slot="input"
      data-size={controlSize}
      className={cnV1("sos-input", className)}
      {...props}
    />
  );
});

export function InputGroupV1({ className, ...props }: ComponentProps<"div">): ReactNode {
  return <div data-slot="input-group" className={cnV1("sos-input-group", className)} {...props} />;
}

export const InputGroupInputV1 = forwardRef(function InputGroupInputV1(
  { className, controlSize = "base", ...props }: InputPropsV1,
  ref: Ref<HTMLInputElement>,
): ReactNode {
  return (
    <InputV1
      ref={ref}
      data-slot="input-group-input"
      controlSize={controlSize}
      className={cnV1("sos-input-group__input", className)}
      {...props}
    />
  );
});

export function InputGroupAddonV1({ className, ...props }: ComponentProps<"div">): ReactNode {
  return (
    <div
      data-slot="input-group-addon"
      className={cnV1("sos-input-group__addon", className)}
      {...props}
    />
  );
}
