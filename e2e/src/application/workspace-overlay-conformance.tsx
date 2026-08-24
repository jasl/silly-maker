// SPDX-License-Identifier: MIT
import type {
  OverlayRendererResolutionV1,
  OverlaySessionStoreV1,
  WorkspaceOverlayDefinitionV1,
} from "@sillymaker/ui";
import { Button, defineWorkspaceOverlayV1 } from "@sillymaker/ui";
import type { ReactElement } from "react";

import { labUiTextV1 } from "./ui-text.ts";

export type LabOverlayConformanceIdV1 =
  | "overlay.lab.conformance.home"
  | "overlay.lab.conformance.alternate"
  | "overlay.lab.conformance.detail"
  | "overlay.lab.conformance.locked";

export const labOverlayConformanceDefinitionsV1: readonly WorkspaceOverlayDefinitionV1<
  LabOverlayConformanceIdV1
>[] = [
  defineWorkspaceOverlayV1({
    id: "overlay.lab.conformance.home",
    contractRevision: 1,
  }),
  defineWorkspaceOverlayV1({
    id: "overlay.lab.conformance.alternate",
    contractRevision: 1,
  }),
  defineWorkspaceOverlayV1({
    id: "overlay.lab.conformance.detail",
    contractRevision: 1,
  }),
  defineWorkspaceOverlayV1({
    id: "overlay.lab.conformance.locked",
    contractRevision: 1,
    dismissible: false,
  }),
];

interface LabOverlayControllerV1 {
  openPrimary(id: LabOverlayConformanceIdV1): unknown;
  pushDetail(id: LabOverlayConformanceIdV1): unknown;
  closeTop(): unknown;
}

export interface LabOverlayConformanceV1 {
  renderLaunchers(
    overlays: LabOverlayControllerV1,
    restart: () => Promise<void>,
  ): ReactElement | null;
  resolve(
    overlayId: string,
    overlays: LabOverlayControllerV1,
  ): OverlayRendererResolutionV1 | null;
  dispose(): void;
}

type PreparationOutcomeV1 = "ready" | "failed";

interface PendingPreparationV1 {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
  readonly reject: () => void;
}

const holdNextEventV1 = "sillymaker:engine-lab:overlay-hold-next";
const readyEventV1 = "sillymaker:engine-lab:overlay-ready";
const failEventV1 = "sillymaker:engine-lab:overlay-fail";

function pendingPreparationV1(): PendingPreparationV1 {
  let resolve!: () => void;
  let reject!: () => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = () => rejectPromise(new Error("e2e.overlay_preparation_failed"));
  });
  return ({ promise, resolve, reject });
}

function ConformanceLaunchersV1(props: {
  readonly overlays: LabOverlayControllerV1;
  readonly restart: () => Promise<void>;
}): ReactElement {
  return (
    <div data-lab-overlay-conformance-launchers="true">
      <Button onClick={() => props.overlays.openPrimary("overlay.lab.conformance.home")}>
        {labUiTextV1("text.e2e.lab.overlay.conformance.home.open")}
      </Button>
      <Button onClick={() => props.overlays.openPrimary("overlay.lab.conformance.alternate")}>
        {labUiTextV1("text.e2e.lab.overlay.conformance.alternate.open")}
      </Button>
      <Button onClick={() => props.overlays.openPrimary("overlay.lab.conformance.locked")}>
        {labUiTextV1("text.e2e.lab.overlay.conformance.locked.open")}
      </Button>
      <Button onClick={() => void props.restart()}>
        {labUiTextV1("text.e2e.lab.overlay.conformance.restart")}
      </Button>
    </div>
  );
}

