// SPDX-License-Identifier: MIT

import type {
  CreatorPreviewPortV1,
  CreatorPreviewResultV1,
  PreviewProgramCapabilityV1,
  PreviewProgramKindV1,
} from "./contracts.ts";

interface PreviewRecipeV1 {
  readonly nameEn: string;
  readonly nameZh: string;
  readonly purposeEn: string;
  readonly purposeZh: string;
  readonly capabilitiesEn: readonly PreviewProgramCapabilityV1[];
  readonly capabilitiesZh: readonly PreviewProgramCapabilityV1[];
}

const recipesV1 = {
  translation: {
    nameEn: "Translation Workshop",
    nameZh: "翻译工作间",
    purposeEn:
      "Organize source material, produce a bilingual draft, and keep human review explicit.",
    purposeZh: "整理源材料、生成双语草稿，并把人工审校作为明确步骤。",
    capabilitiesEn: [
      capabilityV1("document-intake", "Document intake", "Collect and organize source material."),
      capabilityV1(
        "translation-draft",
        "Translation draft",
        "Prepare an editable bilingual draft.",
      ),
      capabilityV1("human-review", "Human review", "Track decisions that still need a person."),
    ],
    capabilitiesZh: [
      capabilityV1("document-intake", "文档导入", "收集并整理需要处理的源材料。"),
      capabilityV1("translation-draft", "翻译草稿", "生成可继续编辑的双语草稿。"),
      capabilityV1("human-review", "人工审校", "记录仍需由人决定的内容。"),
    ],
  },
  writing: {
    nameEn: "Writing Room",
    nameZh: "写作工作间",
    purposeEn: "Turn a creative brief into an outline, editable drafts, and a visible review loop.",
    purposeZh: "把创作意图整理为大纲、可编辑草稿和清晰的审阅循环。",
    capabilitiesEn: [
      capabilityV1("outline", "Outline", "Shape the brief into a navigable structure."),
      capabilityV1("drafting", "Drafting", "Develop editable passages without hiding the source."),
      capabilityV1("human-review", "Human review", "Keep accepted and requested changes visible."),
    ],
    capabilitiesZh: [
      capabilityV1("outline", "大纲", "把创作意图整理为可以导航的结构。"),
      capabilityV1("drafting", "草稿", "生成可编辑内容，同时保留原始意图。"),
      capabilityV1("human-review", "人工审阅", "清楚展示已接受和待调整的修改。"),
    ],
  },
  roleplay: {
    nameEn: "Roleplay Studio",
    nameZh: "角色扮演工作间",
    purposeEn: "Compose characters, scene context, and a reviewable roleplay session.",
    purposeZh: "组合角色、场景上下文和可审查的角色扮演会话。",
    capabilitiesEn: [
      capabilityV1("characters", "Characters", "Describe stable character roles and voices."),
      capabilityV1("scene-context", "Scene context", "Keep the current situation visible."),
      capabilityV1("session", "Session", "Run a reviewable conversation preview."),
    ],
    capabilitiesZh: [
      capabilityV1("characters", "角色", "描述稳定的角色身份与表达方式。"),
      capabilityV1("scene-context", "场景上下文", "保持当前情境清楚可见。"),
      capabilityV1("session", "会话", "运行一段可以检查的对话预览。"),
    ],
  },
  general: {
    nameEn: "Creator Workspace",
    nameZh: "创作者工作间",
    purposeEn: "Turn the request into a focused workspace with visible inputs, output, and review.",
    purposeZh: "把需求整理成一个输入、产物和审阅过程都清晰可见的工作间。",
    capabilitiesEn: [
      capabilityV1("resources", "Resources", "Keep the supplied material close to the work."),
      capabilityV1("workpiece", "Workpiece", "Present the current result in one focused surface."),
      capabilityV1("human-review", "Human review", "Leave final acceptance with the creator."),
    ],
    capabilitiesZh: [
      capabilityV1("resources", "资源", "让输入材料和当前工作保持在一起。"),
      capabilityV1("workpiece", "工作产物", "在聚焦的界面中展示当前结果。"),
      capabilityV1("human-review", "人工审阅", "把最终接受权留给创作者。"),
    ],
  },
} as const satisfies Readonly<Record<PreviewProgramKindV1, PreviewRecipeV1>>;

function capabilityV1(
  capabilityId: string,
  label: string,
  description: string,
): PreviewProgramCapabilityV1 {
  return { capabilityId: `preview.${capabilityId}`, label, description };
}

function previewKindForIntentV1(intent: string): PreviewProgramKindV1 {
  const folded = intent.toLocaleLowerCase("en-US");
  if (/(翻译|本地化|translate|translation|locali[sz]e)/u.test(folded)) return "translation";
  if (/(写作|创作|小说|剧本|write|writing|draft|story)/u.test(folded)) return "writing";
  if (/(角色扮演|跑团|role.?play|character chat)/u.test(folded)) return "roleplay";
  return "general";
}

function usesChineseV1(intent: string): boolean {
  return /[\u3400-\u9fff]/u.test(intent);
}

/** Deterministic local creator used only to make the first product workspace interactive. */
export function createDeterministicFakeCreatorV1(): CreatorPreviewPortV1 {
  return {
    source: "deterministic_fake_preview",
    create({ intent, workspaceId }): CreatorPreviewResultV1 {
      const kind = previewKindForIntentV1(intent);
      const recipe = recipesV1[kind];
      const zh = usesChineseV1(intent);
      const name = zh ? recipe.nameZh : recipe.nameEn;
      return {
        title: name,
        creatorReply: zh
          ? `我根据你的意图整理了“${name}”方案。请检查它的目标、能力和工作界面，再决定是否接受。`
          : `I shaped a “${name}” proposal from your intent. Review its purpose, capabilities, and work surface before accepting it.`,
        program: {
          programId: `program.${workspaceId}`,
          revision: 1,
          kind,
          name,
          purpose: zh ? recipe.purposeZh : recipe.purposeEn,
          requirements: [intent],
          suggestedCapabilities: zh ? recipe.capabilitiesZh : recipe.capabilitiesEn,
        },
      };
    },
    followUp({ workspace, program, text }) {
      const revision = program.revision + 1;
      return usesChineseV1(`${workspace.intent}${text}`)
        ? `我已把这条补充纳入“${workspace.title}”方案 v${String(revision)}，请检查后决定是否接受。`
        : `I incorporated that follow-up into “${workspace.title}” proposal v${
          String(revision)
        }. Review it before accepting.`;
    },
  };
}
