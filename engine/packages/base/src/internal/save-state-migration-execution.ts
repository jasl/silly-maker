// SPDX-License-Identifier: MIT
import {
  captureExactDataDescriptorsInternalV1,
  parseSaveStateContractIdentityInternalV1,
  parseSaveStateMigrationReasonCodeV1,
  readSaveStateMigrationRegistryInternalV1,
  sameSaveStateContractIdentityInternalV1,
} from "../contracts/save-state-migration.ts";
import type {
  SaveStateContractIdentityV1,
  SaveStateMigrationAttemptV1,
  SaveStateMigrationFailurePhaseV1,
  SaveStateMigrationReasonCodeV1,
  SaveStateMigrationReceiptV1,
  SaveStateMigrationRegistryV1,
  SaveStateMigrationStepIdentityV1,
  SaveStateMigrationStepV1,
} from "../contracts/save-state-migration.ts";
import { canonicalJsonBytesWithStrictLimitsInternalV1 } from "../contracts/strict-json.ts";
import type { StrictJsonLimitsV1, StrictJsonValueV1 } from "../contracts/strict-json.ts";
import type { DeepReadonly, Digest } from "../contracts/values.ts";
import { parseDigest } from "../contracts/values.ts";
import { projectStrictCanonicalJsonInternalV1 } from "./strict-canonical-projection.ts";

declare const resolvedSaveStateMigrationChainBrandInternalV1: unique symbol;

/** @internal Exact factory token for a resolved, non-empty migration suffix. */
export interface ResolvedSaveStateMigrationChainInternalV1 {
  readonly [resolvedSaveStateMigrationChainBrandInternalV1]: true;
}

declare const completedSaveStateMigrationBrandInternalV1: unique symbol;

/** @internal Exact factory token for a successfully executed migration path. */
export interface CompletedSaveStateMigrationInternalV1 {
  readonly [completedSaveStateMigrationBrandInternalV1]: true;
}

export type SaveStateMigrationChainResolutionInternalV1 =
  | {
    readonly kind: "resolved";
    readonly chain: ResolvedSaveStateMigrationChainInternalV1;
  }
  | {
    readonly kind: "unavailable";
    readonly code: "migration.unavailable";
    readonly source: SaveStateContractIdentityV1;
    readonly target: SaveStateContractIdentityV1;
  };

export type SaveStateMigrationExecutionResultInternalV1 =
  | {
    readonly kind: "migrated";
    readonly state: DeepReadonly<StrictJsonValueV1>;
    readonly completion: CompletedSaveStateMigrationInternalV1;
  }
  | {
    readonly kind: "rejected";
    readonly code: "migration.rejected";
    readonly reasonCode: SaveStateMigrationReasonCodeV1;
    readonly migrationAttempt: SaveStateMigrationAttemptV1;
  }
  | {
    readonly kind: "rejected";
    readonly code: "migration.output_invalid";
    readonly migrationAttempt: SaveStateMigrationAttemptV1;
  }
  | {
    readonly kind: "faulted";
    readonly code: "migration.callback_threw";
    readonly migrationAttempt: SaveStateMigrationAttemptV1;
  };

export type SaveStateMigrationPostExecutionFailurePhaseInternalV1 = Extract<
  SaveStateMigrationFailurePhaseV1,
  | "current_snapshot_schema"
  | "compatibility"
  | "references"
  | "invariants"
  | "replacement_prepare"
  | "replacement_commit"
>;

interface ResolvedChainMetadataInternalV1 {
  readonly source: SaveStateContractIdentityV1;
  readonly target: SaveStateContractIdentityV1;
  readonly namespace: ReturnType<
    typeof readSaveStateMigrationRegistryInternalV1
  >["namespace"];
  readonly steps: readonly SaveStateMigrationStepV1[];
  readonly stepIdentities: readonly [
    SaveStateMigrationStepIdentityV1,
    ...SaveStateMigrationStepIdentityV1[],
  ];
}

interface CompletedMigrationMetadataInternalV1 {
  readonly namespace: ResolvedChainMetadataInternalV1["namespace"];
  readonly source: SaveStateContractIdentityV1;
  readonly target: SaveStateContractIdentityV1;
  readonly steps: readonly [
    SaveStateMigrationStepIdentityV1,
    ...SaveStateMigrationStepIdentityV1[],
  ];
  readonly sourceStateDigest: Digest;
}

