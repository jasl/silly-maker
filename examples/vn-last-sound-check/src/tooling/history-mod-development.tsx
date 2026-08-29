// SPDX-License-Identifier: MIT
import { useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import {
  createSillyModSelectionControllerV1,
  defineSillyModMetadataV1,
  type SillyModSelectionControllerV1,
  type SillyModSelectionV1,
  type SillyModSourceV1,
} from "@sillymaker/composition/mod";
import type {
  DevDockContributionLoadHandleV1,
  DevDockContributionSetV1,
} from "@sillymaker/ui/reference/dev-dock";
import {
  type VnHistoryPresentationBridgeV1,
  type VnHistoryPresentationV1,
} from "@sillymaker/vn/ui";

interface VnHistoryModContributionV1 {
  readonly presentation: VnHistoryPresentationV1;
}

type VnHistoryModCompiledPointV1 = VnHistoryPresentationV1 | null;

type VnHistoryModuleV1 = Pick<
  typeof import("@sillymaker/vn/history"),
  "createDefaultVnPlayerHistoryV1"
>;

export interface CreateVnLastSoundCheckHistoryModDevelopmentInputV1 {
  readonly applicationGeneration: string;
  readonly bridge: VnHistoryPresentationBridgeV1;
  readonly labelTextIds: Readonly<Record<string, string>>;
  readonly reportFailure: (code: string, error: unknown) => void;
  /** Test seam; production development builds use the literal import below. */
  readonly loadHistoryModule?: () => Promise<VnHistoryModuleV1>;
}

interface VnLastSoundCheckHistoryModDevelopmentOwnerV1 {
  readonly contributions: DevDockContributionSetV1;
  load(): Promise<void>;
  unload(): Promise<void>;
  ready(): Promise<void>;
  isLoaded(): boolean;
  dispose(): Promise<void>;
}

const historyModIdV1 = "vn-last-sound-check.history";
const historyPointIdV1 = "vn.presentation.history";
const historyContributionKindV1 = "vn.history.presentation";

function defaultLoadHistoryModuleV1(): Promise<VnHistoryModuleV1> {
  return import("@sillymaker/vn/history");
}

function selectedHistoryPresentationV1(
  selection: SillyModSelectionV1<VnHistoryModCompiledPointV1>,
): VnHistoryPresentationV1 | null {
  const point = selection.compiledPoints.find((candidate) =>
    candidate.pointId === historyPointIdV1
  );
  if (point === undefined) {
    throw new TypeError("vn-last-sound-check.history_mod_point_missing");
  }
  return point.value;
}

function isHistorySelectedV1(
  controller: SillyModSelectionControllerV1<
    VnHistoryModContributionV1,
    VnHistoryModCompiledPointV1
  >,
): boolean {
  return controller.getCurrent()?.activeIdentity.some((entry) => entry.modId === historyModIdV1) ??
    false;
}

function HistoryModDevelopmentPanelV1(props: {
  readonly owner: VnLastSoundCheckHistoryModDevelopmentOwnerV1;
  readonly controller: SillyModSelectionControllerV1<
    VnHistoryModContributionV1,
    VnHistoryModCompiledPointV1
  >;
  readonly reportFailure: (code: string, error: unknown) => void;
}): ReactElement {
  const lifecycle = useSyncExternalStore(
    props.controller.subscribe,
    props.controller.getState,
    props.controller.getState,
  );
  const [operationError, setOperationError] = useState<string | null>(null);
  const busy = lifecycle.kind === "loading";
  const loaded = props.owner.isLoaded();
  const run = (operation: () => Promise<void>): void => {
    setOperationError(null);
    void operation().catch((error: unknown) => {
      props.reportFailure("vn-last-sound-check.history_mod_operation_failed", error);
      setOperationError(error instanceof Error ? error.message : String(error));
    });
  };
  return (
    <section data-vn-history-mod-development="true">
      <p role="status" data-vn-history-mod-status={busy ? "changing" : loaded ? "loaded" : "idle"}>
        {busy ? "正在切换 History…" : loaded ? "History 已加载" : "History 未加载"}
      </p>
      <div>
        <button
          type="button"
          data-vn-history-mod-load="true"
          disabled={busy || loaded}
          onClick={() => run(props.owner.load)}
        >
          加载 History
        </button>
        <button
          type="button"
          data-vn-history-mod-unload="true"
          disabled={busy || !loaded}
          onClick={() => run(props.owner.unload)}
        >
          卸载 History
        </button>
      </div>
      {operationError === null ? null : <p role="alert">{operationError}</p>}
      <p>History 是可选展示 Mod；卸载不会删除 Narrative 持有的对话记录。</p>
    </section>
  );
}

function createVnLastSoundCheckHistoryModDevelopmentOwnerV1(
  input: CreateVnLastSoundCheckHistoryModDevelopmentInputV1,
): VnLastSoundCheckHistoryModDevelopmentOwnerV1 {
  const bridge = input.bridge;
  const loadHistoryModule = input.loadHistoryModule ?? defaultLoadHistoryModuleV1;
  const historyMetadata = defineSillyModMetadataV1({
    contractRevision: 1,
    modId: historyModIdV1,
    version: "1.0.0",
    engineApi: { composition: "^1.0.0" },
    dependencies: { requires: [], optional: [], conflicts: [] },
    facets: ["ui"],
  });
  const historySource: SillyModSourceV1<VnHistoryModContributionV1> = {
    kind: "code",
    metadata: historyMetadata,
    async load() {
      const historyModule = await loadHistoryModule();
      return {
        contributions: [
          {
            contributionId: "default",
            pointId: historyPointIdV1,
            contributionKind: historyContributionKindV1,
            payload: {
              presentation: historyModule.createDefaultVnPlayerHistoryV1({
                labelTextIds: input.labelTextIds,
              }),
            },
          },
        ],
      };
    },
  };
  const catalog = [historySource] as const;
  const controller = createSillyModSelectionControllerV1<
    VnHistoryModContributionV1,
    VnHistoryModCompiledPointV1
  >({
    applicationGeneration: input.applicationGeneration,
    engineApi: { composition: "1.0.0" },
    extensionPoints: [
      {
        pointId: historyPointIdV1,
        contributionKind: historyContributionKindV1,
        collisionPolicy: "reject",
        compile({ contributions }) {
          if (contributions.length === 0) return null;
          if (contributions.length !== 1) {
            throw new TypeError("vn-last-sound-check.history_mod_contribution_ambiguous");
          }
          return contributions[0]!.payload.presentation;
        },
      },
    ],
    onLifecycleDiagnostic: (diagnostic) =>
      input.reportFailure("vn-last-sound-check.history_mod_cleanup_failed", diagnostic),
  });
  let nextSelectionGeneration = 1;
  let disposeRequested = false;
  let disposePromise: Promise<void> | null = null;
  let serial: Promise<void> = controller.activate({
    selectionGeneration: nextSelectionGeneration++,
    catalog,
    activeModIds: [],
  }).then(() => {});
  serial.catch((error: unknown) =>
    input.reportFailure("vn-last-sound-check.history_mod_initialization_failed", error)
  );

  const enqueue = (operation: () => Promise<void>): Promise<void> => {
    if (disposeRequested) {
      return Promise.reject(new TypeError("vn-last-sound-check.history_mod_disposed"));
    }
    const result = serial.then(operation);
    serial = result.catch(() => undefined);
    return result;
  };
  const restart = async (active: boolean): Promise<void> => {
    if (isHistorySelectedV1(controller) === active) return;
    await controller.restart(
      {
        selectionGeneration: nextSelectionGeneration++,
        catalog,
        activeModIds: active ? [historyModIdV1] : [],
      },
      async (candidate) => {
        const presentation = selectedHistoryPresentationV1(candidate);
        if (active && presentation === null) {
          throw new TypeError("vn-last-sound-check.history_mod_presentation_missing");
        }
        await bridge.publish(presentation);
      },
    );
  };

  const owner: VnLastSoundCheckHistoryModDevelopmentOwnerV1 = {
    contributions: {
      panels: [
        {
          id: "vn-last-sound-check.history-mod",
          side: "right",
          title: "History Mod",
          authority: "read_only",
          render: () => (
            <HistoryModDevelopmentPanelV1
              owner={owner}
              controller={controller}
              reportFailure={input.reportFailure}
            />
          ),
        },
      ],
    },
    load: () => enqueue(() => restart(true)),
    unload: () => enqueue(() => restart(false)),
    ready: () => serial,
    isLoaded: () => isHistorySelectedV1(controller),
    dispose() {
      if (disposePromise !== null) return disposePromise;
      disposeRequested = true;
      const disposing = serial.catch(() => undefined).then(async () => {
        try {
          await bridge.publish(null);
        } finally {
          await controller.dispose();
        }
      });
      disposePromise = disposing;
      return disposing;
    },
  };
  return owner;
}

/**
 * Interaction-lazy DevDock entry for the optional History presentation Mod.
 * The resident application owns only the stable bridge; this loaded handle
 * owns the selection controller and its panel until the Host retires it.
 */
export async function loadVnLastSoundCheckHistoryModDevelopmentV1(
  input: CreateVnLastSoundCheckHistoryModDevelopmentInputV1,
): Promise<DevDockContributionLoadHandleV1> {
  const owner = createVnLastSoundCheckHistoryModDevelopmentOwnerV1(input);
  try {
    await owner.ready();
  } catch (error) {
    try {
      await owner.dispose();
    } catch (cleanupError) {
      input.reportFailure(
        "vn-last-sound-check.history_mod_initialization_cleanup_failed",
        cleanupError,
      );
    }
    throw error;
  }
  return {
    contributions: owner.contributions,
    dispose: () => owner.dispose(),
  };
}
