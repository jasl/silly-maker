// SPDX-License-Identifier: MIT
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement, ReactNode } from "react";
import styles from "./game-stage.module.css";
import {
  armStagePointerGestureFenceV1,
  type StagePointerGestureFenceHandleV1,
} from "./pointer-gesture-fence.ts";

export type StageInputIsolationContextIdV1 = "interaction" | "narrative" | "overlay" | "system";

interface StageInputIsolationPortV1 {
  register(context: StageInputIsolationContextIdV1): () => void;
  registerSystemFocusScope(target: HTMLElement): () => void;
  /**
   * Arm a host-local gesture fence on the stage root. Survives caller unmount;
   * cleared on GameStage unmount, swallowed click, next pointerdown, or timeout.
   */
  armPointerGestureFence(
    context: StageInputIsolationContextIdV1,
    pointerUpEvent: PointerEvent,
  ): void;
  readonly currentSystemFocusScopeTarget: HTMLElement | null;
  readonly systemPortalContainer: HTMLDivElement | null;
}

const StageInputIsolationContextV1 = createContext<StageInputIsolationPortV1 | null>(null);

export function useStageInputIsolationV1(
  context: StageInputIsolationContextIdV1,
  active: boolean,
): void {
  const port = useContext(StageInputIsolationContextV1);
  const register = port?.register;

  useLayoutEffect(() => {
    if (!active || register === undefined) return undefined;
    return register(context);
  }, [active, context, register]);
}

export function useStageSystemPortalContainerV1(): HTMLDivElement | null {
  return useContext(StageInputIsolationContextV1)?.systemPortalContainer ?? null;
}

export function useStageSystemFocusScopeRegistrationV1(target: HTMLElement | null): void {
  const registerSystemFocusScope = useContext(
    StageInputIsolationContextV1,
  )?.registerSystemFocusScope;

  useLayoutEffect(() => {
    if (target === null || registerSystemFocusScope === undefined) return undefined;
    return registerSystemFocusScope(target);
  }, [registerSystemFocusScope, target]);
}

export function useStageSystemFocusScopeTargetV1(): HTMLElement | null {
  return useContext(StageInputIsolationContextV1)?.currentSystemFocusScopeTarget ?? null;
}

/**
 * Returns `arm(pointerUpEvent)` for dismiss paths that sync-unmount a surface.
 * Call from primary `onPointerUp` *before* dispatch. Keyboard/Escape must not arm.
 *
 * Fence ownership lives on GameStage — this hook does not clear the fence when
 * the calling component unmounts.
 */
export function useStagePointerGestureFenceV1(
  context: StageInputIsolationContextIdV1,
): (event: ReactPointerEvent<Element>) => void {
  const port = useContext(StageInputIsolationContextV1);
  return useCallback(
    (event: ReactPointerEvent<Element>) => {
      port?.armPointerGestureFence(context, event.nativeEvent);
    },
    [context, port],
  );
}

export type StageLayerIdV1 =
  | "background"
  | "character"
  | "scene_interaction"
  | "hud"
  | "workspace_overlay"
  | "narrative"
  | "system";

export const stageLayerIdsV1 = Object.freeze([
  "background",
  "character",
  "scene_interaction",
  "hud",
  "narrative",
  "workspace_overlay",
  "system",
] as const satisfies readonly StageLayerIdV1[]);

export interface GameStageLayersV1 {
  readonly background: ReactNode;
  readonly character: ReactNode;
  readonly sceneInteraction: ReactNode;
  readonly hud: ReactNode;
  readonly workspaceOverlay: ReactNode;
  readonly narrative: ReactNode;
  readonly system: ReactNode;
}

export interface GameStagePropsV1 {
  readonly accessibleName: string;
  readonly layers: GameStageLayersV1;
}

type StageInputIsolationCountsV1 = Readonly<Record<StageInputIsolationContextIdV1, number>>;

interface StageSystemFocusScopeRegistrationV1 {
  readonly target: HTMLElement;
}

const noStageInputIsolationV1 = Object.freeze({
  interaction: 0,
  narrative: 0,
  overlay: 0,
  system: 0,
}) satisfies StageInputIsolationCountsV1;

