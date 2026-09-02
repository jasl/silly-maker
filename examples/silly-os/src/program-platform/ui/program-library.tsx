// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  MessageSquareText,
  PackageOpen,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ProgramPackageInstallationResultV1,
} from "../installation/program-package-installation-repository.ts";
import type {
  ProgramPackageExternalRemovalActionV1,
  ProgramPackageLibraryEntryV1,
  ProgramPackageServiceV1,
} from "../installation/program-package-service.ts";
import type { DecodeProgramPackageZipOptionsV1 } from "../package/program-package-zip.ts";
import type {
  ProcessSummaryV1,
  RecentProcessSummaryListInputV1,
  RecentProcessSummaryPageV1,
} from "../process/program-process-repository.ts";
import { BadgeV1 } from "../../ui/design-system/badge.tsx";
import { ButtonV1 } from "../../ui/design-system/button.tsx";
import { InputV1 } from "../../ui/design-system/input.tsx";
import {
  AlertDialogActionV1,
  AlertDialogCancelV1,
  AlertDialogContentV1,
  AlertDialogDescriptionV1,
  AlertDialogTitleV1,
  AlertDialogTriggerV1,
  AlertDialogV1,
} from "../../ui/design-system/alert-dialog.tsx";
import {
  StatusContentV1,
  StatusDescriptionV1,
  StatusTitleV1,
  StatusV1,
} from "../../ui/design-system/status.tsx";
import "./program-library.css";

type LocaleV1 = "en" | "zh-CN";

type LibraryLoadStateV1 =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly entries: readonly ProgramPackageLibraryEntryV1[] }
  | { readonly kind: "failed"; readonly message: string };

type ImportStateV1 =
  | { readonly kind: "idle" }
  | { readonly kind: "installing"; readonly fileName: string }
  | { readonly kind: "installed"; readonly fileName: string; readonly disposition: string }
  | { readonly kind: "warning"; readonly fileName: string; readonly message: string }
  | { readonly kind: "failed"; readonly fileName: string; readonly message: string };

type RemovalStateV1 =
  | { readonly kind: "idle" }
  | {
    readonly kind: "removing";
    readonly programId: string;
    readonly name: string;
    readonly action: ProgramPackageExternalRemovalActionV1;
  }
  | {
    readonly kind: "completed";
    readonly name: string;
    readonly action: ProgramPackageExternalRemovalActionV1;
    readonly changed: boolean;
  }
  | {
    readonly kind: "failed";
    readonly name: string;
    readonly action: ProgramPackageExternalRemovalActionV1;
    readonly message: string;
  };

type RecentProcessLoadStateV1 =
  | { readonly kind: "loading" }
  | {
    readonly kind: "ready";
    readonly summaries: readonly ProcessSummaryV1[];
    readonly nextCursor: RecentProcessSummaryPageV1["nextCursor"];
  }
  | { readonly kind: "failed"; readonly message: string };

const recentProcessPageMaximumBytesV1 = 64 * 1_024;

export interface ProgramLibraryPropsV1 {
  readonly service: ProgramPackageServiceV1;
  /** Host-owned ZIP/archive admission policy; the UI does not invent another quota. */
  readonly zipDecodeOptions: DecodeProgramPackageZipOptionsV1;
  readonly locale: LocaleV1;
  /** Refresh product-owned catalog projections after the package is durably installed. */
  readonly onInstalled?: (
    result: ProgramPackageInstallationResultV1,
  ) => Promise<void>;
  /** Launches the current implementation for this Program identity. */
  readonly onLaunch?: (programId: string) => void | Promise<void>;
  /** Reads the global durable Process index without resolving any Program package. */
  readonly listRecentProcesses?: (
    input: RecentProcessSummaryListInputV1,
  ) => Promise<RecentProcessSummaryPageV1>;
  /** Opens only the durable Conversation; runtime and Workspace are deliberately absent. */
  readonly onOpenProcess?: (processId: string) => void | Promise<void>;
  /** Opens the SillyOS-owned settings surface; this is not a Program contribution. */
  readonly onOpenSettings?: () => void;
}

