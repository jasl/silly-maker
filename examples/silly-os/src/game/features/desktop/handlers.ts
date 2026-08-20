// SPDX-License-Identifier: MIT
// Desktop slice · commands: wallpaper switching. Validation happens at the decision point.
import type { OsCommandHandlerMapV1 } from "../../runtime.ts";
import { transactionRunnerV1 } from "../../runtime.ts";
import { osWallpaperIdsV1 } from "../../state.ts";

export const desktopCommandHandlersV1: Pick<OsCommandHandlerMapV1, "os.desktop.set_wallpaper"> =
  Object.freeze({
    "os.desktop.set_wallpaper": ({ snapshot, rng, command }) =>
      transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        if (!osWallpaperIdsV1.includes(command.wallpaperId as never)) {
          return transaction.reject({ code: "os.desktop.unknown_wallpaper" });
        }
        transaction.emit({
          kind: "os.desktop.wallpaper_changed",
          wallpaperId: command.wallpaperId,
        });
        return transaction.complete();
      }),
  });
