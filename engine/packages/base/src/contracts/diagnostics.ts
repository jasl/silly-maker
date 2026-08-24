// SPDX-License-Identifier: MIT
import type { IsoUtcInstant } from "./host.ts";
import type {
  AppearanceLayerId,
  CharacterExpressionId,
  CharacterId,
  CharacterPoseId,
  CharacterRigId,
  ContentMaturityFlagsV1,
  InteractionSurfaceId,
  StageSceneId,
  StageSceneVariantId,
} from "./presentation.ts";
import {
  parseAppearanceLayerId,
  parseCharacterExpressionId,
  parseCharacterId,
  parseCharacterPoseId,
  parseCharacterRigId,
  parseContentMaturityFlagsV1,
  parseInteractionSurfaceId,
  parseStageSceneId,
  parseStageSceneVariantId,
} from "./presentation.ts";
import type { BuildProvenanceV1 } from "./provenance.ts";
import type { RngDrawTraceV1, RngStateV1 } from "./rng.ts";
import { parseStrictJsonLimitsV1 } from "./strict-json.ts";
import type {
  Digest,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  RuntimeSchemaV1,
} from "./values.ts";
import { parseDigest, parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "./values.ts";
import {
  exactEnvelopeFieldsV1,
  parseByteExportV1,
  parseIsoUtcInstantV1,
  saveJsonLimitsV1,
} from "./persistence.ts";

export interface CommandLogEntryBaseV1 {
  readonly logOrdinal: PositiveSafeInteger;
  readonly preStateDigest: Digest;
  readonly postStateDigest: Digest;
  readonly commandSequence: {
    readonly before: NonNegativeSafeInteger;
    readonly after: NonNegativeSafeInteger;
  };
  readonly committedRngBefore: RngStateV1;
  readonly attemptedDraws: readonly RngDrawTraceV1[];
  readonly candidateRngAfter?: RngStateV1;
  readonly committedRngAfter: RngStateV1;
}

export type CommandLogEntryEnvelopeV1<TLoggedCommand, TOutcome> =
  & CommandLogEntryBaseV1
  & TLoggedCommand
  & { readonly outcome: TOutcome };

export interface RuntimeFaultBaseV1 {
  readonly occurredAt: IsoUtcInstant;
  readonly operation: string;
  readonly message: string;
  readonly stack?: string;
  readonly cause?: { readonly name: string; readonly message: string };
}

export type PersistenceFaultCodeV1 =
  | "persistence.unavailable"
  | "persistence.quota_exceeded"
  | "persistence.transaction_failed"
  | "persistence.blocked_upgrade"
  | "persistence.connection_closed"
  | "persistence.stale_writer";
export type AssetLoadFaultCodeV1 =
  | "asset.fetch_failed"
  | "asset.decode_failed";
export type UiFaultCodeV1 = "ui.render_failed" | "ui.event_handler_failed";
export type RuntimeFaultCodeV1 =
  | "runtime.async_operation_failed"
  | "runtime.dispatch_failed"
  | "runtime.hmr_invalidated";

export type RuntimeOperationFaultV1 =
  | (RuntimeFaultBaseV1 & {
    readonly category: "persistence";
    readonly code: PersistenceFaultCodeV1;
  })
  | (RuntimeFaultBaseV1 & {
    readonly category: "asset_load";
    readonly code: AssetLoadFaultCodeV1;
  })
  | (RuntimeFaultBaseV1 & { readonly category: "ui"; readonly code: UiFaultCodeV1 })
  | (RuntimeFaultBaseV1 & {
    readonly category: "runtime";
    readonly code: RuntimeFaultCodeV1;
  });

export interface DebugBundleEnvelopeV1<
  TProvenance,
  TCapabilities,
  TSimulationLineage,
  TSnapshot,
  TCommandLogEntry,
  TDiagnostics,
  TRuntimeFailure,
  TFailure,
  TUiContext,
> {
  readonly formatRevision: 1;
  readonly provenance: TProvenance;
  readonly appBuildId?: Digest;
  readonly capabilities: TCapabilities;
  readonly simulationLineage: TSimulationLineage;
  readonly generatedAt: IsoUtcInstant;
  readonly replayBase: TSnapshot;
  readonly replayBaseStateDigest: Digest;
  readonly commandLog: readonly TCommandLogEntry[];
  readonly currentSnapshot: TSnapshot;
  readonly currentStateDigest: Digest;
  readonly diagnostics: TDiagnostics;
  readonly runtimeFailures: readonly TRuntimeFailure[];
  readonly failure?: TFailure;
  readonly uiContext?: TUiContext;
}

export const debugPresentationLimitsV1 = {
  stableIdUtf8Bytes: 256,
  renderers: 16,
  appearanceLayersPerRenderer: 16,
  visibleInteractionSurfaces: 32,
  detailOverlayStack: 8,
} as const;

export interface DebugPresentationRendererSummaryV1 {
  readonly rendererId: string;
  readonly characterId: CharacterId;
  readonly rigId: CharacterRigId;
  readonly poseId: CharacterPoseId;
  readonly expressionId: CharacterExpressionId;
  readonly appearanceLayerIds: readonly AppearanceLayerId[];
}

export interface DebugPresentationSummaryV1 {
  readonly presentationRevision: NonNegativeSafeInteger;
  readonly stageSceneId: StageSceneId | null;
  readonly variantId: StageSceneVariantId | null;
  readonly stageRendererId: string | null;
  readonly renderers: readonly DebugPresentationRendererSummaryV1[];
  readonly visibleInteractionSurfaceIds: readonly InteractionSurfaceId[];
  readonly activeInteractionSurfaceId: InteractionSurfaceId | null;
  readonly contentPolicyRevision: PositiveSafeInteger;
  readonly allowedContentFlags: ContentMaturityFlagsV1;
}

export interface DebugUiSessionSummaryV1 {
  readonly routeId: string | null;
  readonly primaryOverlayId: string | null;
  readonly detailOverlayIds: readonly string[];
  readonly narrativeOpen: boolean;
  readonly systemDialogOpen: boolean;
  readonly devDock: { readonly leftOpen: boolean; readonly rightOpen: boolean };
}

export interface DebugUiSessionProjectionInputV1 extends DebugUiSessionSummaryV1 {
  readonly activeInteractionSurfaceId: InteractionSurfaceId | null;
}

export interface DebugUiContextV1 {
  readonly revision: 1;
  readonly presentation: DebugPresentationSummaryV1 | null;
  readonly session: DebugUiSessionSummaryV1;
}

export interface DebugUiContextRecordedIdentityV1 {
  readonly provenance: BuildProvenanceV1;
  readonly appBuildId?: Digest;
}

export interface DebugUiContextCurrentIdentityV1 {
  readonly provenance: BuildProvenanceV1;
  readonly appBuildId: Digest;
}

export type DebugUiContextUseMismatchReasonV1 =
  | "story_identity_mismatch"
  | "presentation_identity_mismatch"
  | "application_identity_mismatch";

export type DebugUiContextUseClassificationV1 =
  | { readonly kind: "restorable" }
  | {
    readonly kind: "diagnostic_only";
    readonly reasons: readonly DebugUiContextUseMismatchReasonV1[];
  };

export type DebugBundleEnvelopeSchemaFailureCodeV1 =
  | "envelope.unsupported_revision"
  | "digest.invalid_format";

export class DebugBundleEnvelopeSchemaFailureV1 extends TypeError {
  readonly code: DebugBundleEnvelopeSchemaFailureCodeV1;

  constructor(code: DebugBundleEnvelopeSchemaFailureCodeV1) {
    super(code);
    this.name = "DebugBundleEnvelopeSchemaFailureV1";
    this.code = code;
  }
}

export interface DebugBundleEnvelopeSchemaInputV1<
  TProvenance,
  TCapabilities,
  TSimulationLineage,
  TSnapshot,
  TCommandLogEntry,
  TDiagnostics,
  TRuntimeFailure,
  TFailure,
  TUiContext,
> {
  readonly provenanceSchema: RuntimeSchemaV1<TProvenance>;
  readonly capabilitiesSchema: RuntimeSchemaV1<TCapabilities>;
  readonly simulationLineageSchema: RuntimeSchemaV1<TSimulationLineage>;
  readonly snapshotSchema: RuntimeSchemaV1<TSnapshot>;
  readonly commandLogEntrySchema: RuntimeSchemaV1<TCommandLogEntry>;
  readonly diagnosticsSchema: RuntimeSchemaV1<TDiagnostics>;
  readonly runtimeFailureSchema: RuntimeSchemaV1<TRuntimeFailure>;
  readonly failureSchema: RuntimeSchemaV1<TFailure>;
  readonly uiContextSchema: RuntimeSchemaV1<TUiContext>;
}

export interface ExportedDebugBundleV1 {
  readonly filename: string;
  readonly mediaType: "application/json";
  readonly digest: Digest;
  readonly bytes: Uint8Array;
  /** Package-owned preview facts captured before encoding the exact bytes. */
  readonly contentSummary: {
    readonly failure: boolean;
    readonly uiContext: boolean;
  };
}

export const exportedDebugBundleSchemaV1: RuntimeSchemaV1<ExportedDebugBundleV1> = {
  parse(value: unknown) {
    const fields = exactEnvelopeFieldsV1(
      value,
      ["filename", "mediaType", "digest", "bytes", "contentSummary"],
      "ExportedDebugBundleV1",
    );
    const file = parseByteExportV1({
      filename: fields.filename,
      mediaType: fields.mediaType,
      digest: fields.digest,
      bytes: fields.bytes,
    }, "ExportedDebugBundleV1");
    const summary = exactEnvelopeFieldsV1(
      fields.contentSummary,
      ["failure", "uiContext"],
      "ExportedDebugBundleV1 contentSummary",
    );
    if (typeof summary.failure !== "boolean" || typeof summary.uiContext !== "boolean") {
      throw new TypeError("invalid ExportedDebugBundleV1 contentSummary");
    }
    return {
      ...file,
      contentSummary: {
        failure: summary.failure,
        uiContext: summary.uiContext,
      },
    };
  },
};

const codes = {
  persistence: new Set<PersistenceFaultCodeV1>([
    "persistence.unavailable",
    "persistence.quota_exceeded",
    "persistence.transaction_failed",
    "persistence.blocked_upgrade",
    "persistence.connection_closed",
    "persistence.stale_writer",
  ]),
  asset_load: new Set<AssetLoadFaultCodeV1>([
    "asset.fetch_failed",
    "asset.decode_failed",
  ]),
  ui: new Set<UiFaultCodeV1>(["ui.render_failed", "ui.event_handler_failed"]),
  runtime: new Set<RuntimeFaultCodeV1>([
    "runtime.async_operation_failed",
    "runtime.dispatch_failed",
    "runtime.hmr_invalidated",
  ]),
} as const;

function utf8ByteLengthV1(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function diagnosticIdUtf8ByteLengthV1(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) throw new TypeError("invalid UTF-8 text");
      bytes += 4;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError("invalid UTF-8 text");
    } else bytes += 3;
  }
  return bytes;
}

