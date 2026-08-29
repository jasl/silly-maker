# VN Genre Mod、History Mod 与作者工作流计划

状态：**2026-08-29 经所有者接受并完成 M0–M4，已关闭。**

[Production-floor sequence](2026-07-30-production-floor-sequence.md) 是唯一跨计划排序入口。本计划接续已完成的
[《最后一次试音》历史产品计划](2026-08-27-vn-reference-tour.md)，拥有本轮 first-party VN 共用层、首个真实
optional presentation Mod 和 VN 作者工作流的实现与验收。它不重新打开产品内容分母，也不建设 Ren'Py
解释器、公共 Mod 商店或最终编辑器。

## 1. 已接受决策

- **产品参考收口：** Bookshop 退役；`examples/vn-last-sound-check`（**One Last Sound Check / 最后一次试音**）
  是唯一维护中的 VN 产品参考。新项目仍从 `template/` 开始，不复制旗舰产品。
- **first-party VN Genre Mod：** 通用的 interaction document、编译和运行策略进入 focused first-party VN
  package；Base 继续拥有确定性 Narrative/State/Save 合同，UI 继续拥有 React/Managed Surface 原语，产品只保留
  自己的 predicate/effect、内容、State 和特殊表面。Template 与 One Last Sound Check 必须消费同一共用层，
  不保留两份近似 narrative kit/runtime。
- **History 是第一个真实 optional VN Mod：** authoritative Narrative History 仍由 Story State/Save 拥有；
  Mod 只拥有 History renderer、入口控制、CSS 和相关表现资源。选择或省略 History 不改变 Snapshot、Save、
  replay 或 gameplay identity。
- **动态装卸按 authority 执行：** 开发环境可以通过完整 generation successor 延迟加载、卸载和重新加载已选择的
  presentation/tooling Mod；R1 保留 GameSession，影响 Simulation/State/Save 的变化仍走 R2 exact Save + lease
  handoff。卸载保证 publication、listener、资源 handle 和 lifecycle owner 退出，不声称清除浏览器 ESM/CSS cache。
- **production 由产品选择：** 产品可以把同一受支持扩展面显式包含在 production build，也可以完全结构排除；
  默认产品没有自动的 post-release install 能力。本轮不交付 public resolver/ABI/SDK/distribution、目录扫描、
  marketplace、远端 executable 或不可信代码 sandbox。
- **一个作者权威：** 人类 Inspector、未来游戏专属 editor contribution 与 Agent 使用同一 structured authoring
  operation/result、document revision 和 CAS 路径；它们不直接写源文件、不持有第二个 Scene/Narrative compiler，
  也不经 service locator 获得 Host/Session/Save。

## 2. 分层

```text
@sillymaker/base
  Narrative / interaction / State / Save / replay primitives

@sillymaker/vn
  first-party VN interaction document + compiler/runtime policy
  + focused React composition entries
  + optional History presentation Mod

@sillymaker/ui
  Managed Narrative Surface, Stage/Input and reusable player primitives

Application
  product State, predicates/effects, content, theme, special surfaces
  + explicit Mod selection and production policy
```

`@sillymaker/vn` 不导入 private Mod Runtime，也不成为 service container。应用 adapter 持有 literal loader、
selection controller 和 publication acknowledgement；热路径继续消费 cold-compiled direct plan，不做动态 lookup。

## 3. 里程碑与验收

### M0 — 产品切换与历史清理

- 原子重命名产品目录、application ID、任务、网站与 E2E；
- 删除 Bookshop package、route、workspace/build/test 责任；历史计划中的当时事实保留，仅在 current docs 标明后续裁决；
- 不保留旧 application ID、route 或 compatibility alias。

### M1 — first-party VN 共用层

- 提取 generic、JSON-safe interaction document、编译器和 deterministic runtime policy；
- 产品通过 typed callbacks 提供自己的 predicate/effect，不引入字符串 command bus、`unknown` cast 或万能 context；
- Template 与 One Last Sound Check 的脚本、模拟、Save/replay 结果保持各自合同等价；删除被替代的 product-local 实现。

### M2 — optional History Mod

- History implementation 是 literal dynamic import 的独立 chunk；首次选择才加载；
- selection successor 候选失败保留 predecessor，React commit acknowledgement 后才退休旧 owner；
- unload-to-null 先关闭已打开的 History surface，再等待资源释放；重复 load/unload 不建立第二个 backlog 或 input owner；
- full preset、动态产品和无 History build 共用一个 Narrative authority；无 History final graph 不包含 renderer、入口、CSS、
  loader 或 private controller。

### M3 — VN Inspector 与共同作者操作

