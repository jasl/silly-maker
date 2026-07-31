// SPDX-License-Identifier: MIT
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runSillymakerAppCliV1 } from "@sillymaker/tooling/project";

// The app-local story CLI: inspect/check/simulate/dev/build/desktop against
// this application's own `sillymaker.config.ts`. `.` selects this app:
//
//   deno run -A tools/story.mts check .
//   deno run -A tools/story.mts simulate . --scenario intro
//   deno run -A tools/story.mts build .
process.exitCode = await runSillymakerAppCliV1({
  appRoot: resolve(fileURLToPath(new URL(".", import.meta.url)), ".."),
  argv: process.argv.slice(2),
  writeOut: (line) => console.log(line),
  writeErr: (line) => console.error(line),
});