function ProcessSummaryRowV1({
  summary,
  locale,
  onOpenProcess,
}: {
  readonly summary: ProcessSummaryV1;
  readonly locale: LocaleV1;
  readonly onOpenProcess: (processId: string) => void | Promise<void>;
}): ReactNode {
  const updated = useMemo(() =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(summary.updatedAt)), [locale, summary.updatedAt]);
  return (
    <li className="program-library__process">
      <div className="program-library__process-heading">
        <MessageSquareText size={17} aria-hidden="true" />
        <div>
          <h3>{summary.programPackage.programId}</h3>
          <p>
            {locale === "zh-CN" ? "最后更新 " : "Updated "}
            {updated}
          </p>
        </div>
      </div>
      <div className="program-library__process-actions">
        <BadgeV1 variant={summary.status === "active" ? "neutral" : "warning"}>
          {summary.status === "active"
            ? locale === "zh-CN" ? "已保存" : "Saved"
            : locale === "zh-CN"
            ? "执行已中断"
            : "Run interrupted"}
        </BadgeV1>
        <ButtonV1
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void onOpenProcess(summary.processId)}
        >
          {locale === "zh-CN" ? "查看 Conversation" : "View Conversation"}
        </ButtonV1>
      </div>
      <dl className="program-library__process-metadata">
        <div>
          <dt>Process</dt>
          <dd>
            <code>{summary.processId}</code>
          </dd>
        </div>
        <div>
          <dt>{locale === "zh-CN" ? "兼容版本" : "Compatibility version"}</dt>
          <dd>{summary.programPackage.packageVersion}</dd>
        </div>
      </dl>
    </li>
  );
}

function errorMessageV1(error: unknown): string {
  return error instanceof Error ? error.message : "sillyos.program_package.unknown_failure";
}

function compatibilityTextV1(
  entry: ProgramPackageLibraryEntryV1,
  locale: LocaleV1,
): { readonly label: string; readonly detail: string; readonly variant: "success" | "warning" } {
  switch (entry.compatibility) {
    case "ready":
      return {
        label: locale === "zh-CN" ? "可运行" : "Ready",
        detail: locale === "zh-CN"
          ? "当前 SillyOS 提供所需 Harness 与运行配置。"
          : "The required harness and runtime profile are available.",
        variant: "success",
      };
    case "harness_incompatible":
      return {
        label: locale === "zh-CN" ? "Harness 不兼容" : "Harness incompatible",
        detail: locale === "zh-CN"
          ? `需要 ${entry.manifest.harnessCompatibility}`
          : `Requires ${entry.manifest.harnessCompatibility}`,
        variant: "warning",
      };
    case "runtime_profile_unavailable":
      return {
        label: locale === "zh-CN" ? "运行配置不可用" : "Runtime unavailable",
        detail: locale === "zh-CN"
          ? `需要 ${entry.manifest.runtimeProfile}`
          : `Requires ${entry.manifest.runtimeProfile}`,
        variant: "warning",
      };
    case "runtime_profile_incompatible":
      return {
        label: locale === "zh-CN" ? "运行要求不兼容" : "Runtime requirements incompatible",
        detail: locale === "zh-CN"
          ? "该包声明了当前运行配置未提供的能力、脚本运行时或初始界面。"
          : "The package requests capabilities, a script runtime, or an initial UI surface not supplied by this profile.",
        variant: "warning",
      };
    default:
      throw new TypeError(`Unknown Program compatibility: ${entry.compatibility satisfies never}`);
  }
}

