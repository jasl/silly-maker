// SPDX-License-Identifier: MIT
import type { HostStoredRecordV1 } from "@sillymaker/base";

import type {
  HostRecordStoreTransactionPhaseIdV1,
  HostRecordStoreTransactionPhaseV1,
} from "./host-atomic-record-store-transaction-fault.ts";
import { createInstrumentedSqliteHostRecordStoreSpikeV1 } from "./sqlite-host-record-store-spike.ts";

type HostRecordKeyV1 = HostStoredRecordV1["key"];
type SigkillPhaseV1 = Extract<
  HostRecordStoreTransactionPhaseIdV1,
  "between_mutations" | "after_durable_write_before_response"
>;

// This fixture executes under Deno; aggregate tsc intentionally omits Deno lib types.
declare const Deno: {
  readonly args: readonly string[];
  readonly stdin: {
    readonly readable: ReadableStream<Uint8Array>;
  };
  readonly stdout: {
    write(bytes: Uint8Array): Promise<number>;
  };
};

const databasePathV1 = Deno.args[0];
const targetPhaseV1 = Deno.args[1];
if (
  databasePathV1 === undefined ||
  (targetPhaseV1 !== "between_mutations" && targetPhaseV1 !== "after_durable_write_before_response")
) {
  throw new TypeError("SQLite SIGKILL child requires database path and supported phase");
}

const encoderV1 = new TextEncoder();
async function writeAllV1(value: string): Promise<void> {
  const bytes = encoderV1.encode(value);
  let offset = 0;
  while (offset < bytes.byteLength) {
    const written = await Deno.stdout.write(bytes.subarray(offset));
    if (written === 0) {
      throw new TypeError("SQLite SIGKILL child stdout made no progress");
    }
    offset += written;
  }
}

function isTargetPhaseV1(
  phase: HostRecordStoreTransactionPhaseV1,
  target: SigkillPhaseV1,
): boolean {
  return target === "between_mutations"
    ? phase.kind === target &&
      phase.completedMutationCount === 1 &&
      phase.remainingMutationCount === 1
    : phase.kind === target;
}

let reachedTargetV1 = false;
const handleV1 = createInstrumentedSqliteHostRecordStoreSpikeV1(databasePathV1, {
  async reached(phase) {
    if (!isTargetPhaseV1(phase, targetPhaseV1)) return;
    if (reachedTargetV1) {
      throw new TypeError(`SQLite SIGKILL child reached ${targetPhaseV1} more than once`);
    }
    reachedTargetV1 = true;
    await writeAllV1(`ready:${targetPhaseV1}\n`);
    await new Response(Deno.stdin.readable).text();
    throw new TypeError(`SQLite SIGKILL child was released after ${targetPhaseV1}`);
  },
});

try {
  await handleV1.store.commit([
    {
      kind: "put",
      namespace: "save",
      key: "conformance.fault.left" as HostRecordKeyV1,
      expectedRevision: 1 as HostStoredRecordV1["revision"],
      bytes: Uint8Array.of(1, 2, 3, 4),
    },
    {
      kind: "put",
      namespace: "lease",
      key: "conformance.fault.right" as HostRecordKeyV1,
      expectedRevision: 1 as HostStoredRecordV1["revision"],
      bytes: Uint8Array.of(4, 3, 2, 1),
    },
  ]);
  throw new TypeError(`SQLite SIGKILL child commit returned before ${targetPhaseV1}`);
} finally {
  handleV1.close();
}
