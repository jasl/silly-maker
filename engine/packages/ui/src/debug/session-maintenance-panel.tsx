// SPDX-License-Identifier: MIT
import { useState } from "react";
import type { ReactElement } from "react";

import type { SaveOverlayPortV1 } from "../persistence/save-overlay.tsx";
import { Button } from "../primitives/button.tsx";

/**
 * Built-in DevDock panel body for session and persistence maintenance.
 *
 * The composer registers this body as a `cheat` contribution. It deliberately
 * owns no launcher, portal, capability subscription, input context, or focus
 * scope; DevDock remains the sole debug UI host and supplies those contracts.
 */
export interface SessionMaintenanceLabelsV1 {
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

export const defaultSessionMaintenanceLabelsV1: SessionMaintenanceLabelsV1 = Object.freeze({
  exportStateLabel: "Export state",
  importStateLabel: "Import state",
  wipeLabel: "Clear all saves",
  wipeConfirmLabel: "Confirm clear?",
  wipeCancelLabel: "Cancel",
  reinitializeLabel: "Reinitialize",
  busySuffix: "…",
  exportDoneText: "State exported as JSON.",
  importDoneText: "State imported.",
  wipeArmedText: "Destructive: click the confirm button to clear all saves, or cancel.",
  wipeDoneText: "All saves cleared.",
});

export interface SessionMaintenancePanelPropsV1 {
  /** Enables Export/Import state and the default slot-clearing cleanup. */
  readonly savePort?: SaveOverlayPortV1;
  /** Return to the title front door; omit to hide the action. */
  readonly onReinitialize?: () => void | Promise<unknown>;
  readonly reinitializeDisabled?: boolean;
  readonly labels?: Partial<SessionMaintenanceLabelsV1>;
}

export function SessionMaintenancePanelV1(props: SessionMaintenancePanelPropsV1): ReactElement {
  const labels = { ...defaultSessionMaintenanceLabelsV1, ...props.labels };
  const [busy, setBusy] = useState<"export" | "import" | "wipe" | "reinitialize" | null>(null);
  const [wipeArmed, setWipeArmed] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const disarm = (): void => {
    if (!wipeArmed) return;
    setWipeArmed(false);
    setNote(null);
  };
  const failureNote = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

  const savePort = props.savePort;
  const defaultWipe = async (): Promise<string | void> => {
    if (savePort === undefined) return;
    const slots = await savePort.listSlots();
    const failures = new Set<string>();
    for (const slot of slots) {
      if (slot.health === "empty") continue;
      try {
        const result = await savePort.clear(
          slot.slotId as Parameters<SaveOverlayPortV1["clear"]>[0],
        );
        if (result.kind === "cleared") continue;
        if (result.kind === "rejected" && result.code === "empty_slot") continue;
        failures.add(
          result.kind === "rejected" || result.kind === "faulted" ? result.code : result.kind,
        );
      } catch (error) {
        failures.add(failureNote(error));
      }
    }
    if (failures.size > 0) {
      throw new Error(`Save cleanup incomplete: ${[...failures].join(", ")}`);
    }
    return labels.wipeDoneText;
  };
  const wipe = savePort === undefined ? undefined : defaultWipe;

  return (
    <section
      data-session-maintenance-panel="true"
      style={{ display: "grid", gap: 8, minInlineSize: 240 }}
    >
      <div
        data-session-maintenance-actions="true"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))",
          gap: 6,
        }}
      >
        {props.onReinitialize === undefined ? null : (
          <Button
            data-session-maintenance-action="reinitialize"
            disabled={busy !== null || props.reinitializeDisabled === true}
            onClick={() => {
              disarm();
              setBusy("reinitialize");
              setNote(null);
              void Promise.resolve()
                .then(() => props.onReinitialize?.())
                .catch((error: unknown) => setNote(failureNote(error)))
                .finally(() => setBusy(null));
            }}
          >
            {busy === "reinitialize"
              ? `${labels.reinitializeLabel}${labels.busySuffix}`
              : labels.reinitializeLabel}
          </Button>
        )}
        {savePort === undefined ? null : (
          <Button
            data-session-maintenance-action="export_state"
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
            data-session-maintenance-action="import_state"
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
            data-session-maintenance-action="wipe_local"
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
          <Button data-session-maintenance-action="wipe_cancel" onClick={disarm}>
            {labels.wipeCancelLabel}
          </Button>
        ) : null}
      </div>
      {note === null ? null : (
        <div
          data-session-maintenance-note="true"
          aria-live="polite"
          style={{ opacity: 0.9, overflowWrap: "anywhere" }}
        >
          {note}
        </div>
      )}
    </section>
  );
}
