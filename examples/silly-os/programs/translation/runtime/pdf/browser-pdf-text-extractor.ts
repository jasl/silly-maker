// SPDX-License-Identifier: MIT

// oxlint-disable-next-line import/default -- Vite's ?url module owns this generated default export.
import pdfJsWorkerUrlV1 from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import {
  type BornDigitalPdfImportInputV1,
  type BornDigitalPdfImportResultV1,
  type BornDigitalPdfPageDiagnosticV1,
  type BornDigitalPdfSourceMapEntryV1,
  type BornDigitalPdfTextItemV1,
  projectBornDigitalPdfPageV1,
} from "./pdf-import-contract.ts";
import type { TranslationSourceUnitV1 } from "../translation-document-codec.ts";

function importCancelledV1(signal: AbortSignal | undefined, cancelled: boolean): boolean {
  return cancelled || signal?.aborted === true;
}

export async function extractBornDigitalPdfTextV1(
  input: BornDigitalPdfImportInputV1,
): Promise<BornDigitalPdfImportResultV1> {
  if (input.signal?.aborted === true) {
    return { kind: "rejected", reason: "cancelled", pageCount: null, pageDiagnostics: [] };
  }

  const pdfJs = await import("pdfjs-dist");
  pdfJs.GlobalWorkerOptions.workerSrc = pdfJsWorkerUrlV1;
  const loadingTask = pdfJs.getDocument({
    data: input.bytes.slice(),
    ...(input.password === undefined ? {} : { password: input.password }),
    disableFontFace: true,
    isImageDecoderSupported: false,
    isOffscreenCanvasSupported: false,
    stopAtErrors: false,
    useSystemFonts: true,
    useWasm: false,
    useWorkerFetch: false,
  });
  let cancelled = false;
  const abort = (): void => {
    cancelled = true;
    void loadingTask.destroy().catch(() => undefined);
  };
  input.signal?.addEventListener("abort", abort, { once: true });

  let pageCount: number | null = null;
  const pageDiagnostics: BornDigitalPdfPageDiagnosticV1[] = [];
  try {
    const document = await loadingTask.promise;
    pageCount = document.numPages;
    const sourceUnits: TranslationSourceUnitV1[] = [];
    const sourceMap: BornDigitalPdfSourceMapEntryV1[] = [];
    let pagesRead = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      if (importCancelledV1(input.signal, cancelled)) {
        return { kind: "rejected", reason: "cancelled", pageCount, pageDiagnostics };
      }
      let page: Awaited<ReturnType<typeof document.getPage>> | null = null;
      try {
        page = await document.getPage(pageNumber);
        const textContent = await page.getTextContent();
        pagesRead += 1;
        const items: BornDigitalPdfTextItemV1[] = [];
        for (const [itemIndex, item] of textContent.items.entries()) {
          if (!("str" in item)) continue;
          items.push({
            itemIndex,
            text: item.str,
            direction: item.dir,
            transform: item.transform.map((value) => Number(value)),
            width: item.width,
            height: item.height,
            hasEndOfLine: item.hasEOL,
          });
        }
        const projected = projectBornDigitalPdfPageV1({
          pageNumber,
          firstUnitOrder: sourceUnits.length,
          items,
        });
        sourceUnits.push(...projected.sourceUnits);
        sourceMap.push(...projected.sourceMap);
      } catch {
        if (importCancelledV1(input.signal, cancelled)) {
          return { kind: "rejected", reason: "cancelled", pageCount, pageDiagnostics };
        }
        pageDiagnostics.push({ pageNumber, reason: "text_extraction_failed" });
      } finally {
        page?.cleanup();
      }
    }

    if (sourceUnits.length === 0) {
      return {
        kind: "rejected",
        reason: pagesRead === 0 ? "invalid_pdf" : "no_extractable_text",
        pageCount,
        pageDiagnostics,
      };
    }
    return {
      kind: "ready",
      document: {
        projection: "pdf_text_reflow",
        pageCount,
        sourceUnits,
        sourceMap,
        pageDiagnostics,
      },
    };
  } catch (error) {
    if (importCancelledV1(input.signal, cancelled)) {
      return { kind: "rejected", reason: "cancelled", pageCount, pageDiagnostics };
    }
    if (error instanceof pdfJs.PasswordException) {
      return {
        kind: "rejected",
        reason: error.code === pdfJs.PasswordResponses.INCORRECT_PASSWORD
          ? "password_incorrect"
          : "password_required",
        pageCount,
        pageDiagnostics,
      };
    }
    return { kind: "rejected", reason: "invalid_pdf", pageCount, pageDiagnostics };
  } finally {
    input.signal?.removeEventListener("abort", abort);
    await loadingTask.destroy().catch(() => undefined);
  }
}
