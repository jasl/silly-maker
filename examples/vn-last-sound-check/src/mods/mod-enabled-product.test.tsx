// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { fireEvent, waitFor, within } from "@testing-library/react";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { createWebHostV1 } from "@sillymaker/web";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { VnLastSoundCheckBrowserImageEnvironmentV1 } from "./declarative-overrides-browser.ts";
import { startVnLastSoundCheckModEnabledProductV1 } from "./mod-enabled-product.tsx";

const encoderV1 = new TextEncoder();
const selectionPathV1 = "assets/mods/selection.json";
const manifestPathV1 = "assets/mods/showcase/manifest.json";
const modTextPathV1 = "assets/mods/showcase/content/shared.zh-CN.text-pack.json";
const modImagePathV1 = "assets/mods/showcase/images/signal-light.webp";
const replacementTextPrefixV1 = "【Showcase Mod】";

async function runtimeBytesV1(runtimePath: string): Promise<Uint8Array> {
  return await readFile(
    resolve(import.meta.dirname, "../..", runtimePath),
  );
}

function responseV1(bytes: Uint8Array, status = 200): Response {
  return new Response(new Uint8Array(bytes).buffer, { status });
}

function deferredV1(): { readonly promise: Promise<void>; readonly complete: () => void } {
  let complete!: () => void;
  const promise = new Promise<void>((accept) => {
    complete = accept;
  });
  return { promise, complete };
}

function imageEnvironmentV1(): VnLastSoundCheckBrowserImageEnvironmentV1 {
  return {
    resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
    createObjectUrl: () => "blob:vn-mod-asset",
    revokeObjectUrl: () => {},
    createImage: () => {
      let source = "";
      const image = {
        onload: null as HTMLImageElement["onload"],
        onerror: null as HTMLImageElement["onerror"],
        decode: vi.fn(async () => {}),
        naturalWidth: 425,
        naturalHeight: 428,
        get src() {
          return source;
        },
        set src(value: string) {
          source = value;
          if (value !== "") {
            queueMicrotask(() =>
              image.onload?.call(
                image as unknown as GlobalEventHandlers,
                new Event("load"),
              )
            );
          }
        },
      };
      return image as unknown as HTMLImageElement;
    },
  };
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe("One Last Sound Check Mod-enabled product Host", () => {
  it("applies enable and disable through complete Web application successors", async () => {
    const base = document.createElement("base");
    base.href = "https://game.example.test/";
    document.head.append(base);
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);

    const emptySelection = encoderV1.encode(JSON.stringify({
      format: "sillymaker.declarative-mod-selection",
      version: 1,
      mods: [],
    }));
    const activeSelection = await runtimeBytesV1(
      "mod-artifacts/assets/mods/selection.json",
    );
    const manifest = await runtimeBytesV1(
      "mod-artifacts/assets/mods/showcase/manifest.json",
    );
    let selected: Uint8Array<ArrayBufferLike> = emptySelection;
    let manifestFetchGate: Promise<void> | null = null;
    let notifyManifestFetch: (() => void) | null = null;
    const fetchV1 = vi.fn(async (url: URL) => {
      switch (url.pathname.slice(1)) {
        case selectionPathV1:
          return responseV1(selected);
        case manifestPathV1:
          notifyManifestFetch?.();
          if (manifestFetchGate !== null) await manifestFetchGate;
          return responseV1(manifest);
        case modTextPathV1:
          return responseV1(
            await runtimeBytesV1(
              "mod-artifacts/assets/mods/showcase/content/shared.zh-CN.text-pack.json",
            ),
          );
        case modImagePathV1:
          return responseV1(
            await runtimeBytesV1(
              "mod-artifacts/assets/mods/showcase/images/signal-light.webp",
            ),
          );
        default:
          if (url.pathname.startsWith("/assets/content/")) {
            return responseV1(await runtimeBytesV1(url.pathname.slice(1)));
          }
          return responseV1(new Uint8Array([1]), 404);
      }
    });
    const product = await startVnLastSoundCheckModEnabledProductV1({
      rootElement: root,
      host: createWebHostV1({ records: createMemoryHostRecordStoreV1() }),
      selectionUrl: new URL(selectionPathV1, document.baseURI),
      fetch: fetchV1,
      imageEnvironment: imageEnvironmentV1(),
      registerPageLifecycle: false,
    });
    try {
      await waitFor(() =>
        expect(within(root).getByRole("button", { name: "新游戏" })).toBeInTheDocument()
      );
      const baseApplication = product.getStartedApplication();
      expect(product.getSelection().activeMods).toEqual([]);

      selected = activeSelection;
      await product.enable();
      const modApplication = product.getStartedApplication();
      expect(modApplication).not.toBe(baseApplication);
      expect(baseApplication.isDisposed()).toBe(true);
      expect(product.getSelection().activeMods).toEqual([
        { modId: "mod.vn-last-sound-check.showcase", version: "1.0.0" },
      ]);

      await waitFor(() =>
        expect(within(root).getByRole("button", { name: "新游戏" })).toBeInTheDocument()
      );
      fireEvent.click(within(root).getByRole("button", { name: "新游戏" }));
      await waitFor(() => {
        const dialogue = root.querySelector<HTMLElement>("[data-dialogue='say'] p");
        expect(dialogue).not.toBeNull();
        expect(dialogue?.textContent).toMatch(/^【Showcase Mod】/u);
      });

      await product.reload();
      const reloadedApplication = product.getStartedApplication();
      expect(reloadedApplication).not.toBe(modApplication);
      expect(modApplication.isDisposed()).toBe(true);
      expect(product.getSelection().activeMods).toEqual([
        { modId: "mod.vn-last-sound-check.showcase", version: "1.0.0" },
      ]);

      await product.disable();
      const baseSuccessor = product.getStartedApplication();
      expect(baseSuccessor).not.toBe(reloadedApplication);
      expect(reloadedApplication.isDisposed()).toBe(true);
      expect(product.getSelection().activeMods).toEqual([]);
      await waitFor(() =>
        expect(within(root).getByRole("button", { name: "继续游戏" })).toBeInTheDocument()
      );
      fireEvent.click(within(root).getByRole("button", { name: "继续游戏" }));
      await waitFor(() => {
        const dialogue = root.querySelector<HTMLElement>("[data-dialogue='say'] p");
        expect(dialogue).not.toBeNull();
        expect(dialogue?.textContent).toMatch(/^(?:凌晨五点二十二分|远处渡船的汽笛)/u);
      });
      expect(
        root.querySelector<HTMLElement>("[data-dialogue='say'] p")?.textContent,
      ).not.toMatch(new RegExp(`^${replacementTextPrefixV1}`, "u"));

      selected = activeSelection;
      const manifestFetchEntered = deferredV1();
      const releaseManifestFetch = deferredV1();
      manifestFetchGate = releaseManifestFetch.promise;
      notifyManifestFetch = manifestFetchEntered.complete;
      const closingSuccessor = product.enable().then(() => product.getStartedApplication());
      await manifestFetchEntered.promise;
      const close = product.dispose();
      let closeSettled = false;
      const observedClose = close.then(() => {
        closeSettled = true;
      });
      await Promise.resolve();
      expect(closeSettled).toBe(false);
      releaseManifestFetch.complete();
      const successor = await closingSuccessor;
      await observedClose;
      expect(successor.isDisposed()).toBe(true);
      await expect(product.reload()).rejects.toThrow(
        "vn-last-sound-check.mod_enabled_product_disposed",
      );
    } finally {
      await product.dispose();
    }
  });
});
