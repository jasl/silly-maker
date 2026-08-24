// SPDX-License-Identifier: MIT
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { build } from "vite";
import { describe, expect, it } from "vitest";

import {
  buildDependencyMeasurementEnvironmentKeyInternalV1,
  classifyStaticGameDependencyFacetsInternalV1,
  createBuildDependencyReceiptInternalV1,
  normalizeBuildDependencyModuleIdInternalV1,
  parseBuildDependencyMeasurementRequestInternalV1,
  parseBuildDependencyReceiptInternalV1,
  serializeBuildDependencyMeasurementRequestInternalV1,
} from "./build-dependency-receipt.ts";
import type {
  BuildDependencyChunkInputInternalV1,
  BuildDependencyReceiptInternalV1,
} from "./build-dependency-receipt.ts";
import {
  embeddedAuthorEntryIdInternalV1,
  embeddedAuthorRuntimeIdInternalV1,
  studioAuthoringBuildMeasurementPluginInternalV1,
  studioEntryIdInternalV1,
} from "./studio.ts";

const repositoryRootV1 = resolve(fileURLToPath(new URL("../../../../..", import.meta.url)));
const templateMinimalInitialJavascriptGzipBudgetV1 = 360 * 1024;

function chunkV1(
  fileName: string,
  input: Partial<BuildDependencyChunkInputInternalV1> = {},
): BuildDependencyChunkInputInternalV1 {
  return Object.freeze({
    fileName,
    isEntry: false,
    isDynamicEntry: false,
    facadeModuleId: null,
    imports: Object.freeze([]),
    dynamicImports: Object.freeze([]),
    moduleIds: Object.freeze([]),
    importedCss: Object.freeze([]),
    importedAssets: Object.freeze([]),
    ...input,
  });
}

function receiptModuleIdsV1(receipt: BuildDependencyReceiptInternalV1): readonly string[] {
  return Object.freeze([
    ...new Set([
      ...receipt.chunks.flatMap(({ moduleIds }) => moduleIds),
      ...receipt.assets.flatMap(({ moduleIds }) => moduleIds),
    ]),
  ]);
}

function expectAuthoringEntryGraphV1(receipt: BuildDependencyReceiptInternalV1): void {
  expect(
    receipt.chunks.find(({ facadeModuleId }) =>
      facadeModuleId?.endsWith(studioEntryIdInternalV1) ?? false
    ),
  ).toMatchObject({
    isEntry: true,
    isDynamicEntry: false,
  });
  expect(
    receipt.chunks.find(({ facadeModuleId }) =>
      facadeModuleId?.endsWith(embeddedAuthorEntryIdInternalV1) ?? false
    ),
  ).toMatchObject({
    isEntry: true,
    isDynamicEntry: false,
  });
  expect(
    receipt.chunks.find(({ facadeModuleId }) =>
      facadeModuleId?.endsWith(embeddedAuthorRuntimeIdInternalV1) ?? false
    ),
  ).toMatchObject({
    isEntry: false,
    isDynamicEntry: true,
  });
}

