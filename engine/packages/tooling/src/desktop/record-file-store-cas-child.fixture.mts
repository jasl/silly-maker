// SPDX-License-Identifier: MIT
import { createInstrumentedRecordFileStoreInternalV1 } from "./record-file-store.mts";

const rootDirV1 = Deno.args[0];
const bytesBase64V1 = Deno.args[1];
if (rootDirV1 === undefined || bytesBase64V1 === undefined) {
  throw new TypeError("desktop record CAS fixture requires a root directory and record bytes");
}

const encoderV1 = new TextEncoder();
async function writeAllV1(value: string): Promise<void> {
  const bytesV1 = encoderV1.encode(value);
  let offsetV1 = 0;
  while (offsetV1 < bytesV1.byteLength) {
    const writtenV1 = await Deno.stdout.write(bytesV1.subarray(offsetV1));
    if (writtenV1 === 0) {
      throw new TypeError("desktop record CAS fixture stdout made no progress");
    }
    offsetV1 += writtenV1;
  }
}

let precheckReachedV1 = false;
const storeV1 = createInstrumentedRecordFileStoreInternalV1(rootDirV1, {
  async reached(point) {
    if (point.kind !== "between_checks_and_writes") return;
    if (precheckReachedV1) {
      throw new TypeError("desktop record CAS fixture reached its precheck gate twice");
    }
    precheckReachedV1 = true;
    await writeAllV1("ready\n");
    if ((await new Response(Deno.stdin.readable).text()) !== "release\n") {
      throw new TypeError("desktop record CAS fixture received an invalid release token");
    }
  },
});

const resultV1 = await storeV1.commit([
  {
    kind: "put",
    namespace: "lease",
    key: "fault.process-concurrent",
    expectedRevision: null,
    bytesBase64: bytesBase64V1,
  },
]);
if (!precheckReachedV1) {
  throw new TypeError("desktop record CAS fixture did not reach its precheck gate");
}
await writeAllV1(`${JSON.stringify(resultV1)}\n`);
