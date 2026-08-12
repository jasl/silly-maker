// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { act, cleanup as cleanupRender, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  inputIgnoredV1,
  parseInputActionIdV1,
  type InputEventV1,
  type InputRouterV1,
} from "../input/contracts.ts";
import {
  createManagedSurfaceCompositeKernelBundleInternalV1,
  type ManagedSurfaceCompositeKernelBundleInternalV1,
} from "../managed-surfaces/managed-surface-composite-kernel-bundle.ts";
import type { ManagedSurfaceCoordinatorRuntimeV1 } from "../managed-surfaces/managed-surface-coordinator-lifetime.ts";
import type {
  WholeCanvasManagedSurfaceResolveTargetRequestInternalV1,
  WholeCanvasManagedSurfaceRootDesiredInternalV1,
} from "./whole-canvas-managed-surface-session.ts";
import {
  bindWholeCanvasSurfaceCompositionPrivateMetadataInternalV1,
  claimWholeCanvasSurfaceHostedAdapterInternalV1,
  createWholeCanvasApplicationSourceV1,
  createWholeCanvasSurfaceCompositionDefinitionInternalV1,
  createWholeCanvasSurfaceCompositionRuntimeInternalV1,
  defineWholeCanvasSurfaceV1,
  resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1,
  resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1,
  type DefineWholeCanvasSurfaceInputV1,
  type WholeCanvasSurfaceRendererPropsV1,
  type WholeCanvasSurfaceSourceV1,
} from "./whole-canvas-surface-composition.tsx";
import { WholeCanvasSurfaceHostInternalV1 } from "./whole-canvas-surface-host.tsx";

afterEach(cleanupRender);

const primaryActionIdInternalV1 = "test.whole-canvas.activate";

function targetInternalV1(targetId: string) {
  return Object.freeze({ targetId, parameters: Object.freeze({}) });
}

function desiredInternalV1(targetId: string): WholeCanvasManagedSurfaceRootDesiredInternalV1 {
  return Object.freeze({
    bootSplash: null,
    title: null,
    story: Object.freeze({
      sourceKind: "application" as const,
      target: targetInternalV1(targetId),
    }),
  });
}

function resolvedInternalV1(targetId: string) {
  return Object.freeze({
    accessibleNameTextId: `text.${targetId}`,
    view: Object.freeze({ targetId }),
    actions: Object.freeze([Object.freeze({
      actionId: primaryActionIdInternalV1,
      status: "enabled" as const,
      reasonTextIds: Object.freeze([]),
      intent: Object.freeze({ kind: "owner" as const, payload: Object.freeze({}) }),
    })]),
  });
}

function sourceInternalV1(initial: WholeCanvasManagedSurfaceRootDesiredInternalV1 | null) {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const capturedListeners: (() => void)[] = [];
  return Object.freeze({
    getSnapshotInternalV1: () => snapshot,
    subscribeInternalV1(listener: () => void): () => void {
      listeners.add(listener);
      capturedListeners.push(listener);
      return Object.freeze(() => {
        listeners.delete(listener);
      });
    },
    publish(next: WholeCanvasManagedSurfaceRootDesiredInternalV1 | null): void {
      snapshot = next;
      for (const listener of [...listeners]) listener();
    },
    listenerCount: () => listeners.size,
    capturedListeners,
  });
}

function inputRouterInternalV1() {
  const registrations = new Set<Parameters<InputRouterV1["register"]>[0]>();
  const router: InputRouterV1 = Object.freeze({
    register(registration: Parameters<InputRouterV1["register"]>[0]): () => void {
      registrations.add(registration);
      return Object.freeze(() => registrations.delete(registration));
    },
    route(event: InputEventV1) {
      for (const registration of [...registrations].toReversed()) {
        const result = registration.handle(event);
        if (result.kind === "handled") {
          return Object.freeze({ kind: "handled" as const, context: registration.context });
        }
      }
      return inputIgnoredV1;
    },
    clearTransientInput(): void {},
  });
  return Object.freeze({ router, registrationCount: () => registrations.size });
}

function coordinatorRuntimeInternalV1(
  bundle: ManagedSurfaceCompositeKernelBundleInternalV1,
  activationKind: "initial" | "coordinator_successor" = "initial",
): ManagedSurfaceCoordinatorRuntimeV1 {
  return Object.freeze({
    applicationEpoch: bundle.applicationEpoch,
    activationKind,
    coordinator: bundle.coordinator,
    gestureLease: Object.freeze({
      begin: () => {
        throw new TypeError("unused");
      },
      isCurrent: () => false,
      revoke: () => undefined,
    }),
    bindCurrentInput: () => {
      throw new TypeError("unused");
    },
    isIngressOpen: () => true,
  }) as ManagedSurfaceCoordinatorRuntimeV1;
}

function activeHarnessInternalV1(
  reportFailure?: (error: unknown) => void,
  reportActionFailure?: (error: unknown) => void,
) {
  const source = sourceInternalV1(desiredInternalV1("test.whole-canvas.a"));
  const dispatchOwner = vi.fn(() => Promise.resolve());
  const catalog = Object.freeze([
    Object.freeze({
      targetId: "test.whole-canvas.a",
      contractRevision: 1 as const,
      placements: Object.freeze(["primary" as const]),
      actionIds: Object.freeze([primaryActionIdInternalV1]),
      defaultActionId: null,
    }),
    Object.freeze({
      targetId: "test.whole-canvas.b",
      contractRevision: 1 as const,
      placements: Object.freeze(["primary" as const]),
      actionIds: Object.freeze([primaryActionIdInternalV1]),
      defaultActionId: null,
    }),
  ]);
  const definition = createWholeCanvasSurfaceCompositionDefinitionInternalV1(Object.freeze({
    catalog,
    getSnapshotInternalV1: source.getSnapshotInternalV1,
    subscribeInternalV1: source.subscribeInternalV1,
    resolveTargetInternalV1: (request: WholeCanvasManagedSurfaceResolveTargetRequestInternalV1) =>
      resolvedInternalV1(request.target.targetId),
    dispatchOwnerActionInternalV1: dispatchOwner,
    prepareTargetInternalV1: null,
    renderInternalV1: () => null,
  }));
  const family = resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(definition);
  const recipe = Object.freeze({
    resolvedOwnerIds: family.resolvedOwnerIds,
    resolvedSlotDescriptors: family.resolvedSlotDescriptors,
  });
  const bundles = new Map<number, ManagedSurfaceCompositeKernelBundleInternalV1>();
  const createBundle = (applicationEpoch: number) => {
    const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(applicationEpoch),
      recipe,
      definitionSidecars: family.stableDefinitionSidecars,
    }));
    bundles.set(applicationEpoch, bundle);
    return bundle;
  };
  const bundle = createBundle(41);
  const composition = createWholeCanvasSurfaceCompositionRuntimeInternalV1({
    definition,
    resolveKernelBundleInternalV1: (runtime) => bundles.get(runtime.applicationEpoch)!,
    ...(reportFailure === undefined ? {} : { reportFailure }),
    ...(reportActionFailure === undefined ? {} : { reportActionFailure }),
  });
  const attach = (nextBundle: ManagedSurfaceCompositeKernelBundleInternalV1) => {
    const gate = { open: false };
    const runtime = coordinatorRuntimeInternalV1(
      nextBundle,
      nextBundle === bundle ? "initial" : "coordinator_successor",
    );
    composition.prepareRuntimeAttachmentInternalV1(
      runtime,
      Object.freeze({ isOpen: () => gate.open }),
    );
    const notify = composition.activateRuntimeAttachmentInternalV1();
    return Object.freeze({
      runtime,
      open: () => {
        gate.open = true;
        notify();
      },
    });
  };
  const attachment = attach(bundle);
  return Object.freeze({
    source,
    dispatchOwner,
    family,
    bundle,
    composition,
    attachment,
    createBundle,
    attach,
  });
}

