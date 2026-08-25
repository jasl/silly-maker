// SPDX-License-Identifier: MIT
import type { PlayerDiagnosticsPortV1 } from "../../contracts/application.ts";
import {
  DebugBundleEnvelopeSchemaFailureV1,
  debugBundleJsonLimitsV1,
} from "../../contracts/diagnostics.ts";
import type {
  DebugBundleEnvelopeV1,
  ExportedDebugBundleV1,
  RuntimeOperationFaultV1,
} from "../../contracts/diagnostics.ts";
import { digestBytes, digestCanonical } from "../../contracts/digest.ts";
import { RngStateSchemaFailureInternalV1 } from "../../contracts/rng.ts";
import type { IsoUtcInstant } from "../../contracts/host.ts";
import {
  canonicalJsonBytesWithStrictLimitsInternalV1,
  parseStrictJson,
} from "../../contracts/strict-json.ts";
import type { StrictJsonErrorCodeV1 } from "../../contracts/strict-json.ts";
import type { DeepReadonly, Digest, RuntimeSchemaV1 } from "../../contracts/values.ts";
import { scrubRuntimeOperationFaultV1 } from "./privacy.ts";

export interface DebugBundleDigestEnvelopeV1<TSnapshot> {
  readonly replayBase: TSnapshot;
  readonly replayBaseStateDigest: Digest;
  readonly currentSnapshot: TSnapshot;
  readonly currentStateDigest: Digest;
}

export interface DebugBundleCodecContextV1<
  TSnapshot,
  TBundle extends DebugBundleDigestEnvelopeV1<TSnapshot>,
> {
  readonly bundleSchema: RuntimeSchemaV1<TBundle>;
  validateEnvelope(bundle: TBundle): void;
}

export type DebugBundleDecodeRejectionCodeV1 =
  | StrictJsonErrorCodeV1
  | "rng.invalid_state"
  | "envelope.schema_invalid"
  | "envelope.unsupported_revision"
  | "digest.invalid_format"
  | "digest.replay_base_state_mismatch"
  | "digest.current_state_mismatch";

export type DebugBundleDecodeResultV1<TBundle> =
  | { readonly kind: "decoded"; readonly bundle: DeepReadonly<TBundle> }
  | { readonly kind: "rejected"; readonly code: DebugBundleDecodeRejectionCodeV1 };

export interface DebugBundleReplayEvidenceV1<TSnapshot, TCommandLogEntry> {
  readonly replayBase: DeepReadonly<TSnapshot>;
  readonly replayBaseStateDigest: Digest;
  readonly commandLog: readonly DeepReadonly<TCommandLogEntry>[];
}

type StandardDebugBundleV1<
  TProvenance,
  TCapabilities,
  TSimulationLineage,
  TSnapshot,
  TCommandLogEntry,
  TDiagnostics,
  TFailure,
  TUiContext,
> = DebugBundleEnvelopeV1<
  TProvenance,
  TCapabilities,
  TSimulationLineage,
  TSnapshot,
  TCommandLogEntry,
  TDiagnostics,
  RuntimeOperationFaultV1,
  TFailure,
  TUiContext
>;

export type CreateGameDiagnosticsServiceInputV1<
  TProvenance,
  TCapabilities,
  TSimulationLineage,
  TSnapshot,
  TCommandLogEntry,
  TDiagnostics,
  TFailure,
  TUiContext = never,
