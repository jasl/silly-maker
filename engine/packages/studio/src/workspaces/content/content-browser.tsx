// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import type { StudioContentDescriptorV1 } from "../../core/binding.ts";
import styles from "../../studio-app.module.css";

/**
 * The Content browser (Scene Construction S4): the binding's content
 * authoring manifest, grouped by category. Adding a descriptor creates an
 * entry in the open scene draft with a derived stable tag; content whose
 * resolution declares no geometry is flagged inline (no selection box on
 * the canvas — the inspector's numeric fields still work).
 */

const categoryOrderV1 = ["background", "character", "prop", "effect"] as const;

const categoryLabelsV1: Readonly<Record<(typeof categoryOrderV1)[number], string>> = {
  background: "背景",
  character: "人物",
  prop: "道具",
  effect: "效果",
};

export interface ContentBrowserPropsV1 {
  readonly contents: readonly StudioContentDescriptorV1[];
  /** ContentIds whose default resolution declares geometry (draggable). */
  readonly geometryContentIds: ReadonlySet<string>;
  /** Adding requires an open draft. */
  readonly canAdd: boolean;
  onAdd(descriptor: StudioContentDescriptorV1): void;
}

export function ContentBrowserV1(props: ContentBrowserPropsV1): ReactElement {
  return (
    <section aria-label="内容" data-studio-contents="true">
      <h2>内容</h2>
      {categoryOrderV1.map((category) => {
        const descriptors = props.contents.filter(
          (descriptor) => descriptor.category === category,
        );
        if (descriptors.length === 0) return null;
        return (
          <div key={category} data-studio-content-category={category}>
            <h3>{categoryLabelsV1[category]}</h3>
            <ul>
              {descriptors.map((descriptor) => (
                <li key={descriptor.contentId} className={styles["content-row"]}>
                  <button
                    type="button"
                    data-studio-add-content={descriptor.contentId}
                    disabled={!props.canAdd}
                    onClick={() =>
                      props.onAdd(descriptor)}
                  >
                    加入
                  </button>
                  <span>{descriptor.label}</span>
                  {category !== "background" &&
                      !props.geometryContentIds.has(descriptor.contentId)
                    ? <span className={styles["content-chip"]}>不可拖拽</span>
                    : null}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
