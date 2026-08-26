// SPDX-License-Identifier: MIT
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const providerMaximumLengthV1 = 128;
const modelMaximumLengthV1 = 512;
const apiKeyMaximumLengthV1 = 64 * 1024;
const pathMaximumLengthV1 = 4 * 1024;
const forbiddenControlPatternV1 = /[\0\r\n]/;

export const pinnedPiCodingAgentVersionV1 = "0.84.3";

/** Resolves only the exact package declared by this product and admitted by the root lockfile. */
export function resolvePinnedPiCodingAgentArtifactV1(): string {
  return fileURLToPath(
    new URL(
      "../../node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js",
      import.meta.url,
    ),
  );
}

function startupFailureV1(code: string): TypeError {
  return new TypeError(`sillyos.pi_rpc_startup.${code}`);
}

function readFlagValueV1(
  argv: readonly string[],
  index: number,
  flag: string,
): readonly [value: string, nextIndex: number] {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw startupFailureV1(`missing_value:${flag}`);
  }
  return [value, index + 1];
}

function requireSingleValueV1(
  current: string | undefined,
  value: string,
  flag: string,
): string {
  if (current !== undefined) throw startupFailureV1(`duplicate:${flag}`);
  return value;
}

function requireOpaqueValueV1(
  value: string,
  code: string,
  maximumLength: number,
): string {
  if (
    value.length === 0 ||
    value.length > maximumLength ||
    value.trim() !== value ||
    forbiddenControlPatternV1.test(value)
  ) {
    throw startupFailureV1(code);
  }
  return value;
}

export interface PiRpcStartupArgumentsV1 {
  readonly provider: string | null;
  readonly model: string | null;
  readonly apiKey: string | null;
  readonly directory: string | null;
  readonly listModels: false | true | string;
  readonly dryRun: boolean;
  readonly help: boolean;
}

/**
 * Parses only the product-owned launch surface. Provider and model values stay
 * opaque so the pinned Pi process remains their sole registry and validator.
 */
export function parsePiRpcStartupArgumentsV1(
  argv: readonly string[],
): PiRpcStartupArgumentsV1 {
  let provider: string | undefined;
  let model: string | undefined;
  let apiKey: string | undefined;
  let directory: string | undefined;
  let listModels: false | true | string = false;
  let listModelsSeen = false;
  let dryRun = false;
  let help = false;
  let taskSeparatorSeen = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case "--":
        if (taskSeparatorSeen || index !== 0) {
          throw startupFailureV1("unexpected_separator");
        }
        taskSeparatorSeen = true;
        break;
      case "--provider": {
        const [value, nextIndex] = readFlagValueV1(argv, index, argument);
        provider = requireSingleValueV1(provider, value, argument);
        index = nextIndex;
        break;
      }
      case "--model": {
        const [value, nextIndex] = readFlagValueV1(argv, index, argument);
        model = requireSingleValueV1(model, value, argument);
        index = nextIndex;
        break;
      }
      case "--api-key": {
        const [value, nextIndex] = readFlagValueV1(argv, index, argument);
        apiKey = requireSingleValueV1(apiKey, value, argument);
        index = nextIndex;
        break;
      }
      case "--directory": {
        const [value, nextIndex] = readFlagValueV1(argv, index, argument);
        directory = requireSingleValueV1(directory, value, argument);
        index = nextIndex;
        break;
      }
      case "--list-models": {
        if (listModelsSeen) throw startupFailureV1("duplicate:--list-models");
        listModelsSeen = true;
        const filter = argv[index + 1];
        if (filter !== undefined && !filter.startsWith("--")) {
          listModels = filter;
          index += 1;
        } else {
          listModels = true;
        }
        break;
      }
      case "--dry-run":
        if (dryRun) throw startupFailureV1("duplicate:--dry-run");
        dryRun = true;
        break;
      case "--help":
      case "-h":
        help = true;
        break;
      default:
        throw startupFailureV1("unknown_argument");
    }
  }

  const normalizedProvider = provider === undefined
    ? null
    : requireOpaqueValueV1(provider, "invalid_provider", providerMaximumLengthV1);
  const normalizedModel = model === undefined
    ? null
    : requireOpaqueValueV1(model, "invalid_model", modelMaximumLengthV1);
  const normalizedApiKey = apiKey === undefined
    ? null
    : requireOpaqueValueV1(apiKey, "invalid_api_key", apiKeyMaximumLengthV1);
  const normalizedDirectory = directory === undefined
    ? null
    : requireOpaqueValueV1(directory, "invalid_directory", pathMaximumLengthV1);
  const normalizedListModels = typeof listModels === "string"
    ? requireOpaqueValueV1(listModels, "invalid_model_filter", modelMaximumLengthV1)
    : listModels;

  if (!help && normalizedListModels === false) {
    if (normalizedProvider === null) throw startupFailureV1("provider_required");
    if (normalizedModel === null) throw startupFailureV1("model_required");
  }
  if (
    normalizedListModels !== false &&
    (normalizedProvider !== null || normalizedModel !== null || normalizedApiKey !== null)
  ) {
    throw startupFailureV1("list_models_conflict");
  }

  return Object.freeze({
    provider: normalizedProvider,
    model: normalizedModel,
    apiKey: normalizedApiKey,
    directory: normalizedDirectory,
    listModels: normalizedListModels,
    dryRun,
    help,
  });
}

