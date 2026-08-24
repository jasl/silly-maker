// SPDX-License-Identifier: MIT
import type { Readable, Writable } from "node:stream";
import { createInterface } from "node:readline";

import type { JsonlAgentMethodV1, JsonlResponseErrorV1 } from "./protocol.ts";
import { jsonlProtocolVersionV1 } from "./protocol.ts";

export type JsonlClientResponseV1 =
  | { readonly ok: true; readonly result: unknown }
  | { readonly ok: false; readonly error: JsonlResponseErrorV1["error"] };

export interface JsonlAgentClientV1 {
  request(
    method: JsonlAgentMethodV1,
    params?: Readonly<Record<string, unknown>>,
  ): Promise<JsonlClientResponseV1>;
  readonly events: () => readonly unknown[];
  close(): void;
}

/**
 * A minimal in-process protocol client for tests and scripted agents. It
 * writes one request per line and resolves responses by id; publication
 * events are collected in arrival order.
 */
export function createJsonlAgentClientV1(streams: {
  readonly input: Writable;
  readonly output: Readable;
}): JsonlAgentClientV1 {
  let nextId = 1;
  const pending = new Map<string, (response: JsonlClientResponseV1) => void>();
  const events: unknown[] = [];

  const reader = createInterface({ input: streams.output, crlfDelay: Infinity });
  reader.on("line", (line) => {
    if (line.trim().length === 0) return;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      return;
    }
    const record = value as {
      readonly id?: unknown;
      readonly ok?: unknown;
      readonly result?: unknown;
      readonly error?: JsonlResponseErrorV1["error"];
      readonly event?: unknown;
      readonly publication?: unknown;
    };
    if (record.event === "publication") {
      events.push(record.publication);
      return;
    }
    if (typeof record.id !== "string") return;
    const resolve = pending.get(record.id);
    if (resolve === undefined) return;
    pending.delete(record.id);
    resolve(
      record.ok === true ? { ok: true as const, result: record.result } : {
        ok: false as const,
        error: record.error ?? {
          code: "protocol.internal_error" as const,
          message: "malformed response",
        },
      },
    );
  });

  return {
    request: (method: JsonlAgentMethodV1, params?: Readonly<Record<string, unknown>>) =>
      new Promise<JsonlClientResponseV1>((resolve) => {
        const id = String(nextId);
        nextId += 1;
        pending.set(id, resolve);
        streams.input.write(
          `${
            JSON.stringify({
              v: jsonlProtocolVersionV1,
              id,
              method,
              ...(params === undefined ? {} : { params }),
            })
          }\n`,
        );
      }),
    events: () => [...events],
    close: () => reader.close(),
  };
}
