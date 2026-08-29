// SPDX-License-Identifier: MIT
import {
  assertExtensionIdentifierInternalV1,
  type ExtensionActivationStateInternalV1,
  type ExtensionCandidateSourceInternalV1,
  type ExtensionCleanupDiagnosticInternalV1,
  ExtensionRuntimeErrorInternalV1,
  type ExtensionSetupScopeInternalV1,
} from "../extension-runtime/contracts.ts";
import { createExtensionActivationControllerInternalV1 } from "../extension-runtime/controller.ts";
import {
  createExtensionLifecycleBackendInternalV1,
  mountExtensionFactoryInternalV1,
} from "../extension-runtime/selected-backend.ts";
import {
  type ActiveSillyModContributionV1,
  type CompiledSillyModPointV1,
  type CreateSillyModRuntimeInputV1,
  type CreateSillyModSelectionControllerInputV1,
  type ResolvedSillyModManifestV1,
  type SillyCodeModDefinitionV1,
  type SillyModDependencyV1,
  SillyModErrorV1,
  type SillyModErrorCodeV1,
  type SillyModExtensionPointV1,
  type SillyModLifecycleDiagnosticV1,
  type SillyModMetadataInputV1,
  type SillyModMetadataV1,
  type SillyModResourceHandleV1,
  type SillyModRuntimeV1,
  type SillyModSelectionCandidateV1,
  type SillyModSelectionControllerV1,
  type SillyModSelectionStateV1,
  type SillyModSelectionV1,
  type SillyModSourceV1,
} from "./contracts.ts";

const modRuntimeOwnerIdV1 = "sillymaker.mod-selection";
const exactVersionPatternV1 = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const caretVersionPatternV1 = /^\^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function compareCanonicalTextV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

interface VersionTupleV1 {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

interface LoadedSillyModV1<TPayload> {
  readonly metadata: SillyModMetadataV1;
  readonly contributions: readonly ActiveSillyModContributionV1<TPayload>[];
  readonly setup: SillyCodeModDefinitionV1<TPayload>["setup"] | null;
}

interface PreparedSillyModSelectionV1<TPayload, TCompiled> {
  readonly definitions: readonly LoadedSillyModV1<TPayload>[];
  readonly activeIdentity: SillyModSelectionV1<TCompiled>["activeIdentity"];
  readonly resolvedManifest: ResolvedSillyModManifestV1;
  readonly compiledPoints: SillyModSelectionV1<TCompiled>["compiledPoints"];
}

type AdmittedSillyModSourceV1<TPayload> =
  | {
    readonly kind: "data";
    readonly metadata: SillyModMetadataV1;
    readonly contributions: SillyCodeModDefinitionV1<TPayload>["contributions"];
  }
  | {
    readonly kind: "code";
    readonly metadata: SillyModMetadataV1;
    readonly source: Extract<SillyModSourceV1<TPayload>, { readonly kind: "code" }>;
  };

class SillyModCleanupFailureInternalV1 extends Error {
  override readonly name = "SillyModCleanupFailureInternalV1";

