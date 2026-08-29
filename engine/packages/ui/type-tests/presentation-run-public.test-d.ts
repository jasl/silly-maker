// SPDX-License-Identifier: MIT
import {
  createPresentationRngStreamV1 as createRootPresentationRngStreamV1,
  derivePresentationSeedV1 as deriveRootPresentationSeedV1,
  type PresentationRngStateV1 as RootPresentationRngStateV1,
  type PresentationRngStreamV1 as RootPresentationRngStreamV1,
} from "@sillymaker/ui";
import {
  createPresentationRngStreamV1,
  derivePresentationSeedV1,
  type PresentationRngStateV1,
  type PresentationRngStreamV1,
} from "@sillymaker/ui/presentation-run";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

type FocusedRuntimeExportsV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/presentation-run"),
    | "createAnimationFramePresentationClockV1"
    | "createManualPresentationClockV1"
    | "createPresentationFreezePortV1"
    | "createPresentationRatePortV1"
    | "createPresentationRngStreamV1"
    | "createPresentationRunV1"
    | "createSessionTimeReporterV1"
    | "derivePresentationSeedV1"
    | "easeInOutV1"
  >
>;
type RngStateKeysV1 = ExpectV1<
  EqualV1<keyof PresentationRngStateV1, "algorithm" | "cursor">
>;
type RngStreamKeysV1 = ExpectV1<
  EqualV1<keyof PresentationRngStreamV1, "nextInt" | "nextIntInRange" | "nextUint32" | "state">
>;
type RootStateMatchesV1 = ExpectV1<
  EqualV1<RootPresentationRngStateV1, PresentationRngStateV1>
>;
type RootStreamMatchesV1 = ExpectV1<
  EqualV1<RootPresentationRngStreamV1, PresentationRngStreamV1>
>;

const rootStreamFactoryV1: typeof createPresentationRngStreamV1 = createRootPresentationRngStreamV1;
const rootSeedFactoryV1: typeof derivePresentationSeedV1 = deriveRootPresentationSeedV1;

const seedV1 = derivePresentationSeedV1(["occ.synthetic.1", "effect.synthetic", 1]);
const streamV1 = createPresentationRngStreamV1(seedV1);
streamV1.nextUint32();
streamV1.nextInt(8);
streamV1.nextIntInRange(-2, 2);
createPresentationRngStreamV1(streamV1.state());

rootStreamFactoryV1;
rootSeedFactoryV1;

export type {
  FocusedRuntimeExportsV1,
  RngStateKeysV1,
  RngStreamKeysV1,
  RootStateMatchesV1,
  RootStreamMatchesV1,
};
