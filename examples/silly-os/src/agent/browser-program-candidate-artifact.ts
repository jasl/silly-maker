// SPDX-License-Identifier: MIT

/**
 * Fixed-Harness staging slot for one admitted Program completion candidate.
 *
 * The Process Workspace retains this one mutable slot after admission; a later
 * Run overwrites it. The exact receipt, generation, length, digest, and binding
 * make those residual bytes only a handoff cache, never another durable
 * candidate authority.
 */
export const browserProgramCandidateArtifactRelativePathV1 = ".sillyos-agent-candidate.v1.json";
export const browserProgramCandidateArtifactPathV1 =
  `/workspace/${browserProgramCandidateArtifactRelativePathV1}`;

export interface BrowserProgramCandidateArtifactHandleV1 {
  readonly revision: 1;
  readonly kind: "sillyos.program_candidate_artifact";
  readonly path: typeof browserProgramCandidateArtifactRelativePathV1;
  readonly toolCallId: string;
  readonly workspaceGeneration: number;
  readonly byteLength: number;
  readonly sha256: string;
}

export interface BrowserProgramCandidateArtifactBindingV1 {
  readonly sessionId: string;
  readonly runId: string;
  readonly processId: string;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
}

export type BrowserProgramCandidateValueV1 = object;

interface BrowserProgramCandidateArtifactDocumentV1
  extends BrowserProgramCandidateArtifactBindingV1 {
  readonly revision: 1;
  readonly kind: "sillyos.program_candidate_artifact";
  readonly candidate: BrowserProgramCandidateValueV1;
}

interface DataRecordV1 extends Readonly<Record<string, unknown>> {}

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u;
const sha256PatternV1 = /^[a-f0-9]{64}$/u;

function exactRecordV1(value: unknown, keys: readonly string[]): DataRecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
    ? value as DataRecordV1
    : null;
}

function identifierV1(value: unknown): value is string {
  return typeof value === "string" && identifierPatternV1.test(value);
}

function positiveSafeIntegerV1(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value > 0;
}

function exactArrayBufferV1(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function browserProgramCandidateArtifactToolCallIdV1(runId: string): string {
  if (!identifierV1(runId)) {
    throw new TypeError("sillyos.program_candidate_artifact.run_id_invalid");
  }
  return `sillyos.candidate-artifact.${runId}`;
}

export async function sha256HexV1(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(
    await globalThis.crypto.subtle.digest("SHA-256", exactArrayBufferV1(bytes)),
  );
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function serializeBrowserProgramCandidateArtifactV1(input: {
  readonly binding: BrowserProgramCandidateArtifactBindingV1;
  readonly candidate: BrowserProgramCandidateValueV1;
}): Promise<{ readonly bytes: Uint8Array; readonly sha256: string }> {
  const document: BrowserProgramCandidateArtifactDocumentV1 = {
    revision: 1,
    kind: "sillyos.program_candidate_artifact",
    ...input.binding,
    candidate: input.candidate,
  };
  let text: string;
  try {
    text = JSON.stringify(document);
  } catch {
    throw new TypeError("sillyos.program_candidate_artifact.serialization_failed");
  }
  const bytes = new TextEncoder().encode(text);
  return { bytes, sha256: await sha256HexV1(bytes) };
}

export function createBrowserProgramCandidateArtifactHandleV1(input: {
  readonly runId: string;
  readonly workspaceGeneration: number;
  readonly byteLength: number;
  readonly sha256: string;
}): BrowserProgramCandidateArtifactHandleV1 {
  if (
    !positiveSafeIntegerV1(input.workspaceGeneration) ||
    !positiveSafeIntegerV1(input.byteLength) || !sha256PatternV1.test(input.sha256)
  ) throw new TypeError("sillyos.program_candidate_artifact.handle_invalid");
  return Object.freeze({
    revision: 1,
    kind: "sillyos.program_candidate_artifact",
    path: browserProgramCandidateArtifactRelativePathV1,
    toolCallId: browserProgramCandidateArtifactToolCallIdV1(input.runId),
    workspaceGeneration: input.workspaceGeneration,
    byteLength: input.byteLength,
    sha256: input.sha256,
  });
}

export function hasBrowserProgramCandidateArtifactDiscriminatorV1(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.getOwnPropertyDescriptor(value, "kind")?.value ===
    "sillyos.program_candidate_artifact";
}

export function admitBrowserProgramCandidateArtifactHandleV1(
  value: unknown,
): BrowserProgramCandidateArtifactHandleV1 | null {
  const record = exactRecordV1(value, [
    "revision",
    "kind",
    "path",
    "toolCallId",
    "workspaceGeneration",
    "byteLength",
    "sha256",
  ]);
  if (
    record === null || record.revision !== 1 ||
    record.kind !== "sillyos.program_candidate_artifact" ||
    record.path !== browserProgramCandidateArtifactRelativePathV1 ||
    !identifierV1(record.toolCallId) ||
    !positiveSafeIntegerV1(record.workspaceGeneration) ||
    !positiveSafeIntegerV1(record.byteLength) ||
    typeof record.sha256 !== "string" || !sha256PatternV1.test(record.sha256)
  ) return null;
  return Object.freeze({
    revision: 1,
    kind: "sillyos.program_candidate_artifact",
    path: browserProgramCandidateArtifactRelativePathV1,
    toolCallId: record.toolCallId,
    workspaceGeneration: record.workspaceGeneration,
    byteLength: record.byteLength,
    sha256: record.sha256,
  });
}

export async function admitBrowserProgramCandidateArtifactBytesV1(input: {
  readonly bytes: Uint8Array;
  readonly handle: BrowserProgramCandidateArtifactHandleV1;
  readonly binding: BrowserProgramCandidateArtifactBindingV1;
}): Promise<BrowserProgramCandidateValueV1 | null> {
  if (
    input.bytes.byteLength !== input.handle.byteLength ||
    await sha256HexV1(input.bytes) !== input.handle.sha256
  ) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(input.bytes));
  } catch {
    return null;
  }
  const document = exactRecordV1(parsed, [
    "revision",
    "kind",
    "sessionId",
    "runId",
    "processId",
    "programId",
    "workspaceId",
    "workspaceSessionId",
    "candidate",
  ]);
  if (
    document === null || document.revision !== 1 ||
    document.kind !== "sillyos.program_candidate_artifact" ||
    document.sessionId !== input.binding.sessionId ||
    document.runId !== input.binding.runId ||
    document.processId !== input.binding.processId ||
    document.programId !== input.binding.programId ||
    document.workspaceId !== input.binding.workspaceId ||
    document.workspaceSessionId !== input.binding.workspaceSessionId ||
    document.candidate === null || typeof document.candidate !== "object" ||
    Array.isArray(document.candidate)
  ) return null;
  return document.candidate as BrowserProgramCandidateValueV1;
}
