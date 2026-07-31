// SPDX-License-Identifier: MIT
import type { Readable, Writable } from "node:stream";
import { createInterface } from "node:readline";

import type {
  AgentDiagnosticsCapabilityV1,
  AgentGamePortV1,
  AgentPersistenceCapabilityV1,
} from "@sillymaker/base/runtime";

import type {
  JsonlHostLimitsV1,
  JsonlOutputLineV1,
  JsonlProtocolErrorCodeV1,
  JsonlRequestV1,
} from "./protocol.ts";
import {
  boundProtocolMessageV1,
  defaultJsonlHostLimitsV1,
  jsonlProtocolVersionV1,
  parseJsonlRequestLineV1,
} from "./protocol.ts";

export interface JsonlAgentHostInputV1 {
  readonly agent: AgentGamePortV1<unknown, unknown, unknown, unknown, unknown, unknown>;
  /** Optional publication push source; when present the host emits events. */
  readonly subscribe?: (listener: () => void) => () => void;
  readonly persistence?: AgentPersistenceCapabilityV1<unknown, unknown>;
  readonly diagnostics?: AgentDiagnosticsCapabilityV1<unknown>;
  readonly input: Readable;
  readonly output: Writable;
  /** Log sink; defaults to stderr-style silence in tests. Never stdout. */
  readonly log?: (line: string) => void;
  readonly limits?: Partial<JsonlHostLimitsV1>;
}

export interface JsonlAgentHostV1 {
  /** Resolves after the input ended or shutdown was requested and drained. */
  readonly done: Promise<void>;
  shutdown(): void;
}

