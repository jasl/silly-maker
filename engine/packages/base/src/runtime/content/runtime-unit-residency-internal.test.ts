// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  createRuntimeUnitResidencyInternalV1,
  RuntimeUnitResidencyStaleErrorInternalV1,
} from "./runtime-unit-residency-internal.ts";

function deferredV1<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("runtime unit residency internal", () => {
  it("single-flights one unit and gives every acquisition an independent lease", async () => {
    const loaded = deferredV1<string>();
    const admitted = deferredV1<{ readonly admitted: string }>();
    const activated = deferredV1<{ readonly value: string }>();
    const load = vi.fn(() => loaded.promise);
    const admit = vi.fn(() => admitted.promise);
    const activate = vi.fn(() => activated.promise);
    const disposePlan = vi.fn();
    let timestamp = 0;
    const residency = createRuntimeUnitResidencyInternalV1<`scene.${string}`, {
      readonly value: string;
    }>({
      generation: "sha256:generation-a",
      now: () => timestamp,
      disposePlan,
    });

    const first = residency.acquire("scene.opening", { load, admit, activate });
    const second = residency.acquire("scene.opening", {
      load: vi.fn(async () => "must-not-load"),
      admit: vi.fn((value) => ({ admitted: value })),
      activate: vi.fn((value) => ({ value: value.admitted })),
    });
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());

    timestamp = 5;
    loaded.resolve("source");
    await vi.waitFor(() => expect(admit).toHaveBeenCalledWith("source"));
    timestamp = 7;
    const admittedSource = { admitted: "source" } as const;
    admitted.resolve(admittedSource);
    await vi.waitFor(() => expect(activate).toHaveBeenCalledWith(admittedSource));
    timestamp = 9;
    const plan = { value: "compiled" } as const;
    activated.resolve(plan);

    const [firstLease, secondLease] = await Promise.all([first, second]);
    expect(load).toHaveBeenCalledOnce();
    expect(firstLease).not.toBe(secondLease);
    expect(firstLease.plan).toBe(plan);
    expect(secondLease.plan).toBe(plan);
    expect(firstLease.generation).toBe("sha256:generation-a");
    expect(firstLease.timing).toEqual({
      loadMs: 5,
      admitMs: 2,
      activateMs: 2,
      totalMs: 9,
    });
    expect(residency.getResident("scene.opening")).toEqual({
      unitId: "scene.opening",
      generation: "sha256:generation-a",
      plan,
      timing: { loadMs: 5, admitMs: 2, activateMs: 2, totalMs: 9 },
    });

    firstLease.release();
    firstLease.release();
    expect(residency.getResident("scene.opening")?.plan).toBe(plan);
    expect(disposePlan).not.toHaveBeenCalled();

    secondLease.release();
    secondLease.release();
    expect(residency.getResident("scene.opening")).toBeNull();
    expect(disposePlan).toHaveBeenCalledOnce();
    expect(disposePlan).toHaveBeenCalledWith("scene.opening", plan);
  });

  it("removes only the failed exact flight so retry succeeds without disturbing a predecessor", async () => {
    const residency = createRuntimeUnitResidencyInternalV1<string, { readonly value: string }>({
      generation: "generation-b",
    });
    const predecessor = await residency.acquire("scene.predecessor", {
      load: async () => "predecessor-source",
      admit: (value) => ({ admitted: value }),
      activate: (value) => ({ value: value.admitted }),
    });
    const firstFailure = new Error("transient admission failure");
    const loadCandidate = vi.fn(async () => "candidate-source");
    const admitCandidate = vi.fn()
      .mockRejectedValueOnce(firstFailure)
      .mockResolvedValueOnce({ admitted: "candidate-source" });
    const activateCandidate = vi.fn((value: { readonly admitted: string }) => ({
      value: value.admitted,
    }));

    const first = residency.acquire("scene.candidate", {
      load: loadCandidate,
      admit: admitCandidate,
      activate: activateCandidate,
    });
    const joined = residency.acquire("scene.candidate", {
      load: vi.fn(async () => "must-not-load"),
      admit: vi.fn((value) => ({ admitted: value })),
      activate: vi.fn((value) => ({ value: value.admitted })),
    });
    await expect(first).rejects.toBe(firstFailure);
    await expect(joined).rejects.toBe(firstFailure);
    expect(loadCandidate).toHaveBeenCalledOnce();
    expect(admitCandidate).toHaveBeenCalledOnce();
    expect(activateCandidate).not.toHaveBeenCalled();
    expect(residency.getResident("scene.predecessor")?.plan).toBe(predecessor.plan);
    expect(residency.getResident("scene.candidate")).toBeNull();

    const retry = await residency.acquire("scene.candidate", {
      load: loadCandidate,
      admit: admitCandidate,
      activate: activateCandidate,
    });
    expect(loadCandidate).toHaveBeenCalledTimes(2);
    expect(admitCandidate).toHaveBeenCalledTimes(2);
    expect(activateCandidate).toHaveBeenCalledOnce();
    expect(retry.plan).toEqual({ value: "candidate-source" });
    expect(residency.getResident("scene.predecessor")?.plan).toBe(predecessor.plan);

    predecessor.release();
    retry.release();
  });

  it("disposal rejects a load that settles late and prevents activation or later acquire", async () => {
    const loaded = deferredV1<string>();
    const activate = vi.fn((value: string) => ({ value }));
    const residency = createRuntimeUnitResidencyInternalV1<string, { readonly value: string }>({
      generation: "generation-c",
    });
    const acquire = residency.acquire("gui.settings", {
      load: () => loaded.promise,
      admit: (value) => value,
      activate,
    });
    await Promise.resolve();

    residency.dispose();
    loaded.resolve("source");
    await expect(acquire).rejects.toEqual(
      new RuntimeUnitResidencyStaleErrorInternalV1("gui.settings", "generation-c"),
    );
    expect(activate).not.toHaveBeenCalled();
    expect(residency.getResident("gui.settings")).toBeNull();

    const neverLoad = vi.fn(async () => "source");
    await expect(
      residency.acquire("gui.settings", {
        load: neverLoad,
        admit: (value) => value,
        activate,
      }),
    ).rejects.toBeInstanceOf(RuntimeUnitResidencyStaleErrorInternalV1);
    expect(neverLoad).not.toHaveBeenCalled();
  });

  it("disposes an activated late candidate without committing it", async () => {
    const activation = deferredV1<{ readonly value: string }>();
    const activate = vi.fn(() => activation.promise);
    const disposePlan = vi.fn();
    const residency = createRuntimeUnitResidencyInternalV1<string, { readonly value: string }>({
      generation: "generation-d",
      disposePlan,
    });
    const acquire = residency.acquire("gui.conversation", {
      load: async () => "source",
      admit: (value) => ({ admitted: value }),
      activate,
    });
    await vi.waitFor(() => expect(activate).toHaveBeenCalledOnce());

    residency.dispose();
    const plan = { value: "late" } as const;
    activation.resolve(plan);
    await expect(acquire).rejects.toBeInstanceOf(RuntimeUnitResidencyStaleErrorInternalV1);
    expect(residency.getResident("gui.conversation")).toBeNull();
    expect(disposePlan).toHaveBeenCalledOnce();
    expect(disposePlan).toHaveBeenCalledWith("gui.conversation", plan);
  });

  it("dispose retires all residents and leaves their outstanding leases idempotent", async () => {
    const disposePlan = vi.fn();
    const residency = createRuntimeUnitResidencyInternalV1<string, string>({
      generation: "generation-e",
      disposePlan,
    });
    const left = await residency.acquire("unit.left", {
      load: async () => "left",
      admit: (value) => value,
      activate: (value) => value,
    });
    const right = await residency.acquire("unit.right", {
      load: async () => "right",
      admit: (value) => value,
      activate: (value) => value,
    });

    residency.dispose();
    residency.dispose();
    expect(residency.getResident("unit.left")).toBeNull();
    expect(residency.getResident("unit.right")).toBeNull();
    expect(disposePlan.mock.calls).toEqual([
      ["unit.left", "left"],
      ["unit.right", "right"],
    ]);

    left.release();
    left.release();
    right.release();
    right.release();
    expect(disposePlan).toHaveBeenCalledTimes(2);
  });
});
