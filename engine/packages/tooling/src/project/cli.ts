// SPDX-License-Identifier: MIT
import { AuthoringDiagnosticErrorV1 } from "@sillymaker/base";

import type { ProjectModuleLoaderV1 } from "./commands.js";
import {
  checkStoryApplicationV1,
  inspectStoryApplicationV1,
  simulateStoryApplicationV1,
} from "./commands.js";
import type { SillymakerProjectConfigV1 } from "./config.js";
import { listStoryApplicationIdsV1 } from "./config.js";

export interface ProjectCliInputV1 {
  readonly project: SillymakerProjectConfigV1;
  readonly argv: readonly string[];
  readonly loader: ProjectModuleLoaderV1;
  writeOut(line: string): void;
  writeErr(line: string): void;
}

const usageV1 = "usage: story <inspect|check|simulate> <application-id> | story check --all";

function printableV1(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/**
 * Runs one project command and returns the process exit code. Reports are
 * JSON on stdout; failures surface as structured diagnostics, never stacks.
 */
export async function runProjectCliV1(input: ProjectCliInputV1): Promise<number> {
  const [command, selector] = input.argv;
  if (command === undefined || selector === undefined) {
    input.writeErr(usageV1);
    return 2;
  }
  try {
    switch (command) {
      case "inspect": {
        const result = await inspectStoryApplicationV1(input.project, selector, input.loader);
        input.writeOut(printableV1(result));
        return result.kind === "inspected" ? 0 : 1;
      }
      case "check": {
        const applicationIds =
          selector === "--all" ? listStoryApplicationIdsV1(input.project) : [selector];
        const reports = [];
        for (const applicationId of applicationIds) {
          reports.push(await checkStoryApplicationV1(input.project, applicationId, input.loader));
        }
        input.writeOut(printableV1(selector === "--all" ? reports : reports[0]));
        return reports.every((report) => report.ok) ? 0 : 1;
      }
      case "simulate": {
        const report = await simulateStoryApplicationV1(input.project, selector, input.loader);
        input.writeOut(printableV1(report));
        return 0;
      }
      default: {
        input.writeErr(usageV1);
        return 2;
      }
    }
  } catch (error) {
    if (error instanceof AuthoringDiagnosticErrorV1) {
      input.writeOut(printableV1({ kind: "error", diagnostics: error.diagnostics }));
      return 1;
    }
    input.writeErr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
