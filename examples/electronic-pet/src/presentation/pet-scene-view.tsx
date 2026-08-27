// SPDX-License-Identifier: MIT
import type { CodeSurfaceViewPropsV1 } from "@sillymaker/ui/code-surface";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

import type {
  ElectronicPetSceneContextV1,
  ElectronicPetScenePropsV1,
} from "./pet-scene-catalog.ts";
import type { ElectronicPetInteractionOutcomeV1 } from "../game/state.ts";
import { createPetThreeRuntimeV1 } from "./pet-three-runtime.ts";
import type {
  PetInteractionToolV1,
  PetPointerFeedbackV1,
  PetThreeRuntimeV1,
} from "./pet-three-runtime.ts";
import { electronicPetM1SceneDocumentV1 } from "../authoring/default-document.ts";
import { compilePetSceneDocumentV1 } from "../authoring/document.ts";
import "./pet-scene.css";
import { resolveElectronicPetModelAssetUrlV1 } from "../content/runtime-bindings.ts";

const compiledSceneV1 = compilePetSceneDocumentV1(electronicPetM1SceneDocumentV1);
if (compiledSceneV1.kind === "rejected") {
  throw new TypeError(
    `electronic pet scene compile failed: ${compiledSceneV1.diagnostic.code}`,
  );
}
const scenePlanV1 = compiledSceneV1.plan;

function modelUrlV1(modelId: string): string | null {
  return resolveElectronicPetModelAssetUrlV1(modelId, "application", document.baseURI);
}

type PetBellyTerminalV1 =
  | "completed_before_warning"
  | "stopped_before_warning"
  | "stopped_in_warning"
  | "continued_after_warning";

