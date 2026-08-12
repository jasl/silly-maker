// SPDX-License-Identifier: MIT
import type {
  InputActionIdV1,
  WholeCanvasApplicationSourceV1,
  WholeCanvasSurfaceActionAvailabilityV1,
  WholeCanvasSurfaceCatalogEntryV1,
  WholeCanvasSurfaceDefinitionV1,
  WholeCanvasSurfaceRendererPropsV1,
  WholeCanvasSurfaceResolveTargetRequestV1,
  WholeCanvasSurfaceResolvedTargetV1,
  WholeCanvasSurfaceTargetV1,
} from "@sillymaker/ui";
import {
  Button,
  createWholeCanvasApplicationSourceV1,
  defineWholeCanvasSurfaceV1,
  systemInputActionIdsV1,
} from "@sillymaker/ui";
import type { ReactElement } from "react";

import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import { labUiTextV1 } from "./ui-text.ts";

type LabSemanticPublicationV1 = ReturnType<LabApplicationInstanceV1["semantic"]["observe"]>;

export const labWholeCanvasTargetIdsV1 = Object.freeze(
  {
    home: "lab.whole-canvas.home",
    status: "lab.whole-canvas.status",
    storage: "lab.whole-canvas.storage",
    specimenCatalog: "lab.whole-canvas.specimen-catalog",
    specimenDetail: "lab.whole-canvas.specimen-detail",
  } as const,
);

export type LabWholeCanvasTargetIdV1 =
  (typeof labWholeCanvasTargetIdsV1)[keyof typeof labWholeCanvasTargetIdsV1];

export const labWholeCanvasActionIdsV1 = Object.freeze(
  {
    showHome: "lab.whole-canvas.show-home",
    showStatus: "lab.whole-canvas.show-status",
    showStorage: "lab.whole-canvas.show-storage",
    showSpecimenCatalog: "lab.whole-canvas.show-specimen-catalog",
    openSpecimenDetail: "lab.whole-canvas.open-specimen-detail",
  } as const,
);

export type LabWholeCanvasActionIdV1 =
  (typeof labWholeCanvasActionIdsV1)[keyof typeof labWholeCanvasActionIdsV1];

const primaryPlacementV1 = Object.freeze(["primary"] as const);
const detailPlacementV1 = Object.freeze(["detail"] as const);

function catalogRowV1(
  targetId: LabWholeCanvasTargetIdV1,
  placements: typeof primaryPlacementV1 | typeof detailPlacementV1,
  actionIds: readonly LabWholeCanvasActionIdV1[],
): WholeCanvasSurfaceCatalogEntryV1<LabWholeCanvasTargetIdV1, LabWholeCanvasActionIdV1> {
  return Object.freeze({
    targetId,
    contractRevision: 1 as const,
    placements,
    actionIds: Object.freeze([...actionIds]),
    defaultActionId: null,
  });
}

export const labWholeCanvasCatalogV1 = Object.freeze([
  catalogRowV1(labWholeCanvasTargetIdsV1.home, primaryPlacementV1, [
    labWholeCanvasActionIdsV1.showStatus,
    labWholeCanvasActionIdsV1.showStorage,
    labWholeCanvasActionIdsV1.showSpecimenCatalog,
  ]),
  catalogRowV1(labWholeCanvasTargetIdsV1.status, primaryPlacementV1, [
    labWholeCanvasActionIdsV1.showHome,
    labWholeCanvasActionIdsV1.showStorage,
    labWholeCanvasActionIdsV1.showSpecimenCatalog,
  ]),
  catalogRowV1(labWholeCanvasTargetIdsV1.storage, primaryPlacementV1, [
    labWholeCanvasActionIdsV1.showHome,
    labWholeCanvasActionIdsV1.showStatus,
    labWholeCanvasActionIdsV1.showSpecimenCatalog,
  ]),
  catalogRowV1(labWholeCanvasTargetIdsV1.specimenCatalog, primaryPlacementV1, [
    labWholeCanvasActionIdsV1.showHome,
    labWholeCanvasActionIdsV1.showStatus,
    labWholeCanvasActionIdsV1.showStorage,
    labWholeCanvasActionIdsV1.openSpecimenDetail,
  ]),
  catalogRowV1(labWholeCanvasTargetIdsV1.specimenDetail, detailPlacementV1, []),
]);

const emptyParametersV1 = Object.freeze({});
const specimenParametersV1 = Object.freeze({ specimenId: "specimen.alpha" });

