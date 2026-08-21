// SPDX-License-Identifier: MIT
import type { ApplicationBootstrapHtmlConfigV1 } from "./application-bootstrap-html.mts";

export const desktopRuntimeBootstrapConfigV1: ApplicationBootstrapHtmlConfigV1 = Object.freeze({
  revision: 1,
  entry: "runtime",
  target: "deno_desktop",
});

export interface DesktopShellArgumentsV1 {
  readonly identifierOverride: string | null;
  readonly distOverride: string | null;
  readonly bootstrap: ApplicationBootstrapHtmlConfigV1;
}

const desktopIdentifierPatternV1 =
  /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u;
const maximumIdentifierBytesV1 = 255;
const maximumDistArgumentBytesV1 = 4_096;

function argumentFailureV1(code: string): never {
  throw new TypeError(`desktop_shell.argv.${code}`);
}

function requireValueV1(flag: string, value: string | undefined): string {
  if (value === undefined || value.length === 0 || value.startsWith("--")) {
    return argumentFailureV1(`missing_value:${flag}`);
  }
  return value;
}

/** Strict one-shot admission for Desktop launch arguments. */
export function parseDesktopShellArgumentsV1(
  argv: readonly string[],
  options: { readonly allowSourceOverrides: boolean },
): DesktopShellArgumentsV1 {
  let identifierOverride: string | null = null;
  let distOverride: string | null = null;
  let entry = "runtime";
  const seen = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) return argumentFailureV1("unknown_argument:missing");
    if (!argument.startsWith("--")) return argumentFailureV1(`unknown_argument:${argument}`);
    const equalsIndex = argument.indexOf("=");
    const flag = equalsIndex < 0 ? argument : argument.slice(0, equalsIndex);
    let value = equalsIndex < 0 ? undefined : argument.slice(equalsIndex + 1);
    if (seen.has(flag)) return argumentFailureV1(`duplicate:${flag}`);
    seen.add(flag);
    if (value === undefined) {
      value = argv[index + 1];
      if (value !== undefined && !value.startsWith("--")) index += 1;
    }
    value = requireValueV1(flag, value);

    if (flag === "--entry") {
      entry = value;
      continue;
    }
    if (flag === "--id") {
      if (!options.allowSourceOverrides) {
        return argumentFailureV1("source_override_unavailable:--id");
      }
      if (
        !desktopIdentifierPatternV1.test(value) ||
        new TextEncoder().encode(value).byteLength > maximumIdentifierBytesV1
      ) {
        return argumentFailureV1("invalid_identifier");
      }
      identifierOverride = value;
      continue;
    }
    if (flag === "--dist") {
      if (!options.allowSourceOverrides) {
        return argumentFailureV1("source_override_unavailable:--dist");
      }
      if (
        value !== value.trim() || value.includes("\0") ||
        new TextEncoder().encode(value).byteLength > maximumDistArgumentBytesV1
      ) {
        return argumentFailureV1("invalid_dist");
      }
      distOverride = value;
      continue;
    }
    return argumentFailureV1(`unknown_argument:${flag}`);
  }

  if (entry === "author") return argumentFailureV1("author_entry_unsupported");
  if (entry !== "runtime") return argumentFailureV1("invalid_entry");
  return Object.freeze({
    identifierOverride,
    distOverride,
    bootstrap: desktopRuntimeBootstrapConfigV1,
  });
}
