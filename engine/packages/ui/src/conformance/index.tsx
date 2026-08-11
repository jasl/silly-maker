// SPDX-License-Identifier: MIT
import {
  parseNarrativeHistoryV1,
  parseNonNegativeSafeInteger,
  parsePendingInteractionV1,
  type DeepReadonly,
  type InteractionResolutionV1,
  type NarrativeHistoryV1,
  type NonNegativeSafeInteger,
  type PendingInteractionV1,
} from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import {
  createContext,
  createElement,
  Fragment,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactElement,
} from "react";

import {
  inputHandledV1,
  inputIgnoredV1,
  parseInputActionIdV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
  type InputActionIdV1,
  type InputEventV1,
  type InputRouterV1,
} from "../input/contracts.ts";
import { createManagedSurfaceReducerStateV1 } from "../managed-surfaces/managed-surface-reducer.ts";
import { createManagedSurfaceStableAdmissionAuthorityInternalV1 } from "../managed-surfaces/managed-surface-stable-admission.ts";
import { createManagedSurfaceStableCompositeRuntimeKernelInternalV1 } from "../managed-surfaces/managed-surface-stable-composite-state.ts";
import {
  claimManagedSurfaceStableActionRouteAuthorityInternalV1,
} from "../managed-surfaces/managed-surface-stable-composite-state.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceGestureIdV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "../managed-surfaces/managed-surface-stable-publisher-lease.ts";
import {
  createNarrativeManagedSurfaceFamilyContractInternalV1,
  createNarrativeStableDialoguePlayerControllerInternalV1,
  createNarrativeStablePhysicalActionAdmissionInternalV1,
  createNarrativeStablePublisherBridgeInternalV1,
  createNarrativeStableSessionInternalV1,
  type NarrativeStableCandidatePreflightInternalV1,
  type NarrativeStableDialogueRendererPropsInternalV1,
  type NarrativeStableHistoryRendererPropsInternalV1,
  type NarrativeStablePublisherBridgeInternalV1,
  type NarrativeStablePhysicalActionAdmissionInternalV1,
  type NarrativeStableRendererPropsInternalV1,
} from "../narrative/narrative-managed-surface-family.ts";
import {
  NarrativeSurfaceHostInternalV1,
  registerNarrativeSurfaceHostPhysicalIngressInternalV1,
  type NarrativeSurfaceHostPhysicalIngressContextInternalV1,
} from "../narrative/narrative-surface-host.tsx";
import type { PresentationClockV1 } from "../presentation-run/presentation-clock.ts";

export interface NarrativeConformanceSnapshotV1 {
  readonly revision: NonNegativeSafeInteger;
  readonly pending: DeepReadonly<PendingInteractionV1> | null;
  readonly history: DeepReadonly<NarrativeHistoryV1>;
}

export interface NarrativeConformanceResolutionRequestV1 {
  readonly expectedOccurrenceId: string;
  readonly resolution: DeepReadonly<InteractionResolutionV1>;
}

export interface CreateNarrativeConformanceRigInputV1 {
  readonly observeNarrative: () => NarrativeConformanceSnapshotV1;
  readonly subscribeNarrative: (listener: () => void) => () => void;
  readonly dispatchResolution: (
    request: NarrativeConformanceResolutionRequestV1,
  ) => Promise<unknown>;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly presentationClock: PresentationClockV1;
  readonly textResolver: (textId: string) => string;
  readonly voiceReplay: (() => boolean) | null;
  readonly reportFailure: (error: unknown) => void;
}

export type NarrativeConformanceRigCreationResultV1 =
  | Readonly<{
    readonly kind: "created";
    readonly rig: NarrativeConformanceRigV1;
  }>
  | Readonly<{
    readonly kind: "rejected";
    readonly code: "narrative.conformance_input_invalid";
  }>
  | Readonly<{
    readonly kind: "rejected";
    readonly code: "narrative.conformance_source_claimed";
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly code: "narrative.conformance_creation_faulted";
  }>;

export interface NarrativeConformanceHostPropsV1 {
  readonly inputRouter: InputRouterV1;
}

export interface NarrativeConformanceRigV1 {
  readonly Host: ComponentType<NarrativeConformanceHostPropsV1>;
  dispose(): void;
}

type CallableInternalV1 = (...args: never[]) => unknown;

interface CapturedConformanceInputInternalV1 {
  readonly receiver: CreateNarrativeConformanceRigInputV1;
  readonly observeNarrative: CreateNarrativeConformanceRigInputV1["observeNarrative"];
  readonly subscribeNarrative: CreateNarrativeConformanceRigInputV1["subscribeNarrative"];
  readonly dispatchResolution: CreateNarrativeConformanceRigInputV1["dispatchResolution"];
  readonly playerProfile: PlayerProfileStoreV1;
  readonly playerProfileCurrent: PlayerProfileStoreV1["current"];
  readonly playerProfileSubscribe: PlayerProfileStoreV1["subscribe"];
  readonly playerProfileMarkSeen: PlayerProfileStoreV1["markSeen"];
  readonly presentationClock: PresentationClockV1;
  readonly presentationClockNow: PresentationClockV1["now"];
  readonly presentationClockRequestTick: PresentationClockV1["requestTick"];
  readonly textResolver: CreateNarrativeConformanceRigInputV1["textResolver"];
  readonly voiceReplay: CreateNarrativeConformanceRigInputV1["voiceReplay"];
  readonly reportFailure: CreateNarrativeConformanceRigInputV1["reportFailure"];
}

interface CapturedConformanceSnapshotInternalV1 {
  readonly source: NarrativeConformanceSnapshotV1;
  readonly revision: NonNegativeSafeInteger;
  readonly pending: PendingInteractionV1 | null;
  readonly sourceHistory: DeepReadonly<NarrativeHistoryV1>;
  readonly history: NarrativeHistoryV1;
}

interface NarrativeConformanceSourceClaimInternalV1 {
  readonly token: object;
}

interface NarrativeConformanceSourceClaimBucketInternalV1 {
  readonly subscriptions: WeakMap<
    CreateNarrativeConformanceRigInputV1["subscribeNarrative"],
    object
  >;
  activeCount: number;
}

const conformanceInputKeysInternalV1 = Object.freeze(
  [
    "observeNarrative",
    "subscribeNarrative",
    "dispatchResolution",
    "playerProfile",
    "presentationClock",
    "textResolver",
    "voiceReplay",
    "reportFailure",
  ] as const,
);

