// SPDX-License-Identifier: MIT
// Filesystem slice · module: notepad documents. Writes/deletes commit atomically; the
// revision counter is a deterministic stand-in for "modified time"; the engine save IS this disk's persistence.
import type { OsFilesystemStateV1 } from "../../state.ts";
import { osFilesystemStateSchemaV1 } from "../../state.ts";
import { commandSchemaV1, kit } from "../../kernel.ts";

export const filesystemModuleV1 = kit.defineStatefulModule({
  id: "os.filesystem",
  contractRevision: 1,
  state: {
    slot: "simulation.filesystem",
    schema: osFilesystemStateSchemaV1,
    initial: (): OsFilesystemStateV1 => Object.freeze({ files: Object.freeze([]), writes: 0 }),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "os.fs.saved": (state, event) => {
      const next = Object.freeze({
        name: event.name,
        content: event.content,
        revision: event.revision,
      });
      const others = state.files.filter((file) => file.name !== event.name);
      // Files keep a stable lexicographic-by-name order (canonical JSON matches the UI list).
      const files = Object.freeze(
        [...others, next].toSorted((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
      );
      return Object.freeze({ files, writes: event.revision });
    },
    "os.fs.removed": (state, event) =>
      Object.freeze({
        files: Object.freeze(state.files.filter((file) => file.name !== event.name)),
        writes: state.writes,
      }),
  },
});