const text = (value: unknown, label: string, maximumBytes?: number): string => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    (maximumBytes !== undefined && utf8ByteLengthV1(value) > maximumBytes)
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
};

function parseDenseArrayV1<T>(
  value: unknown,
  maximumItems: number,
  schema: RuntimeSchemaV1<T>,
  label: string,
): readonly T[] {
  if (!Array.isArray(value) || value.length > maximumItems) {
    throw new TypeError(`invalid ${label}`);
  }
  return Array.from(value, (entry) => schema.parse(entry));
}

function readDebugDenseArrayV1(
  value: unknown,
  maximumItems: number,
  limitCode: string,
  label: string,
): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`invalid ${label}`);
  }
  if (value.length > maximumItems) throw new TypeError(limitCode);
  return Array.from(value);
}

function assertDiagnosticIdCeilingV1(value: unknown): void {
  if (
    typeof value === "string" &&
    diagnosticIdUtf8ByteLengthV1(value) > debugPresentationLimitsV1.stableIdUtf8Bytes
  ) {
    throw new TypeError("diagnostics.ui_context_id_limit");
  }
}

function parseDiagnosticIdV1(value: unknown, label: string): string {
  assertDiagnosticIdCeilingV1(value);
  return text(value, label);
}

function parseNullableDiagnosticIdV1(value: unknown, label: string): string | null {
  return value === null ? null : parseDiagnosticIdV1(value, label);
}

