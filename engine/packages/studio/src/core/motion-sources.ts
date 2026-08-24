// SPDX-License-Identifier: MIT
import { motionDefinitionFromDocumentV1 } from "@sillymaker/base";
import type { MotionDefinitionV1 } from "@sillymaker/base";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

export interface InspectorMotionSourcesV1 {
  readonly definitions: ReadonlyMap<string, MotionDefinitionV1>;
  readonly warnings: readonly string[];
}

/**
 * Resolves only Motion documents referenced by the current Authoring Scene.
 * Project metadata remains small; unrelated Motion ASTs never enter Inspector
 * memory merely because they exist in the application.
 */
export async function loadInspectorMotionSourcesV1(
  io: MotionSourceIoV1,
  referencedMotionIds: readonly string[],
): Promise<InspectorMotionSourcesV1> {
  const requested = new Set(referencedMotionIds);
  if (requested.size === 0) return { definitions: new Map(), warnings: [] };
  const listed = await io.list();
  if (listed.kind !== "ok") {
    return {
      definitions: new Map(),
      warnings: [`motion 列表不可用：${listed.code}`],
    };
  }
  const metadataById = new Map(listed.motions.map((entry) => [entry.motionId, entry] as const));
  const warnings = listed.skipped.map(
    (skip) => `motion 文档未索引（${skip.path}）：${skip.reason}`,
  );
  const definitions = new Map<string, MotionDefinitionV1>();
  const reads = await Promise.all([...requested].map(async (motionId) => {
    const metadata = metadataById.get(motionId);
    if (metadata === undefined) return { motionId, kind: "missing" as const };
    return { motionId, metadata, result: await io.read(metadata.path), kind: "read" as const };
  }));
  for (const read of reads) {
    if (read.kind === "missing") {
      warnings.push(`motion 引用未找到：${read.motionId}`);
      continue;
    }
    if (read.result.kind !== "ok") {
      warnings.push(`motion 文档读取失败（${read.metadata.path}）：${read.result.code}`);
      continue;
    }
    definitions.set(
      read.motionId,
      motionDefinitionFromDocumentV1(read.result.motionDocument),
    );
  }
  return { definitions, warnings };
}
