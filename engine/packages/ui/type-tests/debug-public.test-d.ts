// SPDX-License-Identifier: MIT
import type { ReactNode } from "react";
import {
  CapabilityPanelV1,
  DebugCommandPanelV1,
  DevDockPortalCoordinatorV1,
  DevDockV1,
  DiagnosticInspectorV1,
  FixtureBrowserV1,
  createDevDockContributionSetV1,
  type DevDockContributionSetV1,
  type DevDockPanelV1,
} from "@sillymaker/ui/debug";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

type DebugRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/debug"),
    | "CapabilityPanelV1"
    | "createAuthoringDocumentSessionV1"
    | "useAuthoringDocumentSessionV1"
    | "DebugCommandPanelV1"
    | "DebugNarrativeGraphViewV1"
    | "DebugValueInspectorV1"
    | "DevDockPortalCoordinatorV1"
    | "DevDockV1"
    | "DiagnosticInspectorV1"
    | "FixtureBrowserV1"
    | "MotionWorkbenchLauncherV1"
    | "MotionWorkbenchV1"
    | "StageProvenancePanelV1"
    | "StoryDebugDockV1"
    | "createDevDockContributionSetV1"
    | "createDevDockControlV1"
    | "createMotionSourceIndexV1"
    | "createMotionWorkbenchStoreV1"
    | "createStageInspectControllerV1"
    | "defaultStoryDebugDockLabelsV1"
    | "engineSessionMaintenancePanelIdV1"
    | "engineStateInspectorPanelIdV1"
    | "engineStateTunerPanelIdV1"
    | "EngineStateInspectorPanelV1"
    | "EngineStateTunerPanelV1"
  >
>;
type DebugDevSourceClientRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/debug/dev-source-client"),
    "createDevServerMotionIoV1" | "openStorySourceInDevServerV1"
  >
>;
type PanelKeysV1 = ExpectV1<
  EqualV1<keyof DevDockPanelV1, "authority" | "id" | "render" | "side" | "stage" | "title">
>;
type ContributionKeysV1 = ExpectV1<EqualV1<keyof DevDockContributionSetV1, "panels">>;

interface StoryLocalCommandV1 {
  readonly kind: "story.synthetic";
  readonly amount: number;
}

const storyPanelV1: DevDockPanelV1 = {
  id: "story.synthetic",
  side: "left",
  title: "Story 工具",
  authority: "cheat",
  render: (): ReactNode => null,
};
const contributionsV1: DevDockContributionSetV1 = createDevDockContributionSetV1({
  panels: [storyPanelV1],
});
const commandV1: StoryLocalCommandV1 = { kind: "story.synthetic", amount: 1 };

CapabilityPanelV1;
DebugCommandPanelV1<StoryLocalCommandV1>;
DevDockPortalCoordinatorV1;
DevDockV1;
DiagnosticInspectorV1;
FixtureBrowserV1<string>;
contributionsV1;
commandV1;

// @ts-expect-error DevDock is available only from the dedicated debug subpath
export { DevDockV1 as ForbiddenRootDevDockV1 } from "@sillymaker/ui";
// @ts-expect-error Story debug dock lives on the dedicated debug subpath
export { StoryDebugDockV1 as ForbiddenRootStoryDebugDockV1 } from "@sillymaker/ui";
// @ts-expect-error Snapshot authority is not part of the neutral debug UI subpath
export type { GameSnapshotEnvelopeV1 as ForbiddenSnapshotV1 } from "@sillymaker/ui/debug";
// @ts-expect-error GameSession authority is not part of the neutral debug UI subpath
export type { GameSessionV1 as ForbiddenGameSessionV1 } from "@sillymaker/ui/debug";
// @ts-expect-error module event reducers are not part of the neutral debug UI subpath
export type { ModuleEventReducerMapV1 as ForbiddenReducersV1 } from "@sillymaker/ui/debug";
// @ts-expect-error concrete Story commands never enter the neutral debug UI subpath
export type { PocDebugCommandV1 as ForbiddenPocCommandV1 } from "@sillymaker/ui/debug";
// @ts-expect-error concrete E2E state never enters the neutral debug UI subpath
export type { E2eGameStateV1 as ForbiddenE2eStateV1 } from "@sillymaker/ui/debug";

export type {
  ContributionKeysV1,
  DebugDevSourceClientRuntimeKeysV1,
  DebugRuntimeKeysV1,
  PanelKeysV1,
};
