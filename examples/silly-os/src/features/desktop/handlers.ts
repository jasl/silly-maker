// SPDX-License-Identifier: MIT
// 桌面切片·命令：壁纸切换。
import type { OsCommandHandlerMapV1 } from "../../runtime.ts";
import { transactionRunnerV1 } from "../../runtime.ts";
import { desktopModuleV1 } from "./module.ts";

export const desktopCommandHandlersV1: Pick<OsCommandHandlerMapV1, "os.desktop.set_wallpaper"> =
  Object.freeze({
    "os.desktop.set_wallpaper": ({ snapshot, rng, command }) =>
      transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        transaction.propose(desktopModuleV1, {
          kind: "set_wallpaper",
          wallpaperId: command.wallpaperId,
        });
        return transaction.complete();
      }),
  });
