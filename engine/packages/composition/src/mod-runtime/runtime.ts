// SPDX-License-Identifier: MIT
import {
  assertExtensionIdentifierInternalV1,
  type ExtensionFactoryInternalV1,
} from "../extension-runtime/contracts.ts";
import { mountExtensionFactoryInternalV1 } from "../extension-runtime/selected-backend.ts";
import {
  ApplicationModRuntimeErrorInternalV1,
  type ActiveApplicationModContributionInternalV1,
  type ApplicationCodeModDefinitionInternalV1,
  type ApplicationModExtensionPointInternalV1,
  type ApplicationModRuntimeErrorCodeInternalV1,
  type ApplicationModRuntimeInternalV1,
  type ApplicationModSourceInternalV1,
  type CompiledApplicationModPointInternalV1,
  type CreateApplicationModRuntimeInputInternalV1,
} from "./contracts.ts";

const modRuntimeOwnerIdInternalV1 = "sillymaker.application-mod-runtime";

interface LoadedApplicationModInternalV1<TPayload> {
  readonly modId: string;
  readonly generation: string;
  readonly dependencies: readonly string[];
  readonly contributions: readonly ActiveApplicationModContributionInternalV1<TPayload>[];
  readonly lifecycle: ExtensionFactoryInternalV1<unknown> | null;
}

type AdmittedApplicationModSourceInternalV1<TPayload> =
  | {
    readonly kind: "data";
    readonly modId: string;
    readonly generation: string;
    readonly definition: ApplicationCodeModDefinitionInternalV1<TPayload>;
  }
  | {
    readonly kind: "code";
    readonly modId: string;
    readonly generation: string;
    readonly source: Extract<ApplicationModSourceInternalV1<TPayload>, { readonly kind: "code" }>;
  };

function failInternalV1(
  code: ApplicationModRuntimeErrorCodeInternalV1,
  reference: string,
  cause?: unknown,
): never {
  throw new ApplicationModRuntimeErrorInternalV1(code, reference, cause);
}

function admitIdentifierInternalV1(value: string, reference: string): string {
  try {
    assertExtensionIdentifierInternalV1(value, reference);
    return value;
  } catch (error) {
    return failInternalV1("mod_runtime.invalid_definition", reference, error);
  }
}

function admitCatalogSourceInternalV1<TPayload>(
  source: ApplicationModSourceInternalV1<TPayload>,
): AdmittedApplicationModSourceInternalV1<TPayload> {
  if (source.kind === "data") {
    const modId = admitIdentifierInternalV1(source.definition.modId, "data mod id");
    return {
      kind: "data",
      modId,
      generation: admitIdentifierInternalV1(
        source.definition.generation,
        `data mod ${modId} generation`,
      ),
      definition: source.definition,
    };
  }
  if (source.kind === "code") {
    const modId = admitIdentifierInternalV1(source.modId, "code mod id");
    return {
      kind: "code",
      modId,
      generation: admitIdentifierInternalV1(
        source.generation,
        `code mod ${modId} generation`,
      ),
      source,
    };
  }
  return failInternalV1("mod_runtime.invalid_definition", "catalog source kind");
}

