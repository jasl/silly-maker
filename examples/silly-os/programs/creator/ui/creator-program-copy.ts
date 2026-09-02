// SPDX-License-Identifier: MIT

import type { SillyOsCopyV1 } from "../../../src/content/copy.ts";

export interface CreatorProgramCopyV1 extends SillyOsCopyV1 {
  readonly preview: string;
  readonly programAgentName: string;
  readonly programAgentKicker: string;
  readonly programAgentTitle: string;
  readonly programAgentDescription: string;
  readonly programAgentPlaceholder: string;
  readonly create: string;
  readonly examplesLabel: string;
  readonly recentProgramsLabel: string;
  readonly browserLocal: string;
  readonly recentProgramsEmpty: string;
  readonly programsLoading: string;
  readonly programsUnavailable: string;
  readonly loadMorePrograms: string;
  readonly loadingMorePrograms: string;
  readonly runProgram: string;
  readonly editProgram: string;
  readonly savingProgram: string;
  readonly programKindTranslation: string;
  readonly programKindWriting: string;
  readonly programKindRoleplay: string;
  readonly programKindGeneral: string;
  readonly piTestDescription: string;
  readonly piTestTitle: string;
  readonly piTestReady: string;
  readonly piTestFailed: string;
  readonly piTestDraft: string;
  readonly piTestCancel: string;
  readonly piTestForget: string;
  readonly piLiveFailed: string;
  readonly piTestKeyLabel: string;
  readonly piTestKeyPlaceholder: string;
  readonly piTestInitialize: string;
  readonly piTestLoading: string;
  readonly piTestInitializing: string;
  readonly samplePrompts: readonly string[];
  readonly capabilitiesTab: string;
  readonly fullscreen: string;
  readonly exitFullscreen: string;
  readonly closePreview: string;
  readonly openPreview: string;
  readonly accept: string;
  readonly reject: string;
  readonly accepted: string;
  readonly rejected: string;
  readonly proposedProgram: string;
  readonly workspaceReview: string;
  readonly acceptedSnapshot: string;
  readonly pendingReview: string;
  readonly snapshotId: string;
  readonly proposalId: string;
  readonly programRevision: string;
  readonly acceptedHead: string;
  readonly reviewedHead: string;
  readonly mutableHead: string;
  readonly generation: string;
  readonly fileCount: string;
  readonly archiveSize: string;
  readonly mutableHeadUnavailable: string;
  readonly pendingReviewMatches: string;
  readonly pendingReviewChanged: string;
  readonly pendingReviewUnavailable: string;
  readonly acceptedSnapshotMatches: string;
  readonly acceptedSnapshotChanged: string;
  readonly acceptedSnapshotUnavailable: string;
  readonly workspaceAria: string;
  readonly resizeAria: string;
}

const creatorEnglishV1 = {
  preview: "Preview",
  programAgentName: "Program Agent",
  programAgentKicker: "Bundled with SillyOS",
  programAgentTitle: "What would you like to make?",
  programAgentDescription:
    "Describe an outcome. Program Agent will propose a focused program whose instructions, capabilities, work and review surface stay together.",
  programAgentPlaceholder:
    "For example: translate this visual novel, preserve character voices, and give me a review queue for uncertain lines…",
  create: "Create program",
  examplesLabel: "Try a starting point",
  recentProgramsLabel: "Recent programs",
  browserLocal: "Stored in this browser",
  recentProgramsEmpty: "Programs you create here will appear in this browser.",
  programsLoading: "Opening the local Program catalog…",
  programsUnavailable: "The local Program catalog is unavailable.",
  loadMorePrograms: "Load more programs",
  loadingMorePrograms: "Loading more programs…",
  runProgram: "Start or continue",
  editProgram: "Edit program",
  savingProgram: "Saving Program…",
  programKindTranslation: "Translation",
  programKindWriting: "Writing",
  programKindRoleplay: "Role-play",
  programKindGeneral: "General-purpose",
  piTestDescription:
    "Runs the product-pinned Pi 0.84.4 Agent with a deterministic local provider. It does not contact an LLM or validate a real provider key.",
  piTestTitle: "Browser Pi wiring check",
  piTestReady: "Pi test ready",
  piTestFailed: "Pi test unavailable",
  piTestDraft: "Program Agent draft",
  piTestCancel: "Cancel run",
  piTestForget: "Forget test key",
  piLiveFailed: "Provider Agent unavailable",
  piTestKeyLabel: "Synthetic test key (memory only)",
  piTestKeyPlaceholder: "Enter a disposable test value",
  piTestInitialize: "Initialize Pi test",
  piTestLoading: "Loading the Browser adapter…",
  piTestInitializing: "Starting the Agent Worker…",
  samplePrompts: Object.freeze([
    "Translate a visual novel and keep each character’s voice consistent",
    "Translate subtitles into natural English and flag uncertain terminology for review",
    "Create a bilingual Markdown translation workflow that preserves links and code",
  ]),
  capabilitiesTab: "Capabilities",
  fullscreen: "Open full screen",
  exitFullscreen: "Exit full screen",
  closePreview: "Close workpiece",
  openPreview: "Open workpiece",
  accept: "Accept program",
  reject: "Reject proposal",
  accepted: "Program accepted",
  rejected: "Proposal rejected",
  proposedProgram: "Proposed program",
  workspaceReview: "Workspace review",
  acceptedSnapshot: "Accepted snapshot",
  pendingReview: "Pending review",
  snapshotId: "Snapshot ID",
  proposalId: "Proposal ID",
  programRevision: "Program revision",
  acceptedHead: "Accepted head",
  reviewedHead: "Reviewed head",
  mutableHead: "Current working head",
  generation: "Generation",
  fileCount: "Files",
  archiveSize: "Archive bytes",
  mutableHeadUnavailable: "Unavailable",
  pendingReviewMatches: "The working copy matches the reviewed proposal.",
  pendingReviewChanged:
    "The workspace changed after this proposal was reviewed. Ask Program Agent for a new revision before accepting.",
  pendingReviewUnavailable:
    "The current working head is unavailable, so its relationship to this proposal is unknown.",
  acceptedSnapshotMatches: "The working copy matches the accepted snapshot.",
  acceptedSnapshotChanged:
    "The working copy has changes after the accepted snapshot. Those changes are not accepted.",
  acceptedSnapshotUnavailable:
    "The current working head is unavailable, so its relationship to the accepted snapshot is unknown.",
  workspaceAria: "SillyOS program workspace",
  resizeAria: "Resize conversation and workpiece panes",
} as const;