- One Last Sound Check 提供一个真实、dev-only、只读的 VN Inspector contribution，把当前 Scene/Object 映射到
  已编译 node/block、route、cue、text/voice binding，以及 Scene source/JSON pointer、文本 pack 和 voice binding
  等稳定 source reference；它不重新编译 Narrative，也不建立 Narrative/Text writer；
- Scene 的可写修改只能通过现有 revision-fenced structured Scene operation/CAS/history；人类和 Agent 共用同一
  operation envelope 与 receipt。打开剧本、文本 pack 或 voice binding 是显式的开发期 source escape hatch，
  不是绕过 CAS 的第二条 in-engine 写入路径；
- ordinary Player 与未选择该 contribution 的 Template 结构排除 Inspector、source writer 和 Agent/RPC。

### M4 — 验证与收口

- focused compiler/runtime、History selection/lifecycle、Inspector contribution 和 build-graph tests；
- One Last Sound Check 的 named simulations、Browser VN interaction、production build 与静态 Desktop smoke；
- `deno task check`、`git diff --check`，再做一次重复 admission、无依据 count/byte cap、热路径 lookup、隐式 ownership
  和旧实现残留审查；
- 只有上述证据完成后才能把本计划标为关闭并更新 `features.md` 的 live capability。

## 4. 明确后续（不属于本轮）

后续以 One Last Sound Check 和真实商业移植作为压力源，按真实需求分别立项：

- 更完整的剧情控制流；
- NVL、气泡、多角色同时对话与 side image；
- Screen Language 对应的 typed React screen/component composition，以及明确的 Action/Value 合同；
- ATL/camera、复杂 layer/image transform；
- video、Live2D、model displayable 与复杂粒子 adapter；
- Gallery、Music Room、Scene Replay 与 Achievement；
- 翻译提取、字体/图片翻译与 self-voicing；
- Launcher、Interactive Director 与脚本导航。

这些能力追求覆盖成熟 VN 工作流和默认体验，但以 React、CSS、TypeScript、现有 Semantic Stage、Code Surface、
authoring document 和 structured operation 原生实现。不得复制 Ren'Py parser、Python Store、Screen Language/ATL
语法、Displayable object model 或 Save format，也不得为一次性对照建立第二套运行时。

## 5. 关闭记录（2026-08-29）

- M0 原子退役 Bookshop，并把维护中的旗舰及其 application ID、workspace、网站、命令与 E2E 收口为
  `examples/vn-last-sound-check`；旧名只保留在明确的历史记录中，没有 compatibility alias。
- M1 交付 `@sillymaker/vn/interaction` 的 JSON-safe interaction document、一次 admission、cold compiler 和
  direct runtime plan。2026-08-30 的合并后收口又把两套已漂移的 Base NarrativeGraph control-flow 投影提升为
  同一 entry 的 `projectVnNarrativeGraphV1`；它统一持有 hold reroute/expiry successors 与 text/stage dependencies，
  产品只补 asset/source metadata。Template 与 One Last Sound Check 共同消费该层；产品本地代码只保留
  predicates、effects 与产品词汇适配。100-node 顺序脚本与真实 pure-cycle cases 证明没有人为节点上限或热路径动态 lookup。
- M2 交付首个真实 optional VN Mod：开发图通过 literal dynamic import 选择 History presentation，候选经 React
  commit acknowledgement 后替换 predecessor，卸载先关闭当前 History child 并等待 async handle disposal；
  authoritative History State 保留。core-only final receipt 结构排除 renderer、CSS、loader 与 private Mod runtime，
  production full preset 则由产品静态选择 History。
- M3 交付 One Last Sound Check 的 dev-only、只读 VN Inspector binding/source projection，并与现有 Scene
  structured operation、revision/CAS/history 写权威共存；ordinary Player 与 Template 排除 Inspector、source writer
  和 Agent/RPC。本轮没有虚构 Narrative/Text writer。
- M4 验证关闭：最终 `deno task check` 通过；聚焦 Project CLI 35/35 通过；One Last Sound Check Chromium 为
  19 passed / 1 skipped，WebKit 加 mobile-portrait 为 21 passed / 1 skipped；`archive-voice`、`present-voice` 两条
  named simulation、release build、prebuilt smoke 与文档 build 均通过。Deno 2.9.6 的 Darwin Desktop 输出后缀
  边界经真实失败修正后，静态 package 报告 `ok: true`，并通过 Computer Use 启动到可操作标题界面、窗口正常关闭。
  最终 `git diff --check` 与独立边界/热路径复审均无阻塞项。

代表性真实 current-low-end 设备资格仍按所有者此前裁决未执行、未通过，因此不形成低端设备支持声明。本计划只关闭
first-party VN 共用层、History presentation 的开发期动态装卸/生产选择与 VN 作者溯源纵切；它不激活公共 Mod
生态、任意 post-release code install、Desktop production promotion 或 §4 的 Ren'Py 后续能力。
