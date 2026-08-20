// SPDX-License-Identifier: MIT
import { diagnosticExportContentCategoryIdsV1 as rootDiagnosticExportContentCategoryIdsV1 } from "@sillymaker/ui";
import {
  diagnosticExportContentCategoryIdsV1,
  type DiagnosticExportContentCategoryIdV1,
  type DiagnosticExportPortV1,
  type DiagnosticExportPreviewV1,
} from "@sillymaker/ui/diagnostics";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

type DiagnosticsRuntimeKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/ui/diagnostics"),
    "DiagnosticExportButtonV1" | "diagnosticExportContentCategoryIdsV1"
  >
>;
type DiagnosticCategoryIdsV1 = ExpectV1<
  EqualV1<
    typeof diagnosticExportContentCategoryIdsV1,
    readonly [
      "provenance",
      "capabilities_and_integrity",
      "replay_evidence",
      "diagnostics_and_runtime_failures",
      "failure_context",
      "ui_context",
    ]
  >
>;
type DiagnosticPreviewKeysV1 = ExpectV1<
  EqualV1<
    keyof DiagnosticExportPreviewV1,
    "filename" | "mediaType" | "digest" | "encodedByteLength" | "categories"
  >
>;
type DiagnosticPreviewForbiddenKeysV1 = ExpectV1<
  EqualV1<
    Extract<
      keyof DiagnosticExportPreviewV1,
      "bytes" | "snapshot" | "commandLog" | "session" | "debugTools"
    >,
    never
  >
>;
type DiagnosticPortKeysV1 = ExpectV1<
  EqualV1<
    keyof DiagnosticExportPortV1,
    "prepareDebugBundle" | "savePreparedDebugBundle" | "discardPreparedDebugBundle"
  >
>;

const rootDiagnosticCategoryIdsV1: typeof diagnosticExportContentCategoryIdsV1 =
  rootDiagnosticExportContentCategoryIdsV1;

declare const diagnosticCategoryIdV1: DiagnosticExportContentCategoryIdV1;
declare const diagnosticPreviewV1: DiagnosticExportPreviewV1;
diagnosticExportContentCategoryIdsV1.includes(diagnosticCategoryIdV1);
diagnosticPreviewV1.categories.includes(diagnosticCategoryIdV1);

rootDiagnosticCategoryIdsV1;

// @ts-expect-error Story identity is not part of the player-safe diagnostics subpath
export type { StoryId as ForbiddenStoryIdV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error Story definitions are not part of the player-safe diagnostics subpath
export type { StoryEntryV1 as ForbiddenStoryEntryV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error Snapshot authority is not part of the player-safe diagnostics subpath
export type { GameSnapshotEnvelopeV1 as ForbiddenSnapshotV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error GameSession authority is not part of the player-safe diagnostics subpath
export type { GameSessionV1 as ForbiddenGameSessionV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error DebugTools authority is not part of the player-safe diagnostics subpath
export type { DebugToolsPortV1 as ForbiddenDebugToolsV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error module event reducers are not part of the player-safe diagnostics subpath
export type { ModuleEventReducerMapV1 as ForbiddenReducersV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error DOM nodes are not part of the player-safe diagnostics subpath
export type { HTMLElement as ForbiddenDomNodeV1 } from "@sillymaker/ui/diagnostics";
// @ts-expect-error renderer instances are not part of the player-safe diagnostics subpath
export type { CharacterRendererContributionV1 as ForbiddenRendererV1 } from "@sillymaker/ui/diagnostics";

export type {
  DiagnosticCategoryIdsV1,
  DiagnosticPortKeysV1,
  DiagnosticPreviewForbiddenKeysV1,
  DiagnosticPreviewKeysV1,
  DiagnosticsRuntimeKeysV1,
};
