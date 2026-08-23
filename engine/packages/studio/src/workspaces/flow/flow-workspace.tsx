// SPDX-License-Identifier: MIT
import { useMemo, useState } from "react";
import type { ReactElement } from "react";

import type { NarrativeFlowGraphV1 } from "../../core/binding.ts";
import { buildFlowDocGroupsV1, buildFlowDocLayoutV1, resolveFlowTextV1 } from "./flow-model.ts";
import type { FlowTextResolverV1 } from "./flow-model.ts";
import styles from "../../studio-app.module.css";

/**
 * The Flow workspace (Authoring Architecture S5): a read-only view of the
 * compiled `NarrativeFlowGraphV1`. One document at a time renders as a
 * layered graph with labeled edges; clicking a node reveals its source
 * reference (the interaction document and block that own it), and clicking
 * a cross-document stub jumps to that document with the target selected.
 * Nothing here edits, stores layout, or becomes a second author authority.
 */

export interface FlowWorkspaceSectionPropsV1 {
  readonly flow: NarrativeFlowGraphV1;
  /** The binding's optional default-locale text lookup for `text.*` ids. */
  readonly resolveText?: FlowTextResolverV1;
}

const flowNodeWidthV1 = 168;
const flowNodeHeightV1 = 44;
const flowColGapV1 = 196;
const flowRowGapV1 = 92;
const flowMarginV1 = 20;

function nodeXV1(col: number): number {
  return flowMarginV1 + col * flowColGapV1;
}

function nodeYV1(row: number): number {
  return flowMarginV1 + row * flowRowGapV1;
}

function idTailV1(id: string): string {
  const dot = id.lastIndexOf(".");
  return dot === -1 ? id : id.slice(dot + 1);
}

function truncateFlowLabelV1(text: string, max = 18): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function nodeCanvasLabelV1(
  node: NarrativeFlowGraphV1["nodes"][number],
  resolveText: FlowTextResolverV1 | undefined,
): string {
  if ((node.kind === "say" || node.kind === "menu") && node.summary.length > 0) {
    return truncateFlowLabelV1(resolveFlowTextV1(node.summary, resolveText));
  }
  return node.blockName ?? idTailV1(node.nodeId);
}

