// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { emptyNarrativeHistoryV1, parsePendingInteractionV1 } from "@sillymaker/base";
import { defaultPlayerProfileV1 } from "@sillymaker/base/runtime";
import type {
  NarrativeSurfaceDialogueRendererPropsV1,
  NarrativeSurfaceHistoryRendererPropsV1,
} from "@sillymaker/ui";

import {
  createVnHistoryPresentationBridgeV1,
  type VnHistoryPresentationBridgeV1,
  type VnHistoryPresentationV1,
} from "./history-presentation-bridge.tsx";

afterEach(cleanup);

const pendingV1 = parsePendingInteractionV1({
  kind: "say",
  definitionId: "interaction.test.line",
  seenRevision: 1,
  occurrenceId: "interaction-occurrence.1",
  speakerTextId: null,
  textId: "text.test.line",
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

function presentationV1(name: string): VnHistoryPresentationV1 {
  function HistoryRenderer(
    _props: NarrativeSurfaceHistoryRendererPropsV1,
  ): ReactElement {
    return <div>{name} history</div>;
  }
  return {
    feature: { renderer: HistoryRenderer },
    renderOpenControl: (props) => (
      <button type="button" onClick={props.history?.onOpen}>
        {name} open
      </button>
    ),
  };
}

function BridgeHostV1(props: {
  readonly bridge: VnHistoryPresentationBridgeV1;
  readonly closeAccepted?: boolean;
  readonly onClose?: () => void;
}): ReactElement {
  const [historyOpen, setHistoryOpen] = useState(false);
  const dialogue = dialoguePropsV1(() => setHistoryOpen(true));
  const historyProps: NarrativeSurfaceHistoryRendererPropsV1 = {
    kind: "history",
    history: emptyNarrativeHistoryV1,
    playerProfile: defaultPlayerProfileV1,
    resolveText: (textId) => textId,
    onCloseHistory: () => {
      props.onClose?.();
      if (props.closeAccepted === false) return false;
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

describe("VN History presentation bridge", () => {
  it("publishes, closes an open predecessor, commits the successor, and unloads", async () => {
    const first = presentationV1("First");
    const second = presentationV1("Second");
    const bridge = createVnHistoryPresentationBridgeV1();
    const onClose = vi.fn();
    render(<BridgeHostV1 bridge={bridge} onClose={onClose} />);

    expect(screen.queryByRole("button")).toBeNull();
    const firstPublication = bridge.publish(first);
    await screen.findByRole("button", { name: "First open" });
    await firstPublication;
    fireEvent.click(screen.getByRole("button", { name: "First open" }));
    expect(screen.getByText("First history")).toBeInTheDocument();

    const secondPublication = bridge.publish(second);
    await screen.findByRole("button", { name: "Second open" });
    await secondPublication;
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("First history")).toBeNull();
    expect(screen.getByRole("button", { name: "Second open" })).toBeInTheDocument();
    expect(bridge.getCurrent()).toBe(second);

    const removal = bridge.publish(null);
    await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
    await removal;
    expect(bridge.getCurrent()).toBeNull();
    expect(emptyNarrativeHistoryV1.entries).toEqual([]);
    await bridge.dispose();
  });

  it("retains the predecessor when the generic History owner rejects close", async () => {
    const first = presentationV1("First");
    const second = presentationV1("Second");
    const bridge = createVnHistoryPresentationBridgeV1(first);
    render(<BridgeHostV1 bridge={bridge} closeAccepted={false} />);

    fireEvent.click(screen.getByRole("button", { name: "First open" }));
    await expect(bridge.publish(second)).rejects.toThrowError(
      "vn.history_presentation_close_stale",
    );

    expect(bridge.getCurrent()).toBe(first);
    expect(screen.getByText("First history")).toBeInTheDocument();
  });

  it("uses the close callback from the latest committed render", async () => {
    const first = presentationV1("First");
    const second = presentationV1("Second");
    const bridge = createVnHistoryPresentationBridgeV1(first);
    const predecessorClose = vi.fn();
    const currentClose = vi.fn();
    const view = render(<BridgeHostV1 bridge={bridge} onClose={predecessorClose} />);

    fireEvent.click(screen.getByRole("button", { name: "First open" }));
    view.rerender(<BridgeHostV1 bridge={bridge} onClose={currentClose} />);
    await bridge.publish(second);

    expect(predecessorClose).not.toHaveBeenCalled();
    expect(currentClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("First history")).toBeNull();
  });

  it("isolates a throwing observer from publication authority", async () => {
    const first = presentationV1("First");
    const bridge = createVnHistoryPresentationBridgeV1();
    const unsubscribe = bridge.subscribe(() => {
      throw new Error("observer exploded");
    });
    render(<BridgeHostV1 bridge={bridge} />);

    await expect(bridge.publish(first)).resolves.toBeUndefined();
    expect(bridge.getCurrent()).toBe(first);
    expect(screen.getByRole("button", { name: "First open" })).toBeInTheDocument();

    unsubscribe();
    await bridge.dispose();
  });

  it("rejects publication as soon as terminal disposal is requested", async () => {
    const first = presentationV1("First");
    const bridge = createVnHistoryPresentationBridgeV1(first);
    render(<BridgeHostV1 bridge={bridge} />);

    const disposal = bridge.dispose();
    await expect(bridge.publish(first)).rejects.toThrowError(
      "vn.history_presentation_bridge_disposed",
    );
    await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
    await disposal;

    expect(bridge.getCurrent()).toBeNull();
    await expect(bridge.publish(first)).rejects.toThrowError(
      "vn.history_presentation_bridge_disposed",
    );
  });
});