  constructor(
    readonly modId: string,
    readonly version: string,
    readonly cleanupError: unknown,
  ) {
    super(`Silly Mod ${modId}@${version} cleanup failed`, { cause: cleanupError });
  }
}

function failV1(code: SillyModErrorCodeV1, reference: string, cause?: unknown): never {
  throw new SillyModErrorV1(code, reference, cause);
}

function admitIdentifierV1(value: string, reference: string): string {
  try {
    assertExtensionIdentifierInternalV1(value, reference);
    return value;
  } catch (error) {
    return failV1("silly_mod.invalid_definition", reference, error);
  }
}

function parseExactVersionV1(value: string, reference: string): VersionTupleV1 {
  if (typeof value !== "string") {
    return failV1("silly_mod.invalid_definition", reference);
  }
  const match = exactVersionPatternV1.exec(value);
  if (match === null) return failV1("silly_mod.invalid_definition", reference);
  const version = {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
  if (!Object.values(version).every(Number.isSafeInteger)) {
    return failV1("silly_mod.invalid_definition", reference);
  }
  return version;
}

function admitVersionRangeV1(value: string, reference: string): string {
  if (value === "*") return value;
  if (exactVersionPatternV1.test(value)) {
    parseExactVersionV1(value, reference);
    return value;
  }
  const match = caretVersionPatternV1.exec(value);
  if (match === null) return failV1("silly_mod.invalid_definition", reference);
  const parts = match.slice(1);
  if (!parts.every((part) => Number.isSafeInteger(Number(part)))) {
    return failV1("silly_mod.invalid_definition", reference);
  }
  return value;
}

function compareVersionsV1(left: VersionTupleV1, right: VersionTupleV1): number {
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

function versionMatchesV1(version: string, range: string): boolean {
  if (range === "*") return true;
  const actual = parseExactVersionV1(version, "resolved version");
  const exact = exactVersionPatternV1.exec(range);
  if (exact !== null) return version === range;
  const caret = caretVersionPatternV1.exec(range)!;
  const minimum = {
    major: Number(caret[1]),
    minor: Number(caret[2]),
    patch: Number(caret[3]),
  };
  const maximum = minimum.major > 0
    ? { major: minimum.major + 1, minor: 0, patch: 0 }
    : minimum.minor > 0
    ? { major: 0, minor: minimum.minor + 1, patch: 0 }
    : { major: 0, minor: 0, patch: minimum.patch + 1 };
  return compareVersionsV1(actual, minimum) >= 0 && compareVersionsV1(actual, maximum) < 0;
}

function admitDependencyListV1(
  input: readonly SillyModDependencyV1[],
  ownerModId: string,
  kind: "requires" | "optional" | "conflicts",
): readonly SillyModDependencyV1[] {
  if (!Array.isArray(input)) return failV1("silly_mod.invalid_definition", `${ownerModId}:${kind}`);
  const seen = new Set<string>();
  const dependencies = input.map((entry) => {
    if (entry === null || typeof entry !== "object") {
      return failV1("silly_mod.invalid_definition", `${ownerModId}:${kind}`);
    }
    const modId = admitIdentifierV1(entry.modId, `${ownerModId}:${kind}:modId`);
    if (modId === ownerModId) {
      return failV1("silly_mod.invalid_definition", `${ownerModId}:${kind}:self`);
    }
    if (seen.has(modId)) return failV1("silly_mod.duplicate", `${ownerModId}:${kind}:${modId}`);
    seen.add(modId);
    return {
      modId,
      version: admitVersionRangeV1(entry.version, `${ownerModId}:${kind}:${modId}:version`),
    };
  });
  return dependencies.toSorted((left, right) => compareCanonicalTextV1(left.modId, right.modId));
}

function admitEngineApiRangesV1(
  input: Readonly<Record<string, string>>,
  reference: string,
): Readonly<Record<string, string>> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return failV1("silly_mod.invalid_definition", reference);
  }
  const entries = Object.entries(input).map(([apiId, range]) =>
    [
      admitIdentifierV1(apiId, `${reference}:api`),
      admitVersionRangeV1(range, `${reference}:${apiId}`),
    ] as const
  ).toSorted(([left], [right]) => compareCanonicalTextV1(left, right));
  return Object.fromEntries(entries);
}

function admitProvidedEngineApiV1(
  input: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return failV1("silly_mod.invalid_definition", "application engineApi");
  }
  const entries = Object.entries(input).map(([apiId, version]) =>
    (() => {
      const admitted = parseExactVersionV1(version, `application engineApi ${apiId}`);
      return [
        admitIdentifierV1(apiId, "application engineApi key"),
        `${admitted.major}.${admitted.minor}.${admitted.patch}`,
      ] as const;
    })()
  ).toSorted(([left], [right]) => compareCanonicalTextV1(left, right));
  return Object.fromEntries(entries);
}

