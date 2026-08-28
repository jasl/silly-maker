// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";

import type { AuthoringSceneDocumentV1 } from "@sillymaker/base/authoring/scene";
import type { StageTagV1 } from "@sillymaker/base";

import { calculateFixedRowWindowV1, fixedRowRevealScrollTopV1 } from "./fixed-row-window.ts";
import { flattenInspectorTreeV1 } from "./scene-model.ts";
import type { InspectorTreeRowV1 } from "./scene-model.ts";
import styles from "./inspector.module.css";

export interface InspectorSceneTreePropsV1 {
  readonly document: AuthoringSceneDocumentV1;
  readonly selectedObjectId: StageTagV1 | null;
  onSelectObject(objectId: StageTagV1): void;
}

const treeRowHeightV1 = 38;
const treeTouchRowHeightV1 = 44;
const treeViewportHeightCapV1 = 420;
const treeOverscanRowsV1 = 4;

function primaryPointerIsCoarseV1(): boolean {
  return typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(pointer: coarse)").matches;
}

function usePrimaryPointerCoarseV1(): boolean {
  const [coarse, setCoarse] = useState(primaryPointerIsCoarseV1);
  useEffect(() => {
    if (typeof globalThis.matchMedia !== "function") return undefined;
    const query = globalThis.matchMedia("(pointer: coarse)");
    const update = (): void => setCoarse(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return coarse;
}

function filteredRowsV1(
  rows: readonly InspectorTreeRowV1[],
  query: string,
): readonly InspectorTreeRowV1[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized.length === 0) return rows;
  const matchedLayers = new Set<string>();
  const matchedObjects = new Set<string>();
  for (const row of rows) {
    if (row.kind !== "object") continue;
    if (
      row.label.toLocaleLowerCase().includes(normalized) ||
      row.objectId.toLocaleLowerCase().includes(normalized)
    ) {
      matchedObjects.add(row.objectId);
      matchedLayers.add(row.layerId);
    }
  }
  return rows.filter((row) =>
    row.kind === "layer" ? matchedLayers.has(row.layerId) : matchedObjects.has(row.objectId)
  );
}

export function InspectorSceneTreeV1(props: InspectorSceneTreePropsV1): ReactElement {
  const coarsePointer = usePrimaryPointerCoarseV1();
  const rowHeight = coarsePointer ? treeTouchRowHeightV1 : treeRowHeightV1;
  const [query, setQuery] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const scrollTopRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(
    () => filteredRowsV1(flattenInspectorTreeV1(props.document), query),
    [props.document, query],
  );
  const viewportHeight = Math.min(
    treeViewportHeightCapV1,
    Math.max(rowHeight, rows.length * rowHeight),
  );
  useEffect(() => {
    const rowIndex = rows.findIndex((row) =>
      row.kind === "object" && row.objectId === props.selectedObjectId
    );
    if (rowIndex === -1) return;
    const next = fixedRowRevealScrollTopV1({
      totalRows: rows.length,
      rowIndex,
      rowHeight,
      viewportHeight,
      scrollTop: scrollTopRef.current,
    });
    if (next === scrollTopRef.current) return;
    scrollTopRef.current = next;
    if (listRef.current !== null) listRef.current.scrollTop = next;
    setScrollTop(next);
  }, [props.selectedObjectId, rowHeight, rows, viewportHeight]);
  const window = calculateFixedRowWindowV1({
    totalRows: rows.length,
    rowHeight,
    viewportHeight,
    scrollTop,
    overscanRows: treeOverscanRowsV1,
  });
  const visible = rows.slice(window.start, window.endExclusive);

  return (
    <section className={styles.panel} aria-label="场景层级">
      <header className={styles["section-header"]}>
        <div>
          <strong>Layer / Object</strong>
          <span>{props.document.layers.length} layers · {rows.length} rows</span>
        </div>
      </header>
      <label className={styles["search-field"]}>
        <span>搜索当前场景对象</span>
        <input
          type="search"
          value={query}
          placeholder="名称或 objectId"
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
        style={{ height: viewportHeight }}
        data-inspector-object-list="true"
        data-inspector-object-row-height={String(rowHeight)}
        data-inspector-mounted-rows={String(visible.length)}
        onScroll={(event) => {
          scrollTopRef.current = event.currentTarget.scrollTop;
          setScrollTop(event.currentTarget.scrollTop);
        }}
      >
        <div className={styles["virtual-list-sizer"]} style={{ height: window.totalHeightPx }}>
          <div style={{ transform: `translateY(${String(window.offsetPx)}px)` }}>
            {visible.map((row) =>
              row.kind === "layer"
                ? (
                  <div
                    key={row.key}
                    className={styles["layer-row"]}
                    style={{ height: rowHeight }}
                    data-inspector-layer={row.layerId}
                  >
                    <span aria-hidden="true">▱</span>
                    <strong>{row.label}</strong>
                    <code>{row.layerId}</code>
                  </div>
                )
                : (
                  <button
                    type="button"
                    key={row.key}
                    className={styles["object-row"]}
                    style={{
                      height: rowHeight,
                      paddingInlineStart: `${String(12 + row.depth * 16)}px`,
                    }}
                    aria-current={props.selectedObjectId === row.objectId ? "true" : undefined}
                    data-inspector-object={row.objectId}
                    onClick={() => props.onSelectObject(row.objectId)}
                  >
                    <span aria-hidden="true">{row.hasVisual ? "◆" : "◇"}</span>
                    <span>{row.label}</span>
                    <code>{row.objectId}</code>
                  </button>
                )
            )}
          </div>
        </div>
      </div>
      {rows.length === 0 ? <p className={styles.empty}>没有匹配的对象。</p> : null}
    </section>
  );
}
