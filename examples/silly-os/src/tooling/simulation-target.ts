// SPDX-License-Identifier: MIT
import { createInProcessAgentGamePortV1 } from "@sillymaker/base/runtime";

import { createOsApplicationInstanceV1 } from "../application/core-application.ts";

/**
 * `deno task story simulate example-silly-os` 的场景：文件写删、扫雷
 * 开局并翻角格（固定种子下路径确定）、换壁纸。
 */
const scenariosV1 = Object.freeze({
  daily: Object.freeze([
    Object.freeze({ kind: "fs_write" as const, name: "readme.txt", content: "hello from SillyOS" }),
    Object.freeze({ kind: "fs_write" as const, name: "todo.txt", content: "- ship the desktop" }),
    Object.freeze({ kind: "fs_remove" as const, name: "todo.txt" }),
    Object.freeze({ kind: "set_wallpaper" as const, wallpaperId: "dusk" }),
    Object.freeze({ kind: "mine_new" as const, width: 9, height: 9, mines: 10 }),
    Object.freeze({ kind: "mine_reveal" as const, x: 0, y: 0 }),
    Object.freeze({ kind: "mine_flag" as const, x: 8, y: 8 }),
  ]),
});

export async function createOsSimulationTargetV1(options: { readonly seed?: number } = {}) {
  const application = await createOsApplicationInstanceV1(
    options.seed === undefined ? {} : { seeds: [options.seed] },
  );
  const agent = createInProcessAgentGamePortV1({
    identity: Object.freeze({
      storyId: application.storyId,
      storyRevision: application.storyRevision,
    }),
    semantic: application.semantic,
  });
  return Object.freeze({
    agent,
    stateDigest: () => application.admin.stateDigest(),
    dispose: () => application.dispose(),
    defaultScript: scenariosV1.daily,
    scenarios: scenariosV1,
  });
}
