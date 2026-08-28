<!-- SPDX-License-Identifier: MIT -->

# 《最后一次试音》— VN Reference Tour

状态：**M0–M3 已交付 / WIP；M4 进行中。独立 package、完整双路线作者数据与 simulation、
引擎维护的 default VN Player、最终 Stage/ending 媒体、冻结的八项音频分母、interaction-level
Back/Forward、responsive/input/accessibility 产品矩阵、system menu/Save、持久设置/live locale 与分层恢复
矩阵均已完成。Browser 强制关闭只恢复最后已经持久化的 autosave；M4 workstation 自动化产品证据与
所有者授权的 Computer Use-assisted author handoff 已完成，代表性 current-low-end qualification、独立审查与
Starter feedback 仍未完成。**

M1 已用本产品的完整 Story/Scene author data 原子替换 tracked Template 的临时内容；M2 已交付 Player、
Stage 媒体、结局、音频、Back/Forward 与完整响应式/无障碍矩阵；M3 已关闭产品入口、Save/recovery 与设置。
《最后一次试音》仍不是完整产品参考或旗舰。完整产品合同见 [DESIGN.md](DESIGN.md)。

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

当前 Player 操作：鼠标/触控点按画面或按 `Enter` / `Space` 先完成逐字显示、再推进；`Tab` 切换持续
skip-read，按住 `Ctrl` 临时 skip-read。`H` 或鼠标中键会先停止正在生效的 Auto/Skip，再进入模态隐藏；若自动推进已经
签发，它会在界面仍可见时完成，隐藏只从稳定的新台词开始。隐藏后按 `H`、鼠标中键、`Enter`、`Space` 或点按画面只
恢复界面、不推进，且不会自动重启播放模式。快进默认遇未读台词或 Choice
停止，Auto 与 Skip 保持为两个独立模式。`Shift+Tab` 从 gameplay scope 进入播放控件，控件内 `Tab` / `Shift+Tab`
保留原生焦点次序，`Escape` 返回 gameplay scope。`PageUp` / 滚轮向上回到上一交互，回退后可用 `PageDown` /
滚轮向下沿 exact 已执行 Snapshot 前进；Say/Choice 的“回退”“前进”按钮使用同一 port。新的剧情提交会丢弃
Forward 后缀，hold tick 不会成为额外的玩家停靠点。
当前有语音的台词可用“语音”按钮或 `V` 重放；Auto 的文本等待到期后仍会等待当前语音自然结束。浏览器拒绝
自动播放或媒体不可解码时只降级为静音，不阻塞剧情。

这些命令的 green run 证明当前 author data、两条 deterministic headless routes 与 Player 接线；M3 的
Save/recovery 还由 focused reopen tests 与 Browser journeys 分层证明。M4 evidence 关闭前，不得把它报告为
完整产品或发布完成。

## 作者地图

以下是当前及后续里程碑的唯一 owner；尚未进入后续 M4 切片的文件不是另找位置写入的许可。

| 想修改什么                                 | 唯一 owner                                    |
| ------------------------------------------ | --------------------------------------------- |
| 剧情控制、stable text ID、choice/branch    | `src/story/narrative.ts`                      |
| zh-CN/en 台词、旁白、选项                  | `assets/content/*.text-pack.json`             |
| locale/pack topology                       | `src/content/text-content.ts`                 |
| 控制室构图、对象、cue、Motion refs         | `src/scenes/control-room/`                    |
| 屋顶构图、对象、cue、Motion refs           | `src/scenes/rooftop-antenna/`                 |
| resident UI copy、Stage/transition catalog | `src/content/presentation.ts`                 |
| audio manifest 与 intent/effect mapping    | `src/content/audio.ts`                        |
| default VN Player、输入与 focus            | `@sillymaker/ui/narrative-player`             |
| Player 文案映射与产品接线                  | `src/application/composition.tsx`（Advanced） |
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
剧情、两个场景与兼容 placeholder presentation 替换 temporary author scaffold；M2 已关闭 focused default VN
Player、最终 Stage/ending 媒体、音频和产品矩阵；M3 已关闭产品入口、Save/recovery 与 settings。

本产品不建立 Ren'Py DSL/Save compatibility、自定义解释器、broad VN framework、Blueprint、最终编辑器、
production gameplay Mod/public Mod ecosystem、Agent/RPC、特殊 pending 或产品自有 Desktop HMR。
`NarrativeAside` 不是 denominator；只有完整剧本自然需要时才可选择最多一处。

## Authoring 与验证

两个 Authoring Scene 已接入 dev-only Inspector 的真实 Scene/CAS owner，用于选择、有限属性编辑、
`visual.ambient` Motion reference/phase 调整、Motion/Timeline scrub、undo/redo 和保存。Motion document、cue
transition 与其他 binding 仍是只读 facet。普通 Player final graph 必须继续排除 Inspector 与 source writer。
Vite development 会自动显示一个可拖动、四角吸附的半透明开发工具面板；“打开内嵌制作”和“调试”共享位置，
常驻代码只负责这个轻量入口。首次点击“调试”才加载并展开完整 DevDock 菜单/window host；选择具体工具后
菜单自动收起且不再遮挡工具窗口，接管后拖动入口也会更新窗口级联角落，工具 body 仍在首次打开时加载。
Debug chunk 加载失败只显示局部提示，游戏继续运行并可显式重新加载恢复。制作动作沿独立入口在首次点击时加载并挂载同一
Authoring Host。这个 development-only composition 不重复产品 Settings，并与 Inspector/source writer 一起从
production build 排除；若制作与调试都不可用，整个面板不渲染。VN 不再为证明生命周期而伪造游戏专用工具
Mod；private build-known Mod successor 由中立引擎合同验证，等待真实可选产品模块消费。

M1 named simulations 固定并实现为：

```text
archive-voice
present-voice
```

M4 自动化证据已覆盖 Browser build/publish、Deno Desktop static preview、raw profiling，以及默认把真实音频图
接到 0-gain terminal 的无声测试运行；产品本身默认非静音，mute 仍是持久化用户偏好。所有者授权的
Computer Use-assisted participant 已沿同一 authoring/CAS 路径把 ambient phase 从 350ms 调整到 400ms，完成
undo、redo、保存和刷新后复核。完整产品关闭仍需要 current-low-end qualification、独立 product/engine review
与 Starter feedback 裁决。

## 许可

产品代码与原创文本采用 MIT。图片、字体、音乐、环境声、SFX 与 voice 只使用项目原创、明确兼容许可或合法
生成的表达，并保留相应 notice。当前 BGM、ambient 与 SFX 是项目用 FFmpeg 9.0.1 程序化生成的原创音频；两段
voice 使用 Apache-2.0 的 Kokoro 82M v1.1-zh 生成，未随产品分发模型、工具链或第三方录音。不得复制 Ren'Py、
Bookshop、Template 或第三方 VN 的文案、角色、素材、录音和品牌。