function admitMetadataV1(input: SillyModMetadataInputV1): SillyModMetadataV1 {
  if (input === null || typeof input !== "object" || input.contractRevision !== 1) {
    return failV1("silly_mod.invalid_definition", "metadata contractRevision");
  }
  const modId = admitIdentifierV1(input.modId, "metadata modId");
  const versionTuple = parseExactVersionV1(input.version, `${modId}:version`);
  if (input.dependencies === null || typeof input.dependencies !== "object") {
    return failV1("silly_mod.invalid_definition", `${modId}:dependencies`);
  }
  if (!Array.isArray(input.facets)) {
    return failV1("silly_mod.invalid_definition", `${modId}:facets`);
  }
  const dependencyKinds = ["requires", "optional", "conflicts"] as const;
  const dependencyIds = new Map<string, string>();
  const dependencies = Object.fromEntries(dependencyKinds.map((kind) => {
    const list = admitDependencyListV1(input.dependencies[kind], modId, kind);
    for (const dependency of list) {
      const previousKind = dependencyIds.get(dependency.modId);
      if (previousKind !== undefined) {
        return failV1(
          "silly_mod.duplicate",
          `${modId}:${dependency.modId}:${previousKind}:${kind}`,
        );
      }
      dependencyIds.set(dependency.modId, kind);
    }
    return [kind, list];
  })) as unknown as SillyModMetadataV1["dependencies"];
  const facetIds = new Set<string>();
  const facets = input.facets.map((facet) => {
    const facetId = admitIdentifierV1(facet, `${modId}:facet`);
    if (facetIds.has(facetId)) return failV1("silly_mod.duplicate", `${modId}:facet:${facetId}`);
    facetIds.add(facetId);
    return facetId;
  }).toSorted();
  return {
    contractRevision: 1,
    modId,
    version: `${versionTuple.major}.${versionTuple.minor}.${versionTuple.patch}`,
    engineApi: admitEngineApiRangesV1(input.engineApi, `${modId}:engineApi`),
    dependencies,
    facets,
  } as unknown as SillyModMetadataV1;
}

export function defineSillyModMetadataV1(input: SillyModMetadataInputV1): SillyModMetadataV1 {
  return admitMetadataV1(input);
}

function admitCatalogSourceV1<TPayload>(
  source: SillyModSourceV1<TPayload>,
): AdmittedSillyModSourceV1<TPayload> {
  if (source.kind === "data") {
    return { kind: "data", metadata: source.metadata, contributions: source.contributions };
  }
  if (source.kind === "code") {
    if (typeof source.load !== "function") {
      return failV1("silly_mod.invalid_definition", "code mod loader");
    }
    return { kind: "code", metadata: source.metadata, source };
  }
  return failV1("silly_mod.invalid_definition", "catalog source kind");
}

function admitDefinitionBodyV1<TPayload>(
  contributionsInput: SillyCodeModDefinitionV1<TPayload>["contributions"],
  setupInput: SillyCodeModDefinitionV1<TPayload>["setup"] | null,
  metadata: SillyModMetadataV1,
): LoadedSillyModV1<TPayload> {
  if (!Array.isArray(contributionsInput)) {
    return failV1("silly_mod.invalid_definition", `${metadata.modId}:contributions`);
  }
  const contributionIds = new Set<string>();
  const contributions = contributionsInput.map((contribution) => {
    if (contribution === null || typeof contribution !== "object") {
      return failV1("silly_mod.invalid_definition", `${metadata.modId}:contribution`);
    }
    const contributionId = admitIdentifierV1(
      contribution.contributionId,
      `${metadata.modId}:contributionId`,
    );
    const pointId = admitIdentifierV1(contribution.pointId, `${metadata.modId}:pointId`);
    const contributionKind = admitIdentifierV1(
      contribution.contributionKind,
      `${metadata.modId}:contributionKind`,
    );
    const localIdentity = `${pointId}\0${contributionId}`;
    if (contributionIds.has(localIdentity)) {
      return failV1("silly_mod.duplicate", `${metadata.modId}:${pointId}:${contributionId}`);
    }
    contributionIds.add(localIdentity);
    return {
      modId: metadata.modId,
      modVersion: metadata.version,
      contributionId,
      pointId,
      contributionKind,
      payload: contribution.payload,
    };
  });
  const setup = setupInput ?? null;
  if (setup !== null && typeof setup !== "function") {
    return failV1("silly_mod.invalid_definition", `${metadata.modId}:setup`);
  }
  return { metadata, contributions, setup };
}

function admitExtensionPointsV1<TPayload, TCompiled>(
  input: readonly SillyModExtensionPointV1<TPayload, TCompiled>[],
): readonly SillyModExtensionPointV1<TPayload, TCompiled>[] {
  if (!Array.isArray(input)) return failV1("silly_mod.invalid_definition", "extension points");
  const pointIds = new Set<string>();
  return input.map((point) => {
    const pointId = admitIdentifierV1(point.pointId, "Silly Mod extension point id");
    if (pointIds.has(pointId)) return failV1("silly_mod.duplicate", `extension-point:${pointId}`);
    pointIds.add(pointId);
    const contributionKind = admitIdentifierV1(
      point.contributionKind,
      `Silly Mod extension point ${pointId} kind`,
    );
    if (
      (point.collisionPolicy !== "allow" && point.collisionPolicy !== "reject") ||
      typeof point.compile !== "function"
    ) {
      return failV1("silly_mod.invalid_definition", `extension-point:${pointId}`);
    }
    return {
      pointId,
      contributionKind,
      collisionPolicy: point.collisionPolicy,
      compile: point.compile,
    };
  });
}