function targetV1(
  targetId: LabWholeCanvasTargetIdV1,
): WholeCanvasSurfaceTargetV1<LabWholeCanvasTargetIdV1> {
  return Object.freeze({
    targetId,
    parameters: targetId === labWholeCanvasTargetIdsV1.specimenDetail
      ? specimenParametersV1
      : emptyParametersV1,
  });
}

const targetByActionIdV1 = Object.freeze(
  {
    [labWholeCanvasActionIdsV1.showHome]: targetV1(labWholeCanvasTargetIdsV1.home),
    [labWholeCanvasActionIdsV1.showStatus]: targetV1(labWholeCanvasTargetIdsV1.status),
    [labWholeCanvasActionIdsV1.showStorage]: targetV1(labWholeCanvasTargetIdsV1.storage),
    [labWholeCanvasActionIdsV1.showSpecimenCatalog]: targetV1(
      labWholeCanvasTargetIdsV1.specimenCatalog,
    ),
    [labWholeCanvasActionIdsV1.openSpecimenDetail]: targetV1(
      labWholeCanvasTargetIdsV1.specimenDetail,
    ),
  } satisfies Record<
    LabWholeCanvasActionIdV1,
    WholeCanvasSurfaceTargetV1<LabWholeCanvasTargetIdV1>
  >,
);

const catalogByTargetIdV1 = new Map(
  labWholeCanvasCatalogV1.map((entry) => [entry.targetId, entry] as const),
);

const accessibleNameTextIdByTargetV1 = Object.freeze(
  {
    [labWholeCanvasTargetIdsV1.home]: "text.e2e.lab.whole-canvas.home.title",
    [labWholeCanvasTargetIdsV1.status]: "text.e2e.lab.whole-canvas.status.title",
    [labWholeCanvasTargetIdsV1.storage]: "text.e2e.lab.whole-canvas.storage.title",
    [labWholeCanvasTargetIdsV1.specimenCatalog]: "text.e2e.lab.whole-canvas.specimen-catalog.title",
    [labWholeCanvasTargetIdsV1.specimenDetail]: "text.e2e.lab.whole-canvas.specimen-detail.title",
  } satisfies Record<LabWholeCanvasTargetIdV1, string>,
);

const actionTextIdByActionV1 = Object.freeze(
  {
    [labWholeCanvasActionIdsV1.showHome]: "text.e2e.lab.whole-canvas.show-home",
    [labWholeCanvasActionIdsV1.showStatus]: "text.e2e.lab.whole-canvas.show-status",
    [labWholeCanvasActionIdsV1.showStorage]: "text.e2e.lab.whole-canvas.show-storage",
    [labWholeCanvasActionIdsV1.showSpecimenCatalog]:
      "text.e2e.lab.whole-canvas.show-specimen-catalog",
    [labWholeCanvasActionIdsV1.openSpecimenDetail]:
      "text.e2e.lab.whole-canvas.open-specimen-detail",
  } satisfies Record<LabWholeCanvasActionIdV1, string>,
);

function actionAvailabilityV1(
  actionId: LabWholeCanvasActionIdV1,
): WholeCanvasSurfaceActionAvailabilityV1<
  LabWholeCanvasTargetIdV1,
  LabWholeCanvasActionIdV1
> {
  const target = targetByActionIdV1[actionId];
  return Object.freeze({
    actionId,
    status: "enabled" as const,
    reasonTextIds: Object.freeze([]),
    intent: Object.freeze({
      kind: actionId === labWholeCanvasActionIdsV1.openSpecimenDetail
        ? "open_detail" as const
        : "replace_primary" as const,
      target,
    }),
  });
}

export function resolveLabWholeCanvasTargetV1(
  request: WholeCanvasSurfaceResolveTargetRequestV1<
    LabSemanticPublicationV1,
    LabWholeCanvasTargetIdV1
  >,
): WholeCanvasSurfaceResolvedTargetV1<LabWholeCanvasTargetIdV1, LabWholeCanvasActionIdV1> {
  const catalog = catalogByTargetIdV1.get(request.target.targetId);
  if (catalog === undefined) throw new TypeError("e2e.whole_canvas_target_unknown");
  const targetId = request.target.targetId;
  const view = targetId === labWholeCanvasTargetIdsV1.specimenDetail
    ? Object.freeze({ specimenId: "specimen.alpha" })
    : Object.freeze({ targetId });
  return Object.freeze({
    accessibleNameTextId: accessibleNameTextIdByTargetV1[targetId],
    view,
    actions: Object.freeze(catalog.actionIds.map(actionAvailabilityV1)),
  });
}