const narrativeConformanceInputInvalidInternalV1 = Object.freeze({
  kind: "rejected" as const,
  code: "narrative.conformance_input_invalid" as const,
});
const narrativeConformanceSourceClaimedInternalV1 = Object.freeze({
  kind: "rejected" as const,
  code: "narrative.conformance_source_claimed" as const,
});
const narrativeConformanceCreationFaultedInternalV1 = Object.freeze({
  kind: "faulted" as const,
  code: "narrative.conformance_creation_faulted" as const,
});
const narrativeConformanceNoopInternalV1 = Object.freeze((): void => {});
const narrativeConformanceGestureCurrentInternalV1 = Object.freeze((): boolean => true);
const narrativeConformanceVisualConfigInternalV1 = Object.freeze({});
const narrativeConformanceApplicationEpochInternalV1 = parseNonNegativeSafeInteger(1);
const narrativeConformanceCallablePrototypeDepthLimitInternalV1 = 64;

const narrativeConformanceSourceClaimsInternalV1 = new WeakMap<
  CreateNarrativeConformanceRigInputV1["observeNarrative"],
  NarrativeConformanceSourceClaimBucketInternalV1
>();

function isCallableWithoutThenInternalV1(value: unknown): value is CallableInternalV1 {
  if (typeof value !== "function") return false;
  try {
    const visited = new Set<object>();
    let current: object | null = value;
    let remainingDepth = narrativeConformanceCallablePrototypeDepthLimitInternalV1;
    while (current !== null) {
      if (remainingDepth === 0) return false;
      remainingDepth -= 1;
      if (visited.has(current)) return false;
      visited.add(current);
      if (Reflect.getOwnPropertyDescriptor(current, "then") !== undefined) return false;
      current = Reflect.getPrototypeOf(current);
    }
    return Reflect.get(value, "then") === undefined;
  } catch {
    return false;
  }
}

function isExactInputRouterInternalV1(value: unknown): value is InputRouterV1 {
  try {
    if (
      typeof value !== "object" || value === null || Array.isArray(value) ||
      Reflect.getPrototypeOf(value) !== Object.prototype || !Object.isFrozen(value)
    ) return false;
    const expectedKeys = ["register", "route", "clearTransientInput"] as const;
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== expectedKeys.length ||
      ownKeys.some((key) => typeof key !== "string" || !expectedKeys.includes(key as never))
    ) return false;
    for (const key of expectedKeys) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined || !("value" in descriptor) ||
        descriptor.enumerable !== true || descriptor.configurable !== false ||
        descriptor.writable !== false || Reflect.get(value, key) !== descriptor.value ||
        !isCallableWithoutThenInternalV1(descriptor.value)
      ) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function captureOwnCallableInternalV1<T extends CallableInternalV1>(
  receiver: unknown,
  key: PropertyKey,
): T | null {
  if ((typeof receiver !== "object" && typeof receiver !== "function") || receiver === null) {
    return null;
  }
  try {
    const descriptor = Reflect.getOwnPropertyDescriptor(receiver, key);
    return descriptor !== undefined && "value" in descriptor &&
        descriptor.enumerable === true && descriptor.configurable === false &&
        descriptor.writable === false && Reflect.get(receiver, key) === descriptor.value &&
        isCallableWithoutThenInternalV1(descriptor.value)
      ? descriptor.value as T
      : null;
  } catch {
    return null;
  }
}

function captureConformanceInputInternalV1(
  input: unknown,
): CapturedConformanceInputInternalV1 | null {
  try {
    if (
      typeof input !== "object" || input === null || Array.isArray(input) ||
      Reflect.getPrototypeOf(input) !== Object.prototype || !Object.isFrozen(input)
    ) return null;
    const ownKeys = Reflect.ownKeys(input);
    if (ownKeys.length !== conformanceInputKeysInternalV1.length) return null;
    const values: Record<(typeof conformanceInputKeysInternalV1)[number], unknown> = Object.create(
      null,
    );
    for (const key of conformanceInputKeysInternalV1) {
      const descriptor = Reflect.getOwnPropertyDescriptor(input, key);
      if (
        descriptor === undefined || !("value" in descriptor) ||
        descriptor.enumerable !== true || descriptor.configurable !== false ||
        descriptor.writable !== false || Reflect.get(input, key) !== descriptor.value
      ) return null;
      values[key] = descriptor.value;
    }
    for (const key of ownKeys) {
      if (typeof key !== "string" || !Object.hasOwn(values, key)) return null;
    }
    if (
      !isCallableWithoutThenInternalV1(values.observeNarrative) ||
      !isCallableWithoutThenInternalV1(values.subscribeNarrative) ||
      !isCallableWithoutThenInternalV1(values.dispatchResolution) ||
      !isCallableWithoutThenInternalV1(values.textResolver) ||
      (values.voiceReplay !== null && !isCallableWithoutThenInternalV1(values.voiceReplay)) ||
      !isCallableWithoutThenInternalV1(values.reportFailure)
    ) return null;
    const playerProfileCurrent = captureOwnCallableInternalV1<PlayerProfileStoreV1["current"]>(
      values.playerProfile,
      "current",
    );
    const playerProfileSubscribe = captureOwnCallableInternalV1<
      PlayerProfileStoreV1["subscribe"]
    >(values.playerProfile, "subscribe");
    const playerProfileMarkSeen = captureOwnCallableInternalV1<
      PlayerProfileStoreV1["markSeen"]
    >(values.playerProfile, "markSeen");
    const presentationClockNow = captureOwnCallableInternalV1<PresentationClockV1["now"]>(
      values.presentationClock,
      "now",
    );
    const presentationClockRequestTick = captureOwnCallableInternalV1<
      PresentationClockV1["requestTick"]
    >(values.presentationClock, "requestTick");
    if (
      playerProfileCurrent === null || playerProfileSubscribe === null ||
      playerProfileMarkSeen === null || presentationClockNow === null ||
      presentationClockRequestTick === null
    ) return null;
    return Object.freeze({
      receiver: input as CreateNarrativeConformanceRigInputV1,
      observeNarrative: values.observeNarrative,
      subscribeNarrative: values.subscribeNarrative,
      dispatchResolution: values.dispatchResolution,
      playerProfile: values.playerProfile as PlayerProfileStoreV1,
      playerProfileCurrent,
      playerProfileSubscribe,
      playerProfileMarkSeen,
      presentationClock: values.presentationClock as PresentationClockV1,
      presentationClockNow,
      presentationClockRequestTick,
      textResolver: values.textResolver,
      voiceReplay: values.voiceReplay,
      reportFailure: values.reportFailure,
    }) as CapturedConformanceInputInternalV1;
  } catch {
    return null;
  }
}

