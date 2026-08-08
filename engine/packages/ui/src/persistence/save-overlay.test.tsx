// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import {
  parseDigest,
  parseNonNegativeSafeInteger,
  type ExportedSaveV1,
  type PersistenceOperationResultV1,
  type PersistenceStatusV1,
  type SaveExportOperationResultV1,
  type SaveSlotHealthV1,
  type SaveSlotIdV1,
  type SaveSlotSummaryV1,
} from "@sillymaker/base";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SystemDialogHostConfirmationRequestInternalV1 } from "../system/system-dialog-managed-host.tsx";
import {
  SaveOverlayContentInternalV1,
  type SaveOverlayLabelsV1,
  type SaveOverlayPortV1,
  type SaveUiImportResultV1,
  type SaveUiWritableSlotIdV1,
} from "./save-overlay.tsx";

afterEach(cleanup);

const slotIdsV1 = Object.freeze(
  [
    "auto.current",
    "auto.previous",
    "quick",
    "manual.1",
    "manual.2",
  ] as const satisfies readonly SaveSlotIdV1[],
);

const exportedSaveV1 = Object.freeze({
  filename: "tavern-save.json",
  mediaType: "application/json",
  digest: parseDigest(`sha256:${"0".repeat(64)}`),
  bytes: new Uint8Array([1, 2, 3]),
}) satisfies ExportedSaveV1;

const labelsV1 = Object.freeze({
  accessibleName: "存档管理",
  title: "存档管理",
  storageLoading: "正在读取本地存档状态…",
  storageReady: "本地存储可用",
  storageBusy: "本地存储正忙",
  storageUnavailable: "本地存储不可用",
  slotsUnavailable: "无法读取存档槽位",
  safelySaved: (sequence: number) => `已安全保存至指令 ${sequence}`,
  lastFailure: (code: string) => `最近一次存储错误：${code}`,
  slotNames: Object.freeze({
    "auto.current": "当前自动存档",
    "auto.previous": "上一自动存档",
    quick: "快速存档",
    manualSlot: (index: number) => `手动存档 ${index}`,
  }),
  slotHealth: Object.freeze({
    empty: "空槽位",
    valid: "存档有效",
    invalid: "存档损坏",
    recovery_candidate: "可恢复的备用存档",
    unavailable: "槽位不可用",
  }),
  quickSave: "快速保存",
  manualSave: "手动保存",
  importSave: "导入存档",
  exportCurrentSave: "导出当前进度",
  loadSlot: (slotName: string) => `读取${slotName}`,
  clearSlot: (slotName: string) => `清除${slotName}`,
  exportSlot: (slotName: string) => `导出${slotName}`,
  confirmation: Object.freeze({
    loadTitle: (slotName: string) => `确认读取${slotName}`,
    loadDescription: (slotName: string) => `当前进度将被${slotName}替换。`,
    clearTitle: (slotName: string) => `确认清除${slotName}`,
    clearDescription: (slotName: string) => `${slotName}将被永久清除。`,
    importTitle: "确认导入存档",
    importDescription: "当前进度将被所选存档替换。",
    confirmLabel: "确认操作",
    cancelLabel: "取消操作",
    pendingText: "正在提交操作…",
    completedText: "操作已返回结果",
    failedText: "操作未能提交",
  }),
  operation: Object.freeze({
    saving: (slotName: string) => `正在安全写入${slotName}…`,
    loading: (slotName: string) => `正在读取${slotName}…`,
    clearing: (slotName: string) => `正在清除${slotName}…`,
    importing: "正在导入存档…",
    exporting: (slotName: string) => `正在导出${slotName}…`,
    exportingCurrent: "正在导出当前进度…",
    saved: (slotName: string) => `${slotName}已保存`,
    cleared: (slotName: string) => `${slotName}已清除`,
    loadedExact: "已读取完全兼容的存档",
    loadedAdopted: "已读取并采用兼容补丁的存档",
    importedExact: "已导入完全兼容的存档",
    importedAdopted: "已导入并采用兼容补丁的存档",
    importCancelled: "已取消导入存档",
    importFileRejected: Object.freeze({
      too_large: "所选存档文件过大",
      unsupported_type: "所选文件类型不受支持",
    }),
    exported: (slotName: string) => `${slotName}已导出`,
    exportedCurrent: "当前进度已导出",
    rejected: Object.freeze({
      busy: "存储正忙，请稍后重试",
      unavailable: "本地存储不可用",
      empty_slot: "该槽位没有存档",
      conflict: "存档已被其他页面更新",
      invalid_record: "存档记录无效",
      invalid_note: "备注不合法",
      lineage_limit: "存档兼容链超过限制",
      migration_unavailable: "当前版本尚未提供此存档所需的迁移",
      migration_rejected: "存档迁移失败",
      incompatible: "存档与当前游戏不兼容",
    }),
    exportRejected: Object.freeze({
      unavailable: "本地存储不可用",
      empty_slot: "该槽位没有存档",
      conflict: "存档已被其他页面更新",
      invalid_record: "存档记录无效",
    }),
    faulted: (code: string) => `存档操作失败：${code}`,
    unexpectedFailure: "存档操作发生未预期错误",
  }),
}) satisfies SaveOverlayLabelsV1;

