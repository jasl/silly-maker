// SPDX-License-Identifier: MIT
import type { BootstrapEntropyV1, NonZeroUint32 } from "@sillymaker/base";
import { parseNonZeroUint32 } from "@sillymaker/base";

type WebGameBootstrapCryptoInternalV1 = Pick<Crypto, "getRandomValues" | "randomUUID">;

/** Package-internal ambient entropy adapter for the Web Game Domain admission. */
export function createWebGameBootstrapEntropyInternalV1(
  cryptoPort: WebGameBootstrapCryptoInternalV1 = globalThis.crypto,
): BootstrapEntropyV1 {
  return ({
    nextUuidV4: () => cryptoPort.randomUUID(),
    nextNonZeroUint32(): NonZeroUint32 {
      const values = new Uint32Array(1);
      do cryptoPort.getRandomValues(values); while (values[0] === 0);
      return parseNonZeroUint32(values[0]);
    },
  });
}