> =
  & {
    readonly codec: DebugBundleCodecContextV1<
      TSnapshot,
      StandardDebugBundleV1<
        TProvenance,
        TCapabilities,
        TSimulationLineage,
        TSnapshot,
        TCommandLogEntry,
        TDiagnostics,
        TFailure,
        TUiContext
      >
    >;
    readonly provenance: DeepReadonly<TProvenance>;
    readonly appBuildId?: Digest;
    getCapabilities(): DeepReadonly<TCapabilities>;
    getSimulationLineage(): DeepReadonly<TSimulationLineage>;
    readAtQueueFront<TResult>(
      reader: (snapshot: DeepReadonly<TSnapshot>) => TResult,
    ): Promise<TResult>;
    getReplayEvidence(): DebugBundleReplayEvidenceV1<TSnapshot, TCommandLogEntry>;
    getDiagnostics(): DeepReadonly<TDiagnostics>;
    getRuntimeFailures(): readonly DeepReadonly<RuntimeOperationFaultV1>[];
    getFailure(): DeepReadonly<TFailure> | undefined;
    scrubFailure(failure: DeepReadonly<TFailure>): DeepReadonly<TFailure>;
    readonly metadataClock: { now(): IsoUtcInstant };
    readonly exportFilename: string;
  }
  & (
    | {
      readonly readUiContext: () => unknown;
    }
    | {
      readonly readUiContext?: undefined;
    }
  );

function hasMatchingStateDigestV1<TSnapshot>(snapshot: TSnapshot, digest: Digest): boolean {
  return digest === digestCanonical("sillymaker:state:v1", snapshot);
}

function parseBundleV1<TSnapshot, TBundle extends DebugBundleDigestEnvelopeV1<TSnapshot>>(
  value: unknown,
  context: DebugBundleCodecContextV1<TSnapshot, TBundle>,
):
  | { readonly kind: "parsed"; readonly bundle: TBundle }
  | {
    readonly kind: "rejected";
    readonly code:
      | "rng.invalid_state"
      | "envelope.schema_invalid"
      | "envelope.unsupported_revision"
      | "digest.invalid_format";
  } {
  try {
    const bundle = context.bundleSchema.parse(value);
    context.validateEnvelope(bundle);
    return { kind: "parsed" as const, bundle };
  } catch (error) {
    if (error instanceof RngStateSchemaFailureInternalV1) {
      return { kind: "rejected" as const, code: error.code };
    }
    if (error instanceof DebugBundleEnvelopeSchemaFailureV1) {
      return { kind: "rejected" as const, code: error.code };
    }
    return { kind: "rejected" as const, code: "envelope.schema_invalid" as const };
  }
}

function validateStateDigestsV1<TSnapshot, TBundle extends DebugBundleDigestEnvelopeV1<TSnapshot>>(
  bundle: TBundle,
):
  | { readonly kind: "valid" }
  | {
    readonly kind: "rejected";
    readonly code: "digest.replay_base_state_mismatch" | "digest.current_state_mismatch";
  } {
  if (!hasMatchingStateDigestV1(bundle.replayBase, bundle.replayBaseStateDigest)) {
    return {
      kind: "rejected" as const,
      code: "digest.replay_base_state_mismatch" as const,
    };
  }
  if (!hasMatchingStateDigestV1(bundle.currentSnapshot, bundle.currentStateDigest)) {
    return {
      kind: "rejected" as const,
      code: "digest.current_state_mismatch" as const,
    };
  }
  return { kind: "valid" as const };
}

function encodeDebugBundleInputV1<
  TSnapshot,
  TBundle extends DebugBundleDigestEnvelopeV1<TSnapshot>,
>(bundle: unknown, context: DebugBundleCodecContextV1<TSnapshot, TBundle>): Uint8Array {
  const parsed = parseBundleV1(bundle, context);
  if (parsed.kind === "rejected") {
    throw new TypeError(`invalid Debug Bundle: ${parsed.code}`);
  }
  const digests = validateStateDigestsV1(parsed.bundle);
  if (digests.kind === "rejected") {
    throw new TypeError(
      digests.code === "digest.replay_base_state_mismatch"
        ? "Debug Bundle replay base Snapshot digest mismatch"
        : "Debug Bundle current Snapshot digest mismatch",
    );
  }
  const encoded = canonicalJsonBytesWithStrictLimitsInternalV1(
    parsed.bundle,
    debugBundleJsonLimitsV1,
  );
  if (!encoded.ok) {
    throw new TypeError(`Debug Bundle violates Strict JSON constraints: ${encoded.error.code}`);
  }
  return encoded.bytes;
}

