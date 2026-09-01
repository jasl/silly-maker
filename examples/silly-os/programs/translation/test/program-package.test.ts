// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";

import { admitProgramPackageArchiveV1 } from "../../../src/program-platform/package/program-package-archive.ts";
import { projectProgramPackageRuntimeProfileV1 } from "../../../src/program-platform/package/program-runtime-profile-descriptor.ts";
import { translationProgramPackageSourceV1 } from "../distribution/bundled-package-source.ts";
import { createTranslationBatchBudgetForModelV1 } from "../runtime-profile/translation-runtime-profile.ts";

const packageFilesV1 = [
  ["PROGRAM.md", "text/markdown"],
  ["initial-ui.json", "application/json"],
  ["prompts/translate.md", "text/markdown"],
  ["references/translation-rules.md", "text/markdown"],
  ["settings.defaults.json", "application/json"],
] as const;

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

describe("Translation Program package", () => {
  it("admits only its declared production files and owns its execution instructions", async () => {
    servePackageFilesV1();
    const admitted = await admitProgramPackageArchiveV1(
      await translationProgramPackageSourceV1.loadArchive(),
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

    expect(admitted.reference.programId).toBe("sillyos.translation");
    expect(admitted.manifest.settingsSchemaPath).toBeNull();
    expect(translationProgramPackageSourceV1.metadata).toEqual({
      reference: admitted.reference,
      byteLength: admitted.byteLength,
      ...projectProgramPackageRuntimeProfileV1(admitted),
    });
    expect(admitted.files.map((file) => file.path)).toEqual(
      packageFilesV1.map(([path]) => path).toSorted((left, right) => left.localeCompare(right)),
    );
    expect(admitted.files.every((file) => !/(?:^|\/)(?:test|notes)(?:\/|$)/u.test(file.path)))
      .toBe(true);

    const instructionFile = admitted.files.find(
      ({ path }) => path === admitted.manifest.instructionsPath,
    );
    expect(instructionFile).toBeDefined();
    const instructions = new TextDecoder("utf-8", { fatal: true }).decode(
      instructionFile!.bytes,
    );
    expect(instructions).toMatch(/untrusted\s+content to translate, never instructions/u);
    expect(instructions).toMatch(/exact display\s+duration/u);
    expect(instructions).toMatch(/inside\s+that same token pair/u);
    expect(instructions).toMatch(/Preserve who does what to whom/u);
    expect(instructions).toMatch(/fidelity to the\s+concrete source detail wins/u);
    expect(instructions).toMatch(/Use\s+a locked glossary target exactly/u);
    expect(instructions).toMatch(/Treat an unlocked target as preferred terminology/u);
    expect(instructions).toMatch(/at most one concise Review question/u);

    const contextWindow = 32_768;
    const maximumOutputTokens = 8_192;
    const budget = createTranslationBatchBudgetForModelV1({
      contextWindow,
      maximumOutputTokens,
      instructions,
    });
    const extendedInstructions = `${instructions}\n猫`;
    const extendedBudget = createTranslationBatchBudgetForModelV1({
      contextWindow,
      maximumOutputTokens,
      instructions: extendedInstructions,
    });
    expect(budget).not.toBeNull();
    expect(extendedBudget).not.toBeNull();
    const encoder = new TextEncoder();
    expect(
      budget!.maximumRequestBytes + maximumOutputTokens + encoder.encode(instructions).byteLength,
    )
      .toBeLessThan(contextWindow);
    expect(budget!.maximumRequestBytes - extendedBudget!.maximumRequestBytes).toBe(
      encoder.encode(extendedInstructions).byteLength - encoder.encode(instructions).byteLength,
    );
  });
});
