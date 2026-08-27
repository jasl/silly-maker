// SPDX-License-Identifier: MIT

export type SillyOsLocaleV1 = "en" | "zh-CN";

export interface SillyOsCopyV1 {
  readonly locale: SillyOsLocaleV1;
  readonly productName: string;
  readonly preview: string;
  readonly creatorName: string;
  readonly creatorKicker: string;
  readonly creatorTitle: string;
  readonly creatorDescription: string;
  readonly creatorPlaceholder: string;
  readonly create: string;
  readonly addResource: string;
  readonly examplesLabel: string;
  readonly recentProgramsLabel: string;
  readonly browserLocal: string;
  readonly recentProgramsEmpty: string;
  readonly programsLoading: string;
  readonly programsUnavailable: string;
  readonly openProgram: string;
  readonly savingProgram: string;
  readonly retry: string;
  readonly persistenceFailure: string;
  readonly persistenceConflict: string;
  readonly persistenceOutcomeUnknown: string;
  readonly programKindTranslation: string;
  readonly programKindWriting: string;
  readonly programKindRoleplay: string;
  readonly programKindGeneral: string;
  readonly home: string;
  readonly chat: string;
  readonly previewTab: string;
  readonly sourceTab: string;
  readonly capabilitiesTab: string;
  readonly activityTab: string;
  readonly fullscreen: string;
  readonly exitFullscreen: string;
  readonly closePreview: string;
  readonly openPreview: string;
  readonly sendPlaceholder: string;
  readonly send: string;
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
  readonly mobileNavigation: string;
  readonly piTestTitle: string;
  readonly piTestDescription: string;
  readonly piTestKeyLabel: string;
  readonly piTestKeyPlaceholder: string;
  readonly piTestInitialize: string;
  readonly piTestLoading: string;
  readonly piTestInitializing: string;
  readonly piTestReady: string;
  readonly piTestFailed: string;
  readonly piTestDraft: string;
  readonly piTestCancel: string;
  readonly piTestForget: string;
  readonly piLiveTitle: string;
  readonly piLiveDescription: string;
  readonly piLiveReady: string;
  readonly piLiveFailed: string;
  readonly piLiveForget: string;
  readonly settings: string;
  readonly settingsBack: string;
  readonly providerSettingsTitle: string;
  readonly providerSettingsDescription: string;
  readonly providersLabel: string;
  readonly providerSearchLabel: string;
  readonly providerSearchPlaceholder: string;
  readonly providerSearchEmpty: string;
  readonly providerCatalogLoading: string;
  readonly providerCatalogLoadingDescription: string;
  readonly providerCatalogFailed: string;
  readonly providerCatalogFailedDescription: string;
  readonly providerCatalogEmpty: string;
  readonly providerDetailEmpty: string;
  readonly backToProviders: string;
  readonly providerStatusQualified: string;
  readonly providerStatusCandidate: string;
  readonly providerStatusUnavailable: string;
  readonly providerQualifiedDescription: string;
  readonly providerQualificationPending: string;
  readonly providerBrowserUnavailable: string;
  readonly providerCredentialUnavailable: string;
  readonly providerPublicHttpUnavailable: string;
  readonly providerNotQualified: string;
  readonly modelsCountSuffix: string;
  readonly providerModelsTitle: string;
  readonly providerModelsDescription: string;
  readonly providerModelsEmpty: string;
  readonly modelSearchLabel: string;
  readonly modelSearchPlaceholder: string;
  readonly modelSearchEmpty: string;
  readonly creatorModelSelection: string;
  readonly creatorModelTitle: string;
  readonly creatorModelDescription: string;
  readonly chooseQualifiedModel: string;
  readonly selectedModelUnavailable: string;
  readonly providerKeyMemoryOnly: string;
  readonly providerKeyLabel: string;
  readonly providerKeyPlaceholder: string;
  readonly providerInitialize: string;
  readonly providerInitializing: string;
  readonly providerConnected: string;
  readonly providerConnectionFailed: string;
  readonly providerForget: string;
  readonly providerForgetting: string;
  readonly samplePrompts: readonly string[];
}

