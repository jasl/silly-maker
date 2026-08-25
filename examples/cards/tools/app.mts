// SPDX-License-Identifier: MIT
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runSillymakerAppCliV1 } from "@sillymaker/tooling/project";

// The app-local lifecycle CLI. Cards has no Story authority, so build/dev/
// prebuilt-smoke/desktop apply while inspect/check/simulate report unconfigured.
// `.` selects this app:
//
//   deno run -A tools/app.mts build .
process.exitCode = await runSillymakerAppCliV1({
  appRoot: resolve(fileURLToPath(new URL(".", import.meta.url)), ".."),
  argv: process.argv.slice(2),
  writeOut: (line) => console.log(line),
  writeErr: (line) => console.error(line),
});