const isolatedPiArgumentsV1 = Object.freeze([
  "--no-tools",
  "--no-extensions",
  "--no-skills",
  "--no-prompt-templates",
  "--no-themes",
  "--no-context-files",
  "--no-approve",
]);

export interface PiRpcLaunchSpecV1 {
  readonly artifactPath: string;
  readonly artifactVersion: typeof pinnedPiCodingAgentVersionV1;
  readonly arguments: readonly string[];
  readonly directory: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly piAgentDirectory: string;
  readonly mode: "rpc" | "list_models";
  readonly provider: string | null;
  readonly model: string | null;
  readonly credentialSource: "argument" | "pi_auth_or_environment";
}

/** Matches Deno --env-file precedence without mutating the launcher process. */
export function mergePiRpcEnvironmentV1(input: {
  readonly fileEnvironment: Readonly<Record<string, string | undefined>>;
  readonly processEnvironment: Readonly<Record<string, string | undefined>>;
}): Readonly<Record<string, string>> {
  const merged: Record<string, string> = {};
  for (const [name, value] of Object.entries(input.fileEnvironment)) {
    if (value !== undefined) merged[name] = value;
  }
  for (const [name, value] of Object.entries(input.processEnvironment)) {
    if (value !== undefined) merged[name] = value;
  }
  return Object.freeze(merged);
}

export function createPiRpcLaunchSpecV1(input: {
  readonly parsed: PiRpcStartupArgumentsV1;
  readonly cwd: string;
  readonly environment: Readonly<Record<string, string | undefined>>;
}): PiRpcLaunchSpecV1 {
  const { parsed } = input;
  if (parsed.help) throw startupFailureV1("help_has_no_launch_spec");

  const directory = resolve(input.cwd, parsed.directory ?? ".");
  const artifactPath = resolvePinnedPiCodingAgentArtifactV1();
  const configuredAgentDirectory = input.environment.PI_CODING_AGENT_DIR;
  const piAgentDirectory = resolve(
    directory,
    configuredAgentDirectory === undefined || configuredAgentDirectory.length === 0
      ? "tmp/sillyos-pi-agent"
      : requireOpaqueValueV1(
        configuredAgentDirectory,
        "invalid_pi_agent_directory",
        pathMaximumLengthV1,
      ),
  );

  let piArguments: string[];
  if (parsed.listModels !== false) {
    piArguments = [
      "--list-models",
      ...(typeof parsed.listModels === "string" ? [parsed.listModels] : []),
      ...isolatedPiArgumentsV1,
    ];
  } else {
    if (parsed.provider === null) throw startupFailureV1("provider_required");
    if (parsed.model === null) throw startupFailureV1("model_required");
    piArguments = [
      "--mode",
      "rpc",
      "--provider",
      parsed.provider,
      "--model",
      parsed.model,
      ...(parsed.apiKey === null ? [] : ["--api-key", parsed.apiKey]),
      "--no-session",
      ...isolatedPiArgumentsV1,
    ];
  }

  return Object.freeze({
    artifactPath,
    artifactVersion: pinnedPiCodingAgentVersionV1,
    arguments: Object.freeze(piArguments),
    directory,
    environment: Object.freeze({
      ...input.environment,
      PI_CODING_AGENT_DIR: piAgentDirectory,
    }),
    piAgentDirectory,
    mode: parsed.listModels === false ? "rpc" : "list_models",
    provider: parsed.provider,
    model: parsed.model,
    credentialSource: parsed.apiKey === null ? "pi_auth_or_environment" : "argument",
  });
}

