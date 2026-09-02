// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";

import { admitProgramPackageArchiveV1 } from "../../../src/program-platform/package/program-package-archive.ts";
import { projectProgramPackageRuntimeProfileV1 } from "../../../src/program-platform/package/program-runtime-profile-descriptor.ts";
import { creatorProgramPackageSourceV1 } from "../distribution/bundled-package-source.ts";

afterEach(() => vi.unstubAllGlobals());

function servePackageFilesV1(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = input instanceof URL
        ? input
        : new URL(typeof input === "string" ? input : input.url);
      try {
        const bytes = await readFile(url);
        return new Response(Uint8Array.from(bytes));
      } catch {
        return new Response(null, { status: 404 });
      }
    }),
  );
}

describe("Creator Program package", () => {
  it("is a self-contained admitted package without test or note files", async () => {
    servePackageFilesV1();
    const admitted = await admitProgramPackageArchiveV1(
      await creatorProgramPackageSourceV1.loadArchive(),
      {
        limits: {
          maximumManifestBytes: Number.MAX_SAFE_INTEGER,
          maximumFiles: Number.MAX_SAFE_INTEGER,
          maximumPathBytes: Number.MAX_SAFE_INTEGER,
          maximumFileBytes: Number.MAX_SAFE_INTEGER,
          maximumPackageBytes: Number.MAX_SAFE_INTEGER,
        },
      },
    );

    expect(admitted.reference.programId).toBe("sillyos.creator");
    expect(creatorProgramPackageSourceV1.metadata).toEqual({
      reference: admitted.reference,
      ...projectProgramPackageRuntimeProfileV1(admitted),
    });
    expect(admitted.files.map((file) => file.path)).toEqual(["PROGRAM.md"]);
    expect(admitted.files.every((file) => !/(?:^|\/)(?:test|notes)(?:\/|$)/u.test(file.path)))
      .toBe(true);
  });
});
