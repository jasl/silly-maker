// SPDX-License-Identifier: MIT
import type {
  InteractionResolutionContext,
  InteractionResolution,
  NarrativeHistory,
  PendingInteraction,
  SemanticStageState,
  TimeTick,
} from "@sillymaker/base/story";
import { emptyNarrativeHistory } from "@sillymaker/base/story";
import { createVnInteractionRuntimeV1 } from "@sillymaker/vn/interaction";

import type {
  VnLastSoundCheckChoiceEffectV1,
  VnLastSoundCheckChoiceOptionV1,
  VnLastSoundCheckInteractionDocV1,
  VnLastSoundCheckNarrativeNodeV1,
  VnLastSoundCheckPredicateV1,
  VnLastSoundCheckSceneBindingV1,
  VnLastSoundCheckSignalChoiceV1,
} from "./narrative-kit.ts";
import { compileVnLastSoundCheckInteractionDocV1 } from "./narrative-kit.ts";
import {
  vnLastSoundCheckControlRoomCueIdsV1,
  vnLastSoundCheckControlRoomSceneV1,
  vnLastSoundCheckLayersV1,
  vnLastSoundCheckTagsV1,
} from "../scenes/control-room/index.ts";
import {
  vnLastSoundCheckRooftopAntennaCueIdsV1,
  vnLastSoundCheckRooftopAntennaSceneV1,
} from "../scenes/rooftop-antenna/index.ts";

export type {
  VnLastSoundCheckChoiceOptionV1,
  VnLastSoundCheckNarrativeNodeV1,
  VnLastSoundCheckSignalChoiceV1,
} from "./narrative-kit.ts";
export { vnLastSoundCheckLayersV1, vnLastSoundCheckTagsV1 };

export interface VnLastSoundCheckNarrativeStateV1 {
  readonly phase: "idle" | "active" | "completed";
  readonly cursor: string | null;
  readonly pending: PendingInteraction | null;
  readonly sequence: number;
  readonly signalChoice: VnLastSoundCheckSignalChoiceV1 | null;
  readonly history: NarrativeHistory;
}

export function createInitialVnLastSoundCheckNarrativeStateV1(): VnLastSoundCheckNarrativeStateV1 {
  return ({
    phase: "idle" as const,
    cursor: null,
    pending: null,
    sequence: 0,
    signalChoice: null,
    history: emptyNarrativeHistory,
  });
}

export const vnLastSoundCheckEntryNodeIdV1 = "node.vn-last-sound-check.open-control-room";

export const vnLastSoundCheckContentIdsV1 = {
  backgroundControlRoom: "content.vn-last-sound-check.background.control-room",
  backgroundRooftopAntenna: "content.vn-last-sound-check.background.rooftop-antenna",
  characterLin: "content.vn-last-sound-check.character.lin",
  characterZhou: "content.vn-last-sound-check.character.zhou",
};

const vnLastSoundCheckSceneRegistryV1: Readonly<Record<string, VnLastSoundCheckSceneBindingV1>> = {
  controlRoom: {
    scene: vnLastSoundCheckControlRoomSceneV1,
    cues: vnLastSoundCheckControlRoomCueIdsV1,
  },
  rooftopAntenna: {
    scene: vnLastSoundCheckRooftopAntennaSceneV1,
    cues: vnLastSoundCheckRooftopAntennaCueIdsV1,
  },
};

const textIdV1 = (name: string): string => `text.vn-last-sound-check.${name}`;

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
): VnLastSoundCheckInteractionDocV1["blocks"][number] {
  return ({
    kind: "say" as const,
    name: spec[0],
    speaker: spec[1],
    textId: textIdV1(spec[2]),
    next,
  });
}