function parseBrandedDiagnosticIdV1<T extends string>(
  value: unknown,
  parser: (candidate: unknown) => T,
): T {
  assertDiagnosticIdCeilingV1(value);
  return parser(value);
}

function parseNullableBrandedDiagnosticIdV1<T extends string>(
  value: unknown,
  parser: (candidate: unknown) => T,
): T | null {
  return value === null ? null : parseBrandedDiagnosticIdV1(value, parser);
}

function parseDebugBooleanV1(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`invalid ${label}`);
  return value;
}

function parseDebugPresentationRendererSummaryV1(
  value: unknown,
): DebugPresentationRendererSummaryV1 {
  const fields = exactEnvelopeFieldsV1(
    value,
    ["rendererId", "characterId", "rigId", "poseId", "expressionId", "appearanceLayerIds"],
    "DebugPresentationRendererSummaryV1",
  );
  const appearanceLayerIds = readDebugDenseArrayV1(
    fields.appearanceLayerIds,
    debugPresentationLimitsV1.appearanceLayersPerRenderer,
    "diagnostics.presentation_appearance_limit",
    "Debug presentation appearance layers",
  ).map((entry) => parseBrandedDiagnosticIdV1(entry, parseAppearanceLayerId));
  if (new Set(appearanceLayerIds).size !== appearanceLayerIds.length) {
    throw new TypeError("diagnostics.presentation_appearance_duplicate");
  }
  return {
    rendererId: parseDiagnosticIdV1(fields.rendererId, "Debug rendererId"),
    characterId: parseBrandedDiagnosticIdV1(fields.characterId, parseCharacterId),
    rigId: parseBrandedDiagnosticIdV1(fields.rigId, parseCharacterRigId),
    poseId: parseBrandedDiagnosticIdV1(fields.poseId, parseCharacterPoseId),
    expressionId: parseBrandedDiagnosticIdV1(
      fields.expressionId,
      parseCharacterExpressionId,
    ),
    appearanceLayerIds,
  };
}

