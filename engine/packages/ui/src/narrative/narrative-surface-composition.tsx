// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytes,
  parseInteractionResolutionV1,
  parseNarrativeHistoryV1,
  parsePendingInteractionV1,
  type DeepReadonly,
  type InteractionResolutionV1,
  type NarrativeHistoryV1,
  type NonNegativeSafeInteger,
  type PendingInteractionV1,
  type StrictJsonObjectV1,
} from "@sillymaker/base";
import type { PlayerProfileStoreV1, PlayerProfileV1 } from "@sillymaker/base/runtime";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ComponentType, ReactElement, ReactNode } from "react";

import {
  inputHandledV1,
  inputIgnoredV1,
  parseInputActionIdV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
} from "../input/contracts.ts";
import type { InputActionIdV1, InputRouterV1 } from "../input/contracts.ts";
import type {
  ManagedSurfaceFamilyActivationGateInternalV1,
  ManagedSurfaceFamilyRuntimeAdapterInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
import type {
  ManagedSurfaceCoordinatorRecipeV1,
  ManagedSurfaceCoordinatorRuntimeV1,
} from "../managed-surfaces/managed-surface-coordinator-lifetime.ts";
import {
  createManagedSurfaceCoordinatorFacadeInternalV1,
  type ManagedSurfaceCoordinatorV1,
} from "../managed-surfaces/managed-surface-coordinator.ts";
import {
  parseManagedSurfaceActionIdV1,
  type ManagedSurfaceGestureIdV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import { createManagedSurfaceReducerStateV1 } from "../managed-surfaces/managed-surface-reducer.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
} from "../managed-surfaces/managed-surface-stable-admission.ts";
import type { PresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import {
  claimManagedSurfaceStableActionRouteAuthorityInternalV1,
  createManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableActionRouteAuthorityInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
} from "../managed-surfaces/managed-surface-stable-composite-state.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "../managed-surfaces/managed-surface-stable-publisher-lease.ts";
import type { StageReconcilerV1, StageRetargetInputV1 } from "../stage/stage-reconciler.ts";
import {
  bindSemanticStageCompositionRetargetDelegateInternalV1,
  type SemanticStageCompositionDriverInternalV1,
} from "../stage/semantic-stage.tsx";
import {
  createNarrativeStableDialoguePlayerControllerInternalV1,
  createNarrativeStablePhysicalActionAdmissionInternalV1,
  createNarrativeManagedSurfaceFamilyContractInternalV1,
  createNarrativeStableBarrierAcknowledgmentControllerInternalV1,
  createNarrativeStablePublisherBridgeInternalV1,
  createNarrativeStableSessionInternalV1,
  type NarrativeStableBarrierAcknowledgmentControllerInternalV1,
  type NarrativeStableCandidatePreflightResultInternalV1,
  type NarrativeStableDialogueRendererPropsInternalV1,
  type NarrativeStableHistoryRendererPropsInternalV1,
  type NarrativeStablePhysicalActionAdmissionInternalV1,
  type NarrativeStablePublisherBridgeInternalV1,
} from "./narrative-managed-surface-family.ts";
import type { NarrativeStableSessionInternalV1 } from "./narrative-managed-surface-session.ts";
import {
  registerNarrativeSurfaceHostPhysicalIngressInternalV1,
  type NarrativeSurfaceHostPhysicalIngressContextInternalV1,
} from "./narrative-surface-host.tsx";

export type NarrativeChoiceAvailabilityV1 = Readonly<{
  readonly choiceId: string;
  readonly status: "enabled" | "disabled";
  readonly reasonTextIds: readonly string[];
}>;

export interface NarrativeSurfaceSelectionV1 {
  readonly pending: DeepReadonly<PendingInteractionV1> | null;
  readonly history: DeepReadonly<NarrativeHistoryV1>;
  readonly choiceAvailability: readonly NarrativeChoiceAvailabilityV1[] | null;
}

export interface NarrativeSurfaceResolutionRequestV1 {
  readonly expectedOccurrenceId: string;
  readonly resolution: DeepReadonly<InteractionResolutionV1>;
}

export type NarrativeSurfacePlayerViewV1 =
  | Readonly<{
    readonly kind: "say";
    readonly phase: "preparing" | "active" | "suspended";
    readonly playbackMode: "normal" | "auto" | "skip";
    readonly resolvedSpeakerText: string | null;
    readonly resolvedText: string;
    readonly revealedCharacters: number;
    readonly revealLength: number;
    readonly revealComplete: boolean;
  }>
  | Readonly<{
    readonly kind: "passive";
    readonly phase: "preparing" | "active" | "suspended";
    readonly playbackMode: "normal";
  }>;

export interface NarrativeSurfaceDialogueRendererPropsV1 {
  readonly kind: "dialogue";
  readonly pending: DeepReadonly<PendingInteractionV1>;
  readonly choiceAvailability: readonly NarrativeChoiceAvailabilityV1[] | null;
  readonly playerProfile: DeepReadonly<PlayerProfileV1>;
  readonly playerView: DeepReadonly<NarrativeSurfacePlayerViewV1>;
  readonly resolveText: (textId: string) => string;
  readonly onActivate: () => void;
  readonly onChoose: (choiceId: string) => void;
  readonly onResume: () => void;
  readonly onSubmitCustom: (payload: DeepReadonly<StrictJsonObjectV1>) => void;
  readonly onToggleAuto: () => void;
  readonly onToggleSkip: () => void;
  readonly onOpenHistory: () => void;
  readonly onReplayVoice: () => void;
}

export interface NarrativeSurfaceHistoryRendererPropsV1 {
  readonly kind: "history";
  readonly history: DeepReadonly<NarrativeHistoryV1>;
  readonly playerProfile: DeepReadonly<PlayerProfileV1>;
  readonly resolveText: (textId: string) => string;
  readonly onCloseHistory: () => void;
}

export type NarrativeSurfaceRendererPropsV1 =
  | NarrativeSurfaceDialogueRendererPropsV1
  | NarrativeSurfaceHistoryRendererPropsV1;

export interface DefineNarrativeSurfaceInputV1<TSemanticPublication> {
  readonly selectNarrative: (
    publication: DeepReadonly<TSemanticPublication>,
  ) => NarrativeSurfaceSelectionV1;
  readonly dispatchResolution: (
    request: NarrativeSurfaceResolutionRequestV1,
  ) => Promise<unknown>;
  readonly renderer: ComponentType<NarrativeSurfaceRendererPropsV1>;
  readonly resolveText: (locale: string | null, textId: string) => string;
  readonly replayCurrentVoice: (() => boolean) | null;
}

declare const narrativeSurfaceDefinitionBrandV1: unique symbol;
export interface NarrativeSurfaceDefinitionV1<TSemanticPublication> {
  readonly [narrativeSurfaceCompositionDefinitionBrandInternalV1]: TSemanticPublication;
  readonly [narrativeSurfaceDefinitionBrandV1]: TSemanticPublication;
}

export type NarrativeSurfaceChoiceAvailabilityStatusInternalV1 =
  NarrativeChoiceAvailabilityV1["status"];
export type NarrativeSurfaceChoiceAvailabilityInternalV1 = NarrativeChoiceAvailabilityV1;
export type NarrativeSurfaceSelectionInternalV1 = NarrativeSurfaceSelectionV1;

type NarrativeSurfaceCompositionEnvironmentInternalV1 = Readonly<{
  readonly playerProfile: PlayerProfileStoreV1;
  readonly presentationClock: PresentationClockV1;
  readonly prefersReducedMotion: () => boolean;
}>;

type NarrativeSurfaceCompositionBoundActionInputInternalV1 = Readonly<{
  readonly actionId: InputActionIdV1;
  readonly choiceId?: string;
  readonly payload?: unknown;
}>;

type NarrativeSurfaceCompositionBoundActionInvocationInternalV1 = Readonly<{
  readonly choiceId?: string;
  readonly payload?: unknown;
}>;

type NarrativeSurfaceCompositionBoundActionInternalV1 = (
  input?: NarrativeSurfaceCompositionBoundActionInvocationInternalV1,
) => boolean;

type NarrativeSurfaceCompositionBoundActionCaptureInternalV1 = (
  input: NarrativeSurfaceCompositionBoundActionInputInternalV1,
) => NarrativeSurfaceCompositionBoundActionInternalV1;

interface NarrativeSurfaceCompositionRendererContextInternalV1 {
  readonly captureActionInternalV1: NarrativeSurfaceCompositionBoundActionCaptureInternalV1;
  readonly captureHistoryCloseInternalV1: () => () => boolean;
  readonly getSelectionInternalV1: () => NarrativeSurfaceSelectionInternalV1 | null;
  readonly subscribeInternalV1: (listener: () => void) => () => void;
}

const inactiveNarrativeSurfaceCompositionBoundActionInternalV1 = Object.freeze(
  (): boolean => false,
);
const narrativeSurfaceCompositionBoundActionContextInternalV1 = createContext<
  NarrativeSurfaceCompositionRendererContextInternalV1 | null
>(null);

/** @internal Captures a renderer callback against the exact current Host/Surface frame. */
export function useNarrativeSurfaceCompositionBoundActionInternalV1(
  input: NarrativeSurfaceCompositionBoundActionInputInternalV1,
): () => boolean {
  const context = useContext(narrativeSurfaceCompositionBoundActionContextInternalV1);
  const { actionId, choiceId, payload } = input;
  return useMemo(() => {
    if (context === null) return inactiveNarrativeSurfaceCompositionBoundActionInternalV1;
    const captured = context.captureActionInternalV1(Object.freeze({
      actionId,
      ...(choiceId === undefined ? {} : { choiceId }),
      ...(payload === undefined ? {} : { payload }),
    }));
    return Object.freeze((): boolean => captured());
  }, [actionId, choiceId, context, payload]);
}

export interface CreateNarrativeSurfaceCompositionDefinitionInputInternalV1<
  TSemanticPublication,
> {
  readonly selectNarrativeInternalV1: (
    publication: DeepReadonly<TSemanticPublication>,
  ) => NarrativeSurfaceSelectionInternalV1;
  readonly preflightCandidateInternalV1: (
    pending: PendingInteractionV1,
    rendererKey: string,
    selection: NarrativeSurfaceSelectionInternalV1,
    environment: NarrativeSurfaceCompositionEnvironmentInternalV1 | null,
  ) => NarrativeStableCandidatePreflightResultInternalV1;
}

declare const narrativeSurfaceCompositionDefinitionBrandInternalV1: unique symbol;

export interface NarrativeSurfaceCompositionDefinitionInternalV1<TSemanticPublication> {
  readonly [narrativeSurfaceCompositionDefinitionBrandInternalV1]: TSemanticPublication;
}

interface NarrativeSurfaceCompositionDefinitionBindingInternalV1<TSemanticPublication> {
  readonly receiver: CreateNarrativeSurfaceCompositionDefinitionInputInternalV1<
    TSemanticPublication
  >;
  readonly selectNarrative: CreateNarrativeSurfaceCompositionDefinitionInputInternalV1<
    TSemanticPublication
  >["selectNarrativeInternalV1"];
  readonly preflightCandidate: CreateNarrativeSurfaceCompositionDefinitionInputInternalV1<
    TSemanticPublication
  >["preflightCandidateInternalV1"];
}

const narrativeSurfaceCompositionDefinitionBindingsInternalV1 = new WeakMap<
  object,
  NarrativeSurfaceCompositionDefinitionBindingInternalV1<unknown>
>();

const definitionKeysInternalV1 = Object.freeze(
  [
    "selectNarrativeInternalV1",
    "preflightCandidateInternalV1",
  ] as const,
);

function captureFrozenPlainExactRecordInternalV1(
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  if (
    typeof value !== "object" || value === null || Array.isArray(value) ||
    Reflect.getPrototypeOf(value) !== Object.prototype || !Object.isFrozen(value)
  ) return null;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length) return null;
  const result: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable ||
      descriptor.configurable || descriptor.writable
    ) return null;
    result[key] = descriptor.value;
  }
  for (const key of ownKeys) {
    if (typeof key !== "string" || !Object.hasOwn(result, key)) return null;
  }
  return Object.freeze(result);
}

