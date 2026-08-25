// SPDX-License-Identifier: MIT
import { resolve } from "node:path";

import { defineSillymakerWorkspaceV1, loadWorkspaceAppsV1 } from "@sillymaker/tooling/project";
import type {
  SillymakerAppConfigV1,
  SillymakerWorkspaceConfigV1,
} from "@sillymaker/tooling/project/config-types";
import { createImportProjectModuleLoaderV1 } from "@sillymaker/tooling/project/loader";
import {
  buildImportClosureRecordsV1,
  collectImportClosure,
} from "@sillymaker/tooling/identity/collect-import-closure";
import type {
  ImportClosureRecordV1,
  ImportClosureResultV1,
} from "@sillymaker/tooling/identity/collect-import-closure";
import { inspectDeterminismSaveStateMigrationRegistryV1 } from "@sillymaker/base/testkit/save-state-migration-determinism";
import type { SaveStateMigrationRegistryV1 } from "@sillymaker/base";

interface AuthorityModuleRefV1 {
  readonly module: string;
  readonly exportName: string;
}

export interface ApplicationAuthorityPolicyV1 {
  readonly applicationId: string;
  readonly callbackOwnerEntry: string;
  /** The app's presentation facet module (negative control; must exist). */
  readonly presentationEntry: string;
  readonly coreDefinition: AuthorityModuleRefV1;
  /** Required when the core definition configures `summarizeSave`. */
  readonly saveProjectorOwner?: AuthorityModuleRefV1;
  /** Required when the core definition configures `saveStateMigrations`. */
  readonly saveStateMigrationOwner?: AuthorityModuleRefV1;
  /** Used only when an application intentionally has no BuildIdentity collector. */
  readonly dependencySeedEntries: readonly string[];
}

interface BaseAuthorityPolicyV1 {
  readonly id: string;
  readonly entry: string;
  readonly classification: "authoritative_runtime" | "durable_save_projection";
  readonly projection: "bounded_closure" | "entry";
}

interface NegativeControlPolicyV1 {
  readonly id: string;
  readonly entry: string;
  readonly classification:
    | "host_entropy"
    | "host_metadata_clock"
    | "presentation"
    | "presentation_clock"
    | "version_stamp_ingress"
    | "tooling_or_bench"
    | "base_non_authoritative";
}

export interface DeterminismAuthorityPolicyV1 {
  readonly applications: readonly ApplicationAuthorityPolicyV1[];
  readonly baseAuthorities: readonly BaseAuthorityPolicyV1[];
  readonly negativeControls: readonly NegativeControlPolicyV1[];
}

export interface AdditionalAuthorityEntryV1 {
  readonly id: string;
  readonly entry: string;
}

type ImportClosureV1 = ImportClosureResultV1;

type BuildIdentityRecordV1 = ImportClosureRecordV1 & {
  readonly facet: "story_simulation";
};

const applicationPoliciesV1 = [
  {
    applicationId: "e2e",
    callbackOwnerEntry: "e2e/src/simulation-definition.ts",
    presentationEntry: "e2e/src/presentation.ts",
    coreDefinition: {
      module: "e2e/src/application/core-definition.ts",
      exportName: "labCoreApplicationDefinitionV1",
    },
    saveStateMigrationOwner: {
      module: "e2e/src/save-state-migrations.ts",
      exportName: "labSaveStateMigrationRegistryV1",
    },
    dependencySeedEntries: [],
  },
  {
    applicationId: "template",
    callbackOwnerEntry: "template/src/game/simulation-definition.ts",
    presentationEntry: "template/src/content/presentation.ts",
    coreDefinition: {
      module: "template/src/application/core-definition.ts",
      exportName: "templateCoreApplicationDefinitionV1",
    },
    dependencySeedEntries: ["template/src/game/simulation-definition.ts"],
  },
  {
    applicationId: "example-bookshop",
    callbackOwnerEntry: "examples/bookshop/src/game/simulation-definition.ts",
    presentationEntry: "examples/bookshop/src/content/presentation.ts",
    coreDefinition: {
      module: "examples/bookshop/src/application/core-definition.ts",
      exportName: "bookshopCoreApplicationDefinitionV1",
    },
    dependencySeedEntries: [
      "examples/bookshop/src/game/simulation-definition.ts",
    ],
  },
  {
    applicationId: "example-silly-os",
    callbackOwnerEntry: "examples/silly-os/src/game/simulation-definition.ts",
    presentationEntry: "examples/silly-os/src/content/presentation.ts",
    coreDefinition: {
      module: "examples/silly-os/src/application/core-definition.ts",
      exportName: "osCoreApplicationDefinitionV1",
    },
    dependencySeedEntries: [
      "examples/silly-os/src/game/simulation-definition.ts",
    ],
  },
  {
    applicationId: "example-cat-cafe",
    callbackOwnerEntry: "examples/cat-cafe/src/game/simulation-definition.ts",
    presentationEntry: "examples/cat-cafe/src/content/presentation.ts",
    coreDefinition: {
      module: "examples/cat-cafe/src/application/core-definition.ts",
      exportName: "catcafeCoreApplicationDefinitionV1",
    },
    dependencySeedEntries: [],
  },
] satisfies readonly ApplicationAuthorityPolicyV1[];

