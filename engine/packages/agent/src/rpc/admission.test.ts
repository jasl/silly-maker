// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitAgentSessionCancelInputInternalV1,
  admitAgentSessionResponseInternalV1,
  admitAgentSessionStreamEventInternalV1,
  admitAgentSessionSubmitInputInternalV1,
} from "./admission.ts";
import type { AgentSessionSubmitInputV1 } from "../session/contracts.ts";

describe("Agent Session RPC admission", () => {
  it("admits syntactically valid identifiers longer than the former arbitrary limit", () => {
    const sessionId = `session.${"segment".repeat(24)}`;
    const runId = `run.${"segment".repeat(24)}`;

    expect(admitAgentSessionSubmitInputInternalV1({ sessionId, text: "Continue." }))
      .toEqual({ kind: "admitted", value: { sessionId, text: "Continue." } });
    expect(admitAgentSessionCancelInputInternalV1({ sessionId, runId }))
      .toEqual({ kind: "admitted", value: { sessionId, runId } });
    expect(admitAgentSessionResponseInternalV1("start", { kind: "started", sessionId }))
      .toEqual({ kind: "admitted", value: { kind: "started", sessionId } });
    expect(admitAgentSessionResponseInternalV1("submit", { kind: "submitted", runId }))
      .toEqual({ kind: "admitted", value: { kind: "submitted", runId } });
    expect(admitAgentSessionStreamEventInternalV1({
      kind: "run_completed",
      sessionId,
      runId,
      sequence: 1,
    })).toEqual({
      kind: "admitted",
      value: { kind: "run_completed", sessionId, runId, sequence: 1 },
    });
  });

  it("continues to reject malformed identifier syntax", () => {
    expect(admitAgentSessionCancelInputInternalV1({
      sessionId: "session contains spaces",
      runId: "run.1",
    })).toMatchObject({ kind: "rejected", diagnostic: { path: "/sessionId" } });
  });

  it("admits exact outbound text without a transport-size policy", () => {
    const text = `译${'\\"\n'.repeat(30_000)}`;

    expect(admitAgentSessionSubmitInputInternalV1({ sessionId: "session.1", text }))
      .toEqual({ kind: "admitted", value: { sessionId: "session.1", text } });
  });

  it("rejects accessor-backed outbound fields without invoking them", () => {
    let reads = 0;
    const input = { sessionId: "session.1" } as AgentSessionSubmitInputV1;
    Object.defineProperty(input, "text", {
      enumerable: true,
      get() {
        reads += 1;
        return "must not run";
      },
    });

    expect(admitAgentSessionSubmitInputInternalV1(input)).toMatchObject({
      kind: "rejected",
      diagnostic: { path: "/sessionId" },
    });
    expect(reads).toBe(0);
  });
});
