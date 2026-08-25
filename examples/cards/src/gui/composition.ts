// SPDX-License-Identifier: MIT
import { admitGuiCompositionDocumentV1 } from "@sillymaker/base/gui-composition";
import { compileCodeSurfaceCompositionV1 } from "@sillymaker/ui/code-surface";

import cardsCompositionSourceV1 from "./cards.gui-composition.json" with { type: "json" };
import { cardsCodeSurfaceCatalogV1 } from "./catalog.ts";

const cardsCompositionDocumentV1 = admitGuiCompositionDocumentV1(cardsCompositionSourceV1);

export const cardsCompiledCompositionV1 = compileCodeSurfaceCompositionV1(
  cardsCompositionDocumentV1,
  cardsCodeSurfaceCatalogV1,
);