function validateEngineApiV1(
  metadata: SillyModMetadataV1,
  engineApi: Readonly<Record<string, string>>,
): void {
  for (const [apiId, range] of Object.entries(metadata.engineApi)) {
    if (!Object.hasOwn(engineApi, apiId)) {
      return failV1("silly_mod.engine_api_missing", `${metadata.modId}:${apiId}`);
    }
    const actual = engineApi[apiId];
    if (actual === undefined) {
      return failV1("silly_mod.engine_api_missing", `${metadata.modId}:${apiId}`);
    }
    if (!versionMatchesV1(actual, range)) {
      return failV1(
        "silly_mod.engine_api_incompatible",
        `${metadata.modId}:${apiId}:${range}:${actual}`,
      );
    }
  }
}

function validateDependenciesV1<TPayload>(
  definitions: ReadonlyMap<string, LoadedSillyModV1<TPayload>>,
): void {
  for (const definition of definitions.values()) {
    for (const dependency of definition.metadata.dependencies.requires) {
      const target = definitions.get(dependency.modId);
      if (target === undefined) {
        return failV1(
          "silly_mod.dependency_missing",
          `${definition.metadata.modId}:${dependency.modId}`,
        );
      }
      if (!versionMatchesV1(target.metadata.version, dependency.version)) {
        return failV1(
          "silly_mod.dependency_incompatible",
          `${definition.metadata.modId}:${dependency.modId}:${dependency.version}:${target.metadata.version}`,
        );
      }
    }
    for (const dependency of definition.metadata.dependencies.optional) {
      const target = definitions.get(dependency.modId);
      if (target !== undefined && !versionMatchesV1(target.metadata.version, dependency.version)) {
        return failV1(
          "silly_mod.dependency_incompatible",
          `${definition.metadata.modId}:${dependency.modId}:${dependency.version}:${target.metadata.version}`,
        );
      }
    }
    for (const conflict of definition.metadata.dependencies.conflicts) {
      const target = definitions.get(conflict.modId);
      if (target !== undefined && versionMatchesV1(target.metadata.version, conflict.version)) {
        return failV1("silly_mod.conflict", `${definition.metadata.modId}:${conflict.modId}`);
      }
    }
  }
}

