// SPDX-License-Identifier: MIT
import type { MotionDocumentV1 } from "@sillymaker/base";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

/**
 * The shell's motion-source loading: enumerate the project's motion
 * documents from the dev server's Project Authoring Index (list) and fetch
 * each document (read). Nothing is registered by hand — a new
 * `*.motion.json` in the story tree is discovered by convention — and
 * nothing disappears silently: index skips and read failures come back as
 * authoring warnings for the diagnostics panel.
 */

export interface StudioLoadedMotionV1 {
  readonly path: string;
  readonly motionDocument: MotionDocumentV1;
}

export interface StudioMotionSourcesV1 {
  readonly sources: readonly StudioLoadedMotionV1[];
  readonly warnings: readonly string[];
}

export async function loadStudioMotionSourcesV1(
  io: MotionSourceIoV1,
): Promise<StudioMotionSourcesV1> {
  const listed = await io.list();
  if (listed.kind !== "ok") {
    return Object.freeze({
      sources: Object.freeze([]),
      warnings: Object.freeze([`motion 列表不可用：${listed.code}`]),
    });
  }
  const warnings: string[] = listed.skipped.map(
    (skip) => `motion 文档未索引（${skip.path}）：${skip.reason}`,
  );
  const sources: StudioLoadedMotionV1[] = [];
  const reads = await Promise.all(listed.motions.map((entry) => io.read(entry.path)));
  for (const [index, read] of reads.entries()) {
    const entry = listed.motions[index];
    if (entry === undefined) continue;
    if (read.kind !== "ok") {
      warnings.push(`motion 文档读取失败（${entry.path}）：${read.code}`);
      continue;
    }
    sources.push(Object.freeze({ path: entry.path, motionDocument: read.motionDocument }));
  }
  return Object.freeze({
    sources: Object.freeze(sources),
    warnings: Object.freeze(warnings),
  });
}