function parseDebugPresentationSummaryV1(value: unknown): DebugPresentationSummaryV1 {
  const fields = exactEnvelopeFieldsV1(
    value,
    [
      "presentationRevision",
      "stageSceneId",
      "variantId",
      "stageRendererId",
      "renderers",
      "visibleInteractionSurfaceIds",
      "activeInteractionSurfaceId",
      "contentPolicyRevision",
      "allowedContentFlags",
    ],
    "DebugPresentationSummaryV1",
  );
  const renderers = readDebugDenseArrayV1(
    fields.renderers,
    debugPresentationLimitsV1.renderers,
    "diagnostics.presentation_renderers_limit",
    "Debug presentation renderers",
  ).map(parseDebugPresentationRendererSummaryV1);
  if (new Set(renderers.map(({ characterId }) => characterId)).size !== renderers.length) {
    throw new TypeError("diagnostics.presentation_character_duplicate");
  }
  const visibleInteractionSurfaceIds = readDebugDenseArrayV1(
    fields.visibleInteractionSurfaceIds,
    debugPresentationLimitsV1.visibleInteractionSurfaces,
    "diagnostics.presentation_surfaces_limit",
    "Debug presentation interaction surfaces",
  ).map((entry) => parseBrandedDiagnosticIdV1(entry, parseInteractionSurfaceId));
  if (new Set(visibleInteractionSurfaceIds).size !== visibleInteractionSurfaceIds.length) {
    throw new TypeError("diagnostics.presentation_surface_duplicate");
  }
  return {
    presentationRevision: parseNonNegativeSafeInteger(fields.presentationRevision),
    stageSceneId: parseNullableBrandedDiagnosticIdV1(fields.stageSceneId, parseStageSceneId),
    variantId: parseNullableBrandedDiagnosticIdV1(
      fields.variantId,
      parseStageSceneVariantId,
    ),
    stageRendererId: parseNullableDiagnosticIdV1(
      fields.stageRendererId,
      "Debug stageRendererId",
    ),
    renderers,
    visibleInteractionSurfaceIds,
    activeInteractionSurfaceId: parseNullableBrandedDiagnosticIdV1(
      fields.activeInteractionSurfaceId,
      parseInteractionSurfaceId,
    ),
    contentPolicyRevision: parsePositiveSafeInteger(fields.contentPolicyRevision),
    allowedContentFlags: parseContentMaturityFlagsV1(fields.allowedContentFlags),
  };
}

