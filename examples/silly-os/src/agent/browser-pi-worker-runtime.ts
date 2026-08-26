// SPDX-License-Identifier: MIT

import {
  admitCreatorAgentSubmitTextV1,
  admitCreatorProgramRevisionCandidateV1,
} from "../product/creator-agent-admission.ts";
import {
  creatorAgentFinalReplyMaximumCharactersV1,
  type CreatorAgentSubmitV1,
  type CreatorProgramRevisionCandidateV1,
} from "../product/contracts.ts";
import { browserPiDistributionIdentityV1 } from "./browser-pi-distribution.ts";
import {
  createDeterministicPiAgentV1,
  type DeterministicPiAgentPortV1,
} from "./browser-pi-runtime-bridge.js";
import {
  admitBrowserPiEngineRequestV1,
  admitBrowserPiWorkerInboundMessageV1,
  type BrowserPiWorkerOutboundMessageV1,
} from "./browser-pi-worker-protocol.ts";

export { creatorProgramRevisionToolNameV1 } from "./browser-pi-runtime-bridge.js";

interface ActivePiRunV1 {
  readonly sessionId: string;
  readonly runId: string;
  readonly agent: DeterministicPiAgentPortV1;
  sequence: number;
  draft: string;
  candidate: CreatorProgramRevisionCandidateV1 | null;
  terminal: boolean;
}

export interface BrowserPiWorkerRuntimePortV1 {
  receive(message: unknown): void;
  dispose(): void;
}

