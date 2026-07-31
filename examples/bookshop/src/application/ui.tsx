// SPDX-License-Identifier: MIT
// PascalCase React presentation (Vite Fast Refresh–safe).
// Application binding, projector, slots, and labels live in `composition.tsx`.
import type { ReactElement } from "react";

import type { DeepReadonly, NarrativeHistoryV1, PendingInteractionV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { DialogueResolutionV1 } from "@sillymaker/ui";
import { Button, DialoguePanelV1 } from "@sillymaker/ui";

import type { BookshopActionIdV1, BookshopInvocationV1 } from "./semantic.ts";
import type { BookshopApplicationInstanceV1 } from "./core-definition.ts";
import type { BookshopUiPublicationV1 } from "./composition.tsx";
import { bookshopUiTextV1 } from "./composition.tsx";

type BookshopSemanticPortV1 = BookshopApplicationInstanceV1["semantic"];

const actionTextIdsV1: Readonly<Record<BookshopActionIdV1, string>> = Object.freeze({
  "bookshop.begin_story": "text.bookshop.action.begin",
  "bookshop.earn_coin": "text.bookshop.action.earn",
});

function resolveV1(
  semantic: BookshopSemanticPortV1,
  expectedOccurrenceId: string,
  resolution: DeepReadonly<BookshopInvocationV1> extends never ? never : unknown,
): void {
  void semantic.dispatch(
    Object.freeze({
      kind: "resolve" as const,
      expectedOccurrenceId,
      resolution,
    }) as never,
  );
}

/**
 * The minimal narrative panel: renders the pending say or choice from the
 * published narrative view and dispatches semantic resolutions. The Engine
 * Lab's player (`e2e/src/application/narrative-ui.tsx`) shows
 * the full version with typewriter, auto/skip, history, and voice replay.
 */
export function BookshopNarrativePanelV1(props: {
  readonly publication: DeepReadonly<BookshopUiPublicationV1>;
  readonly semantic: BookshopSemanticPortV1;
  readonly playerProfile: PlayerProfileStoreV1;
}): ReactElement | null {
  const narrative = props.publication.semantic.narrative;
  const pending = narrative.pending;
  const panelStyle = {
    position: "absolute" as const,
    insetInline: "160px",
    insetBlockEnd: "48px",
    padding: "24px 32px",
    borderRadius: "16px",
    background: "rgba(16, 20, 26, 0.82)",
    color: "#f2efe8",
    fontSize: "22px",
    lineHeight: 1.6,
  };

  if (pending === null) {
    if (narrative.phase !== "completed") return null;
    return (
      <div data-bookshop-narrative="completed" style={panelStyle}>
        {bookshopUiTextV1("text.bookshop.narrative.completed")}
      </div>
    );
  }

  return (
    <DialoguePanelV1
      pending={pending as PendingInteractionV1}
      history={narrative.history as NarrativeHistoryV1}
      playerProfile={props.playerProfile}
      uiText={bookshopUiTextV1}
      onResolve={(occurrenceId: string, resolution: DialogueResolutionV1) =>
        resolveV1(props.semantic, occurrenceId, resolution as never)}
      labels={{
        advanceLabel: bookshopUiTextV1("text.bookshop.narrative.advance"),
        autoLabel: bookshopUiTextV1("text.bookshop.playback.auto"),
        skipLabel: bookshopUiTextV1("text.bookshop.playback.skip"),
        historyLabel: bookshopUiTextV1("text.bookshop.playback.history"),
        historyTitle: bookshopUiTextV1("text.bookshop.playback.history.title"),
        historyEmptyText: bookshopUiTextV1("text.bookshop.playback.history.empty"),
        historyCloseLabel: bookshopUiTextV1("text.bookshop.playback.history.close"),
      }}
      panelStyle={panelStyle}
    />
  );
}

export function BookshopHudV1(props: {
  readonly publication: DeepReadonly<BookshopUiPublicationV1>;
  readonly semantic: BookshopSemanticPortV1;
}): ReactElement {
  return (
    <div data-bookshop-hud="true" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <span data-bookshop-coins={String(props.publication.view.coins)}>
        {bookshopUiTextV1("text.bookshop.hud.coins")}
        {String(props.publication.view.coins)}
      </span>
      {props.publication.semantic.actions.map((action) => (
        <Button
          key={action.actionId}
          disabled={!action.enabled}
          data-bookshop-action-id={action.actionId}
          onClick={() =>
            void props.semantic.dispatch(
              Object.freeze({ kind: "invoke" as const, actionId: action.actionId }),
            )}
        >
          {bookshopUiTextV1(actionTextIdsV1[action.actionId])}
        </Button>
      ))}
    </div>
  );
}