const publicActionIdV1 = "test.whole-canvas.public.activate";

function publicTargetV1(targetId = "test.whole-canvas.public-a") {
  return Object.freeze({
    targetId,
    parameters: Object.freeze({ ending: "good" }),
  });
}

function publicCatalogV1() {
  return Object.freeze([
    Object.freeze({
      targetId: "test.whole-canvas.public-a",
      contractRevision: 1 as const,
      placements: Object.freeze(["primary" as const]),
      actionIds: Object.freeze([publicActionIdV1]),
      defaultActionId: null,
    }),
    Object.freeze({
      targetId: "test.whole-canvas.public-b",
      contractRevision: 1 as const,
      placements: Object.freeze(["primary" as const, "detail" as const]),
      actionIds: Object.freeze([publicActionIdV1]),
      defaultActionId: publicActionIdV1,
    }),
    Object.freeze({
      targetId: "test.whole-canvas.public-detail",
      contractRevision: 1 as const,
      placements: Object.freeze(["detail" as const]),
      actionIds: Object.freeze([]),
      defaultActionId: null,
    }),
  ]);
}

function publicDefinitionInputV1(
  source: WholeCanvasSurfaceSourceV1<Readonly<{ readonly ending: string }>, string>,
): DefineWholeCanvasSurfaceInputV1<Readonly<{ readonly ending: string }>, string, string> {
  return Object.freeze({
    catalog: publicCatalogV1(),
    source,
    resolveTarget: Object.freeze(() =>
      Object.freeze({
        accessibleNameTextId: "text.whole-canvas.public",
        view: Object.freeze({}),
        actions: Object.freeze([]),
      })
    ),
    dispatchAction: null,
    renderer: Object.freeze(() => null),
    prepareTarget: null,
    resolveText: Object.freeze((_locale: string | null, textId: string) => textId),
  });
}