const englishV1: SillyOsCopyV1 = {
  locale: "en",
  productName: "SillyOS",
  preview: "Preview",
  creatorName: "Agent Creator",
  creatorKicker: "One built-in program",
  creatorTitle: "What would you like to make?",
  creatorDescription:
    "Describe an outcome. Agent Creator will propose a focused program whose instructions, capabilities, work and review surface stay together.",
  creatorPlaceholder:
    "For example: translate this visual novel, preserve character voices, and give me a review queue for uncertain lines…",
  create: "Create program",
  addResource: "Add resource",
  examplesLabel: "Try a starting point",
  recentProgramsLabel: "Recent programs",
  browserLocal: "Stored in this browser",
  recentProgramsEmpty: "Programs you create here will appear in this browser.",
  programsLoading: "Opening the local Program catalog…",
  programsUnavailable: "The local Program catalog is unavailable.",
  openProgram: "Open program",
  savingProgram: "Saving Program…",
  retry: "Retry",
  persistenceFailure: "The Program was not saved. Your previous committed version is unchanged.",
  persistenceConflict: "Another page updated this Program. The durable version has been reopened.",
  persistenceOutcomeUnknown: "Checking whether the Program was committed…",
  programKindTranslation: "Translation",
  programKindWriting: "Writing",
  programKindRoleplay: "Role-play",
  programKindGeneral: "Creator tool",
  home: "Creator home",
  chat: "Chat",
  previewTab: "View",
  sourceTab: "Source",
  capabilitiesTab: "Capabilities",
  activityTab: "Activity",
  fullscreen: "Open full screen",
  exitFullscreen: "Exit full screen",
  closePreview: "Close workpiece",
  openPreview: "Open workpiece",
  sendPlaceholder: "Ask for a change…",
  send: "Send",
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
    "The workspace changed after this proposal was reviewed. Ask Agent Creator for a new revision before accepting.",
  pendingReviewUnavailable:
    "The current working head is unavailable, so its relationship to this proposal is unknown.",
  acceptedSnapshotMatches: "The working copy matches the accepted snapshot.",
  acceptedSnapshotChanged:
    "The working copy has changes after the accepted snapshot. Those changes are not accepted.",
  acceptedSnapshotUnavailable:
    "The current working head is unavailable, so its relationship to the accepted snapshot is unknown.",
  workspaceAria: "SillyOS program workspace",
  resizeAria: "Resize conversation and workpiece panes",
  mobileNavigation: "Workspace views",
  piTestTitle: "Browser Pi wiring check",
  piTestDescription:
    "Runs the product-pinned Pi 0.84.3 Agent with a deterministic local provider. It does not contact an LLM or validate a real provider key.",
  piTestKeyLabel: "Synthetic test key (memory only)",
  piTestKeyPlaceholder: "Enter a disposable test value",
  piTestInitialize: "Initialize Pi test",
  piTestLoading: "Loading the Browser adapter…",
  piTestInitializing: "Starting the Agent Worker…",
  piTestReady: "Pi test ready",
  piTestFailed: "Pi test unavailable",
  piTestDraft: "Agent Creator draft",
  piTestCancel: "Cancel run",
  piTestForget: "Forget test key",
  piLiveTitle: "Browser Pi Provider",
  piLiveDescription:
    "Choose a Pi-supplied Provider and Browser-qualified model in Settings. Your key moves to Agent Worker memory and is not saved.",
  piLiveReady: "Provider Agent configured",
  piLiveFailed: "Provider Agent unavailable",
  piLiveForget: "Forget Provider key",
  settings: "Settings",
  settingsBack: "Back to Agent Creator",
  providerSettingsTitle: "Providers",
  providerSettingsDescription: "Inspect the Provider and model catalog supplied by Pi.",
  providersLabel: "Pi Providers",
  providerSearchLabel: "Search Providers",
  providerSearchPlaceholder: "Search Providers…",
  providerSearchEmpty: "No Providers match this search.",
  providerCatalogLoading: "Loading the Pi catalog…",
  providerCatalogLoadingDescription:
    "Provider and model details are loaded lazily from the product-pinned Pi Worker.",
  providerCatalogFailed: "The Pi catalog is unavailable",
  providerCatalogFailedDescription:
    "No Provider or model was inferred locally. Retry the pinned Pi catalog request.",
  providerCatalogEmpty: "Pi returned no Providers.",
  providerDetailEmpty: "Choose a Provider to inspect its Browser status and models.",
  backToProviders: "Back to Providers",
  providerStatusQualified: "Qualified",
  providerStatusCandidate: "Candidate",
  providerStatusUnavailable: "Unavailable",
  providerQualifiedDescription:
    "This exact Provider and model path has passed the SillyOS Browser contract.",
  providerQualificationPending:
    "This route is visible from Pi but has not passed SillyOS Browser qualification.",
  providerBrowserUnavailable: "This Pi route is not available in the Browser target.",
  providerCredentialUnavailable:
    "This Provider's credential flow is not available in the Browser target.",
  providerPublicHttpUnavailable:
    "Public HTTP endpoints cannot be used from the deployed HTTPS application.",
  providerNotQualified: "This exact Provider and model route is not qualified for Browser use.",
  modelsCountSuffix: "models",
  providerModelsTitle: "Models from Pi",
  providerModelsDescription:
    "Names and identities come from Pi; SillyOS adds only truthful Browser availability.",
  providerModelsEmpty: "Pi returned no models for this Provider.",
  modelSearchLabel: "Search models",
  modelSearchPlaceholder: "Search model name or ID…",
  modelSearchEmpty: "No models match this search.",
  creatorModelSelection: "Agent Creator model",
  creatorModelTitle: "Use with Agent Creator",
  creatorModelDescription:
    "This device-session choice configures the current supervisor. The key never becomes Program or Workspace data.",
  chooseQualifiedModel: "Choose a qualified model to connect Agent Creator.",
  selectedModelUnavailable:
    "This model remains inspectable, but it cannot be connected in this Browser build.",
  providerKeyMemoryOnly:
    "The key is transferred directly to Agent Worker memory, cleared here immediately, and never saved.",
  providerKeyLabel: "API key (memory only)",
  providerKeyPlaceholder: "Paste the Provider API key",
  providerInitialize: "Connect Agent Creator",
  providerInitializing: "Connecting…",
  providerConnected: "Agent Creator connected",
  providerConnectionFailed: "Agent Creator could not connect. The key was not retained.",
  providerForget: "Forget key",
  providerForgetting: "Forgetting…",
  samplePrompts: [
    "Translate a visual novel and keep each character’s voice consistent",
    "Turn my research notes into a chapter-by-chapter writing room",
    "Create a role-play studio with editable character and world memory",
  ],
};

