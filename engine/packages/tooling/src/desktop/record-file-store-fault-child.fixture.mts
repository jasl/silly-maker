// SPDX-License-Identifier: MIT
import { createInstrumentedRecordFileStoreInternalV1 } from "./record-file-store.mts";

const expectedExitCodeV1 = 86;
const rootDir = Deno.args[0];
if (rootDir === undefined) {
  throw new TypeError("desktop record fault fixture requires a root directory");
}

const store = createInstrumentedRecordFileStoreInternalV1(rootDir, {
  reached(point) {
    if (point.kind === "between_mutations" && point.completedMutationCount === 1) {
      Deno.exit(expectedExitCodeV1);
    }
  },
});

await store.commit([
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

throw new TypeError("desktop record fault fixture did not reach the injected exit");
