// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";
import {
  inputHandledV1,
  inputIgnoredV1,
  parseInputActionIdV1,
  systemInputActionIdsV1,
  type InputContextIdV1,
  type InputEventV1,
  type InputHandlerResultV1,
} from "./contracts.ts";
import {
  bindManagedInputRouterFacadeInternalV1,
  createInputRouterV1,
  registerManagedInputHandlerV1,
} from "./input-router.ts";

const precedenceV1 = [
  "debug",
  "system",
  "overlay",
  "whole_canvas",
  "narrative",
  "interaction",
  "gameplay",
] as const satisfies readonly InputContextIdV1[];

function actionEventV1(actionId = "story.e2e.custom_action"): InputEventV1 {
  return { kind: "action", actionId: parseInputActionIdV1(actionId) };
}

describe("InputActionIdV1", () => {
  it("accepts open Story-owned stable action IDs without changing their bytes", () => {
    expect(parseInputActionIdV1("story.e2e.custom_action")).toBe("story.e2e.custom_action");
    expect(parseInputActionIdV1("input.future.gamepad-confirm")).toBe(
      "input.future.gamepad-confirm",
    );
  });

  it.each([
    "",
    "   ",
    "action",
    "Action.e2e.confirm",
    "action/e2e/confirm",
    "action..confirm",
    7,
    null,
  ])("rejects an invalid open action ID: %j", (value) => {
    expect(() => parseInputActionIdV1(value as string)).toThrowError("ui.invalid_input_action_id");
  });

  it("publishes exactly four engine-owned system action constants", () => {
    expect(systemInputActionIdsV1).toEqual({
      confirm: "ui.confirm",
      cancel: "ui.cancel",
      openMenu: "ui.open_menu",
      narrativeAdvance: "narrative.advance",
    });
    expect(Object.keys(systemInputActionIdsV1)).toEqual([
      "confirm",
      "cancel",
      "openMenu",
      "narrativeAdvance",
    ]);
  });
});

