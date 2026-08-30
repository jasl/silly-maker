// SPDX-License-Identifier: MIT

import { importBornDigitalPdfV1 } from "../src/product/translation/pdf/browser-pdf-import.ts";

declare global {
  interface Window {
    readonly sillyOsBornDigitalPdfHarnessV1: typeof importBornDigitalPdfV1;
  }
}

Object.defineProperty(window, "sillyOsBornDigitalPdfHarnessV1", {
  configurable: false,
  enumerable: false,
  writable: false,
  value: importBornDigitalPdfV1,
});
