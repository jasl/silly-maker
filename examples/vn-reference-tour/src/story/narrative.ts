// SPDX-License-Identifier: MIT
import type {
  InteractionResolutionContext,
  InteractionResolution,
  NarrativeHistory,
  PendingInteraction,
  SemanticStageState,
  StageCueDispatch,
  StageMutation,
  TimeTick,
} from "@sillymaker/base/story";
import {
  appendNarrativeHistory,
  interactionOccurrenceId,
  emptyNarrativeHistory,
  parsePendingInteraction,
  reduceAdmittedStageMutations,
  settleHoldTimeline,
} from "@sillymaker/base/story";

import type {
  VnReferenceTourChoiceOptionV1,
  VnReferenceTourInteractionDocV1,
  VnReferenceTourNarrativeNodeV1,
  VnReferenceTourSceneBindingV1,
  VnReferenceTourSignalChoiceV1,
} from "./narrative-kit.ts";
import { compileVnReferenceTourInteractionDocV1 } from "./narrative-kit.ts";
import {
  vnReferenceTourControlRoomCueIdsV1,
  vnReferenceTourControlRoomSceneV1,
  vnReferenceTourLayersV1,
  vnReferenceTourTagsV1,
} from "../scenes/control-room/index.ts";
import {
  vnReferenceTourRooftopAntennaCueIdsV1,
  vnReferenceTourRooftopAntennaSceneV1,
} from "../scenes/rooftop-antenna/index.ts";

export type {
  VnReferenceTourChoiceOptionV1,
  VnReferenceTourNarrativeNodeV1,
  VnReferenceTourSignalChoiceV1,
} from "./narrative-kit.ts";
export { vnReferenceTourLayersV1, vnReferenceTourTagsV1 };

export interface VnReferenceTourNarrativeStateV1 {
  readonly phase: "idle" | "active" | "completed";
  readonly cursor: string | null;
  readonly pending: PendingInteraction | null;
  readonly sequence: number;
  readonly signalChoice: VnReferenceTourSignalChoiceV1 | null;
  readonly history: NarrativeHistory;
}

export function createInitialVnReferenceTourNarrativeStateV1(): VnReferenceTourNarrativeStateV1 {
  return ({
    phase: "idle" as const,
    cursor: null,
    pending: null,
    sequence: 0,
    signalChoice: null,
    history: emptyNarrativeHistory,
  });
}

export const vnReferenceTourEntryNodeIdV1 = "node.vn-reference-tour.open-control-room";

export const vnReferenceTourContentIdsV1 = {
  backgroundControlRoom: "content.vn-reference-tour.background.control-room",
  backgroundRooftopAntenna: "content.vn-reference-tour.background.rooftop-antenna",
  characterLin: "content.vn-reference-tour.character.lin",
  characterZhou: "content.vn-reference-tour.character.zhou",
};

const vnReferenceTourSceneRegistryV1: Readonly<Record<string, VnReferenceTourSceneBindingV1>> = {
  controlRoom: {
    scene: vnReferenceTourControlRoomSceneV1,
    cues: vnReferenceTourControlRoomCueIdsV1,
  },
  rooftopAntenna: {
    scene: vnReferenceTourRooftopAntennaSceneV1,
    cues: vnReferenceTourRooftopAntennaCueIdsV1,
  },
};

const textIdV1 = (name: string): string => `text.vn-reference-tour.${name}`;

type SpeakerKeyV1 = "lin" | "zhou" | null;
type SaySpecV1 = readonly [name: string, speaker: SpeakerKeyV1, textPath: string];