const resolvedChainMetadataInternalV1 = new WeakMap<
  object,
  ResolvedChainMetadataInternalV1
>();
const completedMigrationMetadataInternalV1 = new WeakMap<
  object,
  CompletedMigrationMetadataInternalV1
>();

const postExecutionFailurePhasesInternalV1 = new Set<
  SaveStateMigrationPostExecutionFailurePhaseInternalV1
>([
  "current_snapshot_schema",
  "compatibility",
  "references",
  "invariants",
  "replacement_prepare",
  "replacement_commit",
]);

function cloneStateContractIdentityInternalV1(
  identity: SaveStateContractIdentityV1,
): SaveStateContractIdentityV1 {
  return Object.freeze({
    stateContractRevision: identity.stateContractRevision,
    stateContractDigest: identity.stateContractDigest,
  });
}

function cloneStepIdentityInternalV1(
  step: SaveStateMigrationStepIdentityV1,
): SaveStateMigrationStepIdentityV1 {
  return Object.freeze({
    migrationId: step.migrationId,
    from: cloneStateContractIdentityInternalV1(step.from),
    to: cloneStateContractIdentityInternalV1(step.to),
  });
}

function cloneNonEmptyStepIdentitiesInternalV1(
  steps: readonly SaveStateMigrationStepIdentityV1[],
): readonly [SaveStateMigrationStepIdentityV1, ...SaveStateMigrationStepIdentityV1[]] {
  if (steps.length === 0) {
    throw new TypeError("Save State migration completion requires a non-empty path");
  }
  return Object.freeze(steps.map(cloneStepIdentityInternalV1)) as unknown as readonly [
    SaveStateMigrationStepIdentityV1,
    ...SaveStateMigrationStepIdentityV1[],
  ];
}

function freezeCanonicalTreeInternalV1(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (descriptor.get === undefined && descriptor.set === undefined) {
      freezeCanonicalTreeInternalV1(descriptor.value);
    }
  }
  Object.freeze(value);
}

function admitMigrationStateInternalV1(
  value: unknown,
  limits: DeepReadonly<StrictJsonLimitsV1>,
): DeepReadonly<StrictJsonValueV1> {
  const projection = projectStrictCanonicalJsonInternalV1(value, limits);
  const strict = canonicalJsonBytesWithStrictLimitsInternalV1(projection, limits);
  if (!strict.ok) {
    throw new TypeError(`Save State migration State exceeds ${strict.error.code}`);
  }
  freezeCanonicalTreeInternalV1(projection);
  return projection;
}

type ParsedMigrationStepResultInternalV1 =
  | { readonly kind: "migrated"; readonly state: unknown }
  | { readonly kind: "rejected"; readonly reasonCode: SaveStateMigrationReasonCodeV1 }
  | { readonly kind: "invalid" };

function parseMigrationStepResultInternalV1(
  value: unknown,
): ParsedMigrationStepResultInternalV1 {
  if (value === null || typeof value !== "object") {
    return Object.freeze({ kind: "invalid" });
  }
  let observedPrototype: object | null;
  try {
    observedPrototype = Object.getPrototypeOf(value);
  } catch {
    return Object.freeze({ kind: "invalid" });
  }
  let descriptors: ReturnType<typeof captureExactDataDescriptorsInternalV1>;
  try {
    descriptors = captureExactDataDescriptorsInternalV1(
      value,
      [
        ["kind", "state"],
        ["kind", "reasonCode"],
      ],
      "Save State migration callback result",
      { value: observedPrototype },
    );
  } catch {
    return Object.freeze({ kind: "invalid" });
  }
  if (descriptors.kind?.value === "migrated") {
    if (descriptors.state === undefined) return Object.freeze({ kind: "invalid" });
    return Object.freeze({ kind: "migrated", state: descriptors.state?.value });
  }
  if (descriptors.kind?.value !== "rejected" || descriptors.reasonCode === undefined) {
    return Object.freeze({ kind: "invalid" });
  }
  try {
    return Object.freeze({
      kind: "rejected",
      reasonCode: parseSaveStateMigrationReasonCodeV1(descriptors.reasonCode?.value),
    });
  } catch {
    return Object.freeze({ kind: "invalid" });
  }
}

