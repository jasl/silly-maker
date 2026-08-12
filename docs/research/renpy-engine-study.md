# Ren'Py engine capability study

状态：技术研究记录。本文不是 SillyMaker 的实现合同。

## 1. Reference and implementation boundary

本文通过 Ren'Py 的公开文档和源码观察成熟 Visual Novel 引擎需要解决的问题。SillyMaker 的产品合同、类型、命名、数据模型、代码、测试和交互均独立设计；本文不转录实现代码、独特数据结构或大段原文。

主要观察区域包括：

- `sphinx/source/displaying_images.rst`、`renpy/display/scenelists.py`：图层、稳定 image tag、show/replace/hide、z-order 和 camera/layer transform；
- `sphinx/source/transitions.rst`、`renpy/display/transition.py`：旧画面到新画面的转场、按层作用和交互生命周期；
- `sphinx/source/transforms.rst`、`renpy/atl.py`：顺序、并行、插值、等待、事件和可组合演出；
- `sphinx/source/audio.rst`、`sphinx/source/voice.rst`、`renpy/audio/**`：音频 channel、队列、淡入淡出、语音和台词生命周期；
- `sphinx/source/save_load_rollback.rst`、`renpy/rollback.py`：交互边界、保存、历史状态和玩家回滚；
- `renpy/display/predict.py`、Screen 与 lint 相关文档：素材预测、UI 生命周期、静态检查和作者工具。

这些路径只是技术定位，不是 SillyMaker 的运行时依赖。

## 2. Current SillyMaker baseline

SillyMaker 已经拥有 Ren'Py 不替代的核心优势：

- 普通 TypeScript 的静态 Story 和 GameplayModule 组合；
- 单一权威 `GameSession`、不可变 `GameSnapshot` 和原子 command attempt；
- 可序列化 RNG、Save、Replay、DebugBundle 和语义自动化；
- Simulation、SemanticPublication、RuntimePresentationPublication 与 React renderer 的明确分离；
- 浏览器优先但可 headless 的 Host 边界。

现有 Narrative 也已经能表达 line、narration、choice、condition、check、command、checkpoint、jump、call、return、stage cue 和 end。当前主要缺口不是另一种叙事脚本语言，而是这些语义没有被完整投影为可保存、可调试、可跳过的 VN 演出运行时。

## 3. Capability mapping

| 成熟 VN 引擎解决的问题                             | SillyMaker 当前状态                                                             | 独立吸收方向                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 图层和稳定标签让人物替换、隐藏与移动保持连续       | 当前 Stage 主要是 scene/variant/background/layout；人物姿势多为静态投影         | 引入可序列化 `SemanticStageState`、Layer、稳定 Tag 和显式 `StageMutation`                         |
| 转场比较旧画面与目标画面，并具有持续时间和中断语义 | 当前主要依赖 React remount 和固定 CSS opacity                                   | 建立 previous/target 双快照、Presentation Clock、完成/取消/跳过及 reduced-motion 语义             |
| 台词、选择、暂停和画面等待形成明确交互边界         | 当前 PoC Narrative 会 yield，但没有通用、可观察的 Presentation interaction 合同 | 建立可保存的 `PendingInteraction`，通过 semantic command 解决，而不是等待 React Promise           |
| 连续音频、一次性音效和语音有不同恢复规则           | 当前资产只覆盖图片，Web Host 没有音频协调层                                     | 保存音频意图，Host 按 channel 对账；连续 channel 可恢复，一次性 SFX 默认不在 load 后重放          |
| 历史、已读、自动、跳过和回滚是不同的玩家系统       | CommandLog/Debug replay 已有，但不是玩家 backlog 或 rollback                    | 独立建模 history、seen 与 playback policy；以后基于 GameSnapshot checkpoint 设计 bounded rollback |
| 预测和 lint 在运行前发现缺失引用并减少卡顿         | 当前只按一次 projection 的精确资产需求加载                                      | 对 TS Narrative IR 做有预算、无副作用的控制流预测，输出结构化引用和素材诊断                       |
| 强演出语言能组合顺序、并行、插值和事件             | 当前只有简单 cue 标识，没有通用播放内核                                         | 后续提供强类型 TypeScript Timeline/Cue API，不实现 ATL 语法兼容                                   |
| Screen/Launcher/Inspector 改善内容生产效率         | 当前 DevDock 偏运行时调试，缺少 Story graph 和场景预览                          | 先扩展 inspector、graph、preview、timeline debugging，再依据真实需求发展可视化编辑器              |

## 4. Ideas deliberately not copied

SillyMaker 不采用下列实现方式：

- Ren'Py DSL、ATL 或 Screen Language 的语法、解析器和兼容层；
- Python global Store、Python object graph/pickle Save 和可回滚容器替换；
- Ren'Py Displayable/widget tree 作为 React UI 的第二套组件系统；
- 任意回调、表达式或动态 eval 作为 Story 数据；
- 复制 Ren'Py 的 mutation-log rollback、源码布局、命名体系或存档格式。

Story、Module、UI 和 Hotfix 使用 TypeScript/JavaScript。SillyMaker 不额外提供不可信脚本安全沙箱；官方兼容性只覆盖公开引擎接口，直接操作宿主全局对象属于调用方风险。

## 5. Recommended adoption sequence

1. 建立独立 E2E Story 和 Headless/Browser 一致性验证，先固定 SillyMaker 自己的观察面。
2. 实现 SemanticStageState、Layer/Tag、StageMutation 和 previous/target Transition。
3. 建立 PendingInteraction、演出生命周期和稳定 Save/load 恢复。
4. 增加音频意图、Web audio host、语音与玩家播放策略。
5. 增加 Narrative lint、素材预测和可观察的 presentation diagnostics。
6. 在真实垂直切片上增加强类型 Timeline、受约束 Presentation Scene Graph 和开发工具。
7. 最后基于不可变 Snapshot 和 hard barrier 评估玩家 rollback；不以调试重放代替它。

正式目标合同见 [VN presentation runtime design](../engine/design/vn-presentation-runtime.md)，长期顺序见 [SillyMaker roadmap](../engine/roadmap.md)。
