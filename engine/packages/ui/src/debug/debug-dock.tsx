// SPDX-License-Identifier: MIT
import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "../primitives/button.tsx";
import type { SaveOverlayPortV1 } from "../persistence/save-overlay.tsx";

/**
 * The session debug dock: a collapsed chip pinned to the top-right corner of
 * the page that expands into a right-aligned panel of session-maintenance
 * actions. This is the default debug surface a running game exposes behind
 * the `debug_tools` capability (grown out of the external MV rig verification
 * rig's hand-play dock); the panel-based DevDock remains only as a
 * deprecated, explicitly-opted-in host for legacy tooling contributions.
 *
 * Built-in actions (each rendered only when its port/callback is provided):
 *   - Export state: download the current session as an engine save JSON.
 *   - Import state: atomically replace the session from an exported JSON.
 *   - Wipe local data: destructive, armed by a first click and executed by a
 *     second (webviews no-op `window.confirm`, so confirmation is inline).
 *     Defaults to clearing every save slot through the port — storage-
 *     agnostic (IndexedDB on the web, record files on desktop); Stories with
 *     a platform-level reset pass `onWipeLocal` instead.
 *   - Reinitialize: return to the title front door.
 *
 * Everything else is Story-owned: `info` renders as right-aligned status
 * lines above the buttons, `actions` prepends Story buttons into the same
 * grid. The dock portals to `document.body` so narrative/overlay isolation
 * can never `inert` it away from the tester.
 */

export interface DebugDockLabelsV1 {
  readonly toggleLabel: string;
  readonly exportStateLabel: string;
  readonly importStateLabel: string;
  readonly wipeLabel: string;
  readonly wipeConfirmLabel: string;
  readonly wipeCancelLabel: string;
  readonly reinitializeLabel: string;
  readonly busySuffix: string;
  readonly exportDoneText: string;
  readonly importDoneText: string;
  readonly wipeArmedText: string;
  readonly wipeDoneText: string;
}

export const defaultDebugDockLabelsV1: DebugDockLabelsV1 = Object.freeze({
  toggleLabel: "Debug",
  exportStateLabel: "Export state",
  importStateLabel: "Import state",
  wipeLabel: "Wipe local data",
  wipeConfirmLabel: "Confirm wipe?",
  wipeCancelLabel: "Cancel",
  reinitializeLabel: "Reinitialize",
  busySuffix: "…",
  exportDoneText: "State exported as JSON.",
  importDoneText: "State imported.",
  wipeArmedText: "Destructive: click the confirm button to wipe, any other button to cancel.",
  wipeDoneText: "Local data wiped.",
});

export interface DebugDockPropsV1 {
  /** Enables Export/Import state and the default slot-clearing wipe. */
  readonly savePort?: SaveOverlayPortV1;
  /**
   * Story override for the destructive wipe (e.g. delete the platform
   * database and reload). Resolving a string replaces the done note.
   */
  readonly onWipeLocal?: () => Promise<string | void>;
  /** Return to the title front door; omit to hide the button. */
  readonly onReinitialize?: () => void;
  /** Disabled state for Reinitialize (e.g. already on the title screen). */
  readonly reinitializeDisabled?: boolean;
  /** Story status lines, rendered right-aligned above the actions. */
  readonly info?: ReactNode;
  /** Story action buttons, prepended into the same grid as the defaults. */
  readonly actions?: ReactNode;
  readonly labels?: Partial<DebugDockLabelsV1>;
  readonly defaultOpen?: boolean;
}

const dockFontV1 = "var(--silly-font-family)";
const chipStyleV1 = Object.freeze({
  cursor: "pointer",
  userSelect: "none",
  padding: "2px 8px",
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.35)",
  background: "rgba(0,0,0,0.72)",
  color: "#f2efe8",
  fontSize: 12,
} as const);

