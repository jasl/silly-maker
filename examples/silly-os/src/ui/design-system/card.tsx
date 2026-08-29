// SPDX-License-Identifier: MIT
import { type ComponentProps, type ReactNode } from "react";

import { cnV1 } from "./utils.ts";

export function CardV1({ className, ...props }: ComponentProps<"section">): ReactNode {
  return <section data-slot="card" className={cnV1("sos-card", className)} {...props} />;
}

export function CardHeaderV1({ className, ...props }: ComponentProps<"header">): ReactNode {
  return (
    <header data-slot="card-header" className={cnV1("sos-card__header", className)} {...props} />
  );
}

export function CardTitleV1({ className, ...props }: ComponentProps<"h2">): ReactNode {
  return <h2 data-slot="card-title" className={cnV1("sos-card__title", className)} {...props} />;
}

export function CardDescriptionV1({ className, ...props }: ComponentProps<"p">): ReactNode {
  return (
    <p
      data-slot="card-description"
      className={cnV1("sos-card__description", className)}
      {...props}
    />
  );
}

export function CardContentV1({ className, ...props }: ComponentProps<"div">): ReactNode {
  return (
    <div data-slot="card-content" className={cnV1("sos-card__content", className)} {...props} />
  );
}
