// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { NarrativeAsideV1 } from "@sillymaker/base";

import { createNarrativeAsideControllerV1 } from "./narrative-aside-controller.ts";

function asideV1(
  asideSequence: number,
  epoch: number,
  texts: readonly string[],
): NarrativeAsideV1 {
  return Object.freeze({
    asideSequence,
    epoch,
    pages: Object.freeze(
      texts.map((textId) => Object.freeze({ speakerTextId: null, textId })),
    ),
  });
}

describe("narrative aside controller", () => {
  it("presents a push, advances pages locally, and dismisses past the last page", () => {
    const controller = createNarrativeAsideControllerV1({ epoch: 1, dialoguePending: false });
    let notifications = 0;
    controller.subscribe(() => notifications += 1);

    expect(controller.view()).toBeNull();
    controller.push(asideV1(1, 1, ["text.app.aside.first", "text.app.aside.second"]));
    expect(controller.view()).toEqual({
      asideSequence: 1,
      page: { speakerTextId: null, textId: "text.app.aside.first" },
      pageIndex: 0,
      pageCount: 2,
    });

    controller.advance();
    expect(controller.view()).toMatchObject({
      pageIndex: 1,
      page: { speakerTextId: null, textId: "text.app.aside.second" },
    });

    // Advancing past the last page dismisses; further advances are no-ops.
    controller.advance();
    expect(controller.view()).toBeNull();
    const settled = notifications;
    controller.advance();
    expect(notifications).toBe(settled);
  });

  it("drops stale epochs, watermarked re-deliveries, and dialogue-owned arrivals", () => {
    const controller = createNarrativeAsideControllerV1({ epoch: 2, dialoguePending: false });

    // Stale epoch: dropped without consuming the watermark.
    controller.push(asideV1(1, 1, ["text.app.aside.stale"]));
    expect(controller.view()).toBeNull();

    controller.push(asideV1(1, 2, ["text.app.aside.live"]));
    expect(controller.view()).not.toBeNull();

    // Same-epoch re-delivery of a consumed sequence drops.
    controller.dismiss();
    controller.push(asideV1(1, 2, ["text.app.aside.live"]));
    expect(controller.view()).toBeNull();

    // An aside arriving while the authoritative dialogue owns the surface
    // is consumed-by-drop: it cannot surface after the dialogue clears.
    controller.syncPresentation({ epoch: 2, dialoguePending: true });
    controller.push(asideV1(2, 2, ["text.app.aside.queued"]));
    expect(controller.view()).toBeNull();
    controller.syncPresentation({ epoch: 2, dialoguePending: false });
    controller.push(asideV1(2, 2, ["text.app.aside.queued"]));
    expect(controller.view()).toBeNull();

    // The next fresh sequence presents normally.
    controller.push(asideV1(3, 2, ["text.app.aside.next"]));
    expect(controller.view()).toMatchObject({ asideSequence: 3 });
  });

  it("force-dismisses for authoritative dialogue and clears on epoch change", () => {
    const controller = createNarrativeAsideControllerV1({ epoch: 1, dialoguePending: false });
    controller.push(asideV1(1, 1, ["text.app.aside.first", "text.app.aside.second"]));
    expect(controller.view()).not.toBeNull();

    // An authoritative say/choice pending takes the dialogue surface.
    controller.syncPresentation({ epoch: 1, dialoguePending: true });
    expect(controller.view()).toBeNull();
    controller.syncPresentation({ epoch: 1, dialoguePending: false });
    expect(controller.view()).toBeNull();

    // Epoch change (load/rollback/restart) clears a presenting aside; the
    // per-instance sequence keeps rising, so the watermark stays valid.
    controller.push(asideV1(2, 1, ["text.app.aside.reopen"]));
    expect(controller.view()).not.toBeNull();
    controller.syncPresentation({ epoch: 2, dialoguePending: false });
    expect(controller.view()).toBeNull();
    controller.push(asideV1(3, 2, ["text.app.aside.fresh"]));
    expect(controller.view()).toMatchObject({ asideSequence: 3 });
  });

  it("replaces the presenting aside with a newer push and resets the cursor", () => {
    const controller = createNarrativeAsideControllerV1({ epoch: 1, dialoguePending: false });
    controller.push(asideV1(1, 1, ["text.app.aside.first", "text.app.aside.second"]));
    controller.advance();
    expect(controller.view()).toMatchObject({ pageIndex: 1 });

    controller.push(asideV1(2, 1, ["text.app.aside.replacement"]));
    expect(controller.view()).toEqual({
      asideSequence: 2,
      page: { speakerTextId: null, textId: "text.app.aside.replacement" },
      pageIndex: 0,
      pageCount: 1,
    });
  });

  it("keeps a stable view reference between changes", () => {
    const controller = createNarrativeAsideControllerV1({ epoch: 1, dialoguePending: false });
    controller.push(asideV1(1, 1, ["text.app.aside.first", "text.app.aside.second"]));
    const first = controller.view();
    expect(controller.view()).toBe(first);
    controller.advance();
    expect(controller.view()).not.toBe(first);
    expect(controller.view()).toBe(controller.view());
  });
});
