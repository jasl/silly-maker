// SPDX-License-Identifier: MIT
import type { ComponentType } from "react";
import type { CoreRollbackPortV1 } from "@sillymaker/base/runtime";

import type { HeldInputPortV1, HeldKeyMapV1 } from "../input/held-key-adapter.ts";
import type { KeyboardActionMapV1 } from "../input/keyboard-adapter.ts";
import type { PointerActionMapV1 } from "../input/pointer-button-adapter.ts";
import type {
  NarrativeSurfaceDialogueRendererPropsV1,
  NarrativeSurfaceHistoryFeatureV1,
  NarrativeSurfaceHistoryRendererPropsV1,
} from "../narrative/narrative-surface-composition.tsx";
import {
  createDefaultVnPlayerCoreInternalV1,
  defaultVnPlayerCoreLabelsV1,
  type DefaultVnPlayerCoreLabelKeyV1,
  type DefaultVnPlayerCoreLabelsV1,
} from "./default-vn-player-core.tsx";
import {
  defaultVnPlayerHistoryLabelsInternalV1,
  DefaultVnPlayerHistoryOpenControlInternalV1,
  DefaultVnPlayerHistoryRendererInternalV1,
  type DefaultVnPlayerHistoryLabelKeyInternalV1,
  type DefaultVnPlayerHistoryLabelsInternalV1,
} from "./default-vn-player-history.tsx";

export interface DefaultVnPlayerLabelsV1 extends DefaultVnPlayerCoreLabelsV1 {
  readonly history: string;
  readonly historyTitle: string;
  readonly historyEmpty: string;
  readonly historyClose: string;
}

export type DefaultVnPlayerLabelKeyV1 = keyof DefaultVnPlayerLabelsV1;

export const defaultVnPlayerLabelsV1: DefaultVnPlayerLabelsV1 = {
  ...defaultVnPlayerCoreLabelsV1,
  ...defaultVnPlayerHistoryLabelsInternalV1,
};

export interface CreateDefaultVnPlayerInputV1 {
  readonly heldInput: HeldInputPortV1;
  readonly rollback: CoreRollbackPortV1;
  /** Optional product text IDs, resolved through the Narrative text resolver on every render. */
  readonly labelTextIds?: Readonly<Partial<Record<DefaultVnPlayerLabelKeyV1, string>>>;
}

export interface DefaultVnPlayerV1 {
  readonly renderer: ComponentType<NarrativeSurfaceDialogueRendererPropsV1>;
  readonly history: NarrativeSurfaceHistoryFeatureV1;
  readonly input: Readonly<{
    readonly keyboard: KeyboardActionMapV1;
    readonly held: HeldKeyMapV1;
    readonly pointer: PointerActionMapV1;
  }>;
}

function resolveHistoryLabelsInternalV1(
  props: Readonly<{ readonly resolveText: (textId: string) => string }>,
  textIds: CreateDefaultVnPlayerInputV1["labelTextIds"],
): DefaultVnPlayerHistoryLabelsInternalV1 {
  const resolve = (key: DefaultVnPlayerHistoryLabelKeyInternalV1): string => {
    const textId = textIds?.[key];
    return textId === undefined
      ? defaultVnPlayerHistoryLabelsInternalV1[key]
      : props.resolveText(textId);
  };
  return {
    history: resolve("history"),
    historyTitle: resolve("historyTitle"),
    historyEmpty: resolve("historyEmpty"),
    historyClose: resolve("historyClose"),
  };
}

/**
 * Creates the engine-maintained full VN Player preset. The cohesive core owns
 * dialogue, playback, rollback, and system surfaces; this preset explicitly
 * composes the optional History presentation feature.
 */
export function createDefaultVnPlayerV1(input: CreateDefaultVnPlayerInputV1): DefaultVnPlayerV1 {
  const core = createDefaultVnPlayerCoreInternalV1(
    {
      heldInput: input.heldInput,
      rollback: input.rollback,
      ...(input.labelTextIds === undefined ? {} : {
        labelTextIds: input.labelTextIds as Readonly<
          Partial<Record<DefaultVnPlayerCoreLabelKeyV1, string>>
        >,
      }),
    },
    (renderer) => (
      <DefaultVnPlayerHistoryOpenControlInternalV1
        renderer={renderer}
        label={resolveHistoryLabelsInternalV1(renderer, input.labelTextIds).history}
      />
    ),
  );
  const HistoryRenderer = (
    props: NarrativeSurfaceHistoryRendererPropsV1,
  ) => (
    <DefaultVnPlayerHistoryRendererInternalV1
      {...props}
      labels={resolveHistoryLabelsInternalV1(props, input.labelTextIds)}
    />
  );
  return {
    renderer: core.renderer,
    history: { renderer: HistoryRenderer },
    input: core.input,
  };
}
