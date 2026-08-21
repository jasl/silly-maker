// SPDX-License-Identifier: MIT
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import type { Plugin } from "vite";

/** @internal Explicit opt-in channel used only by build measurement callers. */
export const buildDependencyMeasurementEnvironmentKeyInternalV1 =
  "SILLYMAKER_BUILD_DEPENDENCY_MEASUREMENT_V1";

export interface BuildDependencyMeasurementRequestInternalV1 {
  readonly graphRoot: string;
  readonly receiptPath: string;
}

export type BuildDependencyOwnershipInternalV1 =
  | "application"
  | "contribution"
  | "mixed"
  | "shared_contributions"
  | "unattributed";

export type BuildDependencyOwnerInternalV1 =
  | { readonly kind: "application"; readonly id: string }
  | { readonly kind: "contribution"; readonly id: string };

export interface BuildDependencyChunkReceiptInternalV1 {
  readonly fileName: string;
  readonly isEntry: boolean;
  readonly isDynamicEntry: boolean;
  readonly facadeModuleId: string | null;
  readonly imports: readonly string[];
  readonly dynamicImports: readonly string[];
  readonly moduleIds: readonly string[];
  readonly importedCss: readonly string[];
  readonly importedAssets: readonly string[];
  readonly owners: readonly BuildDependencyOwnerInternalV1[];
  readonly ownership: BuildDependencyOwnershipInternalV1;
  readonly contributionIds: readonly string[];
}

export interface BuildDependencyAssetReceiptInternalV1 {
  readonly fileName: string;
  readonly moduleIds: readonly string[];
  readonly owners: readonly BuildDependencyOwnerInternalV1[];
  readonly ownership: BuildDependencyOwnershipInternalV1;
  readonly contributionIds: readonly string[];
}

export interface BuildDependencyReceiptInternalV1 {
  readonly schemaVersion: 1;
  readonly applicationId: string;
  readonly chunks: readonly BuildDependencyChunkReceiptInternalV1[];
  readonly assets: readonly BuildDependencyAssetReceiptInternalV1[];
}

export interface BuildDependencyChunkInputInternalV1 {
  readonly fileName: string;
  readonly isEntry: boolean;
  readonly isDynamicEntry: boolean;
  readonly facadeModuleId: string | null;
  readonly imports: readonly string[];
  readonly dynamicImports: readonly string[];
  readonly moduleIds: readonly string[];
  readonly importedCss: readonly string[];
  readonly importedAssets: readonly string[];
}

export interface BuildDependencyAssetInputInternalV1 {
  readonly fileName: string;
  readonly moduleIds: readonly string[];
  readonly isEntry: boolean;
  readonly dynamicEntryModuleIds: readonly string[];
}

export interface StaticGameDependencyFacetsInternalV1 {
  readonly authoringImplementation: readonly string[];
  readonly devSourceImplementation: readonly string[];
  readonly dynamicExtensionImplementation: readonly string[];
  readonly rpcImplementation: readonly string[];
}

function isWithinV1(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
}

function requireAbsolutePathV1(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || !isAbsolute(value)) {
    throw new TypeError(`${label} must be an absolute path`);
  }
  return resolve(value);
}

function normalizeMeasurementRequestV1(
  value: unknown,
): BuildDependencyMeasurementRequestInternalV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("build dependency measurement request must be an object");
  }
  const graphRoot = requireAbsolutePathV1(
    Reflect.get(value, "graphRoot"),
    "build dependency graph root",
  );
  const receiptPath = requireAbsolutePathV1(
    Reflect.get(value, "receiptPath"),
    "build dependency receipt path",
  );
  const temporaryRoot = resolve(tmpdir());
  if (receiptPath === temporaryRoot || !isWithinV1(temporaryRoot, receiptPath)) {
    throw new TypeError("build dependency receipt path must be inside the OS temporary directory");
  }
  return Object.freeze({ graphRoot, receiptPath });
}

