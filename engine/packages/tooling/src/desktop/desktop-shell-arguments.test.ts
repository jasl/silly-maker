// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  desktopRuntimeBootstrapConfigV1,
  parseDesktopShellArgumentsV1,
} from "./desktop-shell-arguments.mts";

describe("parseDesktopShellArgumentsV1", () => {
  it("defaults a packaged launch to the immutable Desktop runtime config", () => {
    const parsed = parseDesktopShellArgumentsV1([], { allowSourceOverrides: false });

    expect(parsed).toEqual({
      identifierOverride: null,
      distOverride: null,
      bootstrap: { revision: 1, entry: "runtime", target: "deno_desktop" },
    });
    expect(parsed.bootstrap).toBe(desktopRuntimeBootstrapConfigV1);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.bootstrap)).toBe(true);
  });

  it("maps explicit runtime and source-run id/dist flags to the same config", () => {
    const parsed = parseDesktopShellArgumentsV1(
      ["--entry", "runtime", "--id=dev.local.app", "--dist", "examples/app/dist-web"],
      { allowSourceOverrides: true },
    );

    expect(parsed).toEqual({
      identifierOverride: "dev.local.app",
      distOverride: "examples/app/dist-web",
      bootstrap: { revision: 1, entry: "runtime", target: "deno_desktop" },
    });
  });

  it.each(
    [
      [["--entry", "author"], "author_entry_unsupported"],
      [["--entry", "preview"], "invalid_entry"],
      [["--unknown", "value"], "unknown_argument:--unknown"],
      [["positional"], "unknown_argument:positional"],
      [["--entry"], "missing_value:--entry"],
      [["--entry="], "missing_value:--entry"],
      [["--entry", "--id", "dev.local.app"], "missing_value:--entry"],
      [["--entry", "runtime", "--entry=runtime"], "duplicate:--entry"],
      [["--id", "dev.local.app", "--id=dev.other.app"], "duplicate:--id"],
    ] as const,
  )("rejects invalid argv %#", (argv, code) => {
    expect(() => parseDesktopShellArgumentsV1(argv, { allowSourceOverrides: true })).toThrow(
      `desktop_shell.argv.${code}`,
    );
  });

  it.each(["--id", "--dist"] as const)(
    "rejects %s outside a source-tree launch",
    (flag) => {
      const value = flag === "--id" ? "dev.local.app" : "dist-web";
      expect(() => parseDesktopShellArgumentsV1([flag, value], { allowSourceOverrides: false }))
        .toThrow(`desktop_shell.argv.source_override_unavailable:${flag}`);
    },
  );

  it.each(
    [
      [["--id", "Desktop.App"], "invalid_identifier"],
      [["--id", "single"], "invalid_identifier"],
      [["--id", "dev-.local.app"], "invalid_identifier"],
      [["--id", `${"a".repeat(246)}.local.app`], "invalid_identifier"],
      [["--dist", " dist-web"], "invalid_dist"],
      [["--dist", "dist\0web"], "invalid_dist"],
    ] as const,
  )("rejects an invalid source override %#", (argv, code) => {
    expect(() => parseDesktopShellArgumentsV1(argv, { allowSourceOverrides: true })).toThrow(
      `desktop_shell.argv.${code}`,
    );
  });
});
