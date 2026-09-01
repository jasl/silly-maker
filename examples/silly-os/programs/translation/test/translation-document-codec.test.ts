// SPDX-License-Identifier: MIT

import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  prepareTranslationDocumentV1,
  type PreparedTranslationDocumentV1,
  type TranslationSourceUnitV1,
} from "../runtime/translation-document-codec.ts";

function roundTripV1(document: PreparedTranslationDocumentV1): Extract<
  PreparedTranslationDocumentV1,
  { readonly capability: { readonly grade: "round_trip_supported" } }
> {
  expect(document.capability.grade).toBe("round_trip_supported");
  if (document.exportTranslation === null) throw new Error("expected round-trip document");
  return document;
}

function unchangedTargetsV1(units: readonly TranslationSourceUnitV1[]) {
  return units.map((unit) => ({ unitId: unit.unitId, target: unit.source }));
}

function sourceUnitAtV1(
  units: readonly TranslationSourceUnitV1[],
  index: number,
): TranslationSourceUnitV1 {
  const unit = units[index];
  if (unit === undefined) throw new Error(`missing source unit ${String(index)}`);
  return unit;
}

async function corpusTextV1(fileName: string): Promise<string> {
  return await readFile(
    new URL(`./fixtures/corpus/${fileName}`, import.meta.url),
    {
      encoding: "utf8",
    },
  );
}

