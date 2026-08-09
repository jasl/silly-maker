// SPDX-License-Identifier: MIT
import type { DeepReadonly } from "@sillymaker/base";

import type {
  ManagedSurfaceCandidateV1,
  ManagedSurfaceOperationV1,
  ManagedSurfacePublicationV1,
  ManagedSurfaceTransitionReceiptV1,
} from "./managed-surface-contracts.ts";
import type { ManagedSurfaceReducerStateV1 } from "./managed-surface-reducer.ts";
import {
  createManagedSurfaceTransientRuntimeKernelInternalV1,
  type ManagedSurfaceRuntimeKernelInternalV1,
  type ManagedSurfaceTransientCandidateRequestInternalV1,
} from "./managed-surface-runtime-kernel.ts";

export interface CreateManagedSurfaceRuntimeAuthorityInputInternalV1 {
  readonly initialState: ManagedSurfaceReducerStateV1;
  readonly reportSubscriberFailure?: () => void;
}

export interface ManagedSurfaceRuntimeAuthorityInternalV1 {
  observeStateInternalV1(): ManagedSurfaceReducerStateV1;
  getTransientPublicationInternalV1(): DeepReadonly<ManagedSurfacePublicationV1>;
  peekTransientCandidateInternalV1(
    input: ManagedSurfaceTransientCandidateRequestInternalV1,
  ): ManagedSurfaceCandidateV1;
  transitionTransientInternalV1(
    operation: ManagedSurfaceOperationV1,
  ): ManagedSurfaceTransitionReceiptV1;
  subscribeInternalV1(listener: () => void): () => void;
}

export interface ManagedSurfaceRuntimeAuthorityBundleInternalV1 {
  readonly authority: ManagedSurfaceRuntimeAuthorityInternalV1;
  readonly kernel: ManagedSurfaceRuntimeKernelInternalV1<ManagedSurfaceReducerStateV1>;
}

function authorityForKernelInternalV1(
  kernel: ManagedSurfaceRuntimeKernelInternalV1<ManagedSurfaceReducerStateV1>,
): ManagedSurfaceRuntimeAuthorityInternalV1 {
  return Object.freeze({
    observeStateInternalV1: kernel.getStateInternalV1,
    getTransientPublicationInternalV1: kernel.getTransientSnapshotInternalV1,
    peekTransientCandidateInternalV1: kernel.peekTransientCandidateInternalV1,
    transitionTransientInternalV1: kernel.transitionTransientInternalV1,
    subscribeInternalV1: kernel.subscribeTransientInternalV1,
  });
}

export function createManagedSurfaceRuntimeAuthorityInternalV1(
  input: CreateManagedSurfaceRuntimeAuthorityInputInternalV1,
): ManagedSurfaceRuntimeAuthorityInternalV1 {
  return createManagedSurfaceRuntimeAuthorityBundleInternalV1(input).authority;
}

export function createManagedSurfaceRuntimeAuthorityBundleInternalV1(
  input: CreateManagedSurfaceRuntimeAuthorityInputInternalV1,
): ManagedSurfaceRuntimeAuthorityBundleInternalV1 {
  const kernel = createManagedSurfaceTransientRuntimeKernelInternalV1(
    input.initialState,
    input.reportSubscriberFailure,
  );
  return Object.freeze({
    authority: authorityForKernelInternalV1(kernel),
    kernel,
  });
}
