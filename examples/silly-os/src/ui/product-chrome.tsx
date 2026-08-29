// SPDX-License-Identifier: MIT
import type { ReactNode } from "react";

import type { SillyOsCopyV1 } from "../content/copy.ts";

export function SillyOsMarkV1(): ReactNode {
  return (
    <span className="silly-os-mark" aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

export function SillyOsBrandV1({ copy }: { readonly copy: SillyOsCopyV1 }): ReactNode {
  return (
    <span className="silly-os-brand">
      <SillyOsMarkV1 />
      <span className="silly-os-brand__name">{copy.productName}</span>
    </span>
  );
}
