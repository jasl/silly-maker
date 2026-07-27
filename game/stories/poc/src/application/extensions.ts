// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  createDebugUiContextSchemaV1,
  createGameSnapshotEnvelopeSchemaV1,
  digestCanonical,
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  rngStateV1Schema,
} from "@sillymaker/base";
import type { DeepReadonly, SimulationAdoptionV1 } from "@sillymaker/base";
import {
  createDebugToolsPortV1,
  createGameDiagnosticsServiceV1,
  decodeDebugBundleV1,
  inspectReplayBestEffortV1,
  replayAuthoritativelyV1,
} from "@sillymaker/base/runtime";
import type {
  CoreApplicationExtensionContextV1,
  DebugBundleDecodeResultV1,
} from "@sillymaker/base/runtime";

import { pocStoryIdentityV1 } from "../content/identity.js";
import type {
  EngineInvariantCodeV1,
  PocDebugCommandV1,
  PocGameCommandV1,
  PocGameSimulationTypesV1,
} from "../gameplay/index.js";
import {
  createPocDebugBundleCodecV1,
  createPocReplayInputV1,
  createPocUnexpectedFaultV1,
  replayPocToolingFixtureV1,
  scrubPocDebugFailureV1,
  type PocDebugAnchorResultV1,
  type PocDebugBundleV1,
  type PocDebugCommandResultV1,
  type PocDebugFailureV1,
  type PocFinalizedAttemptV1,
  type PocDebugReplayResultV1,
  type PocDebugToolsPortV1,
  type PocDiagnosticQueryResultV1,
  type PocDiagnosticQueryV1,
  type PocDiagnosticSummaryV1,
} from "../runtime/poc-debug-bundle.js";
import {
  validatePocStateInvariantsV1,
  validatePocStateReferencesV1,
} from "../runtime/poc-state-validation.js";
import type { PocStoryToolingFixtureV1 } from "../tooling/fixtures.js";
import type { PocResolvedGameV1 } from "../story-definition.js";

/**
 * The Tavern PoC application extensions: the DebugBundle diagnostics
 * service and the DebugTools port, built by the core composer through
 * `createExtensions` with a controlled context. The Story owns the bundle
 * format, scrubbing, and tooling; the composer owns construction order,
 * the session, persistence, and disposal.
 */

const pocToolingSpecifierV1 = "@project-tavern/story-poc/tooling" as const;
const emptySimulationLineageV1 = Object.freeze([]) as readonly SimulationAdoptionV1[];

type PocToolingModuleV1 = {
  readonly pocStoryToolingEntryV1: typeof import("../tooling/index.js").pocStoryToolingEntryV1;
};

type PocToolingSupportV1 = ReturnType<
  PocToolingModuleV1["pocStoryToolingEntryV1"]["defineToolingSupport"]
>;

export type PocToolingLoaderV1 = (
  specifier: typeof pocToolingSpecifierV1,
) => Promise<PocToolingModuleV1>;

export interface PocApplicationExtensionsV1 {
  readonly diagnostics: PocPlayerDiagnosticsPortV1;
  readonly debugTools: PocDebugToolsPortV1;
  getDiagnosticSummary(): PocDiagnosticSummaryV1;
}

export type PocPlayerDiagnosticsPortV1 = ReturnType<typeof createPocDiagnosticsServiceV1>;

function createPocDiagnosticsServiceV1(
  input: Parameters<typeof createGameDiagnosticsServiceV1>[0],
) {
  return createGameDiagnosticsServiceV1(input);
}

function diagnosticInvariantCodeV1(value: string): EngineInvariantCodeV1 {
  if (value.startsWith("reference.unknown:")) return "story.reference_missing";
  const code = value.slice(value.lastIndexOf(":") + 1);
  switch (code) {
    case "snapshot.schema":
    case "rng.invalid":
    case "resource.negative":
    case "stamina.above_maximum":
    case "calendar.invalid":
    case "workflow.conflict":
    case "scheduler.multiple_blocking_events":
    case "narrative.blocking_conflict":
    case "opening.invalid_checkpoint":
    case "narrative.invalid_cursor":
    case "story.reference_missing":
    case "story.value_invalid":
    case "collection.duplicate_id":
    case "collection.unstable_order":
    case "ledger.unbalanced":
    case "terminal_state.invalid":
      return code;
    default:
      return "story.value_invalid";
  }
}

function isSummaryQueryV1(value: unknown): value is PocDiagnosticQueryV1 {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Reflect.ownKeys(value).length === 1 &&
    Object.hasOwn(value, "kind") &&
    (value as { readonly kind?: unknown }).kind === "summary"
  );
}

