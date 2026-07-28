// SPDX-License-Identifier: MIT
// Filesystem slice · module: notepad documents. Writes/deletes commit atomically; the
// revision counter is a deterministic stand-in for "modified time"; the engine save IS this disk's persistence.
import type { OsFilesystemStateV1 } from "../../state.ts";
import { osFilesystemStateSchemaV1, osMaxFilesV1 } from "../../state.ts";
import type { OsFactV1 } from "../../kernel.ts";
import { commandSchemaV1, kit, operationSchemaV1 } from "../../kernel.ts";

export type FilesystemOperationV1 =
  | { readonly kind: "write"; readonly name: string; readonly content: string }
  | { readonly kind: "remove"; readonly name: string };

export const filesystemModuleV1 = kit.defineStatefulModule({
  id: "os.filesystem",
  contractRevision: 1,
  state: {
    slot: "simulation.filesystem",
    schema: osFilesystemStateSchemaV1,
    initial: (): OsFilesystemStateV1 => Object.freeze({ files: Object.freeze([]), writes: 0 }),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<FilesystemOperationV1>("filesystem"),
    propose(state, operation) {
      if (operation.kind === "write") {
        const exists = state.files.some((file) => file.name === operation.name);
        if (!exists && state.files.length >= osMaxFilesV1) {
          return Object.freeze({
            kind: "rejected" as const,
            rejection: Object.freeze({ code: "os.fs.disk_full" as const }),
          });
        }
        const facts: readonly OsFactV1[] = Object.freeze([
          Object.freeze({
            kind: "os.fs.saved" as const,
            name: operation.name,
            revision: state.writes + 1,
          }),
        ]);
        return Object.freeze({
          kind: "proposed" as const,
          proposal: Object.freeze({ payload: operation, facts }),
        });
      }
      if (!state.files.some((file) => file.name === operation.name)) {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "os.fs.not_found" as const }),
        });
      }
      const facts: readonly OsFactV1[] = Object.freeze([
        Object.freeze({ kind: "os.fs.removed" as const, name: operation.name }),
      ]);
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({ payload: operation, facts }),
      });
    },
    apply(state, proposal) {
      const operation = proposal.payload;
      if (operation.kind === "remove") {
        return Object.freeze({
          files: Object.freeze(state.files.filter((file) => file.name !== operation.name)),
          writes: state.writes,
        });
      }
      const revision = state.writes + 1;
      const next = Object.freeze({
        name: operation.name,
        content: operation.content,
        revision,
      });
      const others = state.files.filter((file) => file.name !== operation.name);
      // Files keep a stable lexicographic-by-name order (canonical JSON matches the UI list).
      const files = Object.freeze(
        [...others, next].toSorted((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
      );
      return Object.freeze({ files, writes: revision });
    },
  },
});