function claimConformanceSourceInternalV1(
  input: CapturedConformanceInputInternalV1,
): NarrativeConformanceSourceClaimInternalV1 | null {
  let bucket = narrativeConformanceSourceClaimsInternalV1.get(input.observeNarrative);
  if (bucket?.subscriptions.has(input.subscribeNarrative) === true) return null;
  if (bucket === undefined) {
    bucket = {
      subscriptions: new WeakMap(),
      activeCount: 0,
    };
    narrativeConformanceSourceClaimsInternalV1.set(input.observeNarrative, bucket);
  }
  const token = Object.freeze({});
  bucket.subscriptions.set(input.subscribeNarrative, token);
  bucket.activeCount += 1;
  return Object.freeze({ token });
}

function releaseConformanceSourceInternalV1(
  input: CapturedConformanceInputInternalV1,
  claim: NarrativeConformanceSourceClaimInternalV1,
): void {
  const bucket = narrativeConformanceSourceClaimsInternalV1.get(input.observeNarrative);
  if (bucket?.subscriptions.get(input.subscribeNarrative) === claim.token) {
    bucket.subscriptions.delete(input.subscribeNarrative);
    bucket.activeCount -= 1;
    if (bucket.activeCount === 0) {
      narrativeConformanceSourceClaimsInternalV1.delete(input.observeNarrative);
    }
  }
}

function captureConformanceSnapshotInternalV1(
  value: unknown,
): CapturedConformanceSnapshotInternalV1 | null {
  try {
    if (
      typeof value !== "object" || value === null || Array.isArray(value) ||
      Reflect.getPrototypeOf(value) !== Object.prototype || !Object.isFrozen(value)
    ) return null;
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== 3 || !keys.includes("revision") || !keys.includes("pending") ||
      !keys.includes("history")
    ) return null;
    const revisionDescriptor = Reflect.getOwnPropertyDescriptor(value, "revision");
    const pendingDescriptor = Reflect.getOwnPropertyDescriptor(value, "pending");
    const historyDescriptor = Reflect.getOwnPropertyDescriptor(value, "history");
    if (
      revisionDescriptor === undefined || !("value" in revisionDescriptor) ||
      pendingDescriptor === undefined || !("value" in pendingDescriptor) ||
      historyDescriptor === undefined || !("value" in historyDescriptor) ||
      revisionDescriptor.enumerable !== true || revisionDescriptor.configurable !== false ||
      revisionDescriptor.writable !== false ||
      pendingDescriptor.enumerable !== true || pendingDescriptor.configurable !== false ||
      pendingDescriptor.writable !== false ||
      historyDescriptor.enumerable !== true || historyDescriptor.configurable !== false ||
      historyDescriptor.writable !== false ||
      Reflect.get(value, "revision") !== revisionDescriptor.value ||
      Reflect.get(value, "pending") !== pendingDescriptor.value ||
      Reflect.get(value, "history") !== historyDescriptor.value
    ) return null;
    const revision = parseNonNegativeSafeInteger(revisionDescriptor.value);
    const pending = pendingDescriptor.value === null
      ? null
      : parsePendingInteractionV1(pendingDescriptor.value);
    const history = parseNarrativeHistoryV1(historyDescriptor.value);
    return Object.freeze({
      source: value as NarrativeConformanceSnapshotV1,
      revision,
      pending,
      sourceHistory: historyDescriptor.value as DeepReadonly<NarrativeHistoryV1>,
      history,
    });
  } catch {
    return null;
  }
}

interface NarrativeConformanceActionRequestInternalV1 {
  readonly actionId: InputActionIdV1;
  readonly choiceId: string | null;
  readonly payload: unknown;
}

type NarrativeConformanceActionDispatcherInternalV1 = (
  request: NarrativeConformanceActionRequestInternalV1,
) => boolean;

const narrativeConformanceChooseActionIdInternalV1 = parseInputActionIdV1("narrative.choose");
const narrativeConformanceResumeActionIdInternalV1 = parseInputActionIdV1("narrative.resume");
const narrativeConformanceCustomActionIdInternalV1 = parseInputActionIdV1("narrative.custom");

const NarrativeConformanceActionContextInternalV1 = createContext<
  NarrativeConformanceActionDispatcherInternalV1 | null
>(null);

function dispatchConformanceActionInternalV1(
  dispatcher: NarrativeConformanceActionDispatcherInternalV1 | null,
  actionId: InputActionIdV1,
  choiceId: string | null = null,
  payload: unknown = null,
): void {
  if (dispatcher === null) return;
  try {
    dispatcher(Object.freeze({ actionId, choiceId, payload }));
  } catch {
    // The private physical admission owns fail-closed action classification.
  }
}

function parseConformanceCustomPayloadInternalV1(
  text: string,
): Readonly<Record<string, unknown>> | null {
  try {
    const payload: unknown = JSON.parse(text);
    return typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? payload as Readonly<Record<string, unknown>>
      : null;
  } catch {
    return null;
  }
}