const chineseV1: SillyOsCopyV1 = {
  locale: "zh-CN",
  productName: "SillyOS",
  preview: "预览",
  creatorName: "Agent Creator",
  creatorKicker: "唯一的内置程序",
  creatorTitle: "你想创作什么？",
  creatorDescription:
    "描述你想得到的结果。Agent Creator 会提出一个专注的程序，把指令、能力、工作内容和人工审查界面组织在同一个工程中。",
  creatorPlaceholder:
    "例如：翻译这部视觉小说，保留每位角色的说话风格，并把不确定的文本放进人工审查队列……",
  create: "创建程序",
  addResource: "添加资料",
  examplesLabel: "从一个想法开始",
  recentProgramsLabel: "最近的程序",
  browserLocal: "保存在此浏览器中",
  recentProgramsEmpty: "你在这里创建的程序会出现在此浏览器中。",
  programsLoading: "正在打开本地 Program 目录……",
  programsUnavailable: "本地 Program 目录当前不可用。",
  openProgram: "打开程序",
  savingProgram: "正在保存 Program……",
  retry: "重试",
  persistenceFailure: "Program 未保存；上一个已提交版本保持不变。",
  persistenceConflict: "另一个页面已更新此 Program，已重新打开持久版本。",
  persistenceOutcomeUnknown: "正在核对 Program 是否已经提交……",
  programKindTranslation: "翻译",
  programKindWriting: "写作",
  programKindRoleplay: "角色扮演",
  programKindGeneral: "创作工具",
  home: "Creator 首页",
  chat: "对话",
  previewTab: "界面",
  sourceTab: "工程",
  capabilitiesTab: "能力",
  activityTab: "活动",
  fullscreen: "全屏打开",
  exitFullscreen: "退出全屏",
  closePreview: "关闭工作界面",
  openPreview: "打开工作界面",
  sendPlaceholder: "告诉 Agent 你想修改什么……",
  send: "发送",
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
    "工作区在本方案完成审查后发生了变化。请先让 Agent Creator 生成新的修订版本，再执行接受。",
  pendingReviewUnavailable: "当前工作版本头不可用，因此无法判断它与本方案的关系。",
  acceptedSnapshotMatches: "当前工作副本与已接受快照一致。",
  acceptedSnapshotChanged: "当前工作副本在已接受快照之后发生了变化；这些变化尚未被接受。",
  acceptedSnapshotUnavailable: "当前工作版本头不可用，因此无法判断它与已接受快照的关系。",
  workspaceAria: "SillyOS 程序工作区",
  resizeAria: "调整对话区和工作界面的宽度",
  mobileNavigation: "工作区视图",
  piTestTitle: "浏览器 Pi 接线检查",
  piTestDescription:
    "使用产品固定的 Pi 0.84.3 Agent 和确定性本地 provider；不会连接 LLM，也不会校验真实 provider key。",
  piTestKeyLabel: "合成测试 key（仅内存）",
  piTestKeyPlaceholder: "输入可随时丢弃的测试值",
  piTestInitialize: "初始化 Pi 测试",
  piTestLoading: "正在加载 Browser 适配器……",
  piTestInitializing: "正在启动 Agent Worker……",
  piTestReady: "Pi 测试已就绪",
  piTestFailed: "Pi 测试不可用",
  piTestDraft: "Agent Creator 草稿",
  piTestCancel: "取消运行",
  piTestForget: "忘记测试 key",
  piLiveTitle: "浏览器 Pi Provider",
  piLiveDescription:
    "请在设置中选择由 Pi 提供的 Provider 和已通过浏览器验证的模型。Key 会直接进入 Agent Worker 内存，并且不会保存。",
  piLiveReady: "Provider Agent 已配置",
  piLiveFailed: "Provider Agent 不可用",
  piLiveForget: "忘记 Provider key",
  settings: "设置",
  settingsBack: "返回 Agent Creator",
  providerSettingsTitle: "Provider",
  providerSettingsDescription: "查看由 Pi 提供的 Provider 与模型目录。",
  providersLabel: "Pi Provider",
  providerSearchLabel: "搜索 Provider",
  providerSearchPlaceholder: "搜索 Provider……",
  providerSearchEmpty: "没有符合搜索条件的 Provider。",
  providerCatalogLoading: "正在加载 Pi 目录……",
  providerCatalogLoadingDescription: "Provider 与模型详情从产品固定的 Pi Worker 中按需加载。",
  providerCatalogFailed: "Pi 目录不可用",
  providerCatalogFailedDescription:
    "SillyOS 没有在本地猜测 Provider 或模型；请重试固定的 Pi 目录请求。",
  providerCatalogEmpty: "Pi 没有返回 Provider。",
  providerDetailEmpty: "请选择一个 Provider，查看其浏览器状态与模型。",
  backToProviders: "返回 Provider 列表",
  providerStatusQualified: "已验证",
  providerStatusCandidate: "候选",
  providerStatusUnavailable: "不可用",
  providerQualifiedDescription: "这组 Provider 与模型路径已经通过 SillyOS 浏览器合同验证。",
  providerQualificationPending: "Pi 中存在这条路径，但它尚未通过 SillyOS 浏览器资格验证。",
  providerBrowserUnavailable: "这条 Pi 路径在浏览器目标中不可用。",
  providerCredentialUnavailable: "这个 Provider 的凭据流程在浏览器目标中不可用。",
  providerPublicHttpUnavailable: "部署后的 HTTPS 应用无法使用公开 HTTP endpoint。",
  providerNotQualified: "这组 Provider 与模型路径尚未取得浏览器使用资格。",
  modelsCountSuffix: "个模型",
  providerModelsTitle: "Pi 模型",
  providerModelsDescription: "名称与标识来自 Pi；SillyOS 只补充真实的浏览器可用状态。",
  providerModelsEmpty: "Pi 没有为这个 Provider 返回模型。",
  modelSearchLabel: "搜索模型",
  modelSearchPlaceholder: "搜索模型名称或 ID……",
  modelSearchEmpty: "没有符合搜索条件的模型。",
  creatorModelSelection: "Agent Creator 模型",
  creatorModelTitle: "用于 Agent Creator",
  creatorModelDescription:
    "这个设备会话中的选择用于配置当前 supervisor；Key 永远不会成为 Program 或 Workspace 数据。",
  chooseQualifiedModel: "请选择一个已验证模型来连接 Agent Creator。",
  selectedModelUnavailable: "这个模型仍可查看，但无法在当前浏览器版本中连接。",
  providerKeyMemoryOnly: "Key 会直接传入 Agent Worker 内存，在这里立即清除，并且永不保存。",
  providerKeyLabel: "API key（仅内存）",
  providerKeyPlaceholder: "粘贴 Provider API key",
  providerInitialize: "连接 Agent Creator",
  providerInitializing: "正在连接……",
  providerConnected: "Agent Creator 已连接",
  providerConnectionFailed: "Agent Creator 连接失败；Key 未被保留。",
  providerForget: "忘记 key",
  providerForgetting: "正在忘记……",
  samplePrompts: [
    "翻译一部视觉小说，并保持每位角色的语言风格一致",
    "把我的调研笔记整理成可以逐章推进的写作工作室",
    "创建一个能编辑角色设定与世界记忆的 AI 角色扮演工作室",
  ],
};

export function getSillyOsCopyV1(locale: SillyOsLocaleV1): SillyOsCopyV1 {
  return locale === "zh-CN" ? chineseV1 : englishV1;
}

/** Site-style locale selection without creating another runtime i18n authority. */
export function resolveSillyOsCopyV1(): SillyOsCopyV1 {
  if (typeof location !== "undefined") {
    const locale = new URLSearchParams(location.search).get("locale");
    if (locale === "zh" || locale === "zh-CN") return getSillyOsCopyV1("zh-CN");
    if (locale === "en") return getSillyOsCopyV1("en");
  }
  return typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh")
    ? getSillyOsCopyV1("zh-CN")
    : getSillyOsCopyV1("en");
}
