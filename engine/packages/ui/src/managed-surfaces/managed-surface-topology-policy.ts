// SPDX-License-Identifier: MIT
import { type NonNegativeSafeInteger, parseNonNegativeSafeInteger } from "@sillymaker/base";

export interface ManagedSurfaceTopologyPolicyRowInternalV1<TSubject extends object> {
  readonly subject: TSubject;
  readonly layerOrder: NonNegativeSafeInteger;
  readonly lifecycle: "preparing" | "ready";
  readonly blocksLower: boolean;
}

export interface ManagedSurfaceTopologyPolicyProjectionInternalV1<TSubject extends object> {
  readonly subject: TSubject;
  readonly phase: "preparing" | "active" | "suspended";
}

/**
 * Applies the shared phase policy to an already-authoritative caller preorder.
 * Subjects remain opaque identities; this leaf never derives an ordering key
 * from their fields or from runtime allocation order.
 */
export function projectManagedSurfaceTopologyPolicyInternalV1<TSubject extends object>(
  rows: readonly ManagedSurfaceTopologyPolicyRowInternalV1<TSubject>[],
): readonly ManagedSurfaceTopologyPolicyProjectionInternalV1<TSubject>[] {
  const seenSubjects = new Set<object>();
  const ordered = rows.map((row, suppliedOrder) => {
    const subject = row.subject;
    const layerOrder = parseNonNegativeSafeInteger(row.layerOrder);
    const lifecycle = row.lifecycle;
    const blocksLower = row.blocksLower;
    if (
      (typeof subject !== "object" || subject === null) &&
      typeof subject !== "function"
    ) {
      throw new TypeError("ui.managed_surface_topology_policy_invalid");
    }
    if (seenSubjects.has(subject)) {
      throw new TypeError("ui.managed_surface_topology_policy_invalid");
    }
    seenSubjects.add(subject);
    if (
      (lifecycle !== "preparing" && lifecycle !== "ready") ||
      typeof blocksLower !== "boolean"
    ) {
      throw new TypeError("ui.managed_surface_topology_policy_invalid");
    }
    return Object.freeze({ subject, suppliedOrder, layerOrder, lifecycle, blocksLower });
  }).sort((left, right) =>
    left.layerOrder - right.layerOrder || left.suppliedOrder - right.suppliedOrder
  );

  let topmostBlockingIndex = -1;
  for (let index = 0; index < ordered.length; index += 1) {
    if (ordered[index]?.blocksLower === true) topmostBlockingIndex = index;
  }

  return Object.freeze(
    ordered.map(({ subject, lifecycle }, index) =>
      Object.freeze({
        subject,
        phase: lifecycle === "preparing"
          ? "preparing" as const
          : topmostBlockingIndex >= 0 && index < topmostBlockingIndex
          ? "suspended" as const
          : "active" as const,
      })
    ),
  );
}
