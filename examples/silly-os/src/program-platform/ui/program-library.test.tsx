// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ProgramPackageInstallationResultV1,
} from "../installation/program-package-installation-repository.ts";
import type {
  ProgramPackageLibraryEntryV1,
  ProgramPackageServiceV1,
} from "../installation/program-package-service.ts";
import type { DecodeProgramPackageZipOptionsV1 } from "../package/program-package-zip.ts";
import type { ProcessSummaryV1 } from "../process/program-process-repository.ts";
import { ProgramLibraryV1 } from "./program-library.tsx";

afterEach(cleanup);

const decodeOptionsV1: DecodeProgramPackageZipOptionsV1 = {
  budgets: {
    maximumCompressedBytes: 1_000_000,
    maximumUncompressedBytes: 4_000_000,
    maximumEntries: 128,
  },
  archiveLimits: {
    maximumManifestBytes: 16_384,
    maximumFiles: 128,
    maximumPathBytes: 512,
    maximumFileBytes: 2_000_000,
    maximumPackageBytes: 4_000_000,
  },
};

function installedV1(input: {
  readonly programId: string;
  readonly name: string;
  readonly version: string;
  readonly digestCharacter: string;
  readonly compatibility: ProgramPackageLibraryEntryV1["compatibility"];
  readonly selected?: boolean;
}): ProgramPackageLibraryEntryV1 {
  const runtimeProfile = `${input.programId}.runtime.v1`;
  return {
    reference: {
      programId: input.programId,
      packageVersion: input.version,
      contentDigest: input.digestCharacter.repeat(64),
    },
    manifest: {
      schemaVersion: 1,
      programId: input.programId,
      packageVersion: input.version,
      harnessCompatibility: "sillyos.program-harness.v1",
      runtimeProfile,
      name: input.name,
      summary: `${input.name} summary`,
      instructionsPath: "PROGRAM.md",
      settingsSchemaPath: null,
      settingsDefaultsPath: null,
      initialUiPath: null,
      scripts: [],
      capabilityIds: [],
    },
    byteLength: 12_000,
    compatibility: input.compatibility,
    materialized: true,
    selectedForNewProcesses: input.selected ?? false,
  };
}

function serviceV1(input: {
  readonly listLibrary: ProgramPackageServiceV1["listLibrary"];
  readonly installZip?: ProgramPackageServiceV1["installZip"];
}): ProgramPackageServiceV1 {
  return {
    listLibrary: input.listLibrary,
    async resolveCurrent() {
      return null;
    },
    async loadExact(reference) {
      return { kind: "package_missing", reference };
    },
    async installArchive(archive) {
      return {
        disposition: "installed",
        reference: {
          programId: archive.manifest.programId,
          packageVersion: archive.manifest.packageVersion,
          contentDigest: "0".repeat(64),
        },
      };
    },
    installZip: input.installZip ?? vi.fn(),
    async reset() {},
    async dispose() {},
  };
}

