// SPDX-License-Identifier: MIT
import type { ReactElement, ReactNode } from "react";
import { RootErrorBoundaryV1 } from "../errors/root-error-boundary.tsx";
import type { RootErrorBoundaryPropsV1 } from "../errors/root-error-boundary.tsx";
import type { InputRouterV1 } from "../input/contracts.ts";
import { InputContextProviderV1 } from "../input/input-context.tsx";
import { GameViewportV1 } from "../viewport/game-viewport.tsx";
import type { GameViewportPropsV1 } from "../viewport/game-viewport.tsx";
import { GameStageV1 } from "./game-stage.tsx";
import type { GameStageLayersV1 } from "./game-stage.tsx";
import { AuxiliarySurfacePortalCoordinatorV1 } from "./auxiliary-surface-portal.tsx";
import styles from "./game-shell.module.css";

export type GameShellViewportOptionsV1 = Omit<GameViewportPropsV1, "children">;

export interface GameShellPropsV1 {
  readonly accessibleName: string;
  readonly layers: GameStageLayersV1;
  readonly inputRouter: InputRouterV1;
  /** When present, the stage renders inside a managed GameViewport. */
  readonly viewport?: GameShellViewportOptionsV1;
  readonly backdrop?: ReactNode;
  /** Optional chrome outside the authoritative stage (for example, developer tools). */
  readonly auxiliarySurface?: ReactNode;
  readonly errorBoundary?: Omit<
    RootErrorBoundaryPropsV1,
    "children" | "inputRouter" | "renderFailure"
  >;
}

function recoveryLayersV1(system: ReactNode): GameStageLayersV1 {
  return {
    background: null,
    character: null,
    sceneInteraction: null,
    hud: null,
    narrative: null,
    wholeCanvas: null,
    workspaceOverlay: null,
    system,
  };
}

export function GameShell(props: GameShellPropsV1): ReactElement {
  const bareStage = <GameStageV1 accessibleName={props.accessibleName} layers={props.layers} />;
  const protectedStage = props.errorBoundary === undefined ? bareStage : (
    <RootErrorBoundaryV1
      {...props.errorBoundary}
      inputRouter={props.inputRouter}
      renderFailure={(dialog) => (
        <GameStageV1 accessibleName={props.accessibleName} layers={recoveryLayersV1(dialog)} />
      )}
    >
      {bareStage}
    </RootErrorBoundaryV1>
  );
  const stage = props.viewport === undefined
    ? protectedStage
    : <GameViewportV1 {...props.viewport}>{protectedStage}</GameViewportV1>;

  return (
    <div className={styles["game-shell"]}>
      <div
        className={styles["game-shell__backdrop"]}
        data-testid="game-shell-backdrop"
        aria-hidden="true"
        inert
      >
        {props.backdrop ?? null}
      </div>
      <InputContextProviderV1 router={props.inputRouter}>
        <AuxiliarySurfacePortalCoordinatorV1
          baseTargetClassName={styles["game-shell__auxiliary-surface-target"]!}
        >
          {stage}
          {props.auxiliarySurface ?? null}
        </AuxiliarySurfacePortalCoordinatorV1>
      </InputContextProviderV1>
    </div>
  );
}