function admitDefinitionBodyInternalV1<TPayload>(
  definition: ApplicationCodeModDefinitionInternalV1<TPayload>,
  sourceKind: "data" | "code",
  identity: { readonly modId: string; readonly generation: string },
): LoadedApplicationModInternalV1<TPayload> {
  const { modId, generation } = identity;
  if (!Array.isArray(definition.dependencies) || !Array.isArray(definition.contributions)) {
    return failInternalV1("mod_runtime.invalid_definition", modId);
  }

  const dependencyIds = new Set<string>();
  const dependencies = definition.dependencies.map((dependency) => {
    const dependencyId = admitIdentifierInternalV1(
      dependency,
      `mod ${modId} dependency`,
    );
    if (dependencyIds.has(dependencyId)) {
      return failInternalV1("mod_runtime.duplicate", `${modId}:dependency:${dependencyId}`);
    }
    dependencyIds.add(dependencyId);
    return dependencyId;
  });

  const contributionIds = new Set<string>();
  const contributions = definition.contributions.map((contribution) => {
    const contributionId = admitIdentifierInternalV1(
      contribution.contributionId,
      `mod ${modId} contribution id`,
    );
    const pointId = admitIdentifierInternalV1(
      contribution.pointId,
      `mod ${modId} contribution point`,
    );
    const contributionKind = admitIdentifierInternalV1(
      contribution.contributionKind,
      `mod ${modId} contribution kind`,
    );
    const localIdentity = `${pointId}\0${contributionId}`;
    if (contributionIds.has(localIdentity)) {
      return failInternalV1(
        "mod_runtime.duplicate",
        `${modId}:contribution:${pointId}:${contributionId}`,
      );
    }
    contributionIds.add(localIdentity);
    return {
      modId,
      modGeneration: generation,
      contributionId,
      pointId,
      contributionKind,
      payload: contribution.payload,
    };
  });

  const lifecycle = sourceKind === "code" ? definition.lifecycle ?? null : null;
  if (
    lifecycle !== null &&
    (lifecycle.id !== modId || lifecycle.generation !== generation)
  ) {
    return failInternalV1("mod_runtime.identity_mismatch", `${modId}:lifecycle`);
  }
  if (modId === modRuntimeOwnerIdInternalV1) {
    return failInternalV1("mod_runtime.invalid_definition", `${modId}:reserved`);
  }
  return { modId, generation, dependencies, contributions, lifecycle };
}

function admitExtensionPointsInternalV1<TPayload, TCompiled>(
  input: readonly ApplicationModExtensionPointInternalV1<TPayload, TCompiled>[],
): readonly ApplicationModExtensionPointInternalV1<TPayload, TCompiled>[] {
  const pointIds = new Set<string>();
  return input.map((point) => {
    const pointId = admitIdentifierInternalV1(point.pointId, "mod extension point id");
    if (pointIds.has(pointId)) {
      return failInternalV1("mod_runtime.duplicate", `extension-point:${pointId}`);
    }
    pointIds.add(pointId);
    const contributionKind = admitIdentifierInternalV1(
      point.contributionKind,
      `mod extension point ${pointId} kind`,
    );
    if (
      (point.collisionPolicy !== "allow" && point.collisionPolicy !== "reject") ||
      typeof point.compile !== "function"
    ) {
      return failInternalV1("mod_runtime.invalid_definition", `extension-point:${pointId}`);
    }
    return {
      pointId,
      contributionKind,
      collisionPolicy: point.collisionPolicy,
      compile: point.compile,
    };
  });
}

