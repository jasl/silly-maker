// SPDX-License-Identifier: MIT
import { useState } from "react";
import type { ReactElement } from "react";

import type {
  ElectronicPetActionResultV1,
  ElectronicPetInvocationV1,
} from "../application/semantic.ts";
import type { ElectronicPetGameViewV1 } from "../game/kernel.ts";
import { PetWandPlayV1 } from "./pet-wand-play.tsx";
import "./pet-care-hud.css";

export interface ElectronicPetCareHudPropsV1 {
  readonly view: ElectronicPetGameViewV1;
  dispatch(invocation: ElectronicPetInvocationV1): Promise<ElectronicPetActionResultV1>;
  reset(): Promise<void>;
}

const progressionLabelsV1 = {
  arrival: "刚到新家",
  approach: "开始靠近",
  routine: "成为日常",
  trust: "建立信任",
} as const;

const trustLabelsV1 = {
  newcomer: "陌生",
  familiar: "熟悉",
  trusting: "信赖",
  bonded: "家人",
} as const;

const needLabelsV1 = {
  food: "饮食",
  rest: "休息",
  safety: "安全感",
  stimulation: "玩耍",
} as const;

const needBandLabelsV1 = {
  comfortable: "舒适",
  watch: "留意",
  "needs-care": "需要照料",
} as const;

function resultMessageV1(
  result: ElectronicPetActionResultV1,
  invocation: ElectronicPetInvocationV1,
): string {
  if (result.kind === "committed") {
    switch (invocation.kind) {
      case "pet.home_prepare":
        return ({
          water: "清水已经准备好了",
          litter: "猫砂盆已经摆好了",
          hideaway: "藏身的小窝已经安置好了",
        } as const)[invocation.resource];
      case "pet.food_place":
        return "食物已经放好了";
      case "pet.quiet_presence":
        return "它开始愿意靠近";
      case "pet.hand_offer":
        return "它闻过你的手，放松了一些";
      case "pet.play_complete":
        return invocation.roundResult === "caught"
          ? "它追到了逗猫棒，玩得很尽兴"
          : invocation.roundResult === "missed"
          ? "它差一点抓到，仍然玩得很投入"
          : "你们暂时放下了逗猫棒";
      case "pet.return_summary_dismiss":
        return "变化已经记下";
      case "pet.time_settle":
        return "时间已经同步";
      case "pet.contact_complete":
      case "pet.groom_complete":
        return result.game.lastOutcome === null ? "互动已经完成" : ({
          accept: invocation.kind === "pet.groom_complete" ? "它舒服地贴近了梳子" : "它很喜欢",
          tolerate: "它接受了，但仍在观察",
          warn: "它在提醒你放慢一点",
          refuse: "它现在想保留一些空间",
        } as const)[result.game.lastOutcome];
      case "pet.belly_complete":
        return invocation.terminal === "stopped_before_warning"
          ? result.game.lastOutcome === "accept"
            ? "你及时停下，它安心地继续保持放松"
            : "它收起后腿，提醒你先保持距离"
          : invocation.terminal === "stopped_in_warning"
          ? "你在警告后停手，它正在重新放松"
          : invocation.terminal === "continued_after_warning"
          ? "你没有停手，它翻身退开了"
          : result.game.lastOutcome === null
          ? "互动已经完成"
          : ({
            accept: "它接受了这次短暂的腹部触碰",
            tolerate: "它允许了短暂接触，但仍在观察",
            warn: "这次触碰不够轻缓，它在提醒你停手",
            refuse: "它结束了这次接触并翻身退开",
          } as const)[result.game.lastOutcome];
    }
  }
  if (result.kind === "rejected") return "情况已经变化，请观察后再试";
  return "这次操作没有完成，请稍后重试";
}