export function LabWholeCanvasRendererV1(
  props: WholeCanvasSurfaceRendererPropsV1<
    LabWholeCanvasTargetIdV1,
    LabWholeCanvasActionIdV1
  >,
): ReactElement {
  const detail = props.kind === "detail";
  return (
    <section
      data-lab-whole-canvas={props.target.targetId}
      data-lab-whole-canvas-kind={props.kind}
      style={detail
        ? {
          display: "grid",
          gap: "1rem",
          inlineSize: "min(34rem, 82vi)",
          padding: "2rem",
          border: "2px solid #8ed6ff",
          borderRadius: "1rem",
          background: "#162335",
          color: "#f7fbff",
          boxShadow: "0 1rem 3rem rgb(0 0 0 / 45%)",
        }
        : {
          display: "grid",
          alignContent: "center",
          justifyItems: "center",
          gap: "1.25rem",
          inlineSize: "100%",
          blockSize: "100%",
          padding: "clamp(2rem, 8vi, 8rem)",
          background: "linear-gradient(145deg, #0f1c2d, #1d4260)",
          color: "#f7fbff",
        }}
    >
      <h1>{props.resolveText(accessibleNameTextIdByTargetV1[props.target.targetId])}</h1>
      <p data-lab-whole-canvas-view={JSON.stringify(props.view)}>
        {detail
          ? props.resolveText("text.e2e.lab.whole-canvas.specimen-detail.body")
          : props.resolveText("text.e2e.lab.whole-canvas.primary.body")}
      </p>
      {props.actions.length > 0
        ? (
          <div
            role="group"
            aria-label={props.resolveText("text.e2e.lab.whole-canvas.navigation")}
            style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem" }}
          >
            {props.actions.map((action) => (
              <Button
                key={action.actionId}
                data-managed-surface-action={action.actionId}
                disabled={action.status === "disabled"}
                title={action.reasonTextIds[0] === undefined
                  ? undefined
                  : props.resolveText(action.reasonTextIds[0])}
                onClick={() => props.onAction(action.actionId)}
              >
                {props.resolveText(actionTextIdByActionV1[action.actionId])}
              </Button>
            ))}
          </div>
        )
        : null}
      {detail
        ? (
          <Button data-lab-whole-canvas-back="true" onClick={props.onBack}>
            {props.resolveText("text.e2e.lab.whole-canvas.back")}
          </Button>
        )
        : null}
    </section>
  );
}

export const labWholeCanvasPreparationEventsV1 = Object.freeze(
  {
    hold: "sillymaker:engine-lab:whole-canvas-hold-next",
    ready: "sillymaker:engine-lab:whole-canvas-ready",
    fail: "sillymaker:engine-lab:whole-canvas-fail",
  } as const,
);

type PreparationOutcomeV1 = "ready" | "failed";

interface PendingPreparationV1 {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
  readonly reject: () => void;
}

function pendingPreparationV1(): PendingPreparationV1 {
  let resolve!: () => void;
  let reject!: () => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = () => rejectPromise(new Error("e2e.whole_canvas_preparation_failed"));
  });
  return Object.freeze({ promise, resolve, reject });
}

function LabWholeCanvasLaunchersV1(props: {
  readonly source: WholeCanvasApplicationSourceV1<LabWholeCanvasTargetIdV1>;
  readonly restart: () => Promise<void>;
}): ReactElement {
  const replace = (targetId: LabWholeCanvasTargetIdV1): void => {
    props.source.replacePrimary(targetV1(targetId));
  };
  return (
    <div data-lab-whole-canvas-conformance-launchers="true">
      <Button
        data-lab-whole-canvas-launcher="home"
        onClick={() => replace(labWholeCanvasTargetIdsV1.home)}
      >
        {labUiTextV1("text.e2e.lab.whole-canvas.show-home")}
      </Button>
      <Button
        data-lab-whole-canvas-launcher="status"
        onClick={() => replace(labWholeCanvasTargetIdsV1.status)}
      >
        {labUiTextV1("text.e2e.lab.whole-canvas.show-status")}
      </Button>
      <Button
        data-lab-whole-canvas-launcher="storage"
        onClick={() => replace(labWholeCanvasTargetIdsV1.storage)}
      >
        {labUiTextV1("text.e2e.lab.whole-canvas.show-storage")}
      </Button>
      <Button
        data-lab-whole-canvas-launcher="specimen-catalog"
        onClick={() => replace(labWholeCanvasTargetIdsV1.specimenCatalog)}
      >
        {labUiTextV1("text.e2e.lab.whole-canvas.show-specimen-catalog")}
      </Button>
      <Button
        data-lab-whole-canvas-launcher="close"
        onClick={() => props.source.closePrimary()}
      >
        {labUiTextV1("text.e2e.lab.whole-canvas.close")}
      </Button>
      <Button
        data-lab-whole-canvas-launcher="restart"
        onClick={() => void props.restart()}
      >
        {labUiTextV1("text.e2e.lab.whole-canvas.restart")}
      </Button>
    </div>
  );
}

