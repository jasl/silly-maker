# VN Authoring Source 与 Interactive Director V1 候选计划

状态：**2026-08-30 经所有者同意落盘为候选，尚未激活实施。**

[Production-floor sequence](2026-07-30-production-floor-sequence.md) 仍是唯一跨计划排序入口。本计划接续已关闭的
[VN Genre Mod、History Mod 与作者工作流](2026-08-29-vn-genre-mod-authoring.md) 和
[阶段收口](2026-08-30-stage-close.md)，但落盘本身不改变 current/next，也不自动开始实现。只有所有者明确启动后，
才把它登记为当前 lane。

## 1. 问题与目标

当前 `@sillymaker/vn/interaction` 已有一套共用的 interaction document、cold compiler 和 deterministic runtime，
并覆盖 `say`、`choice`、`stage`、`branch`、`hold`、`end` 以及 Scene/Cue/appearance 编排。One Last Sound Check
仍从 TypeScript 常量构造这些内容；VN Inspector 可以溯源和只读检查，但人类或 Agent 还不能通过同一权威完成
VN 结构编辑、undo/redo、CAS 保存和 detached preview。

本计划的目标是把**当前已经支持的 VN 能力**变成第一份真实、可写、可审查的作者源，并在稳定 Authoring Host 上
交付一个延迟加载的 Interactive Director。它证明人类、自动化和未来 Agent 可以共享同一组 typed operation，
而不建立第二个 VN compiler、第二个文件写入权威、通用 Editor Context 或 Ren'Py 解释器。

## 2. 已接受边界

- **一份源权威：** 每个 VN 文档显式选择 file-authored 或 code-first authority。维护中的旗舰迁入可写作者文档后，
  删除对应 TypeScript 数据副本；不得保留 TS/JSON 双轨或运行时 last-wins 合并。
- **代码仍是高级路径：** 普通 TypeScript 继续支持程序化 composition 和产品 predicate/effect adapter，但 V1 不承诺
  把任意函数、闭包或 AST 可视化回写。code-first 文档在 Director 中只读。
- **稳定身份与显示名称分离：** `blockId`、`optionId` 是引用、Save/replay 和 source-map identity；可编辑 `label`
  只服务人类界面。移动或改名 label 不得隐式改变 node、definition、choice 或 text identity。
- **复用唯一运行时：** 作者文档在边界严格 admission 一次，随后降级到现有
  `@sillymaker/vn/interaction` compiler/runtime；authoring-only source map、diagnostics 和 selection 不进入
  Gameplay State、Save 或 render/command 热路径。
- **Authoring Domain 稳定，工具 UI 可换代：** Authoring Host、document session、history、CAS 和 source IO
  不属于 Director Mod。Director 是 R1 tooling Mod；卸载 UI 不带走 draft、undo/redo、GameSession 或文件 owner。
- **沿用现有 R0–R3：** open/save 继续使用既有 authoring session result；保存后的 runtime refresh/publication
  继续按 R0–R3 分类，不增加一套 `AuthoringApplyDisposition`、Editor lifecycle 或 service locator。
- **文本和 Scene 仍各自拥有写权威：** VN operation 只修改 text/speaker/Scene/Cue 引用与 VN 编排，不直接改
  locale text pack 或 Scene 文档。需要跨文档修改时生成多个可审查步骤，不伪装成 V1 跨文档事务。

## 3. 作者文档与所有权

第一版外部作者源采用严格 JSON-safe envelope：

```text
format: "sillymaker.vn"
version: 1
docId / prefix / entry
blocks[] with stable blockId
choice.options[] with stable optionId
```

`blockId` 和 `optionId` 都在各自文档内全局唯一；不得继续允许不同 choice block 产生相同 option identity。产品自有
predicate/effect payload 继续是由产品 adapter admission 的 `StrictJsonValueV1`。Scene/Cue 操作引用既有产品
Scene/Cue registry，appearance 引用 Stage layer/tag 与 appearance key/value，不把运行函数写入 JSON。结构 admission
与带 registry 的 semantic compile validation 保持分开。边界必须保留 `format` 和 `version`，但 V1 只严格接受当前
版本；在出现第二个不兼容格式前不建设 migration registry。

从现有 TypeScript 文档迁移时，原 `name`/option `name` 的值成为稳定 ID，编译 receipt 必须证明既有 nodeId、
definitionId、choiceId、textId、route 和 Save/replay identity 不变。`label` 不参与技术 identity。

## 4. 里程碑与验收

### M0 — 身份与作者源合同

- 定义并一次 admission `sillymaker.vn` format version 1；拒绝 unknown format/version、重复 ID、悬空 target、非法
  Scene/Cue 引用和不合法产品 payload，失败不产生部分文档；
- 建立稳定 `blockId`/`optionId` 与 authoring-only source reference/JSON pointer；编译结果的 runtime plan 不携带
  authoring tree；
- 明确 file-authored/code-first 选择，保留 code-first 只读路径，不引入 AST writer、隐式转换或 compatibility alias；
- 用 One Last Sound Check 当前完整脚本生成迁移 baseline，冻结 compiled identity、两条 named simulation、
  Save/replay 和 presentation outcome。

### M1 — 单一 admission、索引和共用 session

- Project Authoring Index 发现可写 VN 文档的 metadata，不加载完整项目内容建立通用 Symbol Graph；新增 focused VN
  source port，复用 shared same-origin guard 以及现有 CAS IO/session 模式，不建立 generic `FilePort` 或 source registry；
