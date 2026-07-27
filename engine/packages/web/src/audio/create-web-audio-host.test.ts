// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { resolveAudioManifestV1 } from "@sillymaker/base";
import type { AudioHostDiagnosticV1 } from "@sillymaker/ui";

import type { WebAudioContextLikeV1 } from "./create-web-audio-host.ts";
import { createWebAudioHostV1 } from "./create-web-audio-host.ts";

const themeDigestV1 = `sha256:${"a".repeat(64)}`;

function manifestV1() {
  return resolveAudioManifestV1(
    [
      { assetId: "audio.test.theme", kind: "music", fallback: "silence", loadGroup: "bootstrap" },
      { assetId: "audio.test.silent", kind: "ambient", fallback: "silence", loadGroup: "scene" },
      { assetId: "audio.test.broken", kind: "sfx", fallback: "silence", loadGroup: "on_demand" },
    ],
    [
      {
        assetId: "audio.test.theme",
        runtimePath: "audio/theme.ogg",
        mediaType: "audio/ogg",
        byteLength: 4,
        sha256: themeDigestV1,
        durationMs: 1000,
      },
      {
        assetId: "audio.test.broken",
        runtimePath: "audio/broken.ogg",
        mediaType: "audio/ogg",
        byteLength: 4,
        sha256: themeDigestV1,
        durationMs: null,
      },
    ],
  );
}

interface FakeContextV1 extends WebAudioContextLikeV1 {
  startedSources(): readonly { assetId: string | null; loop: boolean; stopped: boolean }[];
  setState(state: "suspended" | "running"): void;
}

function createFakeContextV1(initialState: "suspended" | "running"): FakeContextV1 {
  let state: "suspended" | "running" | "closed" = initialState;
  const sources: { assetId: string | null; loop: boolean; stopped: boolean }[] = [];
  const gainNode = () => ({
    gain: {
      value: 1,
      setValueAtTime: () => undefined,
      linearRampToValueAtTime: () => undefined,
      cancelScheduledValues: () => undefined,
    },
    connect: () => undefined,
    disconnect: () => undefined,
  });
  return {
    get state() {
      return state;
    },
    currentTime: 0,
    destination: {},
    resume: () => {
      state = "running";
      return Promise.resolve();
    },
    suspend: () => {
      state = "suspended";
      return Promise.resolve();
    },
    close: () => {
      state = "closed";
      return Promise.resolve();
    },
    createGain: gainNode,
    createBufferSource: () => {
      const record = { assetId: null as string | null, loop: false, stopped: false };
      sources.push(record);
      return {
        buffer: null,
        set loop(value: boolean) {
          record.loop = value;
        },
        get loop() {
          return record.loop;
        },
        connect: () => undefined,
        disconnect: () => undefined,
        start: () => undefined,
        stop: () => {
          record.stopped = true;
        },
        addEventListener: () => undefined,
      };
    },
    decodeAudioData: (bytes: ArrayBuffer) => {
      if (bytes.byteLength === 4 && new Uint8Array(bytes)[0] === 0xff) {
        return Promise.reject(new Error("undecodable bytes"));
      }
      return Promise.resolve({ duration: 1 });
    },
    startedSources: () => sources,
    setState: (next) => {
      state = next;
    },
  };
}

function hostV1(input: {
  readonly contextState?: "suspended" | "running";
  readonly bytesByPath?: Readonly<Record<string, Uint8Array>>;
}) {
  const context = createFakeContextV1(input.contextState ?? "running");
  const diagnostics: AudioHostDiagnosticV1[] = [];
  const bytesByPath = input.bytesByPath ?? {
    "audio/theme.ogg": new Uint8Array([1, 2, 3, 4]),
  };
  const host = createWebAudioHostV1({
    manifest: manifestV1(),
    resolveRuntimeUrl: (runtimePath) => runtimePath,
    createContext: () => context,
    fetchBytes: (url) => {
      const bytes = bytesByPath[url];
      return bytes === undefined
        ? Promise.reject(new Error(`no bytes for ${url}`))
        : Promise.resolve(bytes);
    },
    digestBytes: () => Promise.resolve(themeDigestV1),
    reportDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    unlockTarget: document,
  });
  return { host, context, diagnostics };
}

