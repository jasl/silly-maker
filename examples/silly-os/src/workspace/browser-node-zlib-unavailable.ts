// SPDX-License-Identifier: MIT

const unavailableMessageV1 =
  "Compression and compressed-file search are unavailable in the SillyOS Browser shell profile";

function unavailableV1(): never {
  throw new Error(unavailableMessageV1);
}

export const gzipSync = unavailableV1;
export const gunzipSync = unavailableV1;
export const constants = new Proxy(Object.create(null) as Record<PropertyKey, never>, {
  get: unavailableV1,
  has: unavailableV1,
  ownKeys: unavailableV1,
});
