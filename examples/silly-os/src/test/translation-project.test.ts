// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitTranslationProjectV1,
  createTranslationProjectV1,
  projectTranslationProgressV1,
  readTranslationProjectRowWindowV1,
  type TranslationProjectV1,
} from "../product/translation/translation-project.ts";
import {
  prepareTranslationDocumentV1,
  type PreparedTranslationDocumentV1,
} from "../product/translation/translation-document-codec.ts";

function createProjectV1(document: PreparedTranslationDocumentV1): TranslationProjectV1 {
  return createTranslationProjectV1({
    projectId: "translation.project.sound-check",
    title: "Sound Check",
    document,
    sourceLocale: "zh-CN",
    targetLocale: "en",
    documentPurpose: "Dialogue for a fictional visual novel.",
    style: "Natural, concise dialogue.",
    glossary: [{ source: "回声", target: "Echo", note: "Project codename.", locked: true }],
  });
}

function jsonCloneV1<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function requireAdmittedV1(value: unknown): TranslationProjectV1 {
  const admitted = admitTranslationProjectV1(value);
  expect(admitted.kind).toBe("admitted");
  if (admitted.kind !== "admitted") throw new Error(`project rejected at ${admitted.path}`);
  return admitted.project;
}

function tenThousandUnitProjectV1(): TranslationProjectV1 {
  const source = Array.from(
    { length: 10_000 },
    (_unused, index) => `第 ${String(index + 1)} 行等待翻译。`,
  ).join("\n");
  const document = prepareTranslationDocumentV1({
    fileName: "large-script.txt",
    mediaType: "text/plain; charset=utf-8",
    text: source,
  });
  expect(document.sourceUnits).toHaveLength(10_000);
  return createProjectV1(document);
}

function withCommittedPrefixV1(
  project: TranslationProjectV1,
  committedUnitCount: number,
): TranslationProjectV1 {
  const batchId = "translation.batch.first";
  const candidate = jsonCloneV1(project) as unknown as {
    revision: number;
    units: Array<Record<string, unknown>>;
    committedBatchIds: string[];
    committedUnitCount: number;
  };
  candidate.revision = 2;
  candidate.committedBatchIds = [batchId];
  candidate.committedUnitCount = committedUnitCount;
  for (let index = 0; index < committedUnitCount; index += 1) {
    const unit = candidate.units[index];
    if (unit === undefined) throw new Error(`missing unit ${String(index)}`);
    unit.target = `Translated row ${String(index + 1)}.`;
    unit.committedBatchId = batchId;
  }
  return requireAdmittedV1(candidate);
}