/** Encodes one Debug Bundle through a single admission into canonical Strict JSON. */
export function encodeDebugBundleV1<
  TSnapshot,
  TBundle extends DebugBundleDigestEnvelopeV1<TSnapshot>,
>(bundle: TBundle, context: DebugBundleCodecContextV1<TSnapshot, TBundle>): Uint8Array {
  return encodeDebugBundleInputV1(bundle, context);
}

/** Strictly decodes an untrusted Debug Bundle and checks both authoritative Snapshot digests. */
export function decodeDebugBundleV1<
  TSnapshot,
  TBundle extends DebugBundleDigestEnvelopeV1<TSnapshot>,
>(
  bytes: Uint8Array,
  context: DebugBundleCodecContextV1<TSnapshot, TBundle>,
): DebugBundleDecodeResultV1<TBundle> {
  const decoded = parseStrictJson(bytes, debugBundleJsonLimitsV1);
  if (!decoded.ok) {
    return { kind: "rejected", code: decoded.error.code };
  }
  const parsed = parseBundleV1(decoded.value, context);
  if (parsed.kind === "rejected") return parsed;
  const digests = validateStateDigestsV1(parsed.bundle);
  if (digests.kind === "rejected") return digests;
  return { kind: "decoded", bundle: parsed.bundle as DeepReadonly<TBundle> };
}

/**
 * Creates the player-safe diagnostics port. Every exported field is captured inside one
 * synchronous GameSession queue-front reader before privacy scrubbing and byte accounting.
 */
export function createGameDiagnosticsServiceV1<
  TProvenance,
  TCapabilities,
  TSimulationLineage,
  TSnapshot,
  TCommandLogEntry,
  TDiagnostics,
  TFailure,
  TUiContext,
>(
  input: CreateGameDiagnosticsServiceInputV1<
    TProvenance,
    TCapabilities,
    TSimulationLineage,
    TSnapshot,
    TCommandLogEntry,
    TDiagnostics,
    TFailure,
    TUiContext
  >,
): PlayerDiagnosticsPortV1<ExportedDebugBundleV1> {
  if (
    typeof input.exportFilename !== "string" ||
    !/^[^/\\]+\.debug-bundle\.json$/u.test(input.exportFilename)
  ) {
    throw new TypeError("invalid Debug Bundle export filename");
  }
  const readUiContext = input.readUiContext;

  return {
    async exportDebugBundle(): Promise<ExportedDebugBundleV1> {
      try {
        return await input.readAtQueueFront((currentSnapshot) => {
          const replay = input.getReplayEvidence();
          const failure = input.getFailure();
          const uiContext = readUiContext?.();
          const runtimeFailures = input
            .getRuntimeFailures()
            .slice(-50)
            .map((entry) => scrubRuntimeOperationFaultV1(entry as RuntimeOperationFaultV1));
          const bytes = encodeDebugBundleInputV1({
            formatRevision: 1,
            provenance: input.provenance,
            ...(input.appBuildId === undefined ? {} : { appBuildId: input.appBuildId }),
            capabilities: input.getCapabilities(),
            simulationLineage: input.getSimulationLineage(),
            generatedAt: input.metadataClock.now(),
            replayBase: replay.replayBase,
            replayBaseStateDigest: replay.replayBaseStateDigest,
            commandLog: replay.commandLog,
            currentSnapshot,
            currentStateDigest: digestCanonical("sillymaker:state:v1", currentSnapshot),
            diagnostics: input.getDiagnostics(),
            runtimeFailures,
            ...(failure === undefined ? {} : { failure: input.scrubFailure(failure) }),
            ...(uiContext === undefined ? {} : { uiContext }),
          }, input.codec);
          return {
            filename: input.exportFilename,
            mediaType: "application/json" as const,
            digest: digestBytes(bytes),
            bytes,
            contentSummary: {
              failure: failure !== undefined,
              uiContext: uiContext !== undefined,
            },
          };
        });
      } catch {
        throw new TypeError("Debug Bundle export failed");
      }
    },
  };
}