export function FlowWorkspaceSectionV1(props: FlowWorkspaceSectionPropsV1): ReactElement {
  const { flow, resolveText } = props;
  const groups = useMemo(() => buildFlowDocGroupsV1(flow), [flow]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(groups[0]?.docId ?? null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const activeDocId = groups.some((group) => group.docId === selectedDocId)
    ? selectedDocId
    : groups[0]?.docId ?? null;
  const layout = useMemo(
    () => buildFlowDocLayoutV1(flow, activeDocId, resolveText),
    [activeDocId, flow, resolveText],
  );
  const centerByNodeId = useMemo(() => {
    const centers = new Map<string, { readonly x: number; readonly y: number }>();
    for (const placed of layout.nodes) {
      centers.set(placed.node.nodeId, {
        x: nodeXV1(placed.col) + flowNodeWidthV1 / 2,
        y: nodeYV1(placed.row),
      });
    }
    for (const stub of layout.stubs) {
      centers.set(stub.nodeId, {
        x: nodeXV1(stub.col) + flowNodeWidthV1 / 2,
        y: nodeYV1(stub.row),
      });
    }
    return centers;
  }, [layout]);

  const selectedNode = flow.nodes.find((node) => node.nodeId === selectedNodeId) ?? null;
  const width = Math.max(1, layout.cols) * flowColGapV1 + flowMarginV1 * 2;
  const height = Math.max(1, layout.rows) * flowRowGapV1 + flowMarginV1 * 2;

  const jumpToNode = (nodeId: string): void => {
    const target = flow.nodes.find((node) => node.nodeId === nodeId);
    if (target === undefined) return;
    setSelectedDocId(target.docId);
    setSelectedNodeId(target.nodeId);
  };

  return (
    <div className={styles["flow"]} data-studio-flow="true">
      <h2>Narrative 流程（只读投影）</h2>
      <div className={styles["flow-docs"]} role="group" aria-label="交互文档">
        {groups.map((group) => (
          <button
            key={group.docId ?? "hand-written"}
            type="button"
            data-studio-flow-doc={group.docId ?? "hand-written"}
            aria-pressed={group.docId === activeDocId}
            onClick={() => {
              setSelectedDocId(group.docId);
              setSelectedNodeId(null);
            }}
          >
            {group.label}（{group.nodeCount}）
          </button>
        ))}
      </div>
      <div className={styles["flow-body"]}>
        <div className={styles["flow-canvas"]}>
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${String(width)} ${String(height)}`}
            role="img"
            aria-label={`流程图 ${activeDocId ?? "手写节点"}`}
          >
            <defs>
              <marker
                id="studio-flow-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 z" className={styles["flow-arrow"] ?? ""} />
              </marker>
            </defs>
            {layout.edges.map((edge) => {
              const from = centerByNodeId.get(edge.from);
              const to = centerByNodeId.get(edge.to);
              if (from === undefined || to === undefined) return null;
              const x1 = from.x;
              const y1 = from.y + flowNodeHeightV1;
              const x2 = to.x;
              const y2 = to.y;
              return (
                <g key={`${edge.from}->${edge.to}:${edge.kind}:${edge.text}`}>
                  <line
                    className={styles["flow-edge"]}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    markerEnd="url(#studio-flow-arrow)"
                  />
                  {edge.text === "" ? null : (
                    <text
                      className={styles["flow-edge-label"]}
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 4}
                      textAnchor="middle"
                    >
                      {edge.text}
                    </text>
                  )}
                </g>
              );
            })}
            {layout.nodes.map((placed) => {
              const x = nodeXV1(placed.col);
              const y = nodeYV1(placed.row);
              const selected = placed.node.nodeId === selectedNodeId;
              return (
                <g
                  key={placed.node.nodeId}
                  data-studio-flow-node={placed.node.nodeId}
                  data-studio-flow-selected={selected ? "true" : undefined}
                  className={styles["flow-node"]}
                  onClick={() => setSelectedNodeId(placed.node.nodeId)}
                >
                  <title>{resolveFlowTextV1(placed.node.summary, resolveText)}</title>
                  <rect
                    x={x}
                    y={y}
                    width={flowNodeWidthV1}
                    height={flowNodeHeightV1}
                    rx={6}
                    className={selected
                      ? styles["flow-node-box-selected"]
                      : styles["flow-node-box"]}
                  />
                  <text className={styles["flow-node-kind"]} x={x + 8} y={y + 17}>
                    {placed.node.kind}
                  </text>
                  <text className={styles["flow-node-name"]} x={x + 8} y={y + 34}>
                    {nodeCanvasLabelV1(placed.node, resolveText)}
                  </text>
                </g>
              );
            })}
            {layout.stubs.map((stub) => {
              const x = nodeXV1(stub.col);
              const y = nodeYV1(stub.row);
              return (
                <g
                  key={stub.nodeId}
                  data-studio-flow-stub={stub.nodeId}
                  className={styles["flow-node"]}
                  onClick={() => {
                    if (stub.known) jumpToNode(stub.nodeId);
                  }}
                >
                  <title>{stub.nodeId}</title>
                  <rect
                    x={x}
                    y={y}
                    width={flowNodeWidthV1}
                    height={flowNodeHeightV1}
                    rx={6}
                    className={styles["flow-stub-box"]}
                  />
                  <text className={styles["flow-node-kind"]} x={x + 8} y={y + 17}>
                    {stub.known ? "→ 文档" : "→ 图外"}
                  </text>
                  <text className={styles["flow-node-name"]} x={x + 8} y={y + 34}>
                    {idTailV1(stub.nodeId)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <aside className={styles["flow-details"]} aria-label="节点详情">
          {selectedNode === null ? <p>点击节点查看它的源文档。</p> : (
            <dl>
              <dt>节点</dt>
              <dd data-studio-flow-node-id="true">{selectedNode.nodeId}</dd>
              <dt>类型</dt>
              <dd>{selectedNode.kind}</dd>
              <dt>摘要</dt>
              <dd data-studio-flow-summary="true">
                {resolveFlowTextV1(selectedNode.summary, resolveText)}
              </dd>
              <dt>源文档</dt>
              <dd data-studio-flow-source="true">{selectedNode.source}</dd>
            </dl>
          )}
        </aside>
      </div>
    </div>
  );
}