async function measureAuthoringBuildGraphV1(input: {
  readonly appDirectory: "template" | "e2e";
  readonly studio: {
    readonly module: string;
    readonly exportName: string;
  };
}): Promise<BuildDependencyReceiptInternalV1> {
  const directory = await mkdtemp(
    join(tmpdir(), `sillymaker-${input.appDirectory}-authoring-build-graph-`),
  );
  const receiptPath = join(directory, "receipt.json");
  const previous = process.env[buildDependencyMeasurementEnvironmentKeyInternalV1];
  const previousNodeEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  process.env[buildDependencyMeasurementEnvironmentKeyInternalV1] =
    serializeBuildDependencyMeasurementRequestInternalV1({
      graphRoot: repositoryRootV1,
      receiptPath,
    });
  try {
    const output = await build({
      configFile: join(repositoryRootV1, input.appDirectory, "vite.config.ts"),
      mode: "development",
      logLevel: "silent",
      plugins: [studioAuthoringBuildMeasurementPluginInternalV1(input.studio)],
      build: {
        write: false,
        outDir: join(directory, "out"),
        emptyOutDir: true,
        rollupOptions: {
          input: {
            "studio-author": studioEntryIdInternalV1,
            "embedded-author": embeddedAuthorEntryIdInternalV1,
          },
        },
      },
    });
    if (!Array.isArray(output) && !("output" in output)) {
      throw new TypeError("Authoring measurement unexpectedly returned a build watcher");
    }
    return parseBuildDependencyReceiptInternalV1(await readFile(receiptPath, "utf8"));
  } finally {
    if (previous === undefined) {
      delete process.env[buildDependencyMeasurementEnvironmentKeyInternalV1];
    } else {
      process.env[buildDependencyMeasurementEnvironmentKeyInternalV1] = previous;
    }
    if (previousNodeEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnvironment;
    }
    await rm(directory, { force: true, recursive: true });
  }
}

async function measurePlayerEntryBuildGraphV1(input: {
  readonly appDirectory: "template";
  readonly entry: string;
}): Promise<BuildDependencyReceiptInternalV1> {
  const directory = await mkdtemp(
    join(tmpdir(), `sillymaker-${input.appDirectory}-player-entry-build-graph-`),
  );
  const receiptPath = join(directory, "receipt.json");
  const previous = process.env[buildDependencyMeasurementEnvironmentKeyInternalV1];
  const previousNodeEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  process.env[buildDependencyMeasurementEnvironmentKeyInternalV1] =
    serializeBuildDependencyMeasurementRequestInternalV1({
      graphRoot: repositoryRootV1,
      receiptPath,
    });
  try {
    const output = await build({
      configFile: join(repositoryRootV1, input.appDirectory, "vite.config.ts"),
      logLevel: "silent",
      build: {
        write: false,
        outDir: join(directory, "out"),
        emptyOutDir: true,
        rollupOptions: {
          input: join(repositoryRootV1, input.appDirectory, input.entry),
        },
      },
    });
    if (!Array.isArray(output) && !("output" in output)) {
      throw new TypeError("Player entry measurement unexpectedly returned a build watcher");
    }
    return parseBuildDependencyReceiptInternalV1(await readFile(receiptPath, "utf8"));
  } finally {
    if (previous === undefined) {
      delete process.env[buildDependencyMeasurementEnvironmentKeyInternalV1];
    } else {
      process.env[buildDependencyMeasurementEnvironmentKeyInternalV1] = previous;
    }
    if (previousNodeEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnvironment;
    }
    await rm(directory, { force: true, recursive: true });
  }
}

