// SPDX-License-Identifier: MIT
import type { ReactElement, ReactNode } from "react";
import { DevDockPortalCoordinatorV1 } from "../debug/dev-dock-portal-coordinator.tsx";
import { RootErrorBoundaryV1 } from "../errors/root-error-boundary.tsx";
import type { RootErrorBoundaryPropsV1 } from "../errors/root-error-boundary.tsx";
import type { InputRouterV1 } from "../input/contracts.ts";
import { InputContextProviderV1 } from "../input/input-context.tsx";
import { GameViewportV1 } from "../viewport/game-viewport.tsx";
import type { GameViewportPropsV1 } from "../viewport/game-viewport.tsx";
import { GameStageV1 } from "./game-stage.tsx";
import type { GameStageLayersV1 } from "./game-stage.tsx";
import styles from "./game-shell.module.css";

export type GameShellViewportOptionsV1 = Omit<GameViewportPropsV1, "children">;

export interface GameShellPropsV1 {
  readonly accessibleName: string;
  readonly layers: GameStageLayersV1;
  readonly inputRouter: InputRouterV1;
  /** When present, the stage renders inside a managed GameViewport. */
  readonly viewport?: GameShellViewportOptionsV1;
  readonly backdrop?: ReactNode;
  readonly devDock?: ReactNode;
  readonly errorBoundary?: Omit<
    RootErrorBoundaryPropsV1,
    "children" | "inputRouter" | "renderFailure"
  >;
}

function recoveryLayersV1(system: ReactNode): GameStageLayersV1 {
  return Object.freeze({
    background: null,
    character: null,
    sceneInteraction: null,
    hud: null,
    narrative: null,
    wholeCanvas: null,
    workspaceOverlay: null,
    system,
  });
}

export function GameShell(props: GameShellPropsV1): ReactElement {
  const bareStage = <GameStageV1 accessibleName={props.accessibleName} layers={props.layers} />;
  const stage = props.viewport === undefined
    ? bareStage
    : <GameViewportV1 {...props.viewport}>{bareStage}</GameViewportV1>;
  const protectedStage = props.errorBoundary === undefined ? stage : (
    <RootErrorBoundaryV1
      {...props.errorBoundary}
      inputRouter={props.inputRouter}
      renderFailure={(dialog) => (
        <GameStageV1 accessibleName={props.accessibleName} layers={recoveryLayersV1(dialog)} />
      )}
    >
      {stage}
    </RootErrorBoundaryV1>
  );

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
        <DevDockPortalCoordinatorV1 baseTargetClassName={styles["game-shell__dev-dock-target"]!}>
          {protectedStage}
          {props.devDock ?? null}
        </DevDockPortalCoordinatorV1>
      </InputContextProviderV1>
    </div>
  );
}