export function GameStageV1(props: GameStagePropsV1): ReactElement {
  const stageRootRef = useRef<HTMLElement | null>(null);
  const gestureFenceRef = useRef<StagePointerGestureFenceHandleV1 | null>(null);
  const [isolationCounts, setIsolationCounts] =
    useState<StageInputIsolationCountsV1>(noStageInputIsolationV1);
  const [systemPortalContainer, setSystemPortalContainer] = useState<HTMLDivElement | null>(null);
  const [systemFocusScopeRegistrations, setSystemFocusScopeRegistrations] = useState<
    readonly StageSystemFocusScopeRegistrationV1[]
  >(() => Object.freeze([]));
  const register = useCallback((context: StageInputIsolationContextIdV1) => {
    setIsolationCounts((current) => Object.freeze({ ...current, [context]: current[context] + 1 }));
    let registered = true;
    return () => {
      if (!registered) return;
      registered = false;
      setIsolationCounts((current) =>
        Object.freeze({ ...current, [context]: Math.max(0, current[context] - 1) }),
      );
    };
  }, []);
  const registerSystemFocusScope = useCallback((target: HTMLElement) => {
    const registration = Object.freeze({ target }) satisfies StageSystemFocusScopeRegistrationV1;
    setSystemFocusScopeRegistrations((current) => Object.freeze([...current, registration]));
    let registered = true;
    return () => {
      if (!registered) return;
      registered = false;
      setSystemFocusScopeRegistrations((current) =>
        Object.freeze(current.filter((candidate) => candidate !== registration)),
      );
    };
  }, []);
  const armPointerGestureFence = useCallback(
    (context: StageInputIsolationContextIdV1, pointerUpEvent: PointerEvent) => {
      gestureFenceRef.current?.release();
      const root = stageRootRef.current;
      if (root === null) return;
      gestureFenceRef.current = armStagePointerGestureFenceV1({
        root,
        pointerUpEvent,
        onArm: () => register(context),
      });
    },
    [register],
  );
  useLayoutEffect(
    () => () => {
      gestureFenceRef.current?.release();
      gestureFenceRef.current = null;
    },
    [],
  );
  const currentSystemFocusScopeTarget =
    systemFocusScopeRegistrations[systemFocusScopeRegistrations.length - 1]?.target ?? null;
  const isolationPort = useMemo(
    () =>
      Object.freeze({
        register,
        registerSystemFocusScope,
        armPointerGestureFence,
        currentSystemFocusScopeTarget,
        systemPortalContainer,
      }) satisfies StageInputIsolationPortV1,
    [
      armPointerGestureFence,
      currentSystemFocusScopeTarget,
      register,
      registerSystemFocusScope,
      systemPortalContainer,
    ],
  );
  const systemActive = isolationCounts.system > 0;
  const overlayActive = isolationCounts.overlay > 0;
  const narrativeActive = isolationCounts.narrative > 0;
  const interactionActive = isolationCounts.interaction > 0;
  const gameplayInert = systemActive || overlayActive || narrativeActive;
  const ordinaryGameplayInert = gameplayInert || interactionActive;
  const narrativeInert = systemActive || overlayActive;

  return (
    <StageInputIsolationContextV1.Provider value={isolationPort}>
      <main
        ref={stageRootRef}
        className={styles["game-stage"]}
        aria-label={props.accessibleName}
        data-stage-root="true"
      >
        <div
          className={styles["game-stage__layer"]}
          data-stage-layer="background"
          data-testid="stage-background"
          inert={ordinaryGameplayInert}
        >
          {props.layers.background}
        </div>
        <div
          className={styles["game-stage__layer"]}
          data-stage-layer="character"
          data-testid="stage-character"
          inert={ordinaryGameplayInert}
        >
          {props.layers.character}
        </div>
        {/* An empty interaction layer must not eat stage pointer input
            (its container is pointer-events: auto by design). */}
        {props.layers.sceneInteraction === null ||
        props.layers.sceneInteraction === undefined ? null : (
          <div
            className={styles["game-stage__layer"]}
            data-stage-layer="scene_interaction"
            data-stage-pointer-surface="true"
            data-testid="stage-scene-interaction"
            inert={gameplayInert}
          >
            {props.layers.sceneInteraction}
          </div>
        )}
        <div
          className={styles["game-stage__layer"]}
          data-stage-layer="hud"
          data-testid="stage-hud"
          inert={ordinaryGameplayInert}
        >
          {props.layers.hud}
        </div>
        <div
          className={styles["game-stage__layer"]}
          data-stage-layer="narrative"
          data-testid="stage-narrative"
          inert={narrativeInert}
        >
          {props.layers.narrative}
        </div>
        {/* Overlays paint above the narrative panel: a modal workspace
            surface (album, save…) must never sit under dialogue text. */}
        <div
          className={styles["game-stage__layer"]}
          data-stage-layer="workspace_overlay"
          data-testid="stage-workspace-overlay"
          inert={systemActive}
        >
          {props.layers.workspaceOverlay}
        </div>
        <div
          ref={setSystemPortalContainer}
          className={styles["game-stage__layer"]}
          data-stage-layer="system"
          data-testid="stage-system"
        >
          {props.layers.system}
        </div>
      </main>
    </StageInputIsolationContextV1.Provider>
  );
}