function ProgramPackageRowV1({
  entry,
  locale,
  onLaunch,
  onRemoveExternal,
  removalBusy,
  removing,
}: {
  readonly entry: ProgramPackageLibraryEntryV1;
  readonly locale: LocaleV1;
  readonly onLaunch?: (programId: string) => void | Promise<void>;
  readonly onRemoveExternal: (entry: ProgramPackageLibraryEntryV1) => void | Promise<void>;
  readonly removalBusy: boolean;
  readonly removing: boolean;
}): ReactNode {
  const compatibility = compatibilityTextV1(entry, locale);
  const [removalDialogOpen, setRemovalDialogOpen] = useState(false);
  const restoringBundled = entry.externalRemoval?.action === "restore_bundled";
  return (
    <li className="program-library__package" data-compatibility={entry.compatibility}>
      <div className="program-library__package-heading">
        <div className="program-library__package-title">
          <PackageOpen size={17} aria-hidden="true" />
          <div>
            <h3>{entry.manifest.name}</h3>
            <p>{entry.manifest.summary}</p>
          </div>
        </div>
        <div className="program-library__badges">
          <BadgeV1 variant={compatibility.variant}>{compatibility.label}</BadgeV1>
        </div>
      </div>
      <p className="program-library__compatibility-detail">{compatibility.detail}</p>
      <div className="program-library__package-actions">
        {entry.compatibility === "ready" && onLaunch !== undefined
          ? (
            <ButtonV1
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void onLaunch(entry.reference.programId)}
            >
              {locale === "zh-CN" ? "打开" : "Open"}
            </ButtonV1>
          )
          : null}
        {entry.externalRemoval === null
          ? null
          : (
            <AlertDialogV1 open={removalDialogOpen} onOpenChange={setRemovalDialogOpen}>
              <AlertDialogTriggerV1>
                <ButtonV1
                  type="button"
                  size="sm"
                  variant={restoringBundled ? "secondary" : "destructive"}
                  icon={restoringBundled ? RotateCcw : Trash2}
                  disabled={removalBusy}
                  aria-busy={removing || undefined}
                >
                  {removing
                    ? restoringBundled
                      ? locale === "zh-CN" ? "正在恢复…" : "Restoring…"
                      : locale === "zh-CN"
                      ? "正在移除…"
                      : "Removing…"
                    : restoringBundled
                    ? locale === "zh-CN" ? "恢复内置版本" : "Restore built-in"
                    : locale === "zh-CN"
                    ? "移除外部 Program"
                    : "Remove external Program"}
                </ButtonV1>
              </AlertDialogTriggerV1>
              <AlertDialogContentV1>
                <AlertDialogTitleV1>
                  {restoringBundled
                    ? locale === "zh-CN"
                      ? `恢复 ${entry.manifest.name} 的内置版本？`
                      : `Restore the built-in ${entry.manifest.name}?`
                    : locale === "zh-CN"
                    ? `移除 ${entry.manifest.name}？`
                    : `Remove ${entry.manifest.name}?`}
                </AlertDialogTitleV1>
                <AlertDialogDescriptionV1>
                  {restoringBundled
                    ? locale === "zh-CN"
                      ? "外部实现会被移除。已有 Conversation 保持不变，兼容的 Process 将使用当前内置实现。"
                      : "The external implementation will be removed. Existing Conversations stay unchanged, and compatible Processes will use the current built-in implementation."
                    : locale === "zh-CN"
                    ? "Program 实现会被移除，但已有 Conversation 仍可只读查看；以后可以重新安装来恢复运行能力。"
                    : "The Program implementation will be removed, but existing Conversations remain available read-only. Reinstall it later to restore its runtime."}
                </AlertDialogDescriptionV1>
                <div className="program-library__removal-dialog-actions">
                  <AlertDialogCancelV1>
                    <ButtonV1 type="button" variant="secondary">
                      {locale === "zh-CN" ? "取消" : "Cancel"}
                    </ButtonV1>
                  </AlertDialogCancelV1>
                  <AlertDialogActionV1>
                    <ButtonV1
                      type="button"
                      variant={restoringBundled ? "primary" : "destructive"}
                      onClick={() => void onRemoveExternal(entry)}
                    >
                      {restoringBundled
                        ? locale === "zh-CN" ? "恢复内置版本" : "Restore built-in"
                        : locale === "zh-CN"
                        ? "移除 Program"
                        : "Remove Program"}
                    </ButtonV1>
                  </AlertDialogActionV1>
                </div>
              </AlertDialogContentV1>
            </AlertDialogV1>
          )}
      </div>
      <dl className="program-library__metadata">
        <div>
          <dt>Program</dt>
          <dd>
            <code>{entry.reference.programId}</code>
          </dd>
        </div>
        <div>
          <dt>{locale === "zh-CN" ? "兼容版本" : "Compatibility version"}</dt>
          <dd>{entry.reference.packageVersion}</dd>
        </div>
        <div>
          <dt>Harness</dt>
          <dd>
            <code>{entry.manifest.harnessCompatibility}</code>
          </dd>
        </div>
        <div>
          <dt>{locale === "zh-CN" ? "运行配置" : "Runtime profile"}</dt>
          <dd>
            <code>{entry.manifest.runtimeProfile}</code>
          </dd>
        </div>
      </dl>
    </li>
  );
}

