// SPDX-License-Identifier: MIT
// Filesystem slice · commands: write/delete. Validation happens at the decision
// point; the emitted event carries everything the reducer folds.
import type { OsCommandHandlerMapV1 } from "../../runtime.ts";
import { transactionRunnerV1 } from "../../runtime.ts";
import { osMaxFilesV1 } from "../../state.ts";

export const filesystemCommandHandlersV1: Pick<
  OsCommandHandlerMapV1,
  "os.fs.write" | "os.fs.remove"
> = Object.freeze({
  "os.fs.write": ({ snapshot, rng, state, command }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      const exists = state.filesystem.files.some((file) => file.name === command.name);
      if (!exists && state.filesystem.files.length >= osMaxFilesV1) {
        return transaction.reject({ code: "os.fs.disk_full" });
      }
      transaction.emit({
        kind: "os.fs.saved",
        name: command.name,
        content: command.content,
        revision: state.filesystem.writes + 1,
      });
      return transaction.complete();
    }),
  "os.fs.remove": ({ snapshot, rng, state, command }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      if (!state.filesystem.files.some((file) => file.name === command.name)) {
        return transaction.reject({ code: "os.fs.not_found" });
      }
      transaction.emit({ kind: "os.fs.removed", name: command.name });
      return transaction.complete();
    }),
});
