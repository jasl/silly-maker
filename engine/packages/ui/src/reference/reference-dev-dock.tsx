// SPDX-License-Identifier: MIT
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactElement, ReactNode } from "react";

import type { RuntimeCapabilityPortV1, SessionFaultCauseV1 } from "@sillymaker/base";

import {
  combineDevDockContributionSetsInternalV1,
  createDevDockContributionSetV1,
  DevDockV1,
} from "../debug/dev-dock.tsx";
import type {
  DevDockContributionSetV1,
  DevDockOpenStateV1,
  DevDockPositionV1,
} from "../debug/dev-dock.tsx";
import { createDevDockControlV1 } from "../debug/dev-dock-control.ts";
import type { DevDockControlV1 } from "../debug/dev-dock-control.ts";
import { StoryDebugDockV1 } from "../debug/story-debug-dock.tsx";
import { mergeEngineStateTunerPanelsV1 } from "../debug/state-tuner-contributions.tsx";
import type { StateTunerPortV1 } from "../debug/state-tuner.ts";
import { createEmbeddedAuthoringLauncherPortInternalV1 } from "../internal/embedded-authoring-launcher.ts";
import type { InputRouterV1 } from "../input/contracts.ts";
import type { SaveOverlayPortV1 } from "../persistence/save-overlay.tsx";
import type { PresentationFreezePortV1 } from "../presentation-run/presentation-freeze.ts";
import type { PresentationRatePortV1 } from "../presentation-run/presentation-rate.ts";
import type {
  DevDockContributionPublicationPortV1,
  DevDockContributionPublicationV1,
} from "./dev-dock-contribution-publication.ts";
import styles from "./reference-dev-dock.module.css";

const closedDevDockStateV1 = { open: false } satisfies DevDockOpenStateV1;
const openedDevDockStateV1 = { open: true } satisfies DevDockOpenStateV1;
const devDockLoadFailureDiagnosticV1 = "ui.devdock_contribution_load_failed";
const emptyPublishedContributionsV1 = createDevDockContributionSetV1({ panels: [] });
const emptyContributionPublicationV1: DevDockContributionPublicationV1 = {
  contributions: emptyPublishedContributionsV1,
};
const emptyContributionPublicationPortV1: DevDockContributionPublicationPortV1 = {
  getCurrent: () => emptyContributionPublicationV1,
  subscribe: () => () => undefined,
  acknowledgeCommitted: () => undefined,
};

/**
 * Ownership result for one interaction-lazy DevDock contribution load.
 * The reference Host admits `contributions` once, acknowledges the handle only
 * after its registry commits, and disposes it when that selected result retires.
 */
export interface DevDockContributionLoadHandleV1 {
  readonly contributions: DevDockContributionSetV1;
  acknowledgeCommitted?(): void;
  dispose?(): void | PromiseLike<void>;
}

type DevDockLazyLoadStateV1 =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | {
    readonly kind: "ready";
    readonly handle: DevDockContributionLoadHandleV1;
  }
  | { readonly kind: "error" };

interface DevDockLoadAttemptV1 {
  readonly generation: number;
}

function releaseDevDockContributionsObservationallyV1(
  handle: DevDockContributionLoadHandleV1,
): void {
  void Promise.resolve().then(() => handle.dispose?.()).catch(() => {
    // Cleanup is best-effort at this React boundary. The owning handle keeps
    // disposal idempotent/joinable when its lifecycle needs those semantics.
  });
}

function releaseDevDockContributionsAfterCommitV1(
  handles: readonly DevDockContributionLoadHandleV1[],
): void {
  if (handles.length === 0) return;
  queueMicrotask(() => {
    for (const handle of handles) {
      releaseDevDockContributionsObservationallyV1(handle);
    }
  });
}

/**
 * The optional reference developer surface. Products may compose it as-is,
 * wrap it, or copy/eject it without coupling the default game root to debug UI.
 */