function toPocDebugFailureV1(
  evidence:
    | {
        readonly source: "game" | "debug";
        readonly command: unknown;
        readonly attempt: unknown;
      }
    | undefined,
): PocDebugFailureV1 | undefined {
  if (evidence === undefined) return undefined;
  const attempt = evidence.attempt as DeepReadonly<PocFinalizedAttemptV1>;
  if (attempt.result.kind !== "faulted") return undefined;
  const command =
    evidence.source === "game"
      ? Object.freeze({
          source: "game" as const,
          command: evidence.command as DeepReadonly<PocGameCommandV1>,
        })
      : Object.freeze({
          source: "debug" as const,
          command: evidence.command as DeepReadonly<PocDebugCommandV1>,
        });
  return Object.freeze({
    command,
    fault: attempt.result.fault,
    attemptedDraws: attempt.diagnostics.attemptedDraws,
    ...(attempt.diagnostics.candidateRngAfter === undefined
      ? {}
      : { candidateRngAfter: attempt.diagnostics.candidateRngAfter }),
    candidateSnapshot: attempt.result.snapshot,
  }) as PocDebugFailureV1;
}

export function createPocApplicationExtensionsV1(
  context: CoreApplicationExtensionContextV1<PocGameSimulationTypesV1>,
  options: { readonly loadTooling?: PocToolingLoaderV1 } = {},
): { readonly extensions: PocApplicationExtensionsV1 } {
  const resolved = context.resolved as PocResolvedGameV1;
  // Production builds supply the real application digest through the build
  // identity; identity-free environments (jsdom suites) fall back to a
  // deterministic local digest so DebugBundle exports stay well-formed.
  const appBuildId = parseDigest(
    context.appBuildId ?? digestCanonical("sillymaker:application:v1", ["poc-app-local"]),
  );
  const snapshotSchema = createGameSnapshotEnvelopeSchemaV1(
    resolved.gameSimulation.stateSchema,
    rngStateV1Schema,
  );

  // Debug-anchor failures (fixture loads) are extension-local evidence; the
  // dispatch/debug faulted attempts come from the composer's capture.
  let anchorFailure: PocDebugFailureV1 | undefined;
  const latestFailureV1 = (): PocDebugFailureV1 | undefined =>
    anchorFailure ?? toPocDebugFailureV1(context.latestAttemptFailure());

  const getDiagnosticSummaryV1 = (): PocDiagnosticSummaryV1 => {
    const snapshot = context.session.getCurrentSnapshot();
    const invariantCodes = Object.freeze(
      [
        ...validatePocStateReferencesV1(resolved, snapshot.state),
        ...validatePocStateInvariantsV1(resolved, {
          state: snapshot.state,
          commandSequence: snapshot.commandSequence,
        }),
      ].map(diagnosticInvariantCodeV1),
    );
    const commandFaultCodes = context.commandLog
      .entries()
      .flatMap(({ outcome }) => (outcome.kind === "faulted" ? [outcome.fault.code] : []));
    return Object.freeze({
      invariantCodes,
      recentErrorCodes: Object.freeze(
        [...commandFaultCodes, ...context.runtimeFailures().map(({ code }) => code)].slice(-50),
      ),
      hmrInvalidated: context.session.getStatus() === "hmr_invalidated",
    });
  };

  const debugBundleCodec = createPocDebugBundleCodecV1();
  const diagnostics = createPocDiagnosticsServiceV1({
    codec: debugBundleCodec,
    provenance: resolved.provenance,
    appBuildId,
    getCapabilities: () => context.capabilityState.getCurrent(),
    getSimulationLineage: () => context.persistence.getSimulationLineage(),
    readAtQueueFront: (reader) => context.runtimeControl.readAtQueueFront(reader),
    getReplayEvidence: () =>
      Object.freeze({
        replayBase: context.commandLog.replayBase(),
        replayBaseStateDigest: context.commandLog.replayBaseStateDigest(),
        commandLog: context.commandLog.entries(),
      }),
    getDiagnostics: getDiagnosticSummaryV1,
    getRuntimeFailures: () => context.runtimeFailures(),
    getFailure: latestFailureV1,
    scrubFailure: scrubPocDebugFailureV1,
    uiContextSchema: pocUiContextSchemaV1(),
    readUiContext: () => context.readUiContext() as never,
    metadataClock: context.metadataClock,
    exportFilename: "project-tavern-poc.debug-bundle.json",
  });

  const loadTooling: PocToolingLoaderV1 =
    options.loadTooling ??
    (async () => (await import("@project-tavern/story-poc/tooling")) as PocToolingModuleV1);
  let cachedToolingSupport: PocToolingSupportV1 | undefined;
  let toolingAttempt: Promise<PocToolingSupportV1> | undefined;
  const toolingSupportV1 = async (): Promise<PocToolingSupportV1> => {
    if (cachedToolingSupport !== undefined) return cachedToolingSupport;
    if (toolingAttempt !== undefined) return await toolingAttempt;
    const attempt = (async () => {
      const module = await loadTooling(pocToolingSpecifierV1);
      if (
        module.pocStoryToolingEntryV1.storyIdentity.id !== pocStoryIdentityV1.id ||
        module.pocStoryToolingEntryV1.storyIdentity.revision !== pocStoryIdentityV1.revision
      ) {
        throw new TypeError("PoC tooling Story identity mismatch");
      }
      const support = module.pocStoryToolingEntryV1.defineToolingSupport();
      cachedToolingSupport = support;
      return support;
    })();
    toolingAttempt = attempt;
    try {
      return await attempt;
    } finally {
      if (toolingAttempt === attempt) toolingAttempt = undefined;
    }
  };

  const publicUnexpectedFault = createPocUnexpectedFaultV1(
    new TypeError("PoC runtime operation unavailable"),
  );
  const unavailableDebugResultV1 = (): PocDebugCommandResultV1 =>
    Object.freeze({ kind: "faulted" as const, fault: publicUnexpectedFault });
  const unavailableAnchorResultV1 = (): PocDebugAnchorResultV1 =>
    Object.freeze({ kind: "faulted" as const, fault: publicUnexpectedFault });

  const replayBundleV1 = async (
    bytes: Uint8Array,
    mode: "authoritative" | "best_effort",
  ): Promise<PocDebugReplayResultV1> => {
    const decoded = decodeDebugBundleV1(bytes, debugBundleCodec);
    if (decoded.kind === "rejected") return decoded;
    const replayInput = createPocReplayInputV1(resolved, decoded.bundle, appBuildId);
    const comparison =
      mode === "authoritative"
        ? await replayAuthoritativelyV1(replayInput)
        : await inspectReplayBestEffortV1(replayInput);
    return Object.freeze({ kind: "replayed" as const, comparison });
  };

  const debugTools: PocDebugToolsPortV1 = createDebugToolsPortV1<
    PocDebugCommandV1,
    PocDebugCommandResultV1,
    string,
    PocDebugAnchorResultV1,
    DebugBundleDecodeResultV1<PocDebugBundleV1>,
    PocDebugReplayResultV1,
    PocDebugReplayResultV1,
    PocDiagnosticQueryV1,
    PocDiagnosticQueryResultV1
  >({
    capabilities: context.capabilityState,
    debugCommandSchema: resolved.gameSimulation.debugCommandSchema,
    debugCommandSchemaFailure: () =>
      Object.freeze({
        kind: "validation_failed" as const,
        error: Object.freeze({ code: "debug.command_schema_invalid" as const }),
      }),
    async listFixtures() {
      return Object.freeze((await toolingSupportV1()).fixtures.map(({ fixtureId }) => fixtureId));
    },
    async executeDebugCommand(command, isStillEnabled) {
      const result = await context.debugControl.execute(command, isStillEnabled);
      if (result.kind === "capability_disabled") return result;
      if (result.kind === "not_executed") return unavailableDebugResultV1();
      if (result.kind === "validation_failed") {
        const error = result.errors[0];
        return error === undefined || result.errors.length !== 1
          ? unavailableDebugResultV1()
          : Object.freeze({ kind: "validation_failed" as const, error });
      }
      const attempt = result.attempt;
      if (attempt.result.kind === "committed") {
        return Object.freeze({
          kind: "committed" as const,
          commandSequence: parsePositiveSafeInteger(attempt.result.snapshot.commandSequence),
        });
      }
      if (attempt.result.kind === "faulted") {
        return Object.freeze({ kind: "faulted" as const, fault: attempt.result.fault });
      }
      return unavailableDebugResultV1();
    },
    async anchorFixture(fixtureId, isStillEnabled) {
      let resolvedFixtureForFailure: DeepReadonly<PocStoryToolingFixtureV1> | undefined;
      const anchored = await context.debugControl.anchorReplacement<PocDebugAnchorResultV1>(
        Object.freeze({ kind: "fixture" as const, fixtureId }),
        async () => {
          const fixture = (await toolingSupportV1()).fixtures.find(
            (candidate) => candidate.fixtureId === fixtureId,
          );
          if (fixture === undefined) {
            return Object.freeze({
              kind: "preserve" as const,
              result: Object.freeze({
                kind: "validation_failed" as const,
                error: Object.freeze({
                  code: "debug.unknown_reference" as const,
                  commandKind: "debug.fixture.load" as const,
                  reference: Object.freeze({ kind: "fixture" as const, fixtureId }),
                }),
              }),
            });
          }
          resolvedFixtureForFailure = fixture;
          const snapshot = await replayPocToolingFixtureV1(
            resolved,
            fixture as DeepReadonly<PocStoryToolingFixtureV1>,
          );
          if (
            validatePocStateReferencesV1(resolved, snapshot.state).length !== 0 ||
            validatePocStateInvariantsV1(resolved, snapshot).length !== 0
          ) {
            throw new TypeError("PoC fixture Snapshot failed full validation");
          }
          return Object.freeze({
            kind: "replace" as const,
            snapshot,
            result: Object.freeze({
              kind: "anchor_established" as const,
              commandSequence: snapshot.commandSequence,
            }),
          });
        },
        isStillEnabled,
        (error) => {
          const fault = createPocUnexpectedFaultV1(error);
          const fixture = resolvedFixtureForFailure;
          if (fixture !== undefined) {
            anchorFailure = Object.freeze({
              command: Object.freeze({
                source: "debug_anchor" as const,
                command: Object.freeze({
                  kind: "debug.fixture.load" as const,
                  fixtureId: fixture.fixtureId,
                  seed: fixture.seed,
                }),
              }),
              fault,
              attemptedDraws: Object.freeze([]),
            });
          }
          return Object.freeze({ kind: "faulted" as const, fault });
        },
        (snapshot) => context.persistence.establishAnchor(snapshot, emptySimulationLineageV1),
      );
      return anchored.kind === "not_executed" ? unavailableAnchorResultV1() : anchored;
    },
    inspectDebugBundle(bytes) {
      return decodeDebugBundleV1(bytes, debugBundleCodec);
    },
    async anchorDebugBundle(bytes, isStillEnabled) {
      let adoptedLineage: readonly DeepReadonly<SimulationAdoptionV1>[] | undefined;
      const anchored = await context.debugControl.anchorReplacement<PocDebugAnchorResultV1>(
        Object.freeze({ kind: "debug_bundle" as const }),
        async () => {
          const decoded = decodeDebugBundleV1(bytes, debugBundleCodec);
          if (decoded.kind === "rejected") {
            return Object.freeze({
              kind: "preserve" as const,
              result: Object.freeze({
                kind: "validation_failed" as const,
                error: Object.freeze({
                  code: "debug.bundle_invalid" as const,
                  rejection: decoded.code,
                }),
              }),
            });
          }
          const comparison = await replayAuthoritativelyV1(
            createPocReplayInputV1(resolved, decoded.bundle, appBuildId),
          );
          if (!comparison.authoritative || !comparison.identityMatch || !comparison.matches) {
            return Object.freeze({
              kind: "preserve" as const,
              result: Object.freeze({
                kind: "validation_failed" as const,
                error: Object.freeze({ code: "debug.bundle_replay_mismatch" as const }),
              }),
            });
          }
          const snapshot = snapshotSchema.parse(decoded.bundle.currentSnapshot);
          if (
            validatePocStateReferencesV1(resolved, snapshot.state).length !== 0 ||
            validatePocStateInvariantsV1(resolved, snapshot).length !== 0
          ) {
            return Object.freeze({
              kind: "preserve" as const,
              result: Object.freeze({
                kind: "validation_failed" as const,
                error: Object.freeze({ code: "debug.bundle_replay_mismatch" as const }),
              }),
            });
          }
          adoptedLineage = decoded.bundle.simulationLineage;
          return Object.freeze({
            kind: "replace" as const,
            snapshot,
            result: Object.freeze({
              kind: "anchor_established" as const,
              commandSequence: snapshot.commandSequence,
            }),
          });
        },
        isStillEnabled,
        () => unavailableAnchorResultV1(),
        (snapshot) => {
          if (adoptedLineage === undefined) {
            throw new TypeError("missing adopted PoC Debug Bundle lineage");
          }
          context.persistence.establishAnchor(snapshot, adoptedLineage);
        },
      );
      return anchored.kind === "not_executed" ? unavailableAnchorResultV1() : anchored;
    },
    replayAuthoritatively: (bytes) => replayBundleV1(bytes, "authoritative"),
    inspectReplayBestEffort: (bytes) => replayBundleV1(bytes, "best_effort"),
    async queryDiagnostics(query) {
      if (!isSummaryQueryV1(query)) {
        return Object.freeze({ kind: "validation_failed" as const });
      }
      return await context.runtimeControl.readAtQueueFront(() =>
        Object.freeze({
          kind: "summary" as const,
          diagnostics: getDiagnosticSummaryV1(),
          commandLogEntryCount: parseNonNegativeSafeInteger(context.commandLog.entries().length),
        }),
      );
    },
  });

  return Object.freeze({
    extensions: Object.freeze({
      diagnostics,
      debugTools,
      getDiagnosticSummary: getDiagnosticSummaryV1,
    }),
  });
}

function pocUiContextSchemaV1() {
  return createDebugUiContextSchemaV1();
}
