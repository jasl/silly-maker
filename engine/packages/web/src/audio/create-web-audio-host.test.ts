// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { resolveAudioManifestV1 } from "@sillymaker/base";
import type { AudioHostDiagnosticV1 } from "@sillymaker/ui";

import type { WebAudioContextLikeV1 } from "./create-web-audio-host.ts";
import { createWebAudioHostV1 } from "./create-web-audio-host.ts";

function manifestV1() {
  return resolveAudioManifestV1(
    [
      { assetId: "audio.test.theme", kind: "music", fallback: "silence", loadGroup: "bootstrap" },
      { assetId: "audio.test.alternate", kind: "music", fallback: "silence", loadGroup: "scene" },
      { assetId: "audio.test.silent", kind: "ambient", fallback: "silence", loadGroup: "scene" },
      { assetId: "audio.test.broken", kind: "sfx", fallback: "silence", loadGroup: "on_demand" },
    ],
    [
      {
        assetId: "audio.test.theme",
        runtimePath: "audio/theme.ogg",
        mediaType: "audio/ogg",
        durationMs: 1000,
      },
      {
        assetId: "audio.test.alternate",
        runtimePath: "audio/alternate.ogg",
        mediaType: "audio/ogg",
        durationMs: 1000,
      },
      {
        assetId: "audio.test.broken",
        runtimePath: "audio/broken.ogg",
        mediaType: "audio/ogg",
        durationMs: null,
      },
    ],
  );
}

interface FakeContextV1 extends WebAudioContextLikeV1 {
  startedSources(): readonly {
    assetId: string | null;
    loop: boolean;
    stopped: boolean;
    readonly stopCalls: readonly (number | undefined)[];
    readonly disconnected: boolean;
    readonly gainDisconnected: boolean;
    finish(): void;
  }[];
  setState(state: "suspended" | "running"): void;
}

function createFakeContextV1(
  initialState: "suspended" | "running",
  decodeAudioData?: (bytes: ArrayBuffer) => Promise<{ readonly duration: number }>,
  resumeContext?: () => Promise<void>,
): FakeContextV1 {
  let state: "suspended" | "running" | "closed" = initialState;
  const sources: {
    assetId: string | null;
    loop: boolean;
    stopped: boolean;
    readonly stopCalls: readonly (number | undefined)[];
    readonly disconnected: boolean;
    readonly gainDisconnected: boolean;
    finish(): void;
  }[] = [];
  const gainNode = () => {
    let disconnected = false;
    return {
      gain: {
        value: 1,
        setValueAtTime: () => undefined,
        linearRampToValueAtTime: () => undefined,
        cancelScheduledValues: () => undefined,
      },
      connect: () => undefined,
      disconnect: () => {
        disconnected = true;
      },
      get disconnected() {
        return disconnected;
      },
    };
  };
  return {
    get state() {
      return state;
    },
    currentTime: 0,
    destination: {},
    resume: () => {
      if (resumeContext !== undefined) return resumeContext();
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
      const endedListeners: Array<() => void> = [];
      const stopCalls: Array<number | undefined> = [];
      let disconnected = false;
      let connectedGain: { readonly disconnected: boolean } | null = null;
      const record = {
        assetId: null as string | null,
        loop: false,
        stopped: false,
        stopCalls,
        get disconnected() {
          return disconnected;
        },
        get gainDisconnected() {
          return connectedGain?.disconnected ?? false;
        },
        finish(): void {
          for (const listener of endedListeners.splice(0)) listener();
        },
      };
      sources.push(record);
      return {
        buffer: null,
        set loop(value: boolean) {
          record.loop = value;
        },
        get loop() {
          return record.loop;
        },
        connect: (target: unknown) => {
          connectedGain = target as { readonly disconnected: boolean };
        },
        disconnect: () => {
          disconnected = true;
        },
        start: () => undefined,
        stop: (when?: number) => {
          record.stopped = true;
          stopCalls.push(when);
        },
        addEventListener: (_type: "ended", listener: () => void) => {
          endedListeners.push(listener);
        },
      };
    },
    decodeAudioData: decodeAudioData ?? ((bytes: ArrayBuffer) => {
      if (bytes.byteLength === 4 && new Uint8Array(bytes)[0] === 0xff) {
        return Promise.reject(new Error("undecodable bytes"));
      }
      return Promise.resolve({ duration: 1 });
    }),
    startedSources: () => sources,
    setState: (next) => {
      state = next;
    },
  };
}

