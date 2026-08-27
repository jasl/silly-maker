<!-- SPDX-License-Identifier: MIT -->

# 《最后一次试音》— VN Reference Tour

状态：**M0–M1 已交付 / WIP。独立 package、产品合同、supported-export 应用外壳、starter 负能力删除、完整
双路线剧本、两个 Authoring Scene、作者数据和两条 named headless route simulation 已完成；M2 下一步。**

M1 已用本产品的完整 Story/Scene author data 原子替换 tracked Template 的临时内容；它关闭的是作者数据与
headless routes，不是 VN Player、最终视觉/音频、Save/recovery 或产品验收。《最后一次试音》仍不是可玩产品
参考或旗舰。完整产品合同见 [DESIGN.md](DESIGN.md)。

## 产品目标

山顶社区电台将在清晨关闭旧发射机。档案馆只留下一个接收窗口，值班播音员林澄与技术员周遥必须选择发送
周遥的旧台呼，或录制林澄代表“此刻”的新台呼。选择会改变发送的声音、后续 route 和最终入档结果。

冻结 denominator：

- 59 个唯一可见 text entries，任一路线 44 个；
- 2 名有姓名的角色 + narrator；每名角色 2 种 appearance；
- 2 个 Authoring Scene；
- 1 个具有真实后果的 choice、2 条专属 route、2 个 ending；
- cue Motion、crossfade、ambient、frame blink、`setAppearance`、skippable `hold`；
- BGM、ambient、SFX、current voice/replay；
- zh-CN/en addressable text、完整 Player/Save/recovery、responsive Input、accessibility 与作者任务。

一个开场、一次选择、单路线、单结局或只有 headless author data 都只是切片，不能称为产品完成。

## 当前工程命令

从本目录运行：

```sh
deno task format:check
deno task app check .
deno task test
deno task app simulate . --scenario archive-voice
deno task app simulate . --scenario present-voice
deno task dev
deno task build:web
```

这些命令的 M1 green run 只证明完整 author data、两条 deterministic headless routes 与当前项目接线；在 M2–M4
对应 evidence 关闭前，不得把它报告为 VN Player、最终媒体、Save/recovery 或发布完成。M1 关闭时 focused tests、
两条 simulation、`app check`、product build、asset/determinism checks、React Doctor 与串行 repository check 均通过。

## 作者地图

以下是当前及后续里程碑的唯一 owner；尚未进入 M2/M3 的文件不是另找位置写入的许可。

| 想修改什么                                 | 唯一 owner                                    |
| ------------------------------------------ | --------------------------------------------- |
| 剧情控制、stable text ID、choice/branch    | `src/story/narrative.ts`                      |
| zh-CN/en 台词、旁白、选项                  | `assets/content/*.text-pack.json`             |
| locale/pack topology                       | `src/content/text-content.ts`                 |
| 控制室构图、对象、cue、Motion refs         | `src/scenes/control-room/`                    |
| 屋顶构图、对象、cue、Motion refs           | `src/scenes/rooftop-antenna/`                 |
| resident UI copy、Stage/transition catalog | `src/content/presentation.ts`                 |
| audio manifest 与 intent/effect mapping    | `src/content/audio.ts`                        |
| VN skin 与 passive Narrative renderer      | `src/application/ui.tsx`                      |
| product composition wiring                 | `src/application/composition.tsx`（Advanced） |
| Inspector、Flow、named simulations         | `src/tooling/`                                |
| 页面标题、说明与主题色                     | `metadata.json`                               |

普通剧情/文案/场景/素材修改不应要求理解 Session、Persistence 或 Host 组装。Application wiring 是 Advanced
层，不能保存剧情 copy、场景 placement 或 gameplay rule。

## 身份与边界

- application ID：`example-vn-reference-tour`
- package：`@sillymaker/story-example-vn-reference-tour`
- Story ID：`story.example.vn-reference-tour`
- stable ID prefix：`vn-reference-tour`；Story/Scene/text/asset/action ID 一律 lower-case kebab-case
- 默认 locale：`zh-CN`，完整 `en` variant
- targets：Browser publish + 当前 Deno Desktop static preview

产品从 Template 起步，但不 import Template、Bookshop 或其他 example。M0 已删除 coins/inventory/HUD action、
reference-only outer UI 与临时 Story identity，不保留 compatibility alias 或零值模块。M1 已用冻结的完整产品
剧情、两个场景与兼容 placeholder presentation 替换 temporary author scaffold；最终媒体和 VN Player 留给 M2。

本产品不建立 Ren'Py DSL/Save compatibility、自定义解释器、公共 VN skin、Blueprint、最终编辑器、Mod/Agent、
特殊 pending 或 Desktop HMR。`NarrativeAside` 不是 denominator；只有完整剧本自然需要时才可选择最多一处。

## Authoring 与验证

M1 的两个 Authoring Scene 已接入 dev-only Inspector 的真实 Scene/CAS owner，用于选择、有限属性编辑、Motion
facet/scrub、undo/redo 和保存。普通 Player final graph 必须继续排除 Inspector 与 source writer。

M1 named simulations 固定并实现为：

```text
archive-voice
present-voice
```

完整关闭还需要 Chromium/WebKit 产品旅程、Save/reopen、zh/en overflow、360×640、1280×720、200% zoom、
reduced motion、默认静音、accessibility、Browser build/publish、Desktop static preview、raw budgets，以及人类和
Agent 使用同一 authoring/CAS 路径的接手任务。

## 许可

产品代码与原创文本采用 MIT。图片、字体、音乐、环境声、SFX 与 voice 只使用项目原创、明确兼容许可或合法
生成的表达，并保留相应 notice。不得复制 Ren'Py、Bookshop、Template 或第三方 VN 的文案、角色、素材、录音
和品牌。
