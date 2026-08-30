// SPDX-License-Identifier: MIT

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tokenFileV1 = resolve(import.meta.dirname, "../ui/design-system/tokens.css");

function parseHexColorV1(valueV1: string): readonly [number, number, number] {
  const normalizedV1 = valueV1.replace("#", "");
  const expandedV1 = normalizedV1.length === 3
    ? normalizedV1
      .split("")
      .map((channelV1) => `${channelV1}${channelV1}`)
      .join("")
    : normalizedV1;

  return [
    Number.parseInt(expandedV1.slice(0, 2), 16),
    Number.parseInt(expandedV1.slice(2, 4), 16),
    Number.parseInt(expandedV1.slice(4, 6), 16),
  ];
}

function relativeLuminanceV1(colorV1: string): number {
  const normalizeChannelV1 = (channelV1: number): number => {
    const normalizedV1 = channelV1 / 255;
    return normalizedV1 <= 0.04045 ? normalizedV1 / 12.92 : ((normalizedV1 + 0.055) / 1.055) ** 2.4;
  };
  const [redV1, greenV1, blueV1] = parseHexColorV1(colorV1);

  return 0.2126 * normalizeChannelV1(redV1) + 0.7152 * normalizeChannelV1(greenV1) +
    0.0722 * normalizeChannelV1(blueV1);
}

function contrastRatioV1(foregroundV1: string, backgroundV1: string): number {
  const lighterV1 = Math.max(relativeLuminanceV1(foregroundV1), relativeLuminanceV1(backgroundV1));
  const darkerV1 = Math.min(relativeLuminanceV1(foregroundV1), relativeLuminanceV1(backgroundV1));
  return (lighterV1 + 0.05) / (darkerV1 + 0.05);
}

function readColorTokenV1(cssV1: string, tokenV1: string): string {
  const matchV1 = cssV1.match(new RegExp(`${tokenV1}:\\s*([^;]+);`, "iu"));
  const valueV1 = matchV1?.[1]?.trim();
  if (valueV1 === undefined) {
    throw new Error(`Expected ${tokenV1} to be declared.`);
  }
  if (/^#[0-9a-f]{3,6}$/iu.test(valueV1)) {
    return valueV1;
  }

  const aliasV1 = valueV1.match(/^var\((--[a-z0-9-]+)\)$/iu)?.[1];
  if (aliasV1 === undefined) {
    throw new Error(`Expected ${tokenV1} to resolve to a hex color.`);
  }
  return readColorTokenV1(cssV1, aliasV1);
}

describe("SillyOS light-theme contrast", () => {
  it("keeps muted text readable on every opaque light surface", async () => {
    const allTokensV1 = await readFile(tokenFileV1, "utf8");
    const lightTokensV1 = allTokensV1.slice(
      0,
      allTokensV1.indexOf('.silly-os[data-color-scheme="dark"]'),
    );
    const mutedInkV1 = readColorTokenV1(lightTokensV1, "--sos-ink-muted");
    const surfaceTokensV1 = [
      "--sos-bg",
      "--sos-surface",
      "--silly-color-control",
      "--silly-color-control-hover",
      "--sos-surface-muted",
      "--sos-surface-raised",
      "--sos-surface-subtle",
      "--sos-surface-inset",
      "--sos-accent-soft",
      "--sos-accent-softer",
      "--sos-teal-soft",
      "--sos-info-soft",
      "--sos-success-soft",
      "--sos-warning-soft",
      "--sos-danger-soft",
    ] as const;

    for (const surfaceTokenV1 of surfaceTokensV1) {
      const ratioV1 = contrastRatioV1(
        mutedInkV1,
        readColorTokenV1(lightTokensV1, surfaceTokenV1),
      );
      expect(ratioV1, `${surfaceTokenV1} contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
