// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createSillyOsAgentDrainOwnerV1,
  disposeSillyOsProductV1,
} from "../application/application.tsx";

describe("SillyOS application ownership", () => {
  it("stops Agent admission and waits for an unmounted UI drain", async () => {
    const failures: unknown[] = [];
    const owner = createSillyOsAgentDrainOwnerV1((code, error) => {
      failures.push({ code, error });
    });
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const events: string[] = [];
    const unregister = owner.registry.register(async () => {
      events.push("drain_started");
      await held;
      events.push("drain_completed");
    });

    expect(owner.registry.isAccepting()).toBe(true);
    unregister();
    await Promise.resolve();
    expect(events).toEqual(["drain_started"]);

    const stopped = owner.stopAndDrain();
    expect(owner.registry.isAccepting()).toBe(false);
    release();
    await stopped;

    expect(events).toEqual(["drain_started", "drain_completed"]);
    expect(failures).toEqual([]);
  });

  it("disposes Agent, Controller, and shared Authority in order despite predecessor failures", async () => {
    const events: string[] = [];
    const failures: string[] = [];

    await disposeSillyOsProductV1({
      agentDrainOwner: {
        async stopAndDrain(): Promise<void> {
          events.push("agent");
          throw new Error("synthetic Agent drain failure");
        },
      },
      controller: {
        async dispose(): Promise<void> {
          events.push("controller");
          throw new Error("synthetic Controller disposal failure");
        },
      },
      workspaceAuthority: {
        async dispose(): Promise<void> {
          events.push("authority");
        },
      },
      reportFailure: (code) => failures.push(code),
    });

    expect(events).toEqual(["agent", "controller", "authority"]);
    expect(failures).toEqual([
      "silly_os.agent_drain_failed",
      "silly_os.controller_dispose_failed",
    ]);
  });
});