const baseAuthorityPoliciesV1 = [
  {
    id: "simulation-admission-and-execution",
    entry: "engine/packages/base/src/authoring/define-game-simulation.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "module-definition-admission",
    entry: "engine/packages/base/src/authoring/define-gameplay-module.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "transaction-apply",
    entry: "engine/packages/base/src/authoring/game-authoring-kit.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "session-command-commit",
    entry: "engine/packages/base/src/runtime/session/game-session.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "canonical-bootstrap-admission",
    entry: "engine/packages/base/src/internal/canonical-bootstrap-admission.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "serializable-rng",
    entry: "engine/packages/base/src/contracts/rng.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "runtime-value-admission",
    entry: "engine/packages/base/src/contracts/values.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "replay-comparison",
    entry: "engine/packages/base/src/runtime/diagnostics/replay.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "content-database-ordering",
    entry: "engine/packages/base/src/contracts/content-database.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "event-pool-draw",
    entry: "engine/packages/base/src/contracts/event-pool.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "runtime-schema-admission",
    entry: "engine/packages/base/src/authoring/runtime-schema.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "simulation-patch-surface",
    entry: "engine/packages/base/src/authoring/patch-surface.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "game-package-definition",
    entry: "engine/packages/base/src/authoring/define-game-package.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "game-package-resolution",
    entry: "engine/packages/base/src/authoring/story-resolver.ts",
    classification: "authoritative_runtime" as const,
    projection: "entry" as const,
  },
  {
    id: "narrative-graph",
    entry: "engine/packages/base/src/contracts/narrative-graph.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "narrative-history",
    entry: "engine/packages/base/src/contracts/narrative-history.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "narrative-prediction",
    entry: "engine/packages/base/src/contracts/narrative-prediction.ts",
    classification: "authoritative_runtime" as const,
    projection: "entry" as const,
  },
  {
    id: "pending-interaction-resolution",
    entry: "engine/packages/base/src/contracts/pending-interaction.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "semantic-stage-state",
    entry: "engine/packages/base/src/contracts/semantic-stage.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "semantic-stage-reducer",
    entry: "engine/packages/base/src/contracts/semantic-stage-reducer.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "audio-intent-admission",
    entry: "engine/packages/base/src/contracts/media-audio.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "strict-data-parsers",
    entry: "engine/packages/base/src/contracts/presentation-data.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "save-state-migration-registry",
    entry: "engine/packages/base/src/contracts/save-state-migration.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "save-state-migration-execution",
    entry: "engine/packages/base/src/internal/save-state-migration-execution.ts",
    classification: "authoritative_runtime" as const,
    projection: "bounded_closure" as const,
  },
  {
    id: "debug-bundle",
    entry: "engine/packages/base/src/runtime/diagnostics/debug-bundle.ts",
    classification: "authoritative_runtime" as const,
    projection: "entry" as const,
  },
  {
    id: "debug-tools",
    entry: "engine/packages/base/src/runtime/diagnostics/debug-tools.ts",
    classification: "authoritative_runtime" as const,
    projection: "entry" as const,
  },
  {
    id: "debug-privacy-projection",
    entry: "engine/packages/base/src/runtime/diagnostics/privacy.ts",
    classification: "authoritative_runtime" as const,
    projection: "entry" as const,
  },
  {
    id: "save-projector-handoff",
    entry: "engine/packages/base/src/runtime/application/core-game-application.ts",
    classification: "durable_save_projection" as const,
    projection: "entry" as const,
  },
  {
    id: "save-projector-invocation",
    entry: "engine/packages/base/src/runtime/persistence/persistence-service.ts",
    classification: "durable_save_projection" as const,
    projection: "entry" as const,
  },
] satisfies readonly BaseAuthorityPolicyV1[];

