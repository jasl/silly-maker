// SPDX-License-Identifier: MIT
/// <reference lib="webworker" />
// oxlint-disable unicorn/require-post-message-target-origin -- DedicatedWorkerGlobalScope has no targetOrigin argument.

import { createBrowserWorkspaceEnvironmentClientV1 } from "../silly-os/src/agent/browser-workspace-environment-client.ts";
import {
  createBashTool,
  createReadTool,
  createWriteTool,
} from "../silly-os/src/agent/pi-workspace-runtime-bridge.js";
import {
  bindPiWorkspaceBashToolV1,
  bindPiWorkspaceReadToolV1,
  bindPiWorkspaceWriteToolV1,
  createPiWorkspaceGrepToolV1,
} from "../silly-os/src/agent/pi-workspace-tool-binder.ts";
import type { WorkspaceExecutionDescriptorV1 } from "../silly-os/src/workspace/contracts.ts";

const workerScopeV1 = self as unknown as DedicatedWorkerGlobalScope;
const fixtureLineCountV1 = 2_048;
const fixtureMatchStrideV1 = 16;
const fixtureNeedleV1 = "SILLYOS_HARNESS_NEEDLE";
const fixturePathV1 = "harness-perf-fixture.txt";
const quickJsScriptPathV1 = "harness-qjs.js";
const quickJsInputPathV1 = "harness-qjs-input.txt";
const quickJsOutputPathV1 = "harness-qjs-output.txt";
const quickJsInfinitePathV1 = "harness-qjs-infinite.js";
const quickJsRecoveryPathV1 = "harness-qjs-recovery.js";
const quickJsRecoveryOutputPathV1 = "harness-qjs-recovered.txt";

interface HarnessPerformanceRequestV1 {
  readonly revision: 1;
  readonly kind: "run";
  readonly descriptor: WorkspaceExecutionDescriptorV1;
  readonly sampleCount: number;
}

interface HarnessPersistenceVerificationRequestV1 {
  readonly revision: 1;
  readonly kind: "verify_persistence";
  readonly descriptor: WorkspaceExecutionDescriptorV1;
  readonly expectedFiles: readonly Readonly<{ path: string; text: string }>[];
}

type HarnessRequestV1 = HarnessPerformanceRequestV1 | HarnessPersistenceVerificationRequestV1;

interface ResourceTimingV1 {
  readonly name: string;
  readonly durationMilliseconds: number;
  readonly transferBytes: number;
  readonly encodedBytes: number;
  readonly decodedBytes: number;
}

function createFixtureV1(): string {
  return Array.from({ length: fixtureLineCountV1 }, (_, index) => {
    const marker = index % fixtureMatchStrideV1 === 0 ? fixtureNeedleV1 : "ordinary";
    return `${index.toString().padStart(4, "0")}|${marker}|bounded workspace harness payload`;
  }).join("\n") + "\n";
}

function durationV1(startedAt: number): number {
  return performance.now() - startedAt;
}

function resourceTimingsV1(): readonly ResourceTimingV1[] {
  return performance.getEntriesByType("resource").slice(0, 256).map((entry) => {
    const resource = entry as PerformanceResourceTiming;
    return {
      name: resource.name,
      durationMilliseconds: resource.duration,
      transferBytes: resource.transferSize,
      encodedBytes: resource.encodedBodySize,
      decodedBytes: resource.decodedBodySize,
    };
  });
}

function textFromToolResultV1(result: unknown): string {
  if (result === null || typeof result !== "object") return "";
  const content = Reflect.get(result, "content");
  if (!Array.isArray(content)) return "";
  return content.flatMap((part) => {
    if (part === null || typeof part !== "object" || Reflect.get(part, "type") !== "text") {
      return [];
    }
    const text = Reflect.get(part, "text");
    return typeof text === "string" ? [text] : [];
  }).join("\n");
}

