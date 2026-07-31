// SPDX-License-Identifier: MIT
import { readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";

import type { ResolvedAssetManifestV1 } from "../../engine/packages/base/src/index.ts";
import { describe, expect, it } from "vitest";

import {
  runtimeAssetStoryChecksV1,
  verifyRuntimeAssetStoryChecksV1,
  verifyRuntimeAssetsV1,
  type RuntimeAssetStoryCheckV1,
} from "./verify-runtime-assets.mts";
import type {
  RuntimeAssetValidationEnvironmentV1,
  RuntimeAssetValidationErrorV1,
} from "./validate-runtime.mts";

function emptyManifestV1(): ResolvedAssetManifestV1 {
  return Object.freeze({
    packs: Object.freeze([]),
    slots: Object.freeze([]),
    assets: Object.freeze([]),
  });
}

describe("closed runtime asset verification", () => {
  it("builds one check per asset-verified application from the project config", () => {
    expect(runtimeAssetStoryChecksV1.map(({ storyId }) => storyId)).toEqual([
      "story.e2e.engine-lab",
      "story.template.starter",
      "story.example.bookshop",
      "story.example.cat-cafe",
    ]);
    expect(Object.isFrozen(runtimeAssetStoryChecksV1)).toBe(true);
    for (const check of runtimeAssetStoryChecksV1) expect(Object.isFrozen(check)).toBe(true);
  });

  it("resolves every closed Story once and validates its exact manifest in order", async () => {
    const manifests = [emptyManifestV1(), emptyManifestV1()] as const;
    const resolutionCalls: string[] = [];
    const validationCalls: ResolvedAssetManifestV1[] = [];
    const stories = manifests.map((manifest, index): RuntimeAssetStoryCheckV1 =>
      Object.freeze({
        storyId: `story.test.${String(index + 1)}`,
        appDirectory: `stories/${String(index + 1)}`,
        resolveAssets() {
          resolutionCalls.push(this.storyId);
          return manifest;
        },
      })
    );
    const environmentRoots: string[] = [];
    const environmentFor = (appRoot: string): RuntimeAssetValidationEnvironmentV1 => {
      environmentRoots.push(appRoot);
      return Object.freeze({
        repositoryRoot: appRoot,
        async readFile(path: string) {
          throw new Error(`unexpected read: ${path}`);
        },
        async realpath(path: string) {
          throw new Error(`unexpected realpath: ${path}`);
        },
      });
    };

    const verified = await verifyRuntimeAssetStoryChecksV1(
      stories,
      environmentFor,
      async (manifest) => {
        validationCalls.push(manifest);
        return Object.freeze({ errors: Object.freeze([]) });
      },
    );

    expect(environmentRoots).toEqual(["stories/1", "stories/2"]);

    expect(resolutionCalls).toEqual(["story.test.1", "story.test.2"]);
    expect(validationCalls).toEqual(manifests);
    expect(verified).toEqual(["story.test.1", "story.test.2"]);
    expect(Object.isFrozen(verified)).toBe(true);
  });

  it("verifies the live manifests: only cat-cafe declares runtime art", async () => {
    // e2e/template/bookshop stay code-native (no runtime file access);
    // the cat-cafe ships a real webp art pack that must exist and match
    // its declared bytes/digests, so its files are read for real.
    const reads: string[] = [];
    const root = resolve(import.meta.dirname, "../..");
    await expect(
      verifyRuntimeAssetsV1(root, {
        environmentFor: (appDirectory: string) =>
          Object.freeze({
            repositoryRoot: resolve(root, appDirectory),
            async readFile(path: string) {
              const absolute = resolve(root, appDirectory, path);
              reads.push(absolute);
              return await readFile(absolute);
            },
            async realpath(path: string) {
              return await realpath(resolve(root, appDirectory, path));
            },
          }),
      }),
    ).resolves.toEqual([
      "story.e2e.engine-lab",
      "story.template.starter",
      "story.example.bookshop",
      "story.example.cat-cafe",
    ]);
    expect(reads.length).toBeGreaterThan(0);
    expect(reads.every((path) => path.includes(`examples${sep}cat-cafe${sep}assets`))).toBe(true);
  }, 30_000);

  it("reports bounded Story and asset identities after checking the closed set", async () => {
    const manifest = emptyManifestV1();
    const resolutionCalls: string[] = [];
    const stories = ["story.test.first", "story.test.second"].map(
      (storyId): RuntimeAssetStoryCheckV1 =>
        Object.freeze({
          storyId,
          appDirectory: "stories/test",
          resolveAssets() {
            resolutionCalls.push(storyId);
            return manifest;
          },
        }),
    );
    const error: RuntimeAssetValidationErrorV1 = Object.freeze({
      assetId: "asset.test.invalid",
      code: "asset.runtime_hash_mismatch",
    });

    await expect(
      verifyRuntimeAssetStoryChecksV1(
        stories,
        () =>
          Object.freeze({
            repositoryRoot: "/repo/silly-maker",
            async readFile() {
              return new Uint8Array();
            },
            async realpath(path: string) {
              return path;
            },
          }),
        async () => {
          return Object.freeze({ errors: Object.freeze([error]) });
        },
      ),
    ).rejects.toThrow(
      "story.test.first:asset.test.invalid:asset.runtime_hash_mismatch\n" +
        "story.test.second:asset.test.invalid:asset.runtime_hash_mismatch",
    );
    expect(resolutionCalls).toEqual(["story.test.first", "story.test.second"]);
  });

  it("imports only the Base resolver, project config machinery, and validator", async () => {
    const source = await readFile(new URL("./verify-runtime-assets.mts", import.meta.url), "utf8");
    const dynamicSpecifiers = [...source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/gu)].flatMap(
      (match) => (match[1] === undefined ? [] : [match[1]]),
    );

    expect(dynamicSpecifiers).toEqual([
      "../../engine/packages/base/src/index.ts",
      "../../engine/packages/tooling/src/project/workspace.ts",
      "../../project.config.ts",
      "../../engine/packages/tooling/src/project/loader.ts",
      "./validate-runtime.mts",
    ]);
    expect(dynamicSpecifiers.every((specifier) => !specifier.includes("/testkit"))).toBe(true);
    expect(
      dynamicSpecifiers.some((specifier) =>
        /\.tsx$|\/application\/|\/stories\/[^/]+\/src\/tooling\b/u.test(specifier)
      ),
    ).toBe(false);
  });
});
