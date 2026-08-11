// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { InputRouterV1, PresentationClockV1 } from "@sillymaker/ui";
import type {
  CreateNarrativeConformanceRigInputV1,
  NarrativeConformanceRigCreationResultV1,
  NarrativeConformanceResolutionRequestV1,
  NarrativeConformanceSnapshotV1,
} from "@sillymaker/ui/conformance";
import { createNarrativeConformanceRigV1 } from "@sillymaker/ui/conformance";

import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import { labUiTextV1 } from "./ui-text.ts";

type LabSemanticPortV1 = LabApplicationInstanceV1["semantic"];

interface LabNarrativeSourceV1 {
  readonly observeNarrative: () => NarrativeConformanceSnapshotV1;
  readonly subscribeNarrative: (listener: () => void) => () => void;
}

const labNarrativeSourcesV1 = new WeakMap<LabSemanticPortV1, LabNarrativeSourceV1>();

function getLabNarrativeSourceV1(semantic: LabSemanticPortV1): LabNarrativeSourceV1 {
  const existing = labNarrativeSourcesV1.get(semantic);
  if (existing !== undefined) return existing;

  let snapshot: NarrativeConformanceSnapshotV1 | null = null;
  const source = Object.freeze({
    observeNarrative: (): NarrativeConformanceSnapshotV1 => {
      const publication = semantic.observe();
      if (snapshot?.revision === publication.revision) return snapshot;
      snapshot = Object.freeze({
        revision: publication.revision,
        pending: publication.narrative.pending,
        history: publication.narrative.history,
      });
      return snapshot;
    },
    subscribeNarrative: (listener: () => void): () => void => semantic.subscribe(listener),
  });
  labNarrativeSourcesV1.set(semantic, source);
  return source;
}

export interface CreateLabNarrativeConformanceInputV1 {
  readonly instance: LabApplicationInstanceV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly presentationClock: PresentationClockV1;
  readonly voiceReplay: () => boolean;
  readonly reportFailure: (error: unknown) => void;
}

/** Projects the real Engine Lab semantic publication into the closed UI seam. */
export function createLabNarrativeConformanceInputV1(
  input: CreateLabNarrativeConformanceInputV1,
): CreateNarrativeConformanceRigInputV1 {
  const source = getLabNarrativeSourceV1(input.instance.semantic);
  return Object.freeze({
    observeNarrative: source.observeNarrative,
    subscribeNarrative: source.subscribeNarrative,
    dispatchResolution: async (request: NarrativeConformanceResolutionRequestV1) => {
      await input.instance.semantic.dispatch(
        Object.freeze({
          kind: "resolve" as const,
          expectedOccurrenceId: request.expectedOccurrenceId,
          resolution: request.resolution,
        }),
      );
    },
    playerProfile: input.playerProfile,
    presentationClock: input.presentationClock,
    textResolver: labUiTextV1,
    voiceReplay: input.voiceReplay,
    reportFailure: input.reportFailure,
  });
}

export interface LabNarrativeConformanceV1 {
  readonly creation: NarrativeConformanceRigCreationResultV1;
  registerReplayVoice(replay: (() => boolean) | null): void;
  dispose(): void;
}

export function createLabNarrativeConformanceV1(input: {
  readonly instance: LabApplicationInstanceV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly presentationClock: PresentationClockV1;
  readonly reportFailure: (error: unknown) => void;
}): LabNarrativeConformanceV1 {
  let replayVoice: (() => boolean) | null = null;
  let disposed = false;
  const creation = createNarrativeConformanceRigV1(
    createLabNarrativeConformanceInputV1({
      ...input,
      voiceReplay: () => replayVoice?.() ?? false,
    }),
  );
  return Object.freeze({
    creation,
    registerReplayVoice(replay: (() => boolean) | null): void {
      if (disposed) return;
      replayVoice = replay;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      replayVoice = null;
      if (creation.kind === "created") creation.rig.dispose();
    },
  });
}

export function LabNarrativeConformanceSlotV1(props: {
  readonly conformance: LabNarrativeConformanceV1;
  readonly inputRouter: InputRouterV1;
}): ReactElement {
  const { creation } = props.conformance;
  if (creation.kind === "created") {
    return <creation.rig.Host inputRouter={props.inputRouter} />;
  }
  return (
    <p
      role="status"
      data-lab-narrative-conformance="unavailable"
      data-lab-narrative-conformance-code={creation.code}
    >
      Narrative conformance unavailable ({creation.code})
    </p>
  );
}