export function createJsonlAgentHostV1(input: JsonlAgentHostInputV1): JsonlAgentHostV1 {
  const limits: JsonlHostLimitsV1 = Object.freeze({
    ...defaultJsonlHostLimitsV1,
    ...input.limits,
  });
  const log = input.log ?? (() => undefined);
  let shuttingDown = false;
  let pending = 0;
  let resolveDone: () => void = () => undefined;
  let inputEnded = false;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const writeLine = (line: JsonlOutputLineV1): void => {
    input.output.write(`${JSON.stringify(line)}\n`);
  };
  const writeError = (id: string | null, code: JsonlProtocolErrorCodeV1, message: string): void => {
    writeLine({
      v: jsonlProtocolVersionV1,
      id,
      ok: false,
      error: { code, message: boundProtocolMessageV1(message) },
    });
  };

  const unsubscribe = input.subscribe === undefined ? undefined : input.subscribe(() => {
    try {
      writeLine({
        v: jsonlProtocolVersionV1,
        event: "publication",
        publication: input.agent.observe(),
      });
    } catch (error) {
      log(`publication event failed: ${boundProtocolMessageV1(error)}`);
    }
  });

  const settleIfDrained = (): void => {
    if ((shuttingDown || inputEnded) && pending === 0) {
      unsubscribe?.();
      resolveDone();
    }
  };

  const withTimeout = async <TValue>(
    operation: Promise<TValue>,
  ): Promise<{ readonly kind: "value"; readonly value: TValue } | { readonly kind: "timeout" }> => {
    let cancelTimer: (() => void) | undefined;
    try {
      return await Promise.race([
        operation.then((value) => ({ kind: "value" as const, value })),
        new Promise<{ readonly kind: "timeout" }>((resolve) => {
          const handle = setTimeout(
            () => resolve({ kind: "timeout" as const }),
            limits.requestTimeoutMs,
          );
          cancelTimer = () => clearTimeout(handle);
        }),
      ]);
    } finally {
      cancelTimer?.();
    }
  };

  const executeRequest = async (request: JsonlRequestV1): Promise<unknown> => {
    switch (request.method) {
      case "hello":
        return Object.freeze({
          protocol: jsonlProtocolVersionV1,
          identity: input.agent.identity(),
          methods: Object.freeze([
            "hello",
            "observe",
            "describeActions",
            "preview",
            "dispatch",
            "waitForIdle",
            ...(input.persistence === undefined
              ? []
              : ["save", "load", "exportSave", "importSave"]),
            ...(input.diagnostics === undefined ? [] : ["exportDiagnostics"]),
            "shutdown",
          ]),
        });
      case "observe":
        return input.agent.observe();
      case "describeActions":
        return input.agent.describeActions();
      case "preview":
        return input.agent.preview(request.params?.invocation as never);
      case "dispatch":
        return input.agent.dispatch(request.params?.invocation as never);
      case "waitForIdle": {
        const afterRevision = request.params?.afterRevision;
        const timeoutMs = request.params?.timeoutMs;
        return input.agent.waitForIdle({
          ...(typeof afterRevision === "number" ? { afterRevision } : {}),
          timeoutMs: typeof timeoutMs === "number"
            ? Math.min(timeoutMs, limits.requestTimeoutMs)
            : limits.requestTimeoutMs,
        });
      }
      case "exportDiagnostics": {
        if (input.diagnostics === undefined) {
          throw new CapabilityDisabledSignalV1();
        }
        return input.diagnostics.exportDiagnostics();
      }
      case "save": {
        if (input.persistence === undefined) throw new CapabilityDisabledSignalV1();
        return input.persistence.save(request.params?.slot as never);
      }
      case "load": {
        if (input.persistence === undefined) throw new CapabilityDisabledSignalV1();
        return input.persistence.load(request.params?.slot as never);
      }
      case "exportSave": {
        if (input.persistence === undefined) throw new CapabilityDisabledSignalV1();
        return input.persistence.exportCurrentSave();
      }
      case "importSave": {
        if (input.persistence === undefined) throw new CapabilityDisabledSignalV1();
        const bytes = request.params?.bytesBase64;
        if (typeof bytes !== "string") {
          throw new TypeError("importSave requires bytesBase64");
        }
        return input.persistence.importSave(Uint8Array.from(Buffer.from(bytes, "base64")));
      }
      case "shutdown": {
        shuttingDown = true;
        queueMicrotask(settleIfDrained);
        return Object.freeze({ kind: "shutting_down" });
      }
      default: {
        const exhaustive: never = request.method;
        throw new TypeError(`unhandled method ${String(exhaustive)}`);
      }
    }
  };

  const handleLine = async (line: string): Promise<void> => {
    if (Buffer.byteLength(line, "utf8") > limits.maxLineBytes) {
      writeError(null, "protocol.line_too_long", "request line exceeds the byte limit");
      return;
    }
    if (line.trim().length === 0) return;
    const parsed = parseJsonlRequestLineV1(line, limits);
    if (parsed.kind === "invalid") {
      writeError(parsed.id, parsed.code, parsed.message);
      return;
    }
    if (shuttingDown && parsed.request.method !== "shutdown") {
      writeError(parsed.request.id, "protocol.shutting_down", "host is shutting down");
      return;
    }
    const outcome = await withTimeout(
      Promise.resolve().then(() => executeRequest(parsed.request)),
    ).catch((error: unknown) => ({ kind: "error" as const, error }));
    if (outcome.kind === "timeout") {
      writeError(parsed.request.id, "protocol.request_timeout", "request timed out");
      return;
    }
    if (outcome.kind === "error") {
      if (outcome.error instanceof CapabilityDisabledSignalV1) {
        writeError(
          parsed.request.id,
          "protocol.capability_disabled",
          "this capability is not enabled for the agent",
        );
        return;
      }
      log(`request ${parsed.request.id} failed: ${boundProtocolMessageV1(outcome.error)}`);
      writeError(parsed.request.id, "protocol.internal_error", "request failed");
      return;
    }
    writeLine({
      v: jsonlProtocolVersionV1,
      id: parsed.request.id,
      ok: true,
      result: outcome.value,
    });
  };

  const reader = createInterface({ input: input.input, crlfDelay: Infinity });
  let queue: Promise<void> = Promise.resolve();
  reader.on("line", (line) => {
    pending += 1;
    queue = queue
      .then(() => handleLine(line))
      .catch((error: unknown) => {
        log(`line handling failed: ${boundProtocolMessageV1(error)}`);
      })
      .finally(() => {
        pending -= 1;
        settleIfDrained();
      });
  });
  reader.on("close", () => {
    inputEnded = true;
    queueMicrotask(settleIfDrained);
  });

  return Object.freeze({
    done,
    shutdown: () => {
      shuttingDown = true;
      reader.close();
      queueMicrotask(settleIfDrained);
    },
  });
}

class CapabilityDisabledSignalV1 extends Error {
  override readonly name = "CapabilityDisabledSignalV1";

  constructor() {
    super("capability disabled");
  }
}
