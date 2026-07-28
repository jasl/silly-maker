// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

/**
 * The click-anywhere-to-advance surface — the VN convention Ren'Py players
 * expect. Render it behind the dialogue panel while a say line is pending:
 * any primary click on the stage advances (or completes the reveal). It is
 * pointer-only by design: keyboard users advance through the visible
 * control or Enter/Space, so the surface stays out of the accessibility
 * tree and the tab order. Choices never get one — menus stay explicit.
 */
export function AdvanceSurfaceV1(props: { onAdvance(): void }): ReactElement {
  return (
    <div
      data-advance-surface="true"
      aria-hidden="true"
      onClick={props.onAdvance}
      style={{
        position: "absolute",
        inset: 0,
        cursor: "pointer",
        pointerEvents: "auto",
      }}
    />
  );
}