function isCallableWithoutThenInternalV1(value: unknown): value is (...args: never[]) => unknown {
  if (typeof value !== "function") return false;
  try {
    if (Reflect.get(value, "then") !== undefined) return false;
    const seen = new Set<object>();
    let cursor: object | null = value;
    for (let depth = 0; cursor !== null && depth < 32; depth += 1) {
      if (seen.has(cursor)) return false;
      seen.add(cursor);
      const thenDescriptor = Reflect.getOwnPropertyDescriptor(cursor, "then");
      if (thenDescriptor !== undefined) return false;
      cursor = Reflect.getPrototypeOf(cursor);
    }
    return cursor === null;
  } catch {
    return false;
  }
}

/**
 * Captures the package-private production binding before a composition can
 * subscribe to semantic state or allocate a managed runtime.
 */
export function createNarrativeSurfaceCompositionDefinitionInternalV1<
  TSemanticPublication,
>(
  input: CreateNarrativeSurfaceCompositionDefinitionInputInternalV1<TSemanticPublication>,
): NarrativeSurfaceCompositionDefinitionInternalV1<TSemanticPublication> {
  let captured: Readonly<Record<string, unknown>> | null = null;
  try {
    captured = captureFrozenPlainExactRecordInternalV1(input, definitionKeysInternalV1);
  } catch {
    captured = null;
  }
  if (
    captured === null ||
    !isCallableWithoutThenInternalV1(captured.selectNarrativeInternalV1) ||
    !isCallableWithoutThenInternalV1(captured.preflightCandidateInternalV1)
  ) {
    throw new TypeError("ui.narrative_surface_composition_definition_invalid");
  }
  const definition = Object.freeze(
    {},
  ) as NarrativeSurfaceCompositionDefinitionInternalV1<TSemanticPublication>;
  narrativeSurfaceCompositionDefinitionBindingsInternalV1.set(
    definition,
    Object.freeze({
      receiver: input,
      selectNarrative: captured.selectNarrativeInternalV1,
      preflightCandidate: captured.preflightCandidateInternalV1,
    }) as NarrativeSurfaceCompositionDefinitionBindingInternalV1<unknown>,
  );
  return definition;
}

function resolveDefinitionBindingInternalV1<TSemanticPublication>(
  definition: NarrativeSurfaceCompositionDefinitionInternalV1<TSemanticPublication>,
): NarrativeSurfaceCompositionDefinitionBindingInternalV1<TSemanticPublication> {
  const binding = narrativeSurfaceCompositionDefinitionBindingsInternalV1.get(definition);
  if (binding === undefined) {
    throw new TypeError("ui.narrative_surface_composition_definition_invalid");
  }
  return binding as NarrativeSurfaceCompositionDefinitionBindingInternalV1<TSemanticPublication>;
}

/** @internal Allocation-free definition admission used by the composer. */
export function assertNarrativeSurfaceCompositionDefinitionInternalV1(
  definition: NarrativeSurfaceCompositionDefinitionInternalV1<unknown>,
): void {
  resolveDefinitionBindingInternalV1(definition);
}

interface NarrativeSurfacePublicDefinitionBindingInternalV1 {
  readonly receiver: object;
  readonly selectNarrative: (publication: never) => NarrativeSurfaceSelectionV1;
  readonly dispatchResolution: (request: NarrativeSurfaceResolutionRequestV1) => Promise<unknown>;
  readonly renderer: ComponentType<NarrativeSurfaceRendererPropsV1>;
  readonly resolveText: (locale: string | null, textId: string) => string;
  readonly replayCurrentVoice: (() => boolean) | null;
  readonly rendererComponent: ComponentType<
    | NarrativeStableDialogueRendererPropsInternalV1
    | NarrativeStableHistoryRendererPropsInternalV1
  >;
}

interface NarrativeSurfacePublicObservationInternalV1 {
  readonly getSelectionInternalV1: () => NarrativeSurfaceSelectionInternalV1 | null;
  readonly subscribeInternalV1: (listener: () => void) => () => void;
  readonly reportFailureInternalV1: (error: unknown) => void;
}

const narrativeSurfacePublicDefinitionBindingsInternalV1 = new WeakMap<
  object,
  NarrativeSurfacePublicDefinitionBindingInternalV1
>();
const publicDefinitionKeysInternalV1 = Object.freeze(
  [
    "selectNarrative",
    "dispatchResolution",
    "renderer",
    "resolveText",
    "replayCurrentVoice",
  ] as const,
);
const narrativeChooseActionIdInternalV1 = parseInputActionIdV1("narrative.choose");
const narrativeResumeActionIdInternalV1 = parseInputActionIdV1("narrative.resume");
const narrativeCustomActionIdInternalV1 = parseInputActionIdV1("narrative.custom");

function useCapturedNarrativeSurfaceActionInternalV1(
  context: NarrativeSurfaceCompositionRendererContextInternalV1,
  actionId: InputActionIdV1,
): NarrativeSurfaceCompositionBoundActionInternalV1 {
  return useMemo(
    () => context.captureActionInternalV1(Object.freeze({ actionId })),
    [actionId, context],
  );
}

function NarrativeSurfacePublicRendererAdapterInternalV1(
  props: Readonly<{
    readonly binding: NarrativeSurfacePublicDefinitionBindingInternalV1;
    readonly rendererProps:
      | NarrativeStableDialogueRendererPropsInternalV1
      | NarrativeStableHistoryRendererPropsInternalV1;
  }>,
): ReactElement {
  const context = useContext(narrativeSurfaceCompositionBoundActionContextInternalV1);
  if (context === null) {
    throw new TypeError("ui.narrative_surface_renderer_context_invalid");
  }
  const selection = useSyncExternalStore(
    context.subscribeInternalV1,
    context.getSelectionInternalV1,
    context.getSelectionInternalV1,
  );
  const activate = useCapturedNarrativeSurfaceActionInternalV1(
    context,
    systemInputActionIdsV1.narrativeAdvance,
  );
  const choose = useCapturedNarrativeSurfaceActionInternalV1(
    context,
    narrativeChooseActionIdInternalV1,
  );
  const resume = useCapturedNarrativeSurfaceActionInternalV1(
    context,
    narrativeResumeActionIdInternalV1,
  );
  const submitCustom = useCapturedNarrativeSurfaceActionInternalV1(
    context,
    narrativeCustomActionIdInternalV1,
  );
  const toggleAuto = useCapturedNarrativeSurfaceActionInternalV1(
    context,
    playerInputActionIdsV1.toggleAuto,
  );
  const toggleSkip = useCapturedNarrativeSurfaceActionInternalV1(
    context,
    playerInputActionIdsV1.toggleSkip,
  );
  const openHistory = useCapturedNarrativeSurfaceActionInternalV1(
    context,
    playerInputActionIdsV1.toggleHistory,
  );
  const replayVoice = useCapturedNarrativeSurfaceActionInternalV1(
    context,
    playerInputActionIdsV1.replayVoice,
  );
  const closeHistory = useMemo(
    () => context.captureHistoryCloseInternalV1(),
    [context],
  );
  const locale = props.rendererProps.playerProfile.preferences.locale;
  const resolveText = useCallback(
    (textId: string): string =>
      Reflect.apply(props.binding.resolveText, props.binding.receiver, [locale, textId]),
    [locale, props.binding],
  );
  const onActivate = useCallback((): void => void activate(), [activate]);
  const onChoose = useCallback(
    (choiceId: string): void => void choose(Object.freeze({ choiceId })),
    [choose],
  );
  const onResume = useCallback((): void => void resume(), [resume]);
  const onSubmitCustom = useCallback(
    (payload: DeepReadonly<StrictJsonObjectV1>): void =>
      void submitCustom(Object.freeze({ payload })),
    [submitCustom],
  );
  const onToggleAuto = useCallback((): void => void toggleAuto(), [toggleAuto]);
  const onToggleSkip = useCallback((): void => void toggleSkip(), [toggleSkip]);
  const onOpenHistory = useCallback((): void => void openHistory(), [openHistory]);
  const onReplayVoice = useCallback((): void => void replayVoice(), [replayVoice]);
  const onCloseHistory = useCallback((): void => void closeHistory(), [closeHistory]);

  if (props.rendererProps.kind === "history") {
    return createElement(
      props.binding.renderer,
      Object.freeze({
        kind: "history" as const,
        history: props.rendererProps.history,
        playerProfile: props.rendererProps.playerProfile,
        resolveText,
        onCloseHistory,
      }),
    );
  }

  const internalView = props.rendererProps.playerView;
  const playerView: NarrativeSurfacePlayerViewV1 = internalView.kind === "say"
    ? Object.freeze({
      kind: "say" as const,
      phase: internalView.phase,
      playbackMode: internalView.playbackMode,
      resolvedSpeakerText: internalView.resolvedSpeakerText,
      resolvedText: internalView.resolvedText,
      revealedCharacters: internalView.revealedCharacters,
      revealLength: internalView.revealLength,
      revealComplete: internalView.revealComplete,
    })
    : Object.freeze({
      kind: "passive" as const,
      phase: internalView.phase,
      playbackMode: "normal" as const,
    });
  const currentAvailability = selection?.pending?.kind === "choice" &&
      selection.pending.occurrenceId === props.rendererProps.pending.occurrenceId
    ? selection.choiceAvailability
    : null;
  return createElement(
    props.binding.renderer,
    Object.freeze({
      kind: "dialogue" as const,
      pending: props.rendererProps.pending,
      choiceAvailability: currentAvailability,
      playerProfile: props.rendererProps.playerProfile,
      playerView,
      resolveText,
      onActivate,
      onChoose,
      onResume,
      onSubmitCustom,
      onToggleAuto,
      onToggleSkip,
      onOpenHistory,
      onReplayVoice,
    }),
  );
}