describe("build dependency receipt", () => {
  it("names dynamic facades and exposes application-mixed and contribution-shared chunks", () => {
    const graphRoot = resolve("synthetic-build-dependency-root");
    const receipt = createBuildDependencyReceiptInternalV1({
      applicationId: "synthetic",
      graphRoot,
      chunks: [
        chunkV1("assets/index.js", {
          isEntry: true,
          facadeModuleId: join(graphRoot, "index.html"),
          imports: ["assets/shared.js"],
          dynamicImports: [
            "assets/a.js",
            "assets/b.js",
            "assets/removed-css-only-entry.js",
          ],
          moduleIds: [join(graphRoot, "src", "entry.ts")],
        }),
        chunkV1("assets/a.js", {
          isDynamicEntry: true,
          facadeModuleId: join(graphRoot, "src", "contribution-a.ts"),
          imports: ["assets/shared.js", "assets/contribution-shared.js"],
          moduleIds: [join(graphRoot, "src", "contribution-a.ts")],
        }),
        chunkV1("assets/b.js", {
          isDynamicEntry: true,
          facadeModuleId: join(graphRoot, "src", "contribution-b.ts"),
          imports: ["assets/shared.js", "assets/contribution-shared.js"],
          moduleIds: [join(graphRoot, "src", "contribution-b.ts")],
        }),
        chunkV1("assets/shared.js", {
          moduleIds: [join(graphRoot, "src", "shared.ts?common")],
        }),
        chunkV1("assets/contribution-shared.js", {
          moduleIds: [join(graphRoot, "src", "contribution-shared.ts")],
        }),
      ],
      assets: [
        Object.freeze({
          fileName: "assets/global.css",
          moduleIds: Object.freeze([join(graphRoot, "src", "global.css")]),
          isEntry: false,
          dynamicEntryModuleIds: Object.freeze([join(graphRoot, "src", "global.css")]),
        }),
      ],
    });

    expect(receipt.chunks.find(({ fileName }) => fileName === "assets/index.js")).toMatchObject(
      {
        facadeModuleId: "index.html",
        dynamicImports: ["assets/a.js", "assets/b.js"],
        ownership: "application",
        contributionIds: [],
      },
    );
    expect(receipt.chunks.find(({ fileName }) => fileName === "assets/a.js")).toMatchObject({
      facadeModuleId: "src/contribution-a.ts",
      ownership: "contribution",
      contributionIds: ["src/contribution-a.ts"],
    });
    expect(receipt.chunks.find(({ fileName }) => fileName === "assets/shared.js")).toMatchObject({
      moduleIds: ["src/shared.ts?common"],
      ownership: "mixed",
      contributionIds: ["src/contribution-a.ts", "src/contribution-b.ts"],
    });
    expect(
      receipt.chunks.find(({ fileName }) => fileName === "assets/contribution-shared.js"),
    ).toMatchObject({
      ownership: "shared_contributions",
      contributionIds: ["src/contribution-a.ts", "src/contribution-b.ts"],
    });
    expect(receipt.assets).toEqual([
      {
        fileName: "assets/global.css",
        moduleIds: ["src/global.css"],
        owners: [{ kind: "contribution", id: "src/global.css" }],
        ownership: "contribution",
        contributionIds: ["src/global.css"],
      },
    ]);
    const outputFileNames = new Set([
      ...receipt.chunks.map(({ fileName }) => fileName),
      ...receipt.assets.map(({ fileName }) => fileName),
    ]);
    for (const chunk of receipt.chunks) {
      expect([
        ...chunk.imports,
        ...chunk.dynamicImports,
        ...chunk.importedCss,
        ...chunk.importedAssets,
      ].every((fileName) => outputFileNames.has(fileName))).toBe(true);
    }
    expect(parseBuildDependencyReceiptInternalV1(JSON.stringify(receipt))).toEqual(receipt);
    expect(
      normalizeBuildDependencyModuleIdInternalV1(
        graphRoot,
        `\0virtual:${join(graphRoot, "src", "generated.ts")}`,
      ),
    ).toBe("virtual:virtual:<graph-root>/src/generated.ts");
  });

  it("stays disabled by absence and admits only explicit OS-temp measurement paths", () => {
    expect(parseBuildDependencyMeasurementRequestInternalV1(undefined)).toBeNull();
    const request = Object.freeze({
      graphRoot: repositoryRootV1,
      receiptPath: join(tmpdir(), "sillymaker-build-dependency-test", "receipt.json"),
    });
    expect(
      parseBuildDependencyMeasurementRequestInternalV1(
        serializeBuildDependencyMeasurementRequestInternalV1(request),
      ),
    ).toEqual(request);
    expect(() =>
      serializeBuildDependencyMeasurementRequestInternalV1({
        graphRoot: repositoryRootV1,
        receiptPath: join(repositoryRootV1, "receipt.json"),
      })
    ).toThrow("must be inside the OS temporary directory");
  });

  it("classifies semantic static-game facets without freezing the complete graph", () => {
    expect(classifyStaticGameDependencyFacetsInternalV1([
      "products/neutral-gui/src/tooling/inspector.ts",
      "products/neutral-gui/src/authoring/flow-source.ts",
      "products/neutral-gui/src/presentation/tooling.ts",
      "engine/packages/base/src/index.ts",
      "engine/packages/base/src/authoring/story-resolver.ts",
      "engine/packages/base/src/authoring/authoring-scene.ts",
      "engine/packages/base/src/authoring/authoring-scene-compiler.ts",
      "products/neutral-gui/src/scenes/opening.authoring-scene.json",
      "engine/packages/studio/src/studio-app.tsx",
      "engine/packages/studio/src/workspaces/scene/scene-inspector.tsx",
      "engine/packages/ui/src/debug/dev-source-client.ts",
      "engine/packages/ui/src/debug/dev-dock.tsx",
      "engine/packages/ui/src/reference/default-settings-sections.tsx",
      "engine/packages/composition/src/extension-runtime/backend.ts",
      "engine/packages/agent/src/host/agent-host.ts",
      "engine/packages/agent/src/rpc/client.ts",
      "engine/packages/web/src/rpc/client.ts",
      "node_modules/dependency/src/tooling/index.ts",
      "products/neutral-gui/node_modules/dependency/src/authoring/index.ts",
      "virtual:products/neutral-gui/src/tooling/generated.ts",
    ])).toEqual({
      authoringImplementation: [
        "engine/packages/base/src/authoring/authoring-scene-compiler.ts",
        "engine/packages/base/src/authoring/authoring-scene.ts",
        "engine/packages/studio/src/studio-app.tsx",
        "engine/packages/studio/src/workspaces/scene/scene-inspector.tsx",
        "products/neutral-gui/src/authoring/flow-source.ts",
        "products/neutral-gui/src/scenes/opening.authoring-scene.json",
        "products/neutral-gui/src/tooling/inspector.ts",
      ],
      inspectorAuthoringImplementation: [
        "engine/packages/studio/src/workspaces/scene/scene-inspector.tsx",
      ],
      devSourceImplementation: ["engine/packages/ui/src/debug/dev-source-client.ts"],
      devDockImplementation: ["engine/packages/ui/src/debug/dev-dock.tsx"],
      presetSettingsImplementation: [
        "engine/packages/ui/src/reference/default-settings-sections.tsx",
      ],
      dynamicExtensionImplementation: [
        "engine/packages/composition/src/extension-runtime/backend.ts",
      ],
      agentImplementation: [
        "engine/packages/agent/src/host/agent-host.ts",
        "engine/packages/agent/src/rpc/client.ts",
      ],
      rpcImplementation: [
        "engine/packages/agent/src/rpc/client.ts",
        "engine/packages/web/src/rpc/client.ts",
      ],
    });
  });

  it("keeps the declared-Studio Template release graph free of unselected implementations", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sillymaker-template-build-graph-"));
    const receiptPath = join(directory, "receipt.json");
    const previous = process.env[buildDependencyMeasurementEnvironmentKeyInternalV1];
    const previousNodeEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env[buildDependencyMeasurementEnvironmentKeyInternalV1] =
      serializeBuildDependencyMeasurementRequestInternalV1({
        graphRoot: repositoryRootV1,
        receiptPath,
      });
    try {
      const output = await build({
        configFile: join(repositoryRootV1, "template", "vite.config.ts"),
        logLevel: "silent",
        build: {
          write: false,
          outDir: join(directory, "out"),
          emptyOutDir: true,
        },
      });
      if (!Array.isArray(output) && !("output" in output)) {
        throw new TypeError("Template measurement unexpectedly returned a build watcher");
      }
      const generatedOutputs = (Array.isArray(output) ? output : [output]).flatMap(
        ({ output: buildOutputs }) => buildOutputs,
      );
      const bundleFileNames = generatedOutputs.map(({ fileName }) => fileName);
      expect(bundleFileNames).not.toContain("receipt.json");
      const serialized = await readFile(receiptPath, "utf8");
      const receipt = parseBuildDependencyReceiptInternalV1(serialized);
      expect(receipt.applicationId).toBe("template");
      expect(serialized).not.toContain(repositoryRootV1);
      expect(receipt.chunks.some(({ isEntry }) => isEntry)).toBe(true);
      expect([
        ...receipt.chunks.map(({ fileName }) => fileName),
        ...receipt.assets.map(({ fileName }) => fileName),
      ].sort()).toEqual([...bundleFileNames].sort());
      const outputFileNames = new Set(bundleFileNames);
      for (const chunk of receipt.chunks) {
        expect([
          ...chunk.imports,
          ...chunk.dynamicImports,
          ...chunk.importedCss,
          ...chunk.importedAssets,
        ].every((fileName) => outputFileNames.has(fileName))).toBe(true);
      }
      expect(
        receipt.assets.find(({ moduleIds }) =>
          moduleIds.includes("engine/packages/ui/src/theme/global.css")
        ),
      ).toMatchObject({
        ownership: "contribution",
        contributionIds: ["engine/packages/ui/src/theme/global.css"],
      });
      const moduleIds = [
        ...receipt.chunks.flatMap(({ moduleIds: chunkModuleIds }) => chunkModuleIds),
        ...receipt.assets.flatMap(({ moduleIds: assetModuleIds }) => assetModuleIds),
      ];
      expect(classifyStaticGameDependencyFacetsInternalV1(moduleIds)).toEqual({
        authoringImplementation: [],
        inspectorAuthoringImplementation: [],
        devSourceImplementation: [],
        devDockImplementation: [],
        presetSettingsImplementation: [],
        dynamicExtensionImplementation: [],
        agentImplementation: [],
        rpcImplementation: [],
      });
      expect(
        moduleIds.some((moduleId) =>
          moduleId.startsWith("virtual:sillymaker:authoring-scene-source:")
        ),
      ).toBe(true);
      expect(moduleIds).not.toContain(
        "template/src/scenes/opening/authoring-source.ts",
      );
      expect(moduleIds).not.toContain(
        "template/src/scenes/opening/opening.authoring-scene.json",
      );
      expect(moduleIds).not.toContain(
        "engine/packages/base/src/authoring/authoring-scene-compiler.ts",
      );
      expect(moduleIds.some((moduleId) => moduleId.startsWith("engine/packages/agent/")))
        .toBe(false);

      const chunks = new Map(
        generatedOutputs
          .filter((generated) => generated.type === "chunk")
          .map((chunk) => [chunk.fileName, chunk] as const),
      );
      const pending = [...chunks.values()]
        .filter((chunk) => chunk.isEntry)
        .map((chunk) => chunk.fileName);
      const initial = new Set<string>();
      while (pending.length > 0) {
        const fileName = pending.pop();
        if (fileName === undefined || initial.has(fileName)) continue;
        initial.add(fileName);
        const chunk = chunks.get(fileName);
        if (chunk !== undefined) pending.push(...chunk.imports);
      }
      const initialJavascriptGzipBytes = [...initial].reduce(
        (total, fileName) => total + gzipSync(chunks.get(fileName)!.code).byteLength,
        0,
      );
      expect(initialJavascriptGzipBytes).toBeLessThanOrEqual(
        templateMinimalInitialJavascriptGzipBudgetV1,
      );
    } finally {
      if (previous === undefined) {
        delete process.env[buildDependencyMeasurementEnvironmentKeyInternalV1];
      } else {
        process.env[buildDependencyMeasurementEnvironmentKeyInternalV1] = previous;
      }
      if (previousNodeEnvironment === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnvironment;
      }
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("keeps Engine Lab authoring out of release while attributing its lazy extension backend", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sillymaker-e2e-build-graph-"));
    const receiptPath = join(directory, "receipt.json");
    const previous = process.env[buildDependencyMeasurementEnvironmentKeyInternalV1];
    const previousNodeEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env[buildDependencyMeasurementEnvironmentKeyInternalV1] =
      serializeBuildDependencyMeasurementRequestInternalV1({
        graphRoot: repositoryRootV1,
        receiptPath,
      });
    try {
      const output = await build({
        configFile: join(repositoryRootV1, "e2e", "vite.config.ts"),
        logLevel: "silent",
        build: {
          write: false,
          outDir: join(directory, "out"),
          emptyOutDir: true,
        },
      });
      if (!Array.isArray(output) && !("output" in output)) {
        throw new TypeError("Engine Lab measurement unexpectedly returned a build watcher");
      }
      const receipt = parseBuildDependencyReceiptInternalV1(
        await readFile(receiptPath, "utf8"),
      );
      const facadeId = "e2e/src/application/dev-dock-extension.tsx";
      expect(receipt.applicationId).toBe("e2e");
      expect(receipt.chunks).toContainEqual(
        expect.objectContaining({
          isDynamicEntry: true,
          facadeModuleId: facadeId,
          ownership: "contribution",
          contributionIds: [facadeId],
        }),
      );

      const backendChunks = receipt.chunks.filter(({ moduleIds }) =>
        moduleIds.some((moduleId) =>
          moduleId.startsWith("engine/packages/composition/src/extension-runtime/")
        )
      );
      expect(backendChunks.length).toBeGreaterThan(0);
      for (const chunk of backendChunks) {
        expect(chunk.isEntry).toBe(false);
        expect(chunk.owners.every(({ kind }) => kind === "contribution")).toBe(true);
        expect(chunk.contributionIds).toContain(facadeId);
      }
      const moduleIds = [
        ...receipt.chunks.flatMap(({ moduleIds: chunkModuleIds }) => chunkModuleIds),
        ...receipt.assets.flatMap(({ moduleIds: assetModuleIds }) => assetModuleIds),
      ];
      const facets = classifyStaticGameDependencyFacetsInternalV1(moduleIds);
      expect(facets.dynamicExtensionImplementation.length).toBeGreaterThan(0);
      expect(facets.authoringImplementation).toEqual([]);
      expect(facets.inspectorAuthoringImplementation).toEqual([]);
      expect(facets.devSourceImplementation).toEqual([]);
      expect(facets.devDockImplementation.length).toBeGreaterThan(0);
      expect(facets.presetSettingsImplementation.length).toBeGreaterThan(0);
      expect(facets.agentImplementation).toEqual([]);
      expect(facets.rpcImplementation).toEqual([]);
      expect(moduleIds.some((moduleId) => moduleId.startsWith("engine/packages/agent/")))
        .toBe(false);
      expect(moduleIds).not.toContain("e2e/src/tooling/studio-binding.tsx");
      expect(moduleIds).not.toContain("/__sillymaker/embedded-author-entry.ts");
      expect(moduleIds).not.toContain("/__sillymaker/embedded-author-runtime.tsx");
    } finally {
      if (previous === undefined) {
        delete process.env[buildDependencyMeasurementEnvironmentKeyInternalV1];
      } else {
        process.env[buildDependencyMeasurementEnvironmentKeyInternalV1] = previous;
      }
      if (previousNodeEnvironment === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnvironment;
      }
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("includes DevDock and preset settings only in the explicit Template reference entry", async () => {
    const receipt = await measurePlayerEntryBuildGraphV1({
      appDirectory: "template",
      entry: "reference.html",
    });
    const facets = classifyStaticGameDependencyFacetsInternalV1(receiptModuleIdsV1(receipt));

    expect(facets.devDockImplementation.length).toBeGreaterThan(0);
    expect(facets.presetSettingsImplementation.length).toBeGreaterThan(0);
    expect(facets.authoringImplementation).toEqual([]);
    expect(facets.inspectorAuthoringImplementation).toEqual([]);
    expect(facets.devSourceImplementation).toEqual([]);
    expect(facets.dynamicExtensionImplementation).toEqual([]);
    expect(facets.agentImplementation).toEqual([]);
    expect(facets.rpcImplementation).toEqual([]);
  });

  it("keeps the complete Template Author graph free of unselected Agent implementation", async () => {
    const receipt = await measureAuthoringBuildGraphV1({
      appDirectory: "template",
      studio: Object.freeze({
        module: "src/tooling/studio-binding.tsx",
        exportName: "templateStudioBindingV1",
      }),
    });
    expect(receipt.applicationId).toBe("template");
    expectAuthoringEntryGraphV1(receipt);

    const moduleIds = receiptModuleIdsV1(receipt);
    const facets = classifyStaticGameDependencyFacetsInternalV1(moduleIds);
    expect(facets.authoringImplementation.length).toBeGreaterThan(0);
    expect(facets.inspectorAuthoringImplementation.length).toBeGreaterThan(0);
    expect(facets.authoringImplementation).toContain(
      "template/src/tooling/studio-binding.tsx",
    );
    expect(facets.devSourceImplementation).toContain(
      "engine/packages/ui/src/debug/dev-source-client.ts",
    );
    expect(facets.agentImplementation).toEqual([]);
    expect(facets.rpcImplementation).toEqual([]);
    expect(moduleIds).toContain("template/src/tooling/studio-binding.tsx");
    expect(moduleIds).toContain("engine/packages/studio/src/core/authoring-host.ts");
    expect(moduleIds).toContain("engine/packages/studio/src/studio-app.tsx");
    expect(facets.inspectorAuthoringImplementation).toContain(
      "engine/packages/studio/src/workspaces/scene/scene-inspector.tsx",
    );
    expect(moduleIds).toContain(
      "engine/packages/studio/src/workspaces/flow/flow-workspace-extension.tsx",
    );
    expect(moduleIds).not.toContain(
      "engine/packages/ui/src/debug/dev-source-client-unavailable.ts",
    );
    expect(moduleIds.some((moduleId) => moduleId.startsWith("engine/packages/agent/")))
      .toBe(false);
    expect(
      moduleIds.some((moduleId) =>
        moduleId.startsWith("engine/packages/studio/src/experimental-agent/")
      ),
    ).toBe(false);
  });

  it("includes the explicitly selected Engine Lab Agent in the same Author graph", async () => {
    const receipt = await measureAuthoringBuildGraphV1({
      appDirectory: "e2e",
      studio: Object.freeze({
        module: "src/tooling/studio-binding.tsx",
        exportName: "labStudioBindingV1",
      }),
    });
    expect(receipt.applicationId).toBe("e2e");
    expectAuthoringEntryGraphV1(receipt);

    const moduleIds = receiptModuleIdsV1(receipt);
    const facets = classifyStaticGameDependencyFacetsInternalV1(moduleIds);
    expect(facets.authoringImplementation.length).toBeGreaterThan(0);
    expect(facets.inspectorAuthoringImplementation.length).toBeGreaterThan(0);
    expect(facets.authoringImplementation).toContain("e2e/src/tooling/studio-binding.tsx");
    expect(facets.rpcImplementation.length).toBeGreaterThan(0);
    expect(facets.agentImplementation.length).toBeGreaterThan(0);
    expect(moduleIds).toContain("e2e/src/tooling/studio-binding.tsx");
    expect(moduleIds).toContain("engine/packages/agent/src/host/agent-host.ts");
    expect(moduleIds).toContain("engine/packages/agent/src/artifact/renderer.tsx");
    expect(moduleIds).toContain("engine/packages/agent/src/rpc/client.ts");
    expect(moduleIds).toContain(
      "engine/packages/agent/src/rpc/deterministic-fake-transport.ts",
    );
    expect(moduleIds).toContain(
      "engine/packages/studio/src/experimental-agent/runtime.tsx",
    );
    expect(moduleIds).toContain(
      "engine/packages/studio/src/experimental-agent/embedded-agent-surface.tsx",
    );
  });
});
