// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  appendPetWandPointV1,
  beginPetWandRoundV1,
  finishPetWandRoundV1,
} from "./pet-wand-round.ts";
import type { PetWandPointV1, PetWandRoundV1 } from "./pet-wand-round.ts";

function roundV1(points: readonly PetWandPointV1[]): PetWandRoundV1 {
  const [first, ...rest] = points;
  if (first === undefined) throw new TypeError("wand round requires a starting point");
  return rest.reduce(appendPetWandPointV1, beginPetWandRoundV1(first));
}

describe("pet wand round", () => {
  it("does not turn a tap or short movement into a catch", () => {
    expect(finishPetWandRoundV1(roundV1([{ x: 10, y: 10 }]), "release")).toBe("missed");
    expect(
      finishPetWandRoundV1(
        roundV1([{ x: 10, y: 10 }, { x: 18, y: 10 }, { x: 11, y: 10 }]),
        "release",
      ),
    ).toBe("missed");
  });

  it("requires a deliberate return instead of accepting one long sweep", () => {
    expect(
      finishPetWandRoundV1(
        roundV1([{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 100, y: 10 }]),
        "release",
      ),
    ).toBe("missed");
  });

  it("classifies clear horizontal and vertical out-and-back movement as caught", () => {
    expect(
      finishPetWandRoundV1(
        roundV1([{ x: 10, y: 10 }, { x: 54, y: 10 }, { x: 16, y: 10 }]),
        "release",
      ),
    ).toBe("caught");
    expect(
      finishPetWandRoundV1(
        roundV1([{ x: 10, y: 10 }, { x: 10, y: 56 }, { x: 10, y: 14 }]),
        "release",
      ),
    ).toBe("caught");
  });

  it("does not let sub-threshold jitter manufacture a reversal", () => {
    expect(
      finishPetWandRoundV1(
        roundV1([
          { x: 10, y: 10 },
          { x: 40, y: 10 },
          { x: 38.5, y: 10 },
          { x: 40, y: 10 },
          { x: 38.5, y: 10 },
        ]),
        "release",
      ),
    ).toBe("missed");
  });

  it("classifies cancellation independently of accumulated movement", () => {
    const round = roundV1([{ x: 10, y: 10 }, { x: 60, y: 10 }, { x: 20, y: 10 }]);
    expect(finishPetWandRoundV1(round, "cancel")).toBe("ended_early");
  });
});