function normalizeNarrativeSurfaceClockTimestampInternalV1(value: unknown): number {
  if (
    typeof value !== "number" || !Number.isFinite(value) || value < 0 ||
    value > Number.MAX_SAFE_INTEGER
  ) return typeof value === "number" ? value : Number.NaN;
  return Math.floor(value);
}

function createNarrativeSurfacePublicCandidateInternalV1(
  binding: NarrativeSurfacePublicDefinitionBindingInternalV1,
  pending: PendingInteractionV1,
  selection: NarrativeSurfaceSelectionInternalV1,
  environment: NarrativeSurfaceCompositionEnvironmentInternalV1 | null,
  observation: NarrativeSurfacePublicObservationInternalV1 | null,
): NarrativeStableCandidatePreflightResultInternalV1 {
  if (environment === null) {
    return Object.freeze({
      kind: "rejected" as const,
      code: "narrative.renderer_missing" as const,
    });
  }
  const profile = Reflect.apply(environment.playerProfile.current, environment.playerProfile, []);
  const locale = profile.preferences.locale;
  return Object.freeze({
    kind: "captured" as const,
    candidateSnapshot: Object.freeze({
      rendererComponent: binding.rendererComponent,
      visualConfig: Object.freeze({}),
      semanticDispatchPort: Object.freeze({
        dispatchResolutionInternalV1(request: NarrativeSurfaceResolutionRequestV1) {
          if (request.expectedOccurrenceId !== pending.occurrenceId) {
            throw new TypeError("ui.narrative_surface_resolution_invalid");
          }
          const resolution = parseInteractionResolutionV1(request.resolution);
          return Reflect.apply(binding.dispatchResolution, binding.receiver, [Object.freeze({
            expectedOccurrenceId: pending.occurrenceId,
            resolution,
          })]);
        },
      }),
      historyObservationPort: Object.freeze({
        getSnapshotInternalV1: () =>
          observation?.getSelectionInternalV1()?.history ?? selection.history,
        subscribeInternalV1: (listener: () => void) =>
          observation?.subscribeInternalV1(listener) ?? Object.freeze(() => undefined),
      }),
      historyAvailabilityPort: Object.freeze({
        readHistoryAvailabilityInternalV1: () =>
          (observation?.getSelectionInternalV1()?.history ?? selection.history).entries.length > 0,
      }),
      playerProfile: Object.freeze({
        getSnapshotInternalV1: () =>
          Reflect.apply(environment.playerProfile.current, environment.playerProfile, []),
        subscribeInternalV1: (listener: () => void) =>
          Reflect.apply(environment.playerProfile.subscribe, environment.playerProfile, [listener]),
        markSeenInternalV1: (definitionId: string, seenRevision: number): void => {
          try {
            void Promise.resolve(Reflect.apply(
              environment.playerProfile.markSeen,
              environment.playerProfile,
              [definitionId, seenRevision],
            )).catch((error) => observation?.reportFailureInternalV1(error));
          } catch (error) {
            observation?.reportFailureInternalV1(error);
          }
        },
      }),
      presentationClock: Object.freeze({
        nowInternalV1: () =>
          normalizeNarrativeSurfaceClockTimestampInternalV1(
            Reflect.apply(environment.presentationClock.now, environment.presentationClock, []),
          ),
        requestTickInternalV1: (callback: (nowMs: number) => void) =>
          Reflect.apply(environment.presentationClock.requestTick, environment.presentationClock, [
            (_frameTimestamp: number): void => {
              let nowMs = Number.NaN;
              try {
                nowMs = normalizeNarrativeSurfaceClockTimestampInternalV1(
                  Reflect.apply(
                    environment.presentationClock.now,
                    environment.presentationClock,
                    [],
                  ),
                );
              } catch {
                // The family validates NaN as a contained current-clock fault.
              }
              Reflect.apply(callback, undefined, [nowMs]);
            },
          ]),
        prefersReducedMotionInternalV1: () =>
          Reflect.apply(environment.prefersReducedMotion, undefined, []),
      }),
      textResolver: Object.freeze({
        resolveTextInternalV1: (textId: string) =>
          Reflect.apply(binding.resolveText, binding.receiver, [locale, textId]),
      }),
      voiceReplayPort: binding.replayCurrentVoice === null ? null : Object.freeze({
        replayCurrentVoiceInternalV1: () =>
          Reflect.apply(binding.replayCurrentVoice!, binding.receiver, []),
      }),
      quickMenuContribution: null,
    }),
  });
}

export function defineNarrativeSurfaceV1<TSemanticPublication>(
  input: DefineNarrativeSurfaceInputV1<TSemanticPublication>,
): NarrativeSurfaceDefinitionV1<TSemanticPublication> {
  let captured: Readonly<Record<string, unknown>> | null = null;
  try {
    captured = captureFrozenPlainExactRecordInternalV1(input, publicDefinitionKeysInternalV1);
  } catch {
    captured = null;
  }
  if (
    captured === null ||
    !isCallableWithoutThenInternalV1(captured.selectNarrative) ||
    !isCallableWithoutThenInternalV1(captured.dispatchResolution) ||
    !isCallableWithoutThenInternalV1(captured.renderer) ||
    !isCallableWithoutThenInternalV1(captured.resolveText) ||
    (captured.replayCurrentVoice !== null &&
      !isCallableWithoutThenInternalV1(captured.replayCurrentVoice))
  ) {
    throw new TypeError("ui.narrative_surface_definition_invalid");
  }
  let binding!: NarrativeSurfacePublicDefinitionBindingInternalV1;
  const rendererComponent = Object.freeze((
    rendererProps:
      | NarrativeStableDialogueRendererPropsInternalV1
      | NarrativeStableHistoryRendererPropsInternalV1,
  ): ReactElement =>
    createElement(NarrativeSurfacePublicRendererAdapterInternalV1, {
      binding,
      rendererProps,
    })
  );
  binding = Object.freeze({
    receiver: input,
    selectNarrative: captured.selectNarrative,
    dispatchResolution: captured.dispatchResolution,
    renderer: captured.renderer,
    resolveText: captured.resolveText,
    replayCurrentVoice: captured.replayCurrentVoice,
    rendererComponent,
  }) as unknown as NarrativeSurfacePublicDefinitionBindingInternalV1;
  const definition = createNarrativeSurfaceCompositionDefinitionInternalV1(Object.freeze({
    selectNarrativeInternalV1: (publication: DeepReadonly<TSemanticPublication>) =>
      Reflect.apply(binding.selectNarrative, binding.receiver, [publication]),
    preflightCandidateInternalV1: (
      pending: PendingInteractionV1,
      _rendererKey: string,
      selection: NarrativeSurfaceSelectionInternalV1,
      environment: NarrativeSurfaceCompositionEnvironmentInternalV1 | null,
    ) =>
      createNarrativeSurfacePublicCandidateInternalV1(
        binding,
        pending,
        selection,
        environment,
        null,
      ),
  }));
  narrativeSurfacePublicDefinitionBindingsInternalV1.set(
    definition,
    binding,
  );
  return definition as NarrativeSurfaceDefinitionV1<TSemanticPublication>;
}

export function appendNarrativeManagedSurfaceRecipeInternalV1(
  recipe: ManagedSurfaceCoordinatorRecipeV1,
): ManagedSurfaceCoordinatorRecipeV1 {
  const narrative = createNarrativeManagedSurfaceFamilyContractInternalV1();
  return Object.freeze({
    resolvedOwnerIds: Object.freeze([
      ...recipe.resolvedOwnerIds,
      ...narrative.resolvedOwnerIds,
    ]),
    resolvedSlotDescriptors: Object.freeze([
      ...recipe.resolvedSlotDescriptors,
      ...narrative.resolvedSlotDescriptors,
    ]),
    ...(recipe.reportSubscriberFailure === undefined
      ? {}
      : { reportSubscriberFailure: recipe.reportSubscriberFailure }),
  });
}

export interface NarrativeSurfaceCompositeKernelBundleInternalV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly coordinator: ManagedSurfaceCoordinatorV1;
  readonly publisherLeaseRegistry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly admissionAuthority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly compositeRuntimeKernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
}

export function createNarrativeSurfaceCompositeKernelBundleInternalV1(input: {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly recipe: ManagedSurfaceCoordinatorRecipeV1;
}): NarrativeSurfaceCompositeKernelBundleInternalV1 {
  const narrative = createNarrativeManagedSurfaceFamilyContractInternalV1();
  const publisherLeaseRegistry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: input.applicationEpoch,
    resolvedOwnerIds: input.recipe.resolvedOwnerIds,
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
  const admissionAuthority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry,
    definitionSidecars: narrative.stableDefinitionSidecars,
    resolvedSlotDescriptors: input.recipe.resolvedSlotDescriptors,
  });
  const compositeRuntimeKernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority,
    publisherLeaseRegistry,
    initialTransientState: createManagedSurfaceReducerStateV1(
      input.applicationEpoch,
      input.recipe.resolvedOwnerIds,
      input.recipe.resolvedSlotDescriptors,
    ),
    ...(input.recipe.reportSubscriberFailure === undefined ? {} : {
      reportSubscriberFailure: () =>
        input.recipe.reportSubscriberFailure!({
          code: "surface.subscriber_failed",
          summary: "Managed Surface publication subscriber failed.",
          details: Object.freeze({ applicationEpoch: input.applicationEpoch }),
        }),
    }),
  });
  return Object.freeze({
    applicationEpoch: input.applicationEpoch,
    coordinator: createManagedSurfaceCoordinatorFacadeInternalV1(compositeRuntimeKernel),
    publisherLeaseRegistry,
    admissionAuthority,
    compositeRuntimeKernel,
  });
}

