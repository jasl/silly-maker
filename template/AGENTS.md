# template/ 代理手册

本包是**新游戏的起点骨架**（MIT）。开新故事的流程：复制本目录到 `examples/<新名字>`（或独立目录）→ 全局改名（`template`/`Template` → 新名）→ 在根 `project.config.ts` 注册应用与 simulate 目标 → 改 `metadata.json`（网页标题/分享卡片）→ 按需改剧本与模块。

改动纪律：保持最小可玩。占位剧本可整体替换；不要往骨架上加新玩法结构（那属于示例或真实游戏）。

## 引擎基线（免费获得，不用自己写）

声明 `titleScreen`（标题/背景图/可选 `splash` 片头行）即得完整前门：片头 → 标题屏（新游戏/继续/载入存档/设置）。系统菜单是单模态（保存与设置互斥，Esc 关闭）；存档对话框自带槽位列表、时间戳、导入导出与"载入即进游戏"。设置页出厂含三条音量（BGM/语音/音效）、静音、文字速度、自动播放停留、全屏与开发者工具开关——偏好都存 Host profile，跨存档持久。

## 可选接线（一项一个入口，示例见 cat-cafe）

- **网页元数据**：`metadata.json`（标题/描述/分享卡/favicon），构建时注入 `<head>`。
- **声音**：`resolveAudioManifestV1` 声明音频资产（digest 必填）→ 视图投影 `AudioIntentV1`（bgm/ambient/voice，读档即还原）→ UI 挂 `GameAudioV1`（one-shot SFX 用 `resolveEffectAsset` 映射瞬态效果）。
- **对话播放 QoL**：`createTextRevealV1`（打字机）+ `createPlaybackControllerV1`（自动/快进）+ 权威 `NarrativeHistory` 渲染历史面板；已读进度经 `profile.markSeen` 持久。
- **玩家回退**：core 定义加 `rollback: { capacity, classify }`（结算/不可逆命令标 `"barrier"`），UI 用 `instance.rollback`（available/toPrevious/subscribe）。
- **存档安全点**：web 定义加 `saveGuard(publication)`，对话或战斗中禁手动存档并给出原因文本。
- **舞台命中区域**：内容目录声明 `hitRegions`，`SemanticStageV1` 传 `onHitRegionActivate`。
- **内容表**：`defineContentTable` + `createContentDatabase`——静态定义进表（解析期校验），可变状态进模块。

## 剧本/文本任务（最常见）

改哪个文件：台词与界面文案 → `src/presentation.ts`（textId 目录）；剧情节点/分支/舞台指令 → `src/narrative.ts`；舞台渲染器 → `src/application/web-application.tsx` 的 `*StageRenderersV1`。

动手前先列节点序列表（每个 say/choice 边界一个 occurrence 编号，从 1 起），场景脚本（`src/tooling/simulation-target.ts`）与测试一次写对。

每次修改后的验证环（秒级）：

```sh
deno task typecheck
deno run -A npm:vitest run <本包目录>
deno task story simulate <appId> --scenario <name>
```

规则速记：

- 新 say/choice 必须用全新 `definitionId`（`interaction.<story>.<name>`），不复用。
- `stage` 节点的 `mayShow` 如实列出可能展示的 contentId；`branch` 的 `choose` 必须落在 `successors` 内（有测试盯守）。
- 新增舞台内容三处接线：narrative 的 contentId 常量、presentation 的内容目录、web-application 的渲染器。
- 可保存状态只放整数（`scalePermille` 这类逻辑单位），浮点会被 canonical JSON 拒绝。
- 空舞台上首次放内容用 `show`；`replace` 只用于已在台上的内容。

## 模块/状态任务

四个接线点：`state.ts`（接口 + schema + 初始值）→ `simulation.ts`（模块 owner + 命令）→ `application/semantic.ts`（动作目录 + blockedBy）→ `story.ts`（manifest 条目，模块 id 按字典序）。版本同步表与常见诊断速查见 `docs/engine/authoring-quickstart.md`，不要凭记忆改 revision。

## 禁区

- 只 import `@sillymaker/*` 包出口；绝不 import 引擎 `src/**` 路径、绝不 import 另一个 Story。
- 引擎行为疑问读 `docs/engine/features.md`，不要读引擎源码猜。
- 不要为通过测试而放宽断言语义；occurrence 断言失配时按失败信息更新编号。
