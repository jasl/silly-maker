// SPDX-License-Identifier: MIT
import {
  DefaultSettingsSectionsV1,
  ReferenceDevDockV1,
  defaultSettingsLabelsV1,
  type DefaultSettingsLabelsV1,
  type DevDockContributionLoadHandleV1,
  type ReferenceDevDockPropsV1,
} from "@sillymaker/ui/reference";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

type ReferenceDevDockLoadHandleKeysV1 = ExpectV1<
  EqualV1<
    keyof DevDockContributionLoadHandleV1,
    "contributions" | "acknowledgeCommitted" | "dispose"
  >
>;

type ReferenceRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/reference"),
    | "DefaultSettingsSectionsV1"
    | "ReferenceDevDockV1"
    | "createDevDockContributionSetV1"
    | "createDevDockControlV1"
    | "defaultSettingsLabelsV1"
  >
>;
type ReferenceSettingsRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/reference/settings"),
    "DefaultSettingsSectionsV1" | "defaultSettingsLabelsV1"
  >
>;
type ReferenceDevDockRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/reference/dev-dock"),
    "ReferenceDevDockV1" | "createDevDockContributionSetV1" | "createDevDockControlV1"
  >
>;
DefaultSettingsSectionsV1;
ReferenceDevDockV1;
defaultSettingsLabelsV1;

export type {
  DefaultSettingsLabelsV1,
  DevDockContributionLoadHandleV1,
  ReferenceDevDockLoadHandleKeysV1,
  ReferenceDevDockPropsV1,
  ReferenceDevDockRuntimeKeysV1,
  ReferenceRuntimeKeysV1,
  ReferenceSettingsRuntimeKeysV1,
};

// @ts-expect-error reference DevDock stays outside the required UI root graph
export { ReferenceDevDockV1 as ForbiddenRootReferenceDevDockV1 } from "@sillymaker/ui";
// @ts-expect-error preset settings stay outside the required UI root graph
export { DefaultSettingsSectionsV1 as ForbiddenRootSettingsV1 } from "@sillymaker/ui";