function createAttemptInternalV1(
  metadata: CompletedMigrationMetadataInternalV1,
  completedSteps: readonly SaveStateMigrationStepIdentityV1[],
  failingStep: SaveStateMigrationStepIdentityV1 | null,
  failingPhase: SaveStateMigrationFailurePhaseV1,
  migratedStateDigest: Digest | null,
): SaveStateMigrationAttemptV1 {
  return Object.freeze({
    namespace: metadata.namespace,
    source: cloneStateContractIdentityInternalV1(metadata.source),
    target: cloneStateContractIdentityInternalV1(metadata.target),
    sourceStateDigest: metadata.sourceStateDigest,
    completedSteps: Object.freeze(completedSteps.map(cloneStepIdentityInternalV1)),
    failingStep: failingStep === null ? null : cloneStepIdentityInternalV1(failingStep),
    failingPhase,
    migratedStateDigest,
  });
}

function readResolvedChainMetadataInternalV1(
  chain: ResolvedSaveStateMigrationChainInternalV1,
): ResolvedChainMetadataInternalV1 {
  const metadata = resolvedChainMetadataInternalV1.get(chain);
  if (metadata === undefined) {
    throw new TypeError("Save State migration chain was not created by the resolver");
  }
  return metadata;
}

function readCompletedMigrationMetadataInternalV1(
  completion: CompletedSaveStateMigrationInternalV1,
): CompletedMigrationMetadataInternalV1 {
  const metadata = completedMigrationMetadataInternalV1.get(completion);
  if (metadata === undefined) {
    throw new TypeError("Save State migration completion was not created by the executor");
  }
  return metadata;
}

/** @internal Resolves only an exact, non-empty suffix of the registered chain. */
export function resolveSaveStateMigrationChainInternalV1(
  registry: SaveStateMigrationRegistryV1,
  source: SaveStateContractIdentityV1,
): SaveStateMigrationChainResolutionInternalV1 {
  const declaration = readSaveStateMigrationRegistryInternalV1(registry);
  const normalizedSource = parseSaveStateContractIdentityInternalV1(
    source,
    "stored Save State contract identity",
  );
  const normalizedTarget = cloneStateContractIdentityInternalV1(declaration.current);
  const firstStepIndex = declaration.steps.findIndex((step) =>
    sameSaveStateContractIdentityInternalV1(step.from, normalizedSource)
  );
  if (firstStepIndex < 0) {
    return Object.freeze({
      kind: "unavailable",
      code: "migration.unavailable",
      source: normalizedSource,
      target: normalizedTarget,
    });
  }

  const steps = Object.freeze(declaration.steps.slice(firstStepIndex));
  if (steps.length === 0) {
    throw new TypeError("resolved Save State migration path must not be empty");
  }
  const stepIdentities = cloneNonEmptyStepIdentitiesInternalV1(steps);
  const metadata = Object.freeze({
    namespace: declaration.namespace,
    source: normalizedSource,
    target: normalizedTarget,
    steps,
    stepIdentities,
  });
  const chain = Object.freeze({}) as ResolvedSaveStateMigrationChainInternalV1;
  resolvedChainMetadataInternalV1.set(chain, metadata);
  return Object.freeze({ kind: "resolved", chain });
}

/**
 * @internal Executes a resolved path over detached canonical State. Historical
 * Snapshot-shell admission belongs to the caller between resolve and execute.
 */
