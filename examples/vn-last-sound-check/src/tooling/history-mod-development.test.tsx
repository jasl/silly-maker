// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parsePendingInteractionV1 } from "@sillymaker/base";
import { defaultPlayerProfileV1 } from "@sillymaker/base/runtime";
import type {
  NarrativeSurfaceDialogueRendererPropsV1,
  NarrativeSurfaceHistoryRendererPropsV1,
} from "@sillymaker/ui";
import {
  createVnHistoryPresentationBridgeV1,
  type VnHistoryPresentationBridgeV1,
} from "@sillymaker/vn/ui";

import { vnLastSoundCheckVnPlayerHistoryLabelTextIdsV1 } from "../application/composition.tsx";
import { createVnLastSoundCheckApplicationInstanceV1 } from "../application/core-application.ts";
import { loadVnLastSoundCheckHistoryModDevelopmentV1 } from "./history-mod-development.tsx";

afterEach(cleanup);

const pendingV1 = parsePendingInteractionV1({
  kind: "say",
  definitionId: "interaction.vn-last-sound-check.test",
  seenRevision: 1,
  occurrenceId: "interaction-occurrence.1",
  speakerTextId: null,
  textId: "text.vn-last-sound-check.test",
  advancePolicy: "confirm",
});

function dialoguePropsV1(onOpen: () => void): NarrativeSurfaceDialogueRendererPropsV1 {
  return {
    kind: "dialogue",
    pending: pendingV1,
    choiceAvailability: null,
    playerProfile: defaultPlayerProfileV1,
    playerView: {
      kind: "say",
      phase: "active",
      playbackMode: "normal",
      resolvedSpeakerText: null,
      resolvedText: "Line",
      revealedCharacters: 4,
      revealLength: 4,
      revealComplete: true,
    },
    history: { available: true, onOpen },
    voiceReplayAvailable: false,
    resolveText: (textId) => textId,
    onActivate: () => undefined,
    onChoose: () => undefined,
    onResume: () => undefined,
    onSubmitCustom: () => undefined,
    onToggleAuto: () => undefined,
    onToggleSkip: () => undefined,
    onReplayVoice: () => undefined,
  };
}

function HistoryBridgeHostV1(props: {
  readonly bridge: VnHistoryPresentationBridgeV1;
  readonly onClose: () => void;
}): ReactElement {
  const [historyOpen, setHistoryOpen] = useState(false);
  const dialogue = dialoguePropsV1(() => setHistoryOpen(true));
  const historyProps: NarrativeSurfaceHistoryRendererPropsV1 = {
    kind: "history",
    history: {
      entries: [
        {
          kind: "say",
          occurrenceId: "interaction-occurrence.1",
          definitionId: "interaction.vn-last-sound-check.test",
          seenRevision: 1,
          speakerTextId: null,
          textId: "text.vn-last-sound-check.test",
          voiceAssetId: null,
        },
      ],
    },
    playerProfile: defaultPlayerProfileV1,
    resolveText: (textId) => textId,
    onCloseHistory: () => {
      props.onClose();
      setHistoryOpen(false);
      return true;
    },
  };
  const HistoryRenderer = props.bridge.feature.renderer;
  return (
    <>
      {props.bridge.renderOpenControl(dialogue)}
      {historyOpen ? <HistoryRenderer {...historyProps} /> : null}
    </>
  );
}

async function loadedHistoryModV1(
  bridge = createVnHistoryPresentationBridgeV1(),
  loadHistoryModule = vi.fn(() => import("@sillymaker/vn/history")),
) {
  const handle = await loadVnLastSoundCheckHistoryModDevelopmentV1({
    applicationGeneration: "vn-last-sound-check.history-test",
    bridge,
    labelTextIds: vnLastSoundCheckVnPlayerHistoryLabelTextIdsV1,
    reportFailure: vi.fn(),
    loadHistoryModule,
  });
  const panel = handle.contributions.panels[0];
  if (panel === undefined) throw new TypeError("expected History DevDock panel");
  return {
    bridge,
    handle,
    loadHistoryModule,
    panel,
    async dispose() {
      await handle.dispose?.();
      await bridge.dispose();
    },
  };
}

