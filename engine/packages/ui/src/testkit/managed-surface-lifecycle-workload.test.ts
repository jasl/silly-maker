// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  managedSurfaceLifecycleParameterClassesV1,
  managedSurfaceLifecycleScenarioClassesV1,
  managedSurfaceLifecycleTargetCountsV1,
  prepareManagedSurfaceLifecycleWorkloadV1,
} from "./managed-surface-lifecycle-workload.ts";

describe("managed surface lifecycle performance workload", () => {
  it("covers the frozen target, parameter, and publication scenario matrix", () => {
    const observed = [];
    for (const targetCount of managedSurfaceLifecycleTargetCountsV1) {
      for (const parameterClass of managedSurfaceLifecycleParameterClassesV1) {
        for (const scenarioClass of managedSurfaceLifecycleScenarioClassesV1) {
          let now = 10;
          const workload = prepareManagedSurfaceLifecycleWorkloadV1({
            targetCount,
            parameterClass,
            scenarioClass,
            now: () => {
              const current = now;
              now += 0.5;
              return current;
            },
          });
          const run = workload.runOnce();
          expect(run.durationMs).toBe(0.5);
          expect(workload.descriptor).toEqual({
            workloadId: `stable-publication/${scenarioClass}/${parameterClass}/${
              String(targetCount)
            }`,
            targetCount,
            parameterClass,
            scenarioClass,
            measuredScope: "admission_and_atomic_apply",
          });
          if (scenarioClass === "equal_noop") {
            expect(run.semantic).toEqual({
              resultKind: "unchanged",
              resultCode: "surface.stable_publication_unchanged",
              sourceDelta: "unchanged",
              runtimeDelta: "unchanged",
              notificationCount: 0,
              runtimeAllocationHint: "zero",
              preparingTargetCount: targetCount,
            });
          } else if (scenarioClass === "empty") {
            expect(run.semantic).toEqual({
              resultKind: "applied",
              resultCode: "surface.stable_publication_applied",
              sourceDelta: "accept_empty",
              runtimeDelta: "retire_owned_targets",
              notificationCount: 1,
              runtimeAllocationHint: "zero",
              preparingTargetCount: 0,
            });
          } else {
            expect(run.semantic).toMatchObject({
              resultKind: "applied",
              resultCode: "surface.stable_publication_applied",
              notificationCount: 1,
              runtimeAllocationHint: "preparation_count",
              preparingTargetCount: targetCount,
            });
          }
          observed.push(workload.descriptor.workloadId);
        }
      }
    }
    expect(observed).toHaveLength(30);
    expect(new Set(observed)).toHaveLength(30);
  });

  it("labels semantic preparation counts as hints rather than JavaScript allocations", () => {
    const run = prepareManagedSurfaceLifecycleWorkloadV1({
      targetCount: 1,
      parameterClass: "small",
      scenarioClass: "initial",
    }).runOnce();
    expect(Object.keys(run.semantic)).toEqual([
      "resultKind",
      "resultCode",
      "sourceDelta",
      "runtimeDelta",
      "notificationCount",
      "runtimeAllocationHint",
      "preparingTargetCount",
    ]);
    expect(run.semantic).not.toHaveProperty("allocationCount");
  });
});
