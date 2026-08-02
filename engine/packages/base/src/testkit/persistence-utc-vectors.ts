// SPDX-License-Identifier: MIT
import { parseIsoUtcInstantV1 } from "../contracts/persistence.ts";

export const persistenceUtcAcceptedCorpusV1 = Object.freeze(
  [
    "2026-07-12T01:02:03Z",
    "2026-07-12T01:02:03.0Z",
    "2026-07-12T01:02:03.000Z",
    "2026-07-12T01:02:03.123456789Z",
    "2024-02-29T00:00:00Z",
    "2000-02-29T00:00:00Z",
    "0000-02-29T00:00:00Z",
    "2026-04-30T23:59:59Z",
    "2026-12-31T24:00:00Z",
    "2026-12-31T24:00:00.0000Z",
    "9999-12-31T24:00:00Z",
  ] as const,
);

export const persistenceUtcRejectedCorpusV1 = Object.freeze(
  [
    "2023-02-29T00:00:00Z",
    "0001-02-29T00:00:00Z",
    "1900-02-29T00:00:00Z",
    "2100-02-29T00:00:00Z",
    "2026-02-30T12:00:00Z",
    "2026-02-30T24:00:00Z",
    "2026-04-31T00:00:00Z",
    "2026-00-01T00:00:00Z",
    "2026-13-01T00:00:00Z",
    "2026-01-00T00:00:00Z",
    "2026-01-32T00:00:00Z",
    "2026-01-01T25:00:00Z",
    "2026-01-01T24:01:00Z",
    "2026-01-01T24:00:01Z",
    "2026-01-01T24:00:00.000001Z",
    "2026-01-01T00:60:00Z",
    "2026-01-01T00:00:60Z",
    "2026-01-01T00:00:00.Z",
    "2026-01-01T00:00:00z",
    "2026-01-01T00:00:00+00:00",
    "2026-01-01T00:00:00",
    "2026-01-01",
    "+02026-01-01T00:00:00Z",
    "2026-01-01T00:00:00Z ",
    " 2026-01-01T00:00:00Z",
    "٢٠٢٦-01-01T00:00:00Z",
    "２０２６-01-01T00:00:00Z",
  ] as const,
);

export interface PersistenceUtcAdmissionObservationV1 {
  readonly input: string;
  readonly outcome: "accepted" | "rejected";
  readonly value?: string;
}

function expectedObservationV1(
  input: string,
  outcome: "accepted" | "rejected",
): PersistenceUtcAdmissionObservationV1 {
  return Object.freeze({ input, outcome, ...(outcome === "accepted" ? { value: input } : {}) });
}

export const persistenceUtcAdmissionExpectedV1 = Object.freeze({
  accepted: Object.freeze(
    persistenceUtcAcceptedCorpusV1.map((input) => expectedObservationV1(input, "accepted")),
  ),
  rejected: Object.freeze(
    persistenceUtcRejectedCorpusV1.map((input) => expectedObservationV1(input, "rejected")),
  ),
});

function observeAdmissionV1(input: string): PersistenceUtcAdmissionObservationV1 {
  try {
    return Object.freeze({ input, outcome: "accepted", value: parseIsoUtcInstantV1(input) });
  } catch {
    return Object.freeze({ input, outcome: "rejected" });
  }
}

/** @internal Test-only B-prime persistence UTC parity seam. */
export function evaluatePersistenceUtcAdmissionVectorsV1() {
  return Object.freeze({
    accepted: Object.freeze(persistenceUtcAcceptedCorpusV1.map(observeAdmissionV1)),
    rejected: Object.freeze(persistenceUtcRejectedCorpusV1.map(observeAdmissionV1)),
  });
}