const flushV1 = async (): Promise<void> => {
  // A macrotask hop drains every pending microtask chain in the load path.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe("createWebAudioHostV1", () => {
  it("plays verified continuous audio when the context is already unlocked", async () => {
    const { host, context, diagnostics } = hostV1({});
    host.play({
      channel: "bgm",
      assetId: "audio.test.theme",
      loop: true,
      gainPermille: 800,
      fadeMs: 0,
    });
    await flushV1();
    expect(context.startedSources()).toHaveLength(1);
    expect(context.startedSources()[0]?.loop).toBe(true);
    expect(diagnostics).toEqual([]);
    host.dispose();
  });

  it("queues continuous playback until a gesture unlocks autoplay, dropping one-shots", async () => {
    const { host, context, diagnostics } = hostV1({ contextState: "suspended" });
    host.play({
      channel: "bgm",
      assetId: "audio.test.theme",
      loop: true,
      gainPermille: 1000,
      fadeMs: 0,
    });
    host.playEffect({ assetId: "audio.test.theme", gainPermille: 1000 });
    await flushV1();
    expect(context.startedSources()).toHaveLength(0);
    expect(diagnostics.map(({ code }) => code)).toEqual([
      "audio.autoplay_denied",
      "audio.autoplay_denied",
    ]);

    // The first user gesture unlocks the context and applies the queued
    // continuous channel; the dropped effect is not replayed.
    document.dispatchEvent(new Event("pointerdown"));
    await flushV1();
    expect(context.state).toBe("running");
    expect(context.startedSources()).toHaveLength(1);
    host.dispose();
  });

  it("degrades silently with diagnostics for missing, corrupt, and undecodable media", async () => {
    const { host, context, diagnostics } = hostV1({
      bytesByPath: {
        // Wrong byte length for theme: integrity mismatch.
        "audio/theme.ogg": new Uint8Array([1, 2, 3]),
        // Undecodable bytes for the broken sfx.
        "audio/broken.ogg": new Uint8Array([0xff, 0, 0, 0]),
      },
    });

    // Silence-fallback entries play nothing and report nothing.
    host.play({
      channel: "ambient",
      assetId: "audio.test.silent",
      loop: true,
      gainPermille: 500,
      fadeMs: 0,
    });
    // Unknown asset id.
    host.playEffect({ assetId: "audio.test.ghost", gainPermille: 1000 });
    // Integrity mismatch never registers ready.
    host.play({
      channel: "bgm",
      assetId: "audio.test.theme",
      loop: true,
      gainPermille: 1000,
      fadeMs: 0,
    });
    // Decode failure.
    host.playEffect({ assetId: "audio.test.broken", gainPermille: 1000 });
    await flushV1();

    expect(context.startedSources()).toHaveLength(0);
    expect(diagnostics.map(({ code, assetId }) => `${code}:${String(assetId)}`)).toEqual([
      "audio.asset_missing:audio.test.ghost",
      "audio.integrity_mismatch:audio.test.theme",
      "audio.decode_failed:audio.test.broken",
    ]);
    host.dispose();
  });

  it("suspends, resumes, and disposes the context with page lifecycle", async () => {
    const { host, context } = hostV1({});
    host.play({
      channel: "bgm",
      assetId: "audio.test.theme",
      loop: true,
      gainPermille: 1000,
      fadeMs: 0,
    });
    await flushV1();

    host.suspend();
    await flushV1();
    expect(context.state).toBe("suspended");
    host.resume();
    await flushV1();
    expect(context.state).toBe("running");

    host.dispose();
    await flushV1();
    expect(context.state).toBe("closed");
    expect(context.startedSources().every((source) => source.stopped)).toBe(true);
  });

  it("retries a failed load on the next demand instead of caching the failure", async () => {
    const bytes = new Map<string, Uint8Array>();
    const context = createFakeContextV1("running");
    const diagnostics: AudioHostDiagnosticV1[] = [];
    const fetchBytes = vi.fn((url: string) => {
      const found = bytes.get(url);
      return found === undefined
        ? Promise.reject(new Error("network down"))
        : Promise.resolve(found);
    });
    const host = createWebAudioHostV1({
      manifest: manifestV1(),
      resolveRuntimeUrl: (runtimePath) => runtimePath,
      createContext: () => context,
      fetchBytes,
      digestBytes: () => Promise.resolve(themeDigestV1),
      reportDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
      unlockTarget: document,
    });

    host.playEffect({ assetId: "audio.test.theme", gainPermille: 1000 });
    await flushV1();
    expect(context.startedSources()).toHaveLength(0);

    // The network recovers; a NEW demand opens a new load cycle.
    bytes.set("audio/theme.ogg", new Uint8Array([1, 2, 3, 4]));
    host.playEffect({ assetId: "audio.test.theme", gainPermille: 1000 });
    await flushV1();
    expect(fetchBytes).toHaveBeenCalledTimes(2);
    expect(context.startedSources()).toHaveLength(1);
    host.dispose();
  });
});
