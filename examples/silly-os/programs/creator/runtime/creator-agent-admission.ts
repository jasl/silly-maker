// SPDX-License-Identifier: MIT

import {
  creatorAgentTextMaximumCharactersV1,
  type CreatorAgentSubmitV1,
  type CreatorProgramRevisionCandidateV1,
} from "./contracts.ts";

type CreatorAgentWireAdmissionPathV1 =
  | "/"
  | "/revision"
  | "/proposalId"
  | "/programId"
  | "/baseProgramRevision"
  | "/text"
  | "/requirement";

export type CreatorAgentWireAdmissionResultV1<TValue> =
  | { readonly kind: "admitted"; readonly value: TValue }
  | { readonly kind: "rejected"; readonly path: CreatorAgentWireAdmissionPathV1 };

const creatorAgentSubmitTextMaximumCharactersV1 = 8_192;
const creatorAgentIdentifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u;

type FlatWireRecordV1 = Readonly<Record<string, unknown>>;

function rejectV1<TValue>(
  path: CreatorAgentWireAdmissionPathV1,
): CreatorAgentWireAdmissionResultV1<TValue> {
  return { kind: "rejected", path };
}

function exactFlatRecordV1(
  value: unknown,
  keys: readonly string[],
): FlatWireRecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actualKeys = Object.keys(descriptors);
    if (
      actualKeys.length !== keys.length ||
      !keys.every((key) => Object.hasOwn(descriptors, key))
    ) return null;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) return null;
    }
    return Object.fromEntries(
      keys.map((key) => [key, descriptors[key]?.value]),
    );
  } catch {
    return null;
  }
}

function isIdentifierV1(value: unknown): value is string {
  return typeof value === "string" && creatorAgentIdentifierPatternV1.test(value);
}

function isBaseRevisionV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isAdmittedTextV1(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 &&
    value.length <= creatorAgentTextMaximumCharactersV1 && value === value.trim();
}

function admitCommonV1(
  record: FlatWireRecordV1,
): CreatorAgentWireAdmissionResultV1<CreatorAgentSubmitV1> {
  if (record.revision !== 1) return rejectV1("/revision");
  if (!isIdentifierV1(record.proposalId)) return rejectV1("/proposalId");
  if (!isIdentifierV1(record.programId)) return rejectV1("/programId");
  if (!isBaseRevisionV1(record.baseProgramRevision)) {
    return rejectV1("/baseProgramRevision");
  }
  if (!isAdmittedTextV1(record.text)) return rejectV1("/text");
  return {
    kind: "admitted",
    value: {
      revision: 1,
      proposalId: record.proposalId,
      programId: record.programId,
      baseProgramRevision: record.baseProgramRevision,
      text: record.text,
    },
  };
}

export function admitCreatorAgentSubmitV1(
  value: unknown,
): CreatorAgentWireAdmissionResultV1<CreatorAgentSubmitV1> {
  const record = exactFlatRecordV1(value, [
    "revision",
    "proposalId",
    "programId",
    "baseProgramRevision",
    "text",
  ]);
  return record === null ? rejectV1("/") : admitCommonV1(record);
}

export function serializeCreatorAgentSubmitV1(value: CreatorAgentSubmitV1): string {
  const admitted = admitCreatorAgentSubmitV1(value);
  if (admitted.kind === "rejected") {
    throw new TypeError(`sillyos.creator_agent_submit.invalid${admitted.path}`);
  }
  const text = JSON.stringify(admitted.value);
  if (text.length > creatorAgentSubmitTextMaximumCharactersV1) {
    throw new TypeError("sillyos.creator_agent_submit.too_large");
  }
  return text;
}

export function admitCreatorAgentSubmitTextV1(
  text: unknown,
): CreatorAgentWireAdmissionResultV1<CreatorAgentSubmitV1> {
  if (
    typeof text !== "string" || text.length === 0 ||
    text.length > creatorAgentSubmitTextMaximumCharactersV1
  ) return rejectV1("/");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return rejectV1("/");
  }
  return admitCreatorAgentSubmitV1(value);
}

export function admitCreatorProgramRevisionCandidateV1(
  value: unknown,
): CreatorAgentWireAdmissionResultV1<CreatorProgramRevisionCandidateV1> {
  const record = exactFlatRecordV1(value, [
    "revision",
    "proposalId",
    "programId",
    "baseProgramRevision",
    "text",
    "requirement",
  ]);
  if (record === null) return rejectV1("/");
  const common = admitCommonV1(record);
  if (common.kind === "rejected") return common;
  if (!isAdmittedTextV1(record.requirement)) return rejectV1("/requirement");
  return {
    kind: "admitted",
    value: {
      ...common.value,
      requirement: record.requirement,
    },
  };
}
