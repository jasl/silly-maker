// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import { Button } from "../primitives/button.tsx";

/**
 * The default title screen: the front door a finished game presents
 * before any gameplay UI. New game restarts the session to its initial
 * state; continue reveals the session the Host already restored. Every
 * action is bound by the owning whole-canvas frame, so this component is a
 * passive renderer with no direct System-dialog or lifecycle authority.
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
  return (
    <section
      data-title-screen="true"
      role="dialog"
      aria-label={props.title}
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeContent: "center",
        gap: "16px",
        textAlign: "center",
        backgroundColor: "rgba(10, 12, 16, 0.86)",
        ...(props.backgroundUrl === undefined ? {} : {
          backgroundImage: `linear-gradient(rgba(10, 12, 16, 0.4), rgba(10, 12, 16, 0.62)), url(${
            JSON.stringify(props.backgroundUrl)
          })`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }),
        color: "#f2efe8",
        zIndex: "var(--silly-surface-z-front-door)",
        pointerEvents: "auto",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: "clamp(28px, 6vw, 56px)",
          textShadow: "0 2px 12px rgba(0, 0, 0, 0.8)",
        }}
      >
        {props.title}
      </h1>
      <div style={{ display: "grid", gap: "10px", minInlineSize: "min(70vw, 280px)" }}>
        <Button data-title-new-game="true" onClick={() => props.onNewGame()}>
          {props.labels.newGameLabel}
        </Button>
        {middleAction.kind === "load"
          ? (
            <Button data-title-load-game="true" onClick={() => middleAction.onActivate()}>
              {props.labels.loadGameLabel}
            </Button>
          )
          : (
            <Button
              data-title-continue="true"
              data-title-continue-available={middleAction.available ? "true" : "false"}
              disabled={!middleAction.available}
              onClick={() => middleAction.onActivate()}
            >
              {props.labels.continueLabel}
            </Button>
          )}
        {props.showLoadGame === true && middleAction.kind === "continue"
          ? (
            <Button data-title-load-game="true" onClick={() => props.onLoadGame()}>
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
