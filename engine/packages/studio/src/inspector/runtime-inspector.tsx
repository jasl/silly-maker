// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type {
  RuntimeInspectorCodeSurfaceNodeFacetV1,
  RuntimeInspectorSourceV1,
  RuntimeInspectorUnitFacetV1,
} from "../core/runtime-inspection.ts";
import { calculateFixedRowWindowV1, fixedRowRevealScrollTopV1 } from "./fixed-row-window.ts";
import styles from "./inspector.module.css";

export interface RuntimeInspectorPanelPropsV1 {
  readonly source: RuntimeInspectorSourceV1;
}

type RuntimeInspectorRowV1 =
  | { readonly kind: "unit"; readonly key: string; readonly unit: RuntimeInspectorUnitFacetV1 }
  | {
    readonly kind: "code_surface";
    readonly key: string;
    readonly node: RuntimeInspectorCodeSurfaceNodeFacetV1;
  };

const runtimeRowHeightV1 = 54;
const runtimeViewportHeightV1 = 270;

function rowKeyV1(ownerId: string, kind: string, id: string): string {
  return `${ownerId}\0${kind}\0${id}`;
}

function rowsV1(
  units: readonly RuntimeInspectorUnitFacetV1[],
  nodes: readonly RuntimeInspectorCodeSurfaceNodeFacetV1[],
): readonly RuntimeInspectorRowV1[] {
  return [
    ...units.map((unit): RuntimeInspectorRowV1 => ({
      kind: "unit",
      key: rowKeyV1(unit.ownerId, unit.kind, unit.unitId),
      unit,
    })),
    ...nodes.map((node): RuntimeInspectorRowV1 => ({
      kind: "code_surface",
      key: rowKeyV1(
        node.ownerId,
        "code_surface",
        `${node.compositionId}\0${node.nodeId}`,
      ),
      node,
    })),
  ];
}

function rowSearchTextV1(row: RuntimeInspectorRowV1): string {
  return row.kind === "unit"
    ? [
      row.unit.kind,
      row.unit.unitId,
      row.unit.source ?? "",
      row.unit.status,
      row.unit.ownerId,
    ].join(" ").toLocaleLowerCase()
    : [
      "code surface",
      row.node.compositionId,
      row.node.nodeId,
      row.node.viewId,
      row.node.source ?? "",
      row.node.lifecycle,
      row.node.ownerId,
    ].join(" ").toLocaleLowerCase();
}

function RuntimeInspectorDetailV1(props: {
  readonly row: RuntimeInspectorRowV1 | null;
  readonly source: RuntimeInspectorSourceV1;
}) {
  const row = props.row;
  if (row === null) return <p className={styles.empty}>选择一个 runtime facet 查看详情。</p>;
  if (row.kind === "unit") {
    const unit = row.unit;
    return (
      <dl className={styles["runtime-detail"]} data-runtime-inspector-detail={unit.unitId}>
        <dt>Unit</dt>
        <dd>
          <code>{unit.kind}:{unit.unitId}</code>
        </dd>
        <dt>Owner</dt>
        <dd>{unit.ownerId} · {unit.ownerStatus}</dd>
        <dt>Status</dt>
        <dd>{unit.status}{unit.current ? " · current" : ""}</dd>
        <dt>Source</dt>
        <dd>
          <code>{unit.source ?? "not declared"}</code>
        </dd>
        <dt>Attempts</dt>
        <dd>{unit.attempt} · failures {unit.failureCount}</dd>
        <dt>Timing</dt>
        <dd>
          {unit.timing === null
            ? "not acquired"
            : `load ${unit.timing.loadMs.toFixed(3)} · admit ${
              unit.timing.admitMs.toFixed(3)
            } · activate ${unit.timing.activateMs.toFixed(3)} · total ${
              unit.timing.totalMs.toFixed(3)
            } ms`}
        </dd>
        <dt>References</dt>
        <dd>
          {unit.references.length === 0
            ? "none"
            : unit.references.map((reference) => `${reference.kind}:${reference.unitId}`).join(
              ", ",
            )}
        </dd>
        {unit.diagnostic === null ? null : (
          <>
            <dt>Diagnostic</dt>
            <dd>
              <code>{unit.diagnostic.code}</code>
              {unit.diagnostic.detail ?? ""}
            </dd>
          </>
        )}
        {unit.status === "failed" && unit.retryable
          ? (
            <>
              <dt>Recovery</dt>
              <dd>
                <button
                  type="button"
                  data-runtime-inspector-retry={unit.unitId}
                  onClick={() => {
                    void props.source.retry({
                      ownerId: unit.ownerId,
                      kind: unit.kind,
                      unitId: unit.unitId,
                    });
                  }}
                >
                  Retry acquisition
                </button>
              </dd>
            </>
          )
          : null}
      </dl>
    );
  }
  const node = row.node;
  return (
    <dl className={styles["runtime-detail"]} data-runtime-inspector-detail={node.nodeId}>
      <dt>Code Surface</dt>
      <dd>
        <code>{node.nodeId}</code> · <code>{node.viewId}</code>
      </dd>
      <dt>Lifecycle</dt>
      <dd>{node.lifecycle}</dd>
      <dt>Outer layout</dt>
      <dd>{node.layoutDomain} · geometry owned by {node.outerGeometryOwner}</dd>
      <dt>State owner</dt>
      <dd>{node.stateOwner}</dd>
      <dt>Policy</dt>
      <dd>
        input {node.policy.input} · native text {node.policy.nativeText} · portal{" "}
        {node.policy.portal}
      </dd>
      <dt>Source</dt>
      <dd>
        <code>{node.source ?? "not declared"}</code> · <code>{node.documentPath}</code>
      </dd>
      {node.diagnostic === null ? null : (
        <>
          <dt>Diagnostic</dt>
          <dd>
            <code>{node.diagnostic.code}</code>
            {node.diagnostic.detail ?? ""}
          </dd>
        </>
      )}
    </dl>
  );
}

