// SPDX-License-Identifier: MIT
import type { DeepReadonly } from "@sillymaker/base";

import type { ElectronicPetSimulationTypesV1 } from "../game/kernel.ts";
import { projectElectronicPetInspectorV1 } from "../game/rules.ts";

export type ElectronicPetInspectorProjectionV1 = ReturnType<
  typeof projectElectronicPetInspectorV1
>;

export type ElectronicPetInspectorPublicationV1 =
  | { readonly kind: "detached" }
  | {
    readonly kind: "current";
    readonly revision: number;
    readonly value: ElectronicPetInspectorProjectionV1;
  };

interface ElectronicPetInspectorSessionSourceV1 {
  getCurrentSnapshot(): DeepReadonly<ElectronicPetSimulationTypesV1["snapshot"]>;
  subscribe(listener: () => void): () => void;
}

const detachedPublicationV1 = { kind: "detached" } as const;
const listenersV1 = new Set<() => void>();
let publicationV1: ElectronicPetInspectorPublicationV1 = detachedPublicationV1;
let currentOwnerV1: symbol | null = null;
let revisionV1 = 0;

function notifyV1(): void {
  for (const listener of listenersV1) listener();
}

function publishCurrentV1(
  owner: symbol,
  source: ElectronicPetInspectorSessionSourceV1,
): void {
  if (currentOwnerV1 !== owner) return;
  revisionV1 += 1;
  publicationV1 = {
    kind: "current",
    revision: revisionV1,
    value: projectElectronicPetInspectorV1(
      source.getCurrentSnapshot().state.simulation.pet,
    ),
  };
  notifyV1();
}

/** Product-private, read-only bridge for the same-page embedded Inspector. */
export function bindElectronicPetInspectorSourceV1(
  source: ElectronicPetInspectorSessionSourceV1,
): () => void {
  const owner = Symbol("electronic-pet-inspector-source");
  currentOwnerV1 = owner;
  publishCurrentV1(owner, source);
  const unsubscribe = source.subscribe(() => publishCurrentV1(owner, source));
  return () => {
    unsubscribe();
    if (currentOwnerV1 !== owner) return;
    currentOwnerV1 = null;
    publicationV1 = detachedPublicationV1;
    notifyV1();
  };
}

export const electronicPetInspectorSourceV1 = {
  getSnapshot(): ElectronicPetInspectorPublicationV1 {
    return publicationV1;
  },
  subscribe(listener: () => void): () => void {
    listenersV1.add(listener);
    return () => listenersV1.delete(listener);
  },
};
