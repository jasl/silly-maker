// SPDX-License-Identifier: MIT
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface CommandStatusV1 {
  readonly success: boolean;
  readonly code: number;
  readonly signal: string | null;
}

interface ChildProcessV1 {
  readonly pid: number;
  readonly status: Promise<CommandStatusV1>;
  kill(signal?: "SIGTERM"): void;
}

declare const Deno: {
  readonly args: readonly string[];
  readonly build: { readonly os: string };
  readonly env: { toObject(): Record<string, string> };
  exitCode: number;
  cwd(): string;
  makeTempDir(options?: { readonly prefix?: string }): Promise<string>;
  mkdir(path: string, options?: { readonly recursive?: boolean }): Promise<void>;
  addSignalListener(signal: "SIGINT" | "SIGTERM", listener: () => void): void;
  removeSignalListener(signal: "SIGINT" | "SIGTERM", listener: () => void): void;
  readonly Command: new (
    command: string,
    options: {
      readonly args?: readonly string[];
      readonly cwd?: string;
      readonly env?: Readonly<Record<string, string>>;
      readonly stdin?: "null";
      readonly stdout?: "piped" | "inherit";
      readonly stderr?: "piped" | "inherit";
    },
  ) => {
    output(): Promise<CommandStatusV1 & { readonly stdout: Uint8Array }>;
    spawn(): ChildProcessV1;
  };
};

export interface DesktopHmrLaunchOptionsV1 {
  readonly denoBinary: string;
  readonly selectedUpstreamCommit: string;
}

const repositoryRootV1 = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const applicationRootV1 = join(repositoryRootV1, "e2e");
const desktopIntentKeyV1 = "SILLYMAKER_DESKTOP_DEV_INTENT_V1";
const shaPatternV1 = /^[0-9a-f]{40}$/u;
let launchedDirectChildV1 = false;

function failureV1(code: string): never {
  throw new Error(`desktop_hmr_smoke:${code}`);
}

export function parseDesktopHmrLaunchOptionsV1(
  argv: readonly string[],
  cwd: string,
): DesktopHmrLaunchOptionsV1 {
  if (argv.length !== 4) return failureV1("options");
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (
      (flag !== "--deno" && flag !== "--upstream-sha") || values.has(flag) ||
      value === undefined || value === "" || value.includes("\0")
    ) {
      return failureV1("options");
    }
    values.set(flag, value);
  }
  const denoBinary = values.get("--deno");
  const selectedUpstreamCommit = values.get("--upstream-sha");
  if (
    denoBinary === undefined ||
    selectedUpstreamCommit === undefined ||
    !shaPatternV1.test(selectedUpstreamCommit)
  ) {
    return failureV1("options");
  }
  return { denoBinary: resolve(cwd, denoBinary), selectedUpstreamCommit };
}

export function requireReportedCanaryRevisionV1(output: string, expectedRevision: string): string {
  const version = /^deno ([^\s]+) \(canary,/u.exec(output)?.[1];
  if (version === undefined || !version.endsWith(`+${expectedRevision}`)) {
    return failureV1("binary_mismatch");
  }
  return version;
}

function desktopHmrArgumentsV1(workspaceRoot: string): readonly string[] {
  return [
    "desktop",
    "-A",
    "--backend",
    "webview",
    "--config",
    resolve(workspaceRoot, "deno.json"),
    "--lock",
    resolve(workspaceRoot, "deno.lock"),
    "--frozen",
    "--node-modules-dir=manual",
    "--hmr",
    ".",
  ];
}

async function mainV1(): Promise<void> {
  if (Deno.build.os !== "darwin") return failureV1("platform.requires_macos");
  const options = parseDesktopHmrLaunchOptionsV1(Deno.args, Deno.cwd());
  const versionResult = await new Deno.Command(options.denoBinary, {
    args: ["--version"],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!versionResult.success) return failureV1("version_failed");
  const denoVersion = requireReportedCanaryRevisionV1(
    new TextDecoder().decode(versionResult.stdout),
    options.selectedUpstreamCommit.slice(0, 7),
  );

  const isolatedRoot = await Deno.makeTempDir({ prefix: "sillymaker-desktop-hmr-" });
  const denoDir = join(isolatedRoot, "deno-dir");
  const recordsDir = join(isolatedRoot, "records");
  const downloadsDir = join(isolatedRoot, "downloads");
  await Promise.all(
    [denoDir, recordsDir, downloadsDir].map((path) => Deno.mkdir(path, { recursive: true })),
  );
  const runId = `hmr-${crypto.randomUUID()}`;
  const intent = JSON.stringify({
    revision: 1,
    runId,
    recordsDir,
    downloadsDir,
    bootstrap: { revision: 1, entry: "runtime", target: "deno_desktop" },
  });
  const child = new Deno.Command(options.denoBinary, {
    args: desktopHmrArgumentsV1(repositoryRootV1),
    cwd: applicationRootV1,
    env: {
      ...Deno.env.toObject(),
      DENO_DIR: denoDir,
      NO_COLOR: "1",
      [desktopIntentKeyV1]: intent,
    },
    stdin: "null",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  launchedDirectChildV1 = true;
  let interrupted: "SIGINT" | "SIGTERM" | null = null;
  const interrupt = (signal: "SIGINT" | "SIGTERM") => (): void => {
    interrupted ??= signal;
    try {
      child.kill("SIGTERM");
    } catch {
      // The directly owned child may already have exited.
    }
  };
  const onInterrupt = interrupt("SIGINT");
  const onTerminate = interrupt("SIGTERM");
  Deno.addSignalListener("SIGINT", onInterrupt);
  Deno.addSignalListener("SIGTERM", onTerminate);
  console.log(
    `DESKTOP_HMR_LAUNCH_PREFLIGHT_START deno=${denoVersion} selectedUpstreamCommit=${options.selectedUpstreamCommit}`,
  );
  console.log(
    `ISOLATED_PATHS directChildPid=${
      String(child.pid)
    } records=${recordsDir} downloads=${downloadsDir}`,
  );
  console.log(
    "MANUAL_CHECKLIST\n" +
      "1. Wait for the official Vite startup log and one ready Engine Lab window; confirm the Desktop " +
      "bootstrap, invoke one state action, and confirm the private records route uses the isolated " +
      "records directory without recovery UI.\n" +
      "2. Preserve visible transient UI state, manually edit and restore LabHudV1 markup in the " +
      "component-only e2e/src/application/shell-ui.tsx module, " +
      "and confirm Vite reports HMR while the same window/origin stays live without a page reload.\n" +
      "3. Leave one state change pending, close the native window normally, and confirm its record is " +
      "flushed; this launcher requires its directly owned Deno child to exit 0.",
  );
  try {
    const status = await child.status;
    if (interrupted !== null) return failureV1(`interrupted.${interrupted}`);
    if (!status.success || status.code !== 0 || status.signal !== null) {
      return failureV1(`desktop.exit_${String(status.code)}_${String(status.signal)}`);
    }
    console.log(
      `DESKTOP_HMR_LAUNCH_PREFLIGHT_PASS runId=${runId} HUMAN_CHARACTERIZATION_REQUIRED`,
    );
  } finally {
    Deno.removeSignalListener("SIGINT", onInterrupt);
    Deno.removeSignalListener("SIGTERM", onTerminate);
  }
}

if (import.meta.main) {
  await mainV1().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    if (launchedDirectChildV1) {
      console.error(
        "If a native window or backend remains, close it manually; the launcher does not scan or kill descendants.",
      );
    }
    Deno.exitCode = 1;
  });
}
