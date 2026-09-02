// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import type { BrowserPiAgentDispatchV1 } from "../agent/browser-pi-agent-dispatch.ts";
import { createBrowserProgramExecutionLoaderV1 } from "../agent/browser-program-execution-loader.ts";
import type { BrowserProgramRuntimeProfileV1 } from "../agent/browser-program-runtime-profile.ts";
import { creatorProgramRuntimeProfileV1 } from "../../programs/creator/runtime-profile/creator-runtime-profile.ts";
import type { ProgramPackageInstallationRepositoryV1 } from "../program-platform/installation/program-package-installation-repository.ts";
import {
  sillyOsProgramHarnessCompatibilityV1,
  type AdmittedProgramPackageArchiveV1,
  type InstalledProgramPackageReferenceV1,
} from "../program-platform/package/program-package-archive.ts";

const textEncoderV1 = new TextEncoder();
const programPackageV1: InstalledProgramPackageReferenceV1 = {
  programId: "sillyos.creator",
  packageVersion: "1.0.0",
};
const dispatchV1: BrowserPiAgentDispatchV1 = {
  revision: 1,
  runtimeProfile: creatorProgramRuntimeProfileV1,
  programPackage: programPackageV1,
  workspaceProgramId: programPackageV1.programId,
  payload: {
    revision: 1,
    proposalId: "proposal.execution-loader.1",
    programId: programPackageV1.programId,
    baseProgramRevision: 1,
    text: "Create a Program.",
  },
};

function implementationBindingV1(implementationId = "installation.1") {
  return { programPackage: programPackageV1, implementationId } as const;
}

const runtimeProfileV1: BrowserProgramRuntimeProfileV1 = {
  runtimeProfile: creatorProgramRuntimeProfileV1,
  packageDescriptor: {
    runtimeProfile: creatorProgramRuntimeProfileV1,
    capabilityIds: [],
    scriptRuntimes: [],
    initialUiSurfaceIds: [],
  },
  harnessToolIds: [],
  providerTimeoutMilliseconds: 30_000,
  admitDispatch: () => ({
    kind: "admitted",
    invocation: {
      requestedOutputTokens: 2_048,
      userPrompt: "Create a Program.",
      textOutput: { kind: "publish", maximumCharacters: 8_192 },
      deterministicTest: { finalReply: "Ready." },
      completion: {
        kind: "candidate",
        deterministicArguments: {},
        createTool: () => ({}) as never,
        admitCandidate: () => ({ kind: "rejected", failure: "candidate_invalid" }),
      },
    },
  }),
};

function installedPackageV1(
  input: {
    readonly reference?: InstalledProgramPackageReferenceV1;
    readonly programId?: string;
    readonly harnessCompatibility?: string;
    readonly runtimeProfile?: string;
    readonly instructionsPath?: string;
    readonly instructions?: Uint8Array;
    readonly capabilityIds?: readonly string[];
    readonly scriptRuntime?: "python" | "quickjs" | null;
    readonly initialUiSurface?: string | null;
    readonly modelPromptOverlays?: readonly {
      readonly modelPattern: string;
      readonly path: string;
      readonly instructions: string;
    }[];
  } = {},
): AdmittedProgramPackageArchiveV1 {
  const instructionsPath = input.instructionsPath ?? "PROGRAM.md";
  const reference = input.reference ?? programPackageV1;
  const instructions = input.instructions ?? textEncoderV1.encode("Follow exact instructions.\n");
  const scriptRuntime = input.scriptRuntime ?? null;
  const initialUiSurface = input.initialUiSurface ?? null;
  const modelPromptOverlays = input.modelPromptOverlays ?? [];
  const extraFiles = [
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
    ...modelPromptOverlays.map((overlay) => ({
      path: overlay.path,
      mediaType: "text/markdown",
      bytes: textEncoderV1.encode(overlay.instructions).buffer,
    })),
  ];
  return {
    reference,
    manifest: {
      schemaVersion: 1,
      programId: input.programId ?? reference.programId,
      packageVersion: reference.packageVersion,
      harnessCompatibility: input.harnessCompatibility ?? sillyOsProgramHarnessCompatibilityV1,
      runtimeProfile: input.runtimeProfile ?? creatorProgramRuntimeProfileV1,
      name: "Creator",
      summary: "Create a Program.",
      instructionsPath,
      ...(modelPromptOverlays.length === 0 ? {} : {
        modelPromptOverlays: modelPromptOverlays.map(({ modelPattern, path }) => ({
          modelPattern,
          path,
        })),
      }),
      settingsSchemaPath: null,
      settingsDefaultsPath: null,
      initialUiPath: initialUiSurface === null ? null : "initial-ui.json",
      scripts: scriptRuntime === null
        ? []
        : [{ path: "scripts/prepare.js", runtime: scriptRuntime }],
      capabilityIds: [...(input.capabilityIds ?? [])],
    },
    files: [
      {
        path: "PROGRAM.md",
        mediaType: "text/markdown",
        bytes: instructions.buffer.slice(
          instructions.byteOffset,
          instructions.byteOffset + instructions.byteLength,
        ) as ArrayBuffer,
      },
      ...extraFiles,
    ],
  };
}

