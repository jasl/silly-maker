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
      readonly interactionKind: "contact" | "grooming";
    } | null
  >(null);
  const groomingAvailable = props.context.view.trustStage === "trusting" ||
    props.context.view.trustStage === "bonded";
  const interactionTool = groomingAvailable ? requestedTool : "hand";
  const toolRef = useRef<PetInteractionToolV1>(interactionTool);
  const interactionCopy = interactionCopyV1(props.context.view, interactionTool);
  const visibleOutcome = props.context.view.lastOutcome === null
    ? null
    : reaction?.outcome ?? props.context.view.lastOutcome;
  const visibleInteractionKind = reaction?.interactionKind ??
    props.context.view.lastInteractionKind ?? "contact";

  useLayoutEffect(() => {
    contextRef.current = props.context;
    runtimeRef.current?.setCompanionPresentation(props.context.view);
  }, [props.context]);

  useLayoutEffect(() => {
    toolRef.current = interactionTool;
    runtimeRef.current?.setInteractionTool(interactionTool);
    const label = pointerFeedbackLabelRef.current;
    if (label !== null) label.textContent = pointerFeedbackLabelV1("idle", interactionTool);
  }, [interactionTool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return undefined;
    const pointerFeedbackIndicator = pointerFeedbackRef.current;
    const pointerFeedbackLabel = pointerFeedbackLabelRef.current;
    let pendingPointerFeedback: PetPointerFeedbackV1 | null = null;
    let pointerFeedbackFrame = 0;
    let appliedPointerFeedbackPhase: PetPointerFeedbackV1["phase"] = "idle";
    const applyPointerFeedbackV1 = (): void => {
      pointerFeedbackFrame = 0;
      const feedback = pendingPointerFeedback;
      pendingPointerFeedback = null;
      const indicator = pointerFeedbackRef.current;
      const label = pointerFeedbackLabelRef.current;
      if (feedback === null || indicator === null || label === null) return;
      if (feedback.phase !== appliedPointerFeedbackPhase) {
        appliedPointerFeedbackPhase = feedback.phase;
        indicator.dataset.phase = feedback.phase;
        label.textContent = pointerFeedbackLabelV1(feedback.phase, toolRef.current);
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
          runtime.presentReaction(outcome);
          setReaction((current) => ({
            occurrence: (current?.occurrence ?? 0) + 1,
            outcome,
            interactionKind: result.interactionKind,
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
        pointerFeedbackLabel.textContent = pointerFeedbackLabelV1("idle", "hand");
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
            ? activityLabelV1(props.context.view.activityId)
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
  phase: PetPointerFeedbackV1["phase"],
  tool: PetInteractionToolV1,
): string {
  if (tool === "brush") {
    return ({
      idle: "在背部顺着毛发滑动",
      hover: "这里可以梳理",
      blocked: "当前姿势不能梳理",
      tracking: "顺着毛发继续梳",
      ready: "现在松手完成梳理",
      incomplete: "再梳长一点",
      complete: "完成了一次梳理",
    } as const)[phase];
  }
  return ({
    idle: "移动到小猫身上开始互动",
    hover: "这里可以抚摸",
    blocked: "它还不准备被触碰",
    tracking: "继续滑动",
    ready: "现在松手即可完成",
    incomplete: "再滑动一点",
    complete: "完成了一次抚摸",
  } as const)[phase];
}

function interactionCopyV1(
  view: ElectronicPetSceneContextV1["view"],
  tool: PetInteractionToolV1,
): {
  readonly eyebrow: string;
  readonly title: string;
  readonly detail: string;
} {
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

function activityLabelV1(activityId: ElectronicPetSceneContextV1["view"]["activityId"]): string {
  return ({
    hide_in_den: "还躲在安全的小窝里",
    observe_player: "正在悄悄观察你",
    explore_room: "正在熟悉新家",
    approach_player: "它主动靠近了一点",
    eat_at_bowl: "正在安心吃东西",
    rest_nearby: "愿意在你附近休息",
    self_groom: "正在认真梳理自己",
    solo_ball_play: "正在追逐小球",
  } as const)[activityId];
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
  interactionKind: "contact" | "grooming",
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
  return ({
    accept: "它很喜欢刚才的互动",
    tolerate: "它接受了，但还在观察",
    warn: "它发出了警告，请放慢并停手",
    refuse: "它暂时不愿意，请尊重它的边界",
  } as const)[outcome];
}
