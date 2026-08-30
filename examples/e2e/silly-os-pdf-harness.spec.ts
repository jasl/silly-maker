// SPDX-License-Identifier: MIT

import { expect, test, type Page } from "@playwright/test";

import { createBornDigitalPdfFixtureV1 } from "../silly-os/src/test/fixtures/born-digital-pdf-fixture.ts";
import type { BornDigitalPdfImportResultV1 } from "../silly-os/src/product/translation/pdf/pdf-import-contract.ts";

import { sillyOsTargetUrlV1 } from "./fixtures.ts";

interface BornDigitalPdfHarnessWindowV1 extends Window {
  readonly sillyOsBornDigitalPdfHarnessV1: (
    input: { readonly bytes: Uint8Array },
  ) => Promise<BornDigitalPdfImportResultV1>;
}

interface BornDigitalPdfBrowserReceiptV1 {
  readonly result: BornDigitalPdfImportResultV1;
  readonly bytesAfterImport: readonly number[];
}

async function importPdfV1(
  page: Page,
  bytes: Uint8Array,
): Promise<BornDigitalPdfBrowserReceiptV1> {
  return await page.evaluate(async (serializedBytes: number[]) => {
    const harness = window as unknown as BornDigitalPdfHarnessWindowV1;
    const inputBytes = new Uint8Array(serializedBytes);
    const result = await harness.sillyOsBornDigitalPdfHarnessV1({ bytes: inputBytes });
    return { result, bytesAfterImport: [...inputBytes] };
  }, [...bytes]);
}

test("born-digital PDF harness stays lazy and extracts stable page locators", async ({ page }) => {
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));

  await page.goto(sillyOsTargetUrlV1("research/pdf-harness.html"));
  await page.waitForFunction(() => "sillyOsBornDigitalPdfHarnessV1" in window);
  expect(requestedUrls.some((url) => url.includes("browser-pdf-text-extractor"))).toBe(false);
  expect(requestedUrls.some((url) => url.includes("pdfjs-dist"))).toBe(false);
  expect(requestedUrls.some((url) => url.includes("pdf.worker"))).toBe(false);

  const source = createBornDigitalPdfFixtureV1();
  const before = source.slice();
  const receipt = await importPdfV1(page, source);
  const { result } = receipt;

  expect(source).toEqual(before);
  expect(receipt.bytesAfterImport).toEqual([...before]);
  expect(result).toMatchObject({
    kind: "ready",
    document: {
      projection: "pdf_text_reflow",
      pageCount: 2,
      sourceUnits: [
        { order: 0, locator: "pdf/page/0001/line/0001", source: "Hello PDF" },
        { order: 1, locator: "pdf/page/0001/line/0002", source: "Second line" },
        { order: 2, locator: "pdf/page/0002/line/0001", source: "Final page" },
      ],
      pageDiagnostics: [],
    },
  });
  if (result.kind !== "ready") throw new TypeError("expected ready PDF projection");
  expect(result.document.sourceMap.map((entry) => entry.pageNumber)).toEqual([1, 1, 2]);
  expect(requestedUrls.some((url) => url.includes("browser-pdf-text-extractor"))).toBe(true);
  expect(requestedUrls.some((url) => url.includes("pdfjs-dist"))).toBe(true);
  expect(requestedUrls.some((url) => url.includes("pdf.worker"))).toBe(true);
});

test("born-digital PDF harness separates empty text from invalid bytes", async ({ page }) => {
  await page.goto(sillyOsTargetUrlV1("research/pdf-harness.html"));
  await page.waitForFunction(() => "sillyOsBornDigitalPdfHarnessV1" in window);

  await expect(importPdfV1(page, createBornDigitalPdfFixtureV1([[]]))).resolves.toMatchObject({
    result: {
      kind: "rejected",
      reason: "no_extractable_text",
      pageCount: 1,
    },
  });
  await expect(importPdfV1(page, new TextEncoder().encode("not a PDF"))).resolves.toMatchObject({
    result: {
      kind: "rejected",
      reason: "invalid_pdf",
      pageCount: null,
      pageDiagnostics: [],
    },
  });
});
