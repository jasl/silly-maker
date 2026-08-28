// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";

import type { AuthoringSceneIoListEntryV1 } from "../core/authoring-scene-io.ts";
import { calculateFixedRowWindowV1, fixedRowRevealScrollTopV1 } from "./fixed-row-window.ts";
import styles from "./inspector.module.css";

export interface InspectorSceneListPropsV1 {
  readonly scenes: readonly AuthoringSceneIoListEntryV1[];
  readonly currentPath: string | null;
  readonly disabled: boolean;
  onOpen(path: string): void;
}

const sceneRowHeightV1 = 50;
const sceneViewportHeightCapV1 = 250;

export function InspectorSceneListV1(props: InspectorSceneListPropsV1): ReactElement {
  const [query, setQuery] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const scrollTopRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const scenes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (normalized.length === 0) return props.scenes;
    return props.scenes.filter((scene) =>
      scene.label.toLocaleLowerCase().includes(normalized) ||
      scene.sceneId.toLocaleLowerCase().includes(normalized) ||
      scene.path.toLocaleLowerCase().includes(normalized)
    );
  }, [props.scenes, query]);
  const viewportHeight = Math.min(
    sceneViewportHeightCapV1,
    Math.max(sceneRowHeightV1, scenes.length * sceneRowHeightV1),
  );
  useEffect(() => {
    const rowIndex = scenes.findIndex((scene) => scene.path === props.currentPath);
    if (rowIndex === -1) return;
    const next = fixedRowRevealScrollTopV1({
      totalRows: scenes.length,
      rowIndex,
      rowHeight: sceneRowHeightV1,
      viewportHeight,
      scrollTop: scrollTopRef.current,
    });
    if (next === scrollTopRef.current) return;
    scrollTopRef.current = next;
    if (listRef.current !== null) listRef.current.scrollTop = next;
    setScrollTop(next);
  }, [props.currentPath, scenes, viewportHeight]);
  const window = calculateFixedRowWindowV1({
    totalRows: scenes.length,
    rowHeight: sceneRowHeightV1,
    viewportHeight,
    scrollTop,
    overscanRows: 3,
  });
  const visible = scenes.slice(window.start, window.endExclusive);

  return (
    <section className={styles.panel} aria-label="Scene 导航">
      <header className={styles["section-header"]}>
        <div>
          <strong>Scenes</strong>
          <span>{props.scenes.length} documents</span>
        </div>
      </header>
      <label className={styles["search-field"]}>
        <span>搜索当前应用的 Scene</span>
        <input
          type="search"
          value={query}
          placeholder="名称、sceneId 或路径"
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
        data-inspector-scene-list="true"
        data-inspector-mounted-scenes={String(visible.length)}
        onScroll={(event) => {
          scrollTopRef.current = event.currentTarget.scrollTop;
          setScrollTop(event.currentTarget.scrollTop);
        }}
      >
        <div className={styles["virtual-list-sizer"]} style={{ height: window.totalHeightPx }}>
          <div style={{ transform: `translateY(${String(window.offsetPx)}px)` }}>
            {visible.map((scene) => (
              <button
                type="button"
                key={scene.path}
                className={styles["scene-row"]}
                style={{ height: sceneRowHeightV1 }}
                aria-current={props.currentPath === scene.path ? "true" : undefined}
                disabled={props.disabled}
                data-inspector-scene={scene.sceneId}
                onClick={() => props.onOpen(scene.path)}
              >
                <strong>{scene.label}</strong>
                <code>{scene.sceneId}</code>
                <small>{scene.path}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
      {scenes.length === 0 ? <p className={styles.empty}>没有匹配的 Authoring Scene。</p> : null}
    </section>
  );
}
