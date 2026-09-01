// SPDX-License-Identifier: MIT

import type {
  BornDigitalPdfImportInputV1,
  BornDigitalPdfImportResultV1,
} from "./pdf-import-contract.ts";

type BrowserPdfExtractorModuleV1 = typeof import("./browser-pdf-text-extractor.ts");

let extractorModulePromiseV1: Promise<BrowserPdfExtractorModuleV1> | null = null;

async function loadBrowserPdfExtractorV1(): Promise<BrowserPdfExtractorModuleV1> {
  const pending = extractorModulePromiseV1 ??= import("./browser-pdf-text-extractor.ts");
  try {
    return await pending;
  } catch (error) {
    if (extractorModulePromiseV1 === pending) extractorModulePromiseV1 = null;
    throw error;
  }
}

/** Loads PDF.js and its dedicated Worker only when a PDF import is requested. */
export async function importBornDigitalPdfV1(
  input: BornDigitalPdfImportInputV1,
): Promise<BornDigitalPdfImportResultV1> {
  const extractor = await loadBrowserPdfExtractorV1();
  return await extractor.extractBornDigitalPdfTextV1(input);
}
