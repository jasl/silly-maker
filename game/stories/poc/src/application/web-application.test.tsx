// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import {
  createWebHostV1,
  installWebGameApplicationHmrV1,
  startWebGameApplicationV1,
} from "@sillymaker/web";
import type { ResolvedGameHmrHotAdapterV1, StartedWebGameApplicationV1 } from "@sillymaker/web";

import { pocWebApplicationV1 } from "./web-application.js";

afterEach(cleanup);

function createRootV1(): HTMLElement {
  const root = document.createElement("div");
  root.id = "root";
  document.body.append(root);
  return root;
}

async function startPocV1(
  input: {
    readonly records?: ReturnType<typeof createMemoryHostRecordStoreV1>;
    readonly search?: string;
    readonly rootElement?: HTMLElement;
  } = {},
) {
  const records = input.records ?? createMemoryHostRecordStoreV1();
  const host = createWebHostV1({ records, seeds: [11] });
  const rootElement = input.rootElement ?? createRootV1();
  const started = await startWebGameApplicationV1(pocWebApplicationV1, {
    rootElement,
    host,
    capabilitySearch: input.search ?? "",
    registerPageLifecycle: false,
  });
  return { started, rootElement, records, host };
}

describe("PoC web application declaration", () => {
  it("boots from one declaration, disposes to zero, and releases its lease", async () => {
    const { started, rootElement, records } = await startPocV1();

    await waitFor(() => {
      expect(
        screen.getByRole("application", { name: "Project Tavern 七日原型" }),
      ).toBeInTheDocument();
    });

    // The entry never assembled engine services: the composer built the
    // instance whose Story extensions carry diagnostics and debug tooling.
    const facade = rootElement.querySelector("[data-application-id='poc-web']");
    expect(facade).toBeInTheDocument();

    await started.dispose();
    expect(started.isDisposed()).toBe(true);
    expect(rootElement.childElementCount).toBe(0);
    // Idempotent disposal.
    await started.dispose();

    // The lease was released: a successor over the same records boots and
    // saves without a takeover fight.
    const successor = await startPocV1({ records });
    await waitFor(() => {
      expect(
        screen.getByRole("application", { name: "Project Tavern 七日原型" }),
      ).toBeInTheDocument();
    });
    await successor.started.dispose();
  });

  it("rebootstraps through the composer-owned HMR boundary", async () => {
    const records = createMemoryHostRecordStoreV1();
    const first = await startPocV1({ records });

    let acceptHandler: ((module: FakeEntryModuleV1 | undefined) => void) | undefined;
    const hot: ResolvedGameHmrHotAdapterV1<FakeEntryModuleV1> = Object.freeze({
      accept(handler: (module: FakeEntryModuleV1 | undefined) => void) {
        acceptHandler = handler;
      },
    });

    const successors: StartedWebGameApplicationV1[] = [];
    installWebGameApplicationHmrV1<FakeEntryModuleV1>({
      started: first.started,
      hot,
      resolveAcceptedProvenance: (module) => module.provenance,
      startSuccessor: async ({ started: predecessor, disposition }) =>
        await startWebGameApplicationV1(pocWebApplicationV1, {
          rootElement: first.rootElement,
          host: predecessor.host,
          capabilitySearch: predecessor.capabilitySearch,
          rebootstrapDisposition: disposition,
          registerPageLifecycle: false,
        }),
      installNextBoundary: ({ started }) => {
        successors.push(started);
        return Object.freeze({ waitForTransition: () => Promise.resolve() });
      },
    });
    expect(acceptHandler).toBeDefined();

    // A changed story digest forces the rebootstrap path: the predecessor
    // hands its lease over and the successor mounts on the same root.
    const changed: FakeEntryModuleV1 = {
      provenance: JSON.parse(JSON.stringify(first.started.provenance)) as never,
    };
    (changed.provenance as { story: { digest: string } }).story.digest =
      "sha256:1111111111111111111111111111111111111111111111111111111111111111";

    acceptHandler?.(changed);
    await waitFor(() => {
      expect(successors).toHaveLength(1);
    });
    const successor = successors[0];
    expect(first.started.isDisposed()).toBe(true);
    expect(successor?.isDisposed()).toBe(false);
    await waitFor(() => {
      expect(
        screen.getByRole("application", { name: "Project Tavern 七日原型" }),
      ).toBeInTheDocument();
    });
    await successor?.dispose();
  });
});

interface FakeEntryModuleV1 {
  readonly provenance: StartedWebGameApplicationV1["provenance"];
}
