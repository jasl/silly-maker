// SPDX-License-Identifier: MIT

const cryptoPrototypeV1 = Object.getPrototypeOf(globalThis.crypto) as object;
const prototypeGetRandomValuesV1 = Reflect.get(cryptoPrototypeV1, "getRandomValues") as (
  value: Uint8Array,
) => Uint8Array;

export const intentionalAmbientCryptoPrototypeV1 = Reflect.apply(
  prototypeGetRandomValuesV1,
  globalThis.crypto,
  [new Uint8Array(1)],
);
