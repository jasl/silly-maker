// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useEffect, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import {
  ActiveProcessMountBoundaryV1,
  createProgramWorkspaceSessionViewStateStoreV1,
  type ProgramWorkspaceSessionViewStateStoreV1,
} from "../ui/silly-os-app.tsx";

afterEach(cleanup);

function LifetimeProbeV1({
  processId,
  events,
}: {
  readonly processId: string;
  readonly events: string[];
}): ReactNode {
  const [lifetimeProcessId] = useState(() => processId);
  useEffect(() => {
    events.push(`mount:${lifetimeProcessId}`);
    return () => {
      events.push(`unmount:${lifetimeProcessId}`);
    };
  }, [events, lifetimeProcessId]);
  return <div data-process-id={lifetimeProcessId} />;
}

function ViewStateProbeV1({
  processId,
  store,
}: {
  readonly processId: string;
  readonly store: ProgramWorkspaceSessionViewStateStoreV1;
}): ReactNode {
  const [state, setState] = useState(() => store.read(processId));
  return (
    <section
      aria-label={`view:${processId}`}
      data-draft={state.draft}
      data-active-tab={state.activeTab}
      data-workpiece-open={String(state.workpieceOpen)}
      data-mobile-pane={state.mobilePane}
      data-chat-width={String(state.chatWidth)}
      data-scroll-anchor={state.conversation.scrollAnchor.kind}
      data-scroll-entry={state.conversation.scrollAnchor.kind === "entry"
        ? state.conversation.scrollAnchor.entryId
        : undefined}
      data-scroll-sequence={state.conversation.scrollAnchor.kind === "entry"
        ? String(state.conversation.scrollAnchor.sequence)
        : undefined}
      data-scroll-offset={state.conversation.scrollAnchor.kind === "entry"
        ? String(state.conversation.scrollAnchor.offset)
        : undefined}
      data-selection-start={String(state.conversation.composerSelectionStart)}
      data-selection-end={String(state.conversation.composerSelectionEnd)}
    >
      <button
        type="button"
        onClick={() => {
          const next = {
            draft: `draft:${processId}`,
            activeTab: "capabilities" as const,
            workpieceOpen: false,
            mobilePane: "preview" as const,
            chatWidth: 512,
            conversation: {
              scrollAnchor: {
                kind: "entry" as const,
                entryId: `entry:${processId}`,
                sequence: 17,
                offset: -24,
              },
              composerSelectionStart: 2,
              composerSelectionEnd: 8,
            },
          };
          store.write(processId, next);
          setState(next);
        }}
      >
        Edit {processId}
      </button>
    </section>
  );
}

describe("SillyOS active Process route boundary", () => {
  it("unmounts the predecessor rich subtree before mounting another Process", () => {
    const events: string[] = [];
    const view = render(
      <ActiveProcessMountBoundaryV1 processId="process.first">
        <LifetimeProbeV1 processId="process.first" events={events} />
      </ActiveProcessMountBoundaryV1>,
    );

    view.rerender(
      <ActiveProcessMountBoundaryV1 processId="process.second">
        <LifetimeProbeV1 processId="process.second" events={events} />
      </ActiveProcessMountBoundaryV1>,
    );

    expect(events).toEqual([
      "mount:process.first",
      "unmount:process.first",
      "mount:process.second",
    ]);
    expect(view.container.querySelector("[data-process-id='process.first']")).toBeNull();
    expect(view.container.querySelector("[data-process-id='process.second']")).not.toBeNull();
  });

  it("restores only lightweight Process view state after switching away and back", () => {
    const store = createProgramWorkspaceSessionViewStateStoreV1();
    const workspace = (processId: string): ReactNode => (
      <ActiveProcessMountBoundaryV1 processId={processId}>
        <ViewStateProbeV1 processId={processId} store={store} />
      </ActiveProcessMountBoundaryV1>
    );
    const view = render(workspace("process.first"));

    fireEvent.click(screen.getByRole("button", { name: "Edit process.first" }));
    expect(screen.getByRole("region", { name: "view:process.first" })).toHaveAttribute(
      "data-draft",
      "draft:process.first",
    );

    view.rerender(workspace("process.second"));
    expect(screen.getByRole("region", { name: "view:process.second" })).toHaveAttribute(
      "data-draft",
      "",
    );

    view.rerender(workspace("process.first"));
    const restored = screen.getByRole("region", { name: "view:process.first" });
    expect(restored).toHaveAttribute("data-draft", "draft:process.first");
    expect(restored).toHaveAttribute("data-active-tab", "capabilities");
    expect(restored).toHaveAttribute("data-workpiece-open", "false");
    expect(restored).toHaveAttribute("data-mobile-pane", "preview");
    expect(restored).toHaveAttribute("data-chat-width", "512");
    expect(restored).toHaveAttribute("data-scroll-anchor", "entry");
    expect(restored).toHaveAttribute("data-scroll-entry", "entry:process.first");
    expect(restored).toHaveAttribute("data-scroll-sequence", "17");
    expect(restored).toHaveAttribute("data-scroll-offset", "-24");
    expect(restored).toHaveAttribute("data-selection-start", "2");
    expect(restored).toHaveAttribute("data-selection-end", "8");
    expect(store.read("process.first")).not.toHaveProperty("fullscreen");
  });
});
