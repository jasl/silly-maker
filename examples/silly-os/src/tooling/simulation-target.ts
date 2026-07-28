// SPDX-License-Identifier: MIT
import { createInProcessAgentGamePortV1 } from "@sillymaker/base/runtime";

import { createOsApplicationInstanceV1 } from "../application/core-application.ts";

/**
 * Scenarios for `deno task story simulate example-silly-os`: write/delete files, start
 * minesweeper and reveal a corner (a fixed seed makes the path deterministic), switch wallpaper.
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