function canonicalOrderV1<TPayload>(
  loaded: ReadonlyMap<string, LoadedSillyModV1<TPayload>>,
): readonly LoadedSillyModV1<TPayload>[] {
  const ordered: LoadedSillyModV1<TPayload>[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (modId: string): void => {
    if (visited.has(modId)) return;
    if (visiting.has(modId)) return failV1("silly_mod.dependency_cycle", modId);
    visiting.add(modId);
    const definition = loaded.get(modId)!;
    const edges = [
      ...definition.metadata.dependencies.requires.map((entry) => entry.modId),
      ...definition.metadata.dependencies.optional
        .map((entry) => entry.modId)
        .filter((targetId) => loaded.has(targetId)),
    ].toSorted();
    for (const dependency of edges) visit(dependency);
    visiting.delete(modId);
    visited.add(modId);
    ordered.push(definition);
  };
  for (const modId of [...loaded.keys()].toSorted()) visit(modId);
  return ordered;
}

async function loadActiveDefinitionsV1<TPayload>(
  catalog: readonly SillyModSourceV1<TPayload>[],
  activeModIds: readonly string[],
  engineApi: Readonly<Record<string, string>>,
): Promise<readonly LoadedSillyModV1<TPayload>[]> {
  if (!Array.isArray(catalog) || !Array.isArray(activeModIds)) {
    return failV1("silly_mod.invalid_definition", "catalog or activeModIds");
  }
  const sources = new Map<string, AdmittedSillyModSourceV1<TPayload>>();
  for (const source of catalog) {
    const admitted = admitCatalogSourceV1<TPayload>(source);
    if (sources.has(admitted.metadata.modId)) {
      return failV1("silly_mod.duplicate", `catalog:${admitted.metadata.modId}`);
    }
    sources.set(admitted.metadata.modId, admitted);
  }
  const selected = new Set<string>();
  for (const rawModId of activeModIds) {
    const modId = admitIdentifierV1(rawModId, "active Mod id");
    if (selected.has(modId)) return failV1("silly_mod.duplicate", `active:${modId}`);
    selected.add(modId);
  }
  const loaded = new Map<string, LoadedSillyModV1<TPayload>>();
  for (const modId of [...selected].toSorted()) {
    const source = sources.get(modId);
    if (source === undefined) return failV1("silly_mod.mod_unknown", modId);
    let definition: SillyCodeModDefinitionV1<TPayload>;
    if (source.kind === "data") {
      definition = { contributions: source.contributions };
    } else {
      try {
        definition = await source.source.load();
      } catch (error) {
        return failV1("silly_mod.load_failed", modId, error);
      }
    }
    if (definition === null || typeof definition !== "object") {
      return failV1("silly_mod.invalid_definition", `${modId}:definition`);
    }
    const admitted = admitDefinitionBodyV1(
      definition.contributions,
      definition.setup ?? null,
      source.metadata,
    );
    validateEngineApiV1(admitted.metadata, engineApi);
    loaded.set(modId, admitted);
  }
  validateDependenciesV1(loaded);
  return canonicalOrderV1(loaded);
}

async function compilePointsV1<TPayload, TCompiled>(
  definitions: readonly LoadedSillyModV1<TPayload>[],
  extensionPoints: readonly SillyModExtensionPointV1<TPayload, TCompiled>[],
): Promise<readonly CompiledSillyModPointV1<TCompiled>[]> {
  const pointsById = new Map(extensionPoints.map((point) => [point.pointId, point] as const));
  const contributionsByPoint = new Map(extensionPoints.map((point) =>
    [
      point.pointId,
      [] as ActiveSillyModContributionV1<TPayload>[],
    ] as const
  ));
  const firstContributorByPointAndId = new Map<string, string>();
  for (const definition of definitions) {
    for (const contribution of definition.contributions) {
      const point = pointsById.get(contribution.pointId);
      if (point === undefined) {
        return failV1(
          "silly_mod.target_unknown",
          `${definition.metadata.modId}:${contribution.pointId}`,
        );
      }
      if (contribution.contributionKind !== point.contributionKind) {
        return failV1(
          "silly_mod.kind_mismatch",
          `${definition.metadata.modId}:${contribution.pointId}:${contribution.contributionKind}`,
        );
      }
      const collisionKey = `${point.pointId}\0${contribution.contributionId}`;
      const firstContributor = firstContributorByPointAndId.get(collisionKey);
      if (firstContributor !== undefined && point.collisionPolicy === "reject") {
        return failV1(
          "silly_mod.collision",
          `${point.pointId}:${contribution.contributionId}:${firstContributor}:${definition.metadata.modId}`,
        );
      }
      firstContributorByPointAndId.set(collisionKey, firstContributor ?? definition.metadata.modId);
      contributionsByPoint.get(point.pointId)!.push(contribution);
    }
  }
  const compiled: CompiledSillyModPointV1<TCompiled>[] = [];
  for (const point of extensionPoints) {
    try {
      compiled.push({
        pointId: point.pointId,
        value: await point.compile({
          pointId: point.pointId,
          contributions: contributionsByPoint.get(point.pointId)!,
        }),
      });
    } catch (error) {
      return failV1("silly_mod.compile_failed", point.pointId, error);
    }
  }
  return compiled;
}

function copyDependencyListV1(
  input: readonly SillyModDependencyV1[],
): readonly SillyModDependencyV1[] {
  return input.map((entry) => ({ ...entry }));
}

function copyMetadataDependenciesV1(
  input: SillyModMetadataV1["dependencies"],
): SillyModMetadataV1["dependencies"] {
  return {
    requires: copyDependencyListV1(input.requires),
    optional: copyDependencyListV1(input.optional),
    conflicts: copyDependencyListV1(input.conflicts),
  };
}

function createResolvedManifestV1<TPayload>(
  engineApi: Readonly<Record<string, string>>,
  definitions: readonly LoadedSillyModV1<TPayload>[],
): ResolvedSillyModManifestV1 {
  return {
    contractRevision: 1,
    engineApi: { ...engineApi },
    orderedMods: definitions.map((definition) => ({
      modId: definition.metadata.modId,
      version: definition.metadata.version,
      engineApi: { ...definition.metadata.engineApi },
      dependencies: copyMetadataDependenciesV1(definition.metadata.dependencies),
      facets: [...definition.metadata.facets],
      contributions: definition.contributions
        .map((entry) => ({
          pointId: entry.pointId,
          contributionId: entry.contributionId,
        }))
        .toSorted((left, right) =>
          compareCanonicalTextV1(left.pointId, right.pointId) ||
          compareCanonicalTextV1(left.contributionId, right.contributionId)
        ),
    })),
  };
}

async function prepareSelectionV1<TPayload, TCompiled>(
  catalog: readonly SillyModSourceV1<TPayload>[],
  activeModIds: readonly string[],
  engineApi: Readonly<Record<string, string>>,
  extensionPoints: readonly SillyModExtensionPointV1<TPayload, TCompiled>[],
): Promise<PreparedSillyModSelectionV1<TPayload, TCompiled>> {
  const definitions = await loadActiveDefinitionsV1(catalog, activeModIds, engineApi);
  return {
    definitions,
    activeIdentity: definitions.map((definition) => ({
      modId: definition.metadata.modId,
      version: definition.metadata.version,
    })),
    resolvedManifest: createResolvedManifestV1(engineApi, definitions),
    compiledPoints: await compilePointsV1(definitions, extensionPoints),
  };
}

function emitLifecycleDiagnosticV1(
  observer: ((diagnostic: SillyModLifecycleDiagnosticV1) => void) | undefined,
  diagnostic: SillyModLifecycleDiagnosticV1,
): void {
  try {
    observer?.(diagnostic);
  } catch {
    // Diagnostics are observational and cannot interrupt cleanup.
  }
}

function lifecycleDiagnosticAdapterV1(
  observer: ((diagnostic: SillyModLifecycleDiagnosticV1) => void) | undefined,
): ((diagnostic: ExtensionCleanupDiagnosticInternalV1) => void) | undefined {
  if (observer === undefined) return undefined;
  return (diagnostic) => {
    const failure = diagnostic.error;
    if (!(failure instanceof SillyModCleanupFailureInternalV1)) return;
    emitLifecycleDiagnosticV1(observer, {
      code: "silly_mod.cleanup_failed",
      modId: failure.modId,
      version: failure.version,
      phase: diagnostic.phase,
      error: failure.cleanupError,
    });
  };
}

async function mountSelectionResourcesV1<TPayload>(
  scope: ExtensionSetupScopeInternalV1,
  definitions: readonly LoadedSillyModV1<TPayload>[],
): Promise<void> {
  for (const definition of definitions) {
    if (definition.setup === null) continue;
    await scope.effect(async () => {
      let handle: void | SillyModResourceHandleV1;
      try {
        handle = await definition.setup!();
      } catch (error) {
        return failV1("silly_mod.setup_failed", definition.metadata.modId, error);
      }
      if (handle === undefined) return undefined;
      if (handle === null || typeof handle !== "object" || typeof handle.dispose !== "function") {
        return failV1("silly_mod.setup_failed", `${definition.metadata.modId}:handle`);
      }
      return async () => {
        try {
          await handle.dispose();
        } catch (error) {
          throw new SillyModCleanupFailureInternalV1(
            definition.metadata.modId,
            definition.metadata.version,
            error,
          );
        }
      };
    });
  }
}

function admitSelectionGenerationV1(selectionGeneration: number): number {
  if (!Number.isSafeInteger(selectionGeneration) || selectionGeneration < 1) {
    return failV1("silly_mod.selection_generation_invalid", String(selectionGeneration));
  }
  return selectionGeneration;
}

function findPublicErrorV1(error: unknown): SillyModErrorV1 | null {
  const seen = new Set<unknown>();
  let cursor: unknown = error;
  while (cursor !== null && typeof cursor === "object" && !seen.has(cursor)) {
    if (cursor instanceof SillyModErrorV1) return cursor;
    seen.add(cursor);
    cursor = cursor instanceof Error ? cursor.cause : undefined;
  }
  return null;
}

function normalizeErrorV1(error: unknown): SillyModErrorV1 {
  const publicError = findPublicErrorV1(error);
  if (publicError !== null) return publicError;
  if (error instanceof ExtensionRuntimeErrorInternalV1) {
    const codeByInternalCode: Partial<Record<typeof error.code, SillyModErrorCodeV1>> = {
      "extension_runtime.invalid_definition": "silly_mod.invalid_definition",
      "extension_runtime.factory_mismatch": "silly_mod.invalid_definition",
      "extension_runtime.load_failed": "silly_mod.load_failed",
      "extension_runtime.setup_failed": "silly_mod.setup_failed",
      "extension_runtime.publication_failed": "silly_mod.publication_failed",
      "extension_runtime.transition_busy": "silly_mod.transition_busy",
      "extension_runtime.retry_required": "silly_mod.retry_required",
      "extension_runtime.retry_unavailable": "silly_mod.retry_unavailable",
      "extension_runtime.not_ready": "silly_mod.not_ready",
      "extension_runtime.disposed": "silly_mod.disposed",
      "extension_runtime.stale_generation": "silly_mod.selection_generation_stale",
      "extension_runtime.reentrant_transition": "silly_mod.transition_busy",
      "extension_runtime.scope_closed": "silly_mod.setup_failed",
      "extension_runtime.invalid_effect": "silly_mod.setup_failed",
    };
    return new SillyModErrorV1(
      codeByInternalCode[error.code] ?? "silly_mod.invalid_definition",
      error.code,
      error,
    );
  }
  return new SillyModErrorV1("silly_mod.invalid_definition", "unexpected runtime error", error);
}

function selectionSourceV1<TPayload, TCompiled>(
  applicationGeneration: string,
  engineApi: Readonly<Record<string, string>>,
  extensionPoints: readonly SillyModExtensionPointV1<TPayload, TCompiled>[],
  input: SillyModSelectionCandidateV1<TPayload>,
): ExtensionCandidateSourceInternalV1<SillyModSelectionV1<TCompiled>> {
  const selectionGeneration = admitSelectionGenerationV1(input.selectionGeneration);
  const catalog = [...input.catalog];
  const activeModIds = [...input.activeModIds];
  const generation = String(selectionGeneration);
  return {
    id: modRuntimeOwnerIdV1,
    generation,
    async load() {
      const prepared = await prepareSelectionV1(catalog, activeModIds, engineApi, extensionPoints);
      const selection: SillyModSelectionV1<TCompiled> = {
        applicationGeneration,
        selectionGeneration,
        activeIdentity: prepared.activeIdentity,
        resolvedManifest: prepared.resolvedManifest,
        compiledPoints: prepared.compiledPoints,
      };
      return {
        id: modRuntimeOwnerIdV1,
        generation,
        async setup(scope) {
          await mountSelectionResourcesV1(scope, prepared.definitions);
          return selection;
        },
      };
    },
  };
}

/** Loads and cold-compiles one immutable, application-selected trusted Mod set. */
export async function createSillyModRuntimeV1<TPayload = unknown, TCompiled = unknown>(
  input: CreateSillyModRuntimeInputV1<TPayload, TCompiled>,
): Promise<SillyModRuntimeV1<TCompiled>> {
  const applicationGeneration = admitIdentifierV1(
    input.applicationGeneration,
    "application generation",
  );
  const engineApi = admitProvidedEngineApiV1(input.engineApi);
  const extensionPoints = admitExtensionPointsV1(input.extensionPoints);
  const prepared = await prepareSelectionV1(
    input.catalog,
    [...input.activeModIds],
    engineApi,
    extensionPoints,
  );
  const diagnosticAdapter = lifecycleDiagnosticAdapterV1(input.onLifecycleDiagnostic);
  let mounted;
  try {
    mounted = await mountExtensionFactoryInternalV1(
      {
        id: modRuntimeOwnerIdV1,
        generation: applicationGeneration,
        async setup(scope) {
          await mountSelectionResourcesV1(scope, prepared.definitions);
          return prepared.compiledPoints;
        },
      },
      diagnosticAdapter === undefined ? {} : { onDiagnostic: diagnosticAdapter },
    );
  } catch (error) {
    throw normalizeErrorV1(error);
  }
  return {
    activeIdentity: prepared.activeIdentity,
    resolvedManifest: prepared.resolvedManifest,
    compiledPoints: mounted.consumer,
    async dispose() {
      try {
        await mounted.dispose();
      } catch (error) {
        throw normalizeErrorV1(error);
      }
    },
  };
}

function mapSelectionStateV1<TCompiled>(
  state: ExtensionActivationStateInternalV1<SillyModSelectionV1<TCompiled>>,
): SillyModSelectionStateV1<TCompiled> {
  switch (state.kind) {
    case "idle":
    case "disposed":
      return state;
    case "loading":
      return {
        kind: "loading",
        selectionGeneration: Number(state.generation),
        previous: state.previous?.consumer ?? null,
      };
    case "ready":
      return { kind: "ready", current: state.current.consumer };
    case "error":
      return {
        kind: "error",
        selectionGeneration: Number(state.generation),
        error: normalizeErrorV1(state.error),
      };
    default:
      return failV1("silly_mod.invalid_definition", "selection state");
  }
}

/** Owns candidate-first replacement of complete selections within one application generation. */
export function createSillyModSelectionControllerV1<TPayload = unknown, TCompiled = unknown>(
  input: CreateSillyModSelectionControllerInputV1<TPayload, TCompiled>,
): SillyModSelectionControllerV1<TPayload, TCompiled> {
  const applicationGeneration = admitIdentifierV1(
    input.applicationGeneration,
    "application generation",
  );
  const engineApi = admitProvidedEngineApiV1(input.engineApi);
  const extensionPoints = admitExtensionPointsV1(input.extensionPoints);
  const diagnosticAdapter = lifecycleDiagnosticAdapterV1(input.onLifecycleDiagnostic);
  const controller = createExtensionActivationControllerInternalV1<SillyModSelectionV1<TCompiled>>({
    id: modRuntimeOwnerIdV1,
    backend: createExtensionLifecycleBackendInternalV1(),
    ...(diagnosticAdapter === undefined ? {} : { onDiagnostic: diagnosticAdapter }),
  });
  let highestStartedSelectionGeneration = 0;
  let cachedInternalState = controller.getState();
  let cachedPublicState = mapSelectionStateV1(cachedInternalState);

  const source = (
    candidate: SillyModSelectionCandidateV1<TPayload>,
    operation: "activate" | "restart",
  ): ExtensionCandidateSourceInternalV1<SillyModSelectionV1<TCompiled>> => {
    const selectionGeneration = admitSelectionGenerationV1(candidate.selectionGeneration);
    const state = controller.getState();
    const joining = state.kind === "loading" && state.generation === String(selectionGeneration);
    const operationReady = operation === "activate"
      ? state.kind === "idle" ||
        (state.kind === "error" && state.generation !== String(selectionGeneration))
      : state.kind === "ready";
    if (!joining && operationReady && selectionGeneration <= highestStartedSelectionGeneration) {
      return failV1("silly_mod.selection_generation_stale", String(selectionGeneration));
    }
    if (!joining && operationReady) highestStartedSelectionGeneration = selectionGeneration;
    return selectionSourceV1(applicationGeneration, engineApi, extensionPoints, candidate);
  };

  const normalizePromise = async <T>(operation: Promise<T>): Promise<T> => {
    try {
      return await operation;
    } catch (error) {
      throw normalizeErrorV1(error);
    }
  };

  return {
    activate(candidate) {
      try {
        return normalizePromise(controller.activate(source(candidate, "activate")));
      } catch (error) {
        return Promise.reject(normalizeErrorV1(error));
      }
    },
    retry: () => normalizePromise(controller.retry()),
    restart(candidate, publish) {
      if (typeof publish !== "function") {
        return Promise.reject(
          new SillyModErrorV1("silly_mod.invalid_definition", "selection publisher"),
        );
      }
      try {
        return normalizePromise(controller.restart(
          source(candidate, "restart"),
          async (candidateValue, previousValue) => {
            try {
              await publish(candidateValue.consumer, previousValue.consumer);
            } catch (error) {
              throw new SillyModErrorV1(
                "silly_mod.publication_failed",
                "selection publisher",
                error,
              );
            }
          },
        ));
      } catch (error) {
        return Promise.reject(normalizeErrorV1(error));
      }
    },
    getState() {
      const state = controller.getState();
      if (state === cachedInternalState) return cachedPublicState;
      cachedInternalState = state;
      cachedPublicState = mapSelectionStateV1(state);
      return cachedPublicState;
    },
    getCurrent: () => controller.getCurrent()?.consumer ?? null,
    subscribe(listener) {
      try {
        return controller.subscribe(listener);
      } catch (error) {
        throw normalizeErrorV1(error);
      }
    },
    dispose: () => normalizePromise(controller.dispose()),
  };
}