function repositoryV1(
  loadPackage: (programId: string) => Promise<AdmittedProgramPackageArchiveV1 | null>,
  installationId: () => string = () => "installation.1",
): ProgramPackageInstallationRepositoryV1 & {
  readonly initialize: ReturnType<typeof vi.fn>;
  readonly dispose: ReturnType<typeof vi.fn>;
} {
  return {
    initialize: vi.fn(async () => "opened" as const),
    install: vi.fn(async () => {
      throw new Error("not used");
    }),
    async load(programId) {
      const installedPackage = await loadPackage(programId);
      return installedPackage === null ? null : {
        acquisition: "external",
        installationId: installationId(),
        package: installedPackage,
      };
    },
    listMetadata: vi.fn(async () => []),
    remove: vi.fn(async () => false),
    reset: vi.fn(async () => undefined),
    dispose: vi.fn(async () => undefined),
  };
}

describe("Browser Program execution loader", () => {
  it("pairs the current compatible Program instructions with fixed Host code", async () => {
    const repository = repositoryV1(vi.fn(async (programId) => {
      expect(programId).toBe(programPackageV1.programId);
      return installedPackageV1();
    }));
    const loadRuntimeProfile = vi.fn(async (runtimeProfile: string) => {
      expect(runtimeProfile).toBe(creatorProgramRuntimeProfileV1);
      return runtimeProfileV1;
    });
    const loader = createBrowserProgramExecutionLoaderV1({
      repository,
      loadRuntimeProfile,
    });

    await expect(loader.load(dispatchV1, implementationBindingV1())).resolves.toEqual({
      instructions: "Follow exact instructions.\n",
      modelPromptOverlays: [],
      packageResources: [{
        path: "PROGRAM.md",
        mediaType: "text/markdown",
        bytes: new TextEncoder().encode("Follow exact instructions.\n"),
      }],
      workspaceScripts: [],
      runtimeProfile: runtimeProfileV1,
      invocation: expect.objectContaining({
        requestedOutputTokens: 2_048,
        userPrompt: "Create a Program.",
      }),
    });
    expect(repository.initialize).toHaveBeenCalledTimes(1);
    await loader.dispose();
    expect(repository.dispose).toHaveBeenCalledTimes(1);
  });

  it("preloads declared overlays from the Program package without choosing a model", async () => {
    const loader = createBrowserProgramExecutionLoaderV1({
      repository: repositoryV1(vi.fn(async () =>
        installedPackageV1({
          modelPromptOverlays: [{
            modelPattern: "gpt-*",
            path: "prompts/models/gpt.md",
            instructions: "Prefer the exact completion tool.",
          }, {
            modelPattern: "claude-*",
            path: "prompts/models/claude.md",
            instructions: "Keep the tool call compact.",
          }],
        })
      )),
      loadRuntimeProfile: vi.fn(async () => runtimeProfileV1),
    });

    await expect(loader.load(dispatchV1, implementationBindingV1())).resolves.toMatchObject({
      instructions: "Follow exact instructions.\n",
      modelPromptOverlays: [{
        modelPattern: "gpt-*",
        path: "prompts/models/gpt.md",
        instructions: "Prefer the exact completion tool.",
      }, {
        modelPattern: "claude-*",
        path: "prompts/models/claude.md",
        instructions: "Keep the tool call compact.",
      }],
    });
    await loader.dispose();
  });

  it("fences a mounted implementation when a compatible installation replaces it", async () => {
    let current = installedPackageV1();
    let installationId = "installation.1";
    const load = vi.fn(() => Promise.resolve(current));
    const repository = repositoryV1(load, () => installationId);
    const loadRuntimeProfile = vi.fn(() => Promise.resolve(runtimeProfileV1));
    const loader = createBrowserProgramExecutionLoaderV1({
      repository,
      loadRuntimeProfile,
    });

    await expect(loader.load(dispatchV1, implementationBindingV1())).resolves.not.toBeNull();
    await expect(loader.load(dispatchV1, implementationBindingV1())).resolves.not.toBeNull();
    expect(load).toHaveBeenCalledTimes(2);
    expect(loadRuntimeProfile).toHaveBeenCalledTimes(1);

    current = installedPackageV1({ instructions: textEncoderV1.encode("Fixed instructions.\n") });
    installationId = "installation.2";
    await expect(loader.load(dispatchV1, implementationBindingV1())).resolves.toBeNull();
    await expect(loader.load(dispatchV1, implementationBindingV1("installation.2"))).resolves
      .toMatchObject({
        instructions: "Fixed instructions.\n",
      });
    expect(load).toHaveBeenCalledTimes(4);
    expect(loadRuntimeProfile).toHaveBeenCalledTimes(2);
    await loader.dispose();
  });

  it.each([
    ["missing Program", null],
    ["wrong Program identity", installedPackageV1({ programId: "community.creator" })],
    [
      "unsupported harness",
      installedPackageV1({ harnessCompatibility: "sillyos.program-harness.v2" }),
    ],
    ["wrong runtime profile", installedPackageV1({ runtimeProfile: "agent.creator.v2" })],
    ["missing instructions", installedPackageV1({ instructionsPath: "missing.md" })],
    ["blank instructions", installedPackageV1({ instructions: textEncoderV1.encode("  \n") })],
  ])("does not substitute another execution for %s", async (_name, installedPackage) => {
    const loadRuntimeProfile = vi.fn(async () => runtimeProfileV1);
    const loader = createBrowserProgramExecutionLoaderV1({
      repository: repositoryV1(vi.fn(async () => installedPackage)),
      loadRuntimeProfile,
    });

    await expect(loader.load(dispatchV1, implementationBindingV1())).resolves.toBeNull();
    if (
      installedPackage === null ||
      installedPackage.manifest.programId !== dispatchV1.programPackage.programId ||
      installedPackage.manifest.harnessCompatibility !== sillyOsProgramHarnessCompatibilityV1
    ) {
      expect(loadRuntimeProfile).not.toHaveBeenCalled();
    } else {
      expect(loadRuntimeProfile).toHaveBeenCalledTimes(1);
    }
    await loader.dispose();
  });

  it("loads the execution package independently from the Process Workspace subject", async () => {
    const subjectDispatch: BrowserPiAgentDispatchV1 = {
      ...dispatchV1,
      workspaceProgramId: "program.created.by.creator",
      payload: {
        ...dispatchV1.payload as Readonly<Record<string, unknown>>,
        programId: "program.created.by.creator",
      },
    };
    const loader = createBrowserProgramExecutionLoaderV1({
      repository: repositoryV1(vi.fn(async () => installedPackageV1())),
      loadRuntimeProfile: vi.fn(async () => runtimeProfileV1),
    });

    await expect(loader.load(subjectDispatch, implementationBindingV1())).resolves.toMatchObject({
      instructions: "Follow exact instructions.\n",
      runtimeProfile: runtimeProfileV1,
    });
    await loader.dispose();
  });

  it("projects a declared script into the Process-scoped Program directory", async () => {
    const scriptProfile: BrowserProgramRuntimeProfileV1 = {
      ...runtimeProfileV1,
      packageDescriptor: {
        ...runtimeProfileV1.packageDescriptor,
        scriptRuntimes: ["quickjs"],
      },
    };
    const loader = createBrowserProgramExecutionLoaderV1({
      repository: repositoryV1(vi.fn(async () => installedPackageV1({ scriptRuntime: "quickjs" }))),
      loadRuntimeProfile: vi.fn(async () => scriptProfile),
    });

    await expect(loader.load(dispatchV1, implementationBindingV1())).resolves.toMatchObject({
      workspaceScripts: [{
        packagePath: "scripts/prepare.js",
        workspacePath: "/workspace/.sillyos/program/scripts/prepare.js",
        runtime: "quickjs",
        bytes: new TextEncoder().encode("export {};"),
      }],
    });
    await loader.dispose();
  });

  it("rejects a runtime-profile implementation registered under the wrong key", async () => {
    const loader = createBrowserProgramExecutionLoaderV1({
      repository: repositoryV1(vi.fn(async () => installedPackageV1())),
      loadRuntimeProfile: vi.fn(async () =>
        ({
          ...runtimeProfileV1,
          runtimeProfile: "agent.translation.v1",
        }) as BrowserProgramRuntimeProfileV1
      ),
    });

    await expect(loader.load(dispatchV1, implementationBindingV1())).resolves.toBeNull();
    await loader.dispose();
  });

  it.each([
    ["capability", installedPackageV1({ capabilityIds: ["workspace.write"] })],
    ["script runtime", installedPackageV1({ scriptRuntime: "quickjs" })],
    [
      "initial UI surface",
      installedPackageV1({ initialUiSurface: "community.arbitrary-react.v1" }),
    ],
  ])("rejects a Program that self-declares an unsupported %s", async (_name, archive) => {
    const loader = createBrowserProgramExecutionLoaderV1({
      repository: repositoryV1(vi.fn(async () => archive)),
      loadRuntimeProfile: vi.fn(async () => runtimeProfileV1),
    });

    await expect(loader.load(dispatchV1, implementationBindingV1())).resolves.toBeNull();
    await loader.dispose();
  });

  it("lets the selected profile reject its opaque dispatch payload", async () => {
    const loader = createBrowserProgramExecutionLoaderV1({
      repository: repositoryV1(vi.fn(async () => installedPackageV1())),
      loadRuntimeProfile: vi.fn(async () => ({
        ...runtimeProfileV1,
        admitDispatch: () => ({ kind: "rejected" as const }),
      })),
    });

    await expect(loader.load(dispatchV1, implementationBindingV1())).resolves.toBeNull();
    await loader.dispose();
  });
});
