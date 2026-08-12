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

export type StageInputIsolationContextIdV1 =
  | "interaction"
  | "narrative"
  | "whole_canvas"
  | "overlay"
  | "system";

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

type StageLayerInertPolicyV1 =
  | "ordinary_gameplay"
  | "gameplay"
  | "narrative"
  | "whole_canvas"
  | "system"
  | "none";

export interface GameStageLayersV1 {
  readonly background: ReactNode;
  readonly character: ReactNode;
  readonly sceneInteraction: ReactNode;
  readonly hud: ReactNode;
  readonly narrative: ReactNode;
  readonly wholeCanvas: ReactNode;
  readonly workspaceOverlay: ReactNode;
  readonly system: ReactNode;
}

interface StageLayerDescriptorV1 {
  readonly id: string;
  readonly slot: keyof GameStageLayersV1;
  readonly inertPolicy: StageLayerInertPolicyV1;
  readonly omitWhenEmpty: boolean;
  readonly pointerSurface: boolean;
  readonly portalTarget: boolean;
}

interface StageLayerDescriptorOptionsV1 {
  readonly omitWhenEmpty?: boolean;
  readonly pointerSurface?: boolean;
  readonly portalTarget?: boolean;
}

function defineStageLayerV1<const TId extends string, const TSlot extends keyof GameStageLayersV1>(
  id: TId,
  slot: TSlot,
  inertPolicy: StageLayerInertPolicyV1,
  options: StageLayerDescriptorOptionsV1 = {},
) {
  return Object.freeze({
    id,
    slot,
    inertPolicy,
    omitWhenEmpty: options.omitWhenEmpty ?? false,
    pointerSurface: options.pointerSurface ?? false,
    portalTarget: options.portalTarget ?? false,
  });
}

const stageLayerDescriptorsV1 = Object.freeze(
  [
    defineStageLayerV1("background", "background", "ordinary_gameplay"),
    defineStageLayerV1("character", "character", "ordinary_gameplay"),
    defineStageLayerV1("scene_interaction", "sceneInteraction", "gameplay", {
      omitWhenEmpty: true,
      pointerSurface: true,
    }),
    defineStageLayerV1("hud", "hud", "ordinary_gameplay"),
    defineStageLayerV1("narrative", "narrative", "narrative"),
    defineStageLayerV1("whole_canvas", "wholeCanvas", "whole_canvas"),
    defineStageLayerV1("workspace_overlay", "workspaceOverlay", "system"),
    defineStageLayerV1("system", "system", "none", { portalTarget: true }),
  ] as const satisfies readonly StageLayerDescriptorV1[],
);

export type StageLayerIdV1 = (typeof stageLayerDescriptorsV1)[number]["id"];
type StageLayerIdsV1<TDescriptors extends readonly StageLayerDescriptorV1[]> = {
  readonly [TIndex in keyof TDescriptors]: TDescriptors[TIndex] extends {
    readonly id: infer TId extends string;
  } ? TId
    : never;
};

export const stageLayerIdsV1 = Object.freeze(
  stageLayerDescriptorsV1.map((descriptor) => descriptor.id),
) as unknown as StageLayerIdsV1<typeof stageLayerDescriptorsV1>;

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
  whole_canvas: 0,
  overlay: 0,
  system: 0,
}) satisfies StageInputIsolationCountsV1;

export function GameStageV1(props: GameStagePropsV1): ReactElement {
  const stageRootRef = useRef<HTMLElement | null>(null);
  const gestureFenceRef = useRef<StagePointerGestureFenceHandleV1 | null>(null);
  const [isolationCounts, setIsolationCounts] = useState<StageInputIsolationCountsV1>(
    noStageInputIsolationV1,
  );
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
        Object.freeze({ ...current, [context]: Math.max(0, current[context] - 1) })
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
        Object.freeze(current.filter((candidate) => candidate !== registration))
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
  const systemActive = isolationCounts.system > 0;
  const overlayActive = isolationCounts.overlay > 0;
  const wholeCanvasActive = isolationCounts.whole_canvas > 0;
  const narrativeActive = isolationCounts.narrative > 0;
  const interactionActive = isolationCounts.interaction > 0;
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
  const gameplayInert = systemActive || overlayActive || wholeCanvasActive || narrativeActive;
  const ordinaryGameplayInert = gameplayInert || interactionActive;
  const narrativeInert = systemActive || overlayActive || wholeCanvasActive;
  const wholeCanvasInert = systemActive || overlayActive;
  const inertByPolicy = {
    ordinary_gameplay: ordinaryGameplayInert,
    gameplay: gameplayInert,
    narrative: narrativeInert,
    whole_canvas: wholeCanvasInert,
    system: systemActive,
    none: false,
  } satisfies Readonly<Record<StageLayerInertPolicyV1, boolean>>;

  return (
    <StageInputIsolationContextV1.Provider value={isolationPort}>
      <main
        ref={stageRootRef}
        className={styles["game-stage"]}
        aria-label={props.accessibleName}
        data-stage-root="true"
      >
        {
          /* The descriptor tuple is the one runtime authority for layer order,
            slot mapping, isolation, pointer ownership, and portal placement.
            An empty pointer-enabled layer is omitted so it cannot eat hits. */
        }
        {stageLayerDescriptorsV1.map((descriptor) => {
          const content = props.layers[descriptor.slot];
          if (descriptor.omitWhenEmpty && (content === null || content === undefined)) {
            return null;
          }
          return (
            <div
              key={descriptor.id}
              ref={descriptor.portalTarget ? setSystemPortalContainer : undefined}
              className={styles["game-stage__layer"]}
              data-stage-layer={descriptor.id}
              data-stage-pointer-surface={descriptor.pointerSurface ? "true" : undefined}
              data-testid={`stage-${descriptor.id.replaceAll("_", "-")}`}
              inert={inertByPolicy[descriptor.inertPolicy]}
            >
              {content}
            </div>
          );
        })}
      </main>
    </StageInputIsolationContextV1.Provider>
  );
}