export interface PiRpcLaunchSummaryV1 {
  readonly revision: 1;
  readonly artifactPath: string;
  readonly artifactVersion: typeof pinnedPiCodingAgentVersionV1;
  readonly arguments: readonly string[];
  readonly directory: string;
  readonly piAgentDirectory: string;
  readonly mode: "rpc" | "list_models";
  readonly provider: string | null;
  readonly model: string | null;
  readonly credentialSource: "argument" | "pi_auth_or_environment";
}

/** A diagnostic projection that never returns a raw API key. */
export function summarizePiRpcLaunchV1(
  spec: PiRpcLaunchSpecV1,
): PiRpcLaunchSummaryV1 {
  const safeArguments = [...spec.arguments];
  const apiKeyIndex = safeArguments.indexOf("--api-key");
  if (apiKeyIndex !== -1 && apiKeyIndex + 1 < safeArguments.length) {
    safeArguments[apiKeyIndex + 1] = "<redacted>";
  }
  return Object.freeze({
    revision: 1,
    artifactPath: spec.artifactPath,
    artifactVersion: spec.artifactVersion,
    arguments: Object.freeze(safeArguments),
    directory: spec.directory,
    piAgentDirectory: spec.piAgentDirectory,
    mode: spec.mode,
    provider: spec.provider,
    model: spec.model,
    credentialSource: spec.credentialSource,
  });
}

export const piRpcStartupHelpV1 = `SillyOS raw Pi RPC development launcher

Usage:
  deno task pi:rpc -- --provider <pi-provider> --model <pi-model> [options]
  deno task pi:rpc -- --list-models [filter] [options]

Options:
  --provider <id>       Opaque provider id validated by the pinned Pi process
  --model <id>          Opaque model id or pattern validated by Pi
  --api-key <secret>    Non-persistent key for the selected provider
  --directory <path>    Pi working directory (default: current directory)
  --list-models [text]  Ask Pi for currently available provider/models
  --dry-run             Print a redacted launch summary without starting Pi
  --help, -h            Show this help

The launcher loads <directory>/.env when that file exists. Existing process
environment variables win over that file. To select another exact file, run:
  deno task --env-file=/absolute/project/.env pi:rpc -- <options>

For development and testing only. A raw --api-key can be visible in shell
history, task-runner output, and process inspection; prefer Pi-supported
environment variables such as ANTHROPIC_API_KEY, OPENAI_API_KEY, and
OPENROUTER_API_KEY. Use "deno task --quiet" when intentionally passing a raw
key through the task runner.

The launcher never searches PATH or accepts a Pi command override. It resolves
only this product's locked @earendil-works/pi-coding-agent@${pinnedPiCodingAgentVersionV1}
CLI artifact and runs it with the current Deno executable. A missing or
non-regular artifact fails before dry-run or launch. This launcher is not the
typed SillyOS companion and is not connected to the Creator UI.`;