describe("SillyOS translation document codec", () => {
  it("extracts stable TXT units and restores placeholders, tags, whitespace, and CRLF", () => {
    const source = "  Hello {name}!  \r\n\r\n<b>Balance:</b> %1$s / %SIGNAL_ID%\r\n";
    const first = roundTripV1(prepareTranslationDocumentV1({
      fileName: "dialogue.txt",
      mediaType: "text/plain; charset=utf-8",
      text: source,
    }));
    const second = roundTripV1(
      prepareTranslationDocumentV1({ fileName: "dialogue.txt", text: source }),
    );

    expect(first.sourceUnits).toEqual(second.sourceUnits);
    expect(first.sourceUnits).toEqual([
      {
        unitId: "translation.unit.000001",
        order: 0,
        locator: "line/1",
        context: null,
        durationMilliseconds: null,
        lineBreakPolicy: "forbidden",
        source: "Hello ⟦SM:1⟧!",
        protectedSegments: [{ token: "⟦SM:1⟧", kind: "placeholder", source: "{name}" }],
      },
      {
        unitId: "translation.unit.000002",
        order: 1,
        locator: "line/3",
        context: null,
        durationMilliseconds: null,
        lineBreakPolicy: "forbidden",
        source: "⟦SM:1⟧Balance:⟦SM:2⟧ ⟦SM:3⟧ / ⟦SM:4⟧",
        protectedSegments: [
          { token: "⟦SM:1⟧", kind: "markup_tag", source: "<b>" },
          { token: "⟦SM:2⟧", kind: "markup_tag", source: "</b>" },
          { token: "⟦SM:3⟧", kind: "placeholder", source: "%1$s" },
          { token: "⟦SM:4⟧", kind: "placeholder", source: "%SIGNAL_ID%" },
        ],
      },
    ]);
    expect(first.exportTranslation(unchangedTargetsV1(first.sourceUnits))).toEqual({
      kind: "exported",
      text: source,
    });
    const firstUnit = sourceUnitAtV1(first.sourceUnits, 0);
    const secondUnit = sourceUnitAtV1(first.sourceUnits, 1);
    expect(first.exportTranslation([
      { unitId: firstUnit.unitId, target: "你好，⟦SM:1⟧！" },
      { unitId: secondUnit.unitId, target: "⟦SM:1⟧余额：⟦SM:2⟧ ⟦SM:3⟧ / ⟦SM:4⟧" },
    ])).toEqual({
      kind: "exported",
      text: "  你好，{name}！  \r\n\r\n<b>余额：</b> %1$s / %SIGNAL_ID%\r\n",
    });
  });

  it("keeps Markdown code and link destinations inert while translating visible prose", () => {
    const source = [
      "# Read the [guide](https://example.test/docs?q={query})",
      "",
      "Use `run({name})` with **care**.",
      "",
      "```ts",
      'const greeting = "Do not translate";',
      "```",
      "",
    ].join("\n");
    const document = roundTripV1(
      prepareTranslationDocumentV1({ fileName: "guide.md", text: source }),
    );

    expect(document.sourceUnits).toHaveLength(2);
    const firstUnit = sourceUnitAtV1(document.sourceUnits, 0);
    const secondUnit = sourceUnitAtV1(document.sourceUnits, 1);
    expect(firstUnit).toMatchObject({
      locator: "line/1",
      source: "Read the ⟦SM:1⟧guide⟦SM:2⟧",
      protectedSegments: [
        { kind: "link", source: "[" },
        { kind: "link", source: "](https://example.test/docs?q={query})" },
      ],
    });
    expect(secondUnit).toMatchObject({
      locator: "line/3",
      source: "Use ⟦SM:1⟧ with ⟦SM:2⟧care⟦SM:3⟧.",
      protectedSegments: [
        { kind: "markdown_code", source: "`run({name})`" },
        { kind: "markdown_syntax", source: "**" },
        { kind: "markdown_syntax", source: "**" },
      ],
    });
    const result = document.exportTranslation([
      { unitId: firstUnit.unitId, target: "阅读⟦SM:1⟧指南⟦SM:2⟧" },
      { unitId: secondUnit.unitId, target: "请⟦SM:1⟧并保持⟦SM:2⟧谨慎⟦SM:3⟧。" },
    ]);
    expect(result).toEqual({
      kind: "exported",
      text: source
        .replace(
          "Read the [guide](https://example.test/docs?q={query})",
          "阅读[指南](https://example.test/docs?q={query})",
        )
        .replace("Use `run({name})` with **care**.", "请`run({name})`并保持**谨慎**。"),
    });
    expect(source).toContain("Do not translate");
  });

  it("rejects whitespace that detaches structural Markdown tokens from their content", () => {
    const document = roundTripV1(prepareTranslationDocumentV1({
      fileName: "guide.md",
      text: "Read [guide](https://example.test/x).\nUse **care**.",
    }));
    const link = sourceUnitAtV1(document.sourceUnits, 0);
    const emphasis = sourceUnitAtV1(document.sourceUnits, 1);

    expect(document.exportTranslation([
      { unitId: link.unitId, target: "Read ⟦SM:1⟧ guide ⟦SM:2⟧." },
      { unitId: emphasis.unitId, target: emphasis.source },
    ])).toEqual({
      kind: "rejected",
      reason: "protected_content_changed",
      unitId: link.unitId,
    });
    expect(document.exportTranslation([
      { unitId: link.unitId, target: link.source },
      { unitId: emphasis.unitId, target: "Use ⟦SM:1⟧ care ⟦SM:2⟧." },
    ])).toEqual({
      kind: "rejected",
      reason: "protected_content_changed",
      unitId: emphasis.unitId,
    });
    expect(document.exportTranslation([
      { unitId: link.unitId, target: "Read guide ⟦SM:1⟧⟦SM:2⟧." },
      { unitId: emphasis.unitId, target: emphasis.source },
    ])).toEqual({
      kind: "rejected",
      reason: "protected_content_changed",
      unitId: link.unitId,
    });
  });

  it("rejects moving translated markup body text outside its original tag pair", () => {
    const document = roundTripV1(prepareTranslationDocumentV1({
      fileName: "copy.txt",
      text: "<b>Balance</b>",
    }));
    const unit = sourceUnitAtV1(document.sourceUnits, 0);

    expect(document.exportTranslation([{
      unitId: unit.unitId,
      target: "Balance ⟦SM:1⟧⟦SM:2⟧",
    }])).toEqual({
      kind: "rejected",
      reason: "protected_content_changed",
      unitId: unit.unitId,
    });
  });

  it("rejects missing, duplicated, reordered, or structurally unsafe targets", () => {
    const document = roundTripV1(prepareTranslationDocumentV1({
      fileName: "copy.txt",
      text: "Hello {name}\nSecond line",
    }));
    const first = sourceUnitAtV1(document.sourceUnits, 0);
    const second = sourceUnitAtV1(document.sourceUnits, 1);

    expect(document.exportTranslation([{ unitId: first.unitId, target: first.source }])).toEqual({
      kind: "rejected",
      reason: "missing_unit",
      unitId: second.unitId,
    });
    expect(document.exportTranslation([
      { unitId: first.unitId, target: first.source },
      { unitId: first.unitId, target: first.source },
    ])).toEqual({ kind: "rejected", reason: "duplicate_unit", unitId: first.unitId });
    expect(document.exportTranslation([
      { unitId: first.unitId, target: "Hello" },
      { unitId: second.unitId, target: second.source },
    ])).toEqual({
      kind: "rejected",
      reason: "protected_content_changed",
      unitId: first.unitId,
    });
    expect(document.exportTranslation([
      { unitId: first.unitId, target: `${first.source} {invented}` },
      { unitId: second.unitId, target: second.source },
    ])).toEqual({
      kind: "rejected",
      reason: "protected_content_changed",
      unitId: first.unitId,
    });
    expect(document.exportTranslation([
      { unitId: first.unitId, target: first.source },
      { unitId: second.unitId, target: "line one\nline two" },
    ])).toEqual({ kind: "rejected", reason: "line_break_changed", unitId: second.unitId });
  });

  it("round-trips strict SubRip cues without rewriting timings or styling tags", () => {
    const source =
      "1\r\n00:00:01,000 --> 00:00:03,500\r\n<i>Hello {name}</i>\r\n\r\n2\r\n00:00:04,000 --> 00:00:05,000 position:50%\r\nGoodbye\r\n";
    const document = roundTripV1(prepareTranslationDocumentV1({
      fileName: "episode.srt",
      mediaType: "application/x-subrip",
      text: source,
    }));

    expect(document.format).toBe("subrip");
    expect(document.sourceUnits.map((unit) => unit.locator)).toEqual([
      "cue/1/line/1",
      "cue/2/line/1",
    ]);
    expect(document.sourceUnits.map((unit) => unit.durationMilliseconds)).toEqual([
      2_500,
      1_000,
    ]);
    expect(sourceUnitAtV1(document.sourceUnits, 0).protectedSegments).toEqual([
      { token: "⟦SM:1⟧", kind: "markup_tag", source: "<i>" },
      { token: "⟦SM:2⟧", kind: "placeholder", source: "{name}" },
      { token: "⟦SM:3⟧", kind: "markup_tag", source: "</i>" },
    ]);
    expect(document.exportTranslation(unchangedTargetsV1(document.sourceUnits))).toEqual({
      kind: "exported",
      text: source,
    });
  });

  it.each([
    {
      label: "SubRip",
      fileName: "speakers.srt",
      text: "1\n00:00:01,000 --> 00:00:03,000\nMina: Keep the receiver close.\n",
      speaker: "Mina",
      translatedSpeaker: "米娜",
      output: "1\n00:00:01,000 --> 00:00:03,000\n米娜: 请把接收机放在身边。\n",
    },
    {
      label: "WebVTT",
      fileName: "speakers.vtt",
      text: "WEBVTT\n\n00:01.000 --> 00:03.000\nTheo: Keep the receiver close.\n",
      speaker: "Theo",
      translatedSpeaker: "西奥",
      output: "WEBVTT\n\n00:01.000 --> 00:03.000\n西奥: 请把接收机放在身边。\n",
    },
    {
      label: "ASS",
      fileName: "speakers.ass",
      text: [
        "[Events]",
        "Format: Layer, Start, End, Style, Name, Text",
        "Dialogue: 0,0:00:01.00,0:00:03.00,Default,Mina,Theo: Keep the receiver close.",
        "",
      ].join("\n"),
      speaker: "Theo",
      translatedSpeaker: "西奥",
      output: [
        "[Events]",
        "Format: Layer, Start, End, Style, Name, Text",
        "Dialogue: 0,0:00:01.00,0:00:03.00,Default,Mina,西奥: 请把接收机放在身边。",
        "",
      ].join("\n"),
    },
  ])("projects $label speaker prefixes as mandatory translatable units", (fixture) => {
    const document = roundTripV1(prepareTranslationDocumentV1({
      fileName: fixture.fileName,
      text: fixture.text,
    }));
    const speaker = sourceUnitAtV1(document.sourceUnits, 0);
    const body = sourceUnitAtV1(document.sourceUnits, 1);

    expect(speaker).toMatchObject({
      locator: expect.stringMatching(/\/speaker$/u),
      context: "Timed-text speaker name.",
      source: fixture.speaker,
      protectedSegments: [],
    });
    expect(body).toMatchObject({
      locator: expect.stringMatching(/\/text$/u),
      context: `Spoken by ${fixture.speaker}.`,
      source: "Keep the receiver close.",
      protectedSegments: [],
    });
    expect(document.exportTranslation([
      { unitId: speaker.unitId, target: fixture.translatedSpeaker },
      { unitId: body.unitId, target: "请把接收机放在身边。" },
    ])).toEqual({ kind: "exported", text: fixture.output });
    expect(document.exportTranslation([{
      unitId: body.unitId,
      target: "请把接收机放在身边。",
    }])).toEqual({
      kind: "rejected",
      reason: "missing_unit",
      unitId: speaker.unitId,
    });
  });

  it("does not mistake a timed-text clock prefix for a speaker label", () => {
    const document = roundTripV1(prepareTranslationDocumentV1({
      fileName: "clock.srt",
      text: "1\n00:00:01,000 --> 00:00:03,000\n12:30 is too late.\n",
    }));

    expect(sourceUnitAtV1(document.sourceUnits, 0)).toMatchObject({
      source: "12:30 is too late.",
      protectedSegments: [],
    });
  });

  it("round-trips WebVTT cues while leaving headers, notes, styles, and timings inert", () => {
    const source = [
      "\uFEFFWEBVTT Night shift",
      "Kind: captions",
      "Language: en",
      "",
      "NOTE The following cue is used for calibration.",
      "This note is not dialogue.",
      "",
      "opening",
      "00:01.000 --> 00:03.500 line:90% position:50%",
      "<v Mira><i>Hello &amp; welcome, {name}.</i>",
      "Keep the receiver close.",
      "",
      "STYLE",
      "::cue { color: lime; }",
      "",
      "00:04.000 --> 00:05.250",
      "<00:04.500>Goodbye.",
      "",
    ].join("\r\n");
    const document = roundTripV1(prepareTranslationDocumentV1({
      fileName: "episode.vtt",
      mediaType: "text/vtt; charset=utf-8",
      text: source,
    }));

    expect(document.format).toBe("webvtt");
    expect(document.sourceUnits.map((unit) => unit.locator)).toEqual([
      "cue/1/line/1",
      "cue/1/line/2",
      "cue/2/line/1",
    ]);
    expect(document.sourceUnits.map((unit) => unit.durationMilliseconds)).toEqual([
      2_500,
      2_500,
      1_250,
    ]);
    expect(sourceUnitAtV1(document.sourceUnits, 0).protectedSegments).toEqual([
      { token: "⟦SM:1⟧", kind: "markup_tag", source: "<v Mira>" },
      { token: "⟦SM:2⟧", kind: "markup_tag", source: "<i>" },
      { token: "⟦SM:3⟧", kind: "markup_tag", source: "&amp;" },
      { token: "⟦SM:4⟧", kind: "placeholder", source: "{name}" },
      { token: "⟦SM:5⟧", kind: "markup_tag", source: "</i>" },
    ]);
    expect(sourceUnitAtV1(document.sourceUnits, 2).protectedSegments).toEqual([
      { token: "⟦SM:1⟧", kind: "markup_tag", source: "<00:04.500>" },
    ]);
    expect(document.exportTranslation(unchangedTargetsV1(document.sourceUnits))).toEqual({
      kind: "exported",
      text: source,
    });

    const [opening, instruction, farewell] = document.sourceUnits;
    if (opening === undefined || instruction === undefined || farewell === undefined) {
      throw new Error("expected WebVTT units");
    }
    const translated = document.exportTranslation([
      {
        unitId: opening.unitId,
        target: "⟦SM:1⟧⟦SM:2⟧你好，欢迎你，⟦SM:3⟧ ⟦SM:4⟧。⟦SM:5⟧",
      },
      { unitId: instruction.unitId, target: "请把接收机放在身边。" },
      { unitId: farewell.unitId, target: "⟦SM:1⟧再见。" },
    ]);
    expect(translated).toEqual({
      kind: "exported",
      text: source
        .replace(
          "<v Mira><i>Hello &amp; welcome, {name}.</i>",
          "<v Mira><i>你好，欢迎你，&amp; {name}。</i>",
        )
        .replace("Keep the receiver close.", "请把接收机放在身边。")
        .replace("<00:04.500>Goodbye.", "<00:04.500>再见。"),
    });
    expect(document.exportTranslation([
      { unitId: opening.unitId, target: "Hello without cue markup" },
      { unitId: instruction.unitId, target: instruction.source },
      { unitId: farewell.unitId, target: farewell.source },
    ])).toEqual({
      kind: "rejected",
      reason: "protected_content_changed",
      unitId: opening.unitId,
    });
  });

  it("round-trips ASS dialogue text while preserving event fields and drawing commands", () => {
    const source = [
      "[Script Info]",
      "Title: Night shift",
      "ScriptType: v4.00+",
      "",
      "[V4+ Styles]",
      "Format: Name, Fontname, Fontsize, PrimaryColour",
      "Style: Default,Arial,48,&H00FFFFFF",
      "",
      "[Events]",
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      "Dialogue: 0,0:00:01.00,0:00:03.50,Default,Mira,0,0,0,,{\\an8}<i>Hello {name}</i>\\NSecond line",
      "Comment: 0,0:00:03.50,0:00:04.00,Default,Director,0,0,0,,Do not translate this note",
      "Dialogue: 0,0:00:04.00,0:00:05.00,Default,,0,0,0,,{\\p1}m 0 0 l 10 0 10 10{\\p0}",
      "Dialogue: 0,0:00:06.00,0:00:07.25,Default,Mira,0,0,0,,Goodbye, for now",
      "",
    ].join("\r\n");
    const document = roundTripV1(prepareTranslationDocumentV1({
      fileName: "episode.ass",
      mediaType: "application/x-substation-alpha",
      text: source,
    }));

    expect(document.format).toBe("advanced_substation_alpha");
    expect(document.sourceUnits.map((unit) => unit.locator)).toEqual([
      "dialogue/1/text",
      "dialogue/3/text",
    ]);
    expect(document.sourceUnits.map((unit) => unit.durationMilliseconds)).toEqual([
      2_500,
      1_250,
    ]);
    expect(sourceUnitAtV1(document.sourceUnits, 0).protectedSegments).toEqual([
      { token: "⟦SM:1⟧", kind: "markup_tag", source: "{\\an8}" },
      { token: "⟦SM:2⟧", kind: "markup_tag", source: "<i>" },
      { token: "⟦SM:3⟧", kind: "placeholder", source: "{name}" },
      { token: "⟦SM:4⟧", kind: "markup_tag", source: "</i>" },
      { token: "⟦SM:5⟧", kind: "markup_tag", source: "\\N" },
    ]);
    expect(document.exportTranslation(unchangedTargetsV1(document.sourceUnits))).toEqual({
      kind: "exported",
      text: source,
    });

    const first = sourceUnitAtV1(document.sourceUnits, 0);
    const second = sourceUnitAtV1(document.sourceUnits, 1);
    expect(document.exportTranslation([
      {
        unitId: first.unitId,
        target: "⟦SM:1⟧⟦SM:2⟧你好，⟦SM:3⟧⟦SM:4⟧⟦SM:5⟧第二行",
      },
      { unitId: second.unitId, target: "暂时再见" },
    ])).toEqual({
      kind: "exported",
      text: source
        .replace(
          "{\\an8}<i>Hello {name}</i>\\NSecond line",
          "{\\an8}<i>你好，{name}</i>\\N第二行",
        )
        .replace("Goodbye, for now", "暂时再见"),
    });
    expect(document.exportTranslation([
      { unitId: first.unitId, target: "Dialogue without the ASS line-break token" },
      { unitId: second.unitId, target: second.source },
    ])).toEqual({
      kind: "rejected",
      reason: "protected_content_changed",
      unitId: first.unitId,
    });
    expect(source).toContain("{\\p1}m 0 0 l 10 0 10 10{\\p0}");
  });

  it("defines and preserves the exact SillyOS Translation JSON V1 schema", () => {
    const source = [
      "{",
      '  "schema": "sillyos.translation-document.v1",',
      '  "sourceLocale": "en",',
      '  "targetLocale": null,',
      '  "metadata": { "title": "Last Signal", "route": "night" },',
      '  "entries": [',
      '    { "id": "opening/1", "text": "Welcome, {player}.", "context": "Greeting", "locked": false, "metadata": { "speaker": "mira" } },',
      '    { "id": "opening/2", "text": "SIGNAL-7", "context": "Device ID", "locked": true, "metadata": { "speaker": "system", "priority": 2 } },',
      '    { "id": "opening/3", "text": "The receiver hums.<wait:600>", "context": "Narration", "locked": false, "metadata": {} }',
      "  ]",
      "}",
    ].join("\n");
    const document = roundTripV1(prepareTranslationDocumentV1({
      fileName: "scene.json",
      mediaType: "application/json",
      text: source,
    }));

    expect(document.format).toBe("sillyos_translation_json");
    expect(document.sourceUnits.map((unit) => unit.locator)).toEqual([
      "entries/opening~11/text",
      "entries/opening~13/text",
    ]);
    expect(document.sourceUnits.map((unit) => unit.context)).toEqual([
      "Greeting",
      "Narration",
    ]);
    expect(document.sourceUnits.map((unit) => unit.lineBreakPolicy)).toEqual([
      "flexible",
      "flexible",
    ]);
    expect(document.exportTranslation(unchangedTargetsV1(document.sourceUnits))).toEqual({
      kind: "exported",
      text: source,
    });
    const translatedTargets = document.sourceUnits.map((unit) => ({
      unitId: unit.unitId,
      target: unit.locator.endsWith("opening~11/text")
        ? "欢迎你，⟦SM:1⟧。\n请进。"
        : "接收机低声嗡鸣。⟦SM:1⟧",
    }));
    expect(document.exportTranslation(translatedTargets)).toEqual({
      kind: "rejected",
      reason: "invalid_target_locale",
      unitId: null,
    });
    const translated = document.exportTranslation(
      translatedTargets,
      { targetLocale: "zh-CN" },
    );
    expect(translated.kind).toBe("exported");
    if (translated.kind !== "exported") throw new Error("expected translated VN document");
    expect(JSON.parse(translated.text)).toEqual({
      schema: "sillyos.translation-document.v1",
      sourceLocale: "en",
      targetLocale: "zh-CN",
      metadata: { title: "Last Signal", route: "night" },
      entries: [
        {
          id: "opening/1",
          text: "欢迎你，{player}。\n请进。",
          context: "Greeting",
          locked: false,
          metadata: { speaker: "mira" },
        },
        {
          id: "opening/2",
          text: "SIGNAL-7",
          context: "Device ID",
          locked: true,
          metadata: { speaker: "system", priority: 2 },
        },
        {
          id: "opening/3",
          text: "接收机低声嗡鸣。<wait:600>",
          context: "Narration",
          locked: false,
          metadata: {},
        },
      ],
    });
    expect(translated.text).toContain('  "schema":');
    expect(document.exportTranslation(unchangedTargetsV1(document.sourceUnits), {
      targetLocale: " ",
    })).toEqual({ kind: "rejected", reason: "invalid_target_locale", unitId: null });
  });

  it("does not promise export for undeclared, conflicting, malformed, or binary inputs", () => {
    expect(prepareTranslationDocumentV1({ text: "A readable unknown document" })).toMatchObject({
      format: "unknown",
      capability: { grade: "generic_text_only", reason: "format_not_declared" },
      exportTranslation: null,
    });
    expect(prepareTranslationDocumentV1({
      fileName: "notes.md",
      mediaType: "application/json",
      text: "# Parseable Markdown",
    })).toMatchObject({
      format: "markdown",
      capability: { grade: "round_trip_supported", reason: "known_format" },
    });
    expect(prepareTranslationDocumentV1({
      fileName: "broken.srt",
      mediaType: "application/json",
      text: "not valid SRT or JSON",
    })).toMatchObject({
      format: "unknown",
      capability: { grade: "ambiguous", reason: "format_hints_conflict" },
      exportTranslation: null,
    });
    expect(prepareTranslationDocumentV1({
      fileName: "broken.srt",
      text: "1\nnot a timing line\nHello",
    })).toMatchObject({
      format: "subrip",
      capability: { grade: "ambiguous", reason: "malformed_subrip" },
      exportTranslation: null,
    });
    expect(prepareTranslationDocumentV1({
      fileName: "broken.vtt",
      text: "WEBVTT\n\n00:01.000 --> not-a-time\nHello",
    })).toMatchObject({
      format: "webvtt",
      capability: { grade: "ambiguous", reason: "malformed_webvtt" },
      exportTranslation: null,
    });
    expect(prepareTranslationDocumentV1({
      fileName: "broken.ass",
      text: "[Events]\nDialogue: 0,0:00:01.00,0:00:02.00,Default,,,,,Hello",
    })).toMatchObject({
      format: "advanced_substation_alpha",
      capability: {
        grade: "ambiguous",
        reason: "malformed_advanced_substation_alpha",
      },
      exportTranslation: null,
    });
    expect(prepareTranslationDocumentV1({
      fileName: "unknown.json",
      text: JSON.stringify({ title: "Not the SillyOS schema" }),
    })).toEqual({
      format: "sillyos_translation_json",
      capability: { grade: "unsupported", reason: "malformed_sillyos_translation_json" },
      sourceUnits: [],
      exportTranslation: null,
    });
    expect(prepareTranslationDocumentV1({
      fileName: "asset.bin",
      mediaType: "application/octet-stream",
      text: "decoded bytes are not a declared text format",
    })).toEqual({
      format: "unknown",
      capability: { grade: "unsupported", reason: "non_text_media_type" },
      sourceUnits: [],
      exportTranslation: null,
    });
  });

  it("reports reserved-token collisions and malformed Markdown as ambiguous", () => {
    expect(prepareTranslationDocumentV1({
      fileName: "collision.txt",
      text: "Literal ⟦SM:1⟧ belongs to the author.",
    })).toMatchObject({
      capability: { grade: "ambiguous", reason: "protected_token_namespace_collision" },
      sourceUnits: [{ source: "Literal ⟦SM:1⟧ belongs to the author." }],
      exportTranslation: null,
    });
    expect(prepareTranslationDocumentV1({
      fileName: "broken.md",
      text: "Intro\n\n```ts\nconst open = true;\n",
    })).toMatchObject({
      capability: { grade: "ambiguous", reason: "malformed_markdown" },
      exportTranslation: null,
    });
  });

  it("matches the original four-format corpus projection and unchanged export oracle", async () => {
    const cases = [
      {
        fileName: "brief.zh-CN.txt",
        format: "plain_text",
        locators: ["line/1", "line/3", "line/5", "line/7"],
        protected: [
          ["placeholder", "{stationName}"],
          ["placeholder", "{{signal_count}}"],
          ["link", "control-room@example.test"],
          ["placeholder", "<KEEP:SYNC-07>"],
        ],
      },
      {
        fileName: "release-guide.zh-CN.md",
        format: "markdown",
        locators: [
          "line/1",
          "line/3",
          "line/5",
          "line/6",
          "line/7",
          "line/9",
          "line/11",
          "line/12",
          "line/14",
        ],
        protected: [
          ["markdown_code", "`v2.4.0`"],
          ["markdown_syntax", "**"],
          ["markdown_syntax", "**"],
          ["markdown_syntax", "_"],
          ["markdown_syntax", "_"],
          ["markdown_code", "`{captainName}`"],
          ["markdown_code", "`%SIGNAL_ID%`"],
          ["link", "["],
          ["link", "](https://example.test/console?mode=safe)"],
          ["markdown_syntax", "|"],
          ["markdown_syntax", "|"],
          ["markdown_syntax", "|"],
          ["markdown_syntax", "|"],
          ["markdown_syntax", "|"],
          ["markdown_syntax", "|"],
          ["markdown_syntax", "|"],
          ["markdown_syntax", "|"],
          ["markdown_code", "`channel.open()`"],
          ["markdown_syntax", "|"],
          ["markup_tag", '<notice data-code="ORBIT-3">'],
          ["markup_tag", "</notice>"],
        ],
      },
      {
        fileName: "platform-night.zh-CN.srt",
        format: "subrip",
        locators: [
          "cue/1/line/1/speaker",
          "cue/1/line/1/text",
          "cue/2/line/1/speaker",
          "cue/2/line/1/text",
          "cue/3/line/1",
          "cue/4/line/1/speaker",
          "cue/4/line/1/text",
        ],
        protected: [
          ["markup_tag", "<i>"],
          ["placeholder", "{ticketCode}"],
          ["markup_tag", "</i>"],
        ],
      },
      {
        fileName: "station-dialogue.zh-CN.json",
        format: "sillyos_translation_json",
        locators: [
          "entries/station.shift.001/text",
          "entries/station.shift.003/text",
        ],
        protected: [
          ["placeholder", "{operatorName}"],
          ["markup_tag", "<wait:600>"],
        ],
      },
    ] as const;

    for (const fixture of cases) {
      const source = await corpusTextV1(fixture.fileName);
      const document = roundTripV1(prepareTranslationDocumentV1({
        fileName: fixture.fileName,
        text: source,
      }));
      expect(document.format).toBe(fixture.format);
      expect(document.sourceUnits.map((unit) => unit.unitId)).toEqual(
        fixture.locators.map((_, index) =>
          `translation.unit.${String(index + 1).padStart(6, "0")}`
        ),
      );
      expect(document.sourceUnits.map((unit) => unit.locator)).toEqual(fixture.locators);
      expect(
        document.sourceUnits.flatMap((unit) =>
          unit.protectedSegments.map((segment) => [segment.kind, segment.source])
        ),
      ).toEqual(fixture.protected);
      expect(document.exportTranslation(unchangedTargetsV1(document.sourceUnits))).toEqual({
        kind: "exported",
        text: source,
      });
    }
  });
});
