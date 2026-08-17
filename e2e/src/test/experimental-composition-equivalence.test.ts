// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  createCompositionKernelV1,
  createCompositionServiceTokenV1,
  defineCompositionPluginV1,
} from "@sillymaker/composition";
import {
  compileLegacyApplicationFactoryV1,
  defineLegacyApplicationPluginV1,
  defineLegacyApplicationProfileV1,
} from "@sillymaker/composition/legacy";
import type {
  LegacyApplicationFactoryV1,
  LegacyApplicationLeaseV1,
} from "@sillymaker/composition/legacy";

import {
  createLabApplicationInstanceV1,
  type LabApplicationInstanceV1,
} from "../application/core-application.ts";

const collectV1 = Object.freeze({
  kind: "invoke" as const,
  actionId: "lab.collect_sample" as const,
});
const beginV1 = Object.freeze({
  kind: "invoke" as const,
  actionId: "lab.begin_procedure" as const,
});

interface EquivalenceObservationV1 {
  readonly snapshot: unknown;
  readonly stateDigest: string;
  readonly commandLog: unknown;
  readonly replay: unknown;
  readonly saveBytes: Uint8Array;
}

async function observeScenarioV1(
  application: LabApplicationInstanceV1,
): Promise<EquivalenceObservationV1> {
  await expect(application.semantic.dispatch(collectV1)).resolves.toEqual({
    kind: "committed",
  });
  await expect(application.persistence.save("manual.1")).resolves.toEqual({
    kind: "saved",
    slotId: "manual.1",
  });
  await expect(application.semantic.dispatch(beginV1)).resolves.toEqual({
    kind: "committed",
  });
  await expect(application.persistence.load("manual.1")).resolves.toMatchObject({
    kind: "loaded",
  });
  await expect(application.semantic.dispatch(collectV1)).resolves.toEqual({
    kind: "committed",
  });

  const exported = await application.persistence.exportCurrentSave();
  return Object.freeze({
    snapshot: application.admin.inspectForTest().snapshot,
    stateDigest: application.admin.stateDigest(),
    commandLog: application.admin.commandLog(),
    replay: await application.admin.replayAuthoritatively(),
    saveBytes: exported.bytes,
  });
}

function createExperimentalApplicationPluginV1(
  events: string[],
) {
  const factoryToken = createCompositionServiceTokenV1<
    LegacyApplicationFactoryV1<LabApplicationInstanceV1>
  >("e2e.engine-lab.application.factory");
  const applicationPlugin = defineLegacyApplicationPluginV1({
    id: "e2e.engine-lab.application",
    revision: 1,
    factory: factoryToken,
    prepare() {
      events.push("prepare");
    },
    async create() {
      events.push("create");
      return await createLabApplicationInstanceV1();
    },
    async dispose(application) {
      events.push("dispose");
      await application.dispose();
    },
  });
  const markerA = defineCompositionPluginV1({
    id: "e2e.marker.a",
    revision: 1,
    setup() {
      events.push("setup:a");
    },
  });
  const markerB = defineCompositionPluginV1({
    id: "e2e.marker.b",
    revision: 1,
    setup() {
      events.push("setup:b");
    },
  });
  return Object.freeze({ factoryToken, applicationPlugin, markerA, markerB });
}

describe("experimental Cordis composition equivalence", () => {
  it("keeps the legacy application path byte-equivalent without hot-path activation", async () => {
    const direct = await createLabApplicationInstanceV1();
    const directObservation = await observeScenarioV1(direct);

    const events: string[] = [];
    const fixture = createExperimentalApplicationPluginV1(events);
    const kernel = createCompositionKernelV1();
    const snapshot = await kernel.mount(defineLegacyApplicationProfileV1({
      id: "e2e.engine-lab",
      application: fixture.applicationPlugin,
      plugins: [fixture.markerB, fixture.markerA],
    }));
    expect(events).toEqual(["prepare", "setup:a", "setup:b"]);

    const factory = compileLegacyApplicationFactoryV1(
      snapshot,
      fixture.factoryToken,
    );
    const lease: LegacyApplicationLeaseV1<LabApplicationInstanceV1> = await factory.create();
    expect(events).toEqual(["prepare", "setup:a", "setup:b", "create"]);

    const composedObservation = await observeScenarioV1(lease.application);
    expect(events).toEqual(["prepare", "setup:a", "setup:b", "create"]);
    expect(composedObservation.snapshot).toEqual(directObservation.snapshot);
    expect(composedObservation.stateDigest).toBe(directObservation.stateDigest);
    expect(composedObservation.commandLog).toEqual(directObservation.commandLog);
    expect(composedObservation.replay).toEqual(directObservation.replay);
    expect(composedObservation.saveBytes).toEqual(directObservation.saveBytes);

    await kernel.dispose();
    expect(events).toEqual([
      "prepare",
      "setup:a",
      "setup:b",
      "create",
      "dispose",
    ]);
    await direct.dispose();
  });

  it("keeps authoritative boot identity independent of plugin declaration order", async () => {
    const firstEvents: string[] = [];
    const first = createExperimentalApplicationPluginV1(firstEvents);
    const firstKernel = createCompositionKernelV1();
    const firstSnapshot = await firstKernel.mount(defineLegacyApplicationProfileV1({
      id: "e2e.engine-lab.identity",
      application: first.applicationPlugin,
      plugins: [first.markerA, first.markerB],
    }));

    const secondEvents: string[] = [];
    const second = createExperimentalApplicationPluginV1(secondEvents);
    const secondKernel = createCompositionKernelV1();
    const secondSnapshot = await secondKernel.mount(defineLegacyApplicationProfileV1({
      id: "e2e.engine-lab.identity",
      application: second.applicationPlugin,
      plugins: [second.markerB, second.markerA],
    }));

    expect(secondSnapshot.bootDiagnostic).toEqual(firstSnapshot.bootDiagnostic);
    expect(firstEvents).toEqual(["prepare", "setup:a", "setup:b"]);
    expect(secondEvents).toEqual(firstEvents);

    await firstKernel.dispose();
    await secondKernel.dispose();
  });
});
