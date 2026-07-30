// SPDX-License-Identifier: MIT
import type { HostStoredRecordV1 } from "@sillymaker/base";

import { createSqliteHostRecordStoreSpikeV1 } from "./sqlite-host-record-store-spike.ts";

type HostRecordKeyV1 = HostStoredRecordV1["key"];

// This fixture executes under Deno; aggregate tsc intentionally omits Deno lib types.
declare const Deno: {
  readonly args: readonly string[];
  readonly pid: number;
  readonly stdin: {
    readonly readable: ReadableStream<Uint8Array>;
  };
  readonly stdout: {
    write(bytes: Uint8Array): Promise<number>;
  };
};

const databasePathV1 = Deno.args[0];
const sideV1 = Deno.args[1];
const byteValuesV1 = Deno.args[2];
if (
  databasePathV1 === undefined ||
  (sideV1 !== "left" && sideV1 !== "right") ||
  byteValuesV1 === undefined
) {
  throw new TypeError("SQLite CAS child requires database path, side, and bytes");
}
const valuesV1 = byteValuesV1.split(",").map((value) => Number(value));
if (
  valuesV1.length === 0 ||
  valuesV1.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
) {
  throw new TypeError("SQLite CAS child received invalid bytes");
}

const encoderV1 = new TextEncoder();
async function writeAllV1(value: string): Promise<void> {
  const bytes = encoderV1.encode(value);
  let offset = 0;
  while (offset < bytes.byteLength) {
    const written = await Deno.stdout.write(bytes.subarray(offset));
    if (written === 0) {
      throw new TypeError("SQLite CAS child stdout made no progress");
    }
    offset += written;
  }
}

const handleV1 = createSqliteHostRecordStoreSpikeV1(databasePathV1);
try {
  await writeAllV1("ready\n");
  if ((await new Response(Deno.stdin.readable).text()) !== "release\n") {
    throw new TypeError("SQLite CAS child received an invalid release token");
  }
  const result = await handleV1.store.commit([
    {
      kind: "put",
      namespace: "lease",
      key: "spike.process-concurrent" as HostRecordKeyV1,
      expectedRevision: null,
      bytes: Uint8Array.from(valuesV1),
    },
  ]);
  const summary =
    result.kind === "conflict"
      ? Object.freeze({
          side: sideV1,
          processId: Deno.pid,
          kind: result.kind,
          actualRevision: result.actualRevision,
        })
      : Object.freeze({
          side: sideV1,
          processId: Deno.pid,
          kind: result.kind,
          revision: result.records[0]?.revision,
          bytes: result.records[0] === undefined ? undefined : Array.from(result.records[0].bytes),
        });
  await writeAllV1(`${JSON.stringify(summary)}\n`);
} finally {
  handleV1.close();
}
