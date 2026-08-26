// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  createCreatorSessionV1,
  creatorIntentMaximumCharactersV1,
} from "../product/creator-session.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";

function createSessionV1() {
  return createCreatorSessionV1({ creator: createDeterministicFakeCreatorV1() });
}

describe("SillyOS Creator preview session", () => {
  it("starts at Home and creates one deterministic translation workspace", () => {
    const first = createSessionV1();
    const second = createSessionV1();
    const listener = vi.fn();
    first.subscribe(listener);

    expect(first.getSnapshot()).toEqual({
      revision: 0,
      source: "deterministic_fake_preview",
      route: "home",
      workspace: null,
      messages: [],
      proposal: null,
      program: null,
      activity: [],
    });

    expect(first.submitIntent("  请翻译这份游戏文本，并保留人工审校。  ")).toEqual({
      kind: "created",
      workspaceId: "workspace.preview.1",
    });
    second.submitIntent("请翻译这份游戏文本，并保留人工审校。");

    const snapshot = first.getSnapshot();
    expect(snapshot).toEqual(second.getSnapshot());
    expect(snapshot.route).toBe("workspace");
    expect(snapshot.workspace?.intent).toBe("请翻译这份游戏文本，并保留人工审校。");
    expect(snapshot.proposal?.status).toBe("pending");
    expect(snapshot.program).toMatchObject({ kind: "translation", name: "翻译工作间" });
    expect(snapshot.program?.suggestedCapabilities).toHaveLength(3);
    expect(snapshot.messages.map(({ role }) => role)).toEqual(["user", "creator"]);
    expect(snapshot.activity.map(({ kind }) => kind)).toEqual([
      "intent_submitted",
      "proposal_created",
    ]);
    expect(snapshot.messages[1]?.text).toContain("根据你的意图");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("accepts or rejects a proposal once and records the visible decision", () => {
    const accepted = createSessionV1();
    accepted.submitIntent("Draft a short story with an editable outline.");
    const before = accepted.getSnapshot();

    expect(accepted.acceptProposal()).toEqual({ kind: "applied", status: "accepted" });
    expect(accepted.getSnapshot().revision).toBe(before.revision + 1);
    expect(accepted.getSnapshot().proposal?.status).toBe("accepted");
    expect(accepted.getSnapshot().activity.at(-1)?.kind).toBe("proposal_accepted");
    expect(accepted.getSnapshot().messages.at(-1)?.text).toContain("Proposal accepted");
    expect(accepted.rejectProposal()).toEqual({ kind: "unchanged", status: "accepted" });

    const rejected = createSessionV1();
    rejected.submitIntent("Create a roleplay conversation for two characters.");
    expect(rejected.rejectProposal()).toEqual({ kind: "applied", status: "rejected" });
    expect(rejected.getSnapshot().proposal?.status).toBe("rejected");
    expect(rejected.getSnapshot().activity.at(-1)?.kind).toBe("proposal_rejected");
    expect(rejected.acceptProposal()).toEqual({ kind: "unchanged", status: "rejected" });
  });

  it("rejects invalid Home input without publishing or calling the fake creator", () => {
    const creator = createDeterministicFakeCreatorV1();
    const create = vi.spyOn(creator, "create");
    const session = createCreatorSessionV1({ creator });
    const listener = vi.fn();
    session.subscribe(listener);

    expect(session.acceptProposal()).toEqual({ kind: "unavailable" });
    expect(session.submitIntent("   ")).toEqual({ kind: "rejected", reason: "empty_intent" });
    expect(session.submitIntent("x".repeat(creatorIntentMaximumCharactersV1 + 1))).toEqual({
      kind: "rejected",
      reason: "intent_too_long",
    });
    expect(session.getSnapshot().route).toBe("home");
    expect(create).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("records a follow-up and can return to Home without persistence claims", () => {
    const session = createSessionV1();
    expect(session.sendFollowUp("not yet")).toEqual({ kind: "unavailable" });
    session.submitIntent("请创建一个写作助手。");

    expect(session.sendFollowUp("先从三幕结构开始。")).toEqual({ kind: "sent" });
    expect(session.getSnapshot().messages.at(-2)).toMatchObject({
      role: "user",
      text: "先从三幕结构开始。",
    });
    expect(session.getSnapshot().messages.at(-1)?.text).toContain("这条补充");
    expect(session.getSnapshot().activity.at(-1)?.kind).toBe("follow_up_submitted");

    expect(session.openHome()).toBe(true);
    expect(session.getSnapshot()).toMatchObject({
      route: "home",
      workspace: null,
      messages: [],
      proposal: null,
      program: null,
      activity: [],
    });
    expect(session.openHome()).toBe(false);
  });

  it("unsubscribes observers and assigns a fresh local workspace on another intent", () => {
    const session = createSessionV1();
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    session.submitIntent("First request");
    unsubscribe();
    session.submitIntent("Second request");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().workspace?.workspaceId).toBe("workspace.preview.2");
    expect(session.getSnapshot().workspace?.intent).toBe("Second request");
  });
});
