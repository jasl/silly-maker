// SPDX-License-Identifier: MIT
import { lazy, Suspense } from "react";
import type { ReactElement } from "react";

import type { DevDockPanelV1 } from "./dev-dock.tsx";
import type { StateTunerPortV1 } from "./state-tuner.ts";
import { engineStateInspectorPanelIdV1, engineStateTunerPanelIdV1 } from "./state-tuner.ts";

const LazyEngineStateInspectorPanelV1 = lazy(async () => {
  const mod = await import("./state-tuner-panel.tsx");
  return { default: mod.EngineStateInspectorPanelV1 };
});

const LazyEngineStateTunerPanelV1 = lazy(async () => {
  const mod = await import("./state-tuner-panel.tsx");
  return { default: mod.EngineStateTunerPanelV1 };
});

const reservedEngineStatePanelIdsV1 = new Set<string>([
  engineStateInspectorPanelIdV1,
  engineStateTunerPanelIdV1,
]);

export function createEngineStateTunerPanelsV1(
  port: StateTunerPortV1,
): readonly DevDockPanelV1[] {
  return Object.freeze([
    Object.freeze({
      id: engineStateInspectorPanelIdV1,
      side: "left" as const,
      title: "状态查看",
      authority: "read_only" as const,
      render: () => <SuspendedEnginePanelV1 port={port} kind="inspector" />,
    }),
    Object.freeze({
      id: engineStateTunerPanelIdV1,
      side: "left" as const,
      title: "状态编辑",
      authority: "cheat" as const,
      render: () => <SuspendedEnginePanelV1 port={port} kind="tuner" />,
    }),
  ]);
}

export function mergeEngineStateTunerPanelsV1(
  storyPanels: readonly DevDockPanelV1[],
  port: StateTunerPortV1 | undefined,
): readonly DevDockPanelV1[] {
  if (port === undefined) return storyPanels;
  const filtered = storyPanels.filter((panel) => !reservedEngineStatePanelIdsV1.has(panel.id));
  return Object.freeze([...createEngineStateTunerPanelsV1(port), ...filtered]);
}

function SuspendedEnginePanelV1(props: {
  readonly port: StateTunerPortV1;
  readonly kind: "inspector" | "tuner";
}): ReactElement {
  switch (props.kind) {
    case "inspector":
      return (
        <Suspense fallback={null}>
          <LazyEngineStateInspectorPanelV1 port={props.port} />
        </Suspense>
      );
    case "tuner":
      return (
        <Suspense fallback={null}>
          <LazyEngineStateTunerPanelV1 port={props.port} />
        </Suspense>
      );
    default: {
      const exhaustive: never = props.kind;
      throw exhaustive;
    }
  }
}