const negativeControlPoliciesV1 = [
  {
    id: "web-bootstrap-entropy-host",
    entry: "engine/packages/web/src/application/start-web-game-application.tsx",
    classification: "host_entropy" as const,
  },
  {
    id: "web-host-metadata-clock",
    entry: "engine/packages/web/src/host/create-web-host.ts",
    classification: "host_metadata_clock" as const,
  },
  {
    id: "animation-frame-presentation-clock",
    entry: "engine/packages/ui/src/presentation-run/presentation-clock.ts",
    classification: "presentation_clock" as const,
  },
  {
    id: "version-stamp-build-collector",
    entry: "engine/packages/tooling/src/vite/version-stamp.ts",
    classification: "version_stamp_ingress" as const,
  },
  {
    id: "snapshot-wall-clock-benchmark",
    entry: "engine/packages/base/bench/snapshot-memory-growth.ts",
    classification: "tooling_or_bench" as const,
  },
  {
    id: "base-presentation-contract",
    entry: "engine/packages/base/src/contracts/presentation.ts",
    classification: "base_non_authoritative" as const,
  },
  {
    id: "base-presentation-canonical-json",
    entry: "engine/packages/base/src/contracts/presentation-canonical-json.ts",
    classification: "base_non_authoritative" as const,
  },
  {
    id: "base-presentation-ids",
    entry: "engine/packages/base/src/contracts/presentation-ids.ts",
    classification: "base_non_authoritative" as const,
  },
  {
    id: "base-presentation-ports",
    entry: "engine/packages/base/src/contracts/presentation-ports.ts",
    classification: "base_non_authoritative" as const,
  },
  {
    id: "base-host-contract",
    entry: "engine/packages/base/src/contracts/host.ts",
    classification: "base_non_authoritative" as const,
  },
  {
    id: "base-version-stamp-contract",
    entry: "engine/packages/base/src/contracts/version-stamp.ts",
    classification: "base_non_authoritative" as const,
  },
  {
    id: "base-player-profile-store",
    entry: "engine/packages/base/src/runtime/persistence/player-profile-store.ts",
    classification: "base_non_authoritative" as const,
  },
] satisfies readonly NegativeControlPolicyV1[];

/** DET0-only policy. It is deliberately outside every package export. */
export const determinismAuthorityPolicyV1: DeterminismAuthorityPolicyV1 = {
  applications: applicationPoliciesV1,
  baseAuthorities: baseAuthorityPoliciesV1,
  negativeControls: negativeControlPoliciesV1,
};