export default function ElectronicPetSceneViewV1(
  props: CodeSurfaceViewPropsV1<
    ElectronicPetSceneContextV1,
    ElectronicPetScenePropsV1,
    never
  >,
): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerFeedbackRef = useRef<HTMLOutputElement>(null);
  const pointerFeedbackLabelRef = useRef<HTMLSpanElement>(null);
  const contextRef = useRef(props.context);
  const runtimeRef = useRef<PetThreeRuntimeV1 | null>(null);
  const [requestedTool, setRequestedTool] = useState<PetInteractionToolV1>("hand");
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [reaction, setReaction] = useState<
    {
      readonly occurrence: number;
      readonly outcome: ElectronicPetInteractionOutcomeV1;
      readonly interactionKind: "contact" | "grooming" | "belly";
      readonly targetInteractionId: string;
      readonly bellyTerminal: PetBellyTerminalV1 | null;
    } | null
  >(null);
  const groomingAvailable = props.context.view.trustStage === "trusting" ||
    props.context.view.trustStage === "bonded";
  const interactionTool = groomingAvailable && props.context.view.poseId !== "supine_relaxed"
    ? requestedTool
    : "hand";
  const toolRef = useRef<PetInteractionToolV1>(interactionTool);
  const interactionCopy = interactionCopyV1(props.context.view, interactionTool);
  const visibleOutcome = props.context.view.lastOutcome === null
    ? null
    : reaction?.outcome ?? props.context.view.lastOutcome;
  const visibleInteractionKind = reaction?.interactionKind ??
    props.context.view.lastInteractionKind ?? "contact";
  const visibleInteractionTargetId = reaction?.targetInteractionId ??
    props.context.view.lastInteractionTargetId;
  const visibleBellyTerminal = reaction?.bellyTerminal ?? props.context.view.lastBellyTerminal;

  useLayoutEffect(() => {
    contextRef.current = props.context;
    runtimeRef.current?.setCompanionPresentation(props.context.view);
  }, [props.context]);

  useLayoutEffect(() => {
    toolRef.current = interactionTool;
    runtimeRef.current?.setInteractionTool(interactionTool);
    const label = pointerFeedbackLabelRef.current;
    if (label !== null) {
      label.textContent = pointerFeedbackLabelV1(
        { phase: "idle" },
        interactionTool,
        contextRef.current.view,
      );
    }
  }, [interactionTool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return undefined;
    const pointerFeedbackIndicator = pointerFeedbackRef.current;
    const pointerFeedbackLabel = pointerFeedbackLabelRef.current;
    let pendingPointerFeedback: PetPointerFeedbackV1 | null = null;
    let pointerFeedbackFrame = 0;
    let appliedPointerFeedbackKey = "";
    const applyPointerFeedbackV1 = (): void => {
      pointerFeedbackFrame = 0;
      const feedback = pendingPointerFeedback;
      pendingPointerFeedback = null;
      const indicator = pointerFeedbackRef.current;
      const label = pointerFeedbackLabelRef.current;
      if (feedback === null || indicator === null || label === null) return;
      const feedbackTarget = feedback.phase === "idle" ? null : feedback.targetInteractionId;
      const feedbackKey = `${feedback.phase}:${feedbackTarget ?? ""}:${toolRef.current}:${
        contextRef.current.view.invitation?.kind ?? "none"
      }`;
      if (feedbackKey !== appliedPointerFeedbackKey) {
        appliedPointerFeedbackKey = feedbackKey;
        indicator.dataset.phase = feedback.phase;
        label.textContent = pointerFeedbackLabelV1(
          feedback,
          toolRef.current,
          contextRef.current.view,
        );
      }
      if (feedback.phase === "idle") return;
      indicator.style.setProperty("--pet-pointer-x", `${feedback.x}px`);
      indicator.style.setProperty("--pet-pointer-y", `${feedback.y}px`);
      indicator.style.setProperty(
        "--pet-pointer-progress",
        `${Math.round(feedback.completion * 100)}%`,
      );
    };
    const runtime = createPetThreeRuntimeV1({
      canvas,
      plan: scenePlanV1,
      modelUrl: modelUrlV1,
      quality: props.props.quality,
      onGesture: async (result) => {
        const outcome = await contextRef.current.dispatchGesture(result);
        if (outcome !== null) {
          if (
            result.interactionKind !== "belly" ||
            result.terminal !== "stopped_in_warning" ||
            outcome !== "warn"
          ) runtime.presentReaction(outcome);
          setReaction((current) => ({
            occurrence: (current?.occurrence ?? 0) + 1,
            outcome,
            interactionKind: result.interactionKind,
            targetInteractionId: result.targetInteractionId,
            bellyTerminal: result.interactionKind === "belly" ? result.terminal : null,
          }));
        }
      },
      onPointerFeedback: (feedback) => {
        pendingPointerFeedback = feedback;
        if (pointerFeedbackFrame === 0) {
          pointerFeedbackFrame = requestAnimationFrame(applyPointerFeedbackV1);
        }
      },
      onReady: () => setStatus("ready"),
      onFailure: (error) => {
        setStatus("failed");
        contextRef.current.reportFailure(error);
      },
    });
    runtimeRef.current = runtime;
    runtime.setInteractionTool(toolRef.current);
    runtime.setCompanionPresentation(contextRef.current.view);
    void runtime.ready.then(() => {
      runtime.setCompanionPresentation(contextRef.current.view);
    }).catch(() => undefined);
    return () => {
      if (runtimeRef.current === runtime) runtimeRef.current = null;
      runtime.dispose();
      if (pointerFeedbackFrame !== 0) cancelAnimationFrame(pointerFeedbackFrame);
      pendingPointerFeedback = null;
      if (pointerFeedbackIndicator !== null && pointerFeedbackLabel !== null) {
        pointerFeedbackIndicator.dataset.phase = "idle";
        pointerFeedbackIndicator.style.removeProperty("--pet-pointer-x");
        pointerFeedbackIndicator.style.removeProperty("--pet-pointer-y");
        pointerFeedbackIndicator.style.removeProperty("--pet-pointer-progress");
        pointerFeedbackLabel.textContent = pointerFeedbackLabelV1(
          { phase: "idle" },
          "hand",
          contextRef.current.view,
        );
      }
    };
  }, [props.props.quality]);

  return (
    <section
      className="pet-scene"
      data-pet-scene-status={status}
      data-pet-render-quality={props.props.quality}
      aria-label="小猫的新家"
    >
      <canvas
        ref={canvasRef}
        className="pet-scene__canvas"
        aria-label="小猫与房间的三维互动场景"
      />
      <header className="pet-scene__status" aria-live="polite">
        <span className="pet-scene__eyebrow">MOCHI · {props.context.view.trustStage}</span>
        <strong>
          {status === "ready"
            ? activityLabelV1(props.context.view)
            : status === "failed"
            ? "场景载入失败"
            : "正在布置新家…"}
        </strong>
        <small>{moodLabelV1(props.context.view.mood)}</small>
        <output
          key={reaction?.occurrence ?? 0}
          className={reaction === null
            ? "pet-scene__counter"
            : "pet-scene__counter pet-scene__counter--fresh"}
          data-pet-last-outcome={visibleOutcome ?? "none"}
          data-pet-reaction-occurrence={reaction?.occurrence ?? 0}
        >
          {outcomeLabelV1(
            visibleOutcome,
            props.context.view.trustStage,
            visibleInteractionKind,
            visibleInteractionTargetId,
            visibleBellyTerminal,
          )}
        </output>
      </header>
      <div className="pet-scene__tool-control" data-pet-interaction-tool={interactionTool}>
        <span>照料工具</span>
        <button
          type="button"
          disabled={!groomingAvailable}
          aria-pressed={interactionTool === "brush"}
          onClick={() => setRequestedTool((current) => current === "hand" ? "brush" : "hand")}
        >
          <strong>{interactionTool === "brush" ? "放下梳子" : "拿起梳子"}</strong>
          <small>{groomingAvailable ? "信赖后可梳理背部" : "建立信任后解锁"}</small>
        </button>
      </div>
      <div className="pet-scene__interaction-card">
        <span>{interactionCopy.eyebrow}</span>
        <strong>{interactionCopy.title}</strong>
        <small>{interactionCopy.detail}</small>
      </div>
      <output
        ref={pointerFeedbackRef}
        className="pet-scene__pointer-feedback"
        data-phase="idle"
        aria-label="互动反馈"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="pet-scene__pointer-ring" aria-hidden="true" />
        <span ref={pointerFeedbackLabelRef} className="pet-scene__pointer-label">
          移动到小猫身上开始互动
        </span>
      </output>
    </section>
  );
}

