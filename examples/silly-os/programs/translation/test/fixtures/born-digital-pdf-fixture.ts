// SPDX-License-Identifier: MIT

function escapePdfStringV1(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function pageStreamV1(lines: readonly string[]): string {
  if (lines.length === 0) return "q\nQ\n";
  return [
    "BT",
    "/F1 18 Tf",
    "72 720 Td",
    ...lines.flatMap((line, index) => [
      ...(index === 0 ? [] : ["0 -24 Td"]),
      `(${escapePdfStringV1(line)}) Tj`,
    ]),
    "ET",
    "",
  ].join("\n");
}

/** Creates a small, project-owned PDF 1.4 fixture without third-party source bytes. */
export function createBornDigitalPdfFixtureV1(
  pages: readonly (readonly string[])[] = [
    ["Hello PDF", "Second line"],
    ["Final page"],
  ],
): Uint8Array {
  if (pages.length === 0) throw new TypeError("pdf_fixture_requires_page");

  const pageObjectIds = pages.map((_, index) => 3 + index);
  const fontObjectId = 3 + pages.length;
  const streamObjectIds = pages.map((_, index) => fontObjectId + 1 + index);
  const objects = new Map<number, string>([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [
      2,
      `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${
        String(pages.length)
      } >>`,
    ],
    [fontObjectId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"],
  ]);
  for (const [index, pageObjectId] of pageObjectIds.entries()) {
    const streamObjectId = streamObjectIds[index];
    if (streamObjectId === undefined) throw new TypeError("pdf_fixture_stream_missing");
    const stream = pageStreamV1(pages[index] ?? []);
    objects.set(
      pageObjectId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${
        String(fontObjectId)
      } 0 R >> >> /Contents ${String(streamObjectId)} 0 R >>`,
    );
    objects.set(
      streamObjectId,
      `<< /Length ${
        String(new TextEncoder().encode(stream).byteLength)
      } >>\nstream\n${stream}endstream`,
    );
  }

  const objectCount = fontObjectId + pages.length;
  const encoder = new TextEncoder();
  let body = "%PDF-1.4\n% SillyOS clean-room fixture\n";
  const offsets = Array.from({ length: objectCount + 1 }, () => 0);
  for (let objectId = 1; objectId <= objectCount; objectId += 1) {
    const object = objects.get(objectId);
    if (object === undefined) throw new TypeError(`pdf_fixture_object_missing:${String(objectId)}`);
    offsets[objectId] = encoder.encode(body).byteLength;
    body += `${String(objectId)} 0 obj\n${object}\nendobj\n`;
  }
  const crossReferenceOffset = encoder.encode(body).byteLength;
  body += `xref\n0 ${String(objectCount + 1)}\n`;
  body += "0000000000 65535 f \n";
  for (let objectId = 1; objectId <= objectCount; objectId += 1) {
    body += `${String(offsets[objectId] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  body += [
    "trailer",
    `<< /Size ${String(objectCount + 1)} /Root 1 0 R >>`,
    "startxref",
    String(crossReferenceOffset),
    "%%EOF",
    "",
  ].join("\n");
  return encoder.encode(body);
}
