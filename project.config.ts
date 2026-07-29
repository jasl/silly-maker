// SPDX-License-Identifier: MIT
import type { SillymakerWorkspaceConfigV1 } from "@sillymaker/tooling/project/config-types";

/**
 * The workspace registry: each entry is an application project directory
 * that declares itself in its own `sillymaker.config.ts`. This list only
 * feeds repository-level aggregation — `deno task story … <id>` at the
 * root, `check:stories`, runtime asset verification, and the root Vite
 * `--mode <id>` convenience dispatch. Applications build through their own
 * project files; adding one here never edits a build switch.
 *
 * This file stays runtime-dependency-free (type-only imports) because Vite
 * loads it through plain Node without the repository's TypeScript
 * resolution hooks.
 */
export const sillyMakerConfigV1 = {
  projectId: "silly-maker",
  appDirectories: [
    "e2e",
    "template",
    "examples/bookshop",
    "examples/silly-os",
    "examples/cat-cafe",
  ],
} as const satisfies SillymakerWorkspaceConfigV1;
