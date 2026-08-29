// SPDX-License-Identifier: MIT

import type { SillyOsLocaleV1 } from "../content/copy.ts";

export function formatStorageBytesV1(bytes: number, locale: SillyOsLocaleV1): string {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"] as const;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1_024 && unitIndex < units.length - 1) {
    value /= 1_024;
    unitIndex += 1;
  }
  const maximumFractionDigits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value)} ${
    units[unitIndex]
  }`;
}
