// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  createPiRpcLaunchSpecV1,
  mergePiRpcEnvironmentV1,
  parsePiRpcStartupArgumentsV1,
  summarizePiRpcLaunchV1,
} from "../companion/pi-rpc-startup.ts";

describe("SillyOS Pi RPC development startup", () => {
  it("lets process environment override the selected directory .env", () => {
    expect(
      mergePiRpcEnvironmentV1({
        fileEnvironment: {
          ANTHROPIC_API_KEY: "from-file",
          OPENAI_API_KEY: "file-only",
        },
        processEnvironment: {
          ANTHROPIC_API_KEY: "from-process",
          OPENROUTER_API_KEY: "process-only",
        },
      }),
    ).toEqual({
      ANTHROPIC_API_KEY: "from-process",
      OPENAI_API_KEY: "file-only",
      OPENROUTER_API_KEY: "process-only",
    });
  });

  it("passes an opaque Pi provider/model and the selected runtime key through fixed RPC flags", () => {
    const parsed = parsePiRpcStartupArgumentsV1([
      "--",
      "--provider",
      "future-provider",
      "--model",
      "family/model:high",
      "--api-key",
      "sentinel-secret",
      "--directory",
      "project",
      "--pi-command",
      "/tools/pi",
    ]);

    const spec = createPiRpcLaunchSpecV1({
      parsed,
      cwd: "/workspace",
      environment: {},
    });

    expect(spec).toMatchObject({
      command: "/tools/pi",
      directory: "/workspace/project",
      piAgentDirectory: "/workspace/project/tmp/sillyos-pi-agent",
      mode: "rpc",
      provider: "future-provider",
      model: "family/model:high",
      credentialSource: "argument",
    });
    expect(spec.arguments).toEqual([
      "--mode",
      "rpc",
      "--provider",
      "future-provider",
      "--model",
      "family/model:high",
      "--api-key",
      "sentinel-secret",
      "--no-session",
      "--no-tools",
      "--no-extensions",
      "--no-skills",
      "--no-prompt-templates",
      "--no-themes",
      "--no-context-files",
      "--no-approve",
    ]);
  });

  it("delegates provider discovery to Pi without requiring a local provider list", () => {
    const parsed = parsePiRpcStartupArgumentsV1([
      "--list-models",
      "claude",
      "--dry-run",
    ]);
    const spec = createPiRpcLaunchSpecV1({
      parsed,
      cwd: "/workspace",
      environment: {
        SILLYOS_PI_COMMAND: "pi-pinned",
        PI_CODING_AGENT_DIR: "/isolated/pi",
      },
    });

    expect(spec).toMatchObject({
      command: "pi-pinned",
      piAgentDirectory: "/isolated/pi",
      mode: "list_models",
      credentialSource: "pi_auth_or_environment",
    });
    expect(spec.arguments).toEqual([
      "--list-models",
      "claude",
      "--no-tools",
      "--no-extensions",
      "--no-skills",
      "--no-prompt-templates",
      "--no-themes",
      "--no-context-files",
      "--no-approve",
    ]);
  });

  it("redacts an argument key from the only diagnostic projection", () => {
    const parsed = parsePiRpcStartupArgumentsV1([
      "--provider",
      "anthropic",
      "--model",
      "claude",
      "--api-key",
      "sentinel-secret",
    ]);
    const spec = createPiRpcLaunchSpecV1({
      parsed,
      cwd: "/workspace",
      environment: {},
    });

    const serialized = JSON.stringify(summarizePiRpcLaunchV1(spec));
    expect(serialized).toContain("<redacted>");
    expect(serialized).not.toContain("sentinel-secret");
  });

  it.each([
    { argv: [], code: "provider_required" },
    { argv: ["--provider", "anthropic"], code: "model_required" },
    {
      argv: ["--provider", "anthropic", "--provider", "openai", "--model", "m"],
      code: "duplicate:--provider",
    },
    {
      argv: ["--provider", "anthropic", "--model", "m", "--api-key"],
      code: "missing_value:--api-key",
    },
    {
      argv: ["--provider", "anthropic", "--model", "m", "--api-key", "--dry-run"],
      code: "missing_value:--api-key",
    },
    {
      argv: ["--provider", "anthropic", "--model", "m", "--unknown", "sentinel-secret"],
      code: "unknown_argument",
    },
    {
      argv: ["--list-models", "--provider", "anthropic", "--model", "m"],
      code: "list_models_conflict",
    },
    {
      argv: ["--provider", "anthropic", "--", "--model", "m"],
      code: "unexpected_separator",
    },
  ])("rejects invalid startup input with a secret-safe code: $code", ({ argv, code }) => {
    let message = "";
    try {
      parsePiRpcStartupArgumentsV1(argv);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toBe(`sillyos.pi_rpc_startup.${code}`);
    expect(message).not.toContain("sentinel-secret");
  });
});
