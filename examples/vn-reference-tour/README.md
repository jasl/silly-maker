<!-- SPDX-License-Identifier: MIT -->

# 《最后一次试音》— VN Reference Tour

状态：**M0 已交付 / WIP。独立 package、产品合同、supported-export 应用外壳和 starter 负能力删除已完成；M1 的
完整剧本、两个 Authoring Scene、作者数据和两条 route simulation 尚未实现。**

M0 已把工程外壳改为本产品身份，但仍保留一套从 tracked Template 来的临时 Story/Scene/media scaffold。
运行它只用于检查接线，不代表《最后一次试音》已经可玩、完成，或已经验证了本产品分母。完整产品合同见
[DESIGN.md](DESIGN.md)。

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

一个开场、一次选择、单路线、单结局或当前 starter scaffold 都只是切片，不能称为产品完成。

## M0 工程命令

从本目录运行：

```sh
deno task format:check
deno task app check .
deno task test
deno task dev
deno task build:web
```

这些命令当前只检查 scaffold 与 M0 package/identity/boundary；在 M1–M4 对应 evidence 关闭前，不得把 green run 报告为
产品剧情、路线、媒体、Save 或发布完成。

## 作者地图

以下是 M1 起的唯一 owner 目标；不存在的文件表示尚未实现，不是另找位置写入的许可。

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
reference-only outer UI 与临时 Story identity，不保留 compatibility alias 或零值模块。M1 将用冻结的完整产品
剧情、场景与媒体替换当前 temporary scaffold 内容。

本产品不建立 Ren'Py DSL/Save compatibility、自定义解释器、公共 VN skin、Blueprint、最终编辑器、Mod/Agent、
特殊 pending 或 Desktop HMR。`NarrativeAside` 不是 denominator；只有完整剧本自然需要时才可选择最多一处。

## Authoring 与验证

M1 完成两个 Authoring Scene 后，dev-only Inspector 应使用真实 Scene/CAS owner 完成选择、有限属性编辑、
Motion facet/scrub、undo/redo 和保存。普通 Player final graph 必须排除 Inspector 与 source writer。

Named simulations 固定为：

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