/** @internal Creates the one process-boundary value consumed by Vite config. */
export function serializeBuildDependencyMeasurementRequestInternalV1(
  request: BuildDependencyMeasurementRequestInternalV1,
): string {
  return JSON.stringify(normalizeMeasurementRequestV1(request));
}

/** @internal Absence keeps ordinary dev/build assembly unchanged. */
export function parseBuildDependencyMeasurementRequestInternalV1(
  serialized: string | undefined,
): BuildDependencyMeasurementRequestInternalV1 | null {
  if (serialized === undefined) return null;
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new TypeError("build dependency measurement request is invalid JSON", { cause: error });
  }
  return normalizeMeasurementRequestV1(value);
}

function compareCodeUnitsV1(left: string, right: string): number {
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const difference = left.charCodeAt(index) - right.charCodeAt(index);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function sortedUniqueV1(values: Iterable<string>): readonly string[] {
  return Object.freeze([...new Set(values)].sort(compareCodeUnitsV1));
}

function splitModuleSuffixV1(moduleId: string): readonly [string, string] {
  const suffixIndex = moduleId.search(/[?#]/u);
  return suffixIndex < 0
    ? Object.freeze([moduleId, ""])
    : Object.freeze([moduleId.slice(0, suffixIndex), moduleId.slice(suffixIndex)]);
}

/** @internal Removes checkout identity while preserving exact managed module identity. */
export function normalizeBuildDependencyModuleIdInternalV1(
  graphRoot: string,
  moduleId: string,
): string {
  const root = resolve(graphRoot);
  if (moduleId.startsWith("\0")) {
    const virtualId = moduleId.slice(1).split(root).join("<graph-root>");
    return `virtual:${virtualId.split(sep).join("/")}`;
  }
  const [path, suffix] = splitModuleSuffixV1(moduleId);
  if (!isAbsolute(path)) return `${path.split(sep).join("/")}${suffix}`;
  const resolvedPath = resolve(path);
  if (!isWithinV1(root, resolvedPath)) {
    throw new TypeError("build dependency module is outside the measurement graph root");
  }
  const managedPath = relative(root, resolvedPath).split(sep).join("/");
  return `${managedPath}${suffix}`;
}

function ownerKeyV1(owner: BuildDependencyOwnerInternalV1): string {
  return `${owner.kind}:${owner.id}`;
}

function addOwnerClosureV1(
  chunksByName: ReadonlyMap<string, BuildDependencyChunkInputInternalV1>,
  ownersByOutput: Map<string, Map<string, BuildDependencyOwnerInternalV1>>,
  rootFileName: string,
  owner: BuildDependencyOwnerInternalV1,
): void {
  const pending = [rootFileName];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const fileName = pending.pop();
    if (fileName === undefined || seen.has(fileName)) continue;
    seen.add(fileName);
    const chunk = chunksByName.get(fileName);
    if (chunk === undefined) continue;
    const owners = ownersByOutput.get(fileName) ?? new Map();
    owners.set(ownerKeyV1(owner), owner);
    ownersByOutput.set(fileName, owners);
    for (const importedFileName of chunk.imports) pending.push(importedFileName);
  }
}

function addOutputOwnerV1(
  ownersByOutput: Map<string, Map<string, BuildDependencyOwnerInternalV1>>,
  fileName: string,
  owner: BuildDependencyOwnerInternalV1,
): void {
  const owners = ownersByOutput.get(fileName) ?? new Map();
  owners.set(ownerKeyV1(owner), owner);
  ownersByOutput.set(fileName, owners);
}

function sortedOwnersV1(
  owners: ReadonlyMap<string, BuildDependencyOwnerInternalV1> | undefined,
): readonly BuildDependencyOwnerInternalV1[] {
  return Object.freeze(
    [...(owners?.values() ?? [])].sort((left, right) =>
      compareCodeUnitsV1(ownerKeyV1(left), ownerKeyV1(right))
    ),
  );
}

function ownershipV1(
  owners: readonly BuildDependencyOwnerInternalV1[],
): BuildDependencyOwnershipInternalV1 {
  if (owners.length === 0) return "unattributed";
  const applicationOwners = owners.filter(({ kind }) => kind === "application").length;
  const contributionOwners = owners.length - applicationOwners;
  if (applicationOwners > 0 && contributionOwners > 0) return "mixed";
  if (applicationOwners > 0) return "application";
  return contributionOwners === 1 ? "contribution" : "shared_contributions";
}

/** @internal Pure final-output owner classifier shared by the plugin and focused tests. */
export function createBuildDependencyReceiptInternalV1(input: {
  readonly applicationId: string;
  readonly graphRoot: string;
  readonly chunks: readonly BuildDependencyChunkInputInternalV1[];
  readonly assets: readonly BuildDependencyAssetInputInternalV1[];
}): BuildDependencyReceiptInternalV1 {
  const outputFileNames = new Set([
    ...input.chunks.map(({ fileName }) => fileName),
    ...input.assets.map(({ fileName }) => fileName),
  ]);
  if (outputFileNames.size !== input.chunks.length + input.assets.length) {
    throw new TypeError("build dependency receipt contains duplicate output names");
  }
  // Vite removes CSS-only placeholder chunks after Rolldown records its edge.
  // A receipt edge names only a final emitted output; the final CSS asset below
  // retains the dynamic facade and ownership evidence.
  const keepOutputEdgesV1 = (fileNames: readonly string[]): readonly string[] =>
    fileNames.filter((fileName) => outputFileNames.has(fileName));
  const chunkInputs = input.chunks.map((chunk): BuildDependencyChunkInputInternalV1 =>
    Object.freeze({
      ...chunk,
      imports: keepOutputEdgesV1(chunk.imports),
      dynamicImports: keepOutputEdgesV1(chunk.dynamicImports),
      importedCss: keepOutputEdgesV1(chunk.importedCss),
      importedAssets: keepOutputEdgesV1(chunk.importedAssets),
    })
  );
  const chunksByName = new Map(chunkInputs.map((chunk) => [chunk.fileName, chunk]));
  const assetsByName = new Map(input.assets.map((asset) => [asset.fileName, asset]));
  const ownersByOutput = new Map<string, Map<string, BuildDependencyOwnerInternalV1>>();
  const applicationOwner = Object.freeze({
    kind: "application" as const,
    id: input.applicationId,
  });
  for (const chunk of chunkInputs) {
    if (chunk.isEntry) {
      addOwnerClosureV1(chunksByName, ownersByOutput, chunk.fileName, applicationOwner);
    }
    if (chunk.isDynamicEntry && chunk.facadeModuleId !== null) {
      const contributionId = normalizeBuildDependencyModuleIdInternalV1(
        input.graphRoot,
        chunk.facadeModuleId,
      );
      addOwnerClosureV1(
        chunksByName,
        ownersByOutput,
        chunk.fileName,
        Object.freeze({ kind: "contribution" as const, id: contributionId }),
      );
    }
  }
  for (const asset of input.assets) {
    if (asset.isEntry) addOutputOwnerV1(ownersByOutput, asset.fileName, applicationOwner);
    for (const moduleId of asset.dynamicEntryModuleIds) {
      addOutputOwnerV1(
        ownersByOutput,
        asset.fileName,
        Object.freeze({
          kind: "contribution" as const,
          id: normalizeBuildDependencyModuleIdInternalV1(input.graphRoot, moduleId),
        }),
      );
    }
  }
  for (const chunk of chunkInputs) {
    const owners = ownersByOutput.get(chunk.fileName);
    if (owners === undefined) continue;
    for (const fileName of [...chunk.imports, ...chunk.importedCss, ...chunk.importedAssets]) {
      if (!assetsByName.has(fileName)) continue;
      for (const owner of owners.values()) addOutputOwnerV1(ownersByOutput, fileName, owner);
    }
  }

  const chunks = chunkInputs
    .map((chunk): BuildDependencyChunkReceiptInternalV1 => {
      const owners = sortedOwnersV1(ownersByOutput.get(chunk.fileName));
      return Object.freeze({
        fileName: chunk.fileName,
        isEntry: chunk.isEntry,
        isDynamicEntry: chunk.isDynamicEntry,
        facadeModuleId: chunk.facadeModuleId === null
          ? null
          : normalizeBuildDependencyModuleIdInternalV1(input.graphRoot, chunk.facadeModuleId),
        imports: sortedUniqueV1(chunk.imports),
        dynamicImports: sortedUniqueV1(chunk.dynamicImports),
        moduleIds: sortedUniqueV1(
          chunk.moduleIds.map((moduleId) =>
            normalizeBuildDependencyModuleIdInternalV1(input.graphRoot, moduleId)
          ),
        ),
        importedCss: sortedUniqueV1(chunk.importedCss),
        importedAssets: sortedUniqueV1(chunk.importedAssets),
        owners,
        ownership: ownershipV1(owners),
        contributionIds: Object.freeze(
          owners.filter(({ kind }) => kind === "contribution").map(({ id }) => id),
        ),
      });
    })
    .sort((left, right) => compareCodeUnitsV1(left.fileName, right.fileName));
  const assets = input.assets
    .map((asset): BuildDependencyAssetReceiptInternalV1 => {
      const owners = sortedOwnersV1(ownersByOutput.get(asset.fileName));
      return Object.freeze({
        fileName: asset.fileName,
        moduleIds: sortedUniqueV1(
          asset.moduleIds.map((moduleId) =>
            normalizeBuildDependencyModuleIdInternalV1(input.graphRoot, moduleId)
          ),
        ),
        owners,
        ownership: ownershipV1(owners),
        contributionIds: Object.freeze(
          owners.filter(({ kind }) => kind === "contribution").map(({ id }) => id),
        ),
      });
    })
    .sort((left, right) => compareCodeUnitsV1(left.fileName, right.fileName));
  return Object.freeze({
    schemaVersion: 1 as const,
    applicationId: input.applicationId,
    chunks: Object.freeze(chunks),
    assets: Object.freeze(assets),
  });
}

function requireStringArrayV1(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new TypeError(`${label} must be a string array`);
  }
  return Object.freeze([...value]);
}

/** @internal Admits the private receipt read back by the benchmark process. */
export function parseBuildDependencyReceiptInternalV1(
  serialized: string,
): BuildDependencyReceiptInternalV1 {
  const value: unknown = JSON.parse(serialized) as unknown;
  if (typeof value !== "object" || value === null || Reflect.get(value, "schemaVersion") !== 1) {
    throw new TypeError("build dependency receipt is invalid");
  }
  const applicationId = Reflect.get(value, "applicationId");
  const rawChunks = Reflect.get(value, "chunks");
  const rawAssets = Reflect.get(value, "assets");
  if (
    typeof applicationId !== "string" || !Array.isArray(rawChunks) || !Array.isArray(rawAssets)
  ) {
    throw new TypeError("build dependency receipt is invalid");
  }
  const chunks = rawChunks.map((rawChunk, index): BuildDependencyChunkReceiptInternalV1 => {
    if (typeof rawChunk !== "object" || rawChunk === null) {
      throw new TypeError(`build dependency receipt chunk ${String(index)} is invalid`);
    }
    const fileName = Reflect.get(rawChunk, "fileName");
    const isEntry = Reflect.get(rawChunk, "isEntry");
    const isDynamicEntry = Reflect.get(rawChunk, "isDynamicEntry");
    const facadeModuleId = Reflect.get(rawChunk, "facadeModuleId");
    const ownership = Reflect.get(rawChunk, "ownership");
    const rawOwners = Reflect.get(rawChunk, "owners");
    if (
      typeof fileName !== "string" || typeof isEntry !== "boolean" ||
      typeof isDynamicEntry !== "boolean" ||
      (facadeModuleId !== null && typeof facadeModuleId !== "string") ||
      !Array.isArray(rawOwners) ||
      ![
        "application",
        "contribution",
        "mixed",
        "shared_contributions",
        "unattributed",
      ].includes(String(ownership))
    ) {
      throw new TypeError(`build dependency receipt chunk ${String(index)} is invalid`);
    }
    const owners = rawOwners.map((owner): BuildDependencyOwnerInternalV1 => {
      if (typeof owner !== "object" || owner === null) {
        throw new TypeError(`build dependency receipt chunk ${String(index)} owner is invalid`);
      }
      const kind = Reflect.get(owner, "kind");
      const id = Reflect.get(owner, "id");
      if ((kind !== "application" && kind !== "contribution") || typeof id !== "string") {
        throw new TypeError(`build dependency receipt chunk ${String(index)} owner is invalid`);
      }
      return Object.freeze({ kind, id });
    });
    return Object.freeze({
      fileName,
      isEntry,
      isDynamicEntry,
      facadeModuleId,
      imports: requireStringArrayV1(Reflect.get(rawChunk, "imports"), "chunk imports"),
      dynamicImports: requireStringArrayV1(
        Reflect.get(rawChunk, "dynamicImports"),
        "chunk dynamic imports",
      ),
      moduleIds: requireStringArrayV1(Reflect.get(rawChunk, "moduleIds"), "chunk module IDs"),
      importedCss: requireStringArrayV1(
        Reflect.get(rawChunk, "importedCss"),
        "chunk imported CSS",
      ),
      importedAssets: requireStringArrayV1(
        Reflect.get(rawChunk, "importedAssets"),
        "chunk imported assets",
      ),
      owners: Object.freeze(owners),
      ownership: ownership as BuildDependencyOwnershipInternalV1,
      contributionIds: requireStringArrayV1(
        Reflect.get(rawChunk, "contributionIds"),
        "chunk contribution IDs",
      ),
    });
  });
  const assets = rawAssets.map((rawAsset, index): BuildDependencyAssetReceiptInternalV1 => {
    if (typeof rawAsset !== "object" || rawAsset === null) {
      throw new TypeError(`build dependency receipt asset ${String(index)} is invalid`);
    }
    const fileName = Reflect.get(rawAsset, "fileName");
    const ownership = Reflect.get(rawAsset, "ownership");
    const rawOwners = Reflect.get(rawAsset, "owners");
    if (
      typeof fileName !== "string" || !Array.isArray(rawOwners) ||
      ![
        "application",
        "contribution",
        "mixed",
        "shared_contributions",
        "unattributed",
      ].includes(String(ownership))
    ) {
      throw new TypeError(`build dependency receipt asset ${String(index)} is invalid`);
    }
    const owners = rawOwners.map((owner): BuildDependencyOwnerInternalV1 => {
      if (typeof owner !== "object" || owner === null) {
        throw new TypeError(`build dependency receipt asset ${String(index)} owner is invalid`);
      }
      const kind = Reflect.get(owner, "kind");
      const id = Reflect.get(owner, "id");
      if ((kind !== "application" && kind !== "contribution") || typeof id !== "string") {
        throw new TypeError(`build dependency receipt asset ${String(index)} owner is invalid`);
      }
      return Object.freeze({ kind, id });
    });
    return Object.freeze({
      fileName,
      moduleIds: requireStringArrayV1(
        Reflect.get(rawAsset, "moduleIds"),
        "asset module IDs",
      ),
      owners: Object.freeze(owners),
      ownership: ownership as BuildDependencyOwnershipInternalV1,
      contributionIds: requireStringArrayV1(
        Reflect.get(rawAsset, "contributionIds"),
        "asset contribution IDs",
      ),
    });
  });
  return Object.freeze({
    schemaVersion: 1,
    applicationId,
    chunks: Object.freeze(chunks),
    assets: Object.freeze(assets),
  });
}

function matchesCordisModuleV1(moduleId: string): boolean {
  return /(?:^|\/)(?:cordis(?:@[^/]*)?)(?:\/|$)/u.test(moduleId);
}

/** @internal Semantic negative-control facets; it deliberately does not freeze a full graph. */
export function classifyStaticGameDependencyFacetsInternalV1(
  moduleIds: readonly string[],
): StaticGameDependencyFacetsInternalV1 {
  const uniqueModuleIds = sortedUniqueV1(moduleIds);
  const authoringImplementation = uniqueModuleIds.filter((moduleId) =>
    moduleId.startsWith("engine/packages/studio/")
  );
  const devSourceImplementation = uniqueModuleIds.filter((moduleId) =>
    moduleId.startsWith("engine/packages/tooling/src/vite/") ||
    moduleId === "engine/packages/ui/src/debug/motion-sources.ts"
  );
  const dynamicExtensionImplementation = uniqueModuleIds.filter((moduleId) =>
    moduleId.startsWith("engine/packages/composition/src/extension-runtime/") ||
    moduleId.startsWith("engine/packages/composition/src/cordis/") ||
    moduleId.startsWith("vendor/cordis/") || matchesCordisModuleV1(moduleId)
  );
  const rpcImplementation = uniqueModuleIds.filter((moduleId) =>
    /^engine\/packages\/(?:base|composition|tooling|ui|web)\/src\/(?:rpc|rpc-client)\//u.test(
      moduleId,
    )
  );
  return Object.freeze({
    authoringImplementation: Object.freeze(authoringImplementation),
    devSourceImplementation: Object.freeze(devSourceImplementation),
    dynamicExtensionImplementation: Object.freeze(dynamicExtensionImplementation),
    rpcImplementation: Object.freeze(rpcImplementation),
  });
}