export interface NarrativeSurfaceSemanticPresentationSourceInternalV1<TSemanticPublication> {
  getSnapshotInternalV1(): DeepReadonly<TSemanticPublication>;
  subscribeInternalV1(listener: () => void): () => void;
}

export interface NarrativeSurfaceCompositionRuntimeInternalV1
  extends ManagedSurfaceFamilyRuntimeAdapterInternalV1 {
  getCurrentSessionInternalV1(): NarrativeStableSessionInternalV1 | null;
  getCurrentSelectionInternalV1(): NarrativeSurfaceSelectionInternalV1 | null;
  getStageClaimantInternalV1(): object;
  isHostEnabledInternalV1(): boolean;
  isGestureCurrentInternalV1(gestureId: ManagedSurfaceGestureIdV1): boolean;
  registerHostPhysicalIngressInternalV1(
    input: Readonly<{
      readonly session: NarrativeStableSessionInternalV1;
      readonly portalContainer: HTMLDivElement;
      readonly inputRouter: InputRouterV1;
    }>,
  ): () => void;
  provideHostActionContextInternalV1(children: ReactNode): ReactElement;
  subscribeInternalV1(listener: () => void): () => void;
  bindStageReconcilerInternalV1(
    reconciler: StageReconcilerV1,
    driver: SemanticStageCompositionDriverInternalV1,
  ): () => void;
  isCurrentRuntimeAttachmentInternalV1(runtime: ManagedSurfaceCoordinatorRuntimeV1): boolean;
  disposeInternalV1(): void;
}

interface NarrativeSurfaceCompositionGenerationInternalV1 {
  readonly runtime: ManagedSurfaceCoordinatorRuntimeV1;
  readonly activationGate: ManagedSurfaceFamilyActivationGateInternalV1;
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly session: NarrativeStableSessionInternalV1;
  readonly stableActionAuthority: ManagedSurfaceStableActionRouteAuthorityInternalV1;
  selection: NarrativeSurfaceSelectionInternalV1 | null;
  unsubscribePresentation: (() => void) | null;
  releaseHostPhysicalRegistration: (() => void) | null;
  hostPhysicalRegistrationToken: object | null;
  physicalIngress: NarrativeSurfaceHostPhysicalIngressContextInternalV1 | null;
  unregisterPhysicalInput: (() => void) | null;
  physicalAdmission: NarrativeStablePhysicalActionAdmissionInternalV1 | null;
  authenticatedRouteInProgress: boolean;
  barrierController: NarrativeStableBarrierAcknowledgmentControllerInternalV1 | null;
  releaseStageRetargetDelegate: (() => void) | null;
  unsubscribeBarrierSession: (() => void) | null;
  readonly barrierRecoveryGate: ManagedSurfaceFamilyActivationGateInternalV1;
  barrierRecoveryGateOpen: boolean;
  barrierRecoveryState: "ineligible" | "eligible" | "synchronization_pending" | "active";
  barrierRecoveryOccurrenceId: string | null;
  barrierRecoveryPendingBytes: Uint8Array | null;
  reportedReplayRecoveryResult: object | null;
  lastStageDriver: SemanticStageCompositionDriverInternalV1 | null;
  lastStageRetarget:
    | Readonly<{
      readonly target: StageRetargetInputV1["target"];
      readonly revision: number;
      readonly epoch: number;
      readonly semanticOccurrenceId: string | null;
    }>
    | null;
  reconcilingSelection: NarrativeSurfaceSelectionInternalV1 | null;
  active: boolean;
  armed: boolean;
  dirty: boolean;
}

function hasExactFrozenDenseArrayShapeInternalV1(value: readonly unknown[]): boolean {
  if (!Object.isFrozen(value)) return false;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== value.length + 1 || ownKeys.at(-1) !== "length") return false;
  const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined || !("value" in lengthDescriptor) ||
    lengthDescriptor.value !== value.length || lengthDescriptor.writable ||
    lengthDescriptor.enumerable || lengthDescriptor.configurable
  ) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (ownKeys[index] !== String(index)) return false;
    const descriptor = Reflect.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable ||
      descriptor.writable || descriptor.configurable
    ) return false;
  }
  return true;
}

function captureChoiceAvailabilityInternalV1(
  value: unknown,
  pending: PendingInteractionV1 | null,
): readonly NarrativeSurfaceChoiceAvailabilityInternalV1[] | null {
  if (pending?.kind !== "choice") {
    if (value !== null) throw new TypeError("ui.narrative_surface_selection_invalid");
    return null;
  }
  if (
    !Array.isArray(value) || !hasExactFrozenDenseArrayShapeInternalV1(value) ||
    value.length !== pending.options.length
  ) {
    throw new TypeError("ui.narrative_surface_selection_invalid");
  }
  const rows: NarrativeSurfaceChoiceAvailabilityInternalV1[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      throw new TypeError("ui.narrative_surface_selection_invalid");
    }
    const captured = captureFrozenPlainExactRecordInternalV1(
      value[index],
      ["choiceId", "status", "reasonTextIds"],
    );
    const option = pending.options[index];
    if (
      captured === null || option === undefined || captured.choiceId !== option.choiceId ||
      (captured.status !== "enabled" && captured.status !== "disabled") ||
      !Array.isArray(captured.reasonTextIds) ||
      !hasExactFrozenDenseArrayShapeInternalV1(captured.reasonTextIds)
    ) throw new TypeError("ui.narrative_surface_selection_invalid");
    const reasonTextIds: string[] = [];
    for (let reasonIndex = 0; reasonIndex < captured.reasonTextIds.length; reasonIndex += 1) {
      if (
        !Object.hasOwn(captured.reasonTextIds, reasonIndex) ||
        typeof captured.reasonTextIds[reasonIndex] !== "string"
      ) throw new TypeError("ui.narrative_surface_selection_invalid");
      reasonTextIds.push(captured.reasonTextIds[reasonIndex]);
    }
    if (
      (captured.status === "enabled" && reasonTextIds.length !== 0) ||
      (captured.status === "disabled" && reasonTextIds.length === 0)
    ) throw new TypeError("ui.narrative_surface_selection_invalid");
    rows.push(Object.freeze({
      choiceId: option.choiceId,
      status: captured.status,
      reasonTextIds: Object.freeze(reasonTextIds),
    }));
  }
  return Object.freeze(rows);
}

function captureSelectionInternalV1(value: unknown): NarrativeSurfaceSelectionInternalV1 {
  const captured = captureFrozenPlainExactRecordInternalV1(
    value,
    ["pending", "history", "choiceAvailability"],
  );
  if (captured === null) throw new TypeError("ui.narrative_surface_selection_invalid");
  const pending = captured.pending === null ? null : parsePendingInteractionV1(captured.pending);
  const history = parseNarrativeHistoryV1(captured.history);
  const choiceAvailability = captureChoiceAvailabilityInternalV1(
    captured.choiceAvailability,
    pending,
  );
  return Object.freeze({ pending, history, choiceAvailability });
}

function bridgeResultAcceptedInternalV1(result: { readonly kind: string }): boolean {
  return result.kind === "applied" || result.kind === "unchanged";
}

