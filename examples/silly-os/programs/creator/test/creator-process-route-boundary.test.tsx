// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useEffect, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import {
  ActiveCreatorProcessBoundaryV1,
  createCreatorWorkspaceViewStateStoreV1,
  openCreatorProgramWithRetainedConversationV1,
  type CreatorWorkspaceViewStateStoreV1,
} from "../ui/creator-program-surface.tsx";
import { createDefaultProgramWorkspaceSessionViewStateV1 } from "../ui/program-workspace.tsx";

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
  readonly store: CreatorWorkspaceViewStateStoreV1;
}): ReactNode {
  const [state, setState] = useState(() =>
    store.read(processId) ?? createDefaultProgramWorkspaceSessionViewStateV1()
  );
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

describe("Creator active Process route boundary", () => {
  it("unmounts the predecessor rich subtree before mounting another Process", () => {
    const events: string[] = [];
    const view = render(
      <ActiveCreatorProcessBoundaryV1 processId="process.first">
        <LifetimeProbeV1 processId="process.first" events={events} />
      </ActiveCreatorProcessBoundaryV1>,
    );
    expect(view.container.querySelector(".active-process-mount-boundary")).toBeNull();
    expect(view.container.firstElementChild).toHaveAttribute("data-process-id", "process.first");

    view.rerender(
      <ActiveCreatorProcessBoundaryV1 processId="process.second">
        <LifetimeProbeV1 processId="process.second" events={events} />
      </ActiveCreatorProcessBoundaryV1>,
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
    const store = createCreatorWorkspaceViewStateStoreV1();
    const workspace = (processId: string): ReactNode => (
      <ActiveCreatorProcessBoundaryV1 processId={processId}>
        <ViewStateProbeV1 processId={processId} store={store} />
      </ActiveCreatorProcessBoundaryV1>
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

  it("loads the retained Conversation anchor before reopening a Process surface", async () => {
    const store = createCreatorWorkspaceViewStateStoreV1();
    store.write("process.first", {
      ...createDefaultProgramWorkspaceSessionViewStateV1(),
      conversation: {
        scrollAnchor: {
          kind: "entry",
          entryId: "entry.retained",
          sequence: 17,
          offset: -24,
        },
        composerSelectionStart: 0,
        composerSelectionEnd: 0,
      },
    });
    let releaseRestore!: () => void;
    const restoreGate = new Promise<void>((resolve) => {
      releaseRestore = resolve;
    });
    const restoredSequences: number[] = [];
    const controller = {
      openProgram: async () => ({ kind: "completed" as const, value: true }),
      getSnapshot: () => ({
        activeProcess: {
          process: { processId: "process.first" },
          transcript: {
            entries: [{ entryId: "entry.latest", sequence: 24 }],
          },
        },
      }),
      restoreTranscriptAround: async (sequence: number) => {
        restoredSequences.push(sequence);
        await restoreGate;
        return { kind: "completed" as const, value: true };
      },
    } as unknown as Parameters<typeof openCreatorProgramWithRetainedConversationV1>[0];

    let settled = false;
    const opening = openCreatorProgramWithRetainedConversationV1(
      controller,
      store,
      "program.first",
    ).then((result) => {
      settled = true;
      return result;
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(restoredSequences).toEqual([17]);
    expect(settled).toBe(false);
    releaseRestore();
    await expect(opening).resolves.toBe(true);
  });
});
