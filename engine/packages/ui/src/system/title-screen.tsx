// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import { Button } from "../primitives/Button.tsx";
import { SettingsLauncherV1 } from "./settings-launcher.tsx";

/**
 * The default title screen: the front door a finished game presents
 * before any gameplay UI. New game restarts the session to its initial
 * state; continue reveals the session the Host already restored (the
 * autosave); settings opens the ordinary system Settings dialog. The
 * screen renders inside the system layer above every gameplay surface
 * and unmounts once dismissed — debug tooling stays behind capabilities
 * and is never part of this surface.
 */

export interface TitleScreenLabelsV1 {
  readonly newGameLabel: string;
  readonly continueLabel: string;
  readonly settingsLabel: string;
}

export function TitleScreenV1(props: {
  readonly title: string;
  readonly labels: TitleScreenLabelsV1;
  onNewGame(): void;
  onContinue(): void;
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
        background: "rgba(10, 12, 16, 0.86)",
        color: "#f2efe8",
        zIndex: 10,
        pointerEvents: "auto",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "clamp(28px, 6vw, 56px)" }}>{props.title}</h1>
      <div style={{ display: "grid", gap: "10px", minInlineSize: "min(70vw, 280px)" }}>
        <Button data-title-new-game="true" onClick={() => props.onNewGame()}>
          {props.labels.newGameLabel}
        </Button>
        <Button data-title-continue="true" onClick={() => props.onContinue()}>
          {props.labels.continueLabel}
        </Button>
        <SettingsLauncherV1 data-title-settings="true" label={props.labels.settingsLabel} />
      </div>
    </section>
  );
}
