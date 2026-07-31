// SPDX-License-Identifier: MIT
// PascalCase React presentation (Vite Fast Refresh–safe).
// Application binding, projector, slots, and labels live in `composition.tsx`.
import { useCallback, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { DeepReadonly, NarrativeHistoryV1, PendingInteractionV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { Button, DialoguePanelV1 } from "@sillymaker/ui";
import type { DialogueResolutionV1 } from "@sillymaker/ui";

import type { CatcafeActionIdV1 } from "./semantic.ts";
import type { CatcafeApplicationInstanceV1 } from "./core-definition.ts";
import type {
  CatcafeAssetRegistryV1,
  CatcafeSemanticPortV1,
  CatcafeUiPublicationV1,
} from "./ui-kit.ts";
import { catcafeThemeV1, dispatchV1, useCatcafeTextV1 } from "./ui-kit.ts";
import { useCatcafeAlbumWatcherV1 } from "../features/album/index.tsx";
import {
  CatcafeContestPanelV1,
  useCatcafeContestToastV1,
} from "../features/contest/contest-panel.tsx";
import { useCatcafeAutoAdvanceV1 } from "../features/calendar/use-auto-advance.ts";
import { useCatcafeAutoBeginV1 } from "../features/dialogue/use-auto-begin.ts";
import { useCatcafeEncounterNoticeV1 } from "../features/encounters/notice.ts";
import { CatcafeEndingScreenV1 } from "../features/endings/ending-screen.tsx";
import { CatcafeStatBarV1 } from "./stat-bar.tsx";
import { catcafeLocalesV1 } from "../presentation.ts";
import { catcafeSlotsV1 } from "../content.ts";

/* Compact in-game buttons: HUD and dialogue shortcut bar use the small size (32px touch targets preserved). */
const catcafeChromeCssV1 = `
[data-cc-hud] .silly-button,
[data-dialogue] .silly-button,
[data-default-system-menu] .silly-button {
  min-block-size: 32px;
  min-inline-size: 32px;
  padding-block: 2px;
  padding-inline: 10px;
  font-size: 13px;
}
`;

const actionTextIdsV1: Readonly<Record<CatcafeActionIdV1, string>> = Object.freeze({
  "cc.begin_story": "text.cc.action.begin",
  "cc.advance_slot": "text.cc.action.advance",
  "cc.enter_contest": "text.cc.action.contest",
  "cc.enter_postgame": "text.cc.ending.continue",
});

/**
 * Dialogue panel: a thin adapter over the engine's DialoguePanelV1 — typewriter,
 * auto/skip, seen markers, history, click surface, and the shortcut bar all come
 * from the engine; this wires only the semantic port, text catalog, and the rollback button.
 */
export function CatcafeNarrativePanelV1(props: {
  readonly publication: DeepReadonly<CatcafeUiPublicationV1>;
  readonly semantic: CatcafeSemanticPortV1;
  readonly playerProfile: PlayerProfileStoreV1;
}): ReactElement | null {
  const uiText = useCatcafeTextV1(props.playerProfile);
  const narrative = props.publication.semantic.narrative;
  const semantic = props.semantic;
  const onResolve = useCallback(
    (occurrenceId: string, resolution: DialogueResolutionV1) =>
      dispatchV1(semantic, {
        kind: "resolve",
        expectedOccurrenceId: occurrenceId,
        resolution,
      } as never),
    [semantic],
  );
  return (
    <DialoguePanelV1
      pending={narrative.pending as PendingInteractionV1 | null}
      history={narrative.history as NarrativeHistoryV1}
      playerProfile={props.playerProfile}
      uiText={uiText}
      onResolve={onResolve}
      labels={{
        advanceLabel: uiText("text.cc.narrative.advance"),
        autoLabel: uiText("text.cc.playback.auto"),
        skipLabel: uiText("text.cc.playback.skip"),
        historyLabel: uiText("text.cc.playback.history"),
        historyTitle: uiText("text.cc.playback.history.title"),
        historyEmptyText: uiText("text.cc.playback.history.empty"),
        historyCloseLabel: uiText("text.cc.playback.history.close"),
      }}
    />
  );
}

/** Player rollback: a bounded checkpoint ring; contest start / ending confirmation are hard barriers (policy in core-definition). */
export function CatcafeRollbackControlV1(props: {
  readonly instance: CatcafeApplicationInstanceV1;
  readonly label: string;
}): ReactElement {
  const rollback = props.instance.rollback;
  const steps = useSyncExternalStore(
    rollback.subscribe,
    () => rollback.available().steps,
    () => rollback.available().steps,
  );
  return (
    <Button
      data-cc-rollback="true"
      data-cc-rollback-steps={String(steps)}
      disabled={steps < 1}
      onClick={() => void rollback.toPrevious()}
    >
      {props.label}
    </Button>
  );
}

export function CatcafeHudV1(props: {
  readonly publication: DeepReadonly<CatcafeUiPublicationV1>;
  readonly semantic: CatcafeSemanticPortV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly instance: CatcafeApplicationInstanceV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
  readonly openAlbum: () => void;
}): ReactElement {
  const uiText = useCatcafeTextV1(props.playerProfile);
  useCatcafeAlbumWatcherV1(props.publication, props.playerProfile);
  useCatcafeAutoBeginV1(props.publication, props.semantic);
  const autoAdvancePending = useCatcafeAutoAdvanceV1(props.publication, props.semantic);
  const contestToast = useCatcafeContestToastV1(props.instance);
  const encounterTextId = useCatcafeEncounterNoticeV1(props.instance);
  const game = props.publication.semantic.game;
  const contest = game.contest;
  const slotName = catcafeSlotsV1[game.calendar.slot] ?? "morning";
  const actions = props.publication.semantic.actions;
  const systemActions = actions.filter(
    (action): action is Extract<(typeof actions)[number], { kind: "system" }> =>
      action.kind === "system" &&
      action.actionId !== "cc.begin_story" &&
      action.actionId !== "cc.enter_postgame",
  );
  const activityActions = actions.filter(
    (action): action is Extract<(typeof actions)[number], { kind: "activity" }> =>
      action.kind === "activity",
  );
  const inOpening = props.publication.semantic.narrative.phase !== "completed";

  const panel = {
    background: catcafeThemeV1.panel,
    border: catcafeThemeV1.panelBorder,
    borderRadius: catcafeThemeV1.radius,
    color: catcafeThemeV1.ink,
    padding: "10px 14px",
    backdropFilter: "blur(4px)",
  } as const;

  if (game.ending !== null) {
    return (
      <CatcafeEndingScreenV1
        ending={game.ending}
        semantic={props.semantic}
        registry={props.registry}
        uiText={uiText}
        onRestart={() => void props.instance.lifecycle.restart()}
      />
    );
  }

  return (
    <div
      data-cc-hud="true"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        padding: "12px",
        gap: "8px",
        fontFamily: "'Avenir Next', 'PingFang SC', system-ui, sans-serif",
      }}
    >
      <style>{catcafeChromeCssV1}</style>
      <header style={{ gridRow: 1, display: "flex", gap: "8px", alignItems: "start" }}>
        <p
          data-cc-calendar={`${String(game.calendar.week)}.${String(game.calendar.day)}.${
            String(game.calendar.slot)
          }`}
          style={{ ...panel, margin: 0, fontSize: "14px" }}
        >
          {game.shop.epilogue === null ? null : (
            <span
              data-cc-epilogue={game.shop.epilogue}
              style={{
                marginInlineEnd: "8px",
                padding: "1px 8px",
                borderRadius: "999px",
                border: `1px solid ${catcafeThemeV1.amber}`,
                color: catcafeThemeV1.amber,
                fontSize: "12px",
              }}
            >
              {uiText("text.cc.hud.epilogue")}
            </span>
          )}
          {uiText("text.cc.hud.week")}
          {String(game.calendar.week)}
          {uiText("text.cc.hud.week.suffix")} · {uiText(`text.cc.day.${String(game.calendar.day)}`)}
          {" "}
          · {uiText(`text.cc.slot.${slotName}`)}
        </p>
        <p data-cc-wallet="true" style={{ ...panel, margin: 0, fontSize: "14px" }}>
          {uiText("text.cc.hud.stamina")} {String(game.calendar.stamina)} ·{" "}
          {uiText("text.cc.hud.money")} {String(game.shop.money)}
        </p>
        {autoAdvancePending
          ? (
            <p
              data-cc-auto-advance="true"
              style={{ ...panel, margin: 0, fontSize: "13px", color: catcafeThemeV1.inkSoft }}
            >
              {uiText("text.cc.hud.auto-advance")}
            </p>
          )
          : null}
      </header>

      <aside
        data-cc-stats="true"
        style={{
          ...panel,
          gridRow: 2,
          justifySelf: "start",
          alignSelf: "start",
          inlineSize: "190px",
          display: inOpening ? "none" : "grid",
          gap: "8px",
        }}
      >
        <strong style={{ fontSize: "13px", color: catcafeThemeV1.amber }}>小雨</strong>
        <CatcafeStatBarV1
          label={uiText("text.cc.hud.trust")}
          value={game.cat.trust}
          accent="#e8b465"
          testId="trust"
        />
        <CatcafeStatBarV1
          label={uiText("text.cc.hud.vigor")}
          value={game.cat.vigor}
          accent="#8fbf7f"
          testId="vigor"
        />
        <CatcafeStatBarV1
          label={uiText("text.cc.hud.skill")}
          value={game.cat.skill}
          accent="#7fa8d9"
          testId="skill"
        />
        <span style={{ fontSize: "12px", opacity: 0.85 }} data-cc-shop-stats="true">
          {uiText("text.cc.hud.reputation")} {String(game.shop.reputation)} ·{" "}
          {uiText("text.cc.hud.tidiness")} {String(game.shop.tidiness)}
        </span>
        {/* Hidden machine-readable mirror for tests and automation assertions. */}
        <span data-cc-stats-text="true" style={{ display: "none" }}>
          {`${uiText("text.cc.hud.trust")}${String(game.cat.trust)} · ${
            uiText("text.cc.hud.vigor")
          }${String(game.cat.vigor)} · ${uiText("text.cc.hud.skill")}${String(game.cat.skill)} · ${
            uiText("text.cc.hud.money")
          }${String(game.shop.money)} · ${uiText("text.cc.hud.reputation")}${
            String(game.shop.reputation)
          } · ${uiText("text.cc.hud.tidiness")}${String(game.shop.tidiness)}`}
        </span>
      </aside>

      <footer
        style={{
          gridRow: 3,
          alignSelf: "end",
          display: "grid",
          gap: "8px",
          justifyItems: "center",
          // Yield the stage while dialogue runs: hide the action bar until the narrative panel exits.
          ...(props.publication.semantic.narrative.pending === null
            ? {}
            : { visibility: "hidden" as const }),
        }}
      >
        {encounterTextId === null ? null : (
          <p
            data-cc-encounter={encounterTextId}
            style={{ ...panel, margin: 0, fontStyle: "italic", fontSize: "14px" }}
          >
            {uiText(encounterTextId)}
          </p>
        )}
        {contestToast === null ? null : (
          <p
            data-cc-contest-toast={contestToast}
            style={{ ...panel, margin: 0, fontWeight: 700, color: catcafeThemeV1.amber }}
          >
            {uiText(contestToast === "won" ? "text.cc.contest.won" : "text.cc.contest.lost")}
          </p>
        )}
        {contest === null
          ? (
            <div
              style={{
                ...panel,
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <span role="group" aria-label="日程" style={{ display: "flex", gap: "8px" }}>
                {systemActions.map((action) => (
                  <Button
                    key={action.actionId}
                    disabled={!action.enabled}
                    data-cc-action-id={action.actionId}
                    onClick={() =>
                      dispatchV1(props.semantic, { kind: "invoke", actionId: action.actionId })}
                  >
                    {uiText(actionTextIdsV1[action.actionId])}
                  </Button>
                ))}
                <Button data-cc-album-open="true" onClick={props.openAlbum}>
                  {uiText("text.cc.album.open")}
                </Button>
                <CatcafeRollbackControlV1
                  instance={props.instance}
                  label={uiText("text.cc.playback.rollback")}
                />
              </span>
              {inOpening ? null : (
                <span
                  role="group"
                  aria-label="活动"
                  style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                >
                  {activityActions.map((action) => (
                    <Button
                      key={action.activityId}
                      disabled={!action.enabled}
                      data-cc-activity={action.activityId}
                      data-cc-blocked={action.blockedBy ?? undefined}
                      onClick={() =>
                        dispatchV1(props.semantic, {
                          kind: "activity",
                          activityId: action.activityId,
                        })}
                    >
                      {uiText(action.nameTextId)}
                    </Button>
                  ))}
                </span>
              )}
            </div>
          )
          : (
            <CatcafeContestPanelV1
              contest={contest}
              semantic={props.semantic}
              registry={props.registry}
              uiText={uiText}
              panelStyle={panel}
            />
          )}
      </footer>
    </div>
  );
}

/**
 * Settings panel: language (switches in-game text immediately), volume/mute (Host
 * preferences, cross-save), fullscreen toggle (same API in browser and webview).
 * Resolution gets one line of copy — the stage scales with the window; desktop-channel window sizing is future work.
 */
export function CatcafeSettingsV1(props: {
  readonly playerProfile: PlayerProfileStoreV1;
}): ReactElement {
  const uiText = useCatcafeTextV1(props.playerProfile);
  const profile = useSyncExternalStore(
    (listener) => props.playerProfile.subscribe(listener),
    () => props.playerProfile.current(),
  );
  const preferences = profile.preferences;
  return (
    <div data-cc-settings="true" style={{ display: "grid", gap: "12px" }}>
      <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {uiText("text.cc.settings.language")}
        <select
          data-cc-settings-locale="true"
          value={preferences.locale ?? "zh-CN"}
          onChange={(event) => {
            void props.playerProfile.updatePreferences({ locale: event.target.value });
          }}
        >
          {catcafeLocalesV1.map((locale) => (
            <option key={locale} value={locale}>
              {locale === "zh-CN" ? "中文" : "English"}
            </option>
          ))}
        </select>
      </label>
      <p style={{ margin: 0, opacity: 0.75, maxInlineSize: "36em" }}>
        {uiText("text.cc.settings.resolution")}
      </p>
    </div>
  );
}
