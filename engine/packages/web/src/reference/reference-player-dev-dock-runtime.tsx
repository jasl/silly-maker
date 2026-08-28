// SPDX-License-Identifier: MIT
import { useLayoutEffect } from "react";
import type { ReactElement } from "react";

import { ReferenceDevDockV1 } from "@sillymaker/ui/reference/dev-dock";
import type { ReferenceDevDockPropsV1 } from "@sillymaker/ui/reference/dev-dock";

export interface ReferencePlayerDevDockRuntimePropsInternalV1 extends ReferenceDevDockPropsV1 {
  onCommitted(): void;
}

/** @internal Dynamic facade for the complete reference debug menu and window host. */
export function ReferencePlayerDevDockRuntimeInternalV1(
  props: ReferencePlayerDevDockRuntimePropsInternalV1,
): ReactElement {
  const { onCommitted, ...devDockProps } = props;
  useLayoutEffect(() => {
    onCommitted();
  }, [onCommitted]);
  return <ReferenceDevDockV1 {...devDockProps} />;
}
