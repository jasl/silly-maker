// SPDX-License-Identifier: MIT
import { resolve } from "node:path";
import { parseEnv } from "node:util";

import {
  createPiRpcLaunchSpecV1,
  mergePiRpcEnvironmentV1,
  parsePiRpcStartupArgumentsV1,
  piRpcStartupHelpV1,
  summarizePiRpcLaunchV1,
} from "../src/companion/pi-rpc-startup.ts";

function failV1(message: string, exitCode: number): never {
  console.error(message);
  Deno.exit(exitCode);
}

let parsed: ReturnType<typeof parsePiRpcStartupArgumentsV1>;
try {
  parsed = parsePiRpcStartupArgumentsV1(Deno.args);
} catch (error) {
  failV1(
    error instanceof Error ? error.message : "sillyos.pi_rpc_startup.invalid_arguments",
    2,
  );
}

if (parsed.help) {
  console.log(piRpcStartupHelpV1);
  Deno.exit(0);
}

const launchDirectory = resolve(Deno.cwd(), parsed.directory ?? ".");
const directoryEnvFile = resolve(launchDirectory, ".env");
let fileEnvironment: Readonly<Record<string, string>> = Object.freeze({});
try {
  const info = await Deno.stat(directoryEnvFile);
  if (!info.isFile) failV1("sillyos.pi_rpc_startup.env_file_invalid", 2);
  fileEnvironment = Object.freeze(parseEnv(await Deno.readTextFile(directoryEnvFile)));
} catch (error) {
  if (!(error instanceof Deno.errors.NotFound)) {
    failV1("sillyos.pi_rpc_startup.env_file_invalid", 2);
  }
}

const environment = mergePiRpcEnvironmentV1({
  fileEnvironment,
  processEnvironment: Deno.env.toObject(),
});

const spec = createPiRpcLaunchSpecV1({
  parsed,
  cwd: Deno.cwd(),
  environment,
});

if (parsed.dryRun) {
  console.log(JSON.stringify(summarizePiRpcLaunchV1(spec), null, 2));
  Deno.exit(0);
}

try {
  await Deno.mkdir(spec.piAgentDirectory, { recursive: true });
} catch {
  failV1("sillyos.pi_rpc_startup.agent_directory_unavailable", 1);
}

let child: Deno.ChildProcess;
try {
  child = new Deno.Command(spec.command, {
    args: [...spec.arguments],
    cwd: spec.directory,
    env: { ...spec.environment },
    clearEnv: true,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
} catch {
  failV1("sillyos.pi_rpc_startup.command_unavailable", 127);
}

const status = await child.status;
Deno.exit(status.code);
