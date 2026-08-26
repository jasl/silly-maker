// SPDX-License-Identifier: MIT

export interface BrowserPiDistributionIdentityV1 {
  readonly revision: 1;
  readonly packages: readonly [
    {
      readonly name: "@earendil-works/pi-agent-core";
      readonly version: "0.84.3";
    },
    {
      readonly name: "@earendil-works/pi-ai";
      readonly version: "0.84.3";
    },
  ];
}

/** The product-owned Pi distribution embedded in the SillyOS Browser Worker. */
export const browserPiDistributionIdentityV1: BrowserPiDistributionIdentityV1 = Object.freeze({
  revision: 1,
  packages: Object.freeze(
    [
      Object.freeze({
        name: "@earendil-works/pi-agent-core",
        version: "0.84.3",
      }),
      Object.freeze({
        name: "@earendil-works/pi-ai",
        version: "0.84.3",
      }),
    ] as const,
  ),
});

function exactDataRecordV1(
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      Object.keys(descriptors).length !== keys.length ||
      !keys.every((key) => Object.hasOwn(descriptors, key))
    ) return null;
    const entries: [string, unknown][] = [];
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) return null;
      entries.push([key, descriptor.value]);
    }
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
}

function exactPackageTupleV1(value: unknown): readonly unknown[] | null {
  if (!Array.isArray(value)) return null;
  try {
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      Object.keys(descriptors).length !== 3 ||
      lengthDescriptor?.value !== 2 ||
      descriptors[0] === undefined || descriptors[1] === undefined ||
      !Object.hasOwn(descriptors[0], "value") || !Object.hasOwn(descriptors[1], "value")
    ) return null;
    return [descriptors[0].value, descriptors[1].value];
  } catch {
    return null;
  }
}

export function isBrowserPiDistributionIdentityV1(
  value: unknown,
): value is BrowserPiDistributionIdentityV1 {
  const record = exactDataRecordV1(value, ["revision", "packages"]);
  if (record === null || record.revision !== 1) return false;
  const packages = exactPackageTupleV1(record.packages);
  if (packages === null) return false;
  return packages.every((entry, index) => {
    const packageRecord = exactDataRecordV1(entry, ["name", "version"]);
    if (packageRecord === null) return false;
    const expected = browserPiDistributionIdentityV1.packages[index];
    return expected !== undefined &&
      packageRecord.name === expected.name && packageRecord.version === expected.version;
  });
}