function statusV1(overrides: Partial<PersistenceStatusV1> = {}): PersistenceStatusV1 {
  return Object.freeze({
    available: true,
    busy: false,
    safelySavedCommandSequence: null,
    lastFailureCode: null,
    ...overrides,
  });
}

function slotV1(slotId: SaveSlotIdV1, health: SaveSlotHealthV1): SaveSlotSummaryV1 {
  return Object.freeze({
    slotId,
    health,
    recordRevision: null,
    capturedCommandSequence: null,
    savedAt: null,
    annotation: null,
    warningCodes: Object.freeze([]),
  });
}

interface FixtureOptionsV1 {
  readonly status?: PersistenceStatusV1 | Promise<PersistenceStatusV1>;
  readonly slots?: readonly SaveSlotSummaryV1[];
  readonly saveResult?: PersistenceOperationResultV1 | Promise<PersistenceOperationResultV1>;
  readonly loadResult?: PersistenceOperationResultV1 | Promise<PersistenceOperationResultV1>;
  readonly clearResult?: PersistenceOperationResultV1 | Promise<PersistenceOperationResultV1>;
  readonly importResult?: SaveUiImportResultV1 | Promise<SaveUiImportResultV1>;
  readonly exportResult?: SaveExportOperationResultV1 | Promise<SaveExportOperationResultV1>;
}

function fixtureV1(options: FixtureOptionsV1 = {}) {
  const slots = options.slots ??
    slotIdsV1.map((slotId) => slotV1(slotId, slotId === "quick" ? "valid" : "empty"));
  const getStatus = vi.fn(() => options.status ?? statusV1());
  const listSlots = vi.fn(async () => slots);
  const save = vi.fn(async (slotId: SaveUiWritableSlotIdV1) =>
    Promise.resolve(options.saveResult ?? Object.freeze({ kind: "saved" as const, slotId }))
  );
  const load = vi.fn(async (_slotId: SaveSlotIdV1) =>
    Promise.resolve(
      options.loadResult ??
        Object.freeze({
          kind: "loaded" as const,
          compatibility: "exact" as const,
          commandSequence: parseNonNegativeSafeInteger(0),
        }),
    )
  );
  const clear = vi.fn(async (slotId: SaveSlotIdV1) =>
    Promise.resolve(options.clearResult ?? Object.freeze({ kind: "cleared" as const, slotId }))
  );
  const importSave = vi.fn(async () =>
    Promise.resolve(
      options.importResult ??
        Object.freeze({
          kind: "imported" as const,
          compatibility: "exact" as const,
          commandSequence: parseNonNegativeSafeInteger(0),
        }),
    )
  );
  const exportSave = vi.fn(async (slotId: SaveSlotIdV1) =>
    Promise.resolve(
      options.exportResult ??
        Object.freeze({ kind: "exported" as const, slotId, file: exportedSaveV1 }),
    )
  );
  const exportCurrentSave = vi.fn(async () => exportedSaveV1);
  const annotateSave = vi.fn(async (slotId: SaveUiWritableSlotIdV1, _note: string) =>
    Promise.resolve(Object.freeze({ kind: "saved" as const, slotId }))
  );
  const port = Object.freeze({
    getStatus,
    listSlots,
    save,
    load,
    clear,
    annotateSave,
    importSave,
    exportSave,
    exportCurrentSave,
  }) satisfies SaveOverlayPortV1;
  return Object.freeze({
    port,
    getStatus,
    listSlots,
    save,
    load,
    clear,
    annotateSave,
    importSave,
    exportSave,
    exportCurrentSave,
  });
}