- 扩展**同一个** Authoring Host，使它拥有 focused VN session、selection、operation executor，并与现有 Scene session
  聚合 dirty/busy、save/discard/close gate；Director Mod 或第二个 Host 都不得成为 VN session owner；
- VN session 复用 `AuthoringDocumentSession` 的 history、undo/redo、discard/reload、exact document-successor identity
  与 monotonic draft revision；Scene 与 VN 同时 dirty 时必须由同一个 Host close gate 明确保存、丢弃或取消；
- compiler 输入只消费 admitted typed document；source map、diagnostics 和 reference projection 作为 authoring-only
  facet 附加，不建立第二个 VN compiler；
- ordinary Player、headless simulation 和 production build 不导入 source IO、Authoring Host、Director 或
  authoring-only source-map/diagnostic facet/CSS。既有 VN cold compiler 是否留在 production 保持当前路径，不为结构
  排除指标制造新的 build-time emission 管线。

### M2 — focused VN structured operations

- 定义窄的、versioned VN operation vocabulary 与 pure reducer，覆盖 file-authored V1 的全部可写字段：document entry；
  block/option 插入、删除、移动和 label；say speaker/textId；choice promptTextId、target/effect；branch cases/predicate；
  hold duration/tick quantum/skippable/when/ops；definition/seen revision；speaker definition；以及
  Scene/Cue/appearance 编排。`format`、`version`、`docId`、`prefix` 和稳定 ID 不作为普通 rename operation；
- 多步结构调整以一个 atomic batch 提交，并成为一个 undo history entry；invalid/stale batch 原子拒绝，draft、dirty、
  history 和 source bytes 不变；
- execution envelope 复用 exact document identity 与 monotonic draft revision；成功结果返回 next revision、diagnostics、
  changed stable IDs 和可审查 receipt；
- Director UI、headless automation 和未来 Agent adapter 共享同一 executor。不得增加 string command bus、通用 handler
  registry、任意 callback、跨文档 transaction 或直接 `FilePort` 访问。

### M3 — Interactive Director R1 Mod

- 以 literal dynamic import 延迟加载 first-party Director Mod；复用公共 Mod acknowledged successor 与现有
  Authoring Host，不恢复旧 Studio rail、五 workspace shell、WindowManager 或 node-graph editor；
- 提供紧凑的结构列表/只读 flow、当前 block 属性、Scene/Cue/appearance 编辑、diagnostics、source escape hatch 和
  detached Stage/Narrative preview；V1 不把它包装成完整剧情文本 IDE；
- load/unload/reload 的候选失败保留 predecessor；卸载已发布 UI 后等待 Mod resource handle，但保留当前 draft、
  history、selection 和 GameSession；重新加载后恢复同一 document session；
- 开发 build 是正控制；普通 production final graph 结构排除 Director、loader、Authoring Host、source IO、operation
  UI 和 authoring-only CSS。产品只有显式选择才可随发行物包含这组工具。

### M4 — 旗舰迁移、产品验收与收口

- One Last Sound Check 全量消费新作者源并删除被替代的 TS 文档；Template 保持 code-first、无 Director/Mod 的完整
  structural negative control；
- 固定 receipt 证明迁移前后 compiled IDs、两条 named simulations、Save/replay、History、Stage presentation 和
  locale text resolution 等价；不得靠 compatibility reader 掩盖差异；
- Browser 至少完成一次真实 `edit -> preview -> undo -> redo -> save -> reload`，以及 stale CAS 保留 draft、
  discard、Director load/unload/reload、detached preview 不改变 authoritative digest；
- 分别验证开发正控制与普通 production exclusion，运行 focused unit/property、VN product E2E/build、docs build、
  `deno task check`、React Doctor 分类和 `git diff --check`；
- 收口审查重复 admission、第二 authority、无依据 count/byte cap、render/command 热路径 lookup、未等待 resource、
  双轨 source 与旧 Studio 实现残留。全部完成后才更新 live features 并关闭本计划。

## 5. 本计划明确不做

- 新的 Ren'Py gameplay/runtime 能力：NVL、气泡、多角色同时对话、side image、Screen Language/Action/Value、ATL、
  camera、复杂 transform、video、Live2D、model displayable、复杂粒子、Gallery、Music Room、Scene Replay、
  Achievement、翻译提取、self-voicing、Launcher；它们以后按独立真实产品价值立项；
- Ren'Py/Python/Screen Language/ATL parser、Displayable object model、任意表达式解释器或另一套 Save format；
- 通用 Project Symbol Graph、全局 safe rename、任意 TypeScript AST writer、跨文档事务、持久化 operation log；
- 通用 Editor SDK、workspace/layout DSL、Editor Context/service locator、公共 operation handler registry；
- Cordis 复审、第二套 lifecycle、重新定义 R0–R3、public marketplace/discovery/runtime npm 或任意 post-release code；
- 真实 LLM/Agent backend、Agent persistence、Desktop production promotion 或 SillyOS 工作。

## 6. 停止条件

命中以下任一条件时停止当前切片，记录证据并另行裁决，不扩大本计划：

- 保存作者文档要求重写任意 TypeScript/函数或引入解释器；
- 无法保持现有 compiler、runtime、Save/replay 或 stable interaction identity；
- 一个正确修改必须原子写入 VN、Text 与 Scene 多个 source authority；
- 实现需要通用 service locator、Editor registry、第二 document/session authority 或直接写 live GameSession；
- 新的 Ren'Py 运行能力成为 Director 纵切的前置条件。