function byteArraysEqualInternalV1(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

interface NarrativeSurfaceCompletionFenceInternalV1 {
  readonly controller: NarrativeStableBarrierAcknowledgmentControllerInternalV1 | null;
  readonly semanticOccurrenceId: string;
  readonly directTarget: object;
  readonly sourceRevision: number;
  readonly targetProof: unknown;
  readonly frame: object;
}

export function createNarrativeSurfaceCompositionRuntimeInternalV1<TSemanticPublication>(input: {
  readonly definition: NarrativeSurfaceCompositionDefinitionInternalV1<TSemanticPublication> | null;
  readonly environment: NarrativeSurfaceCompositionEnvironmentInternalV1 | null;
  readonly presentation: NarrativeSurfaceSemanticPresentationSourceInternalV1<
    TSemanticPublication
  >;
  readonly resolveKernelBundleInternalV1: (
    runtime: ManagedSurfaceCoordinatorRuntimeV1,
  ) => NarrativeSurfaceCompositeKernelBundleInternalV1;
  readonly stageClaimant: object;
  readonly reportFailure?: (error: unknown) => void;
  readonly reportObservation?: (code: "narrative.barrier_replay_unsupported") => void;
  readonly sealCompositionOnFailure?: (error: unknown) => void;
}): NarrativeSurfaceCompositionRuntimeInternalV1 {
  const binding = input.definition === null ? null : resolveDefinitionBindingInternalV1(
    input.definition,
  );
  const publicBinding = input.definition === null
    ? null
    : narrativeSurfacePublicDefinitionBindingsInternalV1.get(input.definition) ?? null;
  if (
    typeof input.stageClaimant !== "object" || input.stageClaimant === null
  ) throw new TypeError("ui.narrative_surface_composition_invalid");
  const family = createNarrativeManagedSurfaceFamilyContractInternalV1();
  const listeners = new Set<() => void>();
  let current: NarrativeSurfaceCompositionGenerationInternalV1 | null = null;
  let prepared: NarrativeSurfaceCompositionGenerationInternalV1 | null = null;
  let disposed = false;
  let stageReconciler: StageReconcilerV1 | null = null;
  let stageDriver: SemanticStageCompositionDriverInternalV1 | null = null;
  let pendingStageBindingRelease: object | null = null;
  let notifying = false;

  const reportFailureNoThrow = (error: unknown): void => {
    try {
      input.reportFailure?.(error);
    } catch {
      // Failure delivery cannot break activation notification ordering.
    }
  };

  const reportObservationNoThrow = (
    code: "narrative.barrier_replay_unsupported",
  ): void => {
    try {
      input.reportObservation?.(code);
    } catch {
      // Unsupported recovery remains non-terminal even when diagnostics throw.
    }
  };

  const noThrow = (operation: () => void): void => {
    try {
      operation();
    } catch {
      // Each terminal fence is independent and best effort.
    }
  };

  const notifyNoThrow = (): void => {
    if (notifying) return;
    notifying = true;
    try {
      for (const listener of [...listeners]) {
        try {
          listener();
        } catch (error) {
          reportFailureNoThrow(error);
        }
      }
    } finally {
      notifying = false;
    }
  };

  const detachBarrierController = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
  ): void => {
    const releaseStageRetargetDelegate = generation.releaseStageRetargetDelegate;
    generation.releaseStageRetargetDelegate = null;
    const unsubscribeBarrierSession = generation.unsubscribeBarrierSession;
    generation.unsubscribeBarrierSession = null;
    const barrierController = generation.barrierController;
    generation.barrierController = null;
    noThrow(() => releaseStageRetargetDelegate?.());
    noThrow(() => unsubscribeBarrierSession?.());
    noThrow(() => barrierController?.disposeInternalV1());
  };

  const retireGeneration = (generation: NarrativeSurfaceCompositionGenerationInternalV1): void => {
    generation.active = false;
    const unsubscribePresentation = generation.unsubscribePresentation;
    generation.unsubscribePresentation = null;
    const releaseHostPhysicalRegistration = generation.releaseHostPhysicalRegistration;
    generation.releaseHostPhysicalRegistration = null;
    generation.hostPhysicalRegistrationToken = null;
    const unregisterPhysicalInput = generation.unregisterPhysicalInput;
    generation.unregisterPhysicalInput = null;
    generation.physicalIngress = null;
    const physicalAdmission = generation.physicalAdmission;
    generation.physicalAdmission = null;
    generation.authenticatedRouteInProgress = false;
    noThrow(() => unsubscribePresentation?.());
    noThrow(() => releaseHostPhysicalRegistration?.());
    noThrow(() => unregisterPhysicalInput?.());
    noThrow(() => physicalAdmission?.disposeInternalV1());
    detachBarrierController(generation);
    noThrow(() => generation.bridge.disposeInternalV1());
  };

  const readSelection = (): NarrativeSurfaceSelectionInternalV1 | null => {
    if (binding === null) return null;
    return captureSelectionInternalV1(
      Reflect.apply(binding.selectNarrative, binding.receiver, [
        input.presentation.getSnapshotInternalV1(),
      ]),
    );
  };

  const initializeBarrierRecoveryEligibility = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
    selection: NarrativeSurfaceSelectionInternalV1 | null,
  ): void => {
    const pending = selection?.pending ?? null;
    if (pending?.kind !== "presentation_barrier") return;
    generation.barrierRecoveryState = "eligible";
    generation.barrierRecoveryOccurrenceId = pending.occurrenceId;
    generation.barrierRecoveryPendingBytes = canonicalJsonBytes(pending);
  };

  const barrierRecoverySelectionIsEligible = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
    selection: NarrativeSurfaceSelectionInternalV1 | null,
  ): boolean => {
    const pending = selection?.pending ?? null;
    const expectedBytes = generation.barrierRecoveryPendingBytes;
    return pending?.kind === "presentation_barrier" && expectedBytes !== null &&
      pending.occurrenceId === generation.barrierRecoveryOccurrenceId &&
      byteArraysEqualInternalV1(canonicalJsonBytes(pending), expectedBytes);
  };

  const maintainBarrierRecoveryEligibility = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
    selection: NarrativeSurfaceSelectionInternalV1 | null,
  ): void => {
    if (
      (generation.barrierRecoveryState === "eligible" ||
        generation.barrierRecoveryState === "synchronization_pending") &&
      !barrierRecoverySelectionIsEligible(generation, selection)
    ) {
      generation.barrierRecoveryState = "ineligible";
    }
  };

  const reconcile = (generation: NarrativeSurfaceCompositionGenerationInternalV1): void => {
    if (!generation.active) return;
    const next = readSelection();
    generation.reconcilingSelection = next;
    try {
      const result = generation.bridge.reconcilePendingInternalV1(next?.pending ?? null);
      if (!bridgeResultAcceptedInternalV1(result)) {
        throw new TypeError("ui.narrative_surface_reconcile_faulted");
      }
      maintainBarrierRecoveryEligibility(generation, next);
      generation.selection = next;
    } finally {
      generation.reconcilingSelection = null;
    }
  };

  const captureCompletionFence = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
    controller: NarrativeStableBarrierAcknowledgmentControllerInternalV1 | null,
  ): NarrativeSurfaceCompletionFenceInternalV1 | null => {
    const pending = generation.selection?.pending ?? null;
    if (pending === null) return null;
    try {
      const captured = generation.stableActionAuthority.captureCurrentStableInputInternalV1();
      if (
        captured.kind !== "captured" || captured.directTarget === null ||
        captured.sourceRevision === null || captured.targetProof === null
      ) return null;
      const frame = generation.bridge.inspectAdmittedTargetFrameInternalV1(
        captured.directTarget,
      );
      if (frame === null || frame.semanticOccurrenceId !== pending.occurrenceId) return null;
      return Object.freeze({
        controller,
        semanticOccurrenceId: pending.occurrenceId,
        directTarget: captured.directTarget,
        sourceRevision: captured.sourceRevision,
        targetProof: captured.targetProof,
        frame,
      });
    } catch {
      return null;
    }
  };

  const completionFenceIsCurrent = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
    fence: NarrativeSurfaceCompletionFenceInternalV1,
  ): boolean => {
    if (
      disposed || !generation.active || (current !== generation && prepared !== generation) ||
      generation.selection?.pending?.occurrenceId !== fence.semanticOccurrenceId ||
      (fence.controller !== null && generation.barrierController !== fence.controller)
    ) return false;
    try {
      if (!generation.stableActionAuthority.isCurrentDirectTargetInternalV1(fence.targetProof)) {
        return false;
      }
      const captured = generation.stableActionAuthority.captureCurrentStableInputInternalV1();
      return captured.kind === "captured" && captured.directTarget === fence.directTarget &&
        captured.sourceRevision === fence.sourceRevision &&
        generation.bridge.inspectAdmittedTargetFrameInternalV1(captured.directTarget) ===
          fence.frame;
    } catch {
      return false;
    }
  };

  const trackCurrentCompletion = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
    fence: NarrativeSurfaceCompletionFenceInternalV1,
    completion: Promise<unknown>,
    requireSynchronousPublication: boolean,
  ): void => {
    void completion.then(
      () => {
        if (requireSynchronousPublication && completionFenceIsCurrent(generation, fence)) {
          failComposition(
            new TypeError("ui.narrative_surface_completion_without_publication"),
          );
        }
      },
      (error) => {
        if (completionFenceIsCurrent(generation, fence)) failComposition(error);
      },
    );
  };

  const flushBarrierTerminal = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
  ): void => {
    const controller = generation.barrierController;
    if (
      disposed || !generation.active || controller === null ||
      (current !== generation && prepared !== generation)
    ) return;
    const fence = captureCompletionFence(generation, controller);
    let result: ReturnType<
      NarrativeStableBarrierAcknowledgmentControllerInternalV1[
        "flushRetainedTerminalInternalV1"
      ]
    >;
    try {
      result = controller.flushRetainedTerminalInternalV1();
    } catch (error) {
      failComposition(error);
      return;
    }
    if (result?.kind === "faulted") {
      failComposition(new TypeError("ui.narrative_surface_barrier_flush_faulted"));
    } else if (result?.kind === "dispatched") {
      if (fence === null) {
        void result.completion.catch(() => undefined);
        failComposition(new TypeError("ui.narrative_surface_barrier_completion_unfenced"));
      } else trackCurrentCompletion(generation, fence, result.completion, true);
    }
  };

  const activateBarrierRecovery = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
  ): void => {
    const controller = generation.barrierController;
    if (controller === null || !generation.active) return;
    const attempt = controller.issueSettleRecoveryAttemptInternalV1();
    if (attempt !== null) {
      const fence = captureCompletionFence(generation, controller);
      const result = controller.dispatchSettleRecoveryInternalV1(attempt);
      if (result.kind === "faulted") {
        throw new TypeError("ui.narrative_surface_barrier_recovery_faulted");
      }
      if (result.kind === "dispatched") {
        if (fence === null) {
          void result.completion.catch(() => undefined);
          throw new TypeError("ui.narrative_surface_barrier_completion_unfenced");
        }
        trackCurrentCompletion(generation, fence, result.completion, true);
      }
    }
    const replayUnsupported = controller.readReplayRecoveryUnsupportedInternalV1();
    if (
      replayUnsupported !== null &&
      generation.reportedReplayRecoveryResult !== replayUnsupported
    ) {
      generation.reportedReplayRecoveryResult = replayUnsupported;
      reportObservationNoThrow(replayUnsupported.code);
    }
  };

  const synchronizeBarrierRecovery = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
    allowStale: boolean,
  ): boolean => {
    const controller = generation.barrierController;
    if (controller === null || !generation.active) return false;
    const synchronized = controller.synchronizeRecoveryGenerationInternalV1(
      generation.barrierRecoveryGate,
    );
    if (synchronized.kind === "stale" && allowStale) return false;
    if (synchronized.kind !== "installed" && synchronized.kind !== "unchanged") {
      throw new TypeError("ui.narrative_surface_barrier_recovery_faulted");
    }
    generation.barrierRecoveryState = "active";
    generation.barrierRecoveryGateOpen = true;
    activateBarrierRecovery(generation);
    return true;
  };

  const completeBarrierStageMutation = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
  ): void => {
    if (
      disposed || !generation.active ||
      (current !== generation && prepared !== generation)
    ) return;
    try {
      if (generation.barrierRecoveryState === "synchronization_pending") {
        synchronizeBarrierRecovery(generation, false);
      } else if (generation.barrierRecoveryState === "active") {
        activateBarrierRecovery(generation);
      }
      flushBarrierTerminal(generation);
    } catch (error) {
      failComposition(error);
    }
  };

  const stageRetargetMatchesLast = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
    driver: SemanticStageCompositionDriverInternalV1,
    retarget: StageRetargetInputV1,
    semanticOccurrenceId: string | null,
  ): boolean => {
    const last = generation.lastStageRetarget;
    return generation.lastStageDriver === driver && last !== null &&
      last.revision === retarget.revision && last.epoch === retarget.epoch &&
      last.semanticOccurrenceId === semanticOccurrenceId;
  };

  const recordStageRetarget = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
    driver: SemanticStageCompositionDriverInternalV1,
    retarget: StageRetargetInputV1,
    semanticOccurrenceId: string | null,
  ): void => {
    generation.lastStageDriver = driver;
    generation.lastStageRetarget = Object.freeze({
      target: retarget.target,
      revision: retarget.revision,
      epoch: retarget.epoch,
      semanticOccurrenceId,
    });
  };

  const installBarrierController = (
    generation: NarrativeSurfaceCompositionGenerationInternalV1,
    reconciler: StageReconcilerV1,
    driver: SemanticStageCompositionDriverInternalV1,
  ): void => {
    if (
      generation.barrierController !== null ||
      generation.releaseStageRetargetDelegate !== null ||
      generation.unsubscribeBarrierSession !== null
    ) throw new TypeError("ui.narrative_surface_stage_binding_invalid");
    const controller = createNarrativeStableBarrierAcknowledgmentControllerInternalV1({
      bridge: generation.bridge,
      stageReconciler: reconciler,
    });
    let releaseDelegate: (() => void) | null = null;
    let unsubscribeSession: (() => void) | null = null;
    try {
      unsubscribeSession = generation.session.subscribeInternalV1(() => {
        if (generation.barrierRecoveryState === "active") {
          try {
            activateBarrierRecovery(generation);
          } catch (error) {
            failComposition(error);
            return;
          }
        }
        flushBarrierTerminal(generation);
      });
      if (!isCallableWithoutThenInternalV1(unsubscribeSession)) {
        throw new TypeError("ui.narrative_surface_stage_binding_invalid");
      }
      releaseDelegate = bindSemanticStageCompositionRetargetDelegateInternalV1(
        driver,
        (retarget): boolean => {
          if (disposed || !generation.active || current !== generation) return true;
          try {
            // Presentation subscribers have no ordering contract. Refresh the
            // semantic selection at this exact Stage mutation boundary so a
            // freshly published Barrier can claim the still-matching Stage run
            // even when the Stage subscriber fires before Narrative's listener.
            if (binding !== null) {
              generation.dirty = false;
              reconcile(generation);
              if (generation.dirty) {
                throw new TypeError("ui.narrative_surface_reconcile_reentered");
              }
            }
            const pending = generation.selection?.pending ?? null;
            const occurrenceId = pending?.occurrenceId ?? null;
            if (stageRetargetMatchesLast(generation, driver, retarget, occurrenceId)) return true;
            if (
              generation.barrierRecoveryState === "eligible" &&
              barrierRecoverySelectionIsEligible(generation, generation.selection)
            ) {
              const recoveryRetarget = controller.retargetPresentationStageInternalV1(retarget);
              if (recoveryRetarget.kind !== "retargeted") {
                throw new TypeError("ui.narrative_surface_barrier_recovery_retarget_faulted");
              }
              generation.barrierRecoveryState = "synchronization_pending";
              recordStageRetarget(generation, driver, retarget, occurrenceId);
              return true;
            }
            if (generation.barrierRecoveryState === "eligible") {
              generation.barrierRecoveryState = "ineligible";
            }
            if (pending?.kind !== "presentation_barrier") return false;
            const result = controller.retargetCurrentBarrierStageInternalV1(retarget);
            if (result.kind !== "armed") {
              throw new TypeError(
                result.kind === "faulted"
                  ? `ui.narrative_surface_barrier_${result.code}`
                  : "ui.narrative_surface_barrier_stale",
              );
            }
            recordStageRetarget(generation, driver, retarget, occurrenceId);
            return true;
          } catch (error) {
            failComposition(error);
            return true;
          }
        },
        () => completeBarrierStageMutation(generation),
      );
      generation.barrierController = controller;
      generation.releaseStageRetargetDelegate = releaseDelegate;
      generation.unsubscribeBarrierSession = unsubscribeSession;
      if (generation.lastStageDriver !== null && generation.lastStageDriver !== driver) {
        generation.lastStageRetarget = null;
      }
      generation.lastStageDriver = driver;
    } catch (error) {
      noThrow(() => releaseDelegate?.());
      noThrow(() => unsubscribeSession?.());
      noThrow(() => controller.disposeInternalV1());
      throw error;
    }
  };

  const createStageBindingRelease = (
    reconciler: StageReconcilerV1,
    driver: SemanticStageCompositionDriverInternalV1,
  ): () => void => {
    let active = true;
    return Object.freeze((): void => {
      if (!active) return;
      active = false;
      if (stageReconciler !== reconciler || stageDriver !== driver) return;
      const releaseToken = Object.freeze({});
      pendingStageBindingRelease = releaseToken;
      queueMicrotask(() => {
        if (
          pendingStageBindingRelease !== releaseToken || disposed ||
          stageReconciler !== reconciler || stageDriver !== driver
        ) return;
        pendingStageBindingRelease = null;
        stageReconciler = null;
        stageDriver = null;
        const boundGeneration = current ?? prepared;
        if (boundGeneration !== null) detachBarrierController(boundGeneration);
      });
    });
  };

  const captureBoundHostAction = (
    request: NarrativeSurfaceCompositionBoundActionInputInternalV1,
  ): () => boolean => {
    const generation = current;
    if (disposed || binding === null || generation === null || !generation.active) {
      return inactiveNarrativeSurfaceCompositionBoundActionInternalV1;
    }
    let actionId: InputActionIdV1;
    let choiceId: string | undefined;
    let payload: unknown;
    try {
      const keys = Reflect.ownKeys(request);
      if (
        keys.length < 1 || keys.length > 3 || keys[0] !== "actionId" ||
        keys.some((key) =>
          typeof key !== "string" ||
          (key !== "actionId" && key !== "choiceId" && key !== "payload")
        )
      ) return inactiveNarrativeSurfaceCompositionBoundActionInternalV1;
      const actionDescriptor = Reflect.getOwnPropertyDescriptor(request, "actionId");
      const choiceDescriptor = Reflect.getOwnPropertyDescriptor(request, "choiceId");
      const payloadDescriptor = Reflect.getOwnPropertyDescriptor(request, "payload");
      if (
        actionDescriptor === undefined || !("value" in actionDescriptor) ||
        typeof actionDescriptor.value !== "string" ||
        (choiceDescriptor !== undefined &&
          (!("value" in choiceDescriptor) || typeof choiceDescriptor.value !== "string")) ||
        (payloadDescriptor !== undefined && !("value" in payloadDescriptor))
      ) return inactiveNarrativeSurfaceCompositionBoundActionInternalV1;
      actionId = actionDescriptor.value as InputActionIdV1;
      choiceId = choiceDescriptor?.value as string | undefined;
      payload = payloadDescriptor?.value;
    } catch {
      return inactiveNarrativeSurfaceCompositionBoundActionInternalV1;
    }
    const hostPhysicalRegistrationToken = generation.hostPhysicalRegistrationToken;
    if (hostPhysicalRegistrationToken === null) {
      return inactiveNarrativeSurfaceCompositionBoundActionInternalV1;
    }
    const capturedPending = generation.selection?.pending ?? null;
    if (capturedPending === null) {
      return inactiveNarrativeSurfaceCompositionBoundActionInternalV1;
    }
    const capturedOccurrenceId = capturedPending.occurrenceId;
    if (
      capturedPending.kind === "choice" && choiceId === undefined &&
      actionId === systemInputActionIdsV1.confirm
    ) {
      const availability = generation.selection?.choiceAvailability ?? null;
      choiceId = capturedPending.options.find((option) =>
        availability?.find((row) => row.choiceId === option.choiceId)?.status === "enabled"
      )?.choiceId;
    }
    const capturedChoiceId = choiceId;
    const capturedPayload = payload;
    const action = Object.freeze((
      invocation?: NarrativeSurfaceCompositionBoundActionInvocationInternalV1,
    ): boolean => {
      let invokedChoiceId = capturedChoiceId;
      let invokedPayload = capturedPayload;
      if (invocation !== undefined) {
        try {
          const capturedInvocation = captureFrozenPlainExactRecordInternalV1(
            invocation,
            Reflect.ownKeys(invocation).filter((key): key is string =>
              key === "choiceId" || key === "payload"
            ),
          );
          if (capturedInvocation === null) return false;
          if (
            Object.hasOwn(capturedInvocation, "choiceId") &&
            typeof capturedInvocation.choiceId !== "string"
          ) return false;
          invokedChoiceId = capturedInvocation.choiceId as string | undefined ?? invokedChoiceId;
          invokedPayload = Object.hasOwn(capturedInvocation, "payload")
            ? capturedInvocation.payload
            : invokedPayload;
        } catch {
          return false;
        }
      }
      if (
        disposed || current !== generation || !generation.active ||
        generation.hostPhysicalRegistrationToken !== hostPhysicalRegistrationToken
      ) return false;
      const physicalIngress = generation.physicalIngress;
      if (
        physicalIngress === null || generation.physicalIngress !== physicalIngress ||
        !physicalIngress.isCurrentInternalV1()
      ) return false;
      const selection = generation.selection;
      if (
        selection?.pending === null || selection?.pending === undefined ||
        selection.pending.occurrenceId !== capturedOccurrenceId
      ) return false;
      let currentInput: ReturnType<
        ManagedSurfaceStableActionRouteAuthorityInternalV1[
          "captureCurrentStableInputInternalV1"
        ]
      >;
      try {
        currentInput = generation.stableActionAuthority.captureCurrentStableInputInternalV1();
      } catch {
        return false;
      }
      if (
        currentInput.kind !== "captured" || currentInput.directTarget === null ||
        currentInput.sourceRevision === null || currentInput.targetProof === null ||
        !generation.stableActionAuthority.isCurrentDirectTargetInternalV1(
          currentInput.targetProof,
        )
      ) return false;
      const target = currentInput.directTarget;
      const frame = generation.bridge.inspectAdmittedTargetFrameInternalV1(target);
      if (frame === null || frame.semanticOccurrenceId !== capturedOccurrenceId) return false;
      const ready = generation.stableActionAuthority
        .captureReadyActiveStableTargetInternalV1(target);
      if (ready.kind !== "captured") return false;
      const completionFence = captureCompletionFence(generation, null);
      if (
        completionFence === null || completionFence.directTarget !== target ||
        completionFence.sourceRevision !== currentInput.sourceRevision ||
        completionFence.frame !== frame
      ) return false;
      if (selection.pending.kind === "choice") {
        if (
          invokedChoiceId === undefined ||
          selection.choiceAvailability?.find((row) => row.choiceId === invokedChoiceId)
              ?.status !== "enabled"
        ) return false;
      }
      let admission: NarrativeStablePhysicalActionAdmissionInternalV1;
      try {
        admission = createNarrativeStablePhysicalActionAdmissionInternalV1(Object.freeze({
          bridge: generation.bridge,
          inputRouter: physicalIngress.inputRouter,
          isGestureCurrent: physicalIngress.isGestureCurrent,
        }));
      } catch {
        return false;
      }
      if (generation.physicalAdmission !== admission) {
        const predecessor = generation.physicalAdmission;
        generation.physicalAdmission = admission;
        noThrow(() => predecessor?.disposeInternalV1());
      }
      let attempt: unknown = null;
      let attemptRequired = true;
      try {
        if (
          selection.pending.kind === "say" &&
          (actionId === systemInputActionIdsV1.confirm ||
            actionId === systemInputActionIdsV1.narrativeAdvance)
        ) {
          attempt = admission.issueSayActivationAttemptInternalV1(
            createNarrativeStableDialoguePlayerControllerInternalV1(
              Object.freeze({ bridge: generation.bridge, target, frame }),
            ),
          );
        } else if (
          selection.pending.kind === "choice" &&
          (actionId === systemInputActionIdsV1.confirm || String(actionId) === "narrative.choose")
        ) {
          attempt = admission.issueChoiceAttemptInternalV1(invokedChoiceId);
        } else if (
          selection.pending.kind === "pause" &&
          (actionId === systemInputActionIdsV1.confirm || String(actionId) === "narrative.resume")
        ) {
          attempt = admission.issuePauseResumeAttemptInternalV1();
        } else if (
          selection.pending.kind === "custom" && String(actionId) === "narrative.custom"
        ) {
          attempt = admission.issueCustomAttemptInternalV1(invokedPayload);
        } else if (actionId === playerInputActionIdsV1.toggleAuto) {
          attempt = admission.issuePlaybackModeToggleAttemptInternalV1("auto");
        } else if (actionId === playerInputActionIdsV1.toggleSkip) {
          attempt = admission.issuePlaybackModeToggleAttemptInternalV1("skip");
        } else if (actionId === playerInputActionIdsV1.replayVoice) {
          attempt = admission.issueVoiceReplayAttemptInternalV1();
        } else if (actionId === playerInputActionIdsV1.toggleHistory) {
          attempt = admission.issueHistoryOpenAttemptInternalV1();
          attemptRequired = false;
        } else {
          return false;
        }
        if (attemptRequired && attempt === null) return false;
        const authenticatedActionId = actionId === systemInputActionIdsV1.confirm
          ? selection.pending.kind === "choice"
            ? "narrative.choose"
            : selection.pending.kind === "pause"
            ? "narrative.resume"
            : selection.pending.kind === "say"
            ? String(systemInputActionIdsV1.narrativeAdvance)
            : String(actionId)
          : String(actionId);
        const envelope = admission.createEnvelopeInternalV1(Object.freeze({
          actionId: parseManagedSurfaceActionIdV1(authenticatedActionId),
          gestureId: generation.runtime.gestureLease.begin(),
        }));
        if (
          current !== generation || generation.physicalIngress !== physicalIngress ||
          !physicalIngress.isCurrentInternalV1()
        ) return false;
        if (generation.authenticatedRouteInProgress) return false;
        generation.authenticatedRouteInProgress = true;
        let routed: ReturnType<NarrativeStablePhysicalActionAdmissionInternalV1["routeInternalV1"]>;
        try {
          routed = admission.routeInternalV1(envelope, attempt);
        } finally {
          generation.authenticatedRouteInProgress = false;
        }
        const consumerResult = routed.consumerResult;
        if (consumerResult === null) return false;
        if (consumerResult.kind === "dispatched") {
          trackCurrentCompletion(
            generation,
            completionFence,
            consumerResult.completion,
            true,
          );
          return true;
        }
        if (
          actionId === playerInputActionIdsV1.toggleHistory &&
          consumerResult.kind === "requested"
        ) {
          return generation.session.getHistoryChildLifecycleInternalV1()
            .redeemHistoryOpenIntentInternalV1(consumerResult.intent).kind === "preparing";
        }
        return consumerResult.kind !== "stale" && consumerResult.kind !== "faulted" &&
          consumerResult.kind !== "unmapped";
      } catch {
        return false;
      }
    });
    return action;
  };

  const captureHistoryClose = (): () => boolean => {
    const generation = current;
    if (disposed || generation === null || !generation.active) {
      return inactiveNarrativeSurfaceCompositionBoundActionInternalV1;
    }
    const hostPhysicalRegistrationToken = generation.hostPhysicalRegistrationToken;
    if (hostPhysicalRegistrationToken === null) {
      return inactiveNarrativeSurfaceCompositionBoundActionInternalV1;
    }
    let capturedAdmission: NarrativeStablePhysicalActionAdmissionInternalV1 | null = null;
    return Object.freeze((): boolean => {
      const physicalIngress = generation.physicalIngress;
      if (
        current !== generation || physicalIngress === null ||
        generation.hostPhysicalRegistrationToken !== hostPhysicalRegistrationToken ||
        generation.physicalIngress !== physicalIngress ||
        !physicalIngress.isCurrentInternalV1()
      ) return false;
      try {
        const admission = capturedAdmission ??
          createNarrativeStablePhysicalActionAdmissionInternalV1(Object.freeze({
            bridge: generation.bridge,
            inputRouter: physicalIngress.inputRouter,
            isGestureCurrent: physicalIngress.isGestureCurrent,
          }));
        if (generation.physicalAdmission !== admission) {
          const predecessor = generation.physicalAdmission;
          generation.physicalAdmission = admission;
          noThrow(() => predecessor?.disposeInternalV1());
        }
        const envelope = admission.createEnvelopeInternalV1(Object.freeze({
          actionId: parseManagedSurfaceActionIdV1(playerInputActionIdsV1.toggleHistory),
          gestureId: generation.runtime.gestureLease.begin(),
        }));
        if (
          current !== generation || generation.physicalIngress !== physicalIngress ||
          !physicalIngress.isCurrentInternalV1() || generation.authenticatedRouteInProgress
        ) return false;
        generation.authenticatedRouteInProgress = true;
        let result: ReturnType<NarrativeStablePhysicalActionAdmissionInternalV1["routeInternalV1"]>;
        try {
          result = admission.routeInternalV1(envelope, null);
        } finally {
          generation.authenticatedRouteInProgress = false;
        }
        const kind = result.consumerResult?.kind;
        if (kind === "closed" || kind === "dismissed") {
          capturedAdmission = admission;
          if (generation.physicalAdmission === admission) {
            generation.physicalAdmission = null;
          }
          noThrow(() => admission.disposeInternalV1());
          return true;
        }
        if (kind === "locked") {
          capturedAdmission = admission;
          return true;
        }
        return false;
      } catch {
        return false;
      }
    });
  };

  const registerHostPhysicalIngress = (
    registrationInput: Readonly<{
      readonly session: NarrativeStableSessionInternalV1;
      readonly portalContainer: HTMLDivElement;
      readonly inputRouter: InputRouterV1;
    }>,
  ): () => void => {
    const generation = current;
    if (
      disposed || binding === null || generation === null || !generation.active ||
      registrationInput.session !== generation.session ||
      generation.releaseHostPhysicalRegistration !== null
    ) throw new TypeError("ui.narrative_surface_host_registration_invalid");
    const attachPhysicalIngress = Object.freeze(
      (context: NarrativeSurfaceHostPhysicalIngressContextInternalV1): () => void => {
        if (
          disposed || current !== generation || !generation.active ||
          generation.physicalIngress !== null || !context.isCurrentInternalV1() ||
          context.inputRouter !== registrationInput.inputRouter
        ) throw new TypeError("ui.narrative_surface_host_registration_invalid");
        let attached = true;
        let unregister: unknown;
        try {
          unregister = context.inputRouter.register(Object.freeze({
            context: "narrative" as const,
            handle: (event) => {
              if (
                !attached || current !== generation || !generation.active ||
                generation.authenticatedRouteInProgress || event.kind !== "action" ||
                generation.physicalIngress !== context || !context.isCurrentInternalV1()
              ) return inputIgnoredV1;
              if (
                event.actionId === playerInputActionIdsV1.toggleHistory &&
                captureHistoryClose()()
              ) return inputHandledV1;
              return captureBoundHostAction(Object.freeze({ actionId: event.actionId }))()
                ? inputHandledV1
                : inputIgnoredV1;
            },
          }));
          if (!isCallableWithoutThenInternalV1(unregister)) {
            if (typeof unregister === "function") noThrow(unregister as () => void);
            throw new TypeError("ui.narrative_surface_host_registration_invalid");
          }
        } catch (error) {
          attached = false;
          throw error;
        }
        generation.physicalIngress = context;
        generation.unregisterPhysicalInput = unregister as () => void;
        return Object.freeze((): void => {
          if (!attached) return;
          attached = false;
          if (generation.physicalIngress !== context) return;
          generation.physicalIngress = null;
          const currentUnregister = generation.unregisterPhysicalInput;
          generation.unregisterPhysicalInput = null;
          const admission = generation.physicalAdmission;
          generation.physicalAdmission = null;
          generation.authenticatedRouteInProgress = false;
          noThrow(() => currentUnregister?.());
          noThrow(() => admission?.disposeInternalV1());
        });
      },
    );
    const release: unknown = registerNarrativeSurfaceHostPhysicalIngressInternalV1(Object.freeze({
      session: generation.session,
      portalContainer: registrationInput.portalContainer,
      inputRouter: registrationInput.inputRouter,
      attachInternalV1: attachPhysicalIngress,
    }));
    if (!isCallableWithoutThenInternalV1(release)) {
      if (typeof release === "function") noThrow(release as () => void);
      throw new TypeError("ui.narrative_surface_host_registration_invalid");
    }
    const exactRelease = release as () => void;
    const registrationToken = Object.freeze({});
    generation.releaseHostPhysicalRegistration = exactRelease;
    generation.hostPhysicalRegistrationToken = registrationToken;
    let active = true;
    return Object.freeze((): void => {
      if (!active) return;
      active = false;
      if (generation.releaseHostPhysicalRegistration !== exactRelease) return;
      generation.releaseHostPhysicalRegistration = null;
      if (generation.hostPhysicalRegistrationToken === registrationToken) {
        generation.hostPhysicalRegistrationToken = null;
      }
      noThrow(exactRelease);
    });
  };

  const failComposition = (error: unknown): void => {
    // Fence Narrative before either failure delivery or the composer-owned
    // terminal cascade can reenter this runtime.
    noThrow(() => adapter.disposeInternalV1());
    noThrow(() => input.sealCompositionOnFailure?.(error));
    reportFailureNoThrow(error);
  };

  const rendererContext: NarrativeSurfaceCompositionRendererContextInternalV1 = Object.freeze({
    captureActionInternalV1: captureBoundHostAction,
    captureHistoryCloseInternalV1: captureHistoryClose,
    getSelectionInternalV1: () => current?.selection ?? null,
    subscribeInternalV1: (listener: () => void) => {
      listeners.add(listener);
      return Object.freeze((): void => void listeners.delete(listener));
    },
  });

  const adapter: NarrativeSurfaceCompositionRuntimeInternalV1 = Object.freeze({
    detachRuntimeInternalV1(): void {
      const predecessor = current ?? prepared;
      current = null;
      prepared = null;
      if (predecessor !== null) retireGeneration(predecessor);
    },

    prepareRuntimeAttachmentInternalV1(
      runtime: ManagedSurfaceCoordinatorRuntimeV1,
      activationGate: ManagedSurfaceFamilyActivationGateInternalV1,
    ): void {
      if (disposed || current !== null || prepared !== null || activationGate.isOpen()) {
        throw new TypeError("ui.narrative_surface_composition_prepare_invalid");
      }
      const bundle = input.resolveKernelBundleInternalV1(runtime);
      if (bundle.applicationEpoch !== runtime.applicationEpoch) {
        throw new TypeError("ui.narrative_surface_composition_kernel_invalid");
      }
      let generation: NarrativeSurfaceCompositionGenerationInternalV1 | null = null;
      const candidatePreflight = Object.freeze({
        preflightCandidateInternalV1(
          pending: PendingInteractionV1,
          rendererKey: string,
        ): NarrativeStableCandidatePreflightResultInternalV1 {
          const candidateSelection = generation?.reconcilingSelection ?? null;
          if (binding === null || candidateSelection === null) {
            return Object.freeze({
              kind: "rejected" as const,
              code: "narrative.renderer_missing" as const,
            });
          }
          if (publicBinding !== null) {
            return createNarrativeSurfacePublicCandidateInternalV1(
              publicBinding,
              pending,
              candidateSelection,
              input.environment,
              Object.freeze({
                getSelectionInternalV1: () =>
                  generation?.reconcilingSelection ?? generation?.selection ?? null,
                subscribeInternalV1: (listener: () => void) => {
                  listeners.add(listener);
                  return Object.freeze((): void => void listeners.delete(listener));
                },
                reportFailureInternalV1: failComposition,
              }),
            );
          }
          return Reflect.apply(binding.preflightCandidate, binding.receiver, [
            pending,
            rendererKey,
            candidateSelection,
            input.environment,
          ]);
        },
      });
      const bridge = createNarrativeStablePublisherBridgeInternalV1({
        publisherLeaseRegistry: bundle.publisherLeaseRegistry,
        admissionAuthority: bundle.admissionAuthority,
        compositeRuntimeKernel: bundle.compositeRuntimeKernel,
        candidatePreflight,
        exactAggregateDefinitionSidecars: family.stableDefinitionSidecars,
        exactAggregateSlotDescriptors: bundle.compositeRuntimeKernel.getStateInternalV1()
          .transientState.resolvedSlotDescriptors,
        barrierStageClaimant: input.stageClaimant,
      });
      const barrierRecoveryGate = Object.freeze({
        isOpen: (): boolean => generation?.barrierRecoveryGateOpen ?? false,
      });
      try {
        const stableActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
          bundle.compositeRuntimeKernel,
        );
        generation = {
          runtime,
          activationGate,
          bridge,
          session: createNarrativeStableSessionInternalV1({ bridge }),
          stableActionAuthority,
          selection: null,
          unsubscribePresentation: null,
          releaseHostPhysicalRegistration: null,
          hostPhysicalRegistrationToken: null,
          physicalIngress: null,
          unregisterPhysicalInput: null,
          physicalAdmission: null,
          authenticatedRouteInProgress: false,
          barrierController: null,
          releaseStageRetargetDelegate: null,
          unsubscribeBarrierSession: null,
          barrierRecoveryGate,
          barrierRecoveryGateOpen: false,
          barrierRecoveryState: "ineligible",
          barrierRecoveryOccurrenceId: null,
          barrierRecoveryPendingBytes: null,
          reportedReplayRecoveryResult: null,
          lastStageDriver: null,
          lastStageRetarget: null,
          reconcilingSelection: null,
          active: true,
          armed: false,
          dirty: false,
        };
        if (binding !== null) {
          const initialSelection = readSelection();
          if (initialSelection === null) {
            throw new TypeError("ui.narrative_surface_selection_invalid");
          }
          generation.reconcilingSelection = initialSelection;
          try {
            const result = bridge.reconcilePendingInternalV1(initialSelection.pending);
            if (!bridgeResultAcceptedInternalV1(result)) {
              throw new TypeError("ui.narrative_surface_reconcile_faulted");
            }
            generation.selection = initialSelection;
            initializeBarrierRecoveryEligibility(generation, initialSelection);
          } finally {
            generation.reconcilingSelection = null;
          }
        }
        if (stageReconciler !== null && stageDriver !== null) {
          installBarrierController(generation, stageReconciler, stageDriver);
        }
        prepared = generation;
      } catch (error) {
        if (generation !== null) detachBarrierController(generation);
        noThrow(() => bridge.disposeInternalV1());
        throw error;
      } finally {
        if (generation !== null) generation.reconcilingSelection = null;
      }
    },

    activateRuntimeAttachmentInternalV1(): () => void {
      const generation = prepared;
      if (disposed || generation === null || generation.armed) {
        throw new TypeError("ui.narrative_surface_composition_activate_invalid");
      }
      generation.armed = true;
      if (binding !== null) {
        let subscribing = true;
        let reentered = false;
        const listener = (): void => {
          if (!generation.active) return;
          if (subscribing) {
            reentered = true;
            return;
          }
          if (generation.reconcilingSelection !== null) {
            generation.dirty = true;
            return;
          }
          if (!generation.activationGate.isOpen()) {
            generation.dirty = true;
            return;
          }
          try {
            generation.dirty = false;
            reconcile(generation);
            if (generation.dirty) {
              throw new TypeError("ui.narrative_surface_reconcile_reentered");
            }
            notifyNoThrow();
          } catch (error) {
            failComposition(error);
          }
        };
        let unsubscribe: unknown;
        try {
          unsubscribe = input.presentation.subscribeInternalV1(listener);
        } finally {
          subscribing = false;
        }
        if (!isCallableWithoutThenInternalV1(unsubscribe) || reentered) {
          if (typeof unsubscribe === "function") noThrow(unsubscribe as () => void);
          throw new TypeError("ui.narrative_surface_composition_subscription_invalid");
        }
        generation.unsubscribePresentation = unsubscribe as () => void;
        // Candidate preflight may synchronously advance the upstream source
        // before this listener exists. Re-read once while the shared gate is
        // still closed so no stale prepared target can escape activation.
        reconcile(generation);
      }
      return Object.freeze((): void => {
        if (disposed || prepared !== generation || !generation.active) return;
        if (!generation.activationGate.isOpen()) return;
        if (generation.dirty) {
          generation.dirty = false;
          try {
            reconcile(generation);
            if (generation.dirty) {
              throw new TypeError("ui.narrative_surface_reconcile_reentered");
            }
          } catch (error) {
            failComposition(error);
            return;
          }
        }
        prepared = null;
        current = generation;
        notifyNoThrow();
      });
    },

    abortRuntimeAttachmentInternalV1(): void {
      const generation = prepared;
      prepared = null;
      if (generation !== null) retireGeneration(generation);
    },

    getCurrentSessionInternalV1(): NarrativeStableSessionInternalV1 | null {
      return current?.session ?? null;
    },

    getCurrentSelectionInternalV1(): NarrativeSurfaceSelectionInternalV1 | null {
      return current?.selection ?? null;
    },

    getStageClaimantInternalV1(): object {
      return input.stageClaimant;
    },

    isHostEnabledInternalV1(): boolean {
      return binding !== null;
    },

    isGestureCurrentInternalV1(gestureId: ManagedSurfaceGestureIdV1): boolean {
      const generation = current;
      return generation !== null && generation.active &&
        generation.runtime.gestureLease.isCurrent(gestureId);
    },

    registerHostPhysicalIngressInternalV1(
      hostInput: Readonly<{
        readonly session: NarrativeStableSessionInternalV1;
        readonly portalContainer: HTMLDivElement;
        readonly inputRouter: InputRouterV1;
      }>,
    ): () => void {
      return registerHostPhysicalIngress(hostInput);
    },

    provideHostActionContextInternalV1(children: ReactNode): ReactElement {
      return createElement(
        narrativeSurfaceCompositionBoundActionContextInternalV1.Provider,
        { value: rendererContext },
        children,
      );
    },

    subscribeInternalV1(listener: () => void): () => void {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    bindStageReconcilerInternalV1(
      reconciler: StageReconcilerV1,
      driver: SemanticStageCompositionDriverInternalV1,
    ): () => void {
      if (
        !disposed && pendingStageBindingRelease !== null &&
        stageReconciler === reconciler && stageDriver === driver &&
        driver.isCurrentInternalV1()
      ) {
        pendingStageBindingRelease = null;
        return createStageBindingRelease(reconciler, driver);
      }
      if (pendingStageBindingRelease !== null) {
        pendingStageBindingRelease = null;
        const boundGeneration = current ?? prepared;
        stageReconciler = null;
        stageDriver = null;
        if (boundGeneration !== null) detachBarrierController(boundGeneration);
      }
      if (
        disposed || stageReconciler !== null || stageDriver !== null ||
        !driver.isCurrentInternalV1()
      ) {
        throw new TypeError("ui.narrative_surface_stage_binding_invalid");
      }
      const generation = current ?? prepared;
      try {
        if (generation !== null) {
          installBarrierController(generation, reconciler, driver);
          if (
            generation === current && generation.barrierRecoveryState === "eligible" &&
            barrierRecoverySelectionIsEligible(generation, generation.selection)
          ) {
            synchronizeBarrierRecovery(generation, true);
          }
        }
      } catch (error) {
        if (generation !== null) detachBarrierController(generation);
        noThrow(() => driver.disposeInternalV1());
        failComposition(error);
        throw error;
      }
      stageReconciler = reconciler;
      stageDriver = driver;
      return createStageBindingRelease(reconciler, driver);
    },

    isCurrentRuntimeAttachmentInternalV1(runtime: ManagedSurfaceCoordinatorRuntimeV1): boolean {
      return !disposed && current?.runtime === runtime && runtime.isIngressOpen();
    },

    disposeInternalV1(): void {
      if (disposed) return;
      disposed = true;
      const generation = current ?? prepared;
      current = null;
      prepared = null;
      if (generation !== null) retireGeneration(generation);
      listeners.clear();
      const persistentStageDriver = stageDriver;
      pendingStageBindingRelease = null;
      stageReconciler = null;
      stageDriver = null;
      noThrow(() => persistentStageDriver?.disposeInternalV1());
    },
  });
  return adapter;
}