export function ProgramLibraryV1({
  service,
  zipDecodeOptions,
  locale,
  onInstalled,
  onLaunch,
  listRecentProcesses,
  onOpenProcess,
  onOpenSettings,
}: ProgramLibraryPropsV1): ReactNode {
  const inputId = useId();
  const inputDescriptionId = useId();
  const [loadState, setLoadState] = useState<LibraryLoadStateV1>({ kind: "loading" });
  const [importState, setImportState] = useState<ImportStateV1>({ kind: "idle" });
  const [removalState, setRemovalState] = useState<RemovalStateV1>({ kind: "idle" });
  const removalStatusRef = useRef<HTMLDivElement | null>(null);
  const [recentProcesses, setRecentProcesses] = useState<RecentProcessLoadStateV1>(() =>
    listRecentProcesses === undefined ? { kind: "ready", summaries: [], nextCursor: null } : {
      kind: "loading",
    }
  );
  const [processOpenFailure, setProcessOpenFailure] = useState<string | null>(null);
  const mounted = useRef(false);
  const loadGeneration = useRef(0);
  const processLoadGeneration = useRef(0);

  const refreshV1 = useCallback(async (): Promise<void> => {
    const generation = ++loadGeneration.current;
    if (mounted.current) setLoadState({ kind: "loading" });
    try {
      const entries = await service.listLibrary();
      if (mounted.current && generation === loadGeneration.current) {
        setLoadState({ kind: "ready", entries });
      }
    } catch (error) {
      if (mounted.current && generation === loadGeneration.current) {
        setLoadState({ kind: "failed", message: errorMessageV1(error) });
      }
    }
  }, [service]);

  const refreshRecentProcessesV1 = useCallback(async (): Promise<void> => {
    if (listRecentProcesses === undefined) return;
    const generation = ++processLoadGeneration.current;
    if (mounted.current) setRecentProcesses({ kind: "loading" });
    try {
      const page = await listRecentProcesses({
        before: null,
        maximumBytes: recentProcessPageMaximumBytesV1,
      });
      if (mounted.current && generation === processLoadGeneration.current) {
        setRecentProcesses({
          kind: "ready",
          summaries: page.summaries,
          nextCursor: page.nextCursor,
        });
      }
    } catch (error) {
      if (mounted.current && generation === processLoadGeneration.current) {
        setRecentProcesses({ kind: "failed", message: errorMessageV1(error) });
      }
    }
  }, [listRecentProcesses]);

  useEffect(() => {
    mounted.current = true;
    void refreshV1();
    void refreshRecentProcessesV1();
    return () => {
      mounted.current = false;
      loadGeneration.current += 1;
      processLoadGeneration.current += 1;
    };
  }, [refreshRecentProcessesV1, refreshV1]);

  const loadMoreProcessesV1 = async (): Promise<void> => {
    if (
      listRecentProcesses === undefined || recentProcesses.kind !== "ready" ||
      recentProcesses.nextCursor === null
    ) return;
    const generation = ++processLoadGeneration.current;
    try {
      const page = await listRecentProcesses({
        before: recentProcesses.nextCursor,
        maximumBytes: recentProcessPageMaximumBytesV1,
      });
      if (mounted.current && generation === processLoadGeneration.current) {
        setRecentProcesses({
          kind: "ready",
          summaries: [...recentProcesses.summaries, ...page.summaries],
          nextCursor: page.nextCursor,
        });
      }
    } catch (error) {
      if (mounted.current && generation === processLoadGeneration.current) {
        setRecentProcesses({ kind: "failed", message: errorMessageV1(error) });
      }
    }
  };

  const installZipV1 = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget;
    const file = input.files?.[0] ?? null;
    input.value = "";
    if (file === null) return;
    setImportState({ kind: "installing", fileName: file.name });
    try {
      const result = await service.installZip(
        await file.arrayBuffer(),
        zipDecodeOptions,
      );
      await refreshV1();
      if (onInstalled !== undefined) {
        try {
          await onInstalled(result);
        } catch (error) {
          if (mounted.current) {
            setImportState({
              kind: "warning",
              fileName: file.name,
              message: errorMessageV1(error),
            });
          }
          return;
        }
      }
      if (mounted.current) {
        setImportState({ kind: "installed", fileName: file.name, disposition: result.disposition });
      }
    } catch (error) {
      if (mounted.current) {
        setImportState({ kind: "failed", fileName: file.name, message: errorMessageV1(error) });
      }
    }
  };

  const removeExternalV1 = async (entry: ProgramPackageLibraryEntryV1): Promise<void> => {
    const removal = entry.externalRemoval;
    if (removal === null || removalState.kind === "removing") return;
    const programId = entry.reference.programId;
    const name = entry.manifest.name;
    setRemovalState({ kind: "removing", programId, name, action: removal.action });
    try {
      const changed = await service.removeExternal(programId, removal.installationId);
      await refreshV1();
      if (mounted.current) {
        setRemovalState({ kind: "completed", name, action: removal.action, changed });
        requestAnimationFrame(() => removalStatusRef.current?.focus());
      }
    } catch (error) {
      if (mounted.current) {
        setRemovalState({
          kind: "failed",
          name,
          action: removal.action,
          message: errorMessageV1(error),
        });
        requestAnimationFrame(() => removalStatusRef.current?.focus());
      }
    }
  };

  const importing = importState.kind === "installing";
  const removalBusy = removalState.kind === "removing";
  return (
    <section className="program-library" aria-labelledby={`${inputId}-title`}>
      <header className="program-library__header">
        <div>
          <h2 id={`${inputId}-title`}>Programs</h2>
          <p>
            {locale === "zh-CN"
              ? "导入外部 Program 包；兼容更新会用于新旧 Process。"
              : "Import external Program packages. Compatible updates apply to new and existing Processes."}
          </p>
        </div>
        {onOpenSettings === undefined ? null : (
          <ButtonV1
            type="button"
            size="sm"
            variant="ghost"
            data-open-settings="home"
            onClick={onOpenSettings}
          >
            {locale === "zh-CN" ? "设置" : "Settings"}
          </ButtonV1>
        )}
      </header>

      <div className="program-library__import">
        <label htmlFor={inputId}>
          {locale === "zh-CN" ? "导入 Program ZIP" : "Import Program ZIP"}
        </label>
        <InputV1
          id={inputId}
          className="program-library__file-input"
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          aria-describedby={inputDescriptionId}
          disabled={importing}
          onChange={(event) => void installZipV1(event)}
        />
        <p id={inputDescriptionId}>
          {locale === "zh-CN"
            ? "ZIP 必须包含 program.json；导入不会在页面上下文中执行包内代码。"
            : "The ZIP must contain program.json. Importing does not execute package code in the page."}
        </p>
      </div>

      {importState.kind === "idle" ? null : (
        <StatusV1
          className="program-library__import-status"
          variant={importState.kind === "installed"
            ? "success"
            : importState.kind === "warning"
            ? "warning"
            : importState.kind === "failed"
            ? "danger"
            : "info"}
          icon={importState.kind === "installed"
            ? CheckCircle2
            : importState.kind === "installing"
            ? LoaderCircle
            : CircleAlert}
          role={importState.kind === "failed" ? "alert" : "status"}
          aria-live={importState.kind === "failed" ? "assertive" : "polite"}
          data-busy={importing ? "true" : "false"}
        >
          <StatusContentV1>
            <StatusTitleV1>
              {importState.kind === "installing"
                ? locale === "zh-CN"
                  ? `正在导入 ${importState.fileName}`
                  : `Importing ${importState.fileName}`
                : importState.kind === "installed"
                ? locale === "zh-CN"
                  ? `已导入 ${importState.fileName}`
                  : `Imported ${importState.fileName}`
                : importState.kind === "warning"
                ? locale === "zh-CN"
                  ? `已导入 ${importState.fileName}`
                  : `Imported ${importState.fileName}`
                : locale === "zh-CN"
                ? `无法导入 ${importState.fileName}`
                : `Could not import ${importState.fileName}`}
            </StatusTitleV1>
            {importState.kind === "failed" || importState.kind === "warning"
              ? <StatusDescriptionV1>{importState.message}</StatusDescriptionV1>
              : importState.kind === "installed"
              ? (
                <StatusDescriptionV1>
                  {importState.disposition === "replaced"
                    ? locale === "zh-CN"
                      ? "已替换这个 Program 的当前实现。"
                      : "The current implementation of this Program was replaced."
                    : locale === "zh-CN"
                    ? "Program 已安装。"
                    : "The Program was installed."}
                </StatusDescriptionV1>
              )
              : null}
          </StatusContentV1>
        </StatusV1>
      )}

      {removalState.kind === "idle" ? null : (
        <StatusV1
          ref={removalStatusRef}
          tabIndex={-1}
          className="program-library__import-status"
          variant={removalState.kind === "failed"
            ? "danger"
            : removalState.kind === "completed" && !removalState.changed
            ? "info"
            : removalState.kind === "completed"
            ? "success"
            : "info"}
          icon={removalState.kind === "failed"
            ? CircleAlert
            : removalState.kind === "removing"
            ? LoaderCircle
            : CheckCircle2}
          role={removalState.kind === "failed" ? "alert" : "status"}
          aria-live={removalState.kind === "failed" ? "assertive" : "polite"}
          data-busy={removalBusy || undefined}
        >
          <StatusContentV1>
            <StatusTitleV1>
              {removalState.kind === "removing"
                ? removalState.action === "restore_bundled"
                  ? locale === "zh-CN"
                    ? `正在恢复 ${removalState.name} 的内置版本`
                    : `Restoring the built-in ${removalState.name}`
                  : locale === "zh-CN"
                  ? `正在移除 ${removalState.name}`
                  : `Removing ${removalState.name}`
                : removalState.kind === "failed"
                ? removalState.action === "restore_bundled"
                  ? locale === "zh-CN"
                    ? `无法恢复 ${removalState.name}`
                    : `Could not restore ${removalState.name}`
                  : locale === "zh-CN"
                  ? `无法移除 ${removalState.name}`
                  : `Could not remove ${removalState.name}`
                : !removalState.changed
                ? locale === "zh-CN"
                  ? "Program 已在其他窗口中发生变化"
                  : "The Program changed in another window"
                : removalState.action === "restore_bundled"
                ? locale === "zh-CN"
                  ? `已恢复 ${removalState.name} 的内置版本`
                  : `Restored the built-in ${removalState.name}`
                : locale === "zh-CN"
                ? `已移除 ${removalState.name}`
                : `Removed ${removalState.name}`}
            </StatusTitleV1>
            {removalState.kind === "failed"
              ? <StatusDescriptionV1>{removalState.message}</StatusDescriptionV1>
              : removalState.kind === "completed"
              ? (
                <StatusDescriptionV1>
                  {!removalState.changed
                    ? locale === "zh-CN" ? "Library 已刷新。" : "The Library was refreshed."
                    : removalState.action === "restore_bundled"
                    ? locale === "zh-CN"
                      ? "已保存的 Conversations 保持不变；兼容的 Process 将使用当前内置实现。"
                      : "Saved Conversations are unchanged. Compatible Processes use the current built-in implementation."
                    : locale === "zh-CN"
                    ? "已保存的 Conversations 仍可只读查看；重新安装此 Program 后可恢复其运行能力。"
                    : "Saved Conversations remain available read-only. Reinstall this Program to restore its runtime."}
                </StatusDescriptionV1>
              )
              : null}
          </StatusContentV1>
        </StatusV1>
      )}

      {listRecentProcesses === undefined || onOpenProcess === undefined
        ? null
        : (
          <section className="program-library__recent" aria-labelledby={`${inputId}-recent`}>
            <h2 id={`${inputId}-recent`}>
              {locale === "zh-CN" ? "最近的 Conversations" : "Recent Conversations"}
            </h2>
            <p className="program-library__section-description">
              {locale === "zh-CN"
                ? "即使原 Program 或 Workspace 不可用，也可以继续分页查看已保存的对话。"
                : "Saved Conversations remain pageable when their Program or Workspace is unavailable."}
            </p>
            {processOpenFailure === null
              ? null
              : (
                <StatusV1 variant="danger" icon={CircleAlert} role="alert">
                  <StatusContentV1>
                    <StatusTitleV1>
                      {locale === "zh-CN" ? "无法打开 Conversation" : "Could not open Conversation"}
                    </StatusTitleV1>
                    <StatusDescriptionV1>{processOpenFailure}</StatusDescriptionV1>
                  </StatusContentV1>
                </StatusV1>
              )}
            {recentProcesses.kind === "loading"
              ? (
                <p className="program-library__load-state" role="status">
                  {locale === "zh-CN" ? "正在读取 Conversations…" : "Loading Conversations…"}
                </p>
              )
              : recentProcesses.kind === "failed"
              ? (
                <StatusV1 variant="danger" icon={CircleAlert} role="alert">
                  <StatusContentV1>
                    <StatusTitleV1>
                      {locale === "zh-CN"
                        ? "无法读取 Conversations"
                        : "Could not load Conversations"}
                    </StatusTitleV1>
                    <StatusDescriptionV1>{recentProcesses.message}</StatusDescriptionV1>
                  </StatusContentV1>
                </StatusV1>
              )
              : recentProcesses.summaries.length === 0
              ? (
                <p className="program-library__load-state">
                  {locale === "zh-CN"
                    ? "还没有已保存的 Conversation。"
                    : "No saved Conversations yet."}
                </p>
              )
              : (
                <>
                  <ul className="program-library__processes">
                    {recentProcesses.summaries.map((summary) => (
                      <ProcessSummaryRowV1
                        key={summary.processId}
                        summary={summary}
                        locale={locale}
                        onOpenProcess={async (processId) => {
                          setProcessOpenFailure(null);
                          try {
                            await onOpenProcess(processId);
                          } catch (error) {
                            if (mounted.current) setProcessOpenFailure(errorMessageV1(error));
                          }
                        }}
                      />
                    ))}
                  </ul>
                  {recentProcesses.nextCursor === null ? null : (
                    <ButtonV1
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void loadMoreProcessesV1()}
                    >
                      {locale === "zh-CN" ? "加载更早记录" : "Load older"}
                    </ButtonV1>
                  )}
                </>
              )}
          </section>
        )}

      <section className="program-library__installed" aria-labelledby={`${inputId}-installed`}>
        <h2 id={`${inputId}-installed`}>{locale === "zh-CN" ? "已安装" : "Installed"}</h2>
        {loadState.kind === "loading"
          ? (
            <p className="program-library__load-state" role="status">
              {locale === "zh-CN" ? "正在读取 Programs…" : "Loading Programs…"}
            </p>
          )
          : loadState.kind === "failed"
          ? (
            <StatusV1 variant="danger" icon={CircleAlert} role="alert">
              <StatusContentV1>
                <StatusTitleV1>
                  {locale === "zh-CN"
                    ? "无法读取已安装 Programs"
                    : "Could not load installed Programs"}
                </StatusTitleV1>
                <StatusDescriptionV1>{loadState.message}</StatusDescriptionV1>
              </StatusContentV1>
            </StatusV1>
          )
          : loadState.entries.length === 0
          ? (
            <p className="program-library__load-state">
              {locale === "zh-CN" ? "尚未安装 Program。" : "No Programs are installed."}
            </p>
          )
          : (
            <ul className="program-library__packages">
              {loadState.entries.map((entry) => (
                <ProgramPackageRowV1
                  key={entry.reference.programId}
                  entry={entry}
                  locale={locale}
                  removalBusy={removalBusy}
                  removing={removalState.kind === "removing" &&
                    removalState.programId === entry.reference.programId}
                  onRemoveExternal={removeExternalV1}
                  {...(onLaunch === undefined ? {} : { onLaunch })}
                />
              ))}
            </ul>
          )}
      </section>
    </section>
  );
}