const sharedBlocksV1: VnLastSoundCheckInteractionDocV1["blocks"] = [
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
  route: VnLastSoundCheckSignalChoiceV1,
): VnLastSoundCheckInteractionDocV1["blocks"] {
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
    ? { tag: vnLastSoundCheckTagsV1.zhou, expression: "soft" }
    : { tag: vnLastSoundCheckTagsV1.lin, expression: "relieved" };
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
  if (shutdownIndex < 0) throw new TypeError(`vn-last-sound-check.route_shutdown_missing:${route}`);
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
          layerId: vnLastSoundCheckLayersV1.characters,
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
export const vnLastSoundCheckStoryDocV1: VnLastSoundCheckInteractionDocV1 = {
  prefix: "vn-last-sound-check",
  docId: "doc.vn-last-sound-check.story",
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

export const vnLastSoundCheckCompiledStoryV1 = compileVnLastSoundCheckInteractionDocV1({
  doc: vnLastSoundCheckStoryDocV1,
  scenes: vnLastSoundCheckSceneRegistryV1,
});

export const vnLastSoundCheckScriptV1: readonly VnLastSoundCheckNarrativeNodeV1[] =
  vnLastSoundCheckCompiledStoryV1.nodes;

const vnLastSoundCheckNarrativeRuntimeV1 = createVnInteractionRuntimeV1<
  VnLastSoundCheckNarrativeStateV1,
  VnLastSoundCheckChoiceEffectV1,
  VnLastSoundCheckPredicateV1
>({
  entryNodeId: vnLastSoundCheckCompiledStoryV1.entryNodeId,
  nodes: vnLastSoundCheckCompiledStoryV1.nodes,
  errorPrefix: "vn-last-sound-check",
  historyRetentionEntries: vnLastSoundCheckCompiledStoryV1.nodes.length,
  matchesPredicate: (state, predicate) => state.signalChoice === predicate.signalChoice,
  applyChoiceEffect: (state, effect) => ({
    ...state,
    signalChoice: effect.setSignalChoice ?? state.signalChoice,
  }),
  onBegin: (state) => ({ ...state, signalChoice: null }),
});

export const vnLastSoundCheckNodeIdsV1: readonly string[] =
  vnLastSoundCheckNarrativeRuntimeV1.nodeIds;

export function vnLastSoundCheckChoiceOptionsForV1(
  definitionId: string,
): readonly VnLastSoundCheckChoiceOptionV1[] {
  return vnLastSoundCheckNarrativeRuntimeV1.choiceOptionsFor(definitionId);
}

export function vnLastSoundCheckInteractionContextV1(
  pending: PendingInteraction | null,
): InteractionResolutionContext {
  return {
    isChoiceEnabled(choiceId: string): boolean {
      if (pending === null || pending.kind !== "choice") return false;
      return vnLastSoundCheckChoiceOptionsForV1(pending.definitionId).some(
        (candidate) => candidate.choiceId === choiceId,
      );
    },
    isCustomPayloadValid(): boolean {
      return false;
    },
  };
}

export type VnLastSoundCheckNarrativeRunResultV1 = ReturnType<
  typeof vnLastSoundCheckNarrativeRuntimeV1.runUntilInteraction
>;

export function runVnLastSoundCheckNarrativeUntilInteractionV1(
  narrative: VnLastSoundCheckNarrativeStateV1,
  stage: SemanticStageState,
): VnLastSoundCheckNarrativeRunResultV1 {
  return vnLastSoundCheckNarrativeRuntimeV1.runUntilInteraction(narrative, stage);
}

export function vnLastSoundCheckNarrativeAfterResolutionV1(
  narrative: VnLastSoundCheckNarrativeStateV1,
  resolution: InteractionResolution,
): VnLastSoundCheckNarrativeStateV1 {
  return vnLastSoundCheckNarrativeRuntimeV1.afterResolution(narrative, resolution);
}

export type VnLastSoundCheckNarrativeTimeContinuationV1 = ReturnType<
  typeof vnLastSoundCheckNarrativeRuntimeV1.afterTimeTick
>;

export function vnLastSoundCheckNarrativeAfterTimeTickV1(
  narrative: VnLastSoundCheckNarrativeStateV1,
  tick: TimeTick,
): VnLastSoundCheckNarrativeTimeContinuationV1 {
  return vnLastSoundCheckNarrativeRuntimeV1.afterTimeTick(narrative, tick);
}

export function vnLastSoundCheckNarrativeAtBeginV1(
  narrative: VnLastSoundCheckNarrativeStateV1,
): VnLastSoundCheckNarrativeStateV1 {
  return vnLastSoundCheckNarrativeRuntimeV1.atBegin(narrative);
}
