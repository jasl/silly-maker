// SPDX-License-Identifier: MIT
import type { Page } from "@playwright/test";

import { expect, test, vnReferenceTourTargetUrlV1 } from "./fixtures.ts";

const automationKeyV1 = "__SILLYMAKER_AUTOMATION_V1__";
const oldCallAssetIdV1 = "voice.vn-reference-tour.zhou-old-call";
const authoredAudioPathsV1 = [
  "/assets/audio/bgm-last-shift.mp3",
  "/assets/audio/ambient-control-room.mp3",
  "/assets/audio/ambient-rooftop.mp3",
  "/assets/audio/sfx-tape.mp3",
  "/assets/audio/sfx-switch.mp3",
  "/assets/audio/sfx-relay.mp3",
  "/assets/audio/voice-old-call.mp3",
  "/assets/audio/voice-present-sent.mp3",
] as const;

interface VnPublicationV1 {
  readonly revision: number;
  readonly game: {
    readonly audio: {
      readonly voice: { readonly assetId: string } | null;
    };
  };
  readonly narrative: {
    readonly pending: { readonly kind: string; readonly occurrenceId: string } | null;
  };
}

async function observeV1(page: Page): Promise<VnPublicationV1> {
  const result = await page.evaluate((key) => {
    const automation = Reflect.get(globalThis, key) as
      | { observe(): { readonly kind: string; readonly value?: unknown } }
      | undefined;
    return automation?.observe() ?? { kind: "capability_disabled" };
  }, automationKeyV1);
  expect(result.kind).toBe("ok");
  return result.value as VnPublicationV1;
}

async function advanceCurrentSayV1(page: Page, pending: {
  readonly occurrenceId: string;
}): Promise<void> {
  const result = await page.evaluate(
    async ({ key, occurrenceId }) => {
      const automation = Reflect.get(globalThis, key) as
        | { dispatch(invocation: unknown): Promise<{ readonly kind: string }> }
        | undefined;
      if (automation === undefined) throw new TypeError("automation bridge unavailable");
      return await automation.dispatch({
        kind: "resolve",
        expectedOccurrenceId: occurrenceId,
        resolution: { kind: "advance" },
      });
    },
    { key: automationKeyV1, occurrenceId: pending.occurrenceId },
  );
  expect(result.kind).toBe("ok");
}

async function reachOldCallV1(page: Page): Promise<VnPublicationV1> {
  await page.goto(vnReferenceTourTargetUrlV1("?capability=automation_bridge"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );

  for (let step = 0; step < 24; step += 1) {
    const publication = await observeV1(page);
    if (publication.game.audio.voice?.assetId === oldCallAssetIdV1) return publication;
    const pending = publication.narrative.pending;
    if (pending?.kind === "say") {
      await advanceCurrentSayV1(page, pending);
      continue;
    }
    // Stage barriers acknowledge through the real mounted Stage host.
    if (pending?.kind === "presentation_barrier") {
      await page.waitForTimeout(450);
      continue;
    }
    throw new TypeError(`unexpected VN boundary before old call: ${pending?.kind ?? "none"}`);
  }
  throw new TypeError("old-call voice boundary was not reached");
}

test("the frozen VN audio denominator decodes in Browser", async ({ page }) => {
  await page.goto(vnReferenceTourTargetUrlV1());
  await page.getByRole("button", { name: "新游戏" }).click();
  const decoded = await page.evaluate(async (paths) => {
    const context = new AudioContext();
    await context.resume();
    try {
      return await Promise.all(paths.map(async (path) => {
        const response = await fetch(path);
        if (!response.ok) return { path, status: response.status, duration: null };
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        return { path, status: response.status, duration: buffer.duration };
      }));
    } finally {
      await context.close();
    }
  }, authoredAudioPathsV1);
  expect(decoded.map(({ path }) => path)).toEqual(authoredAudioPathsV1);
  expect(decoded.every(({ status, duration }) => status === 200 && (duration ?? 0) > 0)).toBe(true);
});

test("VN audio unlocks and Player Auto waits for replayed current voice", async ({ page }) => {
  const loadedAudio = new Set<string>();
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (response.ok() && pathname.endsWith(".mp3")) loadedAudio.add(pathname);
  });

  const publication = await reachOldCallV1(page);
  const occurrenceId = publication.narrative.pending?.occurrenceId;
  if (occurrenceId === undefined) throw new TypeError("old-call occurrence missing");
  // The game mounted after the New Game gesture. This is the first gesture
  // the mounted Player can use to unlock a suspended AudioContext; browsers
  // that already run the context may have loaded the same demand sooner.
  await page.getByRole("button", { name: "语音" }).click();
  await expect.poll(() => loadedAudio.has("/assets/audio/voice-old-call.mp3")).toBe(true);
  expect(loadedAudio).toContain("/assets/audio/bgm-last-shift.mp3");
  expect(loadedAudio).toContain("/assets/audio/ambient-control-room.mp3");

  // Let the first playback finish, then prove an explicit replay establishes
  // a fresh full voice lifetime rather than relying on the unlock playback.
  await page.waitForTimeout(6_300);
  await page.getByRole("button", { name: "语音" }).click();
  await page.getByRole("button", { name: "自动" }).click();
  await page.waitForTimeout(2_000);
  expect((await observeV1(page)).narrative.pending?.occurrenceId).toBe(occurrenceId);
  await page.waitForFunction(
    ({ key, expectedOccurrenceId }) => {
      const automation = Reflect.get(globalThis, key) as
        | { observe(): { readonly kind: string; readonly value?: unknown } }
        | undefined;
      const current = automation?.observe().value as VnPublicationV1 | undefined;
      return current?.narrative.pending?.occurrenceId !== expectedOccurrenceId;
    },
    { key: automationKeyV1, expectedOccurrenceId: occurrenceId },
    { timeout: 10_000 },
  );
});

test("unreadable current voice degrades to silence and does not park Auto", async ({ page }) => {
  await page.route(
    "**/assets/audio/voice-old-call.mp3",
    (route) =>
      route.fulfill({ status: 200, contentType: "audio/mpeg", body: "not an audio stream" }),
  );
  const publication = await reachOldCallV1(page);
  const occurrenceId = publication.narrative.pending?.occurrenceId;
  if (occurrenceId === undefined) throw new TypeError("old-call occurrence missing");

  await page.getByRole("button", { name: "语音" }).click();
  await page.getByRole("button", { name: "自动" }).click();
  await expect.poll(
    async () => (await observeV1(page)).narrative.pending?.occurrenceId,
    { timeout: 4_000 },
  ).not.toBe(occurrenceId);
});