function compareCodeUnitsV1(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = left.charCodeAt(index) - right.charCodeAt(index);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

/** Merges freshly collected sources without assuming one source subsumes another. */
export function mergeAuthorityPathsV1(
  ...sources: readonly (readonly string[])[]
): readonly string[] {
  const paths = new Set<string>();
  for (const source of sources) {
    for (const path of source) paths.add(path);
  }
  return [...paths].sort(compareCodeUnitsV1);
}

function assertUniqueIdsV1<T extends { readonly id: string }>(values: readonly T[], label: string) {
  const seen = new Set<string>();
  for (const value of values) {
    if (value.id.length === 0 || seen.has(value.id)) {
      throw new TypeError(`${label} id is invalid: ${value.id}`);
    }
    seen.add(value.id);
  }
}

function assertClosureV1(label: string, closure: ImportClosureV1): ImportClosureV1 {
  if (closure.errors.length > 0) {
    throw new TypeError(`${label} authority closure invalid:\n${closure.errors.join("\n")}`);
  }
  if (closure.paths.length === 0) throw new TypeError(`${label} authority closure is empty`);
  return closure;
}

/** Small reusable seam used by DET0 and by the later determinism runner. */
export async function collectAuthorityClosureV1(
  repositoryRoot: string,
  entries: readonly string[],
): Promise<ImportClosureV1> {
  if (entries.length === 0) throw new TypeError("authority closure entries are empty");
  return assertClosureV1(
    entries.join(", "),
    await collectImportClosure(resolve(repositoryRoot), entries),
  );
}

function assertProductionClosureV1(
  label: string,
  closure: ImportClosureV1,
  applicationDirectory?: string,
): void {
  const testPath = closure.paths.find(
    (path) =>
      /\.(?:test|spec)\.[^/]+$/u.test(path) ||
      /(?:^|\/)(?:testkit|testing|tests?)(?:\/|$)/u.test(path),
  );
  if (testPath !== undefined) throw new TypeError(`${label} includes test source: ${testPath}`);
  const tsxPath = closure.paths.find((path) => path.endsWith(".tsx"));
  if (tsxPath !== undefined) throw new TypeError(`${label} includes TSX: ${tsxPath}`);
  const reactImport = closure.externalImports.find(
    ({ specifier }) =>
      specifier === "react" ||
      specifier.startsWith("react/") ||
      specifier === "react-dom" ||
      specifier.startsWith("react-dom/"),
  );
  if (reactImport !== undefined) {
    throw new TypeError(
      `${label} includes React: ${reactImport.owner} -> ${reactImport.specifier}`,
    );
  }
  // Both story-package layouts: the pre-locality `src/presentation.*` and
  // the Authoring Architecture S3 `src/content/presentation.*` home.
  const presentationImplementation = closure.paths.find(
    (path) =>
      path.startsWith("engine/packages/ui/") ||
      /(?:^|\/)src\/(?:content\/)?presentation(?:\.ts|\/)/u.test(path),
  );
  if (presentationImplementation !== undefined) {
    throw new TypeError(`${label} includes Presentation: ${presentationImplementation}`);
  }
  if (applicationDirectory === undefined) return;
  const presentationPath = closure.paths.find(
    (path) =>
      path === `${applicationDirectory}/src/presentation.ts` ||
      path.startsWith(`${applicationDirectory}/src/presentation/`) ||
      path === `${applicationDirectory}/src/content/presentation.ts` ||
      path.startsWith(`${applicationDirectory}/src/content/presentation/`),
  );
  if (presentationPath !== undefined) {
    throw new TypeError(`${label} includes Presentation: ${presentationPath}`);
  }
}

function validatePolicyCoverageV1(
  applications: readonly { readonly config: SillymakerAppConfigV1 }[],
  policy: DeterminismAuthorityPolicyV1,
): ReadonlyMap<string, ApplicationAuthorityPolicyV1> {
  const byId = new Map<string, ApplicationAuthorityPolicyV1>();
  for (const application of policy.applications) {
    if (byId.has(application.applicationId)) {
      throw new TypeError(`duplicate authority policy: ${application.applicationId}`);
    }
    byId.set(application.applicationId, application);
  }
  const registeredIds = new Set(applications.map(({ config }) => config.applicationId));
  const missing = [...registeredIds].filter((id) => !byId.has(id)).sort(compareCodeUnitsV1);
  if (missing.length > 0) throw new TypeError(`missing authority policy: ${missing.join(", ")}`);
  const stale = [...byId.keys()].filter((id) => !registeredIds.has(id)).sort(compareCodeUnitsV1);
  if (stale.length > 0) throw new TypeError(`stale authority policy: ${stale.join(", ")}`);
  return byId;
}

function requireBuildIdentityRecordsV1(
  value: unknown,
  label: string,
): readonly BuildIdentityRecordV1[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${label} storySimulation records are empty`);
  }
  const records = value.map((record) => {
    const path = typeof record === "object" && record !== null
      ? Reflect.get(record, "path")
      : undefined;
    const sha256 = typeof record === "object" && record !== null
      ? Reflect.get(record, "sha256")
      : undefined;
    if (
      typeof record !== "object" ||
      record === null ||
      typeof path !== "string" ||
      path.length === 0 ||
      Reflect.get(record, "facet") !== "story_simulation" ||
      typeof sha256 !== "string" ||
      !/^sha256:[0-9a-f]{64}$/u.test(sha256)
    ) {
      throw new TypeError(`${label} storySimulation record is invalid`);
    }
    return {
      path,
      facet: "story_simulation" as const,
      sha256: sha256 as `sha256:${string}`,
    };
  });
  if (new Set(records.map(({ path }) => path)).size !== records.length) {
    throw new TypeError(`${label} storySimulation records contain duplicate paths`);
  }
  return records;
}

async function loadWorkspaceRegistryV1(repositoryRoot: string): Promise<{
  readonly workspace: SillymakerWorkspaceConfigV1;
  readonly applications: Awaited<ReturnType<typeof loadWorkspaceAppsV1>>;
}> {
  const loader = createImportProjectModuleLoaderV1(repositoryRoot);
  const module = await loader.loadModule("project.config.ts");
  const workspace = defineSillymakerWorkspaceV1(
    Reflect.get(module, "sillyMakerConfigV1") as SillymakerWorkspaceConfigV1,
  );
  return {
    workspace,
    applications: await loadWorkspaceAppsV1({ repositoryRoot, workspace }),
  };
}

async function collectManagedSimulationV1(
  repositoryRoot: string,
  directory: string,
  config: SillymakerAppConfigV1,
  policy: ApplicationAuthorityPolicyV1,
): Promise<{
  readonly dependencySource: "managed_build_identity" | "explicit_dependency_seed";
  readonly records: readonly BuildIdentityRecordV1[];
}> {
  const identityRef = config.web?.identity ?? null;
  if (identityRef !== null) {
    if (policy.dependencySeedEntries.length > 0) {
      throw new TypeError(`${config.applicationId} has both BuildIdentity and dependency seeds`);
    }
    const loader = createImportProjectModuleLoaderV1(repositoryRoot);
    const module = await loader.loadModule(`${directory}/${identityRef.module}`);
    const collector = Reflect.get(module, identityRef.collectExport);
    if (typeof collector !== "function") {
      throw new TypeError(`${config.applicationId} BuildIdentity collector is missing`);
    }
    const identity = await Reflect.apply(collector, undefined, [repositoryRoot]) as unknown;
    if (typeof identity !== "object" || identity === null) {
      throw new TypeError(`${config.applicationId} BuildIdentity is invalid`);
    }
    return {
      dependencySource: "managed_build_identity" as const,
      records: requireBuildIdentityRecordsV1(
        Reflect.get(identity, "storySimulation"),
        config.applicationId,
      ),
    };
  }

  if (policy.dependencySeedEntries.length === 0) {
    throw new TypeError(`${config.applicationId} has no managed dependency seed`);
  }
  const closure = await collectAuthorityClosureV1(repositoryRoot, policy.dependencySeedEntries);
  assertProductionClosureV1(`${config.applicationId} dependency seed`, closure, directory);
  const paths = closure.paths.filter((path) => path.startsWith(`${directory}/`));
  if (paths.length === 0) {
    throw new TypeError(`${config.applicationId} dependency seed has no app-local source`);
  }
  return {
    dependencySource: "explicit_dependency_seed" as const,
    records: requireBuildIdentityRecordsV1(
      await buildImportClosureRecordsV1(repositoryRoot, paths, "story_simulation"),
      config.applicationId,
    ),
  };
}

export async function inspectConfiguredSaveProjectorV1(options: {
  readonly repositoryRoot: string;
  readonly applicationId: string;
  readonly applicationDirectory: string;
  readonly definition: AuthorityModuleRefV1;
  readonly owner?: AuthorityModuleRefV1;
}) {
  const loader = createImportProjectModuleLoaderV1(options.repositoryRoot);
  const module = await loader.loadModule(options.definition.module);
  const definition = Reflect.get(module, options.definition.exportName);
  if (typeof definition !== "object" || definition === null) {
    throw new TypeError(`${options.applicationId} core definition is missing`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(definition, "summarizeSave");
  if (descriptor === undefined) {
    if (options.owner !== undefined) {
      throw new TypeError(`${options.applicationId} Save projector owner policy is stale`);
    }
    return null;
  }
  if (
    !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
    typeof descriptor.value !== "function"
  ) {
    throw new TypeError(`${options.applicationId} summarizeSave is invalid`);
  }
  if (options.owner === undefined) {
    throw new TypeError(
      `${options.applicationId} summarizeSave requires an explicit Save projector owner`,
    );
  }
  const ownerModule = await loader.loadModule(options.owner.module);
  const owner = Reflect.get(ownerModule, options.owner.exportName);
  if (typeof owner !== "function") {
    throw new TypeError(`${options.applicationId} Save projector owner is missing`);
  }
  if (owner !== descriptor.value) {
    throw new TypeError(
      `${options.applicationId} Save projector owner does not match configured summarizeSave`,
    );
  }
  const closure = await collectAuthorityClosureV1(options.repositoryRoot, [options.owner.module]);
  assertProductionClosureV1(
    `${options.applicationId} summarizeSave owner`,
    closure,
    options.applicationDirectory,
  );
  return {
    applicationId: options.applicationId,
    entry: options.owner.module,
    exportName: options.owner.exportName,
    callbackName: "summarizeSave" as const,
    classification: "durable_save_projection" as const,
    paths: closure.paths,
  };
}

export async function inspectConfiguredSaveStateMigrationV1(options: {
  readonly repositoryRoot: string;
  readonly applicationId: string;
  readonly applicationDirectory: string;
  readonly definition: AuthorityModuleRefV1;
  readonly owner?: AuthorityModuleRefV1;
  readonly managedSimulationPaths: readonly string[];
}) {
  const loader = createImportProjectModuleLoaderV1(options.repositoryRoot);
  const module = await loader.loadModule(options.definition.module);
  const definition = Reflect.get(module, options.definition.exportName);
  if (typeof definition !== "object" || definition === null) {
    throw new TypeError(`${options.applicationId} core definition is missing`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(definition, "saveStateMigrations");
  if (
    descriptor === undefined ||
    (Object.prototype.hasOwnProperty.call(descriptor, "value") && descriptor.value === undefined)
  ) {
    if (options.owner !== undefined) {
      throw new TypeError(`${options.applicationId} Save State migration owner policy is stale`);
    }
    return null;
  }
  if (!Object.prototype.hasOwnProperty.call(descriptor, "value")) {
    throw new TypeError(`${options.applicationId} saveStateMigrations is invalid`);
  }
  let inspection: ReturnType<typeof inspectDeterminismSaveStateMigrationRegistryV1>;
  try {
    inspection = inspectDeterminismSaveStateMigrationRegistryV1(
      descriptor.value as SaveStateMigrationRegistryV1,
    );
  } catch {
    throw new TypeError(`${options.applicationId} saveStateMigrations is invalid`);
  }
  if (options.owner === undefined) {
    throw new TypeError(
      `${options.applicationId} saveStateMigrations requires an explicit Save State migration owner`,
    );
  }
  const ownerModule = await loader.loadModule(options.owner.module);
  const owner = Reflect.get(ownerModule, options.owner.exportName);
  if (owner !== descriptor.value) {
    throw new TypeError(
      `${options.applicationId} Save State migration owner does not match configured saveStateMigrations`,
    );
  }
  const closure = await collectAuthorityClosureV1(options.repositoryRoot, [options.owner.module]);
  assertProductionClosureV1(
    `${options.applicationId} Save State migration owner`,
    closure,
    options.applicationDirectory,
  );
  const appLocalPaths = closure.paths.filter((path) =>
    path.startsWith(`${options.applicationDirectory}/`)
  );
  if (!appLocalPaths.includes(options.owner.module)) {
    throw new TypeError(`${options.applicationId} Save State migration owner is not app-local`);
  }
  const managedPaths = new Set(options.managedSimulationPaths);
  const uncovered = appLocalPaths.filter((path) => !managedPaths.has(path));
  if (uncovered.length > 0) {
    throw new TypeError(
      `${options.applicationId} BuildIdentity misses Save State migration owner closure: ${
        uncovered.join(", ")
      }`,
    );
  }
  return {
    applicationId: options.applicationId,
    entry: options.owner.module,
    exportName: options.owner.exportName,
    classification: "save_state_migration" as const,
    namespace: inspection.namespace,
    callbackCount: inspection.steps.length,
    migrationIds: inspection.steps.map(({ migrationId }) => migrationId),
    callbacks: inspection.steps.map(({ migrate }) => migrate),
    paths: closure.paths,
    appLocalPaths,
  };
}

async function collectApplicationAuthorityV1(
  repositoryRoot: string,
  application: Awaited<ReturnType<typeof loadWorkspaceAppsV1>>[number],
  policy: ApplicationAuthorityPolicyV1,
) {
  const callbackOwner = await collectAuthorityClosureV1(repositoryRoot, [
    policy.callbackOwnerEntry,
  ]);
  assertProductionClosureV1(
    `${application.config.applicationId} callback owner`,
    callbackOwner,
    application.directory,
  );
  const appLocalCallbackPaths = callbackOwner.paths.filter((path) =>
    path.startsWith(`${application.directory}/`)
  );
  if (!appLocalCallbackPaths.includes(policy.callbackOwnerEntry)) {
    throw new TypeError(
      `${application.config.applicationId} callback owner entry is not app-local`,
    );
  }

  const managed = await collectManagedSimulationV1(
    repositoryRoot,
    application.directory,
    application.config,
    policy,
  );
  if (!managed.records.some(({ path }) => path.startsWith(`${application.directory}/`))) {
    throw new TypeError(
      `${application.config.applicationId} storySimulation has no app-local record`,
    );
  }
  const managedBasePath = managed.records.find(({ path }) =>
    path.startsWith("engine/packages/base/")
  );
  if (managedBasePath !== undefined) {
    throw new TypeError(
      `${application.config.applicationId} storySimulation contains Base path: ${managedBasePath.path}`,
    );
  }
  const managedPaths = new Set(managed.records.map(({ path }) => path));
  const uncovered = appLocalCallbackPaths.filter((path) => !managedPaths.has(path));
  if (uncovered.length > 0) {
    throw new TypeError(
      `${application.config.applicationId} BuildIdentity misses callback-owner closure: ${
        uncovered.join(", ")
      }`,
    );
  }

  const saveProjector = await inspectConfiguredSaveProjectorV1({
    repositoryRoot,
    applicationId: application.config.applicationId,
    applicationDirectory: application.directory,
    definition: policy.coreDefinition,
    ...(policy.saveProjectorOwner === undefined ? {} : { owner: policy.saveProjectorOwner }),
  });
  const saveStateMigration = await inspectConfiguredSaveStateMigrationV1({
    repositoryRoot,
    applicationId: application.config.applicationId,
    applicationDirectory: application.directory,
    definition: policy.coreDefinition,
    ...(policy.saveStateMigrationOwner === undefined
      ? {}
      : { owner: policy.saveStateMigrationOwner }),
    managedSimulationPaths: managed.records.map(({ path }) => path),
  });
  const authorityPaths = mergeAuthorityPathsV1(
    appLocalCallbackPaths,
    managed.records.map(({ path }) => path),
    saveStateMigration?.appLocalPaths ?? [],
  );
  return {
    applicationId: application.config.applicationId,
    directory: application.directory,
    dependencySource: managed.dependencySource,
    managedSimulationRecords: managed.records,
    callbackOwner: {
      entry: policy.callbackOwnerEntry,
      classification: "story_callback_owner" as const,
      paths: appLocalCallbackPaths,
      appLocalPaths: appLocalCallbackPaths,
      observedClosurePathCount: callbackOwner.paths.length,
      externalImports: callbackOwner.externalImports,
    },
    authorityPaths,
    saveProjector,
    saveStateMigration,
  };
}

async function collectBaseAuthorityV1(
  repositoryRoot: string,
  policy: BaseAuthorityPolicyV1,
  baseNegativeControlEntries: ReadonlySet<string>,
) {
  const closure = await collectAuthorityClosureV1(repositoryRoot, [policy.entry]);
  assertProductionClosureV1(policy.id, closure);
  if (!closure.paths.includes(policy.entry)) {
    throw new TypeError(`${policy.id} authority entry is absent from its live closure`);
  }
  if (policy.projection === "bounded_closure") {
    const negativeControl = closure.paths.find((path) => baseNegativeControlEntries.has(path));
    if (negativeControl !== undefined) {
      throw new TypeError(
        `bounded Base authority ${policy.id} includes negative control ${negativeControl}`,
      );
    }
  }
  const paths = policy.projection === "entry" ? [policy.entry] : closure.paths;
  return {
    ...policy,
    paths,
    observedClosurePathCount: closure.paths.length,
  };
}

async function collectAdditionalAuthorityV1(
  repositoryRoot: string,
  entry: AdditionalAuthorityEntryV1,
) {
  const closure = await collectAuthorityClosureV1(repositoryRoot, [entry.entry]);
  assertProductionClosureV1(`additional authority ${entry.id}`, closure);
  return {
    ...entry,
    classification: "test_extension" as const,
    paths: closure.paths,
  };
}

async function collectNegativeControlV1(
  repositoryRoot: string,
  control: NegativeControlPolicyV1,
) {
  const closure = await collectAuthorityClosureV1(repositoryRoot, [control.entry]);
  if (!closure.paths.includes(control.entry)) {
    throw new TypeError(
      `negative control ${control.id} entry is absent from its live closure`,
    );
  }
  return {
    ...control,
    paths: closure.paths,
  };
}

export async function collectDeterminismAuthorityMapV1(options: {
  readonly repositoryRoot: string;
  readonly policy?: DeterminismAuthorityPolicyV1;
  readonly additionalAuthorities?: readonly AdditionalAuthorityEntryV1[];
}) {
  const repositoryRoot = resolve(options.repositoryRoot);
  const policy = options.policy ?? determinismAuthorityPolicyV1;
  assertUniqueIdsV1(policy.baseAuthorities, "Base authority");
  assertUniqueIdsV1(policy.negativeControls, "negative control");
  const additionalPolicies = options.additionalAuthorities ?? [];
  assertUniqueIdsV1(additionalPolicies, "additional authority");
  const baseNegativeControlEntries = new Set(
    policy.negativeControls
      .filter(({ classification }) => classification === "base_non_authoritative")
      .map(({ entry }) => entry),
  );
  const policyNegativeControlEntries = new Set(
    policy.negativeControls.map(({ entry }) => entry),
  );
  const declaredAuthorityEntryPaths = [
    ...policy.applications.map(({ callbackOwnerEntry }) => callbackOwnerEntry),
    ...policy.applications.flatMap(({ saveProjectorOwner }) =>
      saveProjectorOwner === undefined ? [] : [saveProjectorOwner.module]
    ),
    ...policy.applications.flatMap(({ saveStateMigrationOwner }) =>
      saveStateMigrationOwner === undefined ? [] : [saveStateMigrationOwner.module]
    ),
    ...policy.baseAuthorities.map(({ entry }) => entry),
    ...additionalPolicies.map(({ entry }) => entry),
  ];
  const overlappingDeclaredEntry = declaredAuthorityEntryPaths.find((entry) =>
    policyNegativeControlEntries.has(entry)
  );
  if (overlappingDeclaredEntry !== undefined) {
    throw new TypeError(`authority entry overlaps negative control ${overlappingDeclaredEntry}`);
  }

  const registry = await loadWorkspaceRegistryV1(repositoryRoot);
  const storyApplications = registry.applications.filter(
    (application) => application.config.storyEntry !== null,
  );
  const policyById = validatePolicyCoverageV1(storyApplications, policy);
  const [applications, baseAuthorities, additionalAuthorities, policyNegativeControls] =
    await Promise
      .all([
        Promise.all(
          storyApplications.map((application) =>
            collectApplicationAuthorityV1(
              repositoryRoot,
              application,
              policyById.get(application.config.applicationId)!,
            )
          ),
        ),
        Promise.all(
          policy.baseAuthorities.map((entry) =>
            collectBaseAuthorityV1(repositoryRoot, entry, baseNegativeControlEntries)
          ),
        ),
        Promise.all(
          additionalPolicies.map((entry) => collectAdditionalAuthorityV1(repositoryRoot, entry)),
        ),
        Promise.all(
          policy.negativeControls.map((entry) => collectNegativeControlV1(repositoryRoot, entry)),
        ),
      ]);

  const saveProjectors = applications.flatMap(({ saveProjector }) =>
    saveProjector === null ? [] : [saveProjector]
  );
  const saveStateMigrations = applications.flatMap(({ saveStateMigration }) =>
    saveStateMigration === null ? [] : [saveStateMigration]
  );
  const presentationNegativeControls = await Promise.all(
    storyApplications.map((application) =>
      collectNegativeControlV1(repositoryRoot, {
        id: `${application.config.applicationId}-presentation`,
        entry: policyById.get(application.config.applicationId)!.presentationEntry,
        classification: "presentation",
      })
    ),
  );
  const negativeControls = [
    ...presentationNegativeControls,
    ...policyNegativeControls,
  ];
  const authoritativeEntryPaths = [
    ...applications.map(({ callbackOwner }) => callbackOwner.entry),
    ...saveProjectors.map(({ entry }) => entry),
    ...saveStateMigrations.map(({ entry }) => entry),
    ...baseAuthorities.map(({ entry }) => entry),
    ...additionalAuthorities.map(({ entry }) => entry),
  ];
  const negativeControlEntryPaths = new Set(negativeControls.map(({ entry }) => entry));
  const overlappingEntry = authoritativeEntryPaths.find((entry) =>
    negativeControlEntryPaths.has(entry)
  );
  if (overlappingEntry !== undefined) {
    throw new TypeError(`authority entry overlaps negative control ${overlappingEntry}`);
  }
  const authoritativePaths = new Set<string>();
  for (const application of applications) {
    for (const path of application.authorityPaths) authoritativePaths.add(path);
  }
  for (const authority of [...baseAuthorities, ...additionalAuthorities, ...saveProjectors]) {
    for (const path of authority.paths) authoritativePaths.add(path);
  }
  for (const authority of saveStateMigrations) {
    for (const path of authority.appLocalPaths) authoritativePaths.add(path);
  }
  const overlappingClosurePath = negativeControls
    .map(({ entry }) => entry)
    .find((entry) => authoritativePaths.has(entry));
  if (overlappingClosurePath !== undefined) {
    throw new TypeError(
      `authoritative closure includes negative control ${overlappingClosurePath}`,
    );
  }

  const diagnostics = {
    applicationCount: applications.length,
    managedSimulationRecordCount: applications.reduce(
      (total, application) => total + application.managedSimulationRecords.length,
      0,
    ),
    callbackOwnerPathCount: applications.reduce(
      (total, application) => total + application.callbackOwner.paths.length,
      0,
    ),
    baseAuthorityEntryCount: baseAuthorities.length,
    saveProjectorCount: saveProjectors.length,
    saveStateMigrationCount: saveStateMigrations.length,
    saveStateMigrationCallbackCount: saveStateMigrations.reduce(
      (total, migration) => total + migration.callbackCount,
      0,
    ),
    negativeControlCount: negativeControls.length,
    additionalAuthorityCount: additionalAuthorities.length,
    authoritativePathCount: authoritativePaths.size,
  };

  return {
    workspaceProjectId: registry.workspace.projectId,
    applications: applications,
    baseAuthorities: baseAuthorities,
    saveProjectors,
    saveStateMigrations,
    negativeControls,
    additionalAuthorities: additionalAuthorities,
    authoritativeEntryPaths,
    authoritativePaths: [...authoritativePaths].sort(compareCodeUnitsV1),
    diagnostics,
  };
}