export function ElectronicPetCareHudV1(
  props: ElectronicPetCareHudPropsV1,
): ReactElement {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("先准备一个安静、安全的新家");
  const [confirmReset, setConfirmReset] = useState(false);
  const [wandOpen, setWandOpen] = useState(false);

  const runV1 = async (invocation: ElectronicPetInvocationV1): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      setMessage(resultMessageV1(await props.dispatch(invocation), invocation));
    } catch {
      setMessage("这次操作没有完成，请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  const setup = props.view.home.setup;
  const occurrence = props.view.activityOccurrence;
  const invitation = props.view.invitation;
  const actionsDisabled = busy || wandOpen;

  return (
    <aside
      className={wandOpen ? "pet-care pet-care--wand-open" : "pet-care"}
      aria-label="照料与关系"
    >
      <header className="pet-care__summary">
        <div>
          <span>{progressionLabelsV1[props.view.progression]}</span>
          <strong>信赖 · {trustLabelsV1[props.view.trustStage]}</strong>
        </div>
        <p aria-live="polite">{message}</p>
      </header>

      <div className="pet-care__needs" aria-label="小猫当前状态">
        {Object.entries(props.view.needBands).map(([need, band]) => (
          <span key={need} data-need-band={band}>
            {needLabelsV1[need as keyof typeof needLabelsV1]} · {needBandLabelsV1[band]}
          </span>
        ))}
      </div>

      <div className="pet-care__actions" aria-label="可以做的事">
        {!setup.waterReady && (
          <button
            disabled={actionsDisabled}
            onClick={() => runV1({ kind: "pet.home_prepare", resource: "water" })}
          >
            准备清水
          </button>
        )}
        {!setup.litterReady && (
          <button
            disabled={actionsDisabled}
            onClick={() => runV1({ kind: "pet.home_prepare", resource: "litter" })}
          >
            摆好猫砂盆
          </button>
        )}
        {!setup.hideawayReady && (
          <button
            disabled={actionsDisabled}
            onClick={() => runV1({ kind: "pet.home_prepare", resource: "hideaway" })}
          >
            安置藏身窝
          </button>
        )}
        <button
          disabled={actionsDisabled}
          onClick={() => runV1({ kind: "pet.food_place", foodId: "food.chicken" })}
        >
          {props.view.home.food === null ? "放下食物" : "添一点食物"}
        </button>
        {props.view.quietPresenceAvailable && (
          <button
            disabled={actionsDisabled}
            onClick={() =>
              runV1({ kind: "pet.quiet_presence", expectedActivityOccurrence: occurrence })}
          >
            安静地陪它一会儿
          </button>
        )}
        {invitation?.kind === "sniff_hand" && (
          <button
            disabled={actionsDisabled}
            onClick={() =>
              runV1({
                kind: "pet.hand_offer",
                expectedActivityOccurrence: occurrence,
                expectedInvitationOccurrence: invitation.occurrence,
              })}
          >
            把手停在原地
          </button>
        )}
        {props.view.trustStage !== "newcomer" && !wandOpen && (
          <button
            disabled={busy}
            onClick={() => setWandOpen(true)}
          >
            一起玩逗猫棒
          </button>
        )}
      </div>

      {wandOpen && (
        <PetWandPlayV1
          disabled={busy}
          onDismiss={() => setWandOpen(false)}
          onComplete={(roundResult) => {
            setWandOpen(false);
            void runV1({
              kind: "pet.play_complete",
              expectedActivityOccurrence: occurrence,
              toyId: "toy.wand",
              roundResult,
            });
          }}
        />
      )}

      {invitation !== null && (
        <p className="pet-care__invitation" data-invitation-occurrence={invitation.occurrence}>
          {invitation.kind === "sniff_hand"
            ? "它正在靠近，先把手停在原地让它闻。"
            : invitation.kind === "shared_play"
            ? "它盯着玩具，似乎想和你一起玩。"
            : invitation.kind === "head_contact"
            ? "它主动把头靠近了你。"
            : "它放松前爪并持续看着你，愿意让你短暂碰一碰腹部。"}
        </p>
      )}

      {props.view.home.returnSummary !== null && (
        <section className="pet-care__return" aria-label="回来后的变化">
          <strong>欢迎回来</strong>
          <p>
            离开期间过去了 {props.view.home.returnSummary.elapsedMinutes}{" "}
            分钟，小猫安稳地照顾着自己。
          </p>
          <button
            disabled={busy}
            onClick={() =>
              runV1({
                kind: "pet.return_summary_dismiss",
                expectedVisitOrdinal: props.view.home.returnSummary!.visitOrdinal,
              })}
          >
            知道了
          </button>
        </section>
      )}

      <footer className="pet-care__footer">
        {!confirmReset ? <button onClick={() => setConfirmReset(true)}>重新领养</button> : (
          <span>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await props.reset();
                  setMessage("新的相遇开始了");
                  setConfirmReset(false);
                } catch (error) {
                  console.error("electronic_pet.reset_failed", error);
                  setMessage("无法清除当前进度，请稍后重试");
                } finally {
                  setBusy(false);
                }
              }}
            >
              确认清除进度
            </button>
            <button onClick={() => setConfirmReset(false)}>取消</button>
          </span>
        )}
      </footer>
    </aside>
  );
}
