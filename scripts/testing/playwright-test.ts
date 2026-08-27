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
 * decoding, and playback lifecycle, but route its final device output through
 * a zero-gain sink by default so headed WebKit/Firefox runs stay silent.
 * Chromium's Playwright launch also supplies `--mute-audio`.
 */
export const test = base.extend<BrowserAudioOptionsV1 & BrowserAudioFixturesV1>({
  audibleAudio: [false, { option: true }],
  silenceBrowserAudio: [
    async ({ audibleAudio, context }, use) => {
      if (!audibleAudio) {
        await context.addInitScript(() => {
          interface BrowserAudioContextV1 {
            readonly destination: unknown;
            createGain(): BrowserAudioGainV1;
          }
          interface BrowserAudioNodeV1 {
            readonly context: BrowserAudioContextV1;
          }
          interface BrowserAudioGainV1 extends BrowserAudioNodeV1 {
            readonly gain: { value: number };
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
          const silentSinks = new WeakMap<object, BrowserAudioGainV1>();
          audioNode.prototype.connect = function (
            this: BrowserAudioNodeV1,
            destination: unknown,
          ): unknown {
            if (destination === this.context.destination) {
              let sink = silentSinks.get(this.context);
              if (sink === undefined) {
                sink = this.context.createGain();
                sink.gain.value = 0;
                Reflect.apply(nativeConnect, sink, [destination]);
                silentSinks.set(this.context, sink);
              }
              const output = arguments[1];
              Reflect.apply(nativeConnect, this, output === undefined ? [sink] : [sink, output, 0]);
              return destination;
            }
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