function parseDebugUiSessionSummaryV1(value: unknown): DebugUiSessionSummaryV1 {
  const fields = exactEnvelopeFieldsV1(
    value,
    [
      "routeId",
      "primaryOverlayId",
      "detailOverlayIds",
      "narrativeOpen",
      "systemDialogOpen",
      "devDock",
    ],
    "DebugUiSessionSummaryV1",
  );
  const devDockFields = exactEnvelopeFieldsV1(
    fields.devDock,
    ["leftOpen", "rightOpen"],
    "Debug UI DevDock summary",
  );
  const detailOverlayIds = readDebugDenseArrayV1(
    fields.detailOverlayIds,
    debugPresentationLimitsV1.detailOverlayStack,
    "diagnostics.ui_context_detail_stack_limit",
    "Debug UI detail overlay stack",
  ).map((entry) => parseDiagnosticIdV1(entry, "Debug detail overlay ID"));
  return {
    routeId: parseNullableDiagnosticIdV1(fields.routeId, "Debug routeId"),
    primaryOverlayId: parseNullableDiagnosticIdV1(
      fields.primaryOverlayId,
      "Debug primaryOverlayId",
    ),
    detailOverlayIds,
    narrativeOpen: parseDebugBooleanV1(fields.narrativeOpen, "Debug narrativeOpen"),
    systemDialogOpen: parseDebugBooleanV1(fields.systemDialogOpen, "Debug systemDialogOpen"),
    devDock: {
      leftOpen: parseDebugBooleanV1(devDockFields.leftOpen, "Debug left dock state"),
      rightOpen: parseDebugBooleanV1(devDockFields.rightOpen, "Debug right dock state"),
    },
  };
}

export function createDebugUiContextSchemaV1(): RuntimeSchemaV1<DebugUiContextV1> {
  return {
    parse(value: unknown) {
      const fields = exactEnvelopeFieldsV1(
        value,
        ["revision", "presentation", "session"],
        "DebugUiContextV1",
      );
      if (fields.revision !== 1) throw new TypeError("invalid Debug UI context revision");
      const presentationValue = fields.presentation;
      return {
        revision: 1 as const,
        presentation: presentationValue === null
          ? null
          : parseDebugPresentationSummaryV1(presentationValue),
        session: parseDebugUiSessionSummaryV1(fields.session),
      };
    },
  };
}

export function createDebugBundleEnvelopeSchemaV1<
  TProvenance,
  TCapabilities,
  TSimulationLineage,
  TSnapshot,
  TCommandLogEntry,
  TDiagnostics,
  TRuntimeFailure,
  TFailure,
  TUiContext,
>(
  input: DebugBundleEnvelopeSchemaInputV1<
    TProvenance,
    TCapabilities,
    TSimulationLineage,
    TSnapshot,
    TCommandLogEntry,
    TDiagnostics,
    TRuntimeFailure,
    TFailure,
    TUiContext
  >,
): RuntimeSchemaV1<
  DebugBundleEnvelopeV1<
    TProvenance,
    TCapabilities,
    TSimulationLineage,
    TSnapshot,
    TCommandLogEntry,
    TDiagnostics,
    TRuntimeFailure,
    TFailure,
    TUiContext
  >
