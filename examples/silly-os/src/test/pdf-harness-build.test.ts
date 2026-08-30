// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { build } from "vite";

interface PdfHarnessBuildOutputChunkV1 {
  readonly type: "chunk";
  readonly code: string;
  readonly dynamicImports: readonly string[];
  readonly fileName: string;
  readonly imports: readonly string[];
  readonly isEntry: boolean;
}

interface PdfHarnessBuildOutputAssetV1 {
  readonly type: "asset";
  readonly fileName: string;
  readonly source: string | Uint8Array;
}

type PdfHarnessBuildOutputFileV1 = PdfHarnessBuildOutputChunkV1 | PdfHarnessBuildOutputAssetV1;

interface PdfHarnessBuildOutputV1 {
  readonly output: readonly PdfHarnessBuildOutputFileV1[];
}

function outputFilesV1(
  output: PdfHarnessBuildOutputV1 | readonly PdfHarnessBuildOutputV1[],
): readonly PdfHarnessBuildOutputFileV1[] {
  return (Array.isArray(output) ? output : [output]).flatMap((entry) => entry.output);
}

describe("SillyOS born-digital PDF research build", () => {
  it("keeps PDF.js and its Worker outside the harness initial graph", async () => {
    const appRoot = new URL("../../", import.meta.url);
    const buildResult = await build({
      configFile: false,
      root: appRoot.pathname,
      publicDir: false,
      logLevel: "silent",
      build: {
        write: false,
        rollupOptions: {
          input: new URL("research/pdf-harness.html", appRoot).pathname,
        },
      },
    });
    const files = outputFilesV1(
      buildResult as PdfHarnessBuildOutputV1 | readonly PdfHarnessBuildOutputV1[],
    );
    const chunks = files.filter((file): file is PdfHarnessBuildOutputChunkV1 =>
      file.type === "chunk"
    );
    const entry = chunks.find((chunk) => chunk.isEntry);
    if (entry === undefined) throw new TypeError("PDF harness build entry is unavailable");

    const chunksByName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
    const initialChunks: PdfHarnessBuildOutputChunkV1[] = [];
    const pending = [entry.fileName];
    const visited = new Set<string>();
    while (pending.length > 0) {
      const fileName = pending.pop();
      if (fileName === undefined || visited.has(fileName)) continue;
      visited.add(fileName);
      const chunk = chunksByName.get(fileName);
      if (chunk === undefined) continue;
      initialChunks.push(chunk);
      pending.push(...chunk.imports);
    }

    const initialCode = initialChunks.map((chunk) => chunk.code).join("\n");
    expect(initialCode).not.toContain("pdf_text_reflow");
    expect(initialCode).not.toContain("pdf.worker.min");
    expect(initialCode).not.toContain("6.3.289");

    expect(entry.dynamicImports.length).toBeGreaterThan(0);
    expect(chunks.some((chunk) => chunk.code.includes("pdf_text_reflow"))).toBe(true);
    expect(
      files.some((file) =>
        file.fileName.includes("pdf.worker.min") ||
        (file.type === "asset" && String(file.source).includes("6.3.289"))
      ),
    ).toBe(true);
  });
});
