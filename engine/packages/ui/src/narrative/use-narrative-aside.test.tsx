// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StrictMode } from "react";

import type { NarrativeAsideV1 } from "@sillymaker/base";

import { useNarrativeAsideV1 } from "./use-narrative-aside.ts";

afterEach(() => cleanup());

function asideV1(asideSequence: number, epoch: number, texts: readonly string[]): NarrativeAsideV1 {
  return Object.freeze({
    asideSequence,
    epoch,
    pages: Object.freeze(
      texts.map((textId) => Object.freeze({ speakerTextId: null, textId })),
    ),
  });
}

interface HarnessPropsV1 {
  readonly subscribeNarrativeAsides: (
    listener: (aside: NarrativeAsideV1) => void,
  ) => () => void;
  readonly epoch: number;
  readonly dialoguePending: boolean;
}

function AsideProbeV1(props: HarnessPropsV1) {
  const aside = useNarrativeAsideV1(props);
  if (aside.view === null) return <p data-aside="none">静场</p>;
  return (
    <button
      type="button"
      data-aside="page"
      data-aside-sequence={aside.view.asideSequence}
      data-aside-page-index={aside.view.pageIndex}
      onClick={aside.advance}
    >
      {aside.view.page.textId}
    </button>
  );
}

function createPushHarnessV1() {
  const listeners = new Set<(aside: NarrativeAsideV1) => void>();
  return {
    subscribe: (listener: (aside: NarrativeAsideV1) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    push: (aside: NarrativeAsideV1) => {
      for (const listener of [...listeners]) listener(aside);
    },
    listenerCount: () => listeners.size,
  };
}

describe("useNarrativeAsideV1", () => {
  it("presents pushes, advances by click, and dismisses past the last page", () => {
    const harness = createPushHarnessV1();
    const view = render(
      <StrictMode>
        <AsideProbeV1
          subscribeNarrativeAsides={harness.subscribe}
          epoch={1}
          dialoguePending={false}
        />
      </StrictMode>,
    );
    expect(view.container.querySelector("[data-aside='none']")).not.toBeNull();

    act(() => {
      harness.push(asideV1(1, 1, ["text.app.aside.first", "text.app.aside.second"]));
    });
    const page = view.container.querySelector("[data-aside='page']") as HTMLButtonElement;
    expect(page.textContent).toBe("text.app.aside.first");

    act(() => page.click());
    expect(view.container.querySelector("[data-aside='page']")?.textContent).toBe(
      "text.app.aside.second",
    );

    const last = view.container.querySelector("[data-aside='page']") as HTMLButtonElement;
    act(() => last.click());
    expect(view.container.querySelector("[data-aside='none']")).not.toBeNull();
  });

  it("force-dismisses when the authoritative dialogue takes the surface", () => {
    const harness = createPushHarnessV1();
    const view = render(
      <AsideProbeV1
        subscribeNarrativeAsides={harness.subscribe}
        epoch={1}
        dialoguePending={false}
      />,
    );
    act(() => {
      harness.push(asideV1(1, 1, ["text.app.aside.first", "text.app.aside.second"]));
    });
    expect(view.container.querySelector("[data-aside='page']")).not.toBeNull();

    view.rerender(
      <AsideProbeV1
        subscribeNarrativeAsides={harness.subscribe}
        epoch={1}
        dialoguePending={true}
      />,
    );
    expect(view.container.querySelector("[data-aside='none']")).not.toBeNull();

    // Consumed-by-drop while the dialogue owns the surface.
    act(() => {
      harness.push(asideV1(2, 1, ["text.app.aside.blocked"]));
    });
    view.rerender(
      <AsideProbeV1
        subscribeNarrativeAsides={harness.subscribe}
        epoch={1}
        dialoguePending={false}
      />,
    );
    expect(view.container.querySelector("[data-aside='none']")).not.toBeNull();
  });

  it("clears on epoch changes and unsubscribes on unmount", () => {
    const harness = createPushHarnessV1();
    const view = render(
      <AsideProbeV1
        subscribeNarrativeAsides={harness.subscribe}
        epoch={1}
        dialoguePending={false}
      />,
    );
    act(() => {
      harness.push(asideV1(1, 1, ["text.app.aside.first"]));
    });
    expect(view.container.querySelector("[data-aside='page']")).not.toBeNull();

    view.rerender(
      <AsideProbeV1
        subscribeNarrativeAsides={harness.subscribe}
        epoch={2}
        dialoguePending={false}
      />,
    );
    expect(view.container.querySelector("[data-aside='none']")).not.toBeNull();

    // A fresh push in the new epoch presents (sequence keeps rising).
    act(() => {
      harness.push(asideV1(2, 2, ["text.app.aside.fresh"]));
    });
    expect(
      view.container.querySelector("[data-aside='page']")?.getAttribute("data-aside-sequence"),
    ).toBe("2");

    expect(harness.listenerCount()).toBeGreaterThan(0);
    view.unmount();
    expect(harness.listenerCount()).toBe(0);
  });
});
