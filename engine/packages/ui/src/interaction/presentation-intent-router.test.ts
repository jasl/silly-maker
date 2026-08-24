// SPDX-License-Identifier: MIT
import { parseInteractionSurfaceId, type InteractionSurfaceId } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import type { PresentationIntentV1 } from "./contracts.ts";
import { createPresentationIntentRouterV1 } from "./presentation-intent-router.ts";

const profileOverlayIdV1 = "overlay.e2e.profile";
const profileSurfaceIdV1 = parseInteractionSurfaceId("surface.e2e.profile");
const greetingCueIdV1 = "cue.e2e.greeting";

type PresentationWriteV1 =
  | { readonly kind: "overlay.open"; readonly overlayId: string }
  | {
    readonly kind: "interaction.enter_surface";
    readonly surfaceId: InteractionSurfaceId;
    readonly returnFocusId: string | null;
  }
  | { readonly kind: "interaction.leave_surface" }
  | { readonly kind: "presentation.play_cue"; readonly cueId: string };

function createPresentationIntentRouterFixtureV1() {
  const writes: PresentationWriteV1[] = [];
  const router = createPresentationIntentRouterV1({
    knownOverlayIds: [profileOverlayIdV1],
    knownSurfaceIds: [profileSurfaceIdV1],
    knownCueIds: [greetingCueIdV1],
    overlay: {
      open(overlayId: string) {
        writes.push({ kind: "overlay.open", overlayId });
        return { kind: "unchanged" as const, code: "overlay.already_open" as const };
      },
    },
    session: {
      open(surfaceId: InteractionSurfaceId, returnFocusId: string | null): void {
        writes.push(
          {
            kind: "interaction.enter_surface",
            surfaceId,
            returnFocusId,
          },
        );
      },
      leave(): void {
        writes.push({ kind: "interaction.leave_surface" });
      },
    },
    cue: {
      play(cueId: string): void {
        writes.push({ kind: "presentation.play_cue", cueId });
      },
    },
  });
  return {
    router,
    writes: () => [...writes],
  };
}

describe("createPresentationIntentRouterV1", () => {
  it.each(
    [
      [
        { kind: "overlay.open", overlayId: profileOverlayIdV1 },
        { returnFocusId: "control.e2e.ignored-overlay" },
        { kind: "overlay.open", overlayId: profileOverlayIdV1 },
      ],
      [
        { kind: "interaction.enter_surface", surfaceId: profileSurfaceIdV1 },
        { returnFocusId: "control.e2e.profile" },
        {
          kind: "interaction.enter_surface",
          surfaceId: profileSurfaceIdV1,
          returnFocusId: "control.e2e.profile",
        },
      ],
      [
        { kind: "interaction.leave_surface" },
        { returnFocusId: "control.e2e.ignored-leave" },
        { kind: "interaction.leave_surface" },
      ],
      [
        { kind: "presentation.play_cue", cueId: greetingCueIdV1 },
        { returnFocusId: "control.e2e.ignored-cue" },
        { kind: "presentation.play_cue", cueId: greetingCueIdV1 },
      ],
    ] as const,
  )(
    "routes one known closed intent without touching another lens: %o",
    (intent, context, write) => {
      const fixture = createPresentationIntentRouterFixtureV1();

      const result = fixture.router.execute(intent satisfies PresentationIntentV1, context);

      expect(result).toEqual({ kind: "executed" });
      expect(fixture.writes()).toEqual([write]);
    },
  );

  it.each(
    [
      { kind: "overlay.open", overlayId: "overlay.e2e.unknown" },
      {
        kind: "interaction.enter_surface",
        surfaceId: parseInteractionSurfaceId("surface.e2e.unknown"),
      },
      { kind: "presentation.play_cue", cueId: "cue.e2e.unknown" },
    ] as const,
  )("rejects an unknown registered-ID intent with zero writes: %o", (intent) => {
    const fixture = createPresentationIntentRouterFixtureV1();

    const result = fixture.router.execute(intent satisfies PresentationIntentV1, {
      returnFocusId: "control.e2e.unknown",
    });

    expect(result).toEqual({ kind: "rejected", code: "presentation.intent_unknown" });
    expect(fixture.writes()).toEqual([]);
  });

  it("propagates a known Overlay's structured admission rejection", () => {
    const router = createPresentationIntentRouterV1({
      knownOverlayIds: [profileOverlayIdV1],
      knownSurfaceIds: [],
      knownCueIds: [],
      overlay: {
        open: () => ({
          kind: "rejected" as const,
          code: "overlay.required_port_missing" as const,
          portId: "port.e2e.profile",
        }),
      },
      session: { open: () => undefined, leave: () => undefined },
      cue: { play: () => undefined },
    });

    expect(router.execute({ kind: "overlay.open", overlayId: profileOverlayIdV1 })).toEqual({
      kind: "rejected",
      code: "overlay.required_port_missing",
      portId: "port.e2e.profile",
    });
  });
});
