// SPDX-License-Identifier: MIT
import {
  digestBytes,
  parsePositiveSafeInteger,
  type ResolvedAssetManifestV1,
} from "../../engine/packages/base/src/index.ts";
import { describe, expect, it } from "vitest";

import {
  validateRuntimeAssetManifestV1,
  type RuntimeAssetValidationEnvironmentV1,
} from "./validate-runtime.mts";

const validPngV1 = Uint8Array.of(
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
  0x00,
  0x00,
  0x00,
  0x0d,
  0x49,
  0x48,
  0x44,
  0x52,
  0x00,
  0x00,
  0x00,
  0x01,
  0x00,
  0x00,
  0x00,
  0x01,
  0x08,
  0x06,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
);

const oneV1 = parsePositiveSafeInteger(1);
const providerIdentityV1 = Object.freeze({
  id: "test.runtime-pack",
  revision: oneV1,
  digest: digestBytes(new TextEncoder().encode("test.runtime-pack")),
});
const providerRefV1 = Object.freeze({ kind: "asset_pack" as const, identity: providerIdentityV1 });

type ResolvedRuntimeAssetEntryV1 = Extract<
  ResolvedAssetManifestV1["assets"][number],
  { readonly delivery: "runtime_image" }
>;

interface RuntimeProviderFixtureV1 {
  readonly assetId: string;
  readonly runtimePath: string;
  readonly mediaType?: ResolvedRuntimeAssetEntryV1["mediaType"];
  readonly width?: number;
  readonly height?: number;
}

function createManifestV1(
  providers: readonly RuntimeProviderFixtureV1[],
  fallbackAssetIds: readonly string[] = [],
): ResolvedAssetManifestV1 {
  const providerByAssetId = new Map<string, RuntimeProviderFixtureV1>();
  for (const provider of providers) {
    if (providerByAssetId.has(provider.assetId)) {
      throw new TypeError(`duplicate test provider: ${provider.assetId}`);
    }
    providerByAssetId.set(provider.assetId, provider);
  }

  const slots: Array<ResolvedAssetManifestV1["slots"][number]> = [
    ...fallbackAssetIds.map((assetId) => ({
      assetId,
      kind: "background" as const,
      usage: "scene_background" as const,
      overridePolicy: "replaceable" as const,
      fallbackToken: `${assetId}.fallback`,
      width: oneV1,
      height: oneV1,
      loadGroup: "scene" as const,
      safeArea: null,
      pivot: null,
    })),
    ...providers
      .filter(({ assetId }, index) => {
        return providers.findIndex((provider) => provider.assetId === assetId) === index;
      })
      .filter(({ assetId }) => !fallbackAssetIds.includes(assetId))
      .map(({ assetId, width = 1, height = 1 }) => ({
        assetId,
        kind: "background" as const,
        usage: "scene_background" as const,
        overridePolicy: "replaceable" as const,
        fallbackToken: `${assetId}.fallback`,
        width: parsePositiveSafeInteger(width),
        height: parsePositiveSafeInteger(height),
        loadGroup: "scene" as const,
        safeArea: null,
        pivot: null,
      })),
  ];
  const assets: Array<ResolvedAssetManifestV1["assets"][number]> = slots.map((slot) => {
    const fixture = providerByAssetId.get(slot.assetId);
    if (!fixture) {
      return {
        ...slot,
        delivery: "code_fallback",
        provider: null,
        overrideChain: Object.freeze([]),
      };
    }

    return {
      ...slot,
      runtimePath: fixture.runtimePath,
      mediaType: fixture.mediaType ?? "image/png",
      delivery: "runtime_image",
      provider: providerRefV1,
      overrideChain: Object.freeze([providerRefV1]),
    };
  });

  return {
    packs: providers.length === 0 ? Object.freeze([]) : Object.freeze([providerIdentityV1]),
    slots: Object.freeze(slots),
    assets: Object.freeze(assets),
  };
}

function overrideRuntimeProviderV1(
  manifest: ResolvedAssetManifestV1,
  assetId: string,
  overrides: Partial<ResolvedRuntimeAssetEntryV1>,
): ResolvedAssetManifestV1 {
  return {
    ...manifest,
    assets: manifest.assets.map((asset) => {
      return asset.assetId === assetId && asset.delivery === "runtime_image"
        ? { ...asset, ...overrides }
        : asset;
    }),
  };
}

function createEnvironmentV1(
  input: {
    readonly files?: ReadonlyMap<string, Uint8Array>;
    readonly reads?: string[];
  } = {},
): RuntimeAssetValidationEnvironmentV1 {
  const files = input.files ?? new Map<string, Uint8Array>();
  return {
    async readFile(path) {
      input.reads?.push(path);
      const bytes = files.get(path);
      if (!bytes) throw new Error(`ENOENT: ${path}`);
      return bytes;
    },
  };
}

