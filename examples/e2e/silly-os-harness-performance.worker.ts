// SPDX-License-Identifier: MIT
/// <reference lib="webworker" />

import { createBrowserWorkspaceEnvironmentClientV1 } from "../silly-os/src/agent/browser-workspace-environment-client.ts";
import {
  createBashTool,
  createWriteTool,
} from "../silly-os/src/agent/pi-workspace-runtime-bridge.js";
import {
  bindPiWorkspaceBashToolV1,
  bindPiWorkspaceWriteToolV1,
  createPiWorkspaceGrepToolV1,
} from "../silly-os/src/agent/pi-workspace-tool-binder.ts";
import type { WorkspaceExecutionDescriptorV1 } from "../silly-os/src/workspace/contracts.ts";

const workerScopeV1 = self as unknown as DedicatedWorkerGlobalScope;
const fixtureLineCountV1 = 2_048;
const fixtureMatchStrideV1 = 16;
const fixtureNeedleV1 = "SILLYOS_HARNESS_NEEDLE";
const fixturePathV1 = "harness-perf-fixture.txt";

interface HarnessPerformanceRequestV1 {
  readonly revision: 1;
  readonly kind: "run";
  readonly descriptor: WorkspaceExecutionDescriptorV1;
  readonly sampleCount: number;
}

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

function exactRequestV1(value: unknown): value is HarnessPerformanceRequestV1 {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<HarnessPerformanceRequestV1>;
  return candidate.revision === 1 && candidate.kind === "run" &&
    candidate.descriptor !== undefined && Number.isSafeInteger(candidate.sampleCount) &&
    (candidate.sampleCount ?? 0) > 0 && (candidate.sampleCount ?? 0) <= 20;
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

      const coldBashStartedAt = performance.now();
      await bash.execute("pi.tool.harness-perf.bash.cold", { command: "true" });
      const coldBashTrueMilliseconds = durationV1(coldBashStartedAt);

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
          result.details.truncated !== true ||
          result.details.matches.some((match) => !match.text.includes(fixtureNeedleV1))
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
            warmBashTrueMilliseconds,
            rgMilliseconds,
            structuredGrepMilliseconds,
            cancellationMilliseconds,
            recoveryBashTrueMilliseconds,
          },
          currentGeneration: descriptor.generation,
          mutations: mutationRecords.map((record) => ({
            tool: record.tool,
            outcome: record.outcome,
            effect: record.effect,
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
