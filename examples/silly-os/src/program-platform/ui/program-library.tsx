// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  MessageSquareText,
  PackageOpen,
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
  ProgramPackageLibraryEntryV1,
  ProgramPackageServiceV1,
} from "../installation/program-package-service.ts";
import type { InstalledProgramPackageReferenceV1 } from "../package/program-package-archive.ts";
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
  /** Launches the exact selected package; acquisition origin is intentionally absent. */
  readonly onLaunch?: (reference: InstalledProgramPackageReferenceV1) => void | Promise<void>;
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
          <dt>{locale === "zh-CN" ? "Program 版本" : "Program version"}</dt>
          <dd>{summary.programPackage.packageVersion}</dd>
        </div>
      </dl>
    </li>
  );
}

function errorMessageV1(error: unknown): string {
  return error instanceof Error ? error.message : "sillyos.program_package.unknown_failure";
}

function formatBytesV1(byteLength: number, locale: LocaleV1): string {
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: byteLength >= 1_000_000 ? "megabyte" : "kilobyte",
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(byteLength / (byteLength >= 1_000_000 ? 1_000_000 : 1_000));
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
}: {
  readonly entry: ProgramPackageLibraryEntryV1;
  readonly locale: LocaleV1;
  readonly onLaunch?: (reference: InstalledProgramPackageReferenceV1) => void | Promise<void>;
}): ReactNode {
  const compatibility = compatibilityTextV1(entry, locale);
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
          {entry.selectedForNewProcesses
            ? (
              <BadgeV1 variant="neutral">
                {locale === "zh-CN" ? "新 Process 默认版本" : "Current for new Processes"}
              </BadgeV1>
            )
            : null}
          <BadgeV1 variant={compatibility.variant}>{compatibility.label}</BadgeV1>
        </div>
      </div>
      <p className="program-library__compatibility-detail">{compatibility.detail}</p>
      {entry.compatibility === "ready" && onLaunch !== undefined
        ? (
          <ButtonV1
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void onLaunch(entry.reference)}
          >
            {locale === "zh-CN" ? "打开" : "Open"}
          </ButtonV1>
        )
        : null}
      <dl className="program-library__metadata">
        <div>
          <dt>Program</dt>
          <dd>
            <code>{entry.reference.programId}</code>
          </dd>
        </div>
        <div>
          <dt>{locale === "zh-CN" ? "版本" : "Version"}</dt>
          <dd>{entry.reference.packageVersion}</dd>
        </div>
        <div>
          <dt>{locale === "zh-CN" ? "大小" : "Size"}</dt>
          <dd>{formatBytesV1(entry.byteLength, locale)}</dd>
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
        <div className="program-library__digest">
          <dt>{locale === "zh-CN" ? "内容标识" : "Content identity"}</dt>
          <dd>
            <code>{entry.reference.contentDigest}</code>
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
        { selectCurrent: true },
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

  const importing = importState.kind === "installing";
  return (
    <section className="program-library" aria-labelledby={`${inputId}-title`}>
      <header className="program-library__header">
        <div>
          <h2 id={`${inputId}-title`}>Programs</h2>
          <p>
            {locale === "zh-CN"
              ? "导入外部 Program 包；新版本只用于之后创建的 Process。"
              : "Import external Program packages. New versions apply only to future Processes."}
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
                  {importState.disposition === "already_installed"
                    ? locale === "zh-CN"
                      ? "相同的内容已经安装，并已选为新 Process 的版本。"
                      : "The same content was already installed and is selected for new Processes."
                    : locale === "zh-CN"
                    ? "该版本已选为新 Process 的版本。"
                    : "This version is selected for new Processes."}
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
                  key={`${entry.reference.programId}\0${entry.reference.packageVersion}\0${entry.reference.contentDigest}`}
                  entry={entry}
                  locale={locale}
                  {...(onLaunch === undefined ? {} : { onLaunch })}
                />
              ))}
            </ul>
          )}
      </section>
    </section>
  );
}
