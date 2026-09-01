// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import type { AdmittedProgramPackageArchiveV1 } from "./program-package-archive.ts";
import {
  checkProgramPackageRuntimeProfileCompatibilityV1,
  type ProgramRuntimeProfileDescriptorV1,
} from "./program-runtime-profile-descriptor.ts";

const textEncoderV1 = new TextEncoder();
const descriptorV1: ProgramRuntimeProfileDescriptorV1 = {
  runtimeProfile: "agent.translation.v1",
  capabilityIds: ["agent.text", "workspace.read"],
  requiredCapabilityIds: ["agent.text"],
  scriptRuntimes: ["quickjs"],
  initialUiSurfaceIds: ["translation.intake.v1"],
};

function archiveV1(input: {
  readonly capabilityIds?: readonly string[];
  readonly scriptRuntime?: "python" | "quickjs" | null;
  readonly initialUiSurface?: string | null;
} = {}): AdmittedProgramPackageArchiveV1 {
  const scriptRuntime = input.scriptRuntime ?? null;
  const initialUiSurface = input.initialUiSurface ?? null;
  const files = [
    {
      path: "PROGRAM.md",
      mediaType: "text/markdown",
      bytes: textEncoderV1.encode("Translate faithfully.").buffer,
    },
    ...(scriptRuntime === null ? [] : [{
      path: "scripts/prepare.js",
      mediaType: "application/javascript",
      bytes: textEncoderV1.encode("export {};").buffer,
    }]),
    ...(initialUiSurface === null ? [] : [{
      path: "initial-ui.json",
      mediaType: "application/json",
      bytes: textEncoderV1.encode(JSON.stringify({ surface: initialUiSurface })).buffer,
    }]),
  ];
  return {
    reference: {
      programId: "community.translation",
      packageVersion: "1.0.0",
      contentDigest: "a".repeat(64),
    },
    byteLength: files.reduce((total, file) => total + file.bytes.byteLength, 0),
    manifest: {
      schemaVersion: 1,
      programId: "community.translation",
      packageVersion: "1.0.0",
      harnessCompatibility: "sillyos.program-harness.v1",
      runtimeProfile: "agent.translation.v1",
      name: "Translation",
      summary: "Translate one Process.",
      instructionsPath: "PROGRAM.md",
      settingsSchemaPath: null,
      settingsDefaultsPath: null,
      initialUiPath: initialUiSurface === null ? null : "initial-ui.json",
      scripts: scriptRuntime === null
        ? []
        : [{ path: "scripts/prepare.js", runtime: scriptRuntime }],
      capabilityIds: [...(input.capabilityIds ?? ["agent.text"])],
    },
    files,
  };
}

describe("Program runtime profile package compatibility", () => {
  it("accepts only facets supplied by the fixed Host profile", () => {
    expect(checkProgramPackageRuntimeProfileCompatibilityV1(
      archiveV1({
        capabilityIds: ["agent.text", "workspace.read"],
        scriptRuntime: "quickjs",
        initialUiSurface: "translation.intake.v1",
      }),
      descriptorV1,
    )).toEqual({ kind: "compatible" });
  });

  it.each(
    [
      [
        "capability",
        archiveV1({ capabilityIds: ["python.execute"] }),
      ],
      [
        "script_runtime",
        archiveV1({ scriptRuntime: "python" }),
      ],
      [
        "initial_ui_surface",
        archiveV1({ initialUiSurface: "community.arbitrary-react.v1" }),
      ],
    ] as const,
  )("does not let a package self-grant an unsupported %s", (requirement, archive) => {
    expect(checkProgramPackageRuntimeProfileCompatibilityV1(archive, descriptorV1)).toEqual({
      kind: "incompatible",
      requirement,
    });
  });

  it("does not expose an explicit shared Host capability unless the package requests it", () => {
    expect(checkProgramPackageRuntimeProfileCompatibilityV1(
      archiveV1({ capabilityIds: ["workspace.read"] }),
      descriptorV1,
    )).toEqual({ kind: "incompatible", requirement: "capability" });
  });
});
