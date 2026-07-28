// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { HostAtomicRecordStoreV1 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";

import { createLabApplicationInstanceV1 } from "../application/core-application.ts";

const collectV1 = Object.freeze({
  kind: "invoke" as const,
  actionId: "lab.collect_sample" as const,
});
const beginV1 = Object.freeze({
  kind: "invoke" as const,
  actionId: "lab.begin_procedure" as const,
});

describe("Engine Lab core application", () => {
  it("composes the whole application from the definition without story-side wiring", async () => {
    const application = await createLabApplicationInstanceV1();

    expect(application.storyId).toBe("story.e2e.engine-lab");
    await expect(application.semantic.dispatch(collectV1)).resolves.toEqual({
      kind: "committed",
    });
    expect(application.semantic.observe().game.samplesCollected).toBeGreaterThan(0);

    const digest = application.admin.stateDigest();
    await expect(application.persistence.save("manual")).resolves.toEqual({
      kind: "saved",
      slotId: "manual",
    });
    await application.semantic.dispatch(collectV1);
    await expect(application.persistence.load("manual")).resolves.toMatchObject({
      kind: "loaded",
    });
    expect(application.admin.stateDigest()).toBe(digest);
    expect(application.presentationAnchor()).toEqual({ epoch: 1, origin: "load" });

    await expect(application.dispose()).resolves.toEqual({ kind: "disposed" });
  });

  it("keeps stale-epoch presentation callbacks away from the current instance", async () => {
    const application = await createLabApplicationInstanceV1();
    let observedByOldEpoch = 0;
    const bound = application.bindToCurrentEpoch(() => {
      observedByOldEpoch += 1;
      return "interaction-resolved";
    });

    await application.persistence.save("manual");
    await application.semantic.dispatch(collectV1);
    await application.persistence.load("manual");

    expect(bound()).toEqual({ kind: "stale_epoch" });
    expect(observedByOldEpoch).toBe(0);
    await application.dispose();
  });

  it("supports a deterministic debounced autosave policy end to end", async () => {
    const flushes: (() => void)[] = [];
    const records = createMemoryHostRecordStoreV1();
    const writes: string[] = [];
    const spyRecords: HostAtomicRecordStoreV1 = {
      read: (namespace, key) => records.read(namespace, key),
      list: (namespace) => records.list(namespace),
      commit: (mutations) => {
        for (const mutation of mutations) {
          if (mutation.kind === "put" && mutation.key.includes(":auto.current")) {
            writes.push(mutation.key);
          }
        }
        return records.commit(mutations);
      },
    };
    const application = await createLabApplicationInstanceV1({
      records: Object.freeze(spyRecords),
      autosave: { mode: "debounced", delayMs: 500 },
      scheduler: Object.freeze({
        schedule(callback: () => void) {
          flushes.push(callback);
          return () => undefined;
        },
      }),
    });

    await application.semantic.dispatch(collectV1);
    await application.semantic.dispatch(beginV1);
    await application.autoSaveIdle();
    expect(writes).toHaveLength(0);

    flushes.at(-1)?.();
    await application.autoSaveIdle();
    expect(writes).toHaveLength(1);

    await application.dispose();
  });
});