function guardedUnitsV1(
  units: TranslationProjectV1["units"],
  readableIndexes: ReadonlySet<number>,
): TranslationProjectV1["units"] {
  return new Proxy(units, {
    get(target, property, receiver) {
      if (typeof property === "string" && /^(?:0|[1-9]\d*)$/u.test(property)) {
        const index = Number(property);
        if (!readableIndexes.has(index)) {
          throw new Error(`unexpected unit access ${property}`);
        }
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

describe("SillyOS Translation Project", () => {
  it("creates the formal initial Project from a prepared document with stable units", () => {
    const document = prepareTranslationDocumentV1({
      fileName: "opening.txt",
      text: "欢迎回来，{name}。\n回声正在接近。",
    });
    const glossary = [
      { source: "回声", target: "Echo", note: "Project codename.", locked: true },
    ];
    const project = createTranslationProjectV1({
      projectId: "translation.project.opening",
      title: "Opening",
      document,
      sourceLocale: "zh-CN",
      targetLocale: "en",
      documentPurpose: "Opening scene.",
      style: "Natural dialogue.",
      glossary,
    });

    expect(project).toMatchObject({
      schemaVersion: 1,
      projectId: "translation.project.opening",
      title: "Opening",
      revision: 1,
      document: {
        format: "plain_text",
        capabilityGrade: "round_trip_supported",
        capabilityReason: "known_format",
      },
      sourceLocale: "zh-CN",
      targetLocale: "en",
      documentPurpose: "Opening scene.",
      style: "Natural dialogue.",
      committedBatchIds: [],
      committedUnitCount: 0,
    });
    expect(project.units.map((unit) => ({ unitId: unit.unitId, order: unit.order }))).toEqual(
      document.sourceUnits.map((unit) => ({ unitId: unit.unitId, order: unit.order })),
    );
    expect(project.units.every((unit) => unit.target === null && unit.committedBatchId === null))
      .toBe(true);
    expect(project.units[0]?.protectedSegments).toEqual(document.sourceUnits[0]?.protectedSegments);

    glossary[0]!.target = "Changed after creation";
    (document.sourceUnits[0] as { source: string }).source = "Changed after creation";
    expect(project.glossary[0]?.target).toBe("Echo");
    expect(project.units[0]?.source).not.toBe("Changed after creation");
  });

  it("admits and deeply clones the complete serializable Project schema", () => {
    const project = createProjectV1(prepareTranslationDocumentV1({
      fileName: "line.txt",
      text: "欢迎回来，{name}。",
    }));
    const candidate = jsonCloneV1(project) as unknown as {
      glossary: Array<{ target: string }>;
      units: Array<{
        source: string;
        protectedSegments: Array<{ source: string }>;
      }>;
    };
    const admitted = requireAdmittedV1(candidate);

    candidate.glossary[0]!.target = "Changed";
    candidate.units[0]!.source = "Changed";
    candidate.units[0]!.protectedSegments[0]!.source = "Changed";
    expect(admitted.glossary[0]?.target).toBe("Echo");
    expect(admitted.units[0]?.source).toContain("⟦SM:1⟧");
    expect(admitted.units[0]?.protectedSegments[0]?.source).toBe("{name}");
    expect(admitted.glossary).not.toBe(candidate.glossary);
    expect(admitted.units).not.toBe(candidate.units);
    expect(admitted.units[0]?.protectedSegments).not.toBe(candidate.units[0]?.protectedSegments);
  });

  it("preserves meaningful target boundary whitespace admitted by the batch contract", () => {
    const project = createProjectV1(prepareTranslationDocumentV1({
      fileName: "line.txt",
      text: "欢迎回来。",
    }));
    const candidate = jsonCloneV1(project) as unknown as {
      revision: number;
      committedBatchIds: string[];
      committedUnitCount: number;
      units: Array<{ target: string | null; committedBatchId: string | null }>;
    };
    candidate.revision = 2;
    candidate.committedBatchIds = ["translation.batch.boundary-space"];
    candidate.committedUnitCount = 1;
    candidate.units[0]!.target = " Welcome back. ";
    candidate.units[0]!.committedBatchId = "translation.batch.boundary-space";

    expect(requireAdmittedV1(candidate).units[0]?.target).toBe(" Welcome back. ");
  });

  it("reads only the requested window from a 10,000-unit Project", () => {
    const project = tenThousandUnitProjectV1();
    const readableIndexes = new Set([9_990, 9_991, 9_992, 9_993, 9_994]);
    const guardedProject: TranslationProjectV1 = {
      ...project,
      units: guardedUnitsV1(project.units, readableIndexes),
    };

    const window = readTranslationProjectRowWindowV1(guardedProject, {
      offset: 9_990,
      limit: 5,
    });

    expect(window).toMatchObject({
      offset: 9_990,
      limit: 5,
      totalRowCount: 10_000,
      nextOffset: 9_995,
    });
    expect(window.rows).toHaveLength(5);
    expect(window.rows.map((row) => row.order)).toEqual([9_990, 9_991, 9_992, 9_993, 9_994]);
    expect(window.rows[0]).not.toBe(project.units[9_990]);
    expect(window.rows[0]?.protectedSegments).not.toBe(project.units[9_990]?.protectedSegments);
  });

  it("projects progress without visiting the 10,000 unit rows", () => {
    const project = withCommittedPrefixV1(tenThousandUnitProjectV1(), 7_500);
    const guardedProject: TranslationProjectV1 = {
      ...project,
      units: guardedUnitsV1(project.units, new Set()),
    };

    expect(projectTranslationProgressV1(guardedProject)).toEqual({
      phase: "in_progress",
      totalUnitCount: 10_000,
      committedUnitCount: 7_500,
      pendingUnitCount: 2_500,
      committedBatchCount: 1,
      completionRatio: 0.75,
    });
  });

  it("rejects duplicate identities, changed order, duplicate batches, and stale progress", () => {
    const project = createProjectV1(prepareTranslationDocumentV1({
      fileName: "two-lines.txt",
      text: "第一行。\n第二行。",
    }));
    const duplicateUnit = jsonCloneV1(project) as unknown as {
      units: Array<{ unitId: string }>;
    };
    duplicateUnit.units[1]!.unitId = duplicateUnit.units[0]!.unitId;
    expect(admitTranslationProjectV1(duplicateUnit)).toMatchObject({
      kind: "rejected",
      reason: "duplicate_unit",
      path: "/units/1/unitId",
    });

    const changedOrder = jsonCloneV1(project) as unknown as {
      units: Array<{ order: number }>;
    };
    changedOrder.units[1]!.order = 7;
    expect(admitTranslationProjectV1(changedOrder)).toMatchObject({
      kind: "rejected",
      reason: "unit_order_changed",
      path: "/units/1/order",
    });

    const committed = jsonCloneV1(withCommittedPrefixV1(project, 1)) as unknown as {
      committedBatchIds: string[];
    };
    committed.committedBatchIds.push(committed.committedBatchIds[0]!);
    expect(admitTranslationProjectV1(committed)).toMatchObject({
      kind: "rejected",
      reason: "duplicate_batch",
      path: "/committedBatchIds/1",
    });

    const staleProgress = jsonCloneV1(withCommittedPrefixV1(project, 1)) as {
      committedUnitCount: number;
    };
    staleProgress.committedUnitCount = 2;
    expect(admitTranslationProjectV1(staleProgress)).toMatchObject({
      kind: "rejected",
      reason: "progress_mismatch",
      path: "/committedUnitCount",
    });
  });

  it("rejects invalid row windows without introducing a page-size ceiling", () => {
    const project = createProjectV1(prepareTranslationDocumentV1({
      fileName: "line.txt",
      text: "One line.",
    }));
    expect(() => readTranslationProjectRowWindowV1(project, { offset: -1, limit: 1 }))
      .toThrow("invalid_offset");
    expect(() => readTranslationProjectRowWindowV1(project, { offset: 0, limit: 0 }))
      .toThrow("invalid_limit");
    expect(readTranslationProjectRowWindowV1(project, { offset: 1, limit: 100_000 })).toEqual({
      offset: 1,
      limit: 100_000,
      totalRowCount: 1,
      rows: [],
      nextOffset: null,
    });
  });
});
