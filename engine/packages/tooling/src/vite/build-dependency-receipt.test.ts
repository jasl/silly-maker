// SPDX-License-Identifier: MIT
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

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
import type { BuildDependencyChunkInputInternalV1 } from "./build-dependency-receipt.ts";

const repositoryRootV1 = resolve(fileURLToPath(new URL("../../../../..", import.meta.url)));

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
      "engine/packages/base/src/index.ts",
      "engine/packages/studio/src/studio-app.tsx",
      "engine/packages/ui/src/debug/motion-sources.ts",
      "engine/packages/composition/src/extension-runtime/backend.ts",
      "node_modules/.deno/cordis@4.0.0/node_modules/cordis/lib/index.js",
      "engine/packages/web/src/rpc/client.ts",
    ])).toEqual({
      authoringImplementation: ["engine/packages/studio/src/studio-app.tsx"],
      devSourceImplementation: ["engine/packages/ui/src/debug/motion-sources.ts"],
      dynamicExtensionImplementation: [
        "engine/packages/composition/src/extension-runtime/backend.ts",
        "node_modules/.deno/cordis@4.0.0/node_modules/cordis/lib/index.js",
      ],
      rpcImplementation: ["engine/packages/web/src/rpc/client.ts"],
    });
  });

  it("keeps the declared-Studio Template release graph free of unselected implementations", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sillymaker-template-build-graph-"));
    const receiptPath = join(directory, "receipt.json");
    const previous = process.env[buildDependencyMeasurementEnvironmentKeyInternalV1];
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
      const bundleFileNames = (Array.isArray(output) ? output : [output]).flatMap(
        ({ output: generatedOutputs }) => generatedOutputs.map(({ fileName }) => fileName),
      );
      expect(bundleFileNames).not.toContain("receipt.json");
      const serialized = await readFile(receiptPath, "utf8");
      const receipt = parseBuildDependencyReceiptInternalV1(serialized);
      expect(receipt.applicationId).toBe("template");
      expect(serialized).not.toContain(repositoryRootV1);
      expect(receipt.chunks.some(({ isEntry }) => isEntry)).toBe(true);
      expect(receipt.chunks.some(({ isDynamicEntry }) => isDynamicEntry)).toBe(true);
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
      expect(
        classifyStaticGameDependencyFacetsInternalV1(
          [
            ...receipt.chunks.flatMap(({ moduleIds }) => moduleIds),
            ...receipt.assets.flatMap(({ moduleIds }) => moduleIds),
          ],
        ),
      ).toEqual({
        authoringImplementation: [],
        devSourceImplementation: [],
        dynamicExtensionImplementation: [],
        rpcImplementation: [],
      });
    } finally {
      if (previous === undefined) {
        delete process.env[buildDependencyMeasurementEnvironmentKeyInternalV1];
      } else {
        process.env[buildDependencyMeasurementEnvironmentKeyInternalV1] = previous;
      }
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("attributes the Engine Lab extension backend only to its lazy DevDock contribution", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sillymaker-e2e-build-graph-"));
    const receiptPath = join(directory, "receipt.json");
    const previous = process.env[buildDependencyMeasurementEnvironmentKeyInternalV1];
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
      const facets = classifyStaticGameDependencyFacetsInternalV1(
        receipt.chunks.flatMap(({ moduleIds }) => moduleIds),
      );
      expect(facets.dynamicExtensionImplementation.length).toBeGreaterThan(0);
      expect(facets.authoringImplementation).toEqual([]);
      expect(facets.rpcImplementation).toEqual([]);
    } finally {
      if (previous === undefined) {
        delete process.env[buildDependencyMeasurementEnvironmentKeyInternalV1];
      } else {
        process.env[buildDependencyMeasurementEnvironmentKeyInternalV1] = previous;
      }
      await rm(directory, { force: true, recursive: true });
    }
  });
});