function hostV1(input: {
  readonly contextState?: "suspended" | "running";
  readonly bytesByPath?: Readonly<Record<string, Uint8Array>>;
  readonly decodeAudioData?: (bytes: ArrayBuffer) => Promise<{ readonly duration: number }>;
  readonly fetchBytes?: (url: string) => Promise<Uint8Array>;
  readonly resumeContext?: () => Promise<void>;
}) {
  const context = createFakeContextV1(
    input.contextState ?? "running",
    input.decodeAudioData,
    input.resumeContext,
  );
  const diagnostics: AudioHostDiagnosticV1[] = [];
  const bytesByPath = input.bytesByPath ?? {
    "audio/theme.ogg": new Uint8Array([1, 2, 3, 4]),
  };
  const host = createWebAudioHostV1({
    manifest: manifestV1(),
    resolveRuntimeUrl: (runtimePath) => runtimePath,
    createContext: () => context,
    fetchBytes: input.fetchBytes ?? ((url) => {
      const bytes = bytesByPath[url];
      return bytes === undefined
        ? Promise.reject(new Error(`no bytes for ${url}`))
        : Promise.resolve(bytes);
    }),
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

function deferredV1<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("createWebAudioHostV1", () => {
  it("plays decoded continuous audio when the context is already unlocked", async () => {
    const { host, context, diagnostics } = hostV1({});
    host.play({
      channel: "bgm",
      assetId: "audio.test.theme",
      loop: true,
      gainPermille: 800,
      fadeMs: 0,
    });
    expect(host.isChannelActive("bgm")).toBe(true);
    await flushV1();
    expect(context.startedSources()).toHaveLength(1);
    expect(context.startedSources()[0]?.loop).toBe(true);
    expect(host.isChannelActive("bgm")).toBe(true);
    expect(diagnostics).toEqual([]);
    context.startedSources()[0]?.finish();
    expect(host.isChannelActive("bgm")).toBe(false);
    host.dispose();
  });

  it("keeps the current continuous retarget when an obsolete load resolves later", async () => {
    const themeBytes = deferredV1<Uint8Array>();
    const alternateBytes = deferredV1<Uint8Array>();
    const { host, context } = hostV1({
      fetchBytes: (url) => {
        if (url === "audio/theme.ogg") return themeBytes.promise;
        if (url === "audio/alternate.ogg") return alternateBytes.promise;
        return Promise.reject(new Error(`unexpected audio URL ${url}`));
      },
    });

    host.play({
      channel: "bgm",
      assetId: "audio.test.theme",
      loop: true,
      gainPermille: 1000,
      fadeMs: 0,
    });
    host.play({
      channel: "bgm",
      assetId: "audio.test.alternate",
      loop: true,
      gainPermille: 1000,
      fadeMs: 0,
    });
    expect(host.isChannelActive("bgm")).toBe(true);

    alternateBytes.resolve(new Uint8Array([5, 6, 7, 8]));
    await flushV1();
    const currentSource = context.startedSources()[0];
    expect(currentSource).toBeDefined();
    expect(currentSource?.stopped).toBe(false);

    themeBytes.resolve(new Uint8Array([1, 2, 3, 4]));
    await flushV1();
    expect(context.startedSources()).toEqual([currentSource]);
    expect(currentSource?.stopped).toBe(false);
    expect(host.isChannelActive("bgm")).toBe(true);
    host.dispose();
  });

  it("keeps replacement activity when the stopped predecessor ends late", async () => {
    const { host, context } = hostV1({
      bytesByPath: {
        "audio/theme.ogg": new Uint8Array([1, 2, 3, 4]),
        "audio/alternate.ogg": new Uint8Array([5, 6, 7, 8]),
      },
    });
    host.play({
      channel: "voice",
      assetId: "audio.test.theme",
      loop: false,
      gainPermille: 1000,
      fadeMs: 0,
    });
    await flushV1();
    const predecessor = context.startedSources()[0];

    host.play({
      channel: "voice",
      assetId: "audio.test.alternate",
      loop: false,
      gainPermille: 1000,
      fadeMs: 0,
    });
    await flushV1();
    const successor = context.startedSources()[1];
    expect(predecessor?.stopped).toBe(true);
    expect(host.isChannelActive("voice")).toBe(true);

    predecessor?.finish();
    expect(host.isChannelActive("voice")).toBe(true);
    successor?.finish();
    expect(host.isChannelActive("voice")).toBe(false);
    host.dispose();
  });

  it("restarts the same voice asset for an explicit replay demand", async () => {
    const { host, context } = hostV1({});
    const input = {
      channel: "voice" as const,
      assetId: "audio.test.theme",
      loop: false,
      gainPermille: 1000,
      fadeMs: 0,
    };
    host.play(input);
    await flushV1();
    const first = context.startedSources()[0];

    host.play(input);
    await flushV1();
    const replay = context.startedSources()[1];
    expect(first?.stopped).toBe(true);
    expect(replay?.stopped).toBe(false);
    expect(host.isChannelActive("voice")).toBe(true);

    first?.finish();
    expect(host.isChannelActive("voice")).toBe(true);
    replay?.finish();
    expect(host.isChannelActive("voice")).toBe(false);
    host.dispose();
  });

  it("keeps at most one retiring fade per channel", async () => {
    const { host, context } = hostV1({});
    host.play({
      channel: "voice",
      assetId: "audio.test.theme",
      loop: false,
      gainPermille: 1000,
      fadeMs: 0,
    });
    await flushV1();
    const retiring = context.startedSources()[0];

    host.stop("voice", Number.MAX_SAFE_INTEGER);
    expect(retiring?.disconnected).toBe(false);
    expect(retiring?.gainDisconnected).toBe(false);
    expect(retiring?.stopCalls).toEqual([Number.MAX_SAFE_INTEGER / 1000]);

    host.stop("voice", 0);
    expect(retiring?.stopCalls).toEqual([Number.MAX_SAFE_INTEGER / 1000, undefined]);
    expect(retiring?.disconnected).toBe(true);
    expect(retiring?.gainDisconnected).toBe(true);
    host.dispose();
  });

  it("releases a retiring fade when replacement playback is demanded", async () => {
    const { host, context } = hostV1({
      bytesByPath: {
        "audio/theme.ogg": new Uint8Array([1, 2, 3, 4]),
        "audio/alternate.ogg": new Uint8Array([5, 6, 7, 8]),
      },
    });
    host.play({
      channel: "bgm",
      assetId: "audio.test.theme",
      loop: true,
      gainPermille: 1000,
      fadeMs: 0,
    });
    await flushV1();
    const retiring = context.startedSources()[0];
    host.stop("bgm", Number.MAX_SAFE_INTEGER);

    host.play({
      channel: "bgm",
      assetId: "audio.test.alternate",
      loop: true,
      gainPermille: 1000,
      fadeMs: 0,
    });
    expect(retiring?.disconnected).toBe(true);
    expect(retiring?.gainDisconnected).toBe(true);
    await flushV1();
    expect(context.startedSources()).toHaveLength(2);
    host.dispose();
  });

  it("releases a retiring fade when the host is disposed", async () => {
    const { host, context } = hostV1({});
    host.play({
      channel: "ambient",
      assetId: "audio.test.theme",
      loop: true,
      gainPermille: 1000,
      fadeMs: 0,
    });
    await flushV1();
    const retiring = context.startedSources()[0];
    host.stop("ambient", Number.MAX_SAFE_INTEGER);

    host.dispose();
    expect(retiring?.disconnected).toBe(true);
    expect(retiring?.gainDisconnected).toBe(true);
  });

  it("does not start a continuous channel stopped while decode is pending", async () => {
    const decodeStarted = deferredV1<void>();
    const decoded = deferredV1<{ readonly duration: number }>();
    const { host, context } = hostV1({
      decodeAudioData: () => {
        decodeStarted.resolve();
        return decoded.promise;
      },
    });

    host.play({
      channel: "voice",
      assetId: "audio.test.theme",
      loop: false,
      gainPermille: 1000,
      fadeMs: 0,
    });
    expect(host.isChannelActive("voice")).toBe(true);
    await decodeStarted.promise;
    host.stop("voice", 0);
    expect(host.isChannelActive("voice")).toBe(false);
    decoded.resolve({ duration: 1 });
    await flushV1();

    expect(context.startedSources()).toHaveLength(0);
    expect(host.isChannelActive("voice")).toBe(false);
    host.dispose();
  });

  it("does not start a pending continuous channel or effect after disposal", async () => {
    const themeBytes = deferredV1<Uint8Array>();
    const effectBytes = deferredV1<Uint8Array>();
    const { host, context } = hostV1({
      fetchBytes: (url) => {
        if (url === "audio/theme.ogg") return themeBytes.promise;
        if (url === "audio/broken.ogg") return effectBytes.promise;
        return Promise.reject(new Error(`unexpected audio URL ${url}`));
      },
    });

    host.play({
      channel: "bgm",
      assetId: "audio.test.theme",
      loop: true,
      gainPermille: 1000,
      fadeMs: 0,
    });
    expect(host.isChannelActive("bgm")).toBe(true);
    host.playEffect({ assetId: "audio.test.broken", gainPermille: 1000 });
    host.dispose();
    expect(host.isChannelActive("bgm")).toBe(false);
    themeBytes.resolve(new Uint8Array([1, 2, 3, 4]));
    effectBytes.resolve(new Uint8Array([5, 6, 7, 8]));
    await flushV1();

    expect(context.startedSources()).toHaveLength(0);
    expect(context.state).toBe("closed");
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
    expect(host.isChannelActive("bgm")).toBe(true);
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
    expect(host.isChannelActive("bgm")).toBe(true);
    host.dispose();
  });

  it("prepares a suspended context on visible mount without reporting autoplay failure", async () => {
    const { host, context, diagnostics } = hostV1({ contextState: "suspended" });

    host.resume();
    expect(context.state).toBe("suspended");
    expect(context.startedSources()).toHaveLength(0);
    expect(diagnostics).toEqual([]);

    document.dispatchEvent(new Event("pointerdown"));
    await flushV1();
    expect(context.state).toBe("running");

    host.play({
      channel: "bgm",
      assetId: "audio.test.theme",
      loop: true,
      gainPermille: 1000,
      fadeMs: 0,
    });
    await flushV1();
    expect(context.startedSources()).toHaveLength(1);
    expect(diagnostics).toEqual([]);
    host.dispose();
  });

  it("ends pending activity when gesture unlock fails", async () => {
    const { host, diagnostics } = hostV1({
      contextState: "suspended",
      resumeContext: () => Promise.reject(new Error("gesture rejected")),
    });
    host.play({
      channel: "voice",
      assetId: "audio.test.theme",
      loop: false,
      gainPermille: 1000,
      fadeMs: 0,
    });
    expect(host.isChannelActive("voice")).toBe(true);

    document.dispatchEvent(new Event("pointerdown"));
    await flushV1();
    expect(host.isChannelActive("voice")).toBe(false);
    expect(diagnostics.map(({ code }) => code)).toEqual([
      "audio.autoplay_denied",
      "audio.autoplay_denied",
    ]);
    host.dispose();
  });

  it("ends current demand when continuous media is missing or undecodable", async () => {
    const { host, context, diagnostics } = hostV1({
      bytesByPath: {
        "audio/theme.ogg": new Uint8Array([1, 2, 3, 4]),
        "audio/broken.ogg": new Uint8Array([0xff, 0, 0, 0]),
      },
    });
    host.play({
      channel: "voice",
      assetId: "audio.test.ghost",
      loop: false,
      gainPermille: 1000,
      fadeMs: 0,
    });
    expect(host.isChannelActive("voice")).toBe(true);
    await flushV1();
    expect(host.isChannelActive("voice")).toBe(false);

    host.play({
      channel: "voice",
      assetId: "audio.test.broken",
      loop: false,
      gainPermille: 1000,
      fadeMs: 0,
    });
    expect(host.isChannelActive("voice")).toBe(true);
    await flushV1();
    expect(host.isChannelActive("voice")).toBe(false);
    expect(context.startedSources()).toHaveLength(0);
    expect(diagnostics.map(({ code }) => code)).toEqual([
      "audio.asset_missing",
      "audio.decode_failed",
    ]);
    host.dispose();
  });

  it("accepts replacement bytes and degrades missing or undecodable media", async () => {
    const { host, context, diagnostics } = hostV1({
      bytesByPath: {
        // A same-path local replacement need not match an author-maintained receipt.
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
    expect(host.isChannelActive("ambient")).toBe(true);
    // Unknown asset id.
    host.playEffect({ assetId: "audio.test.ghost", gainPermille: 1000 });
    // Replacement bytes decode and play normally.
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

    expect(context.startedSources()).toHaveLength(1);
    expect(host.isChannelActive("ambient")).toBe(false);
    expect(diagnostics.map(({ code, assetId }) => `${code}:${String(assetId)}`)).toEqual([
      "audio.asset_missing:audio.test.ghost",
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
