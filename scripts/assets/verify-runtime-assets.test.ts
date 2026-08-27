// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

import {
  defineTextContentManifestV1,
  type ResolvedAssetManifestV1,
} from "../../engine/packages/base/src/index.ts";
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

function textVariantBytesV1(
  packId: string,
  locale: string,
  entries: readonly { readonly textId: string; readonly text: string }[],
): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({
    format: "sillymaker.text-content-pack",
    version: 2,
    packId,
    locale,
    entries,
  }));
}

describe("closed runtime asset verification", () => {
  it("builds one check per asset-verified application from the project config", () => {
    expect(runtimeAssetStoryChecksV1.map(({ storyId }) => storyId)).toEqual([
      "story.e2e.engine-lab",
      "story.template.starter",
      "story.example.bookshop",
      "story.example.vn-reference-tour",
    ]);
  });

  it("resolves every closed Story once and validates its exact manifest in order", async () => {
    const manifests = [emptyManifestV1(), emptyManifestV1()] as const;
    const resolutionCalls: string[] = [];
    const validationCalls: ResolvedAssetManifestV1[] = [];
    const stories = manifests.map((manifest, index): RuntimeAssetStoryCheckV1 =>
      Object.freeze({
        storyId: `story.test.${String(index + 1)}`,
        appDirectory: `stories/${String(index + 1)}`,
        resolve() {
          resolutionCalls.push(this.storyId);
          return Object.freeze({ assets: manifest });
        },
      })
    );
    const environmentRoots: string[] = [];
    const environmentFor = (appRoot: string): RuntimeAssetValidationEnvironmentV1 => {
      environmentRoots.push(appRoot);
      return Object.freeze({
        readFile(path: string) {
          throw new Error(`unexpected read: ${path}`);
        },
      });
    };

    const verified = await verifyRuntimeAssetStoryChecksV1(
      stories,
      environmentFor,
      (manifest) => {
        validationCalls.push(manifest);
        return Promise.resolve(Object.freeze({ errors: Object.freeze([]) }));
      },
    );

    expect(environmentRoots).toEqual(["stories/1", "stories/2"]);

    expect(resolutionCalls).toEqual(["story.test.1", "story.test.2"]);
    expect(validationCalls).toEqual(manifests);
    expect(verified).toEqual(["story.test.1", "story.test.2"]);
  });

  it("verifies live manifest-owned application runtime assets", async () => {
    const applicationDirectories: string[] = [];
    const reads: string[] = [];
    const root = resolve(import.meta.dirname, "../..");
    await expect(
      verifyRuntimeAssetsV1(root, {
        environmentFor: (appDirectory: string) => {
          applicationDirectories.push(appDirectory);
          return Object.freeze({
            async readFile(path: string) {
              const absolute = resolve(root, appDirectory, path);
              reads.push(absolute);
              return await readFile(absolute);
            },
          });
        },
      }),
    ).resolves.toEqual([
      "story.e2e.engine-lab",
      "story.template.starter",
      "story.example.bookshop",
      "story.example.vn-reference-tour",
    ]);
    expect(applicationDirectories).toEqual([
      "e2e",
      "template",
      "examples/bookshop",
      "examples/vn-reference-tour",
    ]);
    expect(reads.length).toBeGreaterThan(0);
    expect(reads.some((path) => path.includes(`template${sep}assets${sep}content`))).toBe(true);
    expect(
      reads.some((path) =>
        path.includes(`examples${sep}vn-reference-tour${sep}assets${sep}content`)
      ),
    ).toBe(true);
  }, 30_000);

  it("admits optional and independently edited text packs through the application root", async () => {
    const bootstrapCatalogs = [{ locale: "en", entries: [] }] as const;
    const packId = "text-pack.test.runtime";
    const runtimePath = "assets/content/test.text-pack.json";
    const bytes = new TextEncoder().encode(JSON.stringify({
      format: "sillymaker.text-content-pack",
      version: 2,
      packId,
      locale: "en",
      entries: [{ textId: "text.test.line", text: "Line" }],
    }));
    const manifest = defineTextContentManifestV1({
      revision: 1,
      defaultLocale: "en",
      locales: [{ locale: "en", fallbackLocale: null }],
      packs: [{
        packId,
        variants: [{ locale: "en", runtimePath }],
      }],
    });
    const reads: string[] = [];
    const story: RuntimeAssetStoryCheckV1 = Object.freeze({
      storyId: "story.test.content",
      appDirectory: "stories/content",
      resolve: () =>
        Object.freeze({
          assets: emptyManifestV1(),
          textContent: Object.freeze({ manifest, bootstrapCatalogs }),
        }),
    });
    const environmentFor = (): RuntimeAssetValidationEnvironmentV1 =>
      Object.freeze({
        readFile(path: string) {
          reads.push(path);
          return Promise.resolve(bytes);
        },
      });

    await expect(
      verifyRuntimeAssetStoryChecksV1(
        [story],
        environmentFor,
        () => Promise.resolve(Object.freeze({ errors: Object.freeze([]) })),
      ),
    ).resolves.toEqual(["story.test.content"]);
    expect(reads).toEqual([runtimePath]);

    const editedBytes = new TextEncoder().encode(JSON.stringify({
      format: "sillymaker.text-content-pack",
      version: 2,
      packId,
      locale: "en",
      entries: [{ textId: "text.test.line", text: "Edited localization" }],
    }));
    await expect(
      verifyRuntimeAssetStoryChecksV1(
        [story],
        () =>
          Object.freeze({
            readFile() {
              return Promise.resolve(editedBytes);
            },
          }),
        () => Promise.resolve(Object.freeze({ errors: Object.freeze([]) })),
      ),
    ).resolves.toEqual(["story.test.content"]);

    await expect(
      verifyRuntimeAssetStoryChecksV1(
        [story],
        () =>
          Object.freeze({
            readFile() {
              return Promise.resolve(new TextEncoder().encode("{"));
            },
          }),
        () => Promise.resolve(Object.freeze({ errors: Object.freeze([]) })),
      ),
    ).rejects.toThrow(
      "story.test.content:text-pack.test.runtime:en:text_content.pack_json_invalid",
    );
  });

  it("checks every translation variant against its logical pack's default IDs", async () => {
    const packId = "text-pack.test.localized";
    const defaultPath = "assets/content/localized.zh-CN.text-pack.json";
    const englishPath = "assets/content/localized.en.text-pack.json";
    const manifest = defineTextContentManifestV1({
      revision: 1,
      defaultLocale: "zh-CN",
      locales: [
        { locale: "zh-CN", fallbackLocale: null },
        { locale: "en", fallbackLocale: "zh-CN" },
      ],
      packs: [{
        packId,
        variants: [
          { locale: "zh-CN", runtimePath: defaultPath },
          { locale: "en", runtimePath: englishPath },
        ],
      }],
    });
    const bytes = new Map([
      [
        defaultPath,
        textVariantBytesV1(packId, "zh-CN", [
          { textId: "text.test.known", text: "已知" },
        ]),
      ],
      [
        englishPath,
        textVariantBytesV1(packId, "en", [
          { textId: "text.test.unknown", text: "Unknown" },
        ]),
      ],
    ]);
    const reads: string[] = [];
    const story: RuntimeAssetStoryCheckV1 = {
      storyId: "story.test.localized",
      appDirectory: "stories/localized",
      resolve: () => ({
        assets: emptyManifestV1(),
        textContent: { manifest, bootstrapCatalogs: [] },
      }),
    };

    await expect(verifyRuntimeAssetStoryChecksV1(
      [story],
      () => ({
        readFile(path) {
          reads.push(path);
          return Promise.resolve(bytes.get(path)!);
        },
      }),
      () => Promise.resolve({ errors: [] }),
    )).rejects.toThrow(
      "story.test.localized:text-pack.test.localized:en:" +
        "text_content.translation_text_id_unknown:text.test.unknown",
    );
    expect(reads).toEqual([defaultPath, englishPath]);
  });

  it("keeps a compact default-ID closure across bootstrap and logical packs", async () => {
    const firstPackId = "text-pack.test.first";
    const secondPackId = "text-pack.test.second";
    const firstPath = "assets/content/first.zh-CN.text-pack.json";
    const secondPath = "assets/content/second.zh-CN.text-pack.json";
    const manifest = defineTextContentManifestV1({
      revision: 1,
      defaultLocale: "zh-CN",
      locales: [{ locale: "zh-CN", fallbackLocale: null }],
      packs: [
        {
          packId: firstPackId,
          variants: [{ locale: "zh-CN", runtimePath: firstPath }],
        },
        {
          packId: secondPackId,
          variants: [{ locale: "zh-CN", runtimePath: secondPath }],
        },
      ],
    });
    const bytes = new Map([
      [
        firstPath,
        textVariantBytesV1(firstPackId, "zh-CN", [
          { textId: "text.test.bootstrap", text: "conflicts with bootstrap" },
          { textId: "text.test.cross-pack", text: "first" },
        ]),
      ],
      [
        secondPath,
        textVariantBytesV1(secondPackId, "zh-CN", [
          { textId: "text.test.cross-pack", text: "second" },
        ]),
      ],
    ]);
    const story: RuntimeAssetStoryCheckV1 = {
      storyId: "story.test.default-closure",
      appDirectory: "stories/default-closure",
      resolve: () => ({
        assets: emptyManifestV1(),
        textContent: {
          manifest,
          bootstrapCatalogs: [{
            locale: "zh-CN",
            entries: [{ textId: "text.test.bootstrap", text: "bootstrap" }],
          }],
        },
      }),
    };

    await expect(verifyRuntimeAssetStoryChecksV1(
      [story],
      () => ({ readFile: (path) => Promise.resolve(bytes.get(path)!) }),
      () => Promise.resolve({ errors: [] }),
    )).rejects.toThrow(
      "story.test.default-closure:text-pack.test.first:zh-CN:" +
        "text_content.text_id_duplicate:text.test.bootstrap\n" +
        "story.test.default-closure:text-pack.test.second:zh-CN:" +
        "text_content.text_id_duplicate:text.test.cross-pack",
    );
  });

  it("reports bounded Story and asset identities after checking the closed set", async () => {
    const manifest = emptyManifestV1();
    const resolutionCalls: string[] = [];
    const stories = ["story.test.first", "story.test.second"].map(
      (storyId): RuntimeAssetStoryCheckV1 =>
        Object.freeze({
          storyId,
          appDirectory: "stories/test",
          resolve() {
            resolutionCalls.push(storyId);
            return Object.freeze({ assets: manifest });
          },
        }),
    );
    const error: RuntimeAssetValidationErrorV1 = Object.freeze({
      assetId: "asset.test.invalid",
      code: "asset.runtime_dimensions_mismatch",
    });

    await expect(
      verifyRuntimeAssetStoryChecksV1(
        stories,
        () =>
          Object.freeze({
            readFile() {
              return Promise.resolve(new Uint8Array());
            },
          }),
        () => {
          return Promise.resolve(Object.freeze({ errors: Object.freeze([error]) }));
        },
      ),
    ).rejects.toThrow(
      "story.test.first:asset.test.invalid:asset.runtime_dimensions_mismatch\n" +
        "story.test.second:asset.test.invalid:asset.runtime_dimensions_mismatch",
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
