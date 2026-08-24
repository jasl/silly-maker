// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StageContentCatalogV1 } from "@sillymaker/base";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type { InspectorToolingPlanV1 } from "./composition.ts";
import type { AuthoringSceneSourceIoV1 } from "./core/authoring-scene-io.ts";
import type { InspectorBindingV1 } from "./core/binding.ts";
import {
  createInspectorToolingReactPublicationV1,
  createPersistentReactLayoutPublicationInternalV1,
} from "./react-publication.tsx";
import type { PersistentReactLayoutRenderTargetInternalV1 } from "./react-publication.tsx";

interface PersistentTestPlanV1 {
  readonly label: string;
  readonly failProbeLayout?: boolean;
  readonly failVisibleRender?: boolean;
}

const mountedPublications: Array<{ dispose(): void }> = [];

afterEach(() => {
  for (const publication of mountedPublications.splice(0).toReversed()) publication.dispose();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function containerV1(): HTMLDivElement {
  const container = document.createElement("div");
  document.body.append(container);
  return container;
}

function PersistentStateProbeV1(props: {
  readonly plan: PersistentTestPlanV1;
  readonly target: PersistentReactLayoutRenderTargetInternalV1;
  readonly events: string[];
}): ReactElement {
  const [count, setCount] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    props.events.push(
      `layout:${props.plan.label}:${props.target}:${
        buttonRef.current?.isConnected === true ? "connected" : "detached"
      }`,
    );
    if (props.target === "probe" && props.plan.failProbeLayout === true) {
      throw new Error(`probe layout failed:${props.plan.label}`);
    }
  }, [props.events, props.plan, props.target]);
  return (
    <button ref={buttonRef} type="button" onClick={() => setCount((value) => value + 1)}>
      {props.plan.label}:{count}
    </button>
  );
}

