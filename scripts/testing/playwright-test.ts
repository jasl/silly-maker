// SPDX-License-Identifier: MIT
import { expect, test as base } from "@playwright/test";

interface BrowserAudioOptionsV1 {
  /** Opt in only when a browser test genuinely needs audible device output. */
  readonly audibleAudio: boolean;
}

interface BrowserAudioFixturesV1 {
  readonly silenceBrowserAudio: undefined;
}

/**
 * The repository's Playwright base. Tests exercise the real browser audio graph,
 * decoding, and playback lifecycle, but disconnect its final device output by
 * default so headed WebKit/Firefox runs stay silent. Chromium's own Playwright
 * launch already supplies `--mute-audio`; this covers every maintained engine.
 */
export const test = base.extend<BrowserAudioOptionsV1 & BrowserAudioFixturesV1>({
  audibleAudio: [false, { option: true }],
  silenceBrowserAudio: [
    async ({ audibleAudio, context }, use) => {
      if (!audibleAudio) {
        await context.addInitScript(() => {
          interface BrowserAudioNodeV1 {
            readonly context: { readonly destination: unknown };
          }
          type BrowserAudioConnectV1 = (
            this: BrowserAudioNodeV1,
            ...args: readonly unknown[]
          ) => unknown;
          const audioNode = (globalThis as unknown as {
            readonly AudioNode?: {
              readonly prototype: { connect: BrowserAudioConnectV1 };
            };
          }).AudioNode;
          if (audioNode === undefined) return;
          const nativeConnect = audioNode.prototype.connect;
          audioNode.prototype.connect = function (
            this: BrowserAudioNodeV1,
            destination: unknown,
          ): unknown {
            if (destination === this.context.destination) return destination;
            return Reflect.apply(nativeConnect, this, arguments);
          } as BrowserAudioConnectV1;
        });
      }
      await use(undefined);
    },
    { auto: true },
  ],
});

export { expect };
