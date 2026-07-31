// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { NarrativeGraphV1 } from "@sillymaker/base";

import styles from "./inspector-panels.module.css";

/**
 * Generic read-only DevDock inspectors (R6.1/6.2): they render live data
 * from an observe/subscribe surface — the same publications and views the
 * player UI consumes — and never expose a setter, so DevTools cannot become
 * a second gameplay authority. Stories compose these into DevDock panels.
 */

export interface DebugValueSourceV1 {
  read(): unknown;
  subscribe(listener: () => void): () => void;
}

const inspectorCharBudgetV1 = 20_000;

function renderValueV1(value: unknown): string {
  const text = JSON.stringify(value, null, 2) ?? "undefined";
  if (text.length <= inspectorCharBudgetV1) return text;
  return `${text.slice(0, inspectorCharBudgetV1)}\n… (${
    String(text.length - inspectorCharBudgetV1)
  } chars truncated)`;
}

/**
 * A live JSON view over one observe/subscribe source. The store snapshot is
 * the rendered text itself: reads that rebuild an equal object produce an
 * identical string, so React's Object.is comparison stays stable even when
 * the source allocates per call.
 */
export function DebugValueInspectorV1(props: {
  readonly inspectorId: string;
  readonly source: DebugValueSourceV1;
}): ReactElement {
  const { source } = props;
  const snapshot = (): string => renderValueV1(source.read());
  const text = useSyncExternalStore(source.subscribe, snapshot, snapshot);
  return (
    // The scrollable readout is keyboard-reachable (WCAG: scrollable
    // regions must be focusable) and names itself after the inspector.
    <pre
      className={styles.value}
      data-debug-inspector={props.inspectorId}
      tabIndex={0}
      role="region"
      aria-label={props.inspectorId}
    >
      {text}
    </pre>
  );
}

export interface NarrativeGraphDiagnosticViewV1 {
  readonly code: string;
  readonly nodeId: string | null;
  readonly message: string;
}

/**
 * A read-only narrative-graph listing: every node with its kind,
 * successors, lint annotations, and the currently pending interaction
 * definition highlighted. The Story supplies the projected graph and lint
 * results; DevTools never parse Story scripts themselves.
 */
export function DebugNarrativeGraphViewV1(props: {
  readonly graph: NarrativeGraphV1;
  readonly diagnostics: readonly NarrativeGraphDiagnosticViewV1[];
  readonly activeDefinitionId?: string | null;
}): ReactElement {
  const flaggedNodeIds = new Set(
    props.diagnostics.flatMap((diagnostic) =>
      diagnostic.nodeId === null ? [] : [diagnostic.nodeId]
    ),
  );
  return (
    <div data-debug-inspector="narrative-graph">
      <ol className={styles["graph-list"]}>
        {props.graph.nodes.map((node) => {
          const active = props.activeDefinitionId !== null &&
            props.activeDefinitionId !== undefined &&
            node.interaction !== null &&
            node.interaction.definitionId === props.activeDefinitionId;
          return (
            <li
              key={node.nodeId}
              className={styles["graph-node"]}
              data-graph-node={node.nodeId}
              data-graph-kind={node.kind}
              data-graph-active={active ? "true" : undefined}
              data-graph-flagged={flaggedNodeIds.has(node.nodeId) ? "true" : undefined}
            >
              <span className={styles["graph-kind"]}>{node.kind}</span>
              <span className={styles["graph-id"]}>{node.nodeId}</span>
              {node.interaction === null ? null : (
                <span className={styles["graph-interaction"]}>
                  {node.interaction.definitionId}
                </span>
              )}
              {node.successors.length === 0
                ? null
                : (
                  <span className={styles["graph-successors"]}>→ {node.successors.join(", ")}</span>
                )}
            </li>
          );
        })}
      </ol>
      {props.diagnostics.length === 0
        ? <p data-graph-lint="clean">lint clean</p>
        : (
          <ul data-graph-lint="issues">
            {props.diagnostics.map((diagnostic, index) => (
              <li
                key={`${diagnostic.code}.${String(index)}`}
                data-graph-diagnostic={diagnostic.code}
              >
                {diagnostic.code}
                {diagnostic.nodeId === null ? "" : ` @ ${diagnostic.nodeId}`} — {diagnostic.message}
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