export function createBrowserPiWorkerRuntimeV1(input: {
  readonly postMessage: (message: BrowserPiWorkerOutboundMessageV1) => void;
}): BrowserPiWorkerRuntimePortV1 {
  let credentialKey: string | null = null;
  let initialized = false;
  let disposed = false;
  let nextSessionId = 1;
  let nextRunId = 1;
  let activeSessionId: string | null = null;
  let activeRun: ActivePiRunV1 | null = null;

  const post = (message: BrowserPiWorkerOutboundMessageV1): void => {
    // This is a Worker-port callback, not Window.postMessage.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker port has no targetOrigin
    if (!disposed) input.postMessage(message);
  };

  const postProtocolFailure = (
    code: "invalid_message" | "already_initialized" | "distribution_mismatch",
  ): void => {
    post(Object.freeze({ revision: 1, kind: "protocol_failure", code }));
  };

  const emitRecord = (
    run: ActivePiRunV1,
    record: Readonly<Record<string, unknown>>,
    requireCurrent = true,
  ): void => {
    if (run.terminal || (requireCurrent && activeRun !== run)) return;
    run.sequence += 1;
    post(Object.freeze({
      revision: 1,
      kind: "rpc_record",
      record: Object.freeze({
        ...record,
        sessionId: run.sessionId,
        runId: run.runId,
        sequence: run.sequence,
      }),
    }));
  };

  const failRun = (
    run: ActivePiRunV1,
    code: "cancelled" | "replaced" | "draft_limit" | "candidate_missing" | "pi_failed",
    requireCurrent = true,
  ): void => {
    if (run.terminal || (requireCurrent && activeRun !== run)) return;
    emitRecord(run, { kind: "run_failed", code }, requireCurrent);
    run.terminal = true;
    run.agent.dispose();
  };

  const createRun = (submit: CreatorAgentSubmitV1): ActivePiRunV1 => {
    const sessionId = activeSessionId;
    if (sessionId === null) throw new TypeError("Creator session is not started");
    const runNumber = nextRunId++;
    let run!: ActivePiRunV1;
    const agent = createDeterministicPiAgentV1({
      submit,
      runNumber,
      onCandidate(value): void {
        if (activeRun !== run || run.terminal) throw new Error("Creator run was cancelled");
        if (run.candidate !== null) {
          throw new Error("Only one Program revision candidate is allowed");
        }
        const admitted = admitCreatorProgramRevisionCandidateV1(value);
        if (admitted.kind === "rejected") {
          throw new TypeError(`Invalid Program revision candidate${admitted.path}`);
        }
        if (
          admitted.value.revision !== submit.revision ||
          admitted.value.proposalId !== submit.proposalId ||
          admitted.value.programId !== submit.programId ||
          admitted.value.baseProgramRevision !== submit.baseProgramRevision ||
          admitted.value.text !== submit.text
        ) {
          throw new TypeError(
            "Program revision candidate does not match the admitted submit context",
          );
        }
        run.candidate = Object.freeze(admitted.value);
      },
      onTextDelta(delta): void {
        if (activeRun !== run || run.terminal || delta.length === 0) return;
        if (run.draft.length + delta.length > creatorAgentFinalReplyMaximumCharactersV1) {
          failRun(run, "draft_limit");
          return;
        }
        run.draft += delta;
        emitRecord(run, { kind: "artifact_chunk", text: delta });
      },
    });
    run = {
      sessionId,
      runId: `sillyos.run.${runNumber}`,
      agent,
      sequence: 0,
      draft: "",
      candidate: null,
      terminal: false,
    };
    return run;
  };

  const executeRun = async (run: ActivePiRunV1, submitText: string): Promise<void> => {
    if (disposed || activeRun !== run || run.terminal) return;
    let outcome: Awaited<ReturnType<DeterministicPiAgentPortV1["prompt"]>>;
    try {
      outcome = await run.agent.prompt(submitText);
    } catch {
      failRun(run, "pi_failed");
      return;
    }
    if (disposed || activeRun !== run || run.terminal) return;
    if (outcome.stopReason !== "stop") {
      failRun(run, outcome.stopReason === "aborted" ? "cancelled" : "pi_failed");
      return;
    }
    if (run.candidate === null) {
      failRun(run, "candidate_missing");
      return;
    }
    emitRecord(run, { kind: "artifact_complete", candidate: run.candidate });
    emitRecord(run, { kind: "run_completed" });
    run.terminal = true;
    run.agent.dispose();
  };

  const respondFailure = (
    requestId: number,
    code: "not_initialized" | "invalid_request" | "session_mismatch",
  ): void => {
    post(Object.freeze({ revision: 1, kind: "rpc_response", requestId, ok: false, code }));
  };

  const receive = (raw: unknown): void => {
    if (disposed) return;
    const message = admitBrowserPiWorkerInboundMessageV1(raw);
    if (message === null) {
      postProtocolFailure("invalid_message");
      return;
    }
    if (message.kind === "initialize") {
      if (initialized) {
        postProtocolFailure("already_initialized");
        return;
      }
      credentialKey = message.credential.value;
      initialized = true;
      post(Object.freeze({
        revision: 1,
        kind: "ready",
        requestId: message.requestId,
        runtime: "deterministic_test",
        distribution: browserPiDistributionIdentityV1,
      }));
      return;
    }
    if (!initialized || credentialKey === null) {
      respondFailure(message.requestId, "not_initialized");
      return;
    }
    const request = admitBrowserPiEngineRequestV1(message.record);
    if (request === null) {
      respondFailure(message.requestId, "invalid_request");
      return;
    }
    if (request.method === "start") {
      const replaced = activeRun;
      if (replaced !== null && !replaced.terminal) failRun(replaced, "replaced", false);
      activeRun = null;
      activeSessionId = `sillyos.session.${nextSessionId++}`;
      post(Object.freeze({
        revision: 1,
        kind: "rpc_response",
        requestId: message.requestId,
        ok: true,
        response: Object.freeze({ kind: "started", sessionId: activeSessionId }),
      }));
      return;
    }
    if (activeSessionId === null || request.params.sessionId !== activeSessionId) {
      respondFailure(message.requestId, "session_mismatch");
      return;
    }
    if (request.method === "cancel") {
      const run = activeRun;
      if (run === null || run.runId !== request.params.runId) {
        respondFailure(message.requestId, "session_mismatch");
        return;
      }
      post(Object.freeze({
        revision: 1,
        kind: "rpc_response",
        requestId: message.requestId,
        ok: true,
        response: Object.freeze({ kind: "cancel_requested" }),
      }));
      queueMicrotask(() => failRun(run, "cancelled"));
      return;
    }

    const admittedSubmit = admitCreatorAgentSubmitTextV1(request.params.text);
    if (admittedSubmit.kind === "rejected") {
      respondFailure(message.requestId, "invalid_request");
      return;
    }
    const replaced = activeRun !== null && !activeRun.terminal ? activeRun : null;
    const run = createRun(admittedSubmit.value);
    activeRun = run;
    post(Object.freeze({
      revision: 1,
      kind: "rpc_response",
      requestId: message.requestId,
      ok: true,
      response: Object.freeze({ kind: "submitted", runId: run.runId }),
    }));
    queueMicrotask(() => {
      if (replaced !== null) failRun(replaced, "replaced", false);
      void executeRun(run, admittedSubmit.value.text);
    });
  };

  return {
    receive,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      credentialKey = null;
      initialized = false;
      if (activeRun !== null && !activeRun.terminal) {
        activeRun.terminal = true;
        activeRun.agent.dispose();
      }
      activeRun = null;
      activeSessionId = null;
    },
  };
}