const creatorChineseV1 = {
  preview: "预览",
  programAgentName: "Program Agent",
  programAgentKicker: "随 SillyOS 分发",
  programAgentTitle: "你想创作什么？",
  programAgentDescription:
    "描述你想得到的结果。Program Agent 会提出一个专注的程序，把指令、能力、工作内容和人工审查界面组织在同一个工程中。",
  programAgentPlaceholder:
    "例如：翻译这部视觉小说，保留每位角色的说话风格，并把不确定的文本放进人工审查队列……",
  create: "创建程序",
  examplesLabel: "从一个想法开始",
  recentProgramsLabel: "最近的程序",
  browserLocal: "保存在此浏览器中",
  recentProgramsEmpty: "你在这里创建的程序会出现在此浏览器中。",
  programsLoading: "正在打开本地 Program 目录……",
  programsUnavailable: "本地 Program 目录当前不可用。",
  loadMorePrograms: "载入更多程序",
  loadingMorePrograms: "正在载入更多程序……",
  runProgram: "开始或继续",
  editProgram: "编辑程序",
  savingProgram: "正在保存 Program……",
  programKindTranslation: "翻译",
  programKindWriting: "写作",
  programKindRoleplay: "角色扮演",
  programKindGeneral: "创作工具",
  piTestDescription:
    "使用产品固定的 Pi 0.84.4 Agent 和确定性本地 provider；不会连接 LLM，也不会校验真实 provider key。",
  piTestTitle: "浏览器 Pi 接线检查",
  piTestReady: "Pi 测试已就绪",
  piTestFailed: "Pi 测试不可用",
  piTestDraft: "Program Agent 草稿",
  piTestCancel: "取消运行",
  piTestForget: "忘记测试 key",
  piLiveFailed: "Provider Agent 不可用",
  piTestKeyLabel: "合成测试 key（仅内存）",
  piTestKeyPlaceholder: "输入可随时丢弃的测试值",
  piTestInitialize: "初始化 Pi 测试",
  piTestLoading: "正在加载 Browser 适配器……",
  piTestInitializing: "正在启动 Agent Worker……",
  samplePrompts: Object.freeze([
    "翻译一部视觉小说，并保持每位角色的语言风格一致",
    "把字幕翻译成自然中文，并把不确定的术语交给我审查",
    "创建一个保留链接和代码的双语 Markdown 翻译流程",
  ]),
  capabilitiesTab: "能力",
  fullscreen: "全屏打开",
  exitFullscreen: "退出全屏",
  closePreview: "关闭工作界面",
  openPreview: "打开工作界面",
  accept: "接受程序",
  reject: "拒绝方案",
  accepted: "已接受程序",
  rejected: "已拒绝方案",
  proposedProgram: "建议的程序",
  workspaceReview: "工作区审查",
  acceptedSnapshot: "已接受快照",
  pendingReview: "待审查方案",
  snapshotId: "快照 ID",
  proposalId: "方案 ID",
  programRevision: "Program 版本",
  acceptedHead: "已接受版本头",
  reviewedHead: "已审查版本头",
  mutableHead: "当前工作版本头",
  generation: "代次",
  fileCount: "文件数",
  archiveSize: "归档字节数",
  mutableHeadUnavailable: "不可用",
  pendingReviewMatches: "当前工作副本与已审查方案一致。",
  pendingReviewChanged:
    "工作区在本方案完成审查后发生了变化。请先让 Program Agent 生成新的修订版本，再执行接受。",
  pendingReviewUnavailable: "当前工作版本头不可用，因此无法判断它与本方案的关系。",
  acceptedSnapshotMatches: "当前工作副本与已接受快照一致。",
  acceptedSnapshotChanged: "当前工作副本在已接受快照之后发生了变化；这些变化尚未被接受。",
  acceptedSnapshotUnavailable: "当前工作版本头不可用，因此无法判断它与已接受快照的关系。",
  workspaceAria: "SillyOS 程序工作区",
  resizeAria: "调整对话区和工作界面的宽度",
} as const;

export function getCreatorProgramCopyV1(copy: SillyOsCopyV1): CreatorProgramCopyV1 {
  return Object.freeze({
    ...copy,
    ...(copy.locale === "zh-CN" ? creatorChineseV1 : creatorEnglishV1),
  });
}