export interface ReferenceDevDockPropsV1 {
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly contributions: DevDockContributionSetV1;
  /** Current successor-published tooling contributions, if selected. */
  readonly contributionPublication?: DevDockContributionPublicationPortV1;
  readonly inputRouter: InputRouterV1;
  readonly load?: () => Promise<DevDockContributionLoadHandleV1>;
  readonly observeOpenState?: (state: DevDockOpenStateV1) => void;
  readonly position?: DevDockPositionV1;
  readonly chip?: boolean;
  readonly movableChip?: boolean;
  /** @internal Reports a movable launcher's committed Host-surface corner. */
  onPositionChangeInternalV1?(position: DevDockPositionV1): void;
  /** Opens the launcher menu on the first committed render. */
  readonly defaultExpanded?: boolean;
  readonly control?: DevDockControlV1;
  readonly freeze?: PresentationFreezePortV1;
  readonly rate?: PresentationRatePortV1;
  readonly info?: ReactNode;
  readonly savePort?: SaveOverlayPortV1;
  readonly clearAllSaves?: () => Promise<void>;
  readonly onReloadCurrentState?: () => void | Promise<unknown>;
  readonly onReinitialize?: () => void | Promise<unknown>;
  readonly faultCause?: {
    getCurrent(): SessionFaultCauseV1 | null;
    subscribe(listener: () => void): () => void;
  };
  readonly stateTuner?: StateTunerPortV1;
}