const sharedBaseSaySpecsV1 = [
  ["shared-power-on-room", null, "shared.power-on.room"],
  ["shared-power-on-lin-arrives", "lin", "shared.power-on.lin-arrives"],
  ["shared-power-on-console", "zhou", "shared.power-on.console"],
  ["shared-power-on-signal-light", null, "shared.power-on.signal-light"],
  ["shared-power-on-last-shift", "lin", "shared.power-on.last-shift"],
  ["shared-power-on-deadline", "zhou", "shared.power-on.deadline"],
  ["shared-power-on-archive-window", "lin", "shared.power-on.archive-window"],
  ["shared-power-on-single-send", "zhou", "shared.power-on.single-send"],
  ["shared-power-on-reel-on-desk", null, "shared.power-on.reel-on-desk"],
  ["shared-old-recording-label", "zhou", "shared.old-recording.label"],
  ["shared-old-recording-younger-voice", "lin", "shared.old-recording.younger-voice"],
  ["shared-old-recording-first-shift", "zhou", "shared.old-recording.first-shift"],
  ["shared-old-recording-load-reel", null, "shared.old-recording.load-reel"],
  ["shared-old-recording-old-call", "zhou", "shared.old-recording.old-call"],
  ["shared-old-recording-clean-signal", "lin", "shared.old-recording.clean-signal"],
  ["shared-old-recording-repair", "zhou", "shared.old-recording.repair"],
  ["shared-old-recording-meter", null, "shared.old-recording.meter"],
  ["shared-old-recording-what-to-save", "lin", "shared.old-recording.what-to-save"],
  ["shared-one-window-opens", "zhou", "shared.one-window.opens"],
  ["shared-one-window-not-both", "lin", "shared.one-window.not-both"],
  ["shared-one-window-why-one", "zhou", "shared.one-window.why-one"],
  ["shared-one-window-purpose", "lin", "shared.one-window.purpose"],
  ["shared-one-window-clock", null, "shared.one-window.clock"],
  ["shared-one-window-two-choices", "zhou", "shared.one-window.two-choices"],
  ["shared-one-window-ready", "lin", "shared.one-window.ready"],
  ["shared-one-window-switch", null, "shared.one-window.switch"],
] as const satisfies readonly SaySpecV1[];

function withContinuedPagesV1(
  specs: readonly SaySpecV1[],
  unsplitTextPaths: readonly string[] = [],
): readonly SaySpecV1[] {
  return specs.flatMap((spec) =>
    unsplitTextPaths.includes(spec[2])
      ? [spec]
      : [spec, [`${spec[0]}-continued`, spec[1], `${spec[2]}.continued`] as const]
  );
}

const sharedSaySpecsV1 = withContinuedPagesV1(sharedBaseSaySpecsV1, [
  "shared.old-recording.old-call",
]);

function sayV1(
  spec: SaySpecV1,
  next: string,
): VnReferenceTourInteractionDocV1["blocks"][number] {
  return ({
    kind: "say" as const,
    name: spec[0],
    speaker: spec[1],
    textId: textIdV1(spec[2]),
    next,
  });
}

const sharedBlocksV1: VnReferenceTourInteractionDocV1["blocks"] = [
  {
    kind: "stage",
    name: "open-control-room",
    ops: [
      { scene: "controlRoom", cue: "room" },
      { scene: "controlRoom", cue: "windowFirstLight" },
      { scene: "controlRoom", cue: "mixingConsole" },
      { scene: "controlRoom", cue: "tapeMachine" },
      { scene: "controlRoom", cue: "wallClock" },
      { scene: "controlRoom", cue: "microphone" },
      { scene: "controlRoom", cue: "signalLight" },
      { scene: "controlRoom", cue: "zhouPresent" },
    ],
    next: "shared-power-on-room",
  },
  sayV1(sharedSaySpecsV1[0]!, sharedSaySpecsV1[1]![0]),
  sayV1(sharedSaySpecsV1[1]!, "lin-enters"),
  {
    kind: "stage",
    name: "lin-enters",
    ops: [{ scene: "controlRoom", cue: "linEnters" }],
    next: sharedSaySpecsV1[2]![0],
  },
  ...sharedSaySpecsV1.slice(2).map((spec, index) =>
    sayV1(spec, sharedSaySpecsV1[index + 3]?.[0] ?? "signal-choice")
  ),
  {
    kind: "choice",
    name: "signal-choice",
    promptTextId: textIdV1("choice.signal.prompt"),
    options: [
      {
        name: "archive-voice",
        textId: textIdV1("choice.signal.archive"),
        setSignalChoice: "archive",
        next: "route-gate",
      },
      {
        name: "present-voice",
        textId: textIdV1("choice.signal.present"),
        setSignalChoice: "present",
        next: "route-gate",
      },
    ],
  },
  {
    kind: "branch",
    name: "route-gate",
    cases: [
      { when: { signalChoice: "archive" }, next: "archive-prepare-reel" },
      { when: { signalChoice: "present" }, next: "present-prepare-microphone" },
    ],
  },
];

