// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { prepareTranslationDocumentV1 } from "../runtime/translation-document-codec.ts";
import { exportTranslationProcessV1 } from "../runtime/translation-process-export.ts";
import type {
  TranslationWorksetHeadV1,
  TranslationWorksetUnitRecordV1,
} from "../runtime/translation-workset-repository.ts";

const encoderV1 = new TextEncoder();
const decoderV1 = new TextDecoder();

async function sha256V1(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function completedWorksetV1(input: {
  readonly fileName: string;
  readonly mediaType: string;
  readonly sourceText: string;
  readonly target: (source: string) => string;
}): Promise<{
  readonly bytes: Uint8Array;
  readonly workset: TranslationWorksetHeadV1;
  readonly rows: readonly TranslationWorksetUnitRecordV1[];
  readonly expected: string;
}> {
  const bytes = encoderV1.encode(input.sourceText);
  const prepared = prepareTranslationDocumentV1({
    text: input.sourceText,
    fileName: input.fileName,
    mediaType: input.mediaType,
  });
  if (
    prepared.capability.grade !== "round_trip_supported" || prepared.exportTranslation === null
  ) {
    throw new Error("expected round-trip Translation fixture");
  }
  const targets = prepared.sourceUnits.map((unit) => ({
    unitId: unit.unitId,
    target: input.target(unit.source),
  }));
  const expected = prepared.exportTranslation(targets, { targetLocale: "zh-CN" });
  if (expected.kind !== "exported") throw new Error("expected exported Translation fixture");
  const rows = prepared.sourceUnits.map((unit, order) => ({
    processId: "process.translation.export",
    ...unit,
    order,
    target: targets[order]!.target,
  }));
  return {
    bytes,
    rows,
    expected: expected.text,
    workset: {
      schemaVersion: 2,
      processId: "process.translation.export",
      importOperationId: "operation.translation.import",
      revision: 7,
      phase: "ready",
      title: input.fileName,
      document: {
        format: prepared.format,
        capabilityGrade: "round_trip_supported",
        capabilityReason: "known_format",
      },
      source: {
        fileName: input.fileName,
        mediaType: input.mediaType,
        workspacePath: "translation/source.input",
        byteLength: bytes.byteLength,
        sha256: await sha256V1(bytes),
      },
      sourceBinding: {
        revision: 1,
        workspaceId: "workspace.translation.export",
        volumeId: "volume.translation.export",
        workspaceFormat: 1,
        path: "translation/source.input",
        checkpointId: "checkpoint.translation.import",
        generation: 2,
      },
      sourceLocale: "en",
      targetLocale: "zh-CN",
      documentPurpose: "translation",
      style: "faithful",
      expectedUnitCount: rows.length,
      stagedUnitCount: rows.length,
      expectedGlossaryCount: 0,
      stagedGlossaryCount: 0,
      acceptedUnitCount: rows.length,
      acceptedBatchCount: 2,
      pendingCandidateId: null,
      createdAt: 1,
      updatedAt: 2,
    },
  };
}

describe("Translation Process export", () => {
  it.each([
    {
      name: "plain text",
      fileName: "dialogue.txt",
      mediaType: "text/plain",
      sourceText: "Hello\n\nWorld",
    },
    {
      name: "Markdown",
      fileName: "guide.md",
      mediaType: "text/markdown",
      sourceText: "# Hello\n\nUse `code` here.",
    },
    {
      name: "SubRip",
      fileName: "scene.srt",
      mediaType: "application/x-subrip",
      sourceText: "1\n00:00:01,000 --> 00:00:02,000\nHello\n",
    },
    {
      name: "WebVTT",
      fileName: "scene.vtt",
      mediaType: "text/vtt",
      sourceText: "WEBVTT\n\n00:01.000 --> 00:02.000\nHello\n",
    },
    {
      name: "ASS",
      fileName: "scene.ass",
      mediaType: "application/x-substation-alpha",
      sourceText: [
        "[Events]",
        "Format: Layer, Start, End, Style, Name, Text",
        "Dialogue: 0,0:00:01.00,0:00:02.00,Default,,Hello",
        "",
      ].join("\n"),
    },
    {
      name: "closed JSON",
      fileName: "scene.json",
      mediaType: "application/json",
      sourceText: JSON.stringify(
        {
          schema: "sillyos.translation-document.v1",
          sourceLocale: "en",
          targetLocale: null,
          metadata: { title: "Scene" },
          entries: [{
            id: "opening/1",
            text: "Hello",
            context: "Greeting",
            locked: false,
            metadata: {},
          }],
        },
        null,
        2,
      ),
    },
  ])("rebuilds $name through the existing structural codec", async (fixture) => {
    const prepared = await completedWorksetV1({
      ...fixture,
      target: (source) => source.replace("Hello", "你好").replace("World", "世界"),
    });
    const result = await exportTranslationProcessV1({
      workset: prepared.workset,
      rows: prepared.rows,
      sourceBytes: prepared.bytes,
    });
    expect(result.kind).toBe("exported");
    if (result.kind !== "exported") return;
    expect(decoderV1.decode(result.artifact.bytes)).toBe(prepared.expected);
    expect(result.artifact.fileName).toBe(
      `${fixture.fileName.slice(0, fixture.fileName.lastIndexOf("."))}.zh-CN.${
        fixture.fileName.slice(fixture.fileName.lastIndexOf(".") + 1)
      }`,
    );
    expect(result.artifact.mediaType).toContain("charset=utf-8");
  });

  it("exports an admitted born-digital PDF projection as deterministic plain text", async () => {
    const rows: readonly TranslationWorksetUnitRecordV1[] = [
      { unitId: "translation.unit.000001", order: 0, locator: "pdf/page/0001/line/0001" },
      { unitId: "translation.unit.000002", order: 1, locator: "pdf/page/0001/line/0002" },
      { unitId: "translation.unit.000003", order: 2, locator: "pdf/page/0002/line/0001" },
    ].map((unit) => ({
      processId: "process.translation.pdf",
      ...unit,
      context: null,
      durationMilliseconds: null,
      lineBreakPolicy: "forbidden" as const,
      source: `Source ${String(unit.order + 1)}`,
      protectedSegments: [],
      target: `译文 ${String(unit.order + 1)}`,
    }));
    const workset: TranslationWorksetHeadV1 = {
      schemaVersion: 2,
      processId: "process.translation.pdf",
      importOperationId: "operation.translation.pdf",
      revision: 5,
      phase: "ready",
      title: "paper.pdf",
      document: {
        format: "pdf_text_reflow",
        capabilityGrade: "generic_text_only",
        capabilityReason: "born_digital_pdf_text",
      },
      source: {
        fileName: "paper.pdf",
        mediaType: "application/pdf",
        workspacePath: "translation/source.pdf",
        byteLength: 12,
        sha256: "0".repeat(64),
      },
      sourceBinding: {
        revision: 1,
        workspaceId: "workspace.translation.pdf",
        volumeId: "volume.translation.pdf",
        workspaceFormat: 1,
        path: "translation/source.pdf",
        checkpointId: "checkpoint.translation.pdf",
        generation: 2,
      },
      sourceLocale: "en",
      targetLocale: "zh-CN",
      documentPurpose: "translation",
      style: "faithful",
      expectedUnitCount: rows.length,
      stagedUnitCount: rows.length,
      expectedGlossaryCount: 0,
      stagedGlossaryCount: 0,
      acceptedUnitCount: rows.length,
      acceptedBatchCount: 2,
      pendingCandidateId: null,
      createdAt: 1,
      updatedAt: 2,
    };

    await expect(exportTranslationProcessV1({
      workset,
      rows,
      sourceBytes: null,
    })).resolves.toEqual({
      kind: "exported",
      artifact: {
        fileName: "paper.zh-CN.txt",
        mediaType: "text/plain;charset=utf-8",
        bytes: encoderV1.encode("译文 1\n译文 2\n\f\n译文 3"),
      },
    });
  });

  it("rejects incomplete worksets and mismatched original source bytes", async () => {
    const prepared = await completedWorksetV1({
      fileName: "source.txt",
      mediaType: "text/plain",
      sourceText: "Hello",
      target: () => "你好",
    });
    await expect(exportTranslationProcessV1({
      workset: { ...prepared.workset, acceptedUnitCount: 0 },
      rows: prepared.rows,
      sourceBytes: prepared.bytes,
    })).resolves.toMatchObject({ kind: "rejected", reason: "translation_incomplete" });
    await expect(exportTranslationProcessV1({
      workset: prepared.workset,
      rows: prepared.rows,
      sourceBytes: encoderV1.encode("Hallo"),
    })).resolves.toMatchObject({ kind: "rejected", reason: "source_digest_mismatch" });
    await expect(exportTranslationProcessV1({
      workset: prepared.workset,
      rows: [{ ...prepared.rows[0]!, locator: "line/999" }],
      sourceBytes: prepared.bytes,
    })).resolves.toMatchObject({ kind: "rejected", reason: "source_document_mismatch" });
  });
});