/** Virtualized, read-only view over the application-owned runtime projection. */
export function RuntimeInspectorPanelV1(props: RuntimeInspectorPanelPropsV1): ReactElement {
  const snapshot = useSyncExternalStore(
    props.source.subscribe,
    props.source.getSnapshot,
    props.source.getSnapshot,
  );
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollTopRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const allRows = useMemo(
    () => rowsV1(snapshot.units, snapshot.codeSurfaceNodes),
    [snapshot.codeSurfaceNodes, snapshot.units],
  );
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (normalized.length === 0) return allRows;
    return allRows.filter((row) => rowSearchTextV1(row).includes(normalized));
  }, [allRows, query]);
  const selected = filteredRows.find((row) => row.key === selectedKey) ?? null;
  const effectiveSelected = selected ??
    filteredRows.find((row) =>
      row.kind === "unit" && row.unit.current && row.unit.ownerStatus === "active"
    ) ?? filteredRows[0] ?? null;
  const effectiveSelectedKey = effectiveSelected?.key ?? null;

  useEffect(() => {
    const rowIndex = filteredRows.findIndex((row) => row.key === effectiveSelectedKey);
    if (rowIndex === -1) return;
    const next = fixedRowRevealScrollTopV1({
      totalRows: filteredRows.length,
      rowIndex,
      rowHeight: runtimeRowHeightV1,
      viewportHeight: runtimeViewportHeightV1,
      scrollTop: scrollTopRef.current,
    });
    if (next === scrollTopRef.current) return;
    scrollTopRef.current = next;
    if (listRef.current !== null) listRef.current.scrollTop = next;
    setScrollTop(next);
  }, [effectiveSelectedKey, filteredRows]);

  const window = calculateFixedRowWindowV1({
    totalRows: filteredRows.length,
    rowHeight: runtimeRowHeightV1,
    viewportHeight: runtimeViewportHeightV1,
    scrollTop,
    overscanRows: 3,
  });
  const visibleRows = filteredRows.slice(window.start, window.endExclusive);
  const working = snapshot.workingSet;

  return (
    <section className={styles["runtime-panel"]} aria-label="Runtime Inspector">
      <header className={styles["section-header"]}>
        <div>
          <strong>Runtime</strong>
          <span>
            owner {snapshot.activeOwnerId ?? "not connected"} · loaded {working.loaded} · acquiring
            {" "}
            {working.acquiring} · failed {working.failed}
          </span>
        </div>
      </header>
      <div className={styles["runtime-layout"]}>
        <div>
          <label className={styles["search-field"]}>
            <span>搜索 runtime unit 或 Code Surface</span>
            <input
              type="search"
              value={query}
              placeholder="kind、ID、source 或 lifecycle"
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                scrollTopRef.current = 0;
                if (listRef.current !== null) listRef.current.scrollTop = 0;
                setScrollTop(0);
              }}
            />
          </label>
          <div
            ref={listRef}
            className={styles["virtual-list"]}
            style={{ height: runtimeViewportHeightV1 }}
            data-runtime-inspector-list="true"
            data-runtime-inspector-mounted-rows={String(visibleRows.length)}
            onScroll={(event) => {
              scrollTopRef.current = event.currentTarget.scrollTop;
              setScrollTop(event.currentTarget.scrollTop);
            }}
          >
            <div className={styles["virtual-list-sizer"]} style={{ height: window.totalHeightPx }}>
              <div style={{ transform: `translateY(${String(window.offsetPx)}px)` }}>
                {visibleRows.map((row) => {
                  const label = row.kind === "unit"
                    ? `${row.unit.kind} · ${row.unit.unitId}`
                    : `Code Surface · ${row.node.nodeId}`;
                  const state = row.kind === "unit" ? row.unit.status : row.node.lifecycle;
                  return (
                    <button
                      type="button"
                      key={row.key}
                      className={styles["runtime-row"]}
                      style={{ height: runtimeRowHeightV1 }}
                      aria-current={effectiveSelectedKey === row.key ? "true" : undefined}
                      data-runtime-inspector-row={row.kind === "unit"
                        ? row.unit.unitId
                        : row.node.nodeId}
                      onClick={() => setSelectedKey(row.key)}
                    >
                      <strong>{label}</strong>
                      <span>{state}</span>
                      <small>
                        {row.kind === "unit"
                          ? `${row.unit.ownerId}${row.unit.current ? " · current" : ""}`
                          : `${row.node.viewId} · ${row.node.ownerId}`}
                      </small>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <RuntimeInspectorDetailV1 row={effectiveSelected} source={props.source} />
      </div>
      {filteredRows.length === 0
        ? (
          <p className={styles.empty}>
            没有匹配的 runtime facet；Inspector 不会为诊断强制加载 unit。
          </p>
        )
        : null}
    </section>
  );
}
