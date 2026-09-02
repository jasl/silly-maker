// SPDX-License-Identifier: MIT

import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import {
  createIndexedDbProgramDataRepositoryV1,
  type CreateIndexedDbProgramDataRepositoryOptionsV1,
} from "../application/persistence/indexeddb-program-data-repository.ts";
import {
  isProgramDataRepositoryFailureV1,
  type ProgramDataRepositoryV1,
} from "../application/persistence/program-data-repository.ts";
import type { IndexedDbProgramPersistenceFacetV1 } from "../application/persistence/program-persistence-facet.ts";
import type { ProgramProcessRepositoryV1 } from "../program-platform/process/program-process-repository.ts";

type SeedRepositoryV1 = ProgramDataRepositoryV1 & ProgramProcessRepositoryV1;

function facetV1(input: {
  readonly facetId: string;
  readonly storeName: string;
  readonly createdKeyPath: string;
  readonly expectedKeyPath?: string;
}): IndexedDbProgramPersistenceFacetV1 {
  return {
    facetId: input.facetId,
    storeNames: [input.storeName],
    createStores(database) {
      database.createObjectStore(input.storeName, { keyPath: input.createdKeyPath });
    },
    hasExactSchema(transaction) {
      const store = transaction.objectStore(input.storeName);
      return store.keyPath === (input.expectedKeyPath ?? input.createdKeyPath) &&
        !store.autoIncrement && store.indexNames.length === 0;
    },
    async loadOperations() {
      return {
        async prepare(operation, value) {
          if (operation !== "read" && operation !== "write") {
            throw new TypeError("unsupported test facet operation");
          }
          return {
            storeNames: [input.storeName],
            mode: operation === "read" ? "readonly" : "readwrite",
            async invoke({ transaction }) {
              const store = transaction.objectStore(input.storeName);
              if (operation === "write") {
                await new Promise<void>((resolve, reject) => {
                  const request = store.put({ [input.createdKeyPath]: String(value) });
                  request.addEventListener("success", () => resolve(), { once: true });
                  request.addEventListener("error", () => reject(request.error), { once: true });
                });
              }
              return await new Promise<number>((resolve, reject) => {
                const request = store.count();
                request.addEventListener("success", () => resolve(request.result), { once: true });
                request.addEventListener("error", () => reject(request.error), { once: true });
              });
            },
          };
        },
      };
    },
  };
}

function repositoryV1(
  options: CreateIndexedDbProgramDataRepositoryOptionsV1,
): SeedRepositoryV1 {
  return createIndexedDbProgramDataRepositoryV1(options) as SeedRepositoryV1;
}

async function seedConversationV1(repository: SeedRepositoryV1): Promise<void> {
  const processId = "process.facet-isolation";
  await repository.createProcess({
    processId,
    programPackage: {
      programId: "community.program",
      packageVersion: "1.0.0",
    },
    subjectProgramId: null,
    createdAt: 1,
  });
  await repository.appendProcessTranscript({
    processId,
    expectedProcessRevision: 1,
    expectedTranscriptFrontier: 0,
    commitId: "commit.facet-isolation.seed",
    attemptBinding: null,
    entries: [{
      schemaVersion: 1,
      processId,
      sequence: 1,
      entryId: "entry.facet-isolation.seed",
      role: "user",
      state: "committed",
      parts: [{
        kind: "text_markdown",
        partId: "part.facet-isolation.seed",
        markdown: "Conversation Core survives optional facet changes.",
      }],
    }],
    checkpoint: null,
    terminalAttemptReceipt: null,
    updatedAt: 2,
  });
}

async function expectConversationReadableV1(repository: ProgramDataRepositoryV1): Promise<void> {
  await expect(repository.loadProcess("process.facet-isolation")).resolves.toMatchObject({
    processId: "process.facet-isolation",
    transcriptFrontier: 1,
  });
  await expect(repository.loadTranscriptPage({
    processId: "process.facet-isolation",
    beforeSequence: null,
    maximumBytes: 4_096,
  })).resolves.toMatchObject({
    entries: [{ entryId: "entry.facet-isolation.seed" }],
  });
}