describe("One Last Sound Check optional History Mod", () => {
  it("exposes load and unload only through its DevDock contribution", async () => {
    const loaded = await loadedHistoryModV1();
    const { loadHistoryModule, panel } = loaded;
    expect(panel).toMatchObject({
      id: "vn-last-sound-check.history-mod",
      side: "right",
      authority: "read_only",
    });
    render(<>{panel.render()}</>);

    fireEvent.click(screen.getByRole("button", { name: "加载 History" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveAttribute(
        "data-vn-history-mod-status",
        "loaded",
      )
    );
    expect(loadHistoryModule).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "卸载 History" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveAttribute(
        "data-vn-history-mod-status",
        "idle",
      )
    );
    await loaded.dispose();
  });

  it("does not evaluate History initially, then loads and unloads an open History window", async () => {
    const loaded = await loadedHistoryModV1();
    const { bridge, loadHistoryModule, panel } = loaded;
    const onClose = vi.fn();
    render(
      <>
        <HistoryBridgeHostV1 bridge={bridge} onClose={onClose} />
        {panel.render()}
      </>,
    );

    expect(loadHistoryModule).not.toHaveBeenCalled();
    expect(bridge.getCurrent()).toBeNull();
    expect(document.querySelector("[data-dialogue-history-open='true']")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "加载 History" }));
    await waitFor(() => expect(bridge.getCurrent()).not.toBeNull());
    expect(loadHistoryModule).toHaveBeenCalledTimes(1);
    const open = document.querySelector<HTMLButtonElement>(
      "[data-dialogue-history-open='true']",
    );
    if (open === null) throw new TypeError("expected History open control");
    fireEvent.click(open);
    expect(screen.getByText("text.vn-last-sound-check.test")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "卸载 History" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(bridge.getCurrent()).toBeNull());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-dialogue-history-open='true']")).toBeNull();
    await loaded.dispose();
  });

  it("keeps authoritative Narrative state and History while presentation selection changes", async () => {
    const loaded = await loadedHistoryModV1();
    const instance = await createVnLastSoundCheckApplicationInstanceV1();
    try {
      await instance.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-last-sound-check.begin_story",
      } as never);
      const pending = instance.semantic.observe().narrative.pending;
      if (pending === null || pending.kind !== "say") throw new TypeError("expected opening say");
      await instance.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: pending.occurrenceId,
        resolution: { kind: "advance" },
      } as never);
      const before = instance.admin.inspectForTest().snapshot;
      expect(before.state.simulation.narrative.history.entries).toHaveLength(1);

      render(<>{loaded.panel.render()}</>);
      fireEvent.click(screen.getByRole("button", { name: "加载 History" }));
      await waitFor(() => expect(loaded.bridge.getCurrent()).not.toBeNull());
      fireEvent.click(screen.getByRole("button", { name: "卸载 History" }));
      await waitFor(() => expect(loaded.bridge.getCurrent()).toBeNull());

      const after = instance.admin.inspectForTest().snapshot;
      expect(after).toEqual(before);
      expect(after.state.simulation.narrative.history).toEqual(
        before.state.simulation.narrative.history,
      );
    } finally {
      await loaded.dispose();
      await instance.dispose();
    }
  });

  it("retires the loaded controller without disposing the resident bridge", async () => {
    const bridge = createVnHistoryPresentationBridgeV1();
    const first = await loadedHistoryModV1(bridge);
    render(<>{first.panel.render()}</>);
    fireEvent.click(screen.getByRole("button", { name: "加载 History" }));
    await waitFor(() => expect(bridge.getCurrent()).not.toBeNull());

    await first.handle.dispose?.();
    expect(bridge.getCurrent()).toBeNull();

    cleanup();
    const successor = await loadedHistoryModV1(bridge);
    render(<>{successor.panel.render()}</>);
    fireEvent.click(screen.getByRole("button", { name: "加载 History" }));
    await waitFor(() => expect(bridge.getCurrent()).not.toBeNull());
    await successor.handle.dispose?.();
    expect(bridge.getCurrent()).toBeNull();
    await bridge.dispose();
  });
});
