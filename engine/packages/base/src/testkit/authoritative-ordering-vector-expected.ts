// SPDX-License-Identifier: MIT

/**
 * Hand-authored DET2e oracle. The string vectors below are written directly in
 * accepted UTF-16 code-unit order; this module must never sort or call a
 * comparator to derive its expected data.
 *
 * @internal Direct-file-only test oracle; intentionally absent from barrels.
 */
export const authoritativeOrderingVectorExpectedV1 = {
  eventPool: {
    ordinary: {
      result: {
        kind: "drawn",
        eventId: "event.alpha",
        explanation: {
          considered: 3,
          eligible: [
            { eventId: "event.alpha", weight: 2 },
            { eventId: "event.beta", weight: 3 },
          ],
          totalWeight: 5,
          roll: 1,
          forced: false,
        },
      },
      candidateRng: {
        algorithm: "xorshift32-v1",
        cursor: 25_701_511,
        rawDrawCount: 1,
      },
      attemptedDraws: [
        {
          ordinal: 1,
          purpose: "check:det2e.event-pool",
          exclusiveMax: 5,
          result: 1,
          before: {
            algorithm: "xorshift32-v1",
            cursor: 97,
            rawDrawCount: 0,
          },
          after: {
            algorithm: "xorshift32-v1",
            cursor: 25_701_511,
            rawDrawCount: 1,
          },
        },
      ],
    },
    forced: {
      result: {
        kind: "drawn",
        eventId: "event.beta",
        explanation: {
          considered: 3,
          eligible: [
            { eventId: "event.alpha", weight: 2 },
            { eventId: "event.beta", weight: 3 },
          ],
          totalWeight: 5,
          roll: null,
          forced: true,
        },
      },
      candidateRng: {
        algorithm: "xorshift32-v1",
        cursor: 97,
        rawDrawCount: 0,
      },
      attemptedDraws: [],
    },
  },
  contentDatabase: {
    utf16Ascending: ["A", "a", "a-1", "a_1", "e\u0301", "\u00e9", "\u{1f600}", "\ue000"],
    utf16Descending: ["\ue000", "\u{1f600}", "\u00e9", "e\u0301", "a_1", "a-1", "a", "A"],
    safeIntegersAscending: [Number.MIN_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER],
    safeIntegersDescending: [Number.MAX_SAFE_INTEGER, 0, Number.MIN_SAFE_INTEGER],
  },
  transaction: {
    proposalOrder: ["order.a_1", "order.a-1"],
    applyOrder: ["order.a-1", "order.a_1"],
    replayProposalOrder: ["order.a_1", "order.a-1"],
    replayApplyOrder: ["order.a-1", "order.a_1"],
    facts: [
      {
        kind: "ordering.value_applied",
        owner: "order.a-1",
        value: 3,
      },
      {
        kind: "ordering.value_applied",
        owner: "order.a_1",
        value: 13,
      },
    ],
    candidateSnapshot: {
      state: {
        simulation: {
          dash: { value: 3 },
          underscore: { value: 13 },
        },
      },
      rng: {
        algorithm: "xorshift32-v1",
        cursor: 97,
        rawDrawCount: 0,
      },
      commandSequence: 1,
      integrity: {
        mode: "normal",
        mutationCount: 0,
        firstMutationSequence: null,
        reasons: [],
      },
    },
    commandLog: [
      {
        source: "game",
        command: { kind: "ordering.commit" },
        logOrdinal: 1,
        preStateDigest: "sha256:2a679480c3003a2a82a5dc64f5b66ff80f49d32049636bbb0f0a8f27fd0718ec",
        postStateDigest: "sha256:7197db8c7a1cec33d052788995af132f81dc6fdc269c909e7c3abeea9f658153",
        commandSequence: { before: 0, after: 1 },
        committedRngBefore: {
          algorithm: "xorshift32-v1",
          cursor: 97,
          rawDrawCount: 0,
        },
        attemptedDraws: [],
        candidateRngAfter: {
          algorithm: "xorshift32-v1",
          cursor: 97,
          rawDrawCount: 0,
        },
        committedRngAfter: {
          algorithm: "xorshift32-v1",
          cursor: 97,
          rawDrawCount: 0,
        },
        outcome: {
          kind: "committed",
          facts: [
            {
              kind: "ordering.value_applied",
              owner: "order.a-1",
              value: 3,
            },
            {
              kind: "ordering.value_applied",
              owner: "order.a_1",
              value: 13,
            },
          ],
        },
      },
    ],
    replay: {
      authoritative: true,
      identityMatch: true,
      visualMatch: false,
      matches: true,
      executedEntries: 1,
      mismatches: [],
    },
  },
} as const;