function resolutionV1(
  overlayId: LabOverlayConformanceIdV1,
  overlays: LabOverlayControllerV1,
  prepare: () => void | PromiseLike<void>,
): OverlayRendererResolutionV1 | null {
  switch (overlayId) {
    case "overlay.lab.conformance.home":
      return ({
        accessibleName: labUiTextV1("text.e2e.lab.overlay.conformance.home.title"),
        content: (
          <section data-lab-overlay-conformance="home">
            <div
              data-lab-overlay-routed-cancel-target="true"
              aria-hidden="true"
              style={{ minBlockSize: "2rem" }}
            />
            <Button
              onClick={() => overlays.pushDetail("overlay.lab.conformance.detail")}
            >
              {labUiTextV1("text.e2e.lab.overlay.conformance.detail.open")}
            </Button>
          </section>
        ),
        prepare,
      });
    case "overlay.lab.conformance.alternate":
      return ({
        accessibleName: labUiTextV1("text.e2e.lab.overlay.conformance.alternate.title"),
        content: (
          <section data-lab-overlay-conformance="alternate">
            <Button
              onClick={() => overlays.pushDetail("overlay.lab.conformance.detail")}
            >
              {labUiTextV1("text.e2e.lab.overlay.conformance.detail.open")}
            </Button>
          </section>
        ),
        prepare,
      });
    case "overlay.lab.conformance.detail":
      return ({
        accessibleName: labUiTextV1("text.e2e.lab.overlay.conformance.detail.title"),
        content: (
          <section data-lab-overlay-conformance="detail">
            <Button onClick={() => undefined}>
              {labUiTextV1("text.e2e.lab.overlay.conformance.detail.action")}
            </Button>
          </section>
        ),
        prepare,
      });
    case "overlay.lab.conformance.locked":
      return ({
        accessibleName: labUiTextV1("text.e2e.lab.overlay.conformance.locked.title"),
        content: (
          <section data-lab-overlay-conformance="locked">
            <div
              data-lab-overlay-routed-cancel-target="true"
              aria-hidden="true"
              style={{ minBlockSize: "2rem" }}
            />
            <Button onClick={() => overlays.closeTop()}>
              {labUiTextV1("text.e2e.lab.overlay.conformance.locked.complete")}
            </Button>
          </section>
        ),
        prepare,
      });
  }
  return null;
}

/**
 * Browser-only neutral control over renderer readiness. Events settle only
 * the renderer Promise; the Host owns the bound readiness receipt and the
 * Coordinator remains the sole topology authority.
 */
export function createLabOverlayConformanceV1(input: {
  readonly enabled: boolean;
  readonly eventTarget?: Window;
}): LabOverlayConformanceV1 {
  const eventTarget = input.enabled ? input.eventTarget : undefined;
  let holdNext = false;
  let queuedOutcome: PreparationOutcomeV1 | null = null;
  let pending: PendingPreparationV1 | null = null;

  const settleV1 = (outcome: PreparationOutcomeV1): void => {
    if (pending === null) {
      queuedOutcome = outcome;
      return;
    }
    const current = pending;
    pending = null;
    if (outcome === "ready") current.resolve();
    else current.reject();
  };
  const holdV1 = (): void => {
    if (pending !== null) throw new TypeError("e2e.overlay_preparation_already_pending");
    holdNext = true;
    queuedOutcome = null;
  };
  const readyV1 = (): void => settleV1("ready");
  const failV1 = (): void => settleV1("failed");

  eventTarget?.addEventListener(holdNextEventV1, holdV1);
  eventTarget?.addEventListener(readyEventV1, readyV1);
  eventTarget?.addEventListener(failEventV1, failV1);

  const prepareV1 = (): void | PromiseLike<void> => {
    if (!holdNext) return;
    holdNext = false;
    if (queuedOutcome !== null) {
      const outcome = queuedOutcome;
      queuedOutcome = null;
      if (outcome === "failed") return Promise.reject(new Error("e2e.overlay_preparation_failed"));
      return;
    }
    pending = pendingPreparationV1();
    return pending.promise;
  };

  return ({
    renderLaunchers(overlays: LabOverlayControllerV1, restart: () => Promise<void>) {
      return input.enabled
        ? <ConformanceLaunchersV1 overlays={overlays} restart={restart} />
        : null;
    },
    resolve(overlayId: string, overlays: LabOverlayControllerV1) {
      if (!input.enabled || !overlayId.startsWith("overlay.lab.conformance.")) return null;
      return resolutionV1(overlayId as LabOverlayConformanceIdV1, overlays, prepareV1);
    },
    dispose(): void {
      eventTarget?.removeEventListener(holdNextEventV1, holdV1);
      eventTarget?.removeEventListener(readyEventV1, readyV1);
      eventTarget?.removeEventListener(failEventV1, failV1);
      pending = null;
      queuedOutcome = null;
      holdNext = false;
    },
  });
}

export function asLabOverlayControllerV1<TOverlayId extends string>(
  overlays: OverlaySessionStoreV1<TOverlayId>,
): LabOverlayControllerV1 {
  return ({
    openPrimary: (id: LabOverlayConformanceIdV1) => overlays.openPrimary(id as TOverlayId),
    pushDetail: (id: LabOverlayConformanceIdV1) => overlays.pushDetail(id as TOverlayId),
    closeTop: () => overlays.closeTop(),
  });
}