function routeBlocksV1(
  route: VnReferenceTourSignalChoiceV1,
): VnReferenceTourInteractionDocV1["blocks"] {
  const isArchive = route === "archive";
  const prepareNames = isArchive
    ? ["reel", "pause", "full", "ready", "deck", "sent"]
    : ["microphone", "hesitation", "words", "ready", "recording", "sent"];
  const prepareSpeakers = isArchive
    ? ([null, "zhou", "lin", "zhou", null, "zhou"] as const)
    : ([null, "lin", "zhou", "lin", null, "lin"] as const);
  const roofNames = [
    "stairs",
    "cold",
    "breaker",
    "cable",
    "receipt",
    "confirmed",
    "response",
    "shutdown",
  ];
  const roofSpeakers = [null, "lin", "zhou", null, "lin", "zhou", "lin", null] as const;
  const appearance = isArchive
    ? { tag: vnReferenceTourTagsV1.zhou, expression: "soft" }
    : { tag: vnReferenceTourTagsV1.lin, expression: "relieved" };
  const prepareSpecs = withContinuedPagesV1(
    prepareNames.map((name, index) =>
      [
        `${route}-prepare-${name}`,
        prepareSpeakers[index] ?? null,
        `${route}.prepare.${name}`,
      ] as const
    ),
    [`${route}.prepare.sent`],
  );
  const prepare = prepareSpecs.map((spec, index) =>
    sayV1(spec, prepareSpecs[index + 1]?.[0] ?? `${route}-carrier-lock`)
  );
  const roofSpecs = withContinuedPagesV1(
    roofNames.map((name, index) =>
      [`${route}-roof-${name}`, roofSpeakers[index] ?? null, `${route}.roof.${name}`] as const
    ),
  );
  const shutdownIndex = roofSpecs.findIndex((spec) => spec[2] === `${route}.roof.shutdown`);
  if (shutdownIndex < 0) throw new TypeError(`vn-reference-tour.route_shutdown_missing:${route}`);
  const roofBeforeShutdownSpecs = roofSpecs.slice(0, shutdownIndex);
  const shutdownSpecs = roofSpecs.slice(shutdownIndex);
  const roofBeforeShutdown = roofBeforeShutdownSpecs.map((spec, index) =>
    sayV1(spec, roofBeforeShutdownSpecs[index + 1]?.[0] ?? `${route}-signal-off`)
  );
  const shutdown = shutdownSpecs.map((spec, index) =>
    sayV1(spec, shutdownSpecs[index + 1]?.[0] ?? `${route}-ending-title`)
  );
  return [
    ...prepare,
    {
      kind: "hold" as const,
      name: `${route}-carrier-lock`,
      durationMs: 1_200,
      tickQuantumMs: 200,
      skippable: true,
      next: `${route}-open-rooftop`,
    },
    {
      kind: "stage" as const,
      name: `${route}-appearance`,
      ops: [{
        setAppearance: {
          layerId: vnReferenceTourLayersV1.characters,
          tag: appearance.tag,
          appearance: { expression: appearance.expression },
        },
      }],
      next: `${route}-roof-stairs`,
    },
    {
      kind: "stage" as const,
      name: `${route}-open-rooftop`,
      ops: [{ scene: "rooftopAntenna", open: true as const }],
      next: `${route}-appearance`,
    },
    ...roofBeforeShutdown,
    {
      kind: "stage" as const,
      name: `${route}-signal-off`,
      ops: [{ scene: "rooftopAntenna", cue: "statusLightOff" }],
      next: `${route}-roof-shutdown`,
    },
    ...shutdown,
    {
      kind: "say" as const,
      name: `${route}-ending-title`,
      speaker: null,
      textId: textIdV1(`${route}.ending.title`),
      next: `${route}-close`,
    },
    { kind: "end" as const, name: `${route}-close` },
  ];
}

/** 51 shared Say pages + one prompt/two options + 28 visible pages per route. */
export const vnReferenceTourStoryDocV1: VnReferenceTourInteractionDocV1 = {
  prefix: "vn-reference-tour",
  docId: "doc.vn-reference-tour.story",
  speakers: {
    lin: { textId: textIdV1("speaker.lin") },
    zhou: { textId: textIdV1("speaker.zhou") },
  },
  entry: "open-control-room",
  blocks: [
    ...sharedBlocksV1,
    ...routeBlocksV1("archive"),
    ...routeBlocksV1("present"),
  ],
};

