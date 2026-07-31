// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const sillymakerLicenseUrl = "https://github.com/jasl/silly-maker/blob/main/LICENSES/MIT.txt";
const hostedPlayerNoticesUrl =
  "https://github.com/jasl/silly-maker/blob/main/THIRD_PARTY_NOTICES.md";

const baselineHtmlPaths = Object.freeze([
  "e2e/index.html",
  "template/index.html",
  "examples/bookshop/index.html",
  "examples/cat-cafe/index.html",
  "examples/silly-os/index.html",
]);

/**
 * Maintained minimum observed in debug sourcemaps for the first-party Engine
 * Lab, starter, and examples. This deliberately is not an assertion that an
 * arbitrary Story or future bundle contains no other third-party package.
 */
const observedHostedPlayerRuntimePackages = Object.freeze([
  "@radix-ui/primitive@1.1.5",
  "@radix-ui/react-compose-refs@1.1.3",
  "@radix-ui/react-context@1.2.0",
  "@radix-ui/react-dialog@1.1.19",
  "@radix-ui/react-dismissable-layer@1.1.15",
  "@radix-ui/react-focus-guards@1.1.4",
  "@radix-ui/react-focus-scope@1.1.12",
  "@radix-ui/react-id@1.1.2",
  "@radix-ui/react-portal@1.1.13",
  "@radix-ui/react-presence@1.1.7",
  "@radix-ui/react-primitive@2.1.7",
  "@radix-ui/react-slot@1.3.0",
  "@radix-ui/react-use-callback-ref@1.1.2",
  "@radix-ui/react-use-controllable-state@1.2.3",
  "@radix-ui/react-use-layout-effect@1.1.2",
  "aria-hidden@1.2.6",
  "get-nonce@1.0.1",
  "react@19.2.7",
  "react-dom@19.2.7",
  "react-remove-scroll@2.7.2",
  "react-remove-scroll-bar@2.3.8",
  "react-style-singleton@2.2.3",
  "scheduler@0.27.0",
  "tslib@2.8.1",
  "use-callback-ref@1.3.3",
  "use-sidecar@1.1.3",
  "zod@4.4.3",
]);

function licenseLinksV1(html: string): readonly string[] {
  return [...html.matchAll(/<link\b[^>]*\brel="license"[^>]*>/gu)].flatMap(([tag]) => {
    const href = tag.match(/\bhref="([^"]+)"/u)?.[1];
    return href === undefined ? [] : [href];
  });
}

describe("hosted Player legal availability", () => {
  it.each(baselineHtmlPaths)(
    "%s exposes first-party and third-party notice channels",
    async (path) => {
      const html = await readFile(resolve(repositoryRoot, path), "utf8");
      expect(licenseLinksV1(html)).toEqual(
        expect.arrayContaining([sillymakerLicenseUrl, hostedPlayerNoticesUrl]),
      );
    },
  );

  it("publishes concrete notices for the maintained runtime baseline", async () => {
    const notices = await readFile(resolve(repositoryRoot, "THIRD_PARTY_NOTICES.md"), "utf8");
    const lock = JSON.parse(await readFile(resolve(repositoryRoot, "deno.lock"), "utf8")) as {
      readonly npm: Readonly<Record<string, unknown>>;
    };
    const lockedPackages = Object.keys(lock.npm);

    for (const packageId of observedHostedPlayerRuntimePackages) {
      expect(notices, packageId).toContain(`\`${packageId}\``);
      expect(
        lockedPackages.some((locked) => locked === packageId || locked.startsWith(`${packageId}_`)),
        packageId,
      ).toBe(true);
    }
    expect(notices).toContain("Permission is hereby granted, free of charge");
    expect(notices).toContain("Permission to use, copy, modify, and/or distribute this software");
  });

  it.each(["website/reference/licenses.md", "website/zh/reference/licenses.md"])(
    "%s points readers at both maintained channels",
    async (path) => {
      const page = await readFile(resolve(repositoryRoot, path), "utf8");
      expect(page).toContain(sillymakerLicenseUrl);
      expect(page).toContain(hostedPlayerNoticesUrl);
    },
  );
});
