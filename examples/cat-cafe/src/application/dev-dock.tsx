// SPDX-License-Identifier: MIT
import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";

import type { DebugCommandOperationResultV1, DevDockContributionSetV1 } from "@sillymaker/ui/debug";
import { DebugCommandPanelV1, DebugValueInspectorV1 } from "@sillymaker/ui/debug";
import type { DebugToolsOperationResultV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";

import type { CatcafeApplicationInstanceV1 } from "./core-definition.ts";
import type { CatcafeAssetRegistryV1 } from "./ui-kit.ts";
import { CatcafeNarrativePreviewV1 } from "./narrative-preview.tsx";
import type { CatcafeDebugCommandV1 } from "../simulation.ts";
import { catcafeDebugStatsV1 } from "../simulation.ts";
import { catcafeEncountersV1 } from "../content.ts";

/**
 * The cat cafe's DevDock: a read-only state inspector + three tuning forms (set
 * values / fast-forward / force a regular encounter). Tuning goes through the
 * session debugControl — the same atomic commit path as gameplay, log entries
 * marked source:"debug", capability gating owned by the DevDock. This is the reference implementation of the "human tuning" channel.
 */

async function executeV1(
  instance: CatcafeApplicationInstanceV1,
  command: CatcafeDebugCommandV1,
): Promise<DebugToolsOperationResultV1<DebugCommandOperationResultV1>> {
  const debugControl = instance.admin.debugControl;
  if (debugControl === undefined) {
    return Object.freeze({ kind: "rejected" as const, message: "debug control unavailable" });
  }
  // The panel renders only inside the capability-gated DevDock.
  const result = await debugControl.execute(command, () => true);
  switch (result.kind) {
    case "executed":
      return result.attempt.result.kind === "committed"
        ? Object.freeze({ kind: "handled" as const, message: "committed" })
        : Object.freeze({
          kind: "rejected" as const,
          message: JSON.stringify(result.attempt.result.kind),
        });
    case "validation_failed":
      return Object.freeze({
        kind: "rejected" as const,
        message: result.errors.map((error) => error.code).join(", "),
      });
    case "capability_disabled":
      return Object.freeze({ kind: "capability_disabled" as const });
    case "not_executed":
      return Object.freeze({ kind: "rejected" as const, message: result.code });
    default: {
      const exhaustive: never = result;
      throw new TypeError(`unknown debug result ${String(exhaustive)}`);
    }
  }
}

function SetStatFormV1(props: { readonly instance: CatcafeApplicationInstanceV1 }): ReactElement {
  const [stat, setStat] = useState<string>(catcafeDebugStatsV1[0]);
  const [value, setValue] = useState(50);
  return (
    <DebugCommandPanelV1
      fields={
        <>
          <label>
            数值{" "}
            <select
              data-cc-debug-stat="true"
              value={stat}
              onChange={(event) => setStat(event.target.value)}
            >
              {catcafeDebugStatsV1.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate}
                </option>
              ))}
            </select>
          </label>
          <label>
            值{" "}
            <input
              type="number"
              data-cc-debug-value="true"
              value={value}
              onChange={(event) => setValue(Number(event.target.value))}
            />
          </label>
        </>
      }
      command={useMemo(() => ({ kind: "cc.debug.set_stat", stat, value }) as const, [stat, value])}
      executeDebugCommand={useCallback(
        (command: CatcafeDebugCommandV1) => executeV1(props.instance, command),
        [props.instance],
      )}
      canExecute={true}
      disabledReason=""
    />
  );
}

function AdvanceDaysFormV1(props: {
  readonly instance: CatcafeApplicationInstanceV1;
}): ReactElement {
  const [days, setDays] = useState(1);
  return (
    <DebugCommandPanelV1
      fields={
        <label>
          快进天数{" "}
          <input
            type="number"
            min={1}
            max={48}
            data-cc-debug-days="true"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          />
        </label>
      }
      command={useMemo(() => ({ kind: "cc.debug.advance_days", days }) as const, [days])}
      executeDebugCommand={useCallback(
        (command: CatcafeDebugCommandV1) => executeV1(props.instance, command),
        [props.instance],
      )}
      canExecute={true}
      disabledReason=""
    />
  );
}

function ForceEncounterFormV1(props: {
  readonly instance: CatcafeApplicationInstanceV1;
}): ReactElement {
  const visible = catcafeEncountersV1.rows().filter((row) => row.textId !== null);
  const [encounterId, setEncounterId] = useState<string>(visible[0]?.id ?? "");
  return (
    <DebugCommandPanelV1
      fields={
        <label>
          常客事件{" "}
          <select
            data-cc-debug-encounter="true"
            value={encounterId}
            onChange={(event) => setEncounterId(event.target.value)}
          >
            {visible.map((row) => (
              <option key={row.id} value={row.id}>
                {row.id}
              </option>
            ))}
          </select>
        </label>
      }
      command={useMemo(
        () => ({ kind: "cc.debug.force_encounter", encounterId }) as const,
        [encounterId],
      )}
      executeDebugCommand={useCallback(
        (command: CatcafeDebugCommandV1) => executeV1(props.instance, command),
        [props.instance],
      )}
      canExecute={true}
      disabledReason=""
    />
  );
}

export function createCatcafeDevDockContributionsV1(input: {
  readonly instance: CatcafeApplicationInstanceV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
}): DevDockContributionSetV1 {
  const semantic = input.instance.semantic;
  return Object.freeze({
    panels: Object.freeze([
      Object.freeze({
        id: "catcafe.state",
        side: "right" as const,
        title: "状态检视",
        authority: "read_only" as const,
        render: () => (
          <DebugValueInspectorV1
            inspectorId="catcafe.game-view"
            source={Object.freeze({
              read: () => semantic.observe().game,
              subscribe: (listener: () => void) => semantic.subscribe(listener),
            })}
          />
        ),
      }),
      Object.freeze({
        id: "catcafe.narrative-preview",
        side: "right" as const,
        title: "剧情预览",
        authority: "read_only" as const,
        render: () => (
          <CatcafeNarrativePreviewV1
            playerProfile={input.playerProfile}
            registry={input.registry}
          />
        ),
      }),
      Object.freeze({
        id: "catcafe.tuning",
        side: "right" as const,
        title: "调参",
        authority: "cheat" as const,
        render: () => (
          <div data-cc-debug-tuning="true">
            <SetStatFormV1 instance={input.instance} />
            <AdvanceDaysFormV1 instance={input.instance} />
            <ForceEncounterFormV1 instance={input.instance} />
          </div>
        ),
      }),
    ]),
  });
}
