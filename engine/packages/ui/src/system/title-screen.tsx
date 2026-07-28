// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import { Button } from "../primitives/button.tsx";
import { SavesLauncherV1 } from "./saves-launcher.tsx";
import { SettingsLauncherV1 } from "./settings-launcher.tsx";

/**
 * The default title screen: the front door a finished game presents
 * before any gameplay UI. New game restarts the session to its initial
 * state (DefaultGameRoot may then run `titleScreen.beginNewGame`);
 * continue reveals the session the Host already restored (the autosave);
 * settings opens the ordinary system Settings dialog. The screen renders
 * inside the system layer above every gameplay surface and unmounts once
 * dismissed — debug tooling stays behind capabilities and is never part
 * of this surface.
 */

export interface TitleScreenLabelsV1 {
  readonly newGameLabel: string;
  readonly continueLabel: string;
  readonly loadGameLabel: string;
  readonly settingsLabel: string;
}

export function TitleScreenV1(props: {
  readonly title: string;
  readonly labels: TitleScreenLabelsV1;
  /** Optional key-art URL painted behind the menu. */
  readonly backgroundUrl?: string;
  /** False when no runnable autosave exists — Continue must stay unavailable. */
  readonly continueAvailable: boolean;
  onNewGame(): void;
  onContinue(): void;
  /** Shows the Load-game entry (opens the system Save dialog). */
  readonly showLoadGame?: boolean;
}): ReactElement {
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
        ...(props.backgroundUrl === undefined
          ? {}
          : {
              backgroundImage: `linear-gradient(rgba(10, 12, 16, 0.4), rgba(10, 12, 16, 0.62)), url(${JSON.stringify(props.backgroundUrl)})`,
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
        <Button
          data-title-continue="true"
          data-title-continue-available={props.continueAvailable ? "true" : "false"}
          disabled={!props.continueAvailable}
          onClick={() => props.onContinue()}
        >
          {props.labels.continueLabel}
        </Button>
        {props.showLoadGame === true ? (
          <SavesLauncherV1 data-title-load-game="true" label={props.labels.loadGameLabel} />
        ) : null}
        <SettingsLauncherV1 data-title-settings="true" label={props.labels.settingsLabel} />
      </div>
    </section>
  );
}