describe("runtime asset manifest validation", () => {
  it("reads only exact runtime providers in manifest order and never enumerates working archives", async () => {
    const firstPath = "assets/scene.png";
    const secondPath = "assets/menu.png";
    const reads: string[] = [];
    const manifest = createManifestV1(
      [
        { assetId: "scene.first", runtimePath: firstPath },
        { assetId: "scene.second", runtimePath: secondPath },
      ],
      ["scene.fallback"],
    );

    const result = await validateRuntimeAssetManifestV1(
      manifest,
      createEnvironmentV1({
        files: new Map([
          [firstPath, validPngV1],
          [secondPath, validPngV1],
        ]),
        reads,
      }),
    );

    expect(result.errors).toEqual([]);
    expect(reads).toEqual([firstPath, secondPath]);
    expect(
      reads.every((path) => !path.startsWith("art-source/") && !path.startsWith("references/")),
    ).toBe(true);
  });

  it("performs zero file reads for a fallback-only manifest", async () => {
    const reads: string[] = [];
    const manifest = createManifestV1([], ["scene.fallback"]);

    const result = await validateRuntimeAssetManifestV1(
      manifest,
      createEnvironmentV1({ reads }),
    );

    expect(result.errors).toEqual([]);
    expect(reads).toEqual([]);
  });

  it.each([
    "/assets/scene.png",
    "assets/../scene.png",
    "assets/./scene.png",
    "assets//scene.png",
    "assets\\scene.png",
    "assets/scene.png?download=1",
    "assets/scene.png#fragment",
    "assets/scene\0.png",
    "assets/%2e%2e/scene.png",
    "assets",
    "examples/Other/assets/scene.png",
  ])("rejects unsafe path %j before any filesystem read", async (runtimePath) => {
    const reads: string[] = [];
    const manifest = overrideRuntimeProviderV1(
      createManifestV1([{ assetId: "scene.unsafe", runtimePath: "assets/scene.png" }]),
      "scene.unsafe",
      { runtimePath },
    );

    const result = await validateRuntimeAssetManifestV1(
      manifest,
      createEnvironmentV1({ reads }),
    );

    expect(result.errors).toEqual([{ assetId: "scene.unsafe", code: "asset.runtime_path_unsafe" }]);
    expect(reads).toEqual([]);
  });

  it("accepts a Story-local runtime asset", async () => {
    const runtimePath = "assets/scene.png";
    const result = await validateRuntimeAssetManifestV1(
      createManifestV1([{ assetId: "scene.safe", runtimePath }]),
      createEnvironmentV1({
        files: new Map([[runtimePath, validPngV1]]),
      }),
    );

    expect(result.errors).toEqual([]);
  });

  it("treats a read failure as a missing runtime file", async () => {
    const runtimePath = "assets/missing.png";
    const manifest = createManifestV1([{ assetId: "scene.missing", runtimePath }]);

    const readFailure = await validateRuntimeAssetManifestV1(manifest, createEnvironmentV1());

    expect(readFailure.errors).toEqual([
      { assetId: "scene.missing", code: "asset.runtime_file_missing" },
    ]);
  });

  it.each(
    [
      {
        id: "media-mismatch",
        manifest: createManifestV1([
          {
            assetId: "scene.media",
            runtimePath: "assets/scene.svg",
            mediaType: "image/svg+xml",
          },
        ]),
        path: "assets/scene.svg",
        bytes: validPngV1,
        code: "asset.runtime_media_mismatch",
      },
      {
        id: "dimension-mismatch",
        manifest: createManifestV1([
          {
            assetId: "scene.dimensions",
            runtimePath: "assets/scene.png",
            width: 2,
          },
        ]),
        path: "assets/scene.png",
        bytes: validPngV1,
        code: "asset.runtime_dimensions_mismatch",
      },
    ] as const,
  )("rejects $id with $code", async ({ manifest, path, bytes, code }) => {
    const result = await validateRuntimeAssetManifestV1(
      manifest,
      createEnvironmentV1({ files: new Map([[path, bytes]]) }),
    );

    expect(result.errors.map((error) => error.code)).toContain(code);
  });

  it("keeps validating later manifest entries after an unsafe provider", async () => {
    const safePath = "assets/scene.png";
    const reads: string[] = [];
    const result = await validateRuntimeAssetManifestV1(
      overrideRuntimeProviderV1(
        createManifestV1([
          { assetId: "scene.unsafe", runtimePath: "assets/unsafe.png" },
          { assetId: "scene.safe", runtimePath: safePath },
        ]),
        "scene.unsafe",
        { runtimePath: "../scene.png" },
      ),
      createEnvironmentV1({
        files: new Map([[safePath, validPngV1]]),
        reads,
      }),
    );

    expect(result.errors).toEqual([{ assetId: "scene.unsafe", code: "asset.runtime_path_unsafe" }]);
    expect(reads).toEqual([safePath]);
  });
});