async function loadActiveDefinitionsInternalV1<TPayload>(
  catalog: readonly ApplicationModSourceInternalV1<TPayload>[],
  activeModIds: readonly string[],
): Promise<readonly LoadedApplicationModInternalV1<TPayload>[]> {
  const sources = new Map<string, AdmittedApplicationModSourceInternalV1<TPayload>>();
  for (const source of catalog) {
    const admittedSource = admitCatalogSourceInternalV1(source);
    if (sources.has(admittedSource.modId)) {
      return failInternalV1("mod_runtime.duplicate", `catalog:${admittedSource.modId}`);
    }
    sources.set(admittedSource.modId, admittedSource);
  }

  const selected = new Set<string>();
  const loaded = new Map<string, LoadedApplicationModInternalV1<TPayload>>();
  for (const rawModId of activeModIds) {
    const modId = admitIdentifierInternalV1(rawModId, "active mod id");
    if (selected.has(modId)) {
      return failInternalV1("mod_runtime.duplicate", `active:${modId}`);
    }
    selected.add(modId);
    const catalogEntry = sources.get(modId);
    if (catalogEntry === undefined) return failInternalV1("mod_runtime.mod_unknown", modId);

    let admitted: LoadedApplicationModInternalV1<TPayload>;
    if (catalogEntry.kind === "data") {
      admitted = admitDefinitionBodyInternalV1(
        catalogEntry.definition,
        "data",
        catalogEntry,
      );
    } else {
      let definition: ApplicationCodeModDefinitionInternalV1<TPayload>;
      try {
        definition = await catalogEntry.source.load();
      } catch (error) {
        return failInternalV1("mod_runtime.load_failed", modId, error);
      }
      if (
        definition.modId !== modId ||
        definition.generation !== catalogEntry.generation
      ) {
        return failInternalV1("mod_runtime.identity_mismatch", modId);
      }
      admitted = admitDefinitionBodyInternalV1(definition, "code", catalogEntry);
    }
    loaded.set(modId, admitted);
  }

  for (const definition of loaded.values()) {
    for (const dependency of definition.dependencies) {
      if (!loaded.has(dependency)) {
        return failInternalV1(
          "mod_runtime.dependency_missing",
          `${definition.modId}:${dependency}`,
        );
      }
    }
  }

  const ordered: LoadedApplicationModInternalV1<TPayload>[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (modId: string): void => {
    if (visited.has(modId)) return;
    if (visiting.has(modId)) {
      return failInternalV1("mod_runtime.dependency_cycle", modId);
    }
    visiting.add(modId);
    const definition = loaded.get(modId)!;
    for (const dependency of definition.dependencies) visit(dependency);
    visiting.delete(modId);
    visited.add(modId);
    ordered.push(definition);
  };
  for (const modId of activeModIds) visit(modId);
  return ordered;
}

async function compilePointsInternalV1<TPayload, TCompiled>(
  definitions: readonly LoadedApplicationModInternalV1<TPayload>[],
  extensionPoints: readonly ApplicationModExtensionPointInternalV1<TPayload, TCompiled>[],
): Promise<readonly CompiledApplicationModPointInternalV1<TCompiled>[]> {
  const pointsById = new Map(extensionPoints.map((point) => [point.pointId, point] as const));
  const contributionsByPoint = new Map(
    extensionPoints.map((point) =>
      [point.pointId, [] as ActiveApplicationModContributionInternalV1<TPayload>[]] as const
    ),
  );
  const firstContributorByPointAndId = new Map<string, string>();

  for (const definition of definitions) {
    for (const contribution of definition.contributions) {
      const point = pointsById.get(contribution.pointId);
      if (point === undefined) {
        return failInternalV1(
          "mod_runtime.target_unknown",
          `${definition.modId}:${contribution.pointId}`,
        );
      }
      if (contribution.contributionKind !== point.contributionKind) {
        return failInternalV1(
          "mod_runtime.kind_mismatch",
          `${definition.modId}:${contribution.pointId}:${contribution.contributionKind}`,
        );
      }
      const collisionKey = `${point.pointId}\0${contribution.contributionId}`;
      const firstContributor = firstContributorByPointAndId.get(collisionKey);
      if (firstContributor !== undefined && point.collisionPolicy === "reject") {
        return failInternalV1(
          "mod_runtime.collision",
          `${point.pointId}:${contribution.contributionId}:${firstContributor}:${definition.modId}`,
        );
      }
      firstContributorByPointAndId.set(collisionKey, firstContributor ?? definition.modId);
      contributionsByPoint.get(point.pointId)!.push(contribution);
    }
  }

  const compiled: CompiledApplicationModPointInternalV1<TCompiled>[] = [];
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
      return failInternalV1("mod_runtime.compile_failed", point.pointId, error);
    }
  }
  return compiled;
}

/**
 * Loads and cold-compiles one immutable application-generation Mod selection.
 * It owns no resolver, State, Save, digest, or live installation surface.
 */
export async function createApplicationModRuntimeInternalV1<
  TPayload = unknown,
  TCompiled = unknown,
>(
  input: CreateApplicationModRuntimeInputInternalV1<TPayload, TCompiled>,
): Promise<ApplicationModRuntimeInternalV1<TCompiled>> {
  const extensionPoints = admitExtensionPointsInternalV1(input.extensionPoints);
  const definitions = await loadActiveDefinitionsInternalV1(
    input.catalog,
    [...input.activeModIds],
  );
  const compiledPoints = await compilePointsInternalV1(definitions, extensionPoints);
  const activeIdentity = definitions.map((definition) => ({
    modId: definition.modId,
    generation: definition.generation,
  }));

  const mounted = await mountExtensionFactoryInternalV1(
    {
      id: modRuntimeOwnerIdInternalV1,
      generation: input.applicationGeneration,
      async setup(scope) {
        for (const definition of definitions) {
          if (definition.lifecycle !== null) {
            await scope.mountChild(definition.lifecycle);
          }
        }
        return compiledPoints;
      },
    },
    input.onLifecycleDiagnostic === undefined ? {} : {
      onDiagnostic: input.onLifecycleDiagnostic,
    },
  );

  return {
    activeIdentity,
    compiledPoints: mounted.consumer,
    dispose: () => mounted.dispose(),
  };
}
