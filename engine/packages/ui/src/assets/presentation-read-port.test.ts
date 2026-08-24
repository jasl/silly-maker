// SPDX-License-Identifier: MIT
import {
  parseAssetId,
  parseLocaleId,
  parseNonNegativeSafeInteger,
  parseTextCatalogSetV1,
  parseTextId,
} from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";
import { createPresentationReadPortV1 } from "./presentation-read-port.ts";

const saveTextId = parseTextId("text.ui.save");
const cancelTextId = parseTextId("text.ui.cancel");
const currentAssetId = parseAssetId("asset.e2e.current");
const requestedLocale = parseLocaleId("zh-Hant");

const resolvedCatalogFixture = parseTextCatalogSetV1({
  defaultLocale: "zh-CN",
  catalogs: [
    {
      locale: "zh-CN",
      fallbackLocale: null,
      entries: [
        { textId: saveTextId, text: "保存" },
        { textId: cancelTextId, text: "取消" },
      ],
    },
    {
      locale: requestedLocale,
      fallbackLocale: "zh-CN",
      entries: [{ textId: cancelTextId, text: "取消" }],
    },
  ],
});

function createAssetRegistryFixtureV1() {
  const listeners = new Set<() => void>();
  let publication = { revision: parseNonNegativeSafeInteger(0) };
  const resolvedAsset = {
    delivery: "code_fallback" as const,
    assetId: currentAssetId,
    usage: "scene_background" as const,
    fallbackToken: "fallback.e2e.current",
  };
  const resolve = vi.fn((assetId: typeof currentAssetId, usage: "scene_background") => {
    expect(assetId).toBe(currentAssetId);
    expect(usage).toBe("scene_background");
    return resolvedAsset;
  });
  const observe = vi.fn(() => publication);
  const subscribe = vi.fn((listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  });

  return {
    registry: {
      observe,
      subscribe,
      preload: vi.fn(async () => []),
      resolve,
      dispose: vi.fn(),
    },
    resolve,
    resolvedAsset,
    observe,
    subscribe,
    publishReady() {
      publication = { revision: parseNonNegativeSafeInteger(1) };
      for (const listener of listeners) listener();
      return publication;
    },
  };
}

describe("createPresentationReadPortV1", () => {
  it("resolves locale fallback without exposing either source catalog", () => {
    const fixture = createAssetRegistryFixtureV1();
    const port = createPresentationReadPortV1({
      catalogs: resolvedCatalogFixture,
      locale: requestedLocale,
      assets: fixture.registry,
    });

    const resolved = port.text(saveTextId);

    expect(resolved).toEqual({
      textId: saveTextId,
      requestedLocale,
      resolvedLocale: parseLocaleId("zh-CN"),
      text: "保存",
    });
    expect(port).not.toHaveProperty("catalogs");
    expect(port).not.toHaveProperty("assets");
    expect(Object.keys(port).sort()).toEqual(
      ["asset", "locale", "observeAssets", "subscribeAssets", "text"].sort(),
    );
  });

  it("forwards exact asset reads and the registry readiness publication", () => {
    const fixture = createAssetRegistryFixtureV1();
    const port = createPresentationReadPortV1({
      catalogs: resolvedCatalogFixture,
      locale: requestedLocale,
      assets: fixture.registry,
    });

    const resolved = port.asset(currentAssetId, "scene_background");
    expect(resolved).toEqual({
      delivery: "code_fallback",
      assetId: currentAssetId,
      usage: "scene_background",
      fallbackToken: "fallback.e2e.current",
    });
    expect(resolved).toBe(fixture.resolvedAsset);
    expect(fixture.resolve).toHaveBeenCalledExactlyOnceWith(currentAssetId, "scene_background");

    const before = port.observeAssets();
    expect(port.observeAssets()).toBe(before);

    const listener = vi.fn();
    const unsubscribe = port.subscribeAssets(listener);
    expect(fixture.subscribe).toHaveBeenCalledExactlyOnceWith(listener);

    const after = fixture.publishReady();
    expect(listener).toHaveBeenCalledOnce();
    expect(port.observeAssets()).toBe(after);
    expect(port.observeAssets()).not.toBe(before);

    unsubscribe();
    fixture.publishReady();
    expect(listener).toHaveBeenCalledOnce();
  });
});
