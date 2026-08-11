// SPDX-License-Identifier: MIT
import type { DeepReadonly } from "@sillymaker/base";
import type { PlayerProfileV1 } from "@sillymaker/base/runtime";

import type { ManagedSurfaceStableAdmittedTargetInternalV1 } from "../managed-surfaces/managed-surface-stable-contract.ts";
import type {
  NarrativeStableAdmittedFrameInternalV1,
  NarrativeStablePlaybackModeInternalV1,
  NarrativeStablePublisherBridgeInternalV1,
} from "./narrative-managed-surface-family.ts";

export interface NarrativeStableDialoguePlayerClockPortInternalV1 {
  nowInternalV1(): number;
  requestTickInternalV1(callback: (nowMs: number) => void): () => void;
  prefersReducedMotionInternalV1(): boolean;
}

export interface NarrativeStableDialoguePlayerProfilePortInternalV1 {
  getSnapshotInternalV1(): DeepReadonly<PlayerProfileV1>;
  subscribeInternalV1(listener: () => void): () => void;
  markSeenInternalV1(definitionId: string, seenRevision: number): void;
}

export interface NarrativeStableDialoguePlayerTextResolverPortInternalV1 {
  resolveTextInternalV1(textId: string): string;
}

declare const narrativeStableCapturedDialoguePlayerClockPortBrandInternalV1: unique symbol;
export interface NarrativeStableCapturedDialoguePlayerClockPortInternalV1 {
  readonly [narrativeStableCapturedDialoguePlayerClockPortBrandInternalV1]: true;
}

declare const narrativeStableCapturedDialoguePlayerProfilePortBrandInternalV1: unique symbol;
export interface NarrativeStableCapturedDialoguePlayerProfilePortInternalV1 {
  readonly [narrativeStableCapturedDialoguePlayerProfilePortBrandInternalV1]: true;
}

declare const narrativeStableCapturedDialoguePlayerTextResolverPortBrandInternalV1: unique symbol;
export interface NarrativeStableCapturedDialoguePlayerTextResolverPortInternalV1 {
  readonly [narrativeStableCapturedDialoguePlayerTextResolverPortBrandInternalV1]: true;
}

export interface NarrativeStableDialoguePlayerPolicySnapshotInternalV1 {
  readonly textRevealCharsPerSecond: number;
  readonly autoWaitMs: number;
  readonly skipPolicy: "skip_read" | "skip_all";
  readonly reducedMotion: boolean;
}

export type NarrativeStableDialoguePlayerSnapshotInternalV1 =
  | Readonly<{
    kind: "say";
    phase: "preparing" | "active" | "suspended";
    playbackMode: NarrativeStablePlaybackModeInternalV1;
    playerProfile: DeepReadonly<PlayerProfileV1>;
    resolvedSpeakerText: string | null;
    resolvedText: string;
    revealedCharacters: number;
    revealLength: number;
    revealComplete: boolean;
  }>
  | Readonly<{
    kind: "passive";
    phase: "preparing" | "active" | "suspended";
    playbackMode: "normal";
    playerProfile: DeepReadonly<PlayerProfileV1>;
  }>;

export interface CreateNarrativeStableDialoguePlayerControllerInputInternalV1 {
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
}

export interface NarrativeStableDialoguePlayerControllerInternalV1 {
  getSnapshotInternalV1(): NarrativeStableDialoguePlayerSnapshotInternalV1;
  subscribeInternalV1(listener: () => void): () => void;
  disposeInternalV1(): void;
}

declare const narrativeStableSayPlayerAutoAttemptBrandInternalV1: unique symbol;
export interface NarrativeStableSayPlayerAutoAttemptInternalV1 {
  readonly [narrativeStableSayPlayerAutoAttemptBrandInternalV1]: true;
}

declare const narrativeStableSaySkipAttemptBrandInternalV1: unique symbol;
export interface NarrativeStableSaySkipAttemptInternalV1 {
  readonly [narrativeStableSaySkipAttemptBrandInternalV1]: true;
}

declare const narrativeStablePlaybackModeResetAttemptBrandInternalV1: unique symbol;
export interface NarrativeStablePlaybackModeResetAttemptInternalV1 {
  readonly [narrativeStablePlaybackModeResetAttemptBrandInternalV1]: true;
}

export type NarrativeStableSayPlayerAutoDispatchResultInternalV1 =
  | Readonly<{ kind: "dispatched"; completion: Promise<unknown> }>
  | Readonly<{ kind: "not_ready"; completion: null }>
  | Readonly<{ kind: "stale"; completion: null }>
  | Readonly<{ kind: "faulted"; completion: null }>;

export type NarrativeStableSaySkipDispatchResultInternalV1 =
  | Readonly<{ kind: "dispatched"; completion: Promise<unknown> }>
  | Readonly<{ kind: "stopped"; completion: null }>
  | Readonly<{ kind: "stale"; completion: null }>
  | Readonly<{ kind: "faulted"; completion: null }>;

export type NarrativeStablePlaybackModeResetDispatchResultInternalV1 =
  | Readonly<{ kind: "reset"; mode: "normal"; completion: null }>
  | Readonly<{ kind: "stale"; completion: null }>
  | Readonly<{ kind: "faulted"; completion: null }>;

export { createNarrativeStableDialoguePlayerControllerInternalV1 } from "./narrative-managed-surface-family.ts";