export const vnReferenceTourCompiledStoryV1 = compileVnReferenceTourInteractionDocV1({
  doc: vnReferenceTourStoryDocV1,
  scenes: vnReferenceTourSceneRegistryV1,
});
export const vnReferenceTourScriptV1: readonly VnReferenceTourNarrativeNodeV1[] =
  vnReferenceTourCompiledStoryV1.nodes;

const nodesByIdV1: ReadonlyMap<string, VnReferenceTourNarrativeNodeV1> = new Map(
  vnReferenceTourScriptV1.map((node) => [node.nodeId, node]),
);
export const vnReferenceTourNodeIdsV1: readonly string[] = vnReferenceTourScriptV1.map((node) =>
  node.nodeId
);

function requireNodeV1(nodeId: string): VnReferenceTourNarrativeNodeV1 {
  const node = nodesByIdV1.get(nodeId);
  if (node === undefined) throw new TypeError(`vn-reference-tour.narrative_node_missing:${nodeId}`);
  return node;
}

export function vnReferenceTourChoiceOptionsForV1(
  definitionId: string,
): readonly VnReferenceTourChoiceOptionV1[] {
  for (const node of vnReferenceTourScriptV1) {
    if (node.kind === "choice" && node.definitionId === definitionId) return node.options;
  }
  return [];
}

export function vnReferenceTourInteractionContextV1(
  pending: PendingInteraction | null,
): InteractionResolutionContext {
  return {
    isChoiceEnabled(choiceId: string): boolean {
      if (pending === null || pending.kind !== "choice") return false;
      return vnReferenceTourChoiceOptionsForV1(pending.definitionId).some(
        (candidate) => candidate.choiceId === choiceId,
      );
    },
    isCustomPayloadValid(): boolean {
      return false;
    },
  };
}

export interface VnReferenceTourNarrativeRunResultV1 {
  readonly narrative: VnReferenceTourNarrativeStateV1;
  readonly stageMutations: readonly StageMutation[];
  readonly stageDispatches: readonly StageCueDispatch[];
}

function pendingForNodeV1(
  node: VnReferenceTourNarrativeNodeV1,
  sequence: number,
): PendingInteraction {
  const occurrenceId = interactionOccurrenceId(sequence);
  switch (node.kind) {
    case "say":
      return parsePendingInteraction({
        kind: "say",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        speakerTextId: node.speakerTextId,
        textId: node.textId,
        advancePolicy: "confirm",
      });
    case "choice":
      return parsePendingInteraction({
        kind: "choice",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        promptTextId: node.promptTextId,
        options: node.options.map(({ choiceId, textId }) => ({ choiceId, textId })),
      });
    case "hold":
      return parsePendingInteraction({
        kind: "hold",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        totalMs: node.durationMs,
        remainingMs: node.durationMs,
        ...(node.tickQuantumMs === undefined ? {} : { tickQuantumMs: node.tickQuantumMs }),
        skippable: node.skippable,
      });
    default:
      throw new TypeError(`vn-reference-tour.narrative_node_not_interactive:${node.nodeId}`);
  }
}

export function runVnReferenceTourNarrativeUntilInteractionV1(
  narrative: VnReferenceTourNarrativeStateV1,
  stage: SemanticStageState,
): VnReferenceTourNarrativeRunResultV1 {
  if (narrative.cursor === null) throw new TypeError("vn-reference-tour.narrative_cursor_missing");
  let cursor: string | null = narrative.cursor;
  let sequence = narrative.sequence;
  let localStage = stage;
  const collected: StageMutation[] = [];
  const collectedDispatches: StageCueDispatch[] = [];
  for (let steps = 0; steps < 64; steps += 1) {
    if (cursor === null) break;
    const node = requireNodeV1(cursor);
    if (node.kind === "branch") {
      const next = node.choose({ signalChoice: narrative.signalChoice });
      if (!node.successors.includes(next)) {
        throw new TypeError(`vn-reference-tour.narrative_branch_invalid:${node.nodeId}`);
      }
      cursor = next;
      continue;
    }
    if (node.kind === "stage") {
      const mutations = node.mutations(localStage);
      if (mutations.length > 0) {
        const outcome = reduceAdmittedStageMutations(localStage, mutations);
        if (outcome.kind !== "applied") {
          throw new TypeError(`vn-reference-tour.narrative_stage_invalid:${node.nodeId}`);
        }
        localStage = outcome.state;
        collected.push(...mutations);
        collectedDispatches.push(...node.dispatches);
      }
      cursor = node.next;
      continue;
    }
    if (node.kind === "end") {
      return ({
        narrative: {
          phase: "completed" as const,
          cursor: null,
          pending: null,
          sequence,
          signalChoice: narrative.signalChoice,
          history: narrative.history,
        },
        stageMutations: collected,
        stageDispatches: collectedDispatches,
      });
    }
    sequence += 1;
    return ({
      narrative: {
        phase: "active" as const,
        cursor: node.nodeId,
        pending: pendingForNodeV1(node, sequence),
        sequence,
        signalChoice: narrative.signalChoice,
        history: narrative.history,
      },
      stageMutations: collected,
      stageDispatches: collectedDispatches,
    });
  }
  throw new TypeError("vn-reference-tour.narrative_runaway_script");
}

