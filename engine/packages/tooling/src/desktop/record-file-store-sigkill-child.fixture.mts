// SPDX-License-Identifier: MIT
import { createInstrumentedRecordFileStoreInternalV1 } from "./record-file-store.mts";

const rootDirV1 = Deno.args[0];
if (rootDirV1 === undefined) {
  throw new TypeError("desktop record SIGKILL fixture requires a root directory");
}

const encoderV1 = new TextEncoder();
async function writeAllV1(value: string): Promise<void> {
  const bytesV1 = encoderV1.encode(value);
  let offsetV1 = 0;
  while (offsetV1 < bytesV1.byteLength) {
    const writtenV1 = await Deno.stdout.write(bytesV1.subarray(offsetV1));
    if (writtenV1 === 0) {
      throw new TypeError("desktop record SIGKILL fixture stdout made no progress");
    }
    offsetV1 += writtenV1;
  }
}

let mutationGateReachedV1 = false;
const storeV1 = createInstrumentedRecordFileStoreInternalV1(rootDirV1, {
  async reached(point) {
    if (
      point.kind !== "between_mutations" ||
      point.completedMutationCount !== 1 ||
      point.remainingMutationCount !== 1
    ) {
      return;
    }
    if (mutationGateReachedV1) {
      throw new TypeError("desktop record SIGKILL fixture reached its mutation gate twice");
    }
    mutationGateReachedV1 = true;
    await writeAllV1("ready\n");
    const unexpectedInputV1 = await new Response(Deno.stdin.readable).text();
    throw new TypeError(
      `desktop record SIGKILL fixture was released without SIGKILL: ${unexpectedInputV1}`,
    );
  },
});

await storeV1.commit([
  {
    kind: "put",
    namespace: "save",
    key: "fault.partial.left",
    expectedRevision: 1,
    bytesBase64: "bmV3LWxlZnQ=",
  },
  {
    kind: "put",
    namespace: "save",
    key: "fault.partial.right",
    expectedRevision: 1,
    bytesBase64: "bmV3LXJpZ2h0",
  },
]);

throw new TypeError("desktop record SIGKILL fixture did not reach the injected signal gate");
