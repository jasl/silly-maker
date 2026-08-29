// SPDX-License-Identifier: MIT
import { type ComponentProps, type ReactNode } from "react";

import { cnV1 } from "./utils.ts";

export function FieldGroupV1({ className, ...props }: ComponentProps<"div">): ReactNode {
  return <div data-slot="field-group" className={cnV1("sos-field-group", className)} {...props} />;
}

export function FieldV1({ className, ...props }: ComponentProps<"div">): ReactNode {
  return <div data-slot="field" className={cnV1("sos-field", className)} {...props} />;
}

export function FieldLabelV1({ className, ...props }: ComponentProps<"label">): ReactNode {
  return (
    <label data-slot="field-label" className={cnV1("sos-field__label", className)} {...props} />
  );
}

export function FieldDescriptionV1({ className, ...props }: ComponentProps<"p">): ReactNode {
  return (
    <p
      data-slot="field-description"
      className={cnV1("sos-field__description", className)}
      {...props}
    />
  );
}

export function FieldErrorV1(
  { className, role = "alert", ...props }: ComponentProps<"p">,
): ReactNode {
  return (
    <p
      data-slot="field-error"
      className={cnV1("sos-field__error", className)}
      role={role}
      {...props}
    />
  );
}

export function FieldSetV1({ className, ...props }: ComponentProps<"fieldset">): ReactNode {
  return <fieldset data-slot="field-set" className={cnV1("sos-field-set", className)} {...props} />;
}

export function FieldLegendV1({ className, ...props }: ComponentProps<"legend">): ReactNode {
  return (
    <legend
      data-slot="field-legend"
      className={cnV1("sos-field-set__legend", className)}
      {...props}
    />
  );
}
