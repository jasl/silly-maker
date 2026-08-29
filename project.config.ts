// SPDX-License-Identifier: MIT
import type { SillymakerWorkspaceConfigV1 } from "@sillymaker/tooling/project/config-types";

/**
 * The workspace registry: each entry is an application project directory
 * that declares itself in its own `sillymaker.config.ts`. This list only
 * feeds repository-level aggregation — `deno task app … <id>` at the root,
 * runtime asset verification, and the explicit root Vite `--mode <id>` test
 * dispatch. Applications build through their own
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
    "examples/vn-last-sound-check",
    "examples/silly-os",
  ],
} as const satisfies SillymakerWorkspaceConfigV1;