function pointerFeedbackLabelV1(
  feedback: PetPointerFeedbackV1,
  tool: PetInteractionToolV1,
  view: ElectronicPetSceneContextV1["view"],
): string {
  const phase = feedback.phase;
  const targetInteractionId = phase === "idle" ? null : feedback.targetInteractionId;
  if (targetInteractionId === "interaction.pet.belly") {
    const invited = view.invitation?.kind === "belly_offer";
    switch (phase) {
      case "idle":
        return "移动到小猫身上开始互动";
      case "hover":
        return invited ? "它正邀请你短暂碰一碰腹部" : "露出肚皮不等于邀请；可以摸头或先观察";
      case "blocked":
        return "现在不能触碰腹部";
      case "tracking":
        return invited ? "保持缓慢、短暂，留意它的动作" : "它收紧了后腿——现在停手";
      case "ready":
        return invited ? "现在松手，保持这次接触短暂" : "它在提醒你停手";
      case "warning":
        return "尾巴开始甩动——立刻停手";
      case "escalated":
        return "你没有停手，它翻身退开了";
      case "incomplete":
        return invited ? "轻点不是一次完整互动" : "你及时停下，它重新放松了";
      case "complete":
        return invited ? "完成了一次短暂的腹部互动" : "你尊重了它的边界";
    }
  }
  if (tool === "brush") {
    switch (phase) {
      case "idle":
        return "在背部顺着毛发滑动";
      case "hover":
        return "这里可以梳理";
      case "blocked":
        return "当前姿势不能梳理";
      case "tracking":
        return "顺着毛发继续梳";
      case "ready":
        return "现在松手完成梳理";
      case "warning":
        return "它在提醒你停下梳子";
      case "escalated":
        return "它避开了梳子";
      case "incomplete":
        return "再梳长一点";
      case "complete":
        return "完成了一次梳理";
    }
  }
  switch (phase) {
    case "idle":
      return "移动到小猫身上开始互动";
    case "hover":
      return "这里可以抚摸";
    case "blocked":
      return "它还不准备被触碰";
    case "tracking":
      return "继续滑动";
    case "ready":
      return "现在松手即可完成";
    case "warning":
      return "它在提醒你停手";
    case "escalated":
      return "它退开了";
    case "incomplete":
      return "再滑动一点";
    case "complete":
      return "完成了一次抚摸";
  }
  const unreachable: never = phase;
  return unreachable;
}