describe("S4b.1c WholeCanvas public factories", () => {
  it("creates only the frozen narrow application port and an opaque definition", () => {
    const source = createWholeCanvasApplicationSourceV1(publicTargetV1());
    expect(Object.isFrozen(source)).toBe(true);
    expect(Reflect.ownKeys(source)).toEqual(["replacePrimary", "closePrimary"]);

    source.replacePrimary(publicTargetV1("test.whole-canvas.public-b"));
    const definition = defineWholeCanvasSurfaceV1(publicDefinitionInputV1(source));
    expect(Object.isFrozen(definition)).toBe(true);
    expect(Reflect.ownKeys(definition)).toEqual([]);
  });

  it("descriptor-captures the exact seven-key definition before binding its source", () => {
    const source = createWholeCanvasApplicationSourceV1(publicTargetV1());
    const valid = publicDefinitionInputV1(source);
    const invalidInputs: unknown[] = [
      { ...valid },
      Object.freeze({ ...valid, extra: true }),
      Object.freeze({
        catalog: valid.catalog,
        source: valid.source,
        resolveTarget: valid.resolveTarget,
        dispatchAction: valid.dispatchAction,
        renderer: valid.renderer,
        prepareTarget: valid.prepareTarget,
      }),
      Object.freeze(Object.defineProperty(
        {
          source: valid.source,
          resolveTarget: valid.resolveTarget,
          dispatchAction: valid.dispatchAction,
          renderer: valid.renderer,
          prepareTarget: valid.prepareTarget,
          resolveText: valid.resolveText,
        },
        "catalog",
        { enumerable: true, get: () => valid.catalog },
      )),
      Object.freeze({
        ...valid,
        // oxlint-disable-next-line unicorn/no-thenable -- adversarial definition admission
        renderer: Object.assign(() => null, { then: () => undefined }),
      }),
      Object.freeze({ ...valid, catalog: Object.freeze([]) }),
    ];
    for (const invalid of invalidInputs) {
      expect(() => defineWholeCanvasSurfaceV1(invalid as typeof valid)).toThrowError(
        "ui.whole_canvas_surface_definition_invalid",
      );
    }

    // Every rejected definition leaves the application source retryable.
    expect(() => defineWholeCanvasSurfaceV1(valid)).not.toThrow();
  });

  it("validates the latest unbound target at the final bind and admits bound writes", () => {
    const source = createWholeCanvasApplicationSourceV1(publicTargetV1());
    source.replacePrimary(publicTargetV1("test.whole-canvas.public-detail"));
    expect(() => defineWholeCanvasSurfaceV1(publicDefinitionInputV1(source))).toThrowError(
      "ui.whole_canvas_surface_definition_invalid",
    );
    source.replacePrimary(publicTargetV1("test.whole-canvas.public-b"));
    const definition = defineWholeCanvasSurfaceV1(publicDefinitionInputV1(source));

    expect(() => source.replacePrimary(publicTargetV1("test.whole-canvas.unknown"))).toThrowError(
      "ui.whole_canvas_application_source_target_invalid",
    );
    expect(() => source.replacePrimary(publicTargetV1("test.whole-canvas.public-detail")))
      .toThrowError("ui.whole_canvas_application_source_target_invalid");
    expect(() => source.replacePrimary(publicTargetV1())).not.toThrow();
    expect(() => defineWholeCanvasSurfaceV1(publicDefinitionInputV1(source))).toThrowError(
      "ui.whole_canvas_application_source_binding_conflict",
    );
    expect(Object.isFrozen(definition)).toBe(true);
  });

  it("keeps malformed initial and nonterminal writes synchronous and atomic", () => {
    expect(() =>
      createWholeCanvasApplicationSourceV1({
        targetId: "test.whole-canvas.public-a",
        parameters: Object.freeze({}),
      })
    ).toThrowError("ui.whole_canvas_application_source_target_invalid");

    const source = createWholeCanvasApplicationSourceV1(publicTargetV1());
    defineWholeCanvasSurfaceV1(publicDefinitionInputV1(source));
    const targetWithGetter = Object.freeze(Object.defineProperty(
      {
        parameters: Object.freeze({}),
      },
      "targetId",
      {
        enumerable: true,
        get: () => "test.whole-canvas.public-b",
      },
    ));
    expect(() => source.replacePrimary(targetWithGetter as ReturnType<typeof publicTargetV1>))
      .toThrowError("ui.whole_canvas_application_source_target_invalid");
    expect(() => source.replacePrimary(publicTargetV1("test.whole-canvas.public-b"))).not.toThrow();
  });

  it("captures the exact publication source and reserves a single definition claim", () => {
    const selectPrimary = vi.fn(() => Object.freeze({ primary: publicTargetV1() }));
    const source = Object.freeze({ kind: "publication" as const, selectPrimary });
    const definition = defineWholeCanvasSurfaceV1(publicDefinitionInputV1(source));
    const adapter = claimWholeCanvasSurfaceHostedAdapterInternalV1(definition);
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(Reflect.ownKeys(adapter)).toEqual([
      "familyInternalV1",
      "catalogInternalV1",
      "sourceKindInternalV1",
      "bindPublicationInternalV1",
      "getStoryDesiredInternalV1",
      "subscribeStoryInternalV1",
      "resolveStoryTargetInternalV1",
      "dispatchStoryOwnerActionInternalV1",
      "prepareStoryTargetInternalV1",
      "renderStoryInternalV1",
      "resolveTextInternalV1",
      "bindCompositionDefinitionInternalV1",
      "rollbackClaimInternalV1",
      "terminalizeInternalV1",
    ]);
    expect(adapter.sourceKindInternalV1).toBe("publication");
    expect(adapter.catalogInternalV1).toEqual(publicCatalogV1());
    expect(() => claimWholeCanvasSurfaceHostedAdapterInternalV1(definition)).toThrowError(
      "ui.whole_canvas_application_source_claim_conflict",
    );
    expect(selectPrimary).not.toHaveBeenCalled();
    adapter.rollbackClaimInternalV1();
    expect(() => claimWholeCanvasSurfaceHostedAdapterInternalV1(definition)).not.toThrow();
  });

  it("binds the composed publication once and maps Story resolve, preparation, render, and text", async () => {
    const resolveTarget = vi.fn(() =>
      Object.freeze({
        accessibleNameTextId: "text.whole-canvas.public",
        view: Object.freeze({ screen: "home" }),
        actions: Object.freeze([Object.freeze({
          actionId: publicActionIdV1,
          status: "enabled" as const,
          reasonTextIds: Object.freeze([]),
          intent: Object.freeze({ kind: "back" as const }),
        })]),
      })
    );
    const prepareTarget = vi.fn(() => Promise.resolve());
    const renderer = vi.fn(() => null);
    const resolveText = vi.fn((locale: string | null, textId: string) =>
      `${locale ?? "default"}:${textId}`
    );
    const source = Object.freeze({
      kind: "publication" as const,
      selectPrimary: vi.fn(() => Object.freeze({ primary: publicTargetV1() })),
    });
    const definition = defineWholeCanvasSurfaceV1(Object.freeze({
      ...publicDefinitionInputV1(source),
      resolveTarget,
      renderer,
      prepareTarget,
      resolveText,
    }));
    const adapter = claimWholeCanvasSurfaceHostedAdapterInternalV1(definition);
    const semantic = Object.freeze({ ending: "good" });
    const subscribe = vi.fn(() => Object.freeze(() => undefined));
    adapter.bindPublicationInternalV1(Object.freeze({
      getSnapshotInternalV1: () => Object.freeze({ semantic, locale: "zh-CN" }),
      subscribeInternalV1: subscribe,
    }));

    expect(adapter.getStoryDesiredInternalV1()).toEqual(Object.freeze({
      sourceKind: "publication",
      target: publicTargetV1(),
    }));
    expect(subscribe).not.toHaveBeenCalled();
    expect(adapter.resolveStoryTargetInternalV1(Object.freeze({
      sourceKind: "publication",
      rootKind: "primary",
      placement: "primary",
      target: publicTargetV1(),
    }))).toMatchObject({ accessibleNameTextId: "text.whole-canvas.public" });
    expect(resolveTarget).toHaveBeenCalledWith(Object.freeze({
      publication: semantic,
      placement: "primary",
      target: publicTargetV1(),
    }));

    const entry = Object.freeze({
      rootKind: "primary" as const,
      sourceKind: "publication" as const,
      placement: "primary" as const,
      target: publicTargetV1(),
      resolved: resolveTarget.mock.results[0]!.value,
      frame: Object.freeze({}),
    }) as unknown as Parameters<typeof adapter.prepareStoryTargetInternalV1>[0];
    await expect(adapter.prepareStoryTargetInternalV1(entry, null)).resolves.toBeUndefined();
    expect(prepareTarget).toHaveBeenCalledWith(Object.freeze({
      kind: "primary",
      primary: publicTargetV1(),
    }));
    void adapter.renderStoryInternalV1(
      Object.freeze({
        entry,
        onAction: vi.fn(),
        onBack: vi.fn(),
      }),
      null,
    );
    expect(renderer).not.toHaveBeenCalled();
    expect(adapter.resolveTextInternalV1("text.whole-canvas.public")).toBe(
      "zh-CN:text.whole-canvas.public",
    );
  });

  it("captures the generic private metadata and the adapter combined resolver exactly once", () => {
    const internalDefinition = createWholeCanvasSurfaceCompositionDefinitionInternalV1(
      Object.freeze({
        catalog: publicCatalogV1(),
        getSnapshotInternalV1: () => null,
        subscribeInternalV1: () => Object.freeze(() => undefined),
        resolveTargetInternalV1: () => null,
        dispatchOwnerActionInternalV1: null,
        prepareTargetInternalV1: null,
        renderInternalV1: () => null,
      }),
    );
    expect(() =>
      bindWholeCanvasSurfaceCompositionPrivateMetadataInternalV1(
        internalDefinition,
        Object.freeze({
          resolveTextInternalV1: (textId: string) => `builtin:${textId}`,
          applyAcceptedNavigationInternalV1: () => undefined,
        }),
      )
    ).not.toThrow();
    expect(() =>
      bindWholeCanvasSurfaceCompositionPrivateMetadataInternalV1(
        internalDefinition,
        Object.freeze({
          resolveTextInternalV1: (textId: string) => textId,
          applyAcceptedNavigationInternalV1: () => undefined,
        }),
      )
    ).toThrowError("ui.whole_canvas_surface_private_metadata_invalid");

    const source = createWholeCanvasApplicationSourceV1(publicTargetV1());
    const definition = defineWholeCanvasSurfaceV1(publicDefinitionInputV1(source));
    const adapter = claimWholeCanvasSurfaceHostedAdapterInternalV1(definition);
    adapter.bindPublicationInternalV1(Object.freeze({
      getSnapshotInternalV1: () =>
        Object.freeze({ semantic: Object.freeze({ ending: "good" }), locale: null }),
      subscribeInternalV1: () => Object.freeze(() => undefined),
    }));
    const combined = Object.freeze((textId: string) => `combined:${textId}`);
    const adapterDefinition = createWholeCanvasSurfaceCompositionDefinitionInternalV1(
      Object.freeze({
        catalog: publicCatalogV1(),
        getSnapshotInternalV1: () => null,
        subscribeInternalV1: () => Object.freeze(() => undefined),
        resolveTargetInternalV1: () => null,
        dispatchOwnerActionInternalV1: null,
        prepareTargetInternalV1: null,
        renderInternalV1: () => null,
      }),
    );
    expect(() => adapter.bindCompositionDefinitionInternalV1(adapterDefinition, combined))
      .not.toThrow();
  });

  it("writes only an accepted current application navigation back to the narrow source", () => {
    const navigateActionId = "test.whole-canvas.public.navigate";
    const disabledActionId = "test.whole-canvas.public.disabled";
    const catalog = Object.freeze([
      Object.freeze({
        targetId: "test.whole-canvas.public-a",
        contractRevision: 1 as const,
        placements: Object.freeze(["primary" as const]),
        actionIds: Object.freeze([navigateActionId, disabledActionId]),
        defaultActionId: null,
      }),
      Object.freeze({
        targetId: "test.whole-canvas.public-b",
        contractRevision: 1 as const,
        placements: Object.freeze(["primary" as const]),
        actionIds: Object.freeze([navigateActionId, disabledActionId]),
        defaultActionId: null,
      }),
    ]);
    const source = createWholeCanvasApplicationSourceV1(publicTargetV1());
    const definition = defineWholeCanvasSurfaceV1(Object.freeze({
      ...publicDefinitionInputV1(source),
      catalog,
      resolveTarget: Object.freeze((request: Readonly<{ readonly target: { targetId: string } }>) =>
        Object.freeze({
          accessibleNameTextId: "text.whole-canvas.public",
          view: Object.freeze({ targetId: request.target.targetId }),
          actions: Object.freeze([
            Object.freeze({
              actionId: navigateActionId,
              status: "enabled" as const,
              reasonTextIds: Object.freeze([]),
              intent: Object.freeze({
                kind: "replace_primary" as const,
                target: publicTargetV1(
                  request.target.targetId === "test.whole-canvas.public-a"
                    ? "test.whole-canvas.public-b"
                    : "test.whole-canvas.public-a",
                ),
              }),
            }),
            Object.freeze({
              actionId: disabledActionId,
              status: "disabled" as const,
              reasonTextIds: Object.freeze(["text.whole-canvas.disabled"]),
              intent: Object.freeze({ kind: "close_primary" as const }),
            }),
          ]),
        })
      ),
    }));
    const adapter = claimWholeCanvasSurfaceHostedAdapterInternalV1(definition);
    const upstreamCleanup = vi.fn();
    const upstreamSubscribe = vi.fn(() => Object.freeze(upstreamCleanup));
    adapter.bindPublicationInternalV1(Object.freeze({
      getSnapshotInternalV1: () =>
        Object.freeze({ semantic: Object.freeze({ ending: "good" }), locale: null }),
      subscribeInternalV1: upstreamSubscribe,
    }));
    const internalDefinition = createWholeCanvasSurfaceCompositionDefinitionInternalV1(
      Object.freeze({
        catalog: adapter.catalogInternalV1,
        getSnapshotInternalV1: () =>
          Object.freeze({
            bootSplash: null,
            title: null,
            story: adapter.getStoryDesiredInternalV1(),
          }),
        subscribeInternalV1: adapter.subscribeStoryInternalV1,
        resolveTargetInternalV1: adapter.resolveStoryTargetInternalV1,
        dispatchOwnerActionInternalV1: adapter.dispatchStoryOwnerActionInternalV1,
        prepareTargetInternalV1: null,
        renderInternalV1: (
          props: Parameters<typeof adapter.renderStoryInternalV1>[0],
        ) => adapter.renderStoryInternalV1(props, null),
      }),
    );
    adapter.bindCompositionDefinitionInternalV1(
      internalDefinition,
      Object.freeze((textId: string) => `combined:${textId}`),
    );
    const family = resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(
      internalDefinition,
    );
    const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(63),
      recipe: Object.freeze({
        resolvedOwnerIds: family.resolvedOwnerIds,
        resolvedSlotDescriptors: family.resolvedSlotDescriptors,
      }),
      definitionSidecars: family.stableDefinitionSidecars,
    }));
    const composition = createWholeCanvasSurfaceCompositionRuntimeInternalV1({
      definition: internalDefinition,
      resolveKernelBundleInternalV1: () => bundle,
    });
    const gate = { open: false };
    composition.prepareRuntimeAttachmentInternalV1(
      coordinatorRuntimeInternalV1(bundle),
      Object.freeze({ isOpen: () => gate.open }),
    );
    const publish = composition.activateRuntimeAttachmentInternalV1();
    gate.open = true;
    publish();
    expect(upstreamSubscribe).toHaveBeenCalledTimes(1);

    const host = resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1(
      composition.getCurrentHostBindingInternalV1()!,
    );
    const input = inputRouterInternalV1();
    composition.registerHostPhysicalIngressInternalV1(Object.freeze({
      portalContainer: document.createElement("div"),
      inputRouter: input.router,
    }));
    expect(host.resolveTextInternalV1("text.whole-canvas.public")).toBe(
      "combined:text.whole-canvas.public",
    );
    expect(host.settleReadinessInternalV1(
      host.getSnapshotInternalV1().root.pending!,
      "ready",
    )).toMatchObject({ kind: "applied" });
    const frame = host.getSnapshotInternalV1().root.current!.frame;

    expect(host.dispatchActionInternalV1(frame, disabledActionId)).toMatchObject({
      kind: "rejected",
    });
    expect(adapter.getStoryDesiredInternalV1()?.target.targetId).toBe(
      "test.whole-canvas.public-a",
    );
    expect(host.dispatchActionInternalV1(Object.freeze({ ...frame }), navigateActionId))
      .toMatchObject({ kind: "stale" });
    expect(adapter.getStoryDesiredInternalV1()?.target.targetId).toBe(
      "test.whole-canvas.public-a",
    );
    expect(host.dispatchActionInternalV1(frame, navigateActionId)).toMatchObject({
      kind: "applied",
    });
    expect(adapter.getStoryDesiredInternalV1()?.target.targetId).toBe(
      "test.whole-canvas.public-b",
    );

    composition.disposeInternalV1();
    expect(upstreamCleanup).toHaveBeenCalledTimes(1);
    adapter.terminalizeInternalV1();
    const trappingTarget = new Proxy({} as ReturnType<typeof publicTargetV1>, {
      ownKeys: () => {
        throw new TypeError("must not inspect terminal input");
      },
    });
    expect(() => source.replacePrimary(trappingTarget)).not.toThrow();
    expect(() => source.closePrimary()).not.toThrow();
    expect(() => claimWholeCanvasSurfaceHostedAdapterInternalV1(definition)).toThrowError(
      "ui.whole_canvas_application_source_claim_conflict",
    );
  });

  it("publishes a locale-only refresh to the Host without rotating target identity", async () => {
    const semantic = Object.freeze({ ending: "good" });
    let locale: string | null = "en";
    let publishUpstream: (() => void) | null = null;
    const upstreamCleanup = vi.fn();
    const source = Object.freeze({
      kind: "publication" as const,
      selectPrimary: () => Object.freeze({ primary: publicTargetV1() }),
    });
    const definition = defineWholeCanvasSurfaceV1(Object.freeze({
      ...publicDefinitionInputV1(source),
      resolveTarget: () =>
        Object.freeze({
          accessibleNameTextId: "text.whole-canvas.public",
          view: Object.freeze({ labelTextId: "text.whole-canvas.public" }),
          actions: Object.freeze([Object.freeze({
            actionId: publicActionIdV1,
            status: "enabled" as const,
            reasonTextIds: Object.freeze([]),
            intent: Object.freeze({ kind: "back" as const }),
          })]),
        }),
      renderer: Object.freeze((props: WholeCanvasSurfaceRendererPropsV1<string, string>) => (
        <span
          data-whole-canvas-locale-label="true"
          data-whole-canvas-public-view={JSON.stringify(props.view)}
        >
          {props.resolveText("text.whole-canvas.public")}
        </span>
      )),
      resolveText: Object.freeze((currentLocale: string | null, textId: string) =>
        `${currentLocale ?? "default"}:${textId}`
      ),
    }));
    const adapter = claimWholeCanvasSurfaceHostedAdapterInternalV1(definition);
    adapter.bindPublicationInternalV1(Object.freeze({
      getSnapshotInternalV1: () => Object.freeze({ semantic, locale }),
      subscribeInternalV1(listener: () => void): () => void {
        publishUpstream = listener;
        return Object.freeze(upstreamCleanup);
      },
    }));
    const internalDefinition = createWholeCanvasSurfaceCompositionDefinitionInternalV1(
      Object.freeze({
        catalog: adapter.catalogInternalV1,
        getSnapshotInternalV1: () =>
          Object.freeze({
            bootSplash: null,
            title: null,
            story: adapter.getStoryDesiredInternalV1(),
          }),
        subscribeInternalV1: adapter.subscribeStoryInternalV1,
        resolveTargetInternalV1: adapter.resolveStoryTargetInternalV1,
        dispatchOwnerActionInternalV1: adapter.dispatchStoryOwnerActionInternalV1,
        prepareTargetInternalV1: null,
        renderInternalV1: (
          props: Parameters<typeof adapter.renderStoryInternalV1>[0],
        ) => adapter.renderStoryInternalV1(props, null),
      }),
    );
    adapter.bindCompositionDefinitionInternalV1(
      internalDefinition,
      adapter.resolveTextInternalV1,
    );
    const family = resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(
      internalDefinition,
    );
    const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(64),
      recipe: Object.freeze({
        resolvedOwnerIds: family.resolvedOwnerIds,
        resolvedSlotDescriptors: family.resolvedSlotDescriptors,
      }),
      definitionSidecars: family.stableDefinitionSidecars,
    }));
    const composition = createWholeCanvasSurfaceCompositionRuntimeInternalV1({
      definition: internalDefinition,
      resolveKernelBundleInternalV1: () => bundle,
    });
    const gate = { open: false };
    composition.prepareRuntimeAttachmentInternalV1(
      coordinatorRuntimeInternalV1(bundle),
      Object.freeze({ isOpen: () => gate.open }),
    );
    const publish = composition.activateRuntimeAttachmentInternalV1();
    gate.open = true;
    publish();

    const binding = composition.getCurrentHostBindingInternalV1()!;
    const host = resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1(binding);
    const input = inputRouterInternalV1();
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    composition.registerHostPhysicalIngressInternalV1(Object.freeze({
      portalContainer,
      inputRouter: input.router,
    }));
    const mounted = render(
      <WholeCanvasSurfaceHostInternalV1
        binding={binding}
        portalContainer={portalContainer}
        inputRouter={input.router}
      />,
    );
    await waitFor(() => {
      expect(portalContainer.querySelector('[data-whole-canvas-phase="current"]'))
        .toHaveAttribute("aria-label", "en:text.whole-canvas.public");
      expect(portalContainer.querySelector('[data-whole-canvas-locale-label="true"]'))
        .toHaveTextContent("en:text.whole-canvas.public");
      expect(portalContainer.querySelector('[data-whole-canvas-locale-label="true"]'))
        .toHaveAttribute(
          "data-whole-canvas-public-view",
          '{"labelTextId":"text.whole-canvas.public"}',
        );
    });
    const before = host.getSnapshotInternalV1().root.current!;
    const hostObserver = vi.fn();
    const unsubscribeHost = host.subscribeInternalV1(hostObserver);

    act(() => {
      locale = "zh-CN";
      publishUpstream?.();
    });
    await waitFor(() => {
      expect(portalContainer.querySelector('[data-whole-canvas-phase="current"]'))
        .toHaveAttribute("aria-label", "zh-CN:text.whole-canvas.public");
      expect(portalContainer.querySelector('[data-whole-canvas-locale-label="true"]'))
        .toHaveTextContent("zh-CN:text.whole-canvas.public");
      expect(portalContainer.querySelector('[data-whole-canvas-locale-label="true"]'))
        .toHaveAttribute(
          "data-whole-canvas-public-view",
          '{"labelTextId":"text.whole-canvas.public"}',
        );
    });

    const after = host.getSnapshotInternalV1().root.current!;
    expect(hostObserver).toHaveBeenCalledTimes(1);
    expect(after.target).toEqual(before.target);
    expect(after.frame.primaryTargetOccurrenceId).toBe(before.frame.primaryTargetOccurrenceId);
    expect(after.frame.primaryInstanceId).toBe(before.frame.primaryInstanceId);
    expect(after.frame.sourceRevision).toBe(before.frame.sourceRevision + 1);
    expect(after.frame.surfacePublicationRevision).toBe(
      before.frame.surfacePublicationRevision + 1,
    );
    expect(after.frame.surfaceTopologyRevision).toBe(before.frame.surfaceTopologyRevision);
    expect(after.frame.inputPublicationRevision).toBe(before.frame.inputPublicationRevision);
    expect(host.getSnapshotInternalV1().disposed).toBe(false);

    unsubscribeHost();
    mounted.unmount();
    composition.disposeInternalV1();
    adapter.terminalizeInternalV1();
    portalContainer.remove();
    expect(upstreamCleanup).toHaveBeenCalledTimes(1);
  });

  it("rejects a Story owner intent when its public dispatcher is null", () => {
    const source = Object.freeze({
      kind: "publication" as const,
      selectPrimary: () => Object.freeze({ primary: publicTargetV1() }),
    });
    const definition = defineWholeCanvasSurfaceV1(Object.freeze({
      ...publicDefinitionInputV1(source),
      resolveTarget: () =>
        Object.freeze({
          accessibleNameTextId: "text.whole-canvas.public",
          view: Object.freeze({}),
          actions: Object.freeze([Object.freeze({
            actionId: publicActionIdV1,
            status: "enabled" as const,
            reasonTextIds: Object.freeze([]),
            intent: Object.freeze({
              kind: "owner" as const,
              payload: Object.freeze({ command: "test" }),
            }),
          })]),
        }),
    }));
    const adapter = claimWholeCanvasSurfaceHostedAdapterInternalV1(definition);
    adapter.bindPublicationInternalV1(Object.freeze({
      getSnapshotInternalV1: () =>
        Object.freeze({ semantic: Object.freeze({ ending: "good" }), locale: null }),
      subscribeInternalV1: () => Object.freeze(() => undefined),
    }));
    expect(() =>
      adapter.resolveStoryTargetInternalV1(Object.freeze({
        sourceKind: "publication",
        rootKind: "primary",
        placement: "primary",
        target: publicTargetV1(),
      }))
    ).toThrowError("ui.whole_canvas_surface_resolution_invalid");
  });
});