describe("createInputRouterV1", () => {
  it("routes through the fixed debug-to-gameplay precedence", () => {
    const router = createInputRouterV1();
    const calls: InputContextIdV1[] = [];

    for (const context of precedenceV1.toReversed()) {
      router.register({
        context,
        handle: () => {
          calls.push(context);
          return context === "gameplay" ? inputHandledV1 : inputIgnoredV1;
        },
      });
    }

    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "gameplay" });
    expect(calls).toEqual(precedenceV1);
  });

  it("never falls through after the first handled context", () => {
    const router = createInputRouterV1();
    const debug = vi.fn(() => inputIgnoredV1);
    const system = vi.fn(() => inputIgnoredV1);
    const overlay = vi.fn(() => inputHandledV1);
    const narrative = vi.fn(() => inputHandledV1);
    const interaction = vi.fn(() => inputHandledV1);
    const gameplay = vi.fn(() => inputHandledV1);

    router.register({ context: "gameplay", handle: gameplay });
    router.register({ context: "interaction", handle: interaction });
    router.register({ context: "narrative", handle: narrative });
    router.register({ context: "overlay", handle: overlay });
    router.register({ context: "system", handle: system });
    router.register({ context: "debug", handle: debug });

    expect(router.route({ kind: "action", actionId: systemInputActionIdsV1.cancel })).toEqual({
      kind: "handled",
      context: "overlay",
    });
    expect(debug).toHaveBeenCalledOnce();
    expect(system).toHaveBeenCalledOnce();
    expect(overlay).toHaveBeenCalledOnce();
    expect(narrative).not.toHaveBeenCalled();
    expect(interaction).not.toHaveBeenCalled();
    expect(gameplay).not.toHaveBeenCalled();
  });

  it("isolates whole-canvas below higher contexts and consumes cancel before Narrative", () => {
    const router = createInputRouterV1();
    const calls: InputContextIdV1[] = [];
    let systemHandles = true;
    let overlayHandles = true;

    router.register({
      context: "narrative",
      handle: () => {
        calls.push("narrative");
        return inputHandledV1;
      },
    });
    router.register({
      context: "whole_canvas",
      handle: (event) => {
        calls.push("whole_canvas");
        return event.kind === "action" && event.actionId === systemInputActionIdsV1.cancel
          ? inputHandledV1
          : inputIgnoredV1;
      },
    });
    router.register({
      context: "overlay",
      handle: () => {
        calls.push("overlay");
        return overlayHandles ? inputHandledV1 : inputIgnoredV1;
      },
    });
    router.register({
      context: "system",
      handle: () => {
        calls.push("system");
        return systemHandles ? inputHandledV1 : inputIgnoredV1;
      },
    });

    const cancel = Object.freeze({
      kind: "action" as const,
      actionId: systemInputActionIdsV1.cancel,
    });
    expect(router.route(cancel)).toEqual({ kind: "handled", context: "system" });
    expect(calls).toEqual(["system"]);

    systemHandles = false;
    calls.length = 0;
    expect(router.route(cancel)).toEqual({ kind: "handled", context: "overlay" });
    expect(calls).toEqual(["system", "overlay"]);

    overlayHandles = false;
    calls.length = 0;
    expect(router.route(cancel)).toEqual({ kind: "handled", context: "whole_canvas" });
    expect(calls).toEqual(["system", "overlay", "whole_canvas"]);

    calls.length = 0;
    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "narrative" });
    expect(calls).toEqual(["system", "overlay", "whole_canvas", "narrative"]);
  });

  it("lets an ignored Overlay fall through to Interaction before Gameplay", () => {
    const router = createInputRouterV1();
    const overlay = vi.fn(() => inputIgnoredV1);
    const interaction = vi.fn(() => inputHandledV1);
    const gameplay = vi.fn(() => inputHandledV1);
    router.register({ context: "gameplay", handle: gameplay });
    router.register({ context: "interaction", handle: interaction });
    router.register({ context: "overlay", handle: overlay });

    const event = Object.freeze({
      kind: "viewport_point" as const,
      phase: "activate" as const,
      point: Object.freeze({ x: 320, y: 240 }),
      pointerId: parseNonNegativeSafeInteger(7),
      pointerType: "touch" as const,
    });
    expect(router.route(event)).toEqual({ kind: "handled", context: "interaction" });
    expect(overlay).toHaveBeenCalledWith(event);
    expect(interaction).toHaveBeenCalledWith(event);
    expect(gameplay).not.toHaveBeenCalled();
  });

  it("uses LIFO order within one context and continues only after ignored", () => {
    const router = createInputRouterV1();
    const calls: string[] = [];
    router.register({
      context: "interaction",
      handle: () => {
        calls.push("oldest");
        return inputHandledV1;
      },
    });
    router.register({
      context: "interaction",
      handle: () => {
        calls.push("middle");
        return inputHandledV1;
      },
    });
    router.register({
      context: "interaction",
      handle: () => {
        calls.push("newest");
        return inputIgnoredV1;
      },
    });

    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "interaction" });
    expect(calls).toEqual(["newest", "middle"]);
  });

  it("routes a package-internal managed gate before ordinary LIFO handlers", () => {
    const router = createInputRouterV1();
    const calls: string[] = [];
    router.register({
      context: "overlay",
      handle: () => {
        calls.push("ordinary-oldest");
        return inputHandledV1;
      },
    });
    const unregisterManaged = registerManagedInputHandlerV1(router, {
      context: "overlay",
      handle: () => {
        calls.push("managed");
        return inputIgnoredV1;
      },
    });
    router.register({
      context: "overlay",
      handle: () => {
        calls.push("ordinary-newest");
        return inputIgnoredV1;
      },
    });

    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "overlay" });
    expect(calls).toEqual(["managed", "ordinary-newest", "ordinary-oldest"]);

    calls.length = 0;
    unregisterManaged();
    unregisterManaged();
    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "overlay" });
    expect(calls).toEqual(["ordinary-newest", "ordinary-oldest"]);
  });

  it("defers registrations made during dispatch until the next event", () => {
    const router = createInputRouterV1();
    const calls: string[] = [];
    let debugRegistered = false;
    router.register({
      context: "system",
      handle: () => {
        calls.push("system");
        if (!debugRegistered) {
          debugRegistered = true;
          router.register({
            context: "debug",
            handle: () => {
              calls.push("late-debug");
              return inputHandledV1;
            },
          });
        }
        return inputIgnoredV1;
      },
    });
    router.register({
      context: "gameplay",
      handle: () => {
        calls.push("gameplay");
        return inputHandledV1;
      },
    });

    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "gameplay" });
    expect(calls).toEqual(["system", "gameplay"]);

    calls.length = 0;
    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "debug" });
    expect(calls).toEqual(["late-debug"]);
  });

  it("defers unregistrations made during dispatch until the next event", () => {
    const router = createInputRouterV1();
    const calls: string[] = [];
    const unregisterInteraction = router.register({
      context: "interaction",
      handle: () => {
        calls.push("interaction");
        return inputHandledV1;
      },
    });
    router.register({
      context: "overlay",
      handle: () => {
        calls.push("overlay");
        unregisterInteraction();
        return inputIgnoredV1;
      },
    });
    router.register({
      context: "gameplay",
      handle: () => {
        calls.push("gameplay");
        return inputHandledV1;
      },
    });

    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "interaction" });
    expect(calls).toEqual(["overlay", "interaction"]);

    calls.length = 0;
    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "gameplay" });
    expect(calls).toEqual(["overlay", "gameplay"]);
  });

  it("returns an idempotent unregister operation without disturbing retained handlers", () => {
    const router = createInputRouterV1();
    const retained = vi.fn(() => inputHandledV1);
    const removed = vi.fn(() => inputHandledV1);
    router.register({ context: "narrative", handle: retained });
    const unregister = router.register({ context: "narrative", handle: removed });

    unregister();
    unregister();

    expect(router.route(actionEventV1())).toEqual({ kind: "handled", context: "narrative" });
    expect(removed).not.toHaveBeenCalled();
    expect(retained).toHaveBeenCalledOnce();
  });

  it("routes clearTransientInput as one focus_loss event through the same precedence", () => {
    const router = createInputRouterV1();
    const overlay = vi.fn(() => inputIgnoredV1);
    const interaction = vi.fn(() => inputHandledV1);
    const gameplay = vi.fn(() => inputHandledV1);
    router.register({ context: "gameplay", handle: gameplay });
    router.register({ context: "interaction", handle: interaction });
    router.register({ context: "overlay", handle: overlay });

    expect(router.clearTransientInput()).toBeUndefined();
    expect(overlay).toHaveBeenCalledWith({ kind: "focus_loss" });
    expect(interaction).toHaveBeenCalledWith({ kind: "focus_loss" });
    expect(gameplay).not.toHaveBeenCalled();
  });

  it("returns public results for both handled and fully ignored routes", () => {
    const router = createInputRouterV1();
    const ignored = router.route(actionEventV1());
    router.register({ context: "system", handle: () => inputHandledV1 });
    const handled = router.route(actionEventV1());

    expect(ignored).toEqual({ kind: "ignored" });
    expect(handled).toEqual({ kind: "handled", context: "system" });
  });

  it("accepts all four event variants and passes the original admitted values", () => {
    const router = createInputRouterV1();
    const events: InputEventV1[] = [
      actionEventV1(),
      {
        kind: "viewport_point",
        phase: "begin",
        point: { x: -12.5, y: 300.25 },
        pointerId: parseNonNegativeSafeInteger(0),
        pointerType: "pen",
      },
      { kind: "pointer_cancel", pointerId: parseNonNegativeSafeInteger(0) },
      { kind: "focus_loss" },
    ];
    const handle = vi.fn((_event: InputEventV1): InputHandlerResultV1 => inputHandledV1);
    router.register({ context: "interaction", handle });

    for (const event of events) {
      expect(router.route(event)).toEqual({ kind: "handled", context: "interaction" });
    }
    expect(handle.mock.calls.map(([event]) => event)).toEqual(events);
    for (const [index, event] of events.entries()) {
      expect(handle.mock.calls[index]?.[0]).toBe(event);
    }
  });

  it.each([
    { registration: null, label: "null" },
    { registration: { context: "modal", handle: () => inputHandledV1 }, label: "context" },
    { registration: { context: "overlay", handle: "handled" }, label: "handler" },
  ])("rejects an invalid registration: $label", ({ registration }) => {
    const router = createInputRouterV1();
    expect(() =>
      router.register(
        registration as {
          readonly context: InputContextIdV1;
          readonly handle: (event: InputEventV1) => InputHandlerResultV1;
        },
      )
    ).toThrowError("ui.invalid_input_registration");
  });
});

