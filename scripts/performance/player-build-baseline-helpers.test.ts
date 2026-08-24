// SPDX-License-Identifier: MIT
import { dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { BuildDependencyReceiptInternalV1 } from "../../engine/packages/tooling/src/vite/build-dependency-receipt.ts";
import {
  contributionIdsByPlayerBuildAssetV1,
  playerBuildAssetKindV1,
  playerBuildAssetRoleV1,
  referencedPlayerBuildAssetsV1,
  repositoryRelativePlayerBuildPathV1,
  selectPlayerBuildOutDirV1,
} from "./player-build-baseline-helpers.ts";

describe("player build baseline helpers", () => {
  it("persists repository-relative output paths without machine identity", () => {
    const repositoryRoot = resolve("synthetic-player-build-repository");
    expect(
      repositoryRelativePlayerBuildPathV1(
        repositoryRoot,
        join(repositoryRoot, "template", "dist-web"),
      ),
    ).toBe("template/dist-web");
    expect(repositoryRelativePlayerBuildPathV1(repositoryRoot, "template/dist-web")).toBe(
      "template/dist-web",
    );
    expect(() => repositoryRelativePlayerBuildPathV1(repositoryRoot, repositoryRoot)).toThrow(
      "must be inside the repository",
    );
    expect(() =>
      repositoryRelativePlayerBuildPathV1(repositoryRoot, join(dirname(repositoryRoot), "outside"))
    ).toThrow("must be inside the repository");
  });

  it("uses the selected application's output unless the CLI explicitly overrides it", () => {
    expect(selectPlayerBuildOutDirV1(undefined, "template/dist-web")).toBe(
      "template/dist-web",
    );
    expect(selectPlayerBuildOutDirV1("tmp/custom-player", "template/dist-web")).toBe(
      "tmp/custom-player",
    );
  });

  it("classifies entry, preload, lazy, and runtime assets from final HTML", () => {
    const references = referencedPlayerBuildAssetsV1(`
      <script type="module" src="/assets/index.js"></script>
      <link rel="modulepreload" href="./assets/preload.js">
      <link rel="stylesheet" href="/assets/index.css">
    `);

    expect(playerBuildAssetRoleV1("assets/index.js", "javascript", references)).toBe("entry");
    expect(playerBuildAssetRoleV1("assets/index.css", "css", references)).toBe("entry");
    expect(playerBuildAssetRoleV1("assets/preload.js", "javascript", references)).toBe(
      "preload",
    );
    expect(playerBuildAssetRoleV1("assets/lazy.js", "javascript", references)).toBe("lazy");
    expect(playerBuildAssetRoleV1("assets/image.webp", "runtime_asset", references)).toBe(
      "runtime_asset",
    );
    expect(playerBuildAssetKindV1("assets/index.js")).toBe("javascript");
    expect(playerBuildAssetKindV1("assets/index.css")).toBe("css");
    expect(playerBuildAssetKindV1("assets/image.webp")).toBe("runtime_asset");
  });

  it("retains every contribution owner on shared generated assets", () => {
    const receipt: BuildDependencyReceiptInternalV1 = {
      schemaVersion: 1,
      applicationId: "synthetic",
      chunks: [
        {
          fileName: "assets/a.js",
          isEntry: false,
          isDynamicEntry: true,
          facadeModuleId: "src/a.ts",
          imports: [],
          dynamicImports: [],
          moduleIds: ["src/a.ts"],
          importedCss: ["assets/shared.css"],
          importedAssets: ["assets/shared.webp"],
          owners: [{ kind: "contribution" as const, id: "src/a.ts" }],
          ownership: "contribution",
          contributionIds: ["src/a.ts"],
        },
        {
          fileName: "assets/b.js",
          isEntry: false,
          isDynamicEntry: true,
          facadeModuleId: "src/b.ts",
          imports: [],
          dynamicImports: [],
          moduleIds: ["src/b.ts"],
          importedCss: ["assets/shared.css"],
          importedAssets: ["assets/shared.webp"],
          owners: [{ kind: "contribution" as const, id: "src/b.ts" }],
          ownership: "contribution",
          contributionIds: ["src/b.ts"],
        },
      ],
      assets: [
        {
          fileName: "assets/shared.css",
          moduleIds: ["src/shared.css"],
          owners: [
            { kind: "contribution" as const, id: "src/a.ts" },
            { kind: "contribution" as const, id: "src/b.ts" },
          ],
          ownership: "shared_contributions",
          contributionIds: ["src/a.ts", "src/b.ts"],
        },
        {
          fileName: "assets/shared.webp",
          moduleIds: ["src/shared.webp"],
          owners: [
            { kind: "contribution" as const, id: "src/a.ts" },
            { kind: "contribution" as const, id: "src/b.ts" },
          ],
          ownership: "shared_contributions",
          contributionIds: ["src/a.ts", "src/b.ts"],
        },
        {
          fileName: "assets/global.css",
          moduleIds: ["src/global.css"],
          owners: [
            { kind: "contribution" as const, id: "src/global.css" },
          ],
          ownership: "contribution",
          contributionIds: ["src/global.css"],
        },
      ],
    };

    expect(Object.fromEntries(contributionIdsByPlayerBuildAssetV1(receipt))).toEqual({
      "assets/a.js": ["src/a.ts"],
      "assets/b.js": ["src/b.ts"],
      "assets/global.css": ["src/global.css"],
      "assets/shared.css": ["src/a.ts", "src/b.ts"],
      "assets/shared.webp": ["src/a.ts", "src/b.ts"],
    });
  });
});
