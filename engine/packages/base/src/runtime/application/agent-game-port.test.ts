// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { SemanticGamePortV1 } from "../../contracts/application.ts";
import {
  createAgentDiagnosticsCapabilityV1,
  createAgentPersistenceCapabilityV1,
  createAgentTranscriptRecorderV1,
  createInProcessAgentGamePortV1,
} from "./agent-game-port.ts";

type FixtureSemanticPortV1 = SemanticGamePortV1<
  { readonly count: number },
  null,
  { readonly actionId: string },
  { readonly actionId: string },
  { readonly kind: "allowed" },
  { readonly kind: "committed" },
  "ready" | "busy"
>;

function createSemanticFixtureV1(options: { readonly neverIdle?: boolean } = {}) {
  let revision = 0;
  const publication = () =>
    Object.freeze({
      revision: revision as never,
      status: "ready" as const,
      game: Object.freeze({ count: revision }),
      narrative: null,
      actions: Object.freeze([Object.freeze({ actionId: "fixture.step" })]),
    });
  const dispatched: unknown[] = [];
  const port: FixtureSemanticPortV1 = Object.freeze({
    observe: () => publication(),
    subscribe: () => () => undefined,
    availableActions: () => publication().actions,
    preview: async () => Object.freeze({ kind: "allowed" as const }),
    dispatch: async (invocation: { readonly actionId: string }) => {
      dispatched.push(invocation);
      revision += 1;
      return Object.freeze({ kind: "committed" as const });
    },
    waitForIdle: async () => {
      if (options.neverIdle === true) {
        return new Promise<never>(() => undefined);
      }
      return publication();
    },
  });
  return { port, dispatched, currentRevision: () => revision };
}

const fixtureIdentityV1 = Object.freeze({ storyId: "story.fixture", storyRevision: 1 });

describe("createInProcessAgentGamePortV1", () => {
  it("exposes identity and forwards the player-safe semantic operations", async () => {
    const fixture = createSemanticFixtureV1();
    const agent = createInProcessAgentGamePortV1({
      identity: fixtureIdentityV1,
      semantic: fixture.port,
    });

    expect(agent.identity()).toEqual({ storyId: "story.fixture", storyRevision: 1 });
    expect(agent.observe().game).toEqual({ count: 0 });
    expect(agent.describeActions()).toEqual([{ actionId: "fixture.step" }]);
    await expect(agent.preview({ actionId: "fixture.step" })).resolves.toEqual({
      kind: "allowed",
    });
    await expect(agent.dispatch({ actionId: "fixture.step" })).resolves.toEqual({
      kind: "committed",
    });
    await expect(agent.waitForIdle()).resolves.toMatchObject({ kind: "idle" });
  });

  it("times out a bounded wait without changing gameplay state", async () => {
    const fixture = createSemanticFixtureV1({ neverIdle: true });
    const agent = createInProcessAgentGamePortV1({
      identity: fixtureIdentityV1,
      semantic: fixture.port,
    });

    await expect(agent.waitForIdle({ timeoutMs: 5 })).resolves.toEqual({ kind: "timed_out" });
    expect(fixture.currentRevision()).toBe(0);
    expect(fixture.dispatched).toEqual([]);
  });

  it("aborts a bounded wait through an AbortSignal without changing gameplay state", async () => {
    const fixture = createSemanticFixtureV1({ neverIdle: true });
    const agent = createInProcessAgentGamePortV1({
      identity: fixtureIdentityV1,
      semantic: fixture.port,
    });
    const controller = new AbortController();
    const wait = agent.waitForIdle({ signal: controller.signal });
    controller.abort();
    await expect(wait).resolves.toEqual({ kind: "aborted" });

    const preAborted = new AbortController();
    preAborted.abort();
    await expect(agent.waitForIdle({ signal: preAborted.signal })).resolves.toEqual({
      kind: "aborted",
    });
    expect(fixture.currentRevision()).toBe(0);
  });

  it("records a transcript of every operation with player-safe outputs", async () => {
    const fixture = createSemanticFixtureV1();
    const recorder = createAgentTranscriptRecorderV1(
      createInProcessAgentGamePortV1({ identity: fixtureIdentityV1, semantic: fixture.port }),
    );

    recorder.agent.observe();
    await recorder.agent.dispatch({ actionId: "fixture.step" });
    await recorder.agent.waitForIdle();

    expect(recorder.transcript()).toMatchObject([
      { ordinal: 1, method: "observe" },
      { ordinal: 2, method: "dispatch", input: { actionId: "fixture.step" } },
      { ordinal: 3, method: "waitForIdle", output: "idle" },
    ]);
  });
});

describe("agent capabilities", () => {
  it("answers every persistence call with a structured result after revocation", async () => {
    type FixturePersistenceResultV1 = { readonly kind: "saved" | "loaded" | "imported" };
    const calls: string[] = [];
    const handle = createAgentPersistenceCapabilityV1<
      FixturePersistenceResultV1,
      { readonly bytes: Uint8Array }
    >({
      save: async (slot) => {
        calls.push(`save:${slot}`);
        return { kind: "saved" };
      },
      load: async () => ({ kind: "loaded" }),
      exportCurrentSave: async () => ({ bytes: Uint8Array.of(1) }),
      importSave: async () => ({ kind: "imported" }),
    });

    await expect(handle.capability.save("quick")).resolves.toEqual({ kind: "saved" });
    handle.revoke();
    expect(handle.isRevoked()).toBe(true);
    await expect(handle.capability.save("quick")).resolves.toEqual({
      kind: "capability_revoked",
    });
    await expect(handle.capability.load("quick")).resolves.toEqual({
      kind: "capability_revoked",
    });
    await expect(handle.capability.exportCurrentSave()).resolves.toEqual({
      kind: "capability_revoked",
    });
    await expect(handle.capability.importSave(Uint8Array.of(1))).resolves.toEqual({
      kind: "capability_revoked",
    });
    expect(calls).toEqual(["save:quick"]);
  });

  it("revokes the diagnostics capability independently", async () => {
    const handle = createAgentDiagnosticsCapabilityV1({
      exportDiagnostics: async () => ({ failures: 0 }),
    });
    await expect(handle.capability.exportDiagnostics()).resolves.toEqual({ failures: 0 });
    handle.revoke();
    await expect(handle.capability.exportDiagnostics()).resolves.toEqual({
      kind: "capability_revoked",
    });
  });
});
