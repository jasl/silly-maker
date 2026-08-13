// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import { Button } from "../primitives/button.tsx";
import styles from "./title-screen.module.css";

/**
 * The default title screen: the front door a finished game presents
 * before any gameplay UI. New game restarts the session to its initial
 * state; Continue reveals the session the Host already restored. A Story
 * that replaces Saves with `customSaves` turns the middle control into Load
 * (disabled until any slot can be loaded). Every action is bound by the
 * owning whole-canvas frame, so this component is a passive renderer with
 * no direct System-dialog or lifecycle authority.
 *
 * Layout lives in the CSS module so a Story can restyle the front door
 * (key art, command sprites, placement) without fighting inline styles.
 */

export interface TitleScreenLabelsV1 {
  readonly newGameLabel: string;
  readonly continueLabel: string;
  readonly loadGameLabel: string;
  readonly settingsLabel: string;
}

export type TitleScreenMiddleActionV1 =
  | {
    readonly kind: "continue";
    readonly available: boolean;
    readonly onActivate: () => void;
  }
  | {
    readonly kind: "load";
    readonly available: boolean;
    readonly onActivate: () => void;
  };

export function TitleScreenV1(props: {
  readonly title: string;
  readonly labels: TitleScreenLabelsV1;
  /** Optional key-art URL painted behind the menu. */
  readonly backgroundUrl?: string;
  readonly onNewGame: () => void;
  /** Required runnable contract for the title's middle action. */
  readonly middleAction: TitleScreenMiddleActionV1;
  /** Shows a separate Load-game entry in addition to Continue. */
  readonly showLoadGame?: boolean;
  readonly onLoadGame: () => void;
  readonly onSettings: () => void;
}): ReactElement {
  const middleAction = props.middleAction;
  const hasArt = props.backgroundUrl !== undefined;
  return (
    <section
      className={styles.root}
      data-title-screen="true"
      data-title-has-art={hasArt ? "true" : "false"}
      role="dialog"
      aria-label={props.title}
      style={{
        backgroundColor: "var(--silly-color-canvas)",
        ...(hasArt
          ? {
            backgroundImage: `linear-gradient(rgba(10, 12, 16, 0.4), rgba(10, 12, 16, 0.62)), url(${
              JSON.stringify(
                props.backgroundUrl,
              )
            })`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
          : {}),
      }}
    >
      <h1 className={styles.title}>{props.title}</h1>
      <div className={styles.menu} data-title-menu="true">
        <Button data-title-new-game="true" onClick={() => props.onNewGame()}>
          {props.labels.newGameLabel}
        </Button>
        {(() => {
          switch (middleAction.kind) {
            case "load":
              return (
                <Button
                  data-title-load-game="true"
                  data-title-load-game-available={middleAction.available ? "true" : "false"}
                  disabled={!middleAction.available}
                  onClick={() => middleAction.onActivate()}
                >
                  {props.labels.loadGameLabel}
                </Button>
              );
            case "continue":
              return (
                <Button
                  data-title-continue="true"
                  data-title-continue-available={middleAction.available ? "true" : "false"}
                  disabled={!middleAction.available}
                  onClick={() => middleAction.onActivate()}
                >
                  {props.labels.continueLabel}
                </Button>
              );
            default: {
              const exhaustive: never = middleAction;
              return exhaustive;
            }
          }
        })()}
        {props.showLoadGame === true && middleAction.kind === "continue"
          ? (
            <Button
              data-title-load-game="true"
              onClick={() => props.onLoadGame()}
            >
              {props.labels.loadGameLabel}
            </Button>
          )
          : null}
        <Button data-title-settings="true" onClick={() => props.onSettings()}>
          {props.labels.settingsLabel}
        </Button>
      </div>
    </section>
  );
}