function renderFixtureV1(fixture = fixtureV1()) {
  const confirmationIntent = Object.freeze({
    requestConfirmationInternalV1(
      input: SystemDialogHostConfirmationRequestInternalV1,
    ) {
      void input.operationBinding.dispatch(input.invocation).then(
        (outcome) => {
          if (outcome.kind === "retain_root") {
            input.operationBinding.resultSink(
              Object.freeze({ kind: "settled", result: outcome.result }),
            );
          }
          input.operationBinding.finalizeExactRoot();
        },
        (error: unknown) => {
          input.operationBinding.resultSink(Object.freeze({ kind: "faulted", error }));
          input.operationBinding.finalizeExactRoot();
        },
      );
      return Object.freeze({
        kind: "preparing" as const,
        code: "system_dialog.confirmation_preparation_started" as const,
      });
    },
  });
  return render(
    <SaveOverlayContentInternalV1
      port={fixture.port}
      labels={labelsV1}
      closeLabel="关闭"
      guard={Object.freeze({ allowed: true })}
      confirmationIntent={confirmationIntent}
      onCloseInternalV1={vi.fn()}
    />,
  );
}

describe("SaveOverlayContentInternalV1 managed confirmation boundary", () => {
  it("maps a successful load to successor without calling the root close intent", async () => {
    const fixture = fixtureV1();
    const requests: SystemDialogHostConfirmationRequestInternalV1[] = [];
    const onCloseInternalV1 = vi.fn();
    render(
      <SaveOverlayContentInternalV1
        port={fixture.port}
        labels={labelsV1}
        closeLabel="关闭"
        guard={Object.freeze({ allowed: true })}
        confirmationIntent={Object.freeze({
          requestConfirmationInternalV1(
            input: SystemDialogHostConfirmationRequestInternalV1,
          ) {
            requests.push(input);
            return Object.freeze({
              kind: "preparing" as const,
              code: "system_dialog.confirmation_preparation_started" as const,
            });
          },
        })}
        onCloseInternalV1={onCloseInternalV1}
      />,
    );

    await userEvent.setup().click(
      await screen.findByRole("button", { name: "读取快速存档" }),
    );
    const request = requests[0];
    if (request === undefined) throw new Error("expected confirmation request");
    expect(fixture.load).not.toHaveBeenCalled();
    await expect(request.operationBinding.dispatch(request.invocation)).resolves.toEqual({
      kind: "successor",
    });
    expect(fixture.load).toHaveBeenCalledExactlyOnceWith("quick");
    expect(onCloseInternalV1).not.toHaveBeenCalled();
  });

  it("delivers a retained result only through the child-bound sink and exact-root finalizer", async () => {
    const fixture = fixtureV1();
    const requests: SystemDialogHostConfirmationRequestInternalV1[] = [];
    render(
      <SaveOverlayContentInternalV1
        port={fixture.port}
        labels={labelsV1}
        closeLabel="关闭"
        guard={Object.freeze({ allowed: true })}
        confirmationIntent={Object.freeze({
          requestConfirmationInternalV1(
            input: SystemDialogHostConfirmationRequestInternalV1,
          ) {
            requests.push(input);
            return Object.freeze({
              kind: "preparing" as const,
              code: "system_dialog.confirmation_preparation_started" as const,
            });
          },
        })}
        onCloseInternalV1={vi.fn()}
      />,
    );

    await userEvent.setup().click(
      await screen.findByRole("button", { name: "清除快速存档" }),
    );
    const request = requests[0];
    if (request === undefined) throw new Error("expected confirmation request");
    let outcome: Awaited<ReturnType<typeof request.operationBinding.dispatch>> | undefined;
    await act(async () => {
      outcome = await request.operationBinding.dispatch(request.invocation);
    });
    expect(screen.getByTestId("save-operation-result")).toHaveTextContent(
      "正在清除快速存档…",
    );
    if (outcome?.kind !== "retain_root") throw new Error("expected retained result");
    const retainedResult = outcome.result;

    act(() => {
      request.operationBinding.resultSink(
        Object.freeze({ kind: "settled", result: retainedResult }),
      );
      request.operationBinding.finalizeExactRoot();
    });
    expect(screen.getByTestId("save-operation-result")).toHaveTextContent("快速存档已清除");
    expect(screen.getByTestId("save-operation-result")).not.toHaveFocus();
    await waitFor(() => expect(fixture.getStatus).toHaveBeenCalledTimes(2));
  });
});

