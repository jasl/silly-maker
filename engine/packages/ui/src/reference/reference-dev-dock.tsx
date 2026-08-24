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

import { createDevDockContributionSetV1, DevDockV1 } from "../debug/dev-dock.tsx";
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
import type { InputRouterV1 } from "../input/contracts.ts";
import type { SaveOverlayPortV1 } from "../persistence/save-overlay.tsx";
import type { PresentationFreezePortV1 } from "../presentation-run/presentation-freeze.ts";
import type { PresentationRatePortV1 } from "../presentation-run/presentation-rate.ts";
import {
  disposeDevDockContributionLifecycleInternalV1,
  inheritDevDockContributionAcceptanceInternalV1,
} from "../composer/dev-dock-contribution-acceptance.ts";
import styles from "./reference-dev-dock.module.css";

const closedDevDockStateV1 = Object.freeze({ open: false }) satisfies DevDockOpenStateV1;
const openedDevDockStateV1 = Object.freeze({ open: true }) satisfies DevDockOpenStateV1;
const devDockLoadFailureDiagnosticV1 = "ui.devdock_contribution_load_failed";

type DevDockLazyLoadStateV1 =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | {
    readonly kind: "ready";
    readonly contributions: DevDockContributionSetV1;
  }
  | { readonly kind: "error" };

interface DevDockLoadAttemptV1 {
  readonly generation: number;
  readonly settled: Promise<void>;
}

function releaseDevDockContributionsObservationallyV1(
  contributions: DevDockContributionSetV1,
): void {
  void disposeDevDockContributionLifecycleInternalV1(contributions).catch(() => {
    // Cleanup is best-effort at this React boundary. The lifecycle receipt
    // remains idempotent, so an owning async boundary may observe it again.
  });
}