function interactionCopyV1(
  view: ElectronicPetSceneContextV1["view"],
  tool: PetInteractionToolV1,
): {
  readonly eyebrow: string;
  readonly title: string;
  readonly detail: string;
} {
  if (view.poseId === "supine_relaxed") {
    if (view.invitation?.kind === "belly_offer") {
      return {
        eyebrow: "明确邀请",
        title: "它放松前爪，愿意让你短暂碰一碰腹部",
        detail: "慢慢按住并顺着毛发轻触；看到尾巴或后腿收紧就立刻停手。",
      };
    }
    return {
      eyebrow: "脆弱姿态",
      title: "它把肚皮露给你看了——这是信任，不是触摸邀请",
      detail: "可以轻轻摸头，或在它收紧后腿时及时停下；不要把露腹当成许可。",
    };
  }
  if (tool === "brush") {
    return {
      eyebrow: "梳理时间",
      title: "从肩背顺着毛发轻轻梳理",
      detail: "用鼠标或手指持续滑动。逆毛、过快或在它烦躁时继续，会得到不同反馈。",
    };
  }
  if (view.poseId === "hidden") {
    return {
      eyebrow: "保持距离",
      title: "它还不准备被触碰",
      detail: "先用照料按钮准备清水、猫砂、藏身处和食物，让它自己决定何时出来。",
    };
  }
  if (view.activityReason === "boundary") {
    return {
      eyebrow: "给它空间",
      title: "它已经翻身退开",
      detail: "刚才的警告没有被及时尊重。先停止触碰，让它自己恢复平静。",
    };
  }
  if (view.trustStage === "newcomer" && view.invitation?.kind === "sniff_hand") {
    return {
      eyebrow: "第一次靠近",
      title: "先让它闻闻你的手",
      detail: "直接伸手会让它退缩；先响应闻手邀请，再按住并顺着毛发滑动。",
    };
  }
  if (view.trustStage === "newcomer") {
    return {
      eyebrow: "正在观察",
      title: "先让它适应你的存在",
      detail: "现在触碰会得到拒绝；安静陪伴，等它愿意主动靠近。",
    };
  }
  return {
    eyebrow: "直接互动",
    title: "按住并顺着毛发轻轻抚摸",
    detail: "用鼠标或手指持续滑动；轻点不会完成抚摸，逆毛或过快会得到不同反馈。",
  };
}

function activityLabelV1(view: ElectronicPetSceneContextV1["view"]): string {
  if (view.activityReason === "boundary") return "它翻身退开，正在重新观察你";
  return ({
    hide_in_den: "还躲在安全的小窝里",
    observe_player: "正在悄悄观察你",
    explore_room: "正在熟悉新家",
    approach_player: "它主动靠近了一点",
    eat_at_bowl: "正在安心吃东西",
    rest_nearby: "愿意在你附近休息",
    self_groom: "正在认真梳理自己",
    solo_ball_play: "正在追逐小球",
    belly_expose: "它在你面前放松地露出肚皮",
  } as const)[view.activityId];
}

function moodLabelV1(mood: ElectronicPetSceneContextV1["view"]["mood"]): string {
  return ({
    guarded: "仍然有些戒备",
    calm: "情绪平静",
    social: "愿意和你亲近",
    playful: "现在很想玩",
    overstimulated: "刺激过多，需要一点空间",
  } as const)[mood];
}

function outcomeLabelV1(
  outcome: ElectronicPetSceneContextV1["view"]["lastOutcome"],
  trustStage: ElectronicPetSceneContextV1["view"]["trustStage"],
  interactionKind: "contact" | "grooming" | "belly",
  targetInteractionId: string | null,
  bellyTerminal: PetBellyTerminalV1 | null,
): string {
  if (outcome === null) {
    return trustStage === "newcomer"
      ? "先准备环境、保持距离，再等待它主动靠近"
      : "按住小猫并轻轻滑动，观察它的反应";
  }
  if (interactionKind === "grooming") {
    return ({
      accept: "它放松身体，舒服地贴近了梳子",
      tolerate: "它允许你继续，但还在观察手法",
      warn: "尾巴轻甩了一下，请放慢并顺着毛发",
      refuse: "它避开了梳子，现在需要一点空间",
    } as const)[outcome];
  }
  if (interactionKind === "belly" || targetInteractionId === "interaction.pet.belly") {
    if (bellyTerminal === "stopped_before_warning") {
      return "你及时收回手，它安心地继续保持放松";
    }
    if (bellyTerminal === "stopped_in_warning") {
      return "你在警告后停了下来，它正在重新放松";
    }
    if (bellyTerminal === "continued_after_warning") {
      return "你没有停手，它翻身退开，需要一点空间";
    }
    return ({
      accept: "它放松前爪，舒服地接受了短暂触碰",
      tolerate: "它允许了这次接触，但仍在观察",
      warn: "尾巴开始甩动——现在应该停手",
      refuse: "它翻身退开，结束了这次接触",
    } as const)[outcome];
  }
  return ({
    accept: "它很喜欢刚才的互动",
    tolerate: "它接受了，但还在观察",
    warn: "它发出了警告，请放慢并停手",
    refuse: "它暂时不愿意，请尊重它的边界",
  } as const)[outcome];
}