export const labWholeCanvasKeyboardMapV1 = Object.freeze({
  KeyC: systemInputActionIdsV1.confirm,
  Digit1: labWholeCanvasActionIdsV1.showHome as InputActionIdV1,
  Digit2: labWholeCanvasActionIdsV1.showStatus as InputActionIdV1,
  Digit3: labWholeCanvasActionIdsV1.showStorage as InputActionIdV1,
  Digit4: labWholeCanvasActionIdsV1.showSpecimenCatalog as InputActionIdV1,
});

export interface LabWholeCanvasConformanceV1 {
  readonly definition: WholeCanvasSurfaceDefinitionV1<LabSemanticPublicationV1>;
  renderLaunchers(restart: () => Promise<void>): ReactElement;
  dispose(): void;
}

/**
 * Query-gated Engine Lab rig. The opaque definition owns the one application
 * source; launchers can only issue its narrow replace/close intents.
 */
export function createLabWholeCanvasConformanceV1(input: {
  readonly eventTarget?: EventTarget;
}): LabWholeCanvasConformanceV1 {
  const source = createWholeCanvasApplicationSourceV1(
    targetV1(labWholeCanvasTargetIdsV1.home),
  );
  const eventTarget = input.eventTarget;
  let disposed = false;
  let holdNext = false;
  let queuedOutcome: PreparationOutcomeV1 | null = null;
  let pending: PendingPreparationV1 | null = null;

  const settle = (outcome: PreparationOutcomeV1): void => {
    if (disposed) return;
    if (pending === null) {
      queuedOutcome = outcome;
      return;
    }
    const current = pending;
    pending = null;
    if (outcome === "ready") current.resolve();
    else current.reject();
  };
  const hold = (): void => {
    if (disposed) return;
    if (pending !== null) throw new TypeError("e2e.whole_canvas_preparation_already_pending");
    holdNext = true;
    queuedOutcome = null;
  };
  const ready = (): void => settle("ready");
  const fail = (): void => settle("failed");

  eventTarget?.addEventListener(labWholeCanvasPreparationEventsV1.hold, hold);
  eventTarget?.addEventListener(labWholeCanvasPreparationEventsV1.ready, ready);
  eventTarget?.addEventListener(labWholeCanvasPreparationEventsV1.fail, fail);

  const prepareTarget = (): Promise<void> => {
    if (disposed || !holdNext) return Promise.resolve();
    holdNext = false;
    if (queuedOutcome !== null) {
      const outcome = queuedOutcome;
      queuedOutcome = null;
      return outcome === "ready"
        ? Promise.resolve()
        : Promise.reject(new Error("e2e.whole_canvas_preparation_failed"));
    }
    pending = pendingPreparationV1();
    return pending.promise;
  };

  const definition = defineWholeCanvasSurfaceV1(Object.freeze({
    catalog: labWholeCanvasCatalogV1,
    source,
    resolveTarget: Object.freeze(resolveLabWholeCanvasTargetV1),
    dispatchAction: null,
    renderer: Object.freeze(LabWholeCanvasRendererV1),
    prepareTarget: Object.freeze(prepareTarget),
    resolveText: Object.freeze((_locale: string | null, textId: string) => labUiTextV1(textId)),
  }));

  return Object.freeze({
    definition,
    renderLaunchers: Object.freeze((restart: () => Promise<void>): ReactElement => (
      <LabWholeCanvasLaunchersV1 source={source} restart={restart} />
    )),
    dispose: Object.freeze((): void => {
      if (disposed) return;
      disposed = true;
      eventTarget?.removeEventListener(labWholeCanvasPreparationEventsV1.hold, hold);
      eventTarget?.removeEventListener(labWholeCanvasPreparationEventsV1.ready, ready);
      eventTarget?.removeEventListener(labWholeCanvasPreparationEventsV1.fail, fail);
      const retiredPreparation = pending;
      pending = null;
      queuedOutcome = null;
      holdNext = false;
      retiredPreparation?.resolve();
    }),
  });
}
