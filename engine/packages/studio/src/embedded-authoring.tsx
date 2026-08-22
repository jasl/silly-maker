// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { StudioBindingV1 } from "./core/binding.ts";
import type { AuthoringHostInternalV1 } from "./core/authoring-host.ts";
import { resolveAuthoringHostOwnerInternalV1 } from "./core/authoring-host.ts";
import { AuthoringHostSurfaceInternalV1 } from "./studio-app.tsx";
import styles from "./studio-app.module.css";

export interface EmbeddedAuthoringSurfacePropsInternalV1 {
  readonly host: AuthoringHostInternalV1;
  readonly binding: StudioBindingV1;
  readonly publicationRole: "visible" | "probe";
  readonly viewId: number;
}

/** Dev-only shell around the same Host consumer used by standalone Studio. */
export function EmbeddedAuthoringSurfaceInternalV1(
  props: EmbeddedAuthoringSurfacePropsInternalV1,
): ReactElement {
  const owner = resolveAuthoringHostOwnerInternalV1(props.host);
  const snapshot = useSyncExternalStore(
    props.host.subscribe,
    props.host.getSnapshot,
    props.host.getSnapshot,
  );
  const [open, setOpen] = useState(true);
  const [confirmClose, setConfirmClose] = useState(false);
  const closeDialogRef = useRef<HTMLDialogElement>(null);
  const closeState = owner.getCloseState();
  const closeLabel = snapshot.dirty ? "关闭内嵌创作（有未保存修改）" : "关闭内嵌创作";

  useEffect(() => {
    if (!confirmClose) return undefined;
    const dialog = closeDialogRef.current;
    if (dialog === null) return undefined;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => {
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
      else dialog.removeAttribute("open");
    };
  }, [confirmClose]);

  const requestClose = (): void => {
    if (closeState.dirty) {
      setConfirmClose(true);
      return;
    }
    setOpen(false);
  };

  const saveAndClose = async (): Promise<void> => {
    const closed = await owner.saveAndClose();
    if (!closed) return;
    setConfirmClose(false);
    setOpen(false);
  };

  return (
    <div
      data-embedded-authoring-shell="true"
      data-application-focus-owner="authoring"
      data-native-menu="true"
      data-native-text="true"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      {open ? null : (
        <button
          type="button"
          className={styles["embedded-launcher"]}
          data-embedded-authoring-open="true"
          onClick={() => setOpen(true)}
        >
          打开内嵌创作
        </button>
      )}
      <section
        className={styles["embedded-panel"]}
        aria-label="内嵌创作"
        data-embedded-authoring-panel="true"
        hidden={!open}
      >
        <header className={styles["embedded-toolbar"]}>
          <strong>Authoring Host</strong>
          <span>与独立 Studio 共享实现</span>
          <button
            type="button"
            data-embedded-authoring-close="true"
            aria-label={closeLabel}
            onClick={requestClose}
          >
            关闭
          </button>
        </header>
        <AuthoringHostSurfaceInternalV1
          host={props.host}
          binding={props.binding}
          mode="embedded"
          publicationRole={props.publicationRole}
          viewId={props.viewId}
        />
      </section>
      {!confirmClose ? null : (
        <dialog
          ref={closeDialogRef}
          className={styles["embedded-close-confirm"]}
          role="alertdialog"
          aria-modal="true"
          aria-label="关闭未保存的创作"
          data-blocking-focus-scope="true"
          data-embedded-authoring-close-confirm="true"
          onCancel={(event) => {
            event.preventDefault();
            if (!closeState.busy) setConfirmClose(false);
          }}
        >
          <p>仍有未保存的创作修改。保存、放弃，还是继续编辑？</p>
          <button
            type="button"
            data-embedded-authoring-close-save="true"
            disabled={closeState.busy || !closeState.canSave}
            onClick={() => void saveAndClose()}
          >
            保存并关闭
          </button>
          <button
            type="button"
            data-embedded-authoring-close-discard="true"
            disabled={closeState.busy}
            onClick={() => {
              owner.discardAndClose();
              setConfirmClose(false);
              setOpen(false);
            }}
          >
            放弃并关闭
          </button>
          <button
            type="button"
            data-embedded-authoring-close-cancel="true"
            disabled={closeState.busy}
            autoFocus
            onClick={() => setConfirmClose(false)}
          >
            取消
          </button>
        </dialog>
      )}
    </div>
  );
}
