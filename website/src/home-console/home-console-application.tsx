// SPDX-License-Identifier: MIT
import { admitGuiCompositionDocumentV1 } from "@sillymaker/base/gui-composition";
import { CodeSurfaceCompositionHostV1 } from "@sillymaker/ui/code-surface";
import { createInputRouterV1, InputContextProviderV1 } from "@sillymaker/ui/input";
import { useMemo } from "react";
import type { ReactElement } from "react";

import englishCompositionSourceV1 from "./home-console.en.gui-composition.json" with {
  type: "json",
};
import chineseCompositionSourceV1 from "./home-console.zh-CN.gui-composition.json" with {
  type: "json",
};
import {
  type WebsiteHomeConsoleContextV1,
  websiteHomeConsoleCatalogV1,
} from "./home-console-catalog.ts";

export type WebsiteHomeConsoleLocaleV1 = "en" | "zh-CN";

const contextV1: WebsiteHomeConsoleContextV1 = { productId: "website-home-console" };
const compositionsV1 = {
  en: websiteHomeConsoleCatalogV1.compile(
    admitGuiCompositionDocumentV1(englishCompositionSourceV1),
  ),
  "zh-CN": websiteHomeConsoleCatalogV1.compile(
    admitGuiCompositionDocumentV1(chineseCompositionSourceV1),
  ),
} as const;

export function WebsiteHomeConsoleV1(
  props: { readonly locale: WebsiteHomeConsoleLocaleV1 },
): ReactElement {
  const inputRouter = useMemo(createInputRouterV1, []);
  const composition = compositionsV1[props.locale];
  return (
    <InputContextProviderV1 router={inputRouter}>
      <CodeSurfaceCompositionHostV1
        composition={composition}
        context={contextV1}
        reportFault={(fault) => {
          console.warn("website.home_console_code_surface_fault", fault.error);
        }}
      />
    </InputContextProviderV1>
  );
}
