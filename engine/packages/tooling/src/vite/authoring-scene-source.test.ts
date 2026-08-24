// SPDX-License-Identifier: MIT
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import type { ModuleNode, Plugin, PluginOption } from "vite";

import type { StorySceneSourceV1 } from "../project/config-types.ts";
import { createSillymakerAppViteConfigV1 } from "./app-vite-config.ts";
import { authoringSceneSourcePluginInternalV1 } from "./authoring-scene-source.ts";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function temporaryRootV1(): string {
  const root = mkdtempSync(join(tmpdir(), "sillymaker-authoring-scene-source-"));
  temporaryRoots.push(root);
  return root;
}

function sourceTextV1(sceneId: string, contentId = "content.example.hero"): string {
  return `${
    JSON.stringify({
      format: "sillymaker.authoring-scene",
      version: 1,
      sceneId,
      label: "Opening",
      canvas: { width: 1280, height: 720 },
      layers: [{
        layerId: "layer.example.main",
        label: "Main",
        roots: [{
          objectId: "tag.hero",
          label: "Hero",
          visual: { contentId },
        }],
      }],
      cues: [],
    })
  }\n`;
}

function sceneSourcesV1(): readonly StorySceneSourceV1[] {
  return Object.freeze([
    Object.freeze({
      sceneId: "scene.example.opening",
      specifier: "#sillymaker/scene/opening",
      sourceKind: "authoring_scene" as const,
      source: "src/scenes/opening.authoring-scene.json",
    }),
    Object.freeze({
      sceneId: "scene.example.advanced",
      specifier: "#sillymaker/scene/advanced",
      sourceKind: "low_level_scene" as const,
    }),
  ]);
}

function resolvePluginIdV1(plugin: Plugin, source: string): string | null {
  if (typeof plugin.resolveId !== "function") throw new TypeError("resolveId hook missing");
  return (plugin.resolveId as unknown as (source: string) => string | null).call({}, source);
}

function loadPluginModuleV1(
  plugin: Plugin,
  id: string,
  watched: string[] = [],
): string {
  if (typeof plugin.load !== "function") throw new TypeError("load hook missing");
  const result =
    (plugin.load as unknown as (this: { addWatchFile(path: string): void }, id: string) =>
      | string
      | null).call({ addWatchFile: (path) => watched.push(path) }, id);
  if (typeof result !== "string") throw new TypeError(`virtual module ${id} did not load`);
  return result;
}

function flattenPluginsV1(options: readonly PluginOption[]): Plugin[] {
  const plugins: Plugin[] = [];
  for (const option of options) {
    if (Array.isArray(option)) {
      plugins.push(...flattenPluginsV1(option));
    } else if (option !== false && option !== null && option !== undefined) {
      plugins.push(option as Plugin);
    }
  }
  return plugins;
}