export function vnReferenceTourNarrativeAfterResolutionV1(
  narrative: VnReferenceTourNarrativeStateV1,
  resolution: InteractionResolution,
): VnReferenceTourNarrativeStateV1 {
  const pending = narrative.pending;
  if (pending === null || narrative.cursor === null) {
    throw new TypeError("vn-reference-tour.narrative_nothing_pending");
  }
  const node = requireNodeV1(narrative.cursor);
  let next: string;
  let signalChoice = narrative.signalChoice;
  let history = narrative.history;
  if (node.kind === "choice" && resolution.kind === "choose") {
    const option = node.options.find((candidate) => candidate.choiceId === resolution.choiceId);
    if (option === undefined) throw new TypeError("vn-reference-tour.narrative_choice_missing");
    next = option.next;
    signalChoice = option.setSignalChoice ?? signalChoice;
    history = appendNarrativeHistory(history, {
      kind: "choice",
      occurrenceId: pending.occurrenceId,
      definitionId: pending.definitionId,
      seenRevision: pending.seenRevision,
      speakerTextId: null,
      textId: option.textId,
      voiceAssetId: null,
    });
  } else if (node.kind === "say") {
    next = node.next;
    history = appendNarrativeHistory(history, {
      kind: "say",
      occurrenceId: pending.occurrenceId,
      definitionId: pending.definitionId,
      seenRevision: pending.seenRevision,
      speakerTextId: node.speakerTextId,
      textId: node.textId,
      voiceAssetId: null,
    });
  } else {
    throw new TypeError(`vn-reference-tour.narrative_resolution_mismatch:${node.nodeId}`);
  }
  return ({
    phase: "active" as const,
    cursor: next,
    pending: null,
    sequence: narrative.sequence,
    signalChoice,
    history,
  });
}

export type VnReferenceTourNarrativeTimeContinuationV1 =
  | { readonly kind: "advanced"; readonly narrative: VnReferenceTourNarrativeStateV1 }
  | { readonly kind: "holding"; readonly narrative: VnReferenceTourNarrativeStateV1 };

export function vnReferenceTourNarrativeAfterTimeTickV1(
  narrative: VnReferenceTourNarrativeStateV1,
  tick: TimeTick,
): VnReferenceTourNarrativeTimeContinuationV1 {
  const pending = narrative.pending;
  if (pending === null || pending.kind !== "hold" || narrative.cursor === null) {
    throw new TypeError("vn-reference-tour.narrative_no_hold_pending");
  }
  const node = requireNodeV1(narrative.cursor);
  if (node.kind !== "hold") {
    throw new TypeError(`vn-reference-tour.narrative_resolution_mismatch:${node.nodeId}`);
  }
  const outcome = settleHoldTimeline({ pending, elapsedMs: tick.elapsedMs });
  if (outcome.kind === "holding") {
    return ({ kind: "holding" as const, narrative: { ...narrative, pending: outcome.pending } });
  }
  if (outcome.kind === "rerouted") {
    throw new TypeError("vn-reference-tour.unexpected_hold_reroute");
  }
  return ({
    kind: "advanced" as const,
    narrative: {
      phase: "active" as const,
      cursor: node.next,
      pending: null,
      sequence: narrative.sequence,
      signalChoice: narrative.signalChoice,
      history: narrative.history,
    },
  });
}

export function vnReferenceTourNarrativeAtBeginV1(
  narrative: VnReferenceTourNarrativeStateV1,
): VnReferenceTourNarrativeStateV1 {
  return ({
    phase: "active" as const,
    cursor: vnReferenceTourEntryNodeIdV1,
    pending: null,
    sequence: narrative.sequence,
    signalChoice: null,
    history: narrative.history,
  });
}