function exactRequestV1(value: unknown): value is HarnessRequestV1 {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<HarnessRequestV1> & {
    readonly sampleCount?: unknown;
    readonly expectedFiles?: unknown;
  };
  if (candidate.revision !== 1 || candidate.descriptor === undefined) return false;
  if (candidate.kind === "run") {
    return Number.isSafeInteger(candidate.sampleCount) &&
      (candidate.sampleCount as number) > 0 && (candidate.sampleCount as number) <= 20;
  }
  if (candidate.kind !== "verify_persistence" || !Array.isArray(candidate.expectedFiles)) {
    return false;
  }
  return candidate.expectedFiles.length > 0 && candidate.expectedFiles.length <= 8 &&
    candidate.expectedFiles.every((file) =>
      file !== null && typeof file === "object" &&
      typeof Reflect.get(file, "path") === "string" &&
      typeof Reflect.get(file, "text") === "string"
    );
}

workerScopeV1.postMessage({ revision: 1, kind: "ready" });

workerScopeV1.addEventListener("message", (event: MessageEvent<unknown>) => {
  const request = event.data;
  const environmentPort = event.ports[0];
  if (!exactRequestV1(request) || environmentPort === undefined) {
    workerScopeV1.postMessage({
      revision: 1,
      kind: "failed",
      message: "invalid harness performance request",
    });
    return;
  }

  void (async () => {
    const client = createBrowserWorkspaceEnvironmentClientV1({
      port: environmentPort,
      descriptor: request.descriptor,
    });
    try {
      const begun = await client.beginAgentRun({
        binding: {
          revision: 1,
          programId: request.descriptor.programId,
          workspaceId: request.descriptor.workspaceId,
          workspaceSessionId: request.descriptor.workspaceSessionId,
          expectedGeneration: request.descriptor.generation,
        },
        piSessionId: `pi-session.harness-perf.${crypto.randomUUID()}`,
        piRunId: `pi-run.harness-perf.${crypto.randomUUID()}`,
      });
      if (begun.kind !== "started") {
        throw new Error(`Workspace harness run was rejected: ${begun.code}`);
      }
      const { run } = begun;
      if (request.kind === "verify_persistence") {
        const read = bindPiWorkspaceReadToolV1(createReadTool(), run);
        for (const expected of request.expectedFiles) {
          const result = await read.execute(
            `pi.tool.harness-perf.read.cold.${expected.path}`,
            { path: expected.path },
          );
          if (textFromToolResultV1(result) !== expected.text) {
            throw new Error(`Cold-reopened Pi read differed for ${expected.path}`);
          }
        }
        const descriptor = client.getDescriptor();
        await run.abortAndDrain();
        workerScopeV1.postMessage({
          revision: 1,
          kind: "verified",
          receipt: {
            generation: descriptor.generation,
            paths: request.expectedFiles.map(({ path }) => path),
          },
        });
        return;
      }
      const write = bindPiWorkspaceWriteToolV1(createWriteTool(), run);
      const bash = bindPiWorkspaceBashToolV1(createBashTool(), run);
      const grep = createPiWorkspaceGrepToolV1(run);
      const fixture = createFixtureV1();
      const fixtureBytes = new TextEncoder().encode(fixture).byteLength;
      if (fixtureBytes > 240 * 1_024) {
        throw new Error("Harness performance fixture exceeded its local 240 KiB bound");
      }

      const fixtureStartedAt = performance.now();
      await write.execute(
        "pi.tool.harness-perf.write.1",
        { path: fixturePathV1, content: fixture },
      );
      const fixtureWriteMilliseconds = durationV1(fixtureStartedAt);

      const quickJsScript = [
        `const input = workspace.readFile("/workspace/${quickJsInputPathV1}");`,
        `workspace.writeFile("/workspace/${quickJsOutputPathV1}", input.toUpperCase() + ":" + argv[0]);`,
        'print("qjs:" + argv[0]);',
      ].join("\n");
      await write.execute(
        "pi.tool.harness-perf.write.qjs-script",
        { path: quickJsScriptPathV1, content: quickJsScript },
      );
      await write.execute(
        "pi.tool.harness-perf.write.qjs-input",
        { path: quickJsInputPathV1, content: "browser harness" },
      );

      const coldBashStartedAt = performance.now();
      await bash.execute("pi.tool.harness-perf.bash.cold", { command: "true" });
      const coldBashTrueMilliseconds = durationV1(coldBashStartedAt);
      const coldBashCompletedEpochMilliseconds = performance.timeOrigin + performance.now();

      const quickJsStartedAt = performance.now();
      const quickJsResult = await bash.execute("pi.tool.harness-perf.bash.qjs", {
        command: `qjs --file ${quickJsInputPathV1} ${quickJsScriptPathV1} QUICKJS_Q1`,
      });
      const quickJsMilliseconds = durationV1(quickJsStartedAt);
      if (!textFromToolResultV1(quickJsResult).includes("qjs:QUICKJS_Q1")) {
        throw new Error("Native Pi bash qjs did not return the exact guest stdout");
      }
      const quickJsOutput = textFromToolResultV1(
        await bash.execute("pi.tool.harness-perf.bash.qjs-read", {
          command: `cat ${quickJsOutputPathV1}`,
        }),
      );
      if (!quickJsOutput.includes("BROWSER HARNESS:QUICKJS_Q1")) {
        throw new Error("Native Pi bash qjs did not commit the exact guest output bytes");
      }

      const warmBashTrueMilliseconds: number[] = [];
      for (let index = 0; index < request.sampleCount; index += 1) {
        const startedAt = performance.now();
        await bash.execute(`pi.tool.harness-perf.bash.warm.${String(index)}`, {
          command: "true",
        });
        warmBashTrueMilliseconds.push(durationV1(startedAt));
      }

      const rgMilliseconds: number[] = [];
      const expectedMatches = fixtureLineCountV1 / fixtureMatchStrideV1;
      for (let index = 0; index < request.sampleCount; index += 1) {
        const startedAt = performance.now();
        const result = await bash.execute(`pi.tool.harness-perf.bash.rg.${String(index)}`, {
          command: `rg -n ${fixtureNeedleV1} ${fixturePathV1}`,
        });
        rgMilliseconds.push(durationV1(startedAt));
        const output = textFromToolResultV1(result);
        const matches = output.split("\n").filter((line) => line.includes(fixtureNeedleV1));
        if (matches.length !== expectedMatches) {
          throw new Error(
            `rg returned ${String(matches.length)} matches, expected ${String(expectedMatches)}`,
          );
        }
      }

      const structuredGrepMilliseconds: number[] = [];
      const structuredGrepLimitV1 = 100;
      for (let index = 0; index < request.sampleCount; index += 1) {
        const startedAt = performance.now();
        const result = await grep.execute(
          `pi.tool.harness-perf.grep.${String(index)}`,
          {
            pattern: fixtureNeedleV1,
            path: fixturePathV1,
            literal: true,
            limit: structuredGrepLimitV1,
          },
        );
        structuredGrepMilliseconds.push(durationV1(startedAt));
        if (
          result.details.matches.length !== structuredGrepLimitV1 ||
          !result.details.truncated ||
          result.details.matches.some((match: { readonly text: string }) =>
            !match.text.includes(fixtureNeedleV1)
          )
        ) {
          throw new Error(
            "Structured grep did not return the expected bounded, truncated match set",
          );
        }
      }

      const cancellation = new AbortController();
      const cancellationStartedAt = performance.now();
      const cancellationTimer = setTimeout(() => cancellation.abort(), 25);
      let cancellationObserved = false;
      try {
        await bash.execute(
          "pi.tool.harness-perf.bash.cancel",
          { command: "sleep 5" },
          cancellation.signal,
        );
      } catch (error) {
        cancellationObserved = error instanceof Error && /abort/iu.test(error.message);
      } finally {
        clearTimeout(cancellationTimer);
      }
      const cancellationMilliseconds = durationV1(cancellationStartedAt);
      if (!cancellationObserved) {
        throw new Error("Native Pi bash did not report the requested cancellation");
      }

      await write.execute(
        "pi.tool.harness-perf.write.qjs-infinite",
        { path: quickJsInfinitePathV1, content: "while (true) {}" },
      );
      const quickJsCancellation = new AbortController();
      const quickJsCancellationStartedAt = performance.now();
      const quickJsCancellationTimer = setTimeout(() => quickJsCancellation.abort(), 100);
      let quickJsCancellationObserved = false;
      try {
        await bash.execute(
          "pi.tool.harness-perf.bash.qjs-cancel",
          { command: `qjs ${quickJsInfinitePathV1}` },
          quickJsCancellation.signal,
        );
      } catch (error) {
        quickJsCancellationObserved = error instanceof Error && /abort/iu.test(error.message);
      } finally {
        clearTimeout(quickJsCancellationTimer);
      }
      const quickJsCancellationMilliseconds = durationV1(quickJsCancellationStartedAt);
      if (!quickJsCancellationObserved) {
        throw new Error("Native Pi bash qjs did not report hard Worker cancellation");
      }

      await write.execute(
        "pi.tool.harness-perf.write.qjs-recovery",
        {
          path: quickJsRecoveryPathV1,
          content: `workspace.writeFile("/workspace/${quickJsRecoveryOutputPathV1}", "recovered");`,
        },
      );
      const quickJsRecoveryStartedAt = performance.now();
      await bash.execute("pi.tool.harness-perf.bash.qjs-recovery", {
        command: `qjs ${quickJsRecoveryPathV1}`,
      });
      const quickJsRecoveryMilliseconds = durationV1(quickJsRecoveryStartedAt);
      const quickJsRecoveryOutput = textFromToolResultV1(
        await bash.execute("pi.tool.harness-perf.bash.qjs-recovery-read", {
          command: `cat ${quickJsRecoveryOutputPathV1}`,
        }),
      );
      if (!quickJsRecoveryOutput.includes("recovered")) {
        throw new Error("Native Pi bash qjs did not recover in a fresh child Worker");
      }

      const recoveryStartedAt = performance.now();
      await bash.execute("pi.tool.harness-perf.bash.recovery", { command: "true" });
      const recoveryBashTrueMilliseconds = durationV1(recoveryStartedAt);

      const descriptor = client.getDescriptor();
      const mutationRecords = client.queryMutationRecords();
      const finalSequence = mutationRecords.at(-1)?.sequence;
      if (finalSequence !== undefined) {
        await client.acknowledgeMutationRecords(finalSequence);
      }
      await run.abortAndDrain();

      workerScopeV1.postMessage({
        revision: 1,
        kind: "completed",
        receipt: {
          fixture: {
            path: fixturePathV1,
            bytes: fixtureBytes,
            lines: fixtureLineCountV1,
            matches: expectedMatches,
            writeMilliseconds: fixtureWriteMilliseconds,
          },
          samples: {
            coldBashTrueMilliseconds,
            coldBashCompletedEpochMilliseconds,
            quickJsMilliseconds,
            warmBashTrueMilliseconds,
            rgMilliseconds,
            structuredGrepMilliseconds,
            cancellationMilliseconds,
            quickJsCancellationMilliseconds,
            quickJsRecoveryMilliseconds,
            recoveryBashTrueMilliseconds,
          },
          currentGeneration: descriptor.generation,
          mutations: mutationRecords.map((record) => ({
            tool: record.tool,
            outcome: record.outcome,
            effect: record.effect,
            changedPaths: record.changedPaths,
          })),
          resources: resourceTimingsV1(),
        },
      });
    } finally {
      client.dispose();
    }
  })().catch((error) => {
    workerScopeV1.postMessage({
      revision: 1,
      kind: "failed",
      message: error instanceof Error ? error.message : String(error),
    });
  });
}, { once: true });