describe("authoringSceneSourcePluginInternalV1", () => {
  it("routes only explicit authoring specifiers and emits the runtime plan", () => {
    const appRoot = temporaryRootV1();
    const sourceFile = join(appRoot, "src", "scenes", "opening.authoring-scene.json");
    mkdirSync(join(appRoot, "src", "scenes"), { recursive: true });
    writeFileSync(sourceFile, sourceTextV1("scene.example.opening"));
    const plugin = authoringSceneSourcePluginInternalV1({
      appRoot,
      sceneSources: sceneSourcesV1(),
    });

    const virtualId = resolvePluginIdV1(plugin, "#sillymaker/scene/opening");
    expect(virtualId).toMatch(/^\0sillymaker:authoring-scene-source:/u);
    expect(resolvePluginIdV1(plugin, "#sillymaker/scene/advanced")).toBeNull();
    expect(resolvePluginIdV1(plugin, "#sillymaker/scene/unknown")).toBeNull();

    const watched: string[] = [];
    const generated = loadPluginModuleV1(plugin, virtualId!, watched);
    expect(watched).toEqual([sourceFile]);
    expect(generated).toContain("export const sceneRuntimePlanV1");
    expect(generated).toContain('"sceneId":"scene.example.opening"');
    expect(generated).toContain('"contentId":"content.example.hero"');
    for (
      const authoringOnlyMarker of [
        "compileAuthoringScene",
        "admitAuthoringScene",
        '"inspection"',
        '"sourceMap"',
        '"objectTargets"',
        '"jsonPointer"',
        sourceFile,
      ]
    ) {
      expect(generated).not.toContain(authoringOnlyMarker);
    }
  });

  it("fails the exact source boundary for invalid input or a different scene ID", () => {
    const appRoot = temporaryRootV1();
    const sourceFile = join(appRoot, "opening.authoring-scene.json");
    const binding = Object.freeze({
      sceneId: "scene.example.opening",
      specifier: "#sillymaker/scene/opening",
      sourceKind: "authoring_scene" as const,
      source: "opening.authoring-scene.json",
    });
    const plugin = authoringSceneSourcePluginInternalV1({ appRoot, sceneSources: [binding] });
    const virtualId = resolvePluginIdV1(plugin, binding.specifier)!;

    writeFileSync(sourceFile, "{invalid json\n");
    expect(() => loadPluginModuleV1(plugin, virtualId)).toThrow("authoring_scene_json_invalid");

    writeFileSync(sourceFile, sourceTextV1("scene.example.other"));
    expect(() => loadPluginModuleV1(plugin, virtualId)).toThrow(
      "authoring_scene_source.scene_id_mismatch",
    );
  });

  it("invalidates only virtual modules backed by the changed source", () => {
    const appRoot = temporaryRootV1();
    const sceneSources = [
      {
        sceneId: "scene.example.first",
        specifier: "#sillymaker/scene/first",
        sourceKind: "authoring_scene" as const,
        source: "src/scenes/first.authoring-scene.json",
      },
      {
        sceneId: "scene.example.second",
        specifier: "#sillymaker/scene/second",
        sourceKind: "authoring_scene" as const,
        source: "src/scenes/second.authoring-scene.json",
      },
    ] as const;
    const plugin = authoringSceneSourcePluginInternalV1({ appRoot, sceneSources });
    const firstId = resolvePluginIdV1(plugin, sceneSources[0].specifier)!;
    const secondId = resolvePluginIdV1(plugin, sceneSources[1].specifier)!;
    const firstModule = { id: firstId } as ModuleNode;
    const secondModule = { id: secondId } as ModuleNode;
    const modules = new Map([
      [firstId, firstModule],
      [secondId, secondModule],
    ]);
    const invalidated: ModuleNode[] = [];
    if (typeof plugin.handleHotUpdate !== "function") {
      throw new TypeError("handleHotUpdate hook missing");
    }

    const affected = (plugin.handleHotUpdate as unknown as (context: unknown) => ModuleNode[]).call(
      {},
      {
        file: join(appRoot, sceneSources[0].source),
        timestamp: 123,
        modules: [],
        read: () => sourceTextV1(sceneSources[0].sceneId),
        server: {
          moduleGraph: {
            getModuleById: (id: string) => modules.get(id),
            invalidateModule: (module: ModuleNode) => invalidated.push(module),
          },
        },
      },
    );

    expect(invalidated).toEqual([firstModule]);
    expect(affected).toEqual([firstModule]);
  });

  it("is wired into the app Vite assembly only for authoring bindings", async () => {
    const appRoot = temporaryRootV1();
    const viteConfig = await createSillymakerAppViteConfigV1({
      appRoot,
      config: {
        applicationId: "example-app",
        label: "Example app",
        storyEntry: { module: "src/story.ts", exportName: "storyV1" },
        assetVerification: false,
        sceneSources: sceneSourcesV1(),
        web: {
          applicationHtml: "index.html",
          applicationEntry: "src/application/entry.tsx",
          base: "./",
          sourcemap: false,
          identity: null,
        },
      },
    });

    expect(
      flattenPluginsV1(viteConfig.plugins ?? []).filter((plugin) =>
        plugin.name === "sillymaker:authoring-scene-source"
      ),
    ).toHaveLength(1);
  });
});