describe("SillyOS Program library", () => {
  it("exposes SillyOS settings without assigning a default Program", async () => {
    const onOpenSettings = vi.fn();
    render(
      <ProgramLibraryV1
        service={serviceV1({ listLibrary: async () => [] })}
        zipDecodeOptions={decodeOptionsV1}
        locale="en"
        onOpenSettings={onOpenSettings}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Creator home/iu)).toBeNull();
  });

  it("lists and opens durable Conversations when the package catalog is unavailable", async () => {
    const summary: ProcessSummaryV1 = {
      schemaVersion: 1,
      processId: "process.saved",
      processRevision: 4,
      programPackage: {
        programId: "community.removed",
        packageVersion: "1.0.0",
        contentDigest: "a".repeat(64),
      },
      subjectProgramId: null,
      status: "active",
      transcriptFrontier: 10,
      updatedAt: Date.UTC(2026, 7, 31, 12, 30),
    };
    const listRecentProcesses = vi.fn(async (input) => ({
      before: input.before,
      summaries: [summary],
      byteLength: 512,
      nextCursor: null,
    }));
    const onOpenProcess = vi.fn(async () => undefined);
    render(
      <ProgramLibraryV1
        service={serviceV1({
          listLibrary: async () => {
            throw new Error("package catalog unavailable");
          },
        })}
        zipDecodeOptions={decodeOptionsV1}
        locale="en"
        listRecentProcesses={listRecentProcesses}
        onOpenProcess={onOpenProcess}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Recent Conversations" }))
      .toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "community.removed" }))
      .toBeInTheDocument();
    expect(screen.getByText("Could not load installed Programs")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View Conversation" }));
    await waitFor(() => expect(onOpenProcess).toHaveBeenCalledWith("process.saved"));
    expect(listRecentProcesses).toHaveBeenCalledWith({ before: null, maximumBytes: 65_536 });
  });

  it("shows exact compatibility and current-selection state without package-origin privilege", async () => {
    const entries = [
      installedV1({
        programId: "community.writer",
        name: "Writer",
        version: "2.0.0",
        digestCharacter: "a",
        compatibility: "ready",
        selected: true,
      }),
      installedV1({
        programId: "community.future",
        name: "Future",
        version: "1.0.0",
        digestCharacter: "b",
        compatibility: "harness_incompatible",
      }),
      installedV1({
        programId: "community.specialized",
        name: "Specialized",
        version: "3.1.4",
        digestCharacter: "c",
        compatibility: "runtime_profile_unavailable",
      }),
      installedV1({
        programId: "community.overreach",
        name: "Overreach",
        version: "1.0.0",
        digestCharacter: "d",
        compatibility: "runtime_profile_incompatible",
      }),
    ];
    render(
      <ProgramLibraryV1
        service={serviceV1({ listLibrary: async () => entries })}
        zipDecodeOptions={decodeOptionsV1}
        locale="en"
      />,
    );

    expect(await screen.findByRole("heading", { name: "Writer" })).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Harness incompatible")).toBeInTheDocument();
    expect(screen.getByText("Runtime unavailable")).toBeInTheDocument();
    expect(screen.getByText("Runtime requirements incompatible")).toBeInTheDocument();
    expect(screen.getByText("Requires sillyos.program-harness.v1")).toBeInTheDocument();
    expect(screen.getByText("Requires community.specialized.runtime.v1")).toBeInTheDocument();
    expect(screen.getByText("Current for new Processes")).toBeInTheDocument();
    expect(screen.getByText("a".repeat(64))).toBeInTheDocument();
    expect(screen.queryByText(/bundled|community package|external package/iu)).toBeNull();

    const input = screen.getByLabelText("Import Program ZIP");
    expect(input).toHaveAttribute(
      "accept",
      ".zip,application/zip,application/x-zip-compressed",
    );
    expect(input).toHaveAccessibleDescription(
      "The ZIP must contain program.json. Importing does not execute package code in the page.",
    );
  });

  it("launches a ready exact package without exposing its acquisition origin", async () => {
    const entry = installedV1({
      programId: "community.writer",
      name: "Writer",
      version: "2.0.0",
      digestCharacter: "a",
      compatibility: "ready",
      selected: true,
    });
    const onLaunch = vi.fn(async () => undefined);
    render(
      <ProgramLibraryV1
        service={serviceV1({ listLibrary: async () => [entry] })}
        zipDecodeOptions={decodeOptionsV1}
        locale="en"
        onLaunch={onLaunch}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Open" }));
    await waitFor(() => expect(onLaunch).toHaveBeenCalledWith(entry.reference));
  });

  it("imports through the supplied service, refreshes the list, and reports completion", async () => {
    const original = installedV1({
      programId: "example.translation",
      name: "Translation",
      version: "1.0.0",
      digestCharacter: "d",
      compatibility: "ready",
      selected: true,
    });
    const imported = installedV1({
      programId: "community.review",
      name: "Review",
      version: "1.0.0",
      digestCharacter: "e",
      compatibility: "ready",
      selected: true,
    });
    let entries: readonly ProgramPackageLibraryEntryV1[] = [original];
    const result: ProgramPackageInstallationResultV1 = {
      disposition: "installed",
      reference: imported.reference,
    };
    const installZip = vi.fn<ProgramPackageServiceV1["installZip"]>(async () => {
      entries = [original, imported];
      return result;
    });
    const onInstalled = vi.fn(async () => undefined);
    render(
      <ProgramLibraryV1
        service={serviceV1({ listLibrary: async () => entries, installZip })}
        zipDecodeOptions={decodeOptionsV1}
        locale="en"
        onInstalled={onInstalled}
      />,
    );
    await screen.findByRole("heading", { name: "Translation" });

    const zipBytes = new Uint8Array([80, 75, 3, 4]);
    const file = {
      name: "review.zip",
      arrayBuffer: vi.fn(async () => zipBytes.buffer.slice(0)),
    } as unknown as File;
    fireEvent.change(screen.getByLabelText("Import Program ZIP"), {
      target: { files: [file] },
    });

    const status = await screen.findByRole("status");
    await waitFor(() => expect(status).toHaveTextContent("Imported review.zip"));
    expect(await screen.findByRole("heading", { name: "Review" })).toBeInTheDocument();
    expect(installZip).toHaveBeenCalledTimes(1);
    const [bytes, options, installationOptions] = installZip.mock.calls[0]!;
    expect(new Uint8Array(bytes as ArrayBuffer)).toEqual(zipBytes);
    expect(options).toBe(decodeOptionsV1);
    expect(installationOptions).toEqual({ selectCurrent: true });
    expect(onInstalled).toHaveBeenCalledWith(result);
    expect(within(status).getByText("This version is selected for new Processes."))
      .toBeInTheDocument();
  });

  it("announces ZIP admission failures without replacing the installed list", async () => {
    const entry = installedV1({
      programId: "community.writer",
      name: "Writer",
      version: "1.0.0",
      digestCharacter: "f",
      compatibility: "ready",
      selected: true,
    });
    const installZip = vi.fn<ProgramPackageServiceV1["installZip"]>(async () => {
      throw new Error("sillyos.program_package.zip.manifest_missing");
    });
    render(
      <ProgramLibraryV1
        service={serviceV1({ listLibrary: async () => [entry], installZip })}
        zipDecodeOptions={decodeOptionsV1}
        locale="en"
      />,
    );
    await screen.findByRole("heading", { name: "Writer" });

    const file = {
      name: "broken.zip",
      arrayBuffer: vi.fn(async () => new Uint8Array([1]).buffer),
    } as unknown as File;
    fireEvent.change(screen.getByLabelText("Import Program ZIP"), {
      target: { files: [file] },
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not import broken.zip");
    expect(alert).toHaveTextContent("sillyos.program_package.zip.manifest_missing");
    expect(screen.getByRole("heading", { name: "Writer" })).toBeInTheDocument();
  });
});