export function ReferenceDevDockV1(props: ReferenceDevDockPropsV1): ReactElement | null {
  const capabilities = useSyncExternalStore(
    props.capabilities.state.subscribe,
    props.capabilities.state.getCurrent,
    props.capabilities.state.getCurrent,
  );
  const [launcherState, setLauncherState] = useState<DevDockOpenStateV1>(
    props.defaultExpanded === true ? openedDevDockStateV1 : closedDevDockStateV1,
  );
  const contributionPublicationPort = props.contributionPublication ??
    emptyContributionPublicationPortV1;
  const publishedContributions = useSyncExternalStore(
    contributionPublicationPort.subscribe,
    contributionPublicationPort.getCurrent,
    contributionPublicationPort.getCurrent,
  );
  const { observeOpenState, load } = props;
  const localControlRef = useRef<DevDockControlV1 | null>(null);
  if (props.control === undefined && localControlRef.current === null) {
    localControlRef.current = createDevDockControlV1();
  }
  const control = props.control ?? localControlRef.current as DevDockControlV1;
  const openWindowCount = useSyncExternalStore(
    control.openPanelIds.subscribe,
    () => control.openPanelIds.getCurrent().length,
    () => control.openPanelIds.getCurrent().length,
  );
  // The observed open state covers both surfaces: the launcher and any
  // floating panel window.
  const observedOpenRef = useRef(false);
  useEffect(() => {
    const open = (capabilities.debugTools && launcherState.open) || openWindowCount > 0;
    if (observedOpenRef.current === open) return;
    observedOpenRef.current = open;
    observeOpenState?.(open ? openedDevDockStateV1 : closedDevDockStateV1);
  }, [capabilities.debugTools, launcherState.open, observeOpenState, openWindowCount]);
  const debugTools = capabilities.debugTools;
  const chip = props.chip !== false;
  const authoringLauncher = useMemo(
    () => createEmbeddedAuthoringLauncherPortInternalV1(),
    [],
  );
  const authoringLauncherState = useSyncExternalStore(
    authoringLauncher.state.subscribe,
    authoringLauncher.state.getCurrent,
    authoringLauncher.state.getCurrent,
  );
  const launcherVisible = debugTools || (chip && authoringLauncherState.available);
  useLayoutEffect(() => {
    if (!chip || !launcherVisible) return undefined;
    return authoringLauncher.claimHost();
  }, [authoringLauncher, chip, launcherVisible]);
  const debugToolsRef = useRef(debugTools);
  useLayoutEffect(() => {
    debugToolsRef.current = debugTools;
  }, [debugTools]);
  // The implementation stays outside the resident entry graph until the
  // player expands the debug launcher or a caller directly opens a tool.
  // A release build may still contain its lazy output when the application
  // declares this loader.
  const [lazyLoad, setLazyLoad] = useState<DevDockLazyLoadStateV1>({ kind: "idle" });
  const mountedRef = useRef(true);
  const loadGenerationRef = useRef(0);
  const loadAttemptRef = useRef<DevDockLoadAttemptV1 | null>(null);
  const lazyLoadRequestedRef = useRef(false);
  const readyHandleRef = useRef<DevDockContributionLoadHandleV1 | null>(null);
  const retiringHandlesRef = useRef<DevDockContributionLoadHandleV1[]>([]);
  const loadSourceRef = useRef({ load, contributions: props.contributions });
  const activateLazyContributions = useCallback((): void => {
    if (!mountedRef.current || !debugToolsRef.current || load === undefined) return;
    const ready = readyHandleRef.current;
    if (ready !== null) {
      setLazyLoad({ kind: "ready", handle: ready });
      return;
    }
    const generation = loadGenerationRef.current;
    if (loadAttemptRef.current?.generation === generation) return;
    setLazyLoad({ kind: "loading" });
    const attempt: DevDockLoadAttemptV1 = { generation };
    loadAttemptRef.current = attempt;
    void Promise.resolve()
      .then(load)
      .then((loaded) => {
        let admitted: DevDockContributionLoadHandleV1;
        try {
          const admittedLoaded = createDevDockContributionSetV1(loaded.contributions);
          admitted = {
            ...loaded,
            contributions: combineDevDockContributionSetsInternalV1([
              props.contributions,
              admittedLoaded,
            ]),
          };
        } catch (error) {
          releaseDevDockContributionsObservationallyV1(loaded);
          throw error;
        }
        if (
          !mountedRef.current || !debugToolsRef.current ||
          loadGenerationRef.current !== generation || loadAttemptRef.current !== attempt
        ) {
          releaseDevDockContributionsObservationallyV1(admitted);
          return;
        }
        readyHandleRef.current = admitted;
        loadAttemptRef.current = null;
        setLazyLoad({ kind: "ready", handle: admitted });
      })
      .catch(() => {
        if (
          !mountedRef.current || !debugToolsRef.current ||
          loadGenerationRef.current !== generation || loadAttemptRef.current !== attempt
        ) return;
        loadAttemptRef.current = null;
        setLazyLoad({ kind: "error" });
      });
  }, [load, props.contributions]);
  const revokeLazyContributions = useCallback((): void => {
    loadGenerationRef.current += 1;
    loadAttemptRef.current = null;
    const ready = readyHandleRef.current;
    readyHandleRef.current = null;
    if (ready !== null) retiringHandlesRef.current.push(ready);
    setLazyLoad((current) => current.kind === "idle" ? current : { kind: "idle" });
  }, []);
  const requestLazyContributions = useCallback((): void => {
    lazyLoadRequestedRef.current = true;
    activateLazyContributions();
  }, [activateLazyContributions]);
  const retryLazyContributions = useCallback((): void => {
    if (!debugToolsRef.current || load === undefined) return;
    loadGenerationRef.current += 1;
    loadAttemptRef.current = null;
    activateLazyContributions();
  }, [activateLazyContributions, load]);
  useEffect(() => {
    const mounted = mountedRef;
    const loadGeneration = loadGenerationRef;
    const loadAttempt = loadAttemptRef;
    const readyHandle = readyHandleRef;
    const retiringHandles = retiringHandlesRef;
    mounted.current = true;
    return () => {
      mounted.current = false;
      loadGeneration.current += 1;
      loadAttempt.current = null;
      const ready = readyHandle.current;
      readyHandle.current = null;
      const retiring = retiringHandles.current.splice(0);
      if (ready !== null) retiring.push(ready);
      releaseDevDockContributionsAfterCommitV1(retiring);
    };
  }, []);
  useEffect(() => {
    const previousSource = loadSourceRef.current;
    const sourceChanged = previousSource.load !== load ||
      previousSource.contributions !== props.contributions;
    loadSourceRef.current = { load, contributions: props.contributions };
    if (!debugTools) {
      lazyLoadRequestedRef.current = false;
      revokeLazyContributions();
      return;
    }
    if (sourceChanged) revokeLazyContributions();
    // An explicit request remains selected across launcher collapse and a
    // loader-source successor, but capability loss clears that selection.
    if (lazyLoadRequestedRef.current) activateLazyContributions();
  }, [
    activateLazyContributions,
    debugTools,
    load,
    props.contributions,
    revokeLazyContributions,
  ]);
  useEffect(() => {
    if (!debugTools || openWindowCount === 0) return;
    requestLazyContributions();
  }, [debugTools, openWindowCount, requestLazyContributions]);
  useEffect(() => {
    if (!debugTools || !launcherState.open) return;
    requestLazyContributions();
  }, [debugTools, launcherState.open, requestLazyContributions]);
  useEffect(() => {
    const retiring = retiringHandlesRef.current.splice(0);
    releaseDevDockContributionsAfterCommitV1(retiring);
  }, [lazyLoad]);
  useEffect(() => {
    if (debugTools) return;
    setLauncherState(closedDevDockStateV1);
    control.closeAll();
  }, [control, debugTools]);
  const storyContributions = lazyLoad.kind === "ready"
    ? lazyLoad.handle.contributions
    : props.contributions;
  const activePublishedContributions = debugTools
    ? publishedContributions.contributions
    : emptyPublishedContributionsV1;
  const combinedStoryContributions = useMemo(
    () =>
      combineDevDockContributionSetsInternalV1([
        storyContributions,
        activePublishedContributions,
      ]),
    [activePublishedContributions, storyContributions],
  );
  const mergedPanels = useMemo(
    () => mergeEngineStateTunerPanelsV1(combinedStoryContributions.panels, props.stateTuner),
    [combinedStoryContributions, props.stateTuner],
  );
  const contributions = useMemo(
    () => combineDevDockContributionSetsInternalV1([{ panels: mergedPanels }]),
    [mergedPanels],
  );
  const acknowledgedLoadHandleRef = useRef<DevDockContributionLoadHandleV1 | null>(null);
  const acknowledgedPublicationRef = useRef<
    {
      readonly port: DevDockContributionPublicationPortV1;
      readonly publication: DevDockContributionPublicationV1;
    } | null
  >(null);
  const acknowledgeCommittedRegistry = useCallback((): void => {
    const readyHandle = readyHandleRef.current;
    if (readyHandle !== null && acknowledgedLoadHandleRef.current !== readyHandle) {
      readyHandle.acknowledgeCommitted?.();
      acknowledgedLoadHandleRef.current = readyHandle;
    }
    if (!debugTools || props.contributionPublication === undefined) return;
    const acknowledged = acknowledgedPublicationRef.current;
    if (
      acknowledged?.port === contributionPublicationPort &&
      acknowledged.publication === publishedContributions
    ) return;
    contributionPublicationPort.acknowledgeCommitted(publishedContributions);
    acknowledgedPublicationRef.current = {
      port: contributionPublicationPort,
      publication: publishedContributions,
    };
  }, [
    contributionPublicationPort,
    debugTools,
    props.contributionPublication,
    publishedContributions,
  ]);
  if (!launcherVisible) return null;
  return (
    <>
      {chip
        ? (
          <StoryDebugDockV1
            visible
            debugVisible={debugTools}
            {...(authoringLauncherState.available
              ? {
                authoringAction: {
                  label: "打开内嵌制作",
                  activate: authoringLauncher.activate,
                },
              }
              : {})}
            capabilities={props.capabilities}
            control={control}
            grantCapabilitiesOnOpen={false}
            expanded={debugTools && launcherState.open}
            onExpandedChange={(next) => {
              setLauncherState(next ? openedDevDockStateV1 : closedDevDockStateV1);
              if (next) requestLazyContributions();
            }}
            {...(props.position === undefined ? {} : { position: props.position })}
            {...(props.movableChip === undefined ? {} : { movableChip: props.movableChip })}
            {...(props.onPositionChangeInternalV1 === undefined
              ? {}
              : { onPositionChangeInternalV1: props.onPositionChangeInternalV1 })}
            {...(props.freeze === undefined ? {} : { presentationFreeze: props.freeze })}
            {...(props.rate === undefined ? {} : { presentationRate: props.rate })}
            {...(props.savePort === undefined ? {} : { savePort: props.savePort })}
            {...(props.clearAllSaves === undefined ? {} : { clearAllSaves: props.clearAllSaves })}
            {...(props.onReloadCurrentState === undefined
              ? {}
              : { onReloadCurrentState: props.onReloadCurrentState })}
            {...(props.onReinitialize === undefined
              ? {}
              : { onReinitialize: props.onReinitialize })}
            {...(props.info === undefined ? {} : { info: props.info })}
            {...(props.faultCause === undefined ? {} : { faultCause: props.faultCause })}
          />
        )
        : null}
      {debugTools && lazyLoad.kind === "error"
        ? (
          <div
            className={styles["reference-dev-dock__load-failure"]}
            data-silly-tool-surface="true"
            data-devdock-position={props.position ?? "top_right"}
            data-dev-dock-load-failure={devDockLoadFailureDiagnosticV1}
            role="alert"
          >
            <span>工具加载失败（{devDockLoadFailureDiagnosticV1}）</span>
            <button type="button" onClick={retryLazyContributions}>重试工具加载</button>
          </div>
        )
        : null}
      {debugTools
        ? (
          <DevDockV1
            capabilities={props.capabilities}
            contributions={contributions}
            inputRouter={props.inputRouter}
            control={control}
            onRegistryCommittedInternalV1={acknowledgeCommittedRegistry}
            {...(props.position === undefined ? {} : { position: props.position })}
            {...(props.freeze === undefined ? {} : { freeze: props.freeze })}
          />
        )
        : null}
    </>
  );
}