function createInputRouterFacadeV1(target: ReturnType<typeof createInputRouterV1>) {
  return {
    register: target.register,
    route: target.route,
    clearTransientInput: target.clearTransientInput,
  };
}

describe("bindManagedInputRouterFacadeInternalV1", () => {
  it("binds one facade generation to the direct managed vector with retained cleanup identity", () => {
    const target = createInputRouterV1();
    const facade = createInputRouterFacadeV1(target);
    const isIngressOpen = vi.fn(() => true);
    const firstInput = { facade, target, isIngressOpen };
    const cleanup = bindManagedInputRouterFacadeInternalV1(firstInput);
    const repeated = bindManagedInputRouterFacadeInternalV1(
      { facade, target, isIngressOpen },
    );
    const calls: string[] = [];
    facade.register({
      context: "narrative",
      handle: () => {
        calls.push("ordinary");
        return inputHandledV1;
      },
    });
    const unregisterManaged = registerManagedInputHandlerV1(facade, {
      context: "narrative",
      handle: () => {
        calls.push("managed");
        return inputIgnoredV1;
      },
    });

    expect(repeated).toBe(cleanup);
    expect(facade.route(actionEventV1())).toEqual({
      kind: "handled",
      context: "narrative",
    });
    expect(calls).toEqual(["managed", "ordinary"]);
    expect(isIngressOpen).toHaveBeenCalledOnce();

    unregisterManaged();
    cleanup();
  });

  it("keeps managed registration inert while ingress is closed", () => {
    const target = createInputRouterV1();
    const facade = createInputRouterFacadeV1(target);
    const isIngressOpen = vi.fn(() => false);
    const cleanup = bindManagedInputRouterFacadeInternalV1(
      { facade, target, isIngressOpen },
    );
    const handle = vi.fn(() => inputHandledV1);
    const registration = { context: "narrative" as const, handle };

    const first = registerManagedInputHandlerV1(facade, registration);
    const second = registerManagedInputHandlerV1(facade, registration);

    first();
    first();
    second();
    expect(isIngressOpen).toHaveBeenCalledTimes(2);
    expect(facade.route(actionEventV1())).toBe(inputIgnoredV1);
    expect(handle).not.toHaveBeenCalled();
    cleanup();
  });

  it.each(
    [
      {
        label: "throw",
        gate: () => {
          throw new Error("gate failed");
        },
      },
      { label: "non-boolean", gate: () => "yes" },
    ] as const,
  )("rejects a $label ingress gate result", ({ gate }) => {
    const target = createInputRouterV1();
    const facade = createInputRouterFacadeV1(target);
    const cleanup = bindManagedInputRouterFacadeInternalV1(
      { facade, target, isIngressOpen: gate as unknown as () => boolean },
    );
    const handle = vi.fn(() => inputHandledV1);

    expect(() => registerManagedInputHandlerV1(facade, { context: "narrative", handle }))
      .toThrowError("ui.managed_input_router_facade_invalid");
    expect(facade.route(actionEventV1())).toBe(inputIgnoredV1);
    expect(handle).not.toHaveBeenCalled();
    cleanup();
  });

  it("keeps registration inert when the open gate releases its own generation", () => {
    const target = createInputRouterV1();
    const facade = createInputRouterFacadeV1(target);
    let cleanup!: () => void;
    const isIngressOpen = vi.fn(() => {
      cleanup();
      return true;
    });
    cleanup = bindManagedInputRouterFacadeInternalV1(
      { facade, target, isIngressOpen },
    );
    const handle = vi.fn(() => inputHandledV1);

    const unregister = registerManagedInputHandlerV1(facade, {
      context: "narrative",
      handle,
    });

    unregister();
    unregister();
    expect(isIngressOpen).toHaveBeenCalledOnce();
    expect(target.route(actionEventV1())).toBe(inputIgnoredV1);
    expect(handle).not.toHaveBeenCalled();
  });

  it("permanently fences release, conflicts, native facades, and facade chains", () => {
    const target = createInputRouterV1();
    const secondTarget = createInputRouterV1();
    const facade = createInputRouterFacadeV1(target);
    const gate = () => true;
    const cleanup = bindManagedInputRouterFacadeInternalV1(
      { facade, target, isIngressOpen: gate },
    );

    expect(() =>
      bindManagedInputRouterFacadeInternalV1(
        { facade, target: secondTarget, isIngressOpen: gate },
      )
    ).toThrowError("ui.managed_input_router_facade_invalid");
    expect(() =>
      bindManagedInputRouterFacadeInternalV1(
        { facade: target, target, isIngressOpen: gate },
      )
    ).toThrowError("ui.managed_input_router_facade_invalid");
    expect(() =>
      bindManagedInputRouterFacadeInternalV1(
        {
          facade: createInputRouterFacadeV1(target),
          target: facade,
          isIngressOpen: gate,
        },
      )
    ).toThrowError("ui.managed_input_router_facade_invalid");

    cleanup();
    cleanup();
    expect(() =>
      bindManagedInputRouterFacadeInternalV1(
        { facade, target, isIngressOpen: gate },
      )
    ).toThrowError("ui.managed_input_router_facade_invalid");
    expect(() =>
      registerManagedInputHandlerV1(facade, {
        context: "narrative",
        handle: () => inputHandledV1,
      })
    ).toThrowError("ui.managed_input_router_required");
  });

  it("bounds 10,000 fresh facade generations without accumulating dispatch paths", () => {
    let handled = 0;
    for (let index = 0; index < 10_000; index += 1) {
      const target = createInputRouterV1();
      const facade = createInputRouterFacadeV1(target);
      const isIngressOpen = () => true;
      const cleanup = bindManagedInputRouterFacadeInternalV1(
        { facade, target, isIngressOpen },
      );
      const repeated = bindManagedInputRouterFacadeInternalV1(
        { facade, target, isIngressOpen },
      );
      if (repeated !== cleanup) throw new Error("facade cleanup identity changed");
      const unregister = registerManagedInputHandlerV1(facade, {
        context: "narrative",
        handle: () => {
          handled += 1;
          return inputHandledV1;
        },
      });
      const result = facade.route(actionEventV1());
      if (result.kind !== "handled") throw new Error("facade dispatch path was lost");
      unregister();
      cleanup();
      cleanup();
    }
    expect(handled).toBe(10_000);
  });
});
