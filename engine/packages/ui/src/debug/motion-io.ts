// SPDX-License-Identifier: MIT
import type { MotionDocumentV1 } from "@sillymaker/base";

/**
 * The Motion source contract: list enumerates a Project Authoring Index,
 * read returns one saved document plus its CAS digest, and write submits an
 * edited document under that digest. The dev endpoint implementation lives
 * behind the development-only `debug/dev-source-client` subpath. All methods
 * resolve to structured results, and drafts remain editor memory until a write
 * succeeds.
 */

export type MotionIoErrorCodeV1 =
  | "unavailable"
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "already_exists"
  | "motion_invalid"
  | "motion_id_mismatch";

export interface MotionIoListEntryV1 {
  readonly path: string;
  readonly motionId: string;
  readonly label: string;
}

export interface MotionIoListSkipV1 {
  readonly path: string;
  readonly reason: string;
}

export type MotionIoListResultV1 =
  | {
    readonly kind: "ok";
    readonly motions: readonly MotionIoListEntryV1[];
    readonly skipped: readonly MotionIoListSkipV1[];
  }
  | { readonly kind: "error"; readonly code: MotionIoErrorCodeV1 };

export type MotionIoReadResultV1 =
  | { readonly kind: "ok"; readonly digest: string; readonly motionDocument: MotionDocumentV1 }
  | { readonly kind: "error"; readonly code: MotionIoErrorCodeV1 };

export type MotionIoWriteResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  | { readonly kind: "error"; readonly code: MotionIoErrorCodeV1 };

export interface MotionSourceIoV1 {
  list(): Promise<MotionIoListResultV1>;
  read(path: string): Promise<MotionIoReadResultV1>;
  write(input: {
    readonly path: string;
    readonly expectedDigest: string;
    readonly motionDocument: MotionDocumentV1;
  }): Promise<MotionIoWriteResultV1>;
  /** Creates a brand-new document; the expected prior state is "no file". */
  create(input: {
    readonly path: string;
    readonly motionDocument: MotionDocumentV1;
  }): Promise<MotionIoWriteResultV1>;
}