/** @internal Measurement-only plugin. It writes no Rollup/Vite output asset. */
export function buildDependencyReceiptPluginInternalV1(input: {
  readonly applicationId: string;
  readonly appRoot: string;
  readonly request: BuildDependencyMeasurementRequestInternalV1;
}): Plugin {
  return {
    name: "sillymaker:build-dependency-receipt",
    apply: "build",
    enforce: "post",
    generateBundle: {
      order: "post",
      async handler(_outputOptions, bundle) {
        const chunks: BuildDependencyChunkInputInternalV1[] = [];
        const assets: BuildDependencyAssetInputInternalV1[] = [];
        for (const output of Object.values(bundle)) {
          if (output.type === "chunk") {
            chunks.push(Object.freeze({
              fileName: output.fileName,
              isEntry: output.isEntry,
              isDynamicEntry: output.isDynamicEntry,
              facadeModuleId: output.facadeModuleId,
              imports: Object.freeze([...output.imports]),
              dynamicImports: Object.freeze([...output.dynamicImports]),
              moduleIds: Object.freeze([...output.moduleIds]),
              importedCss: Object.freeze([...(output.viteMetadata?.importedCss ?? [])]),
              importedAssets: Object.freeze([...(output.viteMetadata?.importedAssets ?? [])]),
            }));
            continue;
          }
          // Vite's final CSS-only dynamic output is an asset. Its original
          // module remains queryable even though the placeholder JS chunk no
          // longer exists in the bundle.
          const moduleInfos = output.originalFileNames.map((originalFileName) => {
            const moduleId = isAbsolute(originalFileName)
              ? originalFileName
              : resolve(input.appRoot, originalFileName);
            return Object.freeze({ moduleId, info: this.getModuleInfo(moduleId) });
          });
          assets.push(Object.freeze({
            fileName: output.fileName,
            moduleIds: Object.freeze(moduleInfos.map(({ moduleId }) => moduleId)),
            isEntry: moduleInfos.some(({ info }) => info?.isEntry === true),
            dynamicEntryModuleIds: Object.freeze(
              moduleInfos
                .filter(({ info }) => (info?.dynamicImporters.length ?? 0) > 0)
                .map(({ moduleId }) => moduleId),
            ),
          }));
        }
        const receipt = createBuildDependencyReceiptInternalV1({
          applicationId: input.applicationId,
          graphRoot: input.request.graphRoot,
          chunks,
          assets,
        });
        await mkdir(dirname(input.request.receiptPath), { recursive: true });
        await writeFile(
          input.request.receiptPath,
          `${JSON.stringify(receipt, null, 2)}\n`,
          "utf8",
        );
      },
    },
  };
}