function releaseDevDockContributionsAfterCommitV1(
  contributions: readonly DevDockContributionSetV1[],
): void {
  if (contributions.length === 0) return;
  queueMicrotask(() => {
    for (const contribution of contributions) {
      releaseDevDockContributionsObservationallyV1(contribution);
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
  readonly inputRouter: InputRouterV1;
  readonly load?: () => Promise<DevDockContributionSetV1>;
  readonly observeOpenState?: (state: DevDockOpenStateV1) => void;
  readonly position?: DevDockPositionV1;
  readonly chip?: boolean;
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
    closedDevDockStateV1,
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
    const open = launcherState.open || openWindowCount > 0;
    if (observedOpenRef.current === open) return;
    observedOpenRef.current = open;
    observeOpenState?.(open ? openedDevDockStateV1 : closedDevDockStateV1);
  }, [launcherState.open, observeOpenState, openWindowCount]);
  const debugTools = capabilities.debugTools;
  const debugToolsRef = useRef(debugTools);
  useLayoutEffect(() => {
    debugToolsRef.current = debugTools;
  }, [debugTools]);
  // The implementation stays outside the resident entry graph until the
  // capability is first needed. A release build may still contain its lazy
  // output when the application declares this loader.
  const [lazyLoad, setLazyLoad] = useState<DevDockLazyLoadStateV1>({ kind: "idle" });
  const mountedRef = useRef(true);
  const loadGenerationRef = useRef(0);
  const loadAttemptRef = useRef<DevDockLoadAttemptV1 | null>(null);
  const readyContributionsRef = useRef<DevDockContributionSetV1 | null>(null);
  const retiringContributionsRef = useRef<DevDockContributionSetV1[]>([]);
  const loadSourceRef = useRef({ load, contributions: props.contributions });
  const activateLazyContributions = useCallback((): void => {
    if (!mountedRef.current || !debugToolsRef.current || load === undefined) return;
    const ready = readyContributionsRef.current;
    if (ready !== null) {
      setLazyLoad({ kind: "ready", contributions: ready });
      return;
    }
    const generation = loadGenerationRef.current;
    if (loadAttemptRef.current?.generation === generation) return;
    setLazyLoad({ kind: "loading" });
    const attempt: DevDockLoadAttemptV1 = {
      generation,
      settled: Promise.resolve()
        .then(load)
        .then((loaded) => {
          let admitted: DevDockContributionSetV1;
          try {
            admitted = inheritDevDockContributionAcceptanceInternalV1(
              loaded,
              createDevDockContributionSetV1({
                panels: [...props.contributions.panels, ...loaded.panels],
              }),
            );
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
          readyContributionsRef.current = admitted;
          loadAttemptRef.current = null;
          setLazyLoad({ kind: "ready", contributions: admitted });
        })
        .catch(() => {
          if (
            !mountedRef.current || !debugToolsRef.current ||
            loadGenerationRef.current !== generation || loadAttemptRef.current !== attempt
          ) return;
          loadAttemptRef.current = null;
          setLazyLoad({ kind: "error" });
        }),
    };
    loadAttemptRef.current = attempt;
  }, [load, props.contributions]);
  const revokeLazyContributions = useCallback((): void => {
    loadGenerationRef.current += 1;
    loadAttemptRef.current = null;
    const ready = readyContributionsRef.current;
    readyContributionsRef.current = null;
    if (ready !== null) retiringContributionsRef.current.push(ready);
    setLazyLoad((current) => current.kind === "idle" ? current : { kind: "idle" });
  }, []);
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
    const readyContributions = readyContributionsRef;
    const retiringContributions = retiringContributionsRef;
    mounted.current = true;
    return () => {
      mounted.current = false;
      loadGeneration.current += 1;
      loadAttempt.current = null;
      const ready = readyContributions.current;
      readyContributions.current = null;
      const retiring = retiringContributions.current.splice(0);
      if (ready !== null) retiring.push(ready);
      releaseDevDockContributionsAfterCommitV1(retiring);
    };
  }, []);
  useEffect(() => {
    const previousSource = loadSourceRef.current;
    const sourceChanged = previousSource.load !== load ||
      previousSource.contributions !== props.contributions;
    loadSourceRef.current = { load, contributions: props.contributions };
    if (!debugTools || sourceChanged) revokeLazyContributions();
    if (debugTools) activateLazyContributions();
  }, [
    activateLazyContributions,
    debugTools,
    load,
    props.contributions,
    revokeLazyContributions,
  ]);
  useEffect(() => {
    const retiring = retiringContributionsRef.current.splice(0);
    releaseDevDockContributionsAfterCommitV1(retiring);
  }, [lazyLoad]);
  // A runtime capability grant opens the launcher immediately; a boot-time
  // grant keeps the collapsed chip so tooling never greets the player unasked.
  const chip = props.chip !== false;
  const previousDebugToolsRef = useRef(debugTools);
  useEffect(() => {
    const was = previousDebugToolsRef.current;
    previousDebugToolsRef.current = debugTools;
    if (!was && debugTools && chip) setLauncherState(openedDevDockStateV1);
  }, [chip, debugTools]);
  const storyContributions = lazyLoad.kind === "ready"
    ? lazyLoad.contributions
    : props.contributions;
  const mergedPanels = useMemo(
    () => mergeEngineStateTunerPanelsV1(storyContributions.panels, props.stateTuner),
    [props.stateTuner, storyContributions],
  );
  if (!debugTools) return null;
  const contributions = inheritDevDockContributionAcceptanceInternalV1(
    storyContributions,
    createDevDockContributionSetV1({ panels: mergedPanels }),
  );
  return (
    <>
      {chip
        ? (
          <StoryDebugDockV1
            visible
            capabilities={props.capabilities}
            control={control}
            grantCapabilitiesOnOpen={false}
            expanded={launcherState.open}
            onExpandedChange={(next) =>
              setLauncherState(next ? openedDevDockStateV1 : closedDevDockStateV1)}
            {...(props.position === undefined ? {} : { position: props.position })}
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
      {lazyLoad.kind === "error"
        ? (
          <div
            className={styles["reference-dev-dock__load-failure"]}
            data-devdock-position={props.position ?? "top_right"}
            data-dev-dock-load-failure={devDockLoadFailureDiagnosticV1}
            role="alert"
          >
            <span>工具加载失败（{devDockLoadFailureDiagnosticV1}）</span>
            <button type="button" onClick={retryLazyContributions}>重试工具加载</button>
          </div>
        )
        : null}
      <DevDockV1
        capabilities={props.capabilities}
        contributions={contributions}
        inputRouter={props.inputRouter}
        control={control}
        {...(props.position === undefined ? {} : { position: props.position })}
        {...(props.freeze === undefined ? {} : { freeze: props.freeze })}
      />
    </>
  );
}
