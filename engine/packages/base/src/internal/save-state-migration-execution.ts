// SPDX-License-Identifier: MIT
import {
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
import type { StrictJsonLimitsV1, StrictJsonValueV1 } from "../contracts/strict-json.ts";
import type { DeepReadonly, Digest } from "../contracts/values.ts";
import { projectStrictCanonicalJsonInternalV1 } from "./strict-canonical-projection.ts";

/** @internal Trusted resolved, non-empty migration suffix. */
export interface ResolvedSaveStateMigrationChainInternalV1 {
  readonly metadata: ResolvedChainMetadataInternalV1;
}

/** @internal Trusted metadata for a successfully executed migration path. */
export interface CompletedSaveStateMigrationInternalV1 {
  readonly metadata: CompletedMigrationMetadataInternalV1;
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
  return {
    stateContractRevision: identity.stateContractRevision,
    stateContractDigest: identity.stateContractDigest,
  };
}

function cloneStepIdentityInternalV1(
  step: SaveStateMigrationStepIdentityV1,
): SaveStateMigrationStepIdentityV1 {
  return {
    migrationId: step.migrationId,
    from: cloneStateContractIdentityInternalV1(step.from),
    to: cloneStateContractIdentityInternalV1(step.to),
  };
}

function cloneNonEmptyStepIdentitiesInternalV1(
  steps: readonly [SaveStateMigrationStepIdentityV1, ...SaveStateMigrationStepIdentityV1[]],
): readonly [SaveStateMigrationStepIdentityV1, ...SaveStateMigrationStepIdentityV1[]] {
  return steps.map(cloneStepIdentityInternalV1) as unknown as readonly [
    SaveStateMigrationStepIdentityV1,
    ...SaveStateMigrationStepIdentityV1[],
  ];
}

function admitMigrationStateInternalV1(
  value: unknown,
  limits: DeepReadonly<StrictJsonLimitsV1>,
): DeepReadonly<StrictJsonValueV1> {
  return projectStrictCanonicalJsonInternalV1(value, limits);
}

type ParsedMigrationStepResultInternalV1 =
  | { readonly kind: "migrated"; readonly state: unknown }
  | { readonly kind: "rejected"; readonly reasonCode: SaveStateMigrationReasonCodeV1 }
  | { readonly kind: "invalid" };

function parseMigrationStepResultInternalV1(
  value: unknown,
): ParsedMigrationStepResultInternalV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { kind: "invalid" };
  }
  try {
    const result = value as {
      readonly kind?: unknown;
      readonly state?: unknown;
      readonly reasonCode?: unknown;
    };
    const kind = result.kind;
    if (kind === "migrated") {
      const state = result.state;
      return state === undefined ? { kind: "invalid" } : { kind, state };
    }
    if (kind === "rejected") {
      const reasonCode = result.reasonCode;
      return reasonCode === undefined ? { kind: "invalid" } : {
        kind,
        reasonCode: parseSaveStateMigrationReasonCodeV1(reasonCode),
      };
    }
    return { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}

function createAttemptInternalV1(
  metadata: CompletedMigrationMetadataInternalV1,
  completedSteps: readonly SaveStateMigrationStepIdentityV1[],
  failingStep: SaveStateMigrationStepIdentityV1 | null,
  failingPhase: SaveStateMigrationFailurePhaseV1,
  migratedStateDigest: Digest | null,
): SaveStateMigrationAttemptV1 {
  return {
    namespace: metadata.namespace,
    source: cloneStateContractIdentityInternalV1(metadata.source),
    target: cloneStateContractIdentityInternalV1(metadata.target),
    sourceStateDigest: metadata.sourceStateDigest,
    completedSteps: completedSteps.map(cloneStepIdentityInternalV1),
    failingStep: failingStep === null ? null : cloneStepIdentityInternalV1(failingStep),
    failingPhase,
    migratedStateDigest,
  };
}

/** @internal Resolves only an exact, non-empty suffix of the registered chain. */
export function resolveSaveStateMigrationChainInternalV1(
  registry: SaveStateMigrationRegistryV1,
  source: SaveStateContractIdentityV1,
): SaveStateMigrationChainResolutionInternalV1 {
  const declaration = readSaveStateMigrationRegistryInternalV1(registry);
  const normalizedSource = cloneStateContractIdentityInternalV1(source);
  const normalizedTarget = cloneStateContractIdentityInternalV1(declaration.current);
  const firstStepIndex = declaration.steps.findIndex((step) =>
    sameSaveStateContractIdentityInternalV1(step.from, normalizedSource)
  );
  if (firstStepIndex < 0) {
    return {
      kind: "unavailable",
      code: "migration.unavailable",
      source: normalizedSource,
      target: normalizedTarget,
    };
  }

  const steps = declaration.steps.slice(firstStepIndex);
  if (steps.length === 0) {
    throw new TypeError("resolved Save State migration path must not be empty");
  }
  const stepIdentities = cloneNonEmptyStepIdentitiesInternalV1(
    steps as [SaveStateMigrationStepV1, ...SaveStateMigrationStepV1[]],
  );
  const metadata: ResolvedChainMetadataInternalV1 = {
    namespace: declaration.namespace,
    source: normalizedSource,
    target: normalizedTarget,
    steps,
    stepIdentities,
  };
  return { kind: "resolved", chain: { metadata } };
}

/** @internal Constructs diagnostics when the historical Snapshot shell is invalid. */
export function createSaveStateMigrationSnapshotShellAttemptInternalV1(
  chain: ResolvedSaveStateMigrationChainInternalV1,
  sourceStateDigest: Digest,
): SaveStateMigrationAttemptV1 {
  const metadata = chain.metadata;
  return createAttemptInternalV1(
    {
      namespace: metadata.namespace,
      source: cloneStateContractIdentityInternalV1(metadata.source),
      target: cloneStateContractIdentityInternalV1(metadata.target),
      steps: cloneNonEmptyStepIdentitiesInternalV1(metadata.stepIdentities),
      sourceStateDigest,
    },
    [],
    null,
    "snapshot_shell",
    null,
  );
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
  const chain = input.chain.metadata;
  const sourceStateDigest = input.sourceStateDigest;
  let state = admitMigrationStateInternalV1(input.state, input.limits);
  const completedSteps: SaveStateMigrationStepIdentityV1[] = [];
  const completionMetadata: CompletedMigrationMetadataInternalV1 = {
    namespace: chain.namespace,
    source: cloneStateContractIdentityInternalV1(chain.source),
    target: cloneStateContractIdentityInternalV1(chain.target),
    steps: cloneNonEmptyStepIdentitiesInternalV1(chain.stepIdentities),
    sourceStateDigest,
  };

  for (let index = 0; index < chain.steps.length; index += 1) {
    const step = chain.steps[index]!;
    const stepIdentity = chain.stepIdentities[index]!;

    let rawResult: unknown;
    const migrate = step.migrate;
    try {
      rawResult = migrate(state);
    } catch {
      return {
        kind: "faulted",
        code: "migration.callback_threw",
        migrationAttempt: createAttemptInternalV1(
          completionMetadata,
          completedSteps,
          stepIdentity,
          "callback",
          null,
        ),
      };
    }

    const result = parseMigrationStepResultInternalV1(rawResult);
    if (result.kind === "invalid") {
      return {
        kind: "rejected",
        code: "migration.output_invalid",
        migrationAttempt: createAttemptInternalV1(
          completionMetadata,
          completedSteps,
          stepIdentity,
          "result_envelope",
          null,
        ),
      };
    }
    if (result.kind === "rejected") {
      return {
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
      };
    }

    try {
      state = admitMigrationStateInternalV1(result.state, input.limits);
    } catch {
      return {
        kind: "rejected",
        code: "migration.output_invalid",
        migrationAttempt: createAttemptInternalV1(
          completionMetadata,
          completedSteps,
          stepIdentity,
          "output_admission",
          null,
        ),
      };
    }
    completedSteps.push(stepIdentity);
  }

  return { kind: "migrated", state, completion: { metadata: completionMetadata } };
}

/** @internal Finalizes provenance only after the caller derives a whole-Snapshot digest. */
export function createSaveStateMigrationReceiptInternalV1(
  completion: CompletedSaveStateMigrationInternalV1,
  migratedStateDigest: Digest,
): SaveStateMigrationReceiptV1 {
  const metadata = completion.metadata;
  return {
    namespace: metadata.namespace,
    source: cloneStateContractIdentityInternalV1(metadata.source),
    target: cloneStateContractIdentityInternalV1(metadata.target),
    steps: cloneNonEmptyStepIdentitiesInternalV1(metadata.steps),
    sourceStateDigest: metadata.sourceStateDigest,
    migratedStateDigest,
  };
}

/** @internal Constructs diagnostics for a failure after all callbacks completed. */
export function createSaveStateMigrationAttemptInternalV1(
  completion: CompletedSaveStateMigrationInternalV1,
  failingPhase: SaveStateMigrationPostExecutionFailurePhaseInternalV1,
  migratedStateDigest: Digest | null,
): SaveStateMigrationAttemptV1 {
  const metadata = completion.metadata;
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
    migratedStateDigest,
  );
}