describe("persistent Inspector React layout publication", () => {
  it("mounts visibly, probes a successor, and preserves compatible component state", async () => {
    const container = containerV1();
    const events: string[] = [];
    const publication = createPersistentReactLayoutPublicationInternalV1<PersistentTestPlanV1>({
      container,
      render: (plan, target) => (
        <PersistentStateProbeV1 plan={plan} target={target} events={events} />
      ),
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });
    const host = container.firstElementChild;
    const button = container.querySelector("button") as HTMLButtonElement;
    fireEvent.click(button);

    await publication.publish({ label: "candidate" }, new AbortController().signal);

    expect(container.firstElementChild).toBe(host);
    expect(container.querySelector("button")).toBe(button);
    expect(button).toHaveTextContent("candidate:1");
    expect(events).toEqual([
      "layout:old:visible:connected",
      "layout:candidate:probe:connected",
      "layout:candidate:visible:connected",
    ]);
  });

  it("leaves the visible predecessor untouched when connected probe layout rejects", async () => {
    const container = containerV1();
    const publication = createPersistentReactLayoutPublicationInternalV1<PersistentTestPlanV1>({
      container,
      render: (plan, target) => <PersistentStateProbeV1 plan={plan} target={target} events={[]} />,
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });
    const host = container.firstElementChild;
    const button = container.querySelector("button") as HTMLButtonElement;
    fireEvent.click(button);

    await expect(publication.publish(
      { label: "bad", failProbeLayout: true },
      new AbortController().signal,
    )).rejects.toThrow("probe layout failed:bad");

    expect(container.firstElementChild).toBe(host);
    expect(container.querySelector("button")).toBe(button);
    expect(button).toHaveTextContent("old:1");
  });

  it("rolls a visible factory failure back, then accepts a later successor", async () => {
    const container = containerV1();
    const failure = new Error("visible candidate failed");
    const publication = createPersistentReactLayoutPublicationInternalV1<PersistentTestPlanV1>({
      container,
      render(plan, target) {
        if (target === "visible" && plan.failVisibleRender === true) throw failure;
        return <PersistentStateProbeV1 plan={plan} target={target} events={[]} />;
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });
    const button = container.querySelector("button") as HTMLButtonElement;
    fireEvent.click(button);

    await expect(publication.publish(
      { label: "bad", failVisibleRender: true },
      new AbortController().signal,
    )).rejects.toBe(failure);
    expect(button).toHaveTextContent("old:1");

    await publication.publish({ label: "recovered" }, new AbortController().signal);
    expect(container.querySelector("button")).toBe(button);
    expect(button).toHaveTextContent("recovered:1");
  });

  it("retires a poisoned root when both candidate and rollback factories fail", async () => {
    const container = containerV1();
    const candidateFailure = new Error("candidate failed");
    const rollbackFailure = new Error("rollback failed");
    const onTerminalFailure = vi.fn();
    let oldVisibleRenders = 0;
    const publication = createPersistentReactLayoutPublicationInternalV1<PersistentTestPlanV1>({
      container,
      onTerminalFailure,
      render(plan, target) {
        if (target === "visible" && plan.label === "old" && ++oldVisibleRenders > 1) {
          throw rollbackFailure;
        }
        if (target === "visible" && plan.label === "bad") throw candidateFailure;
        return <div>{plan.label}</div>;
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });

    await expect(publication.publish(
      { label: "bad" },
      new AbortController().signal,
    )).rejects.toMatchObject({ errors: [candidateFailure, rollbackFailure] });
    expect(onTerminalFailure).toHaveBeenCalledOnce();
    expect(container).toBeEmptyDOMElement();
  });
});

const emptySceneIoV1: AuthoringSceneSourceIoV1 = {
  list: () => Promise.resolve({ kind: "ok", scenes: [], skipped: [] }),
  read: () => Promise.resolve({ kind: "error", code: "not_found" }),
  write: () => Promise.resolve({ kind: "error", code: "unavailable" }),
};

const emptyMotionIoV1: MotionSourceIoV1 = {
  list: () => Promise.resolve({ kind: "ok", motions: [], skipped: [] }),
  read: () => Promise.resolve({ kind: "error", code: "not_found" }),
  write: () => Promise.resolve({ kind: "error", code: "unavailable" }),
  create: () => Promise.resolve({ kind: "error", code: "unavailable" }),
};

const emptyCatalogV1: StageContentCatalogV1 = { resolveContent: () => null };

function bindingV1(): InspectorBindingV1 {
  return { catalog: emptyCatalogV1, renderers: {} };
}

function planV1(
  binding: InspectorBindingV1,
  sceneIo: AuthoringSceneSourceIoV1 = emptySceneIoV1,
): InspectorToolingPlanV1 {
  return { binding, sceneIo, motionIo: emptyMotionIoV1 };
}

describe("Inspector tooling publication", () => {
  it("keeps one Authoring Host across compatible binding successors", async () => {
    const container = containerV1();
    const publication = createInspectorToolingReactPublicationV1({ container });
    mountedPublications.push(publication);
    await publication.mount(planV1(bindingV1()));
    await waitFor(() => expect(container.querySelector("[data-authoring-host]")).not.toBeNull());
    const host = container.querySelector("[data-authoring-host]");

    await publication.publish(planV1(bindingV1()), new AbortController().signal);

    expect(container.querySelector("[data-authoring-host]")).toBe(host);
  });

  it("rejects replacement of the Host-owned source IO before changing the visible Host", async () => {
    const container = containerV1();
    const publication = createInspectorToolingReactPublicationV1({ container });
    mountedPublications.push(publication);
    await publication.mount(planV1(bindingV1()));
    const host = container.querySelector("[data-authoring-host]");

    await expect(publication.publish(
      planV1(bindingV1(), { ...emptySceneIoV1 }),
      new AbortController().signal,
    )).rejects.toThrow("cannot replace its scene IO owner");
    expect(container.querySelector("[data-authoring-host]")).toBe(host);
  });
});