describe("SaveOverlayContentInternalV1", () => {
  it("shows every port slot in port order but writes only Quick and numbered Manual", async () => {
    renderFixtureV1();

    expect((await screen.findAllByRole("listitem")).map((entry) => entry.dataset.slotId)).toEqual(
      slotIdsV1,
    );
    expect(screen.queryByRole("button", { name: "写入当前自动存档" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "快速保存" })).toBeEnabled();
    const manualSaves = screen.getAllByRole("button", { name: "手动保存" });
    expect(manualSaves).toHaveLength(2);
    for (const button of manualSaves) expect(button).toBeEnabled();
    expect(screen.getByText("手动存档 2")).toBeVisible();
  });

  it("accepts the asynchronous status port without creating another authority", async () => {
    const fixture = fixtureV1({ status: Promise.resolve(statusV1({ busy: true })) });
    renderFixtureV1(fixture);

    expect(await screen.findByText("本地存储正忙")).toBeVisible();
    expect(screen.getByRole("button", { name: "快速保存" })).toBeDisabled();
    expect(fixture.getStatus).toHaveBeenCalledOnce();
  });

  it("subscribes to the live read-only guard projection", async () => {
    const fixture = fixtureV1();
    const allowedPublication = Object.freeze({ allowed: true });
    const blockedPublication = Object.freeze({ allowed: false });
    let publication: Readonly<{ allowed: boolean }> = allowedPublication;
    let listener: (() => void) | null = null;
    const guardProjection = Object.freeze({
      getSnapshot: () => publication,
      subscribe(nextListener: () => void) {
        listener = nextListener;
        return () => {
          listener = null;
        };
      },
      evaluate(value: unknown) {
        return value === blockedPublication
          ? Object.freeze({ allowed: false, reasonText: "剧情进行中不可保存" })
          : Object.freeze({ allowed: true });
      },
    });

    render(
      <SaveOverlayContentInternalV1
        port={fixture.port}
        labels={labelsV1}
        closeLabel="关闭"
        guardProjection={guardProjection}
        confirmationIntent={Object.freeze({
          requestConfirmationInternalV1: vi.fn(() =>
            Object.freeze({
              kind: "unchanged" as const,
              code: "system_dialog.confirmation_already_requested" as const,
            })
          ),
        })}
        onCloseInternalV1={vi.fn()}
      />,
    );

    const quickSave = await screen.findByRole("button", { name: "快速保存" });
    expect(quickSave).toBeEnabled();

    publication = blockedPublication;
    act(() => listener?.());

    expect(quickSave).toBeDisabled();
    expect(screen.getByText("剧情进行中不可保存")).toBeVisible();
    expect(fixture.save).not.toHaveBeenCalled();
  });

  it("remains live across the StrictMode setup-cleanup-setup probe", async () => {
    const fixture = fixtureV1({ status: Promise.resolve(statusV1()) });
    render(
      <StrictMode>
        <SaveOverlayContentInternalV1
          port={fixture.port}
          labels={labelsV1}
          closeLabel="关闭"
          guard={Object.freeze({ allowed: true })}
          confirmationIntent={Object.freeze({
            requestConfirmationInternalV1: vi.fn(() =>
              Object.freeze({
                kind: "unchanged" as const,
                code: "system_dialog.confirmation_already_requested" as const,
              })
            ),
          })}
          onCloseInternalV1={vi.fn()}
        />
      </StrictMode>,
    );

    expect(await screen.findByText("本地存储可用")).toBeVisible();
    expect(screen.getByRole("button", { name: "快速保存" })).toBeEnabled();
  });

  it("maps slot health and preserves the port's slot order verbatim", async () => {
    renderFixtureV1(
      fixtureV1({
        slots: Object.freeze([
          slotV1("auto.current", "empty"),
          slotV1("auto.previous", "valid"),
          slotV1("quick", "invalid"),
          slotV1("manual.1", "recovery_candidate"),
        ]),
      }),
    );

    const entries = await screen.findAllByRole("listitem");
    expect(entries.map((entry) => entry.dataset.slotId)).toEqual([
      "auto.current",
      "auto.previous",
      "quick",
      "manual.1",
    ]);
    expect(entries.map((entry) => entry.querySelector("[data-slot-health]")?.textContent)).toEqual([
      "空槽位",
      "存档有效",
      "存档损坏",
      "可恢复的备用存档",
    ]);
  });

  it("keeps invalid Quick and Manual slots explicitly writable", async () => {
    const fixture = fixtureV1({
      slots: Object.freeze([
        slotV1("auto.current", "empty"),
        slotV1("auto.previous", "empty"),
        slotV1("quick", "invalid"),
        slotV1("manual.1", "invalid"),
      ]),
    });
    renderFixtureV1(fixture);
    const user = userEvent.setup();
    const quickSave = await screen.findByRole("button", { name: "快速保存" });
    const manualSave = screen.getByRole("button", { name: "手动保存" });

    expect(quickSave).toBeEnabled();
    expect(manualSave).toBeEnabled();
    await user.click(quickSave);
    await waitFor(() => expect(fixture.save).toHaveBeenCalledWith("quick"));
    await user.click(manualSave);
    await waitFor(() => expect(fixture.save).toHaveBeenCalledWith("manual.1"));
  });

  it("does not report success before the persistence operation commits", async () => {
    let resolveSave!: (result: PersistenceOperationResultV1) => void;
    const pending = new Promise<PersistenceOperationResultV1>((resolve) => {
      resolveSave = resolve;
    });
    const fixture = fixtureV1({ saveResult: pending });
    renderFixtureV1(fixture);

    await userEvent.setup().click(await screen.findByRole("button", { name: "快速保存" }));
    expect(screen.getByText("正在安全写入快速存档…")).toBeVisible();
    expect(screen.queryByText("快速存档已保存")).not.toBeInTheDocument();

    resolveSave(Object.freeze({ kind: "saved", slotId: "quick" }));
    expect(await screen.findByText("快速存档已保存")).toBeVisible();
  });

  it("keeps current-session export available when storage is unavailable", async () => {
    const fixture = fixtureV1({
      status: statusV1({ available: false }),
      slots: slotIdsV1.map((slotId) => slotV1(slotId, "unavailable")),
    });
    renderFixtureV1(fixture);

    expect(await screen.findByText("本地存储不可用")).toBeVisible();
    const exportCurrent = screen.getByRole("button", { name: "导出当前进度" });
    expect(exportCurrent).toBeEnabled();
    expect(screen.getByRole("button", { name: "快速保存" })).toBeDisabled();
    await userEvent.setup().click(exportCurrent);
    expect(fixture.exportCurrentSave).toHaveBeenCalledOnce();
    expect(await screen.findByText("当前进度已导出")).toBeVisible();
  });

  it("requires explicit confirmation before load, clear, and import", async () => {
    const fixture = fixtureV1({
      slots: Object.freeze([
        slotV1("auto.current", "valid"),
        slotV1("auto.previous", "empty"),
        slotV1("quick", "invalid"),
        slotV1("manual.1", "valid"),
      ]),
    });
    const requests: SystemDialogHostConfirmationRequestInternalV1[] = [];
    render(
      <SaveOverlayContentInternalV1
        port={fixture.port}
        labels={labelsV1}
        closeLabel="关闭"
        guard={Object.freeze({ allowed: true })}
        confirmationIntent={Object.freeze({
          requestConfirmationInternalV1(
            input: SystemDialogHostConfirmationRequestInternalV1,
          ) {
            requests.push(input);
            return Object.freeze({
              kind: "preparing" as const,
              code: "system_dialog.confirmation_preparation_started" as const,
            });
          },
        })}
        onCloseInternalV1={vi.fn()}
      />,
    );
    const user = userEvent.setup();

    const load = await screen.findByRole("button", { name: "读取当前自动存档" });
    await user.click(load);
    expect(fixture.load).not.toHaveBeenCalled();

    const clear = await screen.findByRole("button", { name: "清除快速存档" });
    await user.click(clear);
    expect(fixture.clear).not.toHaveBeenCalled();

    const importSave = await screen.findByRole("button", { name: "导入存档" });
    await user.click(importSave);
    expect(fixture.importSave).not.toHaveBeenCalled();
    expect(requests.map(({ invocation }) => invocation)).toEqual([
      { kind: "load", slotId: "auto.current" },
      { kind: "clear", slotId: "quick" },
      { kind: "import" },
    ]);
  });

  it("projects a cancelled Host file selection without inventing a persistence result", async () => {
    const fixture = fixtureV1({ importResult: Object.freeze({ kind: "cancelled" }) });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "导入存档" }));

    expect(await screen.findByText("已取消导入存档")).toBeVisible();
    expect(screen.queryByText("存档操作发生未预期错误")).not.toBeInTheDocument();
  });

  it.each(
    [
      ["too_large", "所选存档文件过大"],
      ["unsupported_type", "所选文件类型不受支持"],
    ] as const,
  )("projects Host file rejection %s independently", async (code, expectedText) => {
    const fixture = fixtureV1({
      importResult: Object.freeze({ kind: "rejected", code }),
    });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "导入存档" }));

    const result = await screen.findByTestId("save-operation-result");
    await waitFor(() => expect(result).toHaveTextContent(expectedText));
    expect(result).not.toHaveFocus();
  });

  it("reports conflict and fault results truthfully without stealing focus", async () => {
    const fixture = fixtureV1({
      slots: slotIdsV1.map((slotId) => slotV1(slotId, "valid")),
      loadResult: Object.freeze({ kind: "rejected", code: "conflict" }),
      saveResult: Object.freeze({ kind: "faulted", code: "persistence.write_failed" }),
    });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "读取当前自动存档" }));
    const result = await screen.findByTestId("save-operation-result");
    await waitFor(() => expect(result).toHaveTextContent("存档已被其他页面更新"));
    expect(result).not.toHaveFocus();

    await user.click(screen.getByRole("button", { name: "快速保存" }));
    expect(await screen.findByText("存档操作失败：persistence.write_failed")).toBeVisible();
    expect(result).not.toHaveFocus();
  });

  it("refreshes after a retained result without focusing its summary", async () => {
    let resolvePostOperationStatus!: (status: PersistenceStatusV1) => void;
    const postOperationStatus = new Promise<PersistenceStatusV1>((resolve) => {
      resolvePostOperationStatus = resolve;
    });
    const fixture = fixtureV1({
      slots: slotIdsV1.map((slotId) => slotV1(slotId, "valid")),
      loadResult: Object.freeze({ kind: "rejected", code: "conflict" }),
    });
    fixture.getStatus.mockReturnValueOnce(statusV1()).mockReturnValueOnce(postOperationStatus);
    renderFixtureV1(fixture);
    const user = userEvent.setup();
    const opener = await screen.findByRole("button", { name: "读取当前自动存档" });

    await user.click(opener);

    const result = await screen.findByTestId("save-operation-result");
    await waitFor(() => expect(result).toHaveTextContent("存档已被其他页面更新"));
    expect(opener).toBeDisabled();
    expect(result).not.toHaveFocus();

    resolvePostOperationStatus(statusV1());
    await waitFor(() => expect(opener).toBeEnabled());
  });

  it("leaves the rendered semantic publication untouched when import is rejected", async () => {
    const fixture = fixtureV1({
      importResult: Object.freeze({ kind: "rejected", code: "incompatible" }),
    });
    render(
      <>
        <output data-testid="semantic-publication">revision:7</output>
        <SaveOverlayContentInternalV1
          port={fixture.port}
          labels={labelsV1}
          closeLabel="关闭"
          guard={Object.freeze({ allowed: true })}
          confirmationIntent={Object.freeze({
            requestConfirmationInternalV1(
              input: SystemDialogHostConfirmationRequestInternalV1,
            ) {
              void input.operationBinding.dispatch(input.invocation).then(
                (outcome) => {
                  if (outcome.kind === "retain_root") {
                    input.operationBinding.resultSink(
                      Object.freeze({ kind: "settled", result: outcome.result }),
                    );
                  }
                  input.operationBinding.finalizeExactRoot();
                },
              );
              return Object.freeze({
                kind: "preparing" as const,
                code: "system_dialog.confirmation_preparation_started" as const,
              });
            },
          })}
          onCloseInternalV1={vi.fn()}
        />
      </>,
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "导入存档" }));

    expect(await screen.findByText("存档与当前游戏不兼容")).toBeVisible();
    expect(screen.getByTestId("semantic-publication")).toHaveTextContent("revision:7");
  });

  it("projects migration-unavailable as its distinct Player-facing outcome", async () => {
    const fixture = fixtureV1({
      importResult: Object.freeze({ kind: "rejected", code: "migration_unavailable" }),
    });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "导入存档" }));

    expect(await screen.findByText("当前版本尚未提供此存档所需的迁移")).toBeVisible();
  });

  it("projects migration rejection without exposing migration diagnostics", async () => {
    const fixture = fixtureV1({
      importResult: Object.freeze({ kind: "rejected", code: "migration_rejected" }),
    });
    renderFixtureV1(fixture);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "导入存档" }));

    expect(await screen.findByText("存档迁移失败")).toBeVisible();
  });

  it("bounds thrown export failures instead of leaking an unhandled rejection", async () => {
    const fixture = fixtureV1();
    fixture.exportCurrentSave.mockRejectedValueOnce(new Error("browser export failed"));
    renderFixtureV1(fixture);

    await userEvent.setup().click(await screen.findByRole("button", { name: "导出当前进度" }));

    expect(await screen.findByText("存档操作发生未预期错误")).toBeVisible();
  });
});
