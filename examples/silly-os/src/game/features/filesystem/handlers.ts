// SPDX-License-Identifier: MIT
// Filesystem slice · commands: write/delete (validation in the module owner; this only opens the transaction).
import type { OsCommandHandlerMapV1 } from "../../runtime.ts";
import { transactionRunnerV1 } from "../../runtime.ts";
import { filesystemModuleV1 } from "./module.ts";

export const filesystemCommandHandlersV1: Pick<
  OsCommandHandlerMapV1,
  "os.fs.write" | "os.fs.remove"
> = Object.freeze({
  "os.fs.write": ({ snapshot, rng, command }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      transaction.propose(filesystemModuleV1, {
        kind: "write",
        name: command.name,
        content: command.content,
      });
      return transaction.complete();
    }),
  "os.fs.remove": ({ snapshot, rng, command }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      transaction.propose(filesystemModuleV1, { kind: "remove", name: command.name });
      return transaction.complete();
    }),
});
