// SPDX-License-Identifier: MIT
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  admitAuthoringSceneSourceBytesV1,
  compileAuthoringSceneV1,
} from "@sillymaker/base/authoring/scene";
import type { ModuleNode, Plugin } from "vite";

import type { StorySceneSourceV1 } from "../project/config-types.ts";

type AuthoringSceneSourceBindingV1 = Extract<
  StorySceneSourceV1,
  { readonly sourceKind: "authoring_scene" }
>;

interface ResolvedAuthoringSceneSourceV1 {
  readonly binding: AuthoringSceneSourceBindingV1;
  readonly sourceFile: string;
  readonly virtualId: string;
}

export interface AuthoringSceneSourcePluginInputInternalV1 {
  readonly appRoot: string;
  /** Already admitted application scene bindings. */
  readonly sceneSources: readonly StorySceneSourceV1[];
}

function virtualIdV1(specifier: string): string {
  return `\0sillymaker:authoring-scene-source:${encodeURIComponent(specifier)}.ts`;
}

function runtimeModuleSourceV1(record: ResolvedAuthoringSceneSourceV1): string {
  const compiled = compileAuthoringSceneV1(
    admitAuthoringSceneSourceBytesV1(readFileSync(record.sourceFile)),
  );
  if (compiled.runtimePlan.sceneDocument.sceneId !== record.binding.sceneId) {
    throw new TypeError(
      `authoring_scene_source.scene_id_mismatch: configured ${record.binding.sceneId}, source declares ${compiled.runtimePlan.sceneDocument.sceneId}`,
    );
  }
  return `export const sceneRuntimePlanV1 = ${JSON.stringify(compiled.runtimePlan)};\n`;
}

/**
 * @internal Build-known Authoring Scene compiler. Only explicitly bound
 * `authoring_scene` package imports are intercepted; low-level scene modules
 * keep resolving through the application's normal module graph.
 */
export function authoringSceneSourcePluginInternalV1(
  input: AuthoringSceneSourcePluginInputInternalV1,
): Plugin {
  const appRoot = resolve(input.appRoot);
  const records = input.sceneSources
    .filter((source): source is AuthoringSceneSourceBindingV1 =>
      source.sourceKind === "authoring_scene"
    )
    .map((binding): ResolvedAuthoringSceneSourceV1 =>
      Object.freeze({
        binding,
        sourceFile: resolve(appRoot, binding.source),
        virtualId: virtualIdV1(binding.specifier),
      })
    );
  const bySpecifier = new Map(records.map((record) => [record.binding.specifier, record] as const));
  const byVirtualId = new Map(records.map((record) => [record.virtualId, record] as const));
  const bySourceFile = new Map<string, ResolvedAuthoringSceneSourceV1[]>();
  for (const record of records) {
    const current = bySourceFile.get(record.sourceFile) ?? [];
    current.push(record);
    bySourceFile.set(record.sourceFile, current);
  }

  return {
    name: "sillymaker:authoring-scene-source",
    enforce: "pre",
    resolveId(source) {
      return bySpecifier.get(source)?.virtualId ?? null;
    },
    load(id) {
      const record = byVirtualId.get(id);
      if (record === undefined) return null;
      this.addWatchFile(record.sourceFile);
      return runtimeModuleSourceV1(record);
    },
    handleHotUpdate(context) {
      const changed = bySourceFile.get(resolve(context.file));
      if (changed === undefined) return undefined;
      const invalidated = new Set<ModuleNode>();
      const affected: ModuleNode[] = [];
      for (const record of changed) {
        const module = context.server.moduleGraph.getModuleById(record.virtualId);
        if (module === undefined) continue;
        context.server.moduleGraph.invalidateModule(
          module,
          invalidated,
          context.timestamp,
          true,
        );
        affected.push(module);
      }
      return affected;
    },
  };
}