export function DebugDockV1(props: DebugDockPropsV1): ReactElement | null {
  const labels = { ...defaultDebugDockLabelsV1, ...props.labels };
  const [busy, setBusy] = useState<"export" | "import" | "wipe" | null>(null);
  const [wipeArmed, setWipeArmed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (typeof document === "undefined") return null;

  const disarm = (): void => {
    if (wipeArmed) {
      setWipeArmed(false);
      setNote(null);
    }
  };
  const failureNote = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

  const savePort = props.savePort;
  const defaultWipe = async (): Promise<string | void> => {
    if (savePort === undefined) return;
    const slots = await savePort.listSlots();
    for (const slot of slots) {
      // Best-effort per slot: empty slots may reject their clear; the wipe
      // is a debug tool and must not stop halfway on one of them.
      try {
        await savePort.clear(slot.slotId as Parameters<SaveOverlayPortV1["clear"]>[0]);
      } catch {
        // Ignore and continue with the remaining slots.
      }
    }
    return labels.wipeDoneText;
  };
  const wipe = props.onWipeLocal ?? (savePort === undefined ? undefined : defaultWipe);

  return createPortal(
    <details
      data-debug-dock="true"
      {...(props.defaultOpen === true ? { open: true } : {})}
      style={{
        position: "fixed",
        insetBlockStart: 4,
        insetInlineEnd: 4,
        // Above every in-viewport surface (the dock lives on document.body,
        // outside the stacking contexts the stage tokens govern).
        zIndex: 10_050,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 4,
        maxInlineSize: "min(400px, 92vw)",
        pointerEvents: "auto",
        color: "#ddd",
        fontSize: 12,
        fontFamily: dockFontV1,
      }}
    >
      <style>
        {
          "[data-debug-dock] > summary { list-style: none; } [data-debug-dock] > summary::-webkit-details-marker { display: none; }"
        }
      </style>
      <summary data-debug-dock-toggle="true" style={chipStyleV1}>
        {labels.toggleLabel}
      </summary>
      <div
        style={{
          display: "grid",
          gap: 8,
          justifyItems: "stretch",
          padding: 10,
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.25)",
          background: "rgba(12,10,16,0.92)",
          minInlineSize: 260,
        }}
      >
        {props.info === undefined ? null : (
          <div
            data-debug-dock-info="true"
            style={{
              display: "grid",
              gap: 2,
              justifyItems: "end",
              textAlign: "end",
              opacity: 0.9,
              overflowWrap: "anywhere",
            }}
          >
            {props.info}
          </div>
        )}
        <div
          data-debug-dock-actions="true"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))",
            gap: 6,
          }}
        >
          {props.actions}
          {props.onReinitialize === undefined ? null : (
            <Button
              data-debug-dock-action="reinitialize"
              disabled={props.reinitializeDisabled === true}
              onClick={() => {
                disarm();
                props.onReinitialize?.();
              }}
            >
              {labels.reinitializeLabel}
            </Button>
          )}
          {savePort === undefined ? null : (
            <Button
              data-debug-dock-action="export_state"
              disabled={busy !== null}
              onClick={() => {
                disarm();
                setBusy("export");
                setNote(null);
                void savePort
                  .exportCurrentSave()
                  .then(() => setNote(labels.exportDoneText))
                  .catch((error: unknown) => setNote(failureNote(error)))
                  .finally(() => setBusy(null));
              }}
            >
              {busy === "export"
                ? `${labels.exportStateLabel}${labels.busySuffix}`
                : labels.exportStateLabel}
            </Button>
          )}
          {savePort === undefined ? null : (
            <Button
              data-debug-dock-action="import_state"
              disabled={busy !== null}
              onClick={() => {
                disarm();
                setBusy("import");
                setNote(null);
                void savePort
                  .importSave()
                  .then((result) => {
                    if (result.kind === "imported") setNote(labels.importDoneText);
                    else if (result.kind !== "cancelled") {
                      const code = "code" in result ? ` (${result.code})` : "";
                      setNote(`${result.kind}${code}`);
                    }
                  })
                  .catch((error: unknown) => setNote(failureNote(error)))
                  .finally(() => setBusy(null));
              }}
            >
              {busy === "import"
                ? `${labels.importStateLabel}${labels.busySuffix}`
                : labels.importStateLabel}
            </Button>
          )}
          {wipe === undefined ? null : (
            <Button
              data-debug-dock-action="wipe_local"
              disabled={busy !== null}
              onClick={() => {
                if (!wipeArmed) {
                  setWipeArmed(true);
                  setNote(labels.wipeArmedText);
                  return;
                }
                setWipeArmed(false);
                setBusy("wipe");
                setNote(null);
                void wipe()
                  .then((doneNote) =>
                    setNote(typeof doneNote === "string" ? doneNote : labels.wipeDoneText),
                  )
                  .catch((error: unknown) => setNote(failureNote(error)))
                  .finally(() => setBusy(null));
              }}
            >
              {busy === "wipe"
                ? `${labels.wipeLabel}${labels.busySuffix}`
                : wipeArmed
                  ? labels.wipeConfirmLabel
                  : labels.wipeLabel}
            </Button>
          )}
          {wipeArmed ? (
            <Button data-debug-dock-action="wipe_cancel" onClick={disarm}>
              {labels.wipeCancelLabel}
            </Button>
          ) : null}
        </div>
        {note === null ? null : (
          <div
            data-debug-dock-note="true"
            aria-live="polite"
            style={{ textAlign: "end", opacity: 0.9, overflowWrap: "anywhere" }}
          >
            {note}
          </div>
        )}
      </div>
    </details>,
    document.body,
  );
}
