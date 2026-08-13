// SPDX-License-Identifier: MIT
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import type { FormEvent, ReactElement, ReactNode } from "react";

import { Button } from "../primitives/button.tsx";
import { DebugValueInspectorV1 } from "./inspector-panels.tsx";
import type { StateTunerLeafV1, StateTunerPortV1 } from "./state-tuner.ts";
import { flattenStateTunerLeavesV1 } from "./state-tuner.ts";
import styles from "./state-tuner-panel.module.css";

export type { StateTunerPortV1, StateTunerPatchResultV1 } from "./state-tuner.ts";
export { engineStateInspectorPanelIdV1, engineStateTunerPanelIdV1 } from "./state-tuner.ts";

export function EngineStateInspectorPanelV1(props: {
  readonly port: StateTunerPortV1;
}): ReactElement {
  return (
    <div className={styles.inspector} data-engine-state-inspector="true">
      <DebugValueInspectorV1
        inspectorId="engine.state"
        source={Object.freeze({
          read: () => props.port.read(),
          subscribe: (listener: () => void) => props.port.subscribe(listener),
        })}
      />
    </div>
  );
}

export function EngineStateTunerPanelV1(props: {
  readonly port: StateTunerPortV1;
}): ReactElement {
  const { port } = props;
  const snapshot = (): unknown => port.read();
  const state = useSyncExternalStore(port.subscribe, snapshot, snapshot);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const normalizedFilter = filter.trim().toLowerCase();
  const flattened = useMemo(
    () => flattenStateTunerLeavesV1(state, { filter: normalizedFilter }),
    [normalizedFilter, state],
  );
  const visible = flattened.leaves;

  return (
    <div className={styles.inspector} data-engine-state-tuner="true">
      <p className={styles.note}>
        编辑已有叶子（数字 / 布尔 / 字符串）。提交走权威调试通道，失败不改会话。
      </p>
      <label className={styles.filter}>
        过滤
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="过滤状态路径"
        />
      </label>
      {flattened.truncated
        ? <p className={styles.truncated}>只显示前 {String(flattened.leaves.length)} 条叶子。</p>
        : null}
      <div className={styles["table-wrap"]}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">路径</th>
              <th scope="col">值</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((leaf) => (
              <StateTunerRowV1
                key={leaf.pathLabel}
                leaf={leaf}
                port={port}
                onStatus={setStatus}
              />
            ))}
          </tbody>
        </table>
      </div>
      {status === null ? null : <p className={styles.status} role="status">{status}</p>}
    </div>
  );
}

function StateTunerRowV1(props: {
  readonly leaf: StateTunerLeafV1;
  readonly port: StateTunerPortV1;
  readonly onStatus: (message: string) => void;
}): ReactElement {
  const { leaf, port, onStatus } = props;
  const [draft, setDraft] = useState<string | boolean>(
    leaf.kind === "boolean" ? leaf.value === true : stringifyLeafV1(leaf.value),
  );
  const [pending, setPending] = useState(false);
  const formId = useId();

  useEffect(() => {
    setDraft(leaf.kind === "boolean" ? leaf.value === true : stringifyLeafV1(leaf.value));
  }, [leaf.kind, leaf.value]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (pending || leaf.kind === "null") return;
    const parsed = parseDraftV1(leaf, draft);
    if (parsed.kind === "invalid") {
      onStatus(parsed.message);
      return;
    }
    setPending(true);
    try {
      const result = await port.patch(leaf.path, parsed.value);
      switch (result.kind) {
        case "committed":
          onStatus("已写入");
          break;
        case "validation_failed":
          onStatus(result.message);
          break;
        case "capability_disabled":
          onStatus("需要启用作弊功能");
          break;
        case "rejected":
          onStatus(result.message);
          break;
        default: {
          const exhaustive: never = result;
          onStatus(String(exhaustive));
        }
      }
    } catch {
      onStatus("写入失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <tr data-engine-state-tuner-path={leaf.pathLabel}>
      <td className={styles.path}>{leaf.pathLabel}</td>
      <td>
        <form id={formId} className={styles.editor} onSubmit={(event) => void submit(event)}>
          {renderEditorV1(leaf, draft, setDraft, pending)}
          <Button
            type="submit"
            disabled={pending || leaf.kind === "null"}
            data-engine-state-tuner-write="true"
          >
            写入
          </Button>
        </form>
      </td>
    </tr>
  );
}

function renderEditorV1(
  leaf: StateTunerLeafV1,
  draft: string | boolean,
  setDraft: (next: string | boolean) => void,
  pending: boolean,
): ReactNode {
  if (leaf.kind === "null") return <span>null</span>;
  if (leaf.kind === "boolean") {
    return (
      <input
        type="checkbox"
        checked={draft === true}
        disabled={pending}
        onChange={(event) => setDraft(event.target.checked)}
        aria-label={leaf.pathLabel}
      />
    );
  }
  return (
    <input
      type={leaf.kind === "number" ? "number" : "text"}
      value={typeof draft === "string" ? draft : ""}
      disabled={pending}
      step={leaf.kind === "number" ? 1 : undefined}
      onChange={(event) => setDraft(event.target.value)}
      aria-label={leaf.pathLabel}
    />
  );
}

function stringifyLeafV1(value: string | number | boolean | null): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return String(value);
}

function parseDraftV1(
  leaf: StateTunerLeafV1,
  draft: string | boolean,
):
  | { readonly kind: "ok"; readonly value: string | number | boolean }
  | { readonly kind: "invalid"; readonly message: string } {
  switch (leaf.kind) {
    case "boolean":
      return Object.freeze({ kind: "ok", value: draft === true });
    case "number": {
      if (typeof draft !== "string" || draft.trim().length === 0) {
        return Object.freeze({ kind: "invalid", message: "需要整数" });
      }
      const parsed = Number(draft);
      if (!Number.isSafeInteger(parsed) || Object.is(parsed, -0)) {
        return Object.freeze({ kind: "invalid", message: "需要整数" });
      }
      return Object.freeze({ kind: "ok", value: parsed });
    }
    case "string":
      return Object.freeze({ kind: "ok", value: typeof draft === "string" ? draft : "" });
    case "null":
      return Object.freeze({ kind: "invalid", message: "不能改写 null" });
    default: {
      const exhaustive: never = leaf.kind;
      return Object.freeze({ kind: "invalid", message: String(exhaustive) });
    }
  }
}