> {
  return {
    parse(value: unknown) {
      const hasAppBuildId = value !== null && typeof value === "object" &&
        Object.hasOwn(value, "appBuildId");
      const hasFailure = value !== null && typeof value === "object" &&
        Object.hasOwn(value, "failure");
      const hasUiContext = value !== null && typeof value === "object" &&
        Object.hasOwn(value, "uiContext");
      const fields = exactEnvelopeFieldsV1(
        value,
        [
          "formatRevision",
          "provenance",
          ...(hasAppBuildId ? ["appBuildId"] : []),
          "capabilities",
          "simulationLineage",
          "generatedAt",
          "replayBase",
          "replayBaseStateDigest",
          "commandLog",
          "currentSnapshot",
          "currentStateDigest",
          "diagnostics",
          "runtimeFailures",
          ...(hasFailure ? ["failure"] : []),
          ...(hasUiContext ? ["uiContext"] : []),
        ],
        "DebugBundleEnvelopeV1",
      );
      const formatRevision = fields.formatRevision;
      if (formatRevision !== 1) {
        if (
          typeof formatRevision === "number" &&
          Number.isSafeInteger(formatRevision) &&
          !Object.is(formatRevision, -0) &&
          formatRevision > 0
        ) {
          throw new DebugBundleEnvelopeSchemaFailureV1("envelope.unsupported_revision");
        }
        throw new TypeError("invalid Debug Bundle formatRevision");
      }
      const parseStateDigestV1 = (valueToParse: unknown): Digest => {
        try {
          return parseDigest(valueToParse);
        } catch {
          throw new DebugBundleEnvelopeSchemaFailureV1("digest.invalid_format");
        }
      };
      const appBuildId = hasAppBuildId ? parseStateDigestV1(fields.appBuildId) : undefined;
      const failure = hasFailure ? input.failureSchema.parse(fields.failure) : undefined;
      const uiContext = hasUiContext ? input.uiContextSchema.parse(fields.uiContext) : undefined;
      return {
        formatRevision: 1 as const,
        provenance: input.provenanceSchema.parse(fields.provenance),
        ...(appBuildId === undefined ? {} : { appBuildId }),
        capabilities: input.capabilitiesSchema.parse(fields.capabilities),
        simulationLineage: input.simulationLineageSchema.parse(fields.simulationLineage),
        generatedAt: parseIsoUtcInstantV1(fields.generatedAt),
        replayBase: input.snapshotSchema.parse(fields.replayBase),
        replayBaseStateDigest: parseStateDigestV1(fields.replayBaseStateDigest),
        commandLog: parseDenseArrayV1(
          fields.commandLog,
          200,
          input.commandLogEntrySchema,
          "Debug Bundle CommandLog",
        ),
        currentSnapshot: input.snapshotSchema.parse(fields.currentSnapshot),
        currentStateDigest: parseStateDigestV1(fields.currentStateDigest),
        diagnostics: input.diagnosticsSchema.parse(fields.diagnostics),
        runtimeFailures: parseDenseArrayV1(
          fields.runtimeFailures,
          50,
          input.runtimeFailureSchema,
          "Debug Bundle runtime failures",
        ),
        ...(failure === undefined ? {} : { failure }),
        ...(uiContext === undefined ? {} : { uiContext }),
      } as DebugBundleEnvelopeV1<
        TProvenance,
        TCapabilities,
        TSimulationLineage,
        TSnapshot,
        TCommandLogEntry,
        TDiagnostics,
        TRuntimeFailure,
        TFailure,
        TUiContext
      >;
    },
  };
}

export const runtimeOperationFaultSchemaV1: RuntimeSchemaV1<RuntimeOperationFaultV1> = {
  parse(value: unknown) {
    if (value === null || typeof value !== "object") throw new TypeError("invalid runtime fault");
    const hasStack = Object.hasOwn(value, "stack");
    const hasCause = Object.hasOwn(value, "cause");
    const fields = exactEnvelopeFieldsV1(
      value,
      [
        "occurredAt",
        "operation",
        "message",
        "category",
        "code",
        ...(hasStack ? ["stack"] : []),
        ...(hasCause ? ["cause"] : []),
      ],
      "RuntimeOperationFaultV1",
    );
    const category: unknown = fields.category;
    if (
      category !== "persistence" &&
      category !== "asset_load" &&
      category !== "ui" &&
      category !== "runtime"
    ) {
      throw new TypeError("invalid runtime fault category");
    }
    const code: unknown = fields.code;
    if (typeof code !== "string" || !(codes[category] as ReadonlySet<string>).has(code)) {
      throw new TypeError("invalid runtime fault code");
    }
    let cause: { readonly name: string; readonly message: string } | undefined;
    if (hasCause) {
      const causeFields = exactEnvelopeFieldsV1(
        fields.cause,
        ["name", "message"],
        "RuntimeFault cause",
      );
      cause = {
        name: text(causeFields.name, "cause name", 4_096),
        message: text(causeFields.message, "cause message", 4_096),
      };
    }
    const common = {
      occurredAt: parseIsoUtcInstantV1(fields.occurredAt),
      operation: text(fields.operation, "runtime operation", 4_096),
      message: text(fields.message, "runtime message", 65_536),
      ...(hasStack ? { stack: text(fields.stack, "runtime stack", 65_536) } : {}),
      ...(cause === undefined ? {} : { cause }),
    };
    return { ...common, category, code } as RuntimeOperationFaultV1;
  },
};

export const debugBundleJsonLimitsV1 = parseStrictJsonLimitsV1({
  ...saveJsonLimitsV1,
  maxBytes: 20_971_520,
});