export function executeResolvedSaveStateMigrationInternalV1(input: {
  readonly chain: ResolvedSaveStateMigrationChainInternalV1;
  readonly sourceStateDigest: Digest;
  readonly state: StrictJsonValueV1;
  readonly limits: DeepReadonly<StrictJsonLimitsV1>;
}): SaveStateMigrationExecutionResultInternalV1 {
  const chain = readResolvedChainMetadataInternalV1(input.chain);
  const sourceStateDigest = parseDigest(input.sourceStateDigest);
  let state = admitMigrationStateInternalV1(input.state, input.limits);
  const completedSteps: SaveStateMigrationStepIdentityV1[] = [];
  const completionMetadata = Object.freeze({
    namespace: chain.namespace,
    source: cloneStateContractIdentityInternalV1(chain.source),
    target: cloneStateContractIdentityInternalV1(chain.target),
    steps: cloneNonEmptyStepIdentitiesInternalV1(chain.stepIdentities),
    sourceStateDigest,
  });

  for (let index = 0; index < chain.steps.length; index += 1) {
    const step = chain.steps[index];
    const stepIdentity = chain.stepIdentities[index];
    if (step === undefined || stepIdentity === undefined) {
      throw new TypeError("resolved Save State migration chain metadata is inconsistent");
    }

    let rawResult: unknown;
    const migrate = step.migrate;
    try {
      rawResult = migrate(state);
    } catch {
      return Object.freeze({
        kind: "faulted",
        code: "migration.callback_threw",
        migrationAttempt: createAttemptInternalV1(
          completionMetadata,
          completedSteps,
          stepIdentity,
          "callback",
          null,
        ),
      });
    }

    const result = parseMigrationStepResultInternalV1(rawResult);
    if (result.kind === "invalid") {
      return Object.freeze({
        kind: "rejected",
        code: "migration.output_invalid",
        migrationAttempt: createAttemptInternalV1(
          completionMetadata,
          completedSteps,
          stepIdentity,
          "result_envelope",
          null,
        ),
      });
    }
    if (result.kind === "rejected") {
      return Object.freeze({
        kind: "rejected",
        code: "migration.rejected",
        reasonCode: result.reasonCode,
        migrationAttempt: createAttemptInternalV1(
          completionMetadata,
          completedSteps,
          stepIdentity,
          "callback_rejected",
          null,
        ),
      });
    }

    try {
      state = admitMigrationStateInternalV1(result.state, input.limits);
    } catch {
      return Object.freeze({
        kind: "rejected",
        code: "migration.output_invalid",
        migrationAttempt: createAttemptInternalV1(
          completionMetadata,
          completedSteps,
          stepIdentity,
          "output_admission",
          null,
        ),
      });
    }
    completedSteps.push(stepIdentity);
  }

  const completion = Object.freeze({}) as CompletedSaveStateMigrationInternalV1;
  completedMigrationMetadataInternalV1.set(completion, completionMetadata);
  return Object.freeze({ kind: "migrated", state, completion });
}

/** @internal Finalizes provenance only after the caller derives a whole-Snapshot digest. */
export function createSaveStateMigrationReceiptInternalV1(
  completion: CompletedSaveStateMigrationInternalV1,
  migratedStateDigest: Digest,
): SaveStateMigrationReceiptV1 {
  const metadata = readCompletedMigrationMetadataInternalV1(completion);
  return Object.freeze({
    namespace: metadata.namespace,
    source: cloneStateContractIdentityInternalV1(metadata.source),
    target: cloneStateContractIdentityInternalV1(metadata.target),
    steps: cloneNonEmptyStepIdentitiesInternalV1(metadata.steps),
    sourceStateDigest: metadata.sourceStateDigest,
    migratedStateDigest: parseDigest(migratedStateDigest),
  });
}

/** @internal Constructs diagnostics for a failure after all callbacks completed. */
export function createSaveStateMigrationAttemptInternalV1(
  completion: CompletedSaveStateMigrationInternalV1,
  failingPhase: SaveStateMigrationPostExecutionFailurePhaseInternalV1,
  migratedStateDigest: Digest | null,
): SaveStateMigrationAttemptV1 {
  const metadata = readCompletedMigrationMetadataInternalV1(completion);
  if (!postExecutionFailurePhasesInternalV1.has(failingPhase)) {
    throw new TypeError("invalid post-execution Save State migration failure phase");
  }
  const digestRequired = failingPhase !== "current_snapshot_schema";
  if (
    (digestRequired && migratedStateDigest === null) ||
    (!digestRequired && migratedStateDigest !== null)
  ) {
    throw new TypeError("Save State migration failure phase/digest mismatch");
  }
  return createAttemptInternalV1(
    metadata,
    metadata.steps,
    null,
    failingPhase,
    migratedStateDigest === null ? null : parseDigest(migratedStateDigest),
  );
}
