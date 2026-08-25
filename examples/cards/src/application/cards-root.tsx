// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";
import { CodeSurfaceCompositionHostV1 } from "@sillymaker/ui/code-surface";

import { cardsCompiledCompositionV1 } from "../gui/composition.ts";
import type { CardsCodeSurfaceContextV1 } from "../gui/catalog.ts";

const cardsCodeSurfaceContextV1: CardsCodeSurfaceContextV1 = {
  productId: "feature-cards",
};

export interface CardsRootPropsV1 {
  reportFailure(code: string, error: unknown): void;
}

export function CardsRootV1(props: CardsRootPropsV1): ReactElement {
  return (
    <CodeSurfaceCompositionHostV1
      composition={cardsCompiledCompositionV1}
      context={cardsCodeSurfaceContextV1}
      reportFault={(fault) => props.reportFailure("cards.code_surface_fault", fault.error)}
    />
  );
}