describe("S4b.1b WholeCanvas composition substrate", () => {
  it("captures one opaque definition and reuses its composition family", () => {
    const harness = activeHarnessInternalV1();
    const first = harness.family;
    const definitionFamily = resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(
      createWholeCanvasSurfaceCompositionDefinitionInternalV1(Object.freeze({
        catalog: first.catalog,
        getSnapshotInternalV1: () => null,
        subscribeInternalV1: () => Object.freeze(() => undefined),
        resolveTargetInternalV1: () => null,
        dispatchOwnerActionInternalV1: null,
        prepareTargetInternalV1: null,
        renderInternalV1: () => null,
      })),
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.stableDefinitionSidecars).not.toBe(definitionFamily.stableDefinitionSidecars);
    expect(first).not.toBe(definitionFamily);
    expect(first.definitions).toEqual(definitionFamily.definitions);
    harness.composition.disposeInternalV1();
  });

  it("keeps the null fourth adapter in every lifecycle with zero bundle or Host allocation", () => {
    const resolveBundle = vi.fn();
    const composition = createWholeCanvasSurfaceCompositionRuntimeInternalV1({
      definition: null,
      resolveKernelBundleInternalV1: resolveBundle,
    });
    expect(composition.isHostEnabledInternalV1()).toBe(false);
    const runtime = Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(9),
      activationKind: "initial" as const,
      coordinator: Object.freeze({}),
      gestureLease: Object.freeze({ begin: vi.fn(), isCurrent: () => false, revoke: vi.fn() }),
      bindCurrentInput: vi.fn(),
      isIngressOpen: () => true,
    }) as unknown as ManagedSurfaceCoordinatorRuntimeV1;
    const gate = { open: false };
    const observer = vi.fn();
    const unsubscribeObserver = composition.subscribeInternalV1(observer);
    composition.prepareRuntimeAttachmentInternalV1(
      runtime,
      Object.freeze({ isOpen: () => gate.open }),
    );
    const notify = composition.activateRuntimeAttachmentInternalV1();
    gate.open = true;
    notify();
    expect(resolveBundle).not.toHaveBeenCalled();
    expect(composition.getCurrentHostBindingInternalV1()).toBeNull();
    composition.detachRuntimeInternalV1();
    composition.disposeInternalV1();
    expect(resolveBundle).not.toHaveBeenCalled();
    expect(observer).not.toHaveBeenCalled();
    unsubscribeObserver();
  });

  it("installs one physical route only at ready commit and fences it on release", () => {
    const harness = activeHarnessInternalV1();
    expect(harness.composition.isHostEnabledInternalV1()).toBe(true);
    harness.attachment.open();
    const binding = harness.composition.getCurrentHostBindingInternalV1()!;
    const host = resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1(binding);
    const input = inputRouterInternalV1();
    const portalContainer = document.createElement("div");
    const release = harness.composition.registerHostPhysicalIngressInternalV1(Object.freeze({
      portalContainer,
      inputRouter: input.router,
    }));
    const pending = host.getSnapshotInternalV1().root.pending!;
    expect(input.router.route(Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1(primaryActionIdInternalV1),
    }))).toEqual({ kind: "handled", context: "whole_canvas" });
    expect(harness.dispatchOwner).not.toHaveBeenCalled();
    expect(host.settleReadinessInternalV1(pending, "ready")).toMatchObject({ kind: "applied" });
    expect(input.router.route(Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1(primaryActionIdInternalV1),
    }))).toEqual({ kind: "handled", context: "whole_canvas" });
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(1);
    release();
    expect(input.registrationCount()).toBe(0);
    expect(input.router.route(Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1(primaryActionIdInternalV1),
    }))).toEqual({ kind: "ignored" });
    harness.composition.disposeInternalV1();
  });

  it("reports one exact synchronous owner-action fault without retiring the current frame", () => {
    const reportFailure = vi.fn((_error: unknown) => {
      throw new Error("hostile failure reporter");
    });
    const genericFailure = vi.fn();
    const harness = activeHarnessInternalV1(genericFailure, reportFailure);
    const ownerFailure = new Error("synchronous owner failure");
    harness.dispatchOwner.mockImplementationOnce(() => {
      throw ownerFailure;
    });
    harness.attachment.open();
    const binding = harness.composition.getCurrentHostBindingInternalV1()!;
    const host = resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1(binding);
    const input = inputRouterInternalV1();
    harness.composition.registerHostPhysicalIngressInternalV1(Object.freeze({
      portalContainer: document.createElement("div"),
      inputRouter: input.router,
    }));
    expect(host.settleReadinessInternalV1(
      host.getSnapshotInternalV1().root.pending!,
      "ready",
    )).toMatchObject({ kind: "applied" });
    const current = host.getSnapshotInternalV1().root.current!;

    expect(host.dispatchActionInternalV1(current.frame, primaryActionIdInternalV1))
      .toMatchObject({ kind: "faulted" });
    expect(reportFailure).toHaveBeenCalledTimes(1);
    expect(genericFailure).not.toHaveBeenCalled();
    expect(reportFailure.mock.calls[0]![0]).toMatchObject({
      name: "TypeError",
      message: "ui.whole_canvas_surface_action_fault",
      cause: ownerFailure,
    });
    expect(host.getSnapshotInternalV1().root.current).toBe(current);
    expect(host.getSnapshotInternalV1().disposed).toBe(false);
    expect(harness.composition.getCurrentHostBindingInternalV1()).toBe(binding);
    expect(host.dispatchActionInternalV1(current.frame, primaryActionIdInternalV1))
      .toMatchObject({ kind: "applied" });
    expect(reportFailure).toHaveBeenCalledTimes(1);

    harness.composition.disposeInternalV1();
  });

  it("reports one exact asynchronous owner-action fault without retiring the current frame", async () => {
    const reportFailure = vi.fn();
    const genericFailure = vi.fn();
    const harness = activeHarnessInternalV1(genericFailure, reportFailure);
    const ownerFailure = new Error("asynchronous owner failure");
    harness.dispatchOwner.mockImplementationOnce(() => Promise.reject(ownerFailure));
    harness.attachment.open();
    const binding = harness.composition.getCurrentHostBindingInternalV1()!;
    const host = resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1(binding);
    const input = inputRouterInternalV1();
    harness.composition.registerHostPhysicalIngressInternalV1(Object.freeze({
      portalContainer: document.createElement("div"),
      inputRouter: input.router,
    }));
    expect(host.settleReadinessInternalV1(
      host.getSnapshotInternalV1().root.pending!,
      "ready",
    )).toMatchObject({ kind: "applied" });
    const current = host.getSnapshotInternalV1().root.current!;

    expect(host.dispatchActionInternalV1(current.frame, primaryActionIdInternalV1))
      .toMatchObject({ kind: "applied" });
    await Promise.resolve();
    await Promise.resolve();
    expect(reportFailure).toHaveBeenCalledTimes(1);
    expect(genericFailure).not.toHaveBeenCalled();
    expect(reportFailure.mock.calls[0]![0]).toMatchObject({
      name: "TypeError",
      message: "ui.whole_canvas_surface_action_fault",
      cause: ownerFailure,
    });
    expect(host.getSnapshotInternalV1().root.current).toBe(current);
    expect(host.getSnapshotInternalV1().disposed).toBe(false);
    expect(harness.composition.getCurrentHostBindingInternalV1()).toBe(binding);
    expect(host.dispatchActionInternalV1(current.frame, primaryActionIdInternalV1))
      .toMatchObject({ kind: "applied" });
    expect(reportFailure).toHaveBeenCalledTimes(1);

    harness.composition.disposeInternalV1();
  });

  it("terminalizes the whole adapter when a second physical Host claims it", () => {
    const harness = activeHarnessInternalV1();
    harness.attachment.open();
    const first = inputRouterInternalV1();
    const second = inputRouterInternalV1();
    harness.composition.registerHostPhysicalIngressInternalV1(Object.freeze({
      portalContainer: document.createElement("div"),
      inputRouter: first.router,
    }));
    expect(() =>
      harness.composition.registerHostPhysicalIngressInternalV1(Object.freeze({
        portalContainer: document.createElement("div"),
        inputRouter: second.router,
      }))
    ).toThrowError("ui.whole_canvas_surface_host_registration_invalid");
    expect(harness.composition.getCurrentHostBindingInternalV1()).toBeNull();
    expect(first.registrationCount()).toBe(0);
    expect(second.registrationCount()).toBe(0);
    expect(harness.bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
  });

  it("rejects a non-DIV portal before registration and terminalizes the exact lease", () => {
    const harness = activeHarnessInternalV1();
    harness.attachment.open();
    const input = inputRouterInternalV1();
    expect(() =>
      harness.composition.registerHostPhysicalIngressInternalV1(Object.freeze({
        portalContainer: Object.freeze({}) as unknown as HTMLDivElement,
        inputRouter: input.router,
      }))
    ).toThrowError("ui.whole_canvas_surface_host_registration_invalid");
    expect(input.registrationCount()).toBe(0);
    expect(harness.source.listenerCount()).toBe(0);
    expect(harness.bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
    expect(harness.composition.getCurrentHostBindingInternalV1()).toBeNull();
  });

  it("rolls back a hostile router registration that synchronously disposes the generation", () => {
    const harness = activeHarnessInternalV1();
    harness.attachment.open();
    const cleanup = vi.fn();
    const hostileRouter: InputRouterV1 = Object.freeze({
      register: vi.fn(() => {
        harness.composition.disposeInternalV1();
        return Object.freeze(cleanup);
      }),
      route: () => inputIgnoredV1,
      clearTransientInput: () => undefined,
    });
    expect(() =>
      harness.composition.registerHostPhysicalIngressInternalV1(Object.freeze({
        portalContainer: document.createElement("div"),
        inputRouter: hostileRouter,
      }))
    ).toThrowError("ui.whole_canvas_surface_host_registration_invalid");
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(harness.source.listenerCount()).toBe(0);
    expect(harness.bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
    expect(harness.composition.getCurrentHostBindingInternalV1()).toBeNull();
  });

  it("retires the predecessor listener, binding, route, and lease before a successor", () => {
    const harness = activeHarnessInternalV1();
    harness.attachment.open();
    const oldBinding = harness.composition.getCurrentHostBindingInternalV1()!;
    const oldHost = resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1(oldBinding);
    const lateListener = harness.source.capturedListeners[0]!;
    expect(harness.source.listenerCount()).toBe(1);
    expect(harness.bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(1);

    harness.composition.detachRuntimeInternalV1();
    expect(harness.source.listenerCount()).toBe(0);
    expect(oldHost.getSnapshotInternalV1().disposed).toBe(true);
    expect(harness.bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
    lateListener();

    harness.source.publish(desiredInternalV1("test.whole-canvas.b"));
    const successorBundle = harness.createBundle(42);
    const successor = harness.attach(successorBundle);
    successor.open();
    expect(harness.composition.getCurrentHostBindingInternalV1()).not.toBe(oldBinding);
    expect(harness.source.listenerCount()).toBe(1);
    expect(successorBundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(1);
    harness.composition.disposeInternalV1();
    expect(successorBundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
  });

  it("rejects synchronous subscription reentry and releases the prepared lease", () => {
    const cleanup = vi.fn();
    const catalog = Object.freeze([]);
    const definition = createWholeCanvasSurfaceCompositionDefinitionInternalV1(Object.freeze({
      catalog,
      getSnapshotInternalV1: () => null,
      subscribeInternalV1: (listener: () => void) => {
        listener();
        return Object.freeze(cleanup);
      },
      resolveTargetInternalV1: () => null,
      dispatchOwnerActionInternalV1: null,
      prepareTargetInternalV1: null,
      renderInternalV1: () => null,
    }));
    const family = resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(definition);
    const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(51),
      recipe: Object.freeze({
        resolvedOwnerIds: family.resolvedOwnerIds,
        resolvedSlotDescriptors: family.resolvedSlotDescriptors,
      }),
      definitionSidecars: family.stableDefinitionSidecars,
    }));
    const composition = createWholeCanvasSurfaceCompositionRuntimeInternalV1({
      definition,
      resolveKernelBundleInternalV1: () => bundle,
    });
    composition.prepareRuntimeAttachmentInternalV1(
      coordinatorRuntimeInternalV1(bundle),
      Object.freeze({ isOpen: () => false }),
    );
    expect(() => composition.activateRuntimeAttachmentInternalV1()).toThrowError(
      "ui.whole_canvas_surface_subscription_invalid",
    );
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
    expect(composition.getCurrentHostBindingInternalV1()).toBeNull();
  });

  it("does not notify composition observers for an equal stable source publication", () => {
    const harness = activeHarnessInternalV1();
    harness.attachment.open();
    const observer = vi.fn();
    const unsubscribe = harness.composition.subscribeInternalV1(observer);
    harness.source.publish(desiredInternalV1("test.whole-canvas.a"));
    expect(observer).not.toHaveBeenCalled();
    unsubscribe();
    harness.composition.disposeInternalV1();
  });

  it("terminalizes boundedly when source snapshot synchronously reenters reconciliation", () => {
    const capturedListener: { current: (() => void) | null } = { current: null };
    let reenter = false;
    const cleanup = vi.fn();
    const definition = createWholeCanvasSurfaceCompositionDefinitionInternalV1(Object.freeze({
      catalog: Object.freeze([]),
      getSnapshotInternalV1: () => {
        if (reenter) capturedListener.current?.();
        return null;
      },
      subscribeInternalV1: (listener: () => void) => {
        capturedListener.current = listener;
        return Object.freeze(cleanup);
      },
      resolveTargetInternalV1: () => null,
      dispatchOwnerActionInternalV1: null,
      prepareTargetInternalV1: null,
      renderInternalV1: () => null,
    }));
    const family = resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(definition);
    const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
      applicationEpoch: parseNonNegativeSafeInteger(52),
      recipe: Object.freeze({
        resolvedOwnerIds: family.resolvedOwnerIds,
        resolvedSlotDescriptors: family.resolvedSlotDescriptors,
      }),
      definitionSidecars: family.stableDefinitionSidecars,
    }));
    const reportFailure = vi.fn();
    const composition = createWholeCanvasSurfaceCompositionRuntimeInternalV1({
      definition,
      resolveKernelBundleInternalV1: () => bundle,
      reportFailure,
    });
    const gate = { open: false };
    composition.prepareRuntimeAttachmentInternalV1(
      coordinatorRuntimeInternalV1(bundle),
      Object.freeze({ isOpen: () => gate.open }),
    );
    const publish = composition.activateRuntimeAttachmentInternalV1();
    gate.open = true;
    publish();
    reenter = true;
    capturedListener.current?.();
    expect(reportFailure).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(bundle.publisherLeaseRegistry.getSnapshot().currentPublisherCount).toBe(0);
    expect(composition.getCurrentHostBindingInternalV1()).toBeNull();
  });
});