function NarrativeConformanceDialogueInternalV1(
  props: NarrativeStableDialogueRendererPropsInternalV1,
): ReactElement {
  const dispatchAction = useContext(NarrativeConformanceActionContextInternalV1);
  const pending = props.pending;
  const playerProfile = props.playerProfile;
  const textResolver = props.textResolver;
  const resolvedChoice = useMemo(() => {
    if (pending.kind !== "choice") return null;
    return Object.freeze({
      playerProfile,
      prompt: textResolver(pending.promptTextId),
      options: Object.freeze(
        pending.options.map((option) => textResolver(option.textId)),
      ),
    });
  }, [pending, playerProfile, textResolver]);
  const playerView = props.playerView;
  const text = props.pending.kind === "say" && playerView.kind === "say"
    ? playerView.resolvedText.slice(0, playerView.revealedCharacters)
    : props.pending.kind === "choice"
    ? resolvedChoice?.prompt ?? props.pending.promptTextId
    : props.pending.kind;
  const primaryActions: readonly ReactElement[] = props.pending.kind === "say"
    ? [createElement(
      "button",
      {
        key: "say",
        type: "button",
        "data-narrative-conformance-confirm": true,
        onClick: () =>
          dispatchConformanceActionInternalV1(
            dispatchAction,
            systemInputActionIdsV1.narrativeAdvance,
          ),
      },
      "Continue",
    )]
    : props.pending.kind === "choice"
    ? props.pending.options.map((option, index) =>
      createElement(
        "button",
        {
          key: option.choiceId,
          type: "button",
          "data-narrative-conformance-choice": option.choiceId,
          onClick: () =>
            dispatchConformanceActionInternalV1(
              dispatchAction,
              narrativeConformanceChooseActionIdInternalV1,
              option.choiceId,
            ),
        },
        resolvedChoice?.options[index] ?? option.textId,
      )
    )
    : props.pending.kind === "pause" && props.pending.skippable
    ? [createElement(
      "button",
      {
        key: "pause",
        type: "button",
        "data-narrative-conformance-resume": true,
        onClick: () =>
          dispatchConformanceActionInternalV1(
            dispatchAction,
            narrativeConformanceResumeActionIdInternalV1,
          ),
      },
      "Resume",
    )]
    : props.pending.kind === "custom"
    ? [createElement(
      "form",
      {
        key: "custom",
        "data-narrative-conformance-custom": props.pending.surfaceId,
        onSubmit: (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const field = event.currentTarget.elements.namedItem("payload");
          if (!(field instanceof HTMLTextAreaElement)) return;
          const payload = parseConformanceCustomPayloadInternalV1(field.value);
          if (payload === null) return;
          dispatchConformanceActionInternalV1(
            dispatchAction,
            narrativeConformanceCustomActionIdInternalV1,
            null,
            payload,
          );
        },
      },
      createElement(
        "pre",
        { "data-narrative-conformance-custom-params": true },
        JSON.stringify(props.pending.params),
      ),
      createElement("textarea", {
        name: "payload",
        "aria-label": "Custom resolution payload",
        "data-narrative-conformance-custom-payload": true,
        defaultValue: "{}",
      }),
      createElement("button", { type: "submit" }, "Submit"),
    )]
    : [];
  return createElement(
    "section",
    {
      "data-narrative-conformance-surface": "dialogue",
      "data-lab-narrative": props.pending.kind,
    },
    createElement("p", { "data-narrative-conformance-text": true }, text),
    ...primaryActions,
    createElement(
      "button",
      {
        type: "button",
        "data-narrative-conformance-auto": true,
        onClick: () =>
          dispatchConformanceActionInternalV1(
            dispatchAction,
            playerInputActionIdsV1.toggleAuto,
          ),
      },
      "Auto",
    ),
    createElement(
      "button",
      {
        type: "button",
        "data-narrative-conformance-skip": true,
        onClick: () =>
          dispatchConformanceActionInternalV1(
            dispatchAction,
            playerInputActionIdsV1.toggleSkip,
          ),
      },
      "Skip",
    ),
    createElement(
      "button",
      {
        type: "button",
        "data-dialogue-history-open": true,
        onClick: () =>
          dispatchConformanceActionInternalV1(
            dispatchAction,
            playerInputActionIdsV1.toggleHistory,
          ),
      },
      "History",
    ),
    createElement(
      "button",
      {
        type: "button",
        "data-narrative-conformance-voice": true,
        onClick: () =>
          dispatchConformanceActionInternalV1(
            dispatchAction,
            playerInputActionIdsV1.replayVoice,
          ),
      },
      "Voice",
    ),
  );
}

function NarrativeConformanceHistoryInternalV1(
  props: NarrativeStableHistoryRendererPropsInternalV1,
): ReactElement {
  const dispatchAction = useContext(NarrativeConformanceActionContextInternalV1);
  const history = props.history;
  const playerProfile = props.playerProfile;
  const textResolver = props.textResolver;
  const resolvedHistory = useMemo(
    () =>
      Object.freeze({
        playerProfile,
        entries: Object.freeze(
          history.entries.map((entry) =>
            Object.freeze({ entry, text: textResolver(entry.textId) })
          ),
        ),
      }),
    [history, playerProfile, textResolver],
  );
  return createElement(
    "section",
    { "data-dialogue-history": "true", "data-narrative-conformance-surface": "history" },
    createElement(
      "ol",
      null,
      ...resolvedHistory.entries.map(({ entry, text }) =>
        createElement(
          "li",
          { key: entry.occurrenceId, "data-dialogue-history-entry": entry.kind },
          text,
        )
      ),
    ),
    createElement(
      "button",
      {
        type: "button",
        "data-dialogue-history-close": true,
        onClick: () =>
          dispatchConformanceActionInternalV1(
            dispatchAction,
            playerInputActionIdsV1.toggleHistory,
          ),
      },
      "Close history",
    ),
  );
}

function NarrativeConformanceRendererInternalV1(
  props: NarrativeStableRendererPropsInternalV1,
): ReactElement {
  return props.kind === "dialogue"
    ? createElement(NarrativeConformanceDialogueInternalV1, props)
    : createElement(NarrativeConformanceHistoryInternalV1, props);
}

function isBridgeResultAcceptedInternalV1(result: { readonly kind: string }): boolean {
  return result.kind === "applied" || result.kind === "unchanged";
}