describe("Program persistence facet isolation", () => {
  it("keeps Conversation Core readable when a later build removes a facet", async () => {
    const indexedDB = new IDBFactory();
    const databaseName = "facet-isolation.removed";
    const retiredFacet = facetV1({
      facetId: "retired.notes",
      storeName: "retired_note_rows",
      createdKeyPath: "noteId",
    });
    const first = repositoryV1({
      indexedDB,
      keyRange: IDBKeyRange,
      databaseName,
      facets: [retiredFacet],
    });
    await seedConversationV1(first);
    await first.invokeProgramPersistenceFacet({
      revision: 1,
      facetId: "retired.notes",
      operation: "write",
      input: "legacy.note",
    });
    await first.dispose();

    const successor = repositoryV1({ indexedDB, keyRange: IDBKeyRange, databaseName });
    await successor.initialize();
    await expectConversationReadableV1(successor);
    await successor.dispose();
  });

  it("clears Core and every present facet store on an explicit reset", async () => {
    const indexedDB = new IDBFactory();
    const databaseName = "facet-isolation.reset";
    const retiredFacet = facetV1({
      facetId: "retired.notes",
      storeName: "retired_note_rows",
      createdKeyPath: "noteId",
    });
    const first = repositoryV1({
      indexedDB,
      keyRange: IDBKeyRange,
      databaseName,
      facets: [retiredFacet],
    });
    await seedConversationV1(first);
    await first.invokeProgramPersistenceFacet({
      revision: 1,
      facetId: "retired.notes",
      operation: "write",
      input: "legacy.note",
    });
    await first.dispose();

    const resetter = repositoryV1({ indexedDB, keyRange: IDBKeyRange, databaseName });
    await resetter.reset();
    await resetter.dispose();

    const inspection = repositoryV1({
      indexedDB,
      keyRange: IDBKeyRange,
      databaseName,
      facets: [retiredFacet],
    });
    await expect(inspection.loadProcess("process.facet-isolation")).resolves.toBeNull();
    await expect(inspection.invokeProgramPersistenceFacet({
      revision: 1,
      facetId: "retired.notes",
      operation: "read",
      input: null,
    })).resolves.toBe(0);
    await inspection.dispose();
  });

  for (const schema of ["missing", "damaged"] as const) {
    it(`isolates a ${schema} selected facet from Conversation Core`, async () => {
      const indexedDB = new IDBFactory();
      const databaseName = `facet-isolation.${schema}`;
      const storeName = "optional_tool_rows";
      const firstFacet = schema === "damaged"
        ? facetV1({ facetId: "optional.tool", storeName, createdKeyPath: "legacyId" })
        : null;
      const first = repositoryV1({
        indexedDB,
        keyRange: IDBKeyRange,
        databaseName,
        ...(firstFacet === null ? {} : { facets: [firstFacet] }),
      });
      await seedConversationV1(first);
      await first.dispose();

      const selectedFacet = facetV1({
        facetId: "optional.tool",
        storeName,
        createdKeyPath: "processId",
        expectedKeyPath: "processId",
      });
      const successor = repositoryV1({
        indexedDB,
        keyRange: IDBKeyRange,
        databaseName,
        facets: [selectedFacet],
      });
      await successor.initialize();
      await expectConversationReadableV1(successor);
      await expect(successor.invokeProgramPersistenceFacet({
        revision: 1,
        facetId: "optional.tool",
        operation: "read",
        input: null,
      })).rejects.toSatisfy((error: unknown) =>
        isProgramDataRepositoryFailureV1(error) &&
        error.code === "unavailable" &&
        error.operation === "invoke_program_persistence_facet"
      );
      await successor.dispose();
    });
  }
});