export function createNarrativeConformanceRigV1(
  input: CreateNarrativeConformanceRigInputV1,
): NarrativeConformanceRigCreationResultV1 {
  const captured = captureConformanceInputInternalV1(input);
  if (captured === null) return narrativeConformanceInputInvalidInternalV1;
  const claim = claimConformanceSourceInternalV1(captured);
  if (claim === null) return narrativeConformanceSourceClaimedInternalV1;

  let active = true;
  let settingUp = true;
  let setupReentered = false;
  let unsubscribeSource: (() => void) | null = null;
  let pendingSourceRollback: CallableInternalV1 | null = null;
  let bridge: NarrativeStablePublisherBridgeInternalV1 | null = null;
  let currentStableActionAuthority:
    | ReturnType<
      typeof claimManagedSurfaceStableActionRouteAuthorityInternalV1
    >
    | null = null;
  let currentSnapshot: CapturedConformanceSnapshotInternalV1 | null = null;
  let reconcilingSnapshot: CapturedConformanceSnapshotInternalV1 | null = null;
  let currentProfileCandidateToken: object | null = null;
  let currentHistory: NarrativeHistoryV1 | null = null;
  let currentSourceHistory: DeepReadonly<NarrativeHistoryV1> | null = null;
  let currentPhysicalIngress:
    | NarrativeSurfaceHostPhysicalIngressContextInternalV1
    | null = null;
  let currentPhysicalAdmission: NarrativeStablePhysicalActionAdmissionInternalV1 | null = null;
  let currentHostOwnerToken: object | null = null;
  let currentHostRegistrationToken: object | null = null;
  let releasePhysicalRegistration: (() => void) | null = null;
  let unregisterPhysicalInput: (() => void) | null = null;
  let authenticatedRouteInProgress = false;
  const historyListeners = new Set<() => void>();

  const deliverFailure = (error: unknown): void => {
    try {
      Reflect.apply(captured.reportFailure, captured.receiver, [error]);
    } catch {
      // Reporting is observational and cannot become a second lifecycle writer.
    }
  };
  const reportCurrentFailure = (error: unknown): void => {
    if (active) deliverFailure(error);
  };

  const terminalize = (): void => {
    if (!active) return;
    active = false;
    const sourceUnsubscribe = unsubscribeSource;
    unsubscribeSource = null;
    const sourceRollback = pendingSourceRollback;
    pendingSourceRollback = null;
    const currentBridge = bridge;
    bridge = null;
    currentStableActionAuthority = null;
    const registrationRelease = releasePhysicalRegistration;
    releasePhysicalRegistration = null;
    currentHostOwnerToken = null;
    currentHostRegistrationToken = null;
    const physicalInputUnregister = unregisterPhysicalInput;
    unregisterPhysicalInput = null;
    const physicalAdmission = currentPhysicalAdmission;
    currentPhysicalAdmission = null;
    currentPhysicalIngress = null;
    currentSnapshot = null;
    reconcilingSnapshot = null;
    currentProfileCandidateToken = null;
    currentHistory = null;
    currentSourceHistory = null;
    historyListeners.clear();
    try {
      registrationRelease?.();
    } catch {
      // Physical ingress is permanently fenced before registration cleanup.
    }
    try {
      physicalInputUnregister?.();
    } catch {
      // The ordinary raw ingress is already permanently fenced.
    }
    try {
      physicalAdmission?.disposeInternalV1();
    } catch {
      // The private authenticated admission is already unreachable.
    }
    try {
      sourceUnsubscribe?.();
    } catch {
      // Logical fencing precedes best-effort physical cleanup.
    }
    if (sourceUnsubscribe === null) {
      try {
        if (sourceRollback !== null) Reflect.apply(sourceRollback, undefined, []);
      } catch {
        // A structurally invalid cleanup is still invoked once as best-effort rollback.
      }
    }
    try {
      currentBridge?.disposeInternalV1();
    } catch {
      // The bridge is already permanently fenced before physical disposal.
    }
    releaseConformanceSourceInternalV1(captured, claim);
  };

  const historyObservationPort = Object.freeze({
    getSnapshotInternalV1(): NarrativeHistoryV1 {
      if (!active || currentHistory === null) throw new TypeError("ui.narrative_conformance_inert");
      return currentHistory;
    },
    subscribeInternalV1(listener: () => void): () => void {
      if (!active || typeof listener !== "function") return narrativeConformanceNoopInternalV1;
      historyListeners.add(listener);
      let subscribed = true;
      return Object.freeze((): void => {
        if (!subscribed) return;
        subscribed = false;
        historyListeners.delete(listener);
      });
    },
  });
  const historyAvailabilityPort = Object.freeze({
    readHistoryAvailabilityInternalV1: (): boolean =>
      active && currentHistory !== null && currentHistory.entries.length > 0,
  });
  const semanticDispatchPort = Object.freeze({
    dispatchResolutionInternalV1: (
      request: NarrativeConformanceResolutionRequestV1,
    ): Promise<unknown> => {
      if (!active) return Promise.reject(new TypeError("ui.narrative_conformance_inert"));
      try {
        const completion = Reflect.apply(captured.dispatchResolution, captured.receiver, [
          Object.freeze({
            expectedOccurrenceId: request.expectedOccurrenceId,
            resolution: request.resolution,
          }),
        ]);
        return completion instanceof Promise
          ? completion
          : Promise.reject(new TypeError("ui.narrative_conformance_dispatch_invalid"));
      } catch (error) {
        return Promise.reject(error);
      }
    },
  });
  const createProfilePort = (
    candidateSource: CapturedConformanceSnapshotInternalV1,
    candidatePending: PendingInteractionV1,
    rendererKey: string,
  ) => {
    const candidateToken = Object.freeze({ rendererKey });
    let candidateTokenInstalled = false;
    const isCandidateSourceCurrent = (): boolean =>
      active &&
      (currentSnapshot === candidateSource || reconcilingSnapshot === candidateSource) &&
      candidateSource.pending?.occurrenceId === candidatePending.occurrenceId;
    return Object.freeze({
      getSnapshotInternalV1: () => {
        const profile = Reflect.apply(
          captured.playerProfileCurrent,
          captured.playerProfile,
          [],
        );
        if (!candidateTokenInstalled && isCandidateSourceCurrent()) {
          candidateTokenInstalled = true;
          currentProfileCandidateToken = candidateToken;
        }
        return profile;
      },
      subscribeInternalV1: (listener: () => void) =>
        Reflect.apply(captured.playerProfileSubscribe, captured.playerProfile, [listener]),
      markSeenInternalV1: (definitionId: string, seenRevision: number): void => {
        const isCandidateCurrent = (): boolean =>
          isCandidateSourceCurrent() && currentProfileCandidateToken === candidateToken;
        if (
          !isCandidateCurrent() ||
          candidateSource.pending === null ||
          candidateSource.pending.occurrenceId !== candidatePending.occurrenceId ||
          definitionId !== candidatePending.definitionId ||
          seenRevision !== candidatePending.seenRevision
        ) return;
        const currentBridge = bridge;
        const stableActionAuthority = currentStableActionAuthority;
        const hostRegistrationToken = currentHostRegistrationToken;
        const physicalIngress = currentPhysicalIngress;
        const actionFence = (() => {
          if (currentBridge === null || stableActionAuthority === null) return null;
          try {
            const actionInput = stableActionAuthority.captureCurrentStableInputInternalV1();
            if (
              actionInput.kind !== "captured" || actionInput.directTarget === null ||
              actionInput.targetProof === null
            ) return null;
            const frame = currentBridge.inspectAdmittedTargetFrameInternalV1(
              actionInput.directTarget,
            );
            return frame?.pending.occurrenceId === candidatePending.occurrenceId
              ? Object.freeze({ actionInput, frame })
              : null;
          } catch {
            return null;
          }
        })();
        const isFenceCurrent = (): boolean => {
          if (
            !isCandidateCurrent() || hostRegistrationToken === null ||
            physicalIngress === null ||
            currentHostRegistrationToken !== hostRegistrationToken ||
            currentPhysicalIngress !== physicalIngress
          ) return false;
          try {
            if (!physicalIngress.isCurrentInternalV1()) return false;
          } catch {
            return false;
          }
          if (actionFence === null) return true;
          if (
            bridge !== currentBridge ||
            currentStableActionAuthority !== stableActionAuthority ||
            currentBridge === null || stableActionAuthority === null
          ) return false;
          try {
            const current = stableActionAuthority.captureCurrentStableInputInternalV1();
            return current.kind === "captured" &&
              current.directTarget === actionFence.actionInput.directTarget &&
              current.sourceRevision === actionFence.actionInput.sourceRevision &&
              current.targetProof !== null &&
              stableActionAuthority.isCurrentDirectTargetInternalV1(current.targetProof) &&
              currentBridge.inspectAdmittedTargetFrameInternalV1(current.directTarget) ===
                actionFence.frame;
          } catch {
            return false;
          }
        };
        try {
          const completion = Reflect.apply(
            captured.playerProfileMarkSeen,
            captured.playerProfile,
            [definitionId, seenRevision],
          );
          if (completion instanceof Promise) {
            void completion.catch((error) => {
              if (isFenceCurrent()) reportCurrentFailure(error);
            });
          }
        } catch (error) {
          if (isFenceCurrent()) reportCurrentFailure(error);
        }
      },
    });
  };
  const clockPort = Object.freeze({
    nowInternalV1: () =>
      Reflect.apply(
        captured.presentationClockNow,
        captured.presentationClock,
        [],
      ),
    requestTickInternalV1: (callback: (nowMs: number) => void) =>
      Reflect.apply(captured.presentationClockRequestTick, captured.presentationClock, [callback]),
    prefersReducedMotionInternalV1: () => false,
  });
  const textResolverPort = Object.freeze({
    resolveTextInternalV1: (textId: string): string =>
      Reflect.apply(captured.textResolver, captured.receiver, [textId]),
  });
  const voiceReplayPort = captured.voiceReplay === null ? null : Object.freeze({
    replayCurrentVoiceInternalV1: (): boolean =>
      Reflect.apply(captured.voiceReplay!, captured.receiver, []),
  });
  const candidatePreflight = Object.freeze({
    preflightCandidateInternalV1: (pending: PendingInteractionV1, rendererKey: string) => {
      const candidateSource = reconcilingSnapshot ?? currentSnapshot;
      if (
        candidateSource === null || candidateSource.pending === null ||
        candidateSource.pending.occurrenceId !== pending.occurrenceId
      ) throw new TypeError("ui.narrative_conformance_candidate_source_invalid");
      return Object.freeze({
        kind: "captured" as const,
        candidateSnapshot: Object.freeze({
          rendererComponent: NarrativeConformanceRendererInternalV1,
          visualConfig: narrativeConformanceVisualConfigInternalV1,
          semanticDispatchPort,
          historyObservationPort,
          historyAvailabilityPort,
          playerProfile: createProfilePort(candidateSource, pending, rendererKey),
          presentationClock: clockPort,
          textResolver: textResolverPort,
          voiceReplayPort,
          quickMenuContribution: null,
        }),
      });
    },
  }) satisfies NarrativeStableCandidatePreflightInternalV1;

  const reconcileCapturedSnapshot = (
    next: CapturedConformanceSnapshotInternalV1,
  ): void => {
    if (!active || bridge === null) throw new TypeError("ui.narrative_conformance_inert");
    const previous = currentSnapshot;
    if (previous !== null) {
      if (next.revision < previous.revision) {
        throw new TypeError("ui.narrative_conformance_revision_regressed");
      }
      if (next.revision === previous.revision) {
        if (next.source !== previous.source) {
          throw new TypeError("ui.narrative_conformance_snapshot_identity_invalid");
        }
        return;
      }
    }
    reconcilingSnapshot = next;
    let result: ReturnType<NarrativeStablePublisherBridgeInternalV1["reconcilePendingInternalV1"]>;
    try {
      result = bridge.reconcilePendingInternalV1(next.pending);
    } finally {
      reconcilingSnapshot = null;
    }
    if (!isBridgeResultAcceptedInternalV1(result)) {
      throw new TypeError("ui.narrative_conformance_reconcile_faulted");
    }
    const historyChanged = currentSourceHistory !== next.sourceHistory;
    currentSnapshot = next;
    if (historyChanged) {
      currentSourceHistory = next.sourceHistory;
      currentHistory = next.history;
      for (const listener of [...historyListeners]) {
        if (!active) break;
        try {
          listener();
        } catch {
          // One history observer cannot block the complete listener vector.
        }
      }
    }
  };

  const sourceListener = (): void => {
    if (!active) return;
    if (settingUp) {
      setupReentered = true;
      return;
    }
    try {
      const raw = Reflect.apply(captured.observeNarrative, captured.receiver, []);
      const next = captureConformanceSnapshotInternalV1(raw);
      if (next === null) throw new TypeError("ui.narrative_conformance_snapshot_invalid");
      reconcileCapturedSnapshot(next);
    } catch (error) {
      terminalize();
      deliverFailure(error);
    }
  };

  try {
    const rawInitial = Reflect.apply(captured.observeNarrative, captured.receiver, []);
    const initial = captureConformanceSnapshotInternalV1(rawInitial);
    if (initial === null) throw new TypeError("ui.narrative_conformance_snapshot_invalid");
    currentSnapshot = initial;
    currentSourceHistory = initial.sourceHistory;
    currentHistory = initial.history;

    const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
    const leaseSequenceAllocator =
      createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1();
    const publisherLeaseRegistry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
      applicationEpoch: narrativeConformanceApplicationEpochInternalV1,
      resolvedOwnerIds: contract.resolvedOwnerIds,
      leaseSequenceAllocator,
    });
    const admissionAuthority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
      publisherLeaseRegistry,
      definitionSidecars: contract.stableDefinitionSidecars,
      resolvedSlotDescriptors: contract.resolvedSlotDescriptors,
    });
    const compositeRuntimeKernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
      admissionAuthority,
      publisherLeaseRegistry,
      initialTransientState: createManagedSurfaceReducerStateV1(
        narrativeConformanceApplicationEpochInternalV1,
        contract.resolvedOwnerIds,
        contract.resolvedSlotDescriptors,
      ),
    });
    bridge = createNarrativeStablePublisherBridgeInternalV1({
      publisherLeaseRegistry,
      admissionAuthority,
      compositeRuntimeKernel,
      candidatePreflight,
      exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
      exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
    });
    const session = createNarrativeStableSessionInternalV1({ bridge });
    const stableActionAuthority = claimManagedSurfaceStableActionRouteAuthorityInternalV1(
      compositeRuntimeKernel,
    );
    currentStableActionAuthority = stableActionAuthority;
    let gestureSequence = 0;

    const routeConformanceAction = Object.freeze(
      (request: NarrativeConformanceActionRequestInternalV1): boolean => {
        const actionId = request.actionId;
        const physicalIngress = currentPhysicalIngress;
        if (
          !active || physicalIngress === null || authenticatedRouteInProgress ||
          !physicalIngress.isCurrentInternalV1() ||
          gestureSequence >= Number.MAX_SAFE_INTEGER
        ) return false;

        let admission: NarrativeStablePhysicalActionAdmissionInternalV1;
        try {
          admission = createNarrativeStablePhysicalActionAdmissionInternalV1(Object.freeze({
            bridge: bridge!,
            inputRouter: physicalIngress.inputRouter,
            isGestureCurrent: physicalIngress.isGestureCurrent,
          }));
        } catch {
          return false;
        }
        if (currentPhysicalAdmission !== admission) {
          const predecessor = currentPhysicalAdmission;
          currentPhysicalAdmission = admission;
          try {
            predecessor?.disposeInternalV1();
          } catch {
            // A retired admission cannot block the current Host generation.
          }
        }
        const retireUnconsumedAdmission = (): void => {
          if (currentPhysicalAdmission === admission) currentPhysicalAdmission = null;
          try {
            admission.disposeInternalV1();
          } catch {
            // Its unconsumed attempts are already unreachable from this rig.
          }
        };

        let attempt: unknown = null;
        let attemptRequired = true;
        try {
          if (actionId === systemInputActionIdsV1.narrativeAdvance) {
            const current = stableActionAuthority.captureCurrentStableInputInternalV1();
            if (current.kind !== "captured" || current.directTarget === null) return false;
            const frame = bridge!.inspectAdmittedTargetFrameInternalV1(current.directTarget);
            if (frame === null || frame.pending.kind !== "say") return false;
            const controller = createNarrativeStableDialoguePlayerControllerInternalV1(
              Object.freeze({ bridge: bridge!, target: current.directTarget, frame }),
            );
            attempt = admission.issueSayActivationAttemptInternalV1(controller);
          } else if (actionId === playerInputActionIdsV1.toggleAuto) {
            attempt = admission.issuePlaybackModeToggleAttemptInternalV1("auto");
          } else if (actionId === playerInputActionIdsV1.toggleSkip) {
            attempt = admission.issuePlaybackModeToggleAttemptInternalV1("skip");
          } else if (actionId === playerInputActionIdsV1.replayVoice) {
            attempt = admission.issueVoiceReplayAttemptInternalV1();
          } else if (actionId === narrativeConformanceChooseActionIdInternalV1) {
            attempt = admission.issueChoiceAttemptInternalV1(request.choiceId);
          } else if (actionId === narrativeConformanceResumeActionIdInternalV1) {
            attempt = admission.issuePauseResumeAttemptInternalV1();
          } else if (actionId === narrativeConformanceCustomActionIdInternalV1) {
            attempt = admission.issueCustomAttemptInternalV1(request.payload);
          } else if (actionId === playerInputActionIdsV1.toggleHistory) {
            attempt = admission.issueHistoryOpenAttemptInternalV1();
            attemptRequired = false;
          } else {
            return false;
          }
        } catch {
          return false;
        }
        if (attemptRequired && attempt === null) return false;
        gestureSequence += 1;
        const actionSource = currentSnapshot;

        try {
          const envelope = admission.createEnvelopeInternalV1(Object.freeze({
            actionId: parseManagedSurfaceActionIdV1(String(actionId)),
            gestureId: parseManagedSurfaceGestureIdV1(
              `gesture.narrative-conformance.${String(gestureSequence)}`,
            ),
          }));
          if (!active || !physicalIngress.isCurrentInternalV1()) {
            retireUnconsumedAdmission();
            return false;
          }
          authenticatedRouteInProgress = true;
          let result: ReturnType<
            NarrativeStablePhysicalActionAdmissionInternalV1["routeInternalV1"]
          >;
          try {
            result = admission.routeInternalV1(envelope, attempt);
          } finally {
            authenticatedRouteInProgress = false;
          }
          const consumerResult = result.consumerResult;
          if (consumerResult === null) {
            retireUnconsumedAdmission();
            return false;
          }
          if (
            actionId === playerInputActionIdsV1.toggleHistory &&
            consumerResult.kind === "requested"
          ) {
            const redeemed = session.getHistoryChildLifecycleInternalV1()
              .redeemHistoryOpenIntentInternalV1(consumerResult.intent);
            return redeemed.kind === "preparing";
          }
          if (
            "completion" in consumerResult &&
            consumerResult.completion instanceof Promise
          ) {
            void consumerResult.completion.catch((error) => {
              if (
                active && currentSnapshot === actionSource &&
                currentPhysicalIngress === physicalIngress &&
                currentPhysicalAdmission === admission &&
                physicalIngress.isCurrentInternalV1()
              ) reportCurrentFailure(error);
            });
          }
          return consumerResult.kind !== "stale" &&
            consumerResult.kind !== "faulted" && consumerResult.kind !== "unmapped";
        } catch {
          authenticatedRouteInProgress = false;
          retireUnconsumedAdmission();
          return false;
        }
      },
    );

    const attachPhysicalIngress = Object.freeze(
      (context: NarrativeSurfaceHostPhysicalIngressContextInternalV1): () => void => {
        if (
          !active || currentPhysicalIngress !== null ||
          !context.isCurrentInternalV1()
        ) {
          throw new TypeError("ui.narrative_conformance_physical_ingress_invalid");
        }
        let attached = true;
        const unregister = context.inputRouter.register(Object.freeze({
          context: "narrative" as const,
          handle: (event: DeepReadonly<InputEventV1>) => {
            if (authenticatedRouteInProgress || event.kind !== "action") {
              return inputIgnoredV1;
            }
            if (event.actionId === narrativeConformanceCustomActionIdInternalV1) {
              return inputIgnoredV1;
            }
            const pending = currentSnapshot?.pending ?? null;
            const request = Object.freeze({
              actionId: event.actionId,
              choiceId: event.actionId === narrativeConformanceChooseActionIdInternalV1 &&
                  pending?.kind === "choice"
                ? pending.options[0]?.choiceId ?? null
                : null,
              payload: null,
            });
            return routeConformanceAction(request) ? inputHandledV1 : inputIgnoredV1;
          },
        }));
        currentPhysicalIngress = context;
        unregisterPhysicalInput = unregister;
        return Object.freeze((): void => {
          if (!attached) return;
          attached = false;
          if (currentPhysicalIngress !== context) return;
          currentPhysicalIngress = null;
          const physicalAdmission = currentPhysicalAdmission;
          currentPhysicalAdmission = null;
          if (unregisterPhysicalInput === unregister) unregisterPhysicalInput = null;
          try {
            unregister();
          } catch {
            // The raw ingress generation is already logically fenced.
          }
          try {
            physicalAdmission?.disposeInternalV1();
          } catch {
            // The authenticated admission is already unreachable.
          }
        });
      },
    );
    const initialResult = bridge.reconcilePendingInternalV1(initial.pending);
    if (!isBridgeResultAcceptedInternalV1(initialResult)) {
      throw new TypeError("ui.narrative_conformance_reconcile_faulted");
    }
    const rawUnsubscribe = Reflect.apply(captured.subscribeNarrative, captured.receiver, [
      sourceListener,
    ]);
    if (typeof rawUnsubscribe === "function") {
      pendingSourceRollback = rawUnsubscribe as CallableInternalV1;
    }
    if (!isCallableWithoutThenInternalV1(rawUnsubscribe)) {
      throw new TypeError("ui.narrative_conformance_subscription_invalid");
    }
    unsubscribeSource = rawUnsubscribe as () => void;
    pendingSourceRollback = null;
    if (setupReentered) {
      throw new TypeError("ui.narrative_conformance_subscription_reentered");
    }

    const Host: ComponentType<NarrativeConformanceHostPropsV1> = Object.freeze(
      function NarrativeConformanceHostInternalV1(
        props: NarrativeConformanceHostPropsV1,
      ): ReactElement | null {
        let inputRouter: InputRouterV1 | null = null;
        try {
          const keys = Reflect.ownKeys(props);
          const descriptor = Reflect.getOwnPropertyDescriptor(props, "inputRouter");
          if (
            keys.length === 1 && keys[0] === "inputRouter" && descriptor !== undefined &&
            "value" in descriptor && descriptor.enumerable === true &&
            isExactInputRouterInternalV1(descriptor.value)
          ) inputRouter = descriptor.value as InputRouterV1;
        } catch {
          inputRouter = null;
        }
        const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
        const [registeredBinding, setRegisteredBinding] = useState<
          Readonly<{
            readonly portalContainer: HTMLDivElement;
            readonly inputRouter: InputRouterV1;
          }> | null
        >(null);
        const [hostOwnerToken] = useState<object>(() => Object.freeze({}));
        const [hostInputRouter] = useState<InputRouterV1 | null>(() => inputRouter);
        const capturePortal = useCallback((next: HTMLDivElement | null): void => {
          setPortalContainer(next);
        }, []);
        useLayoutEffect(() => {
          if (!active || portalContainer === null || hostInputRouter === null) return undefined;
          if (
            currentHostOwnerToken !== null && currentHostOwnerToken !== hostOwnerToken
          ) return undefined;
          currentHostOwnerToken = hostOwnerToken;
          const registrationToken = Object.freeze({});
          currentHostRegistrationToken = registrationToken;
          let release: () => void;
          try {
            release = registerNarrativeSurfaceHostPhysicalIngressInternalV1(Object.freeze({
              session,
              portalContainer,
              inputRouter: hostInputRouter,
              attachInternalV1: attachPhysicalIngress,
            }));
          } catch (error) {
            if (currentHostOwnerToken === hostOwnerToken) currentHostOwnerToken = null;
            if (currentHostRegistrationToken === registrationToken) {
              currentHostRegistrationToken = null;
            }
            throw error;
          }
          if (
            !active || currentHostOwnerToken !== hostOwnerToken ||
            currentHostRegistrationToken !== registrationToken
          ) {
            release();
            return undefined;
          }
          const binding = Object.freeze({ portalContainer, inputRouter: hostInputRouter });
          releasePhysicalRegistration = release;
          setRegisteredBinding(binding);
          return () => {
            if (currentHostOwnerToken === hostOwnerToken) currentHostOwnerToken = null;
            if (currentHostRegistrationToken === registrationToken) {
              currentHostRegistrationToken = null;
            }
            if (releasePhysicalRegistration === release) releasePhysicalRegistration = null;
            setRegisteredBinding((current) => current === binding ? null : current);
            release();
          };
        }, [hostInputRouter, hostOwnerToken, portalContainer]);
        if (!active || inputRouter === null) return null;
        return createElement(
          Fragment,
          null,
          createElement("div", {
            ref: capturePortal,
            "data-narrative-conformance-portal": "true",
          }),
          portalContainer === null || registeredBinding?.portalContainer !== portalContainer
            ? null
            : createElement(
              NarrativeConformanceActionContextInternalV1.Provider,
              { value: routeConformanceAction },
              createElement(NarrativeSurfaceHostInternalV1, {
                session,
                portalContainer,
                inputRouter: registeredBinding.inputRouter,
                isGestureCurrent: narrativeConformanceGestureCurrentInternalV1,
              }),
            ),
        );
      },
    );
    const rig = Object.freeze({
      Host,
      dispose: Object.freeze((): void => terminalize()),
    }) satisfies NarrativeConformanceRigV1;
    settingUp = false;
    return Object.freeze({ kind: "created" as const, rig });
  } catch {
    settingUp = false;
    terminalize();
    return narrativeConformanceCreationFaultedInternalV1;
  }
}
