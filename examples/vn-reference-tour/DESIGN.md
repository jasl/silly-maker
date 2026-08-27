<!-- SPDX-License-Identifier: MIT -->

# 《最后一次试音》产品合同

状态：**M0–M3 已交付 / WIP；M4 尚未关闭。2026-08-27 冻结产品分母并交付完整双路线作者数据；M2
交付并选择引擎维护的 focused default VN Player：responsive 对话/选择 chrome、say-only 全画布点击推进、
History/播放控制、贴底布局、Ctrl/Tab/H/V 与鼠标中键、最终 Stage/ending 媒体、冻结的八项音频分母、
current-voice replay、voice-aware Auto、interaction-level Back/Forward 和产品矩阵。M3 已交付产品入口、
默认 VN system menu、quick/manual/import/export、完整最小 Settings/live locale，以及分层的
Save/recovery/hidden/close/reload/restart 证据。M4 已完成 ambient binding/phase 的 Agent Inspector/CAS 接手，
以及 workstation Browser/build、Desktop static preview、无障碍、自动化无声和 raw performance 证据；
人类接手、代表性 current-low-end qualification、独立审查与 Starter feedback 仍未关闭。**

M1 已用本产品完整 Story/Scene author data 原子替换 tracked Template 的临时内容，但只关闭 author data 与
headless routes。M2 已有 Player、Stage 媒体、ending、音频、Back/Forward 与完整矩阵；M3 已关闭产品入口、
Save/recovery 与 Settings。M4 产品验收仍未完成，当前 WIP 不是完整产品参考或旗舰。实施顺序由
[VN Reference Tour plan](../../docs/engine/plans/2026-08-27-vn-reference-tour.md) 拥有。

## 1. 身份与产品命题

| 项目           | 冻结值                                                       |
| -------------- | ------------------------------------------------------------ |
| 产品标题       | 《最后一次试音》 / _One Last Sound Check_                    |
| application ID | `example-vn-reference-tour`                                  |
| package        | `@sillymaker/story-example-vn-reference-tour`                |
| Story ID       | `story.example.vn-reference-tour`                            |
| ID prefix      | `vn-reference-tour`；持久/作者 ID 一律 lower-case kebab-case |
| 默认 locale    | `zh-CN`，完整 `en` variant，显式 fallback 到 `zh-CN`         |
| 目标时长       | 任一路线首次游玩约 10–14 分钟                                |
| 目标平台       | Browser 独立 build/publish；当前 Deno Desktop static preview |

山顶社区电台将在清晨关闭旧发射机。档案馆只留下一个 60 秒接收窗口，值班播音员林澄与技术员周遥必须选择：

- 发送周遥多年前录制、刚修复完成的旧台呼；
- 或由林澄录制一段代表“此刻”的新台呼。

窗口只能使用一次。选择会改变实际发送的语音、权威 route、后续对白和最终入档结果；两条路线都合理，不设
隐藏的正确答案。本产品是原创、独立、内聚的小型 Visual Novel，不复制 Ren'Py Quickstart、Bookshop、
Template 或其他作品的剧情、角色、文案、素材与品牌。

## 2. 角色、场景与作者对象

### 2.1 角色

| Character ID                       | 角色             | 剧情职责                         | 冻结 appearances      |
| ---------------------------------- | ---------------- | -------------------------------- | --------------------- |
| `character.vn-reference-tour.lin`  | 林澄 / Lin Cheng | 值班播音员，提出录制当下的新台呼 | `focused`, `relieved` |
| `character.vn-reference-tour.zhou` | 周遥 / Zhou Yao  | 技术员与档案交接人，持有旧录音   | `neutral`, `soft`     |
| `null`                             | narrator         | 只描述时间、空间与可观察环境     | 不适用                |

角色 appearance 是 Scene/content declaration；具体剧情时刻的 `setAppearance` 仍由 Story 拥有。不得把人物
心情另存为 React state 或从 sprite 文件名反推权威剧情状态。

### 2.2 两个 Authoring Scene

| Scene ID                                  | 场景       | 主要 authored objects                                  | 剧情职责                                 |
| ----------------------------------------- | ---------- | ------------------------------------------------------ | ---------------------------------------- |
| `scene.vn-reference-tour.control-room`    | 夜间控制室 | 话筒、磁带机、调音台、信号灯、挂钟、窗外微光、两名角色 | 开机、试听、说明一次窗口、选择与发送     |
| `scene.vn-reference-tour.rooftop-antenna` | 清晨屋顶   | 天线、摆动电缆、总闸、状态灯、天色、两名角色           | 关闭发射机并确认 route-specific 入档结果 |

Scene document 是 Layer/Object 顺序、transform、默认 appearance、cue 与 presence-bound ambient reference 的
唯一 authority。Story 只引用 scene/cue ID 与中段 `setAppearance`；React/CSS 不复制站位，GLTF/SVG node 名不
成为剧情或 Save identity。

## 3. 剧本分母与路线

产品固定 **59 个唯一可见 text entries**。任一路线首次游玩可见 **44 个**；Title/Save/Settings 等系统 UI
文案不计入 59。每个 `say` 页面允许一至两句短句，不能用空白、重复台词或不可达文本凑数。

| 章节                    | Scene        | 内容                               | entries |
| ----------------------- | ------------ | ---------------------------------- | ------: |
| `shared.power-on`       | control room | 开机、林澄入场、说明最后一班值守   |       9 |
| `shared.old-recording`  | control room | 试听旧台呼，确认它是周遥早年的录音 |       9 |
| `shared.one-window`     | control room | 档案窗口、两种方案及无法兼得的原因 |       8 |
| `decision.signal`       | control room | 1 条 prompt + 2 个 option labels   |       3 |
| `route.archive.prepare` | control room | 整理旧录音并发送                   |       6 |
| `route.archive.roof`    | rooftop      | 关闭发射机，确认旧声音入档         |       8 |
| `ending.archive`        | ending       | “旧声入档”结局标题                 |       1 |
| `route.present.prepare` | control room | 林澄录制并发送新台呼               |       6 |
| `route.present.roof`    | rooftop      | 关闭发射机，确认当下声音入档       |       8 |
| `ending.present`        | ending       | “此刻入档”结局标题                 |       1 |
| **总计**                |              |                                    |  **59** |

唯一 material choice 是：

```text
档案窗口只剩一次
  -> 发送修复后的旧台呼   -> signalChoice = "archive" -> 旧声入档
  -> 录下此刻的新台呼     -> signalChoice = "present" -> 此刻入档
```

选择由一个 occurrence-fenced semantic command 原子写入：

```text
signalChoice: null | "archive" | "present"
```

Story 以普通 `branch` 读取该值。结局由 route/cursor 推导，不再保存第二个 `ending` 字段。两条路线分别拥有
15 个专属 entries、专属发送音频和专属结局；换一句尾声、换色或共享同一结果不能算双路线。

M1 named simulations 固定为 `archive-voice` 与 `present-voice`。一个漂亮开场、一次选择、单路线或单结局都
只是纵向切片，不能满足产品分母。

## 4. Presentation、Motion、Audio 与文本

| 能力                      | 自然剧情落点                         | Owner                                 |
| ------------------------- | ------------------------------------ | ------------------------------------- |
| cue-bound entrance Motion | 林澄进入控制室                       | control-room Scene + Motion source    |
| frame-based blink         | 一名在场角色的 presence-bound blink  | Scene appearance/frame set + Motion   |
| `setAppearance`           | 发送完成后切换 `relieved` / `soft`   | Story                                 |
| skippable `hold`          | 发射后等待 carrier lock，约 1.2 秒   | Story authoritative time              |
| background crossfade      | 控制室切到清晨屋顶                   | Stage transition catalog              |
| ambient Motion            | 屋顶电缆轻微摆动                     | rooftop Scene + Motion source         |
| BGM                       | `music.vn-reference-tour.last-shift` | audio manifest + authoritative intent |
| ambient                   | `radio-hum` → `rooftop-wind`         | audio manifest + authoritative intent |
| SFX                       | 磁带仓、话筒开关、发射继电器         | transient committed effects           |
| current voice             | 周遥旧台呼 / 林澄新台呼              | route-specific voice intent/replay    |

基线不选择 `NarrativeAside`。若完整剧本评审确认 carrier lock 后的一小段环境/内心旁白自然改善节奏，最多加入
一处 committed-event-derived、零权威 Aside；省略不影响分母或 milestone closure。

文本分为三个 addressable packs：

- `text.vn-reference-tour.shared`：26 条 shared narrative + 3 条 choice 文案；
- `text.vn-reference-tour.route.archive`：15 条旧台呼路线文案；
- `text.vn-reference-tour.route.present`：15 条新台呼路线文案。

每个 pack 均提供完整 `zh-CN` / `en` variant。稳定 text ID 和剧情控制在 Story；可见 copy 只在 text packs；
resident system copy 留在 product content。未选择 route 的 pack 不进入 initial JavaScript，也不因一个 UI-local
loader 建立第二套 readiness authority。

## 5. Authority 与工程 locality

目标文件组织：

```text
src/
  story/narrative.ts              # 唯一剧情控制、稳定 text ID、choice/branch
  scenes/control-room/            # Authoring Scene、cue 与 Motion
  scenes/rooftop-antenna/         # Authoring Scene、cue 与 Motion
  content/text-content.ts         # locale/pack manifest
  content/presentation.ts         # resident UI copy、Stage/transition catalog
  content/audio.ts                # audio manifest 与 intent/effect mapping
  game/                            # 最小 narrative/signalChoice/stage/audio authority
  ui/stage-renderers.tsx          # Stage catalog 选择的纯 renderer
  application/ui.tsx              # 仅在需要产品 HUD/panel/special surface 时存在；当前未创建
  application/composition.tsx     # 选择 default VN Player、映射 label text IDs，其余只接线
  tooling/                        # Inspector binding、Flow、named simulations
assets/
  content/                        # zh-CN/en text packs
  images/                         # 原创或兼容许可视觉素材
  audio/                          # BGM/ambient/SFX/voice
```

默认 VN chrome、History/播放控制、全画布推进和 Ctrl/Tab/H 输入由
`@sillymaker/ui/narrative-player` 唯一维护；产品不复制 passive Narrative renderer。产品可以通过公开 CSS
变量换肤，确实需要结构性差异时整体 eject/replace，但不能并挂第二个 writer。

| 数据                                                         | 唯一 authority                       | 不得复制到                          |
| ------------------------------------------------------------ | ------------------------------------ | ----------------------------------- |
| route、pending、history、Stage、audio intent                 | authoritative Story State            | React state、CSS、Inspector draft   |
| scene hierarchy、placement、默认 appearance、cue/Motion refs | Authoring Scene/Motion data          | Story 常量、renderer transforms     |
| narrative copy                                               | locale-addressable text packs        | Story、TSX、Scene JSON              |
| resident UI copy、catalog binding                            | `content/`                           | scattered component literals        |
| typewriter、transition progress、hover/focus、媒体对象       | composition/renderer transient state | State、Save、replay                 |
| text speed、auto wait、volume/mute、locale                   | Host Profile                         | Game Save                           |
| Inspector/Flow                                               | dev-only projection                  | Player final graph、gameplay writer |

M0 已删除 starter coins/inventory/HUD action、reference-only outer UI 与临时 Story identity，而不是保留零值模块、
compatibility alias 或双轨实现。Story、Scene、text、asset 与 action IDs 使用 lower-case kebab-case；只有
TypeScript symbols 使用 `vnReferenceTour` / `VnReferenceTour` camel/Pascal case。

## 6. Save、Playback 与恢复

产品完成时必须覆盖：

- autosave、`resumeFromAutosave`、quick/manual Save/load 与 import/export；
- mid-line、mid-choice、mid-hold reopen；
- History、current-voice replay、normal/auto/skip-read 与 Player rollback；
- rollback 到 choice 前时，`signalChoice`、Stage 和 audio intent 一起恢复；
- hidden 不把后台经过时间计入 authoritative hold；恢复后从同一已提交 remainder 继续；
- explicit/normal application disposal、已完成 autosave 的 Browser reload，以及 return-to-title/restart 后恢复同一
  可观察 route、Stage、History、hold remainder 与 continuous audio intent；
- Browser `pagehide` 会同步 fence 并 best-effort flush，但浏览器不保证等待异步 IndexedDB 写入；强制关闭只能恢复
  最近一次已经持久化的 autosave。具备 awaitable close receipt 的 Host 才能承诺最后一刻 exact flush。

Save 只保存稳定语义，不保存 typewriter cursor、transition/frame progress、电缆摆动相位、focus/hover 或正在播放
的 Web Audio object。本产品建立自己的首个 Save floor；不接收 Cat Cafe/Bookshop/Template Save，不建设跨产品
migration 或通用兼容框架。

## 7. Target uplift、Input、Accessibility 与预算

支持 wide/narrow Browser、鼠标、触控和键盘；普通 DOM 控件保持原生语义。最低自动验收包括 360×640、
1280×720、200% zoom/reflow、reduced motion、键盘焦点、screen-reader labels 和自动化运行默认无声。产品
Player 默认非静音，mute 是可持久化的用户偏好；游戏手柄不是本产品输入分母。

Player 采用通用 VN 行为：`Enter` / `Space` 与 say-only 全画布点按均为 reveal-first/再推进；`Tab` 切换持续
skip-read，按住左右 `Ctrl` 只在本次按键周期临时 skip-read。`H` 先停止有效 Auto/Skip，再进入模态隐藏；
已经签发的自动推进必须在可见界面中收敛，只有 normal mode 的稳定 Say 才真正隐藏。这里的 normal 是
package-private Player 在既有 semantic advance 提交或退出后才发布的停止确认，不是 UI 延时推断。隐藏层截获 `Ctrl` /
`Tab`，`H` / `Enter` / `Space` / 点按只恢复界面而不推进或自动重启播放。Choice 与未读台词
默认停止 Skip，Auto 不随机选择 Choice。播放器按钮、Choice 与 History 必须截获自身输入，不得穿透到推进层。
显式映射只占用未修饰的 `Tab`；`Shift+Tab` 从 gameplay scope 进入播放控件，控件内保留原生焦点顺序，
`Escape` 返回 gameplay scope。
这组可观察语义参考本地 `references/renpy` 的成熟约定，但产品不复制其代码、素材、品牌或运行时结构。
Ren'Py 会保留隐藏前的 AFM/Skip preference；本轮产品 UI 无权读取 private Skip 的来源模式，因此明确采用
隐藏即安全停止、恢复后由用户重新选择播放模式的较小语义，避免以双 toggle 推断私有状态。

Ren'Py 源码审计冻结以下通用 VN 检查表；它是产品行为清单，不是引入 Ren'Py runtime 或 DSL：

| 通用约定                                                                                       | 本产品归属与当前状态            |
| ---------------------------------------------------------------------------------------------- | ------------------------------- |
| 左键 / Enter / Space 第一次完成逐字显示、第二次推进；Choice 只接受选项输入                     | M2 第一切片已实现               |
| Ctrl 按住临时 skip-read、松开停止；Tab 切换持续 Skip；未读和 Choice 默认中止                   | M2 第一切片已实现               |
| Auto 与 Skip 正交；延时随文本与揭示进度，有语音时等待当前语音；普通 Choice 不自动选择          | 文本与当前语音等待已实现        |
| H / 鼠标中键在已签发推进可见收敛、播放停止后模态隐藏；恢复不推进且不自动重启播放               | M2 已实现                       |
| 对话层全宽贴底、说话人位于框内、播放控制不挤占正文；窄屏增加高度和点击目标                     | M2 已实现并完成 zoom/touch 证据 |
| History 保留说话人与台词；当前语音可重放                                                       | History 与当前语音重放已实现    |
| PageUp / 滚轮向上回到上一交互；回退后 PageDown / 滚轮向下沿已执行结果前进                      | M2 Back/Forward 切片已实现      |
| Escape / 右键打开菜单；快速栏提供 Back、History、Skip、Auto、Save、Q.Save、Q.Load、Preferences | M3 已实现并完成产品旅程证据     |

Back/Forward 使用 Core 的单一 bounded Snapshot timeline，而不是 VN 自建历史栈。普通 interaction resolution
建立 checkpoint；hold 的 `time_tick` 与 scene repair 是 transparent，presentation-barrier acknowledgement 也不
增加玩家停靠点；begin-story/不可逆结算形成 barrier。Back 保留 exact 已执行 Snapshot 作为 Forward 后缀，新的
commit 会丢弃该后缀。两方向导航都会提升 presentation epoch 并重新投影 Stage、pending、History、RNG 与 audio
intent；Seen/Profile 和一次性 SFX 不回滚。Say/Choice 使用同一组可用性驱动控件，PageUp/PageDown 与滚轮复用
Input Router；ending 的 Back 也调用同一个 port。

M4 在记录设备类别、浏览器、构建和环境的前提下输出 raw measurements；不做跨项目排名或机器身份门禁。
冻结产品预算如下：

| 指标                                |                                  current-low-end 产品预算 |
| ----------------------------------- | --------------------------------------------------------: |
| cold GUI ready                      |                                                   ≤ 2.5 s |
| first interactive                   |                                                   ≤ 3.5 s |
| initial JavaScript                  |                                            ≤ 450 KiB gzip |
| initial CSS                         |                                             ≤ 60 KiB gzip |
| initial media transfer              |                                                 ≤ 2.5 MiB |
| product-owned interaction Long Task |                         单次 < 100 ms；正常操作不连续出现 |
| animation                           | 主流设备 60 fps target；current-low-end 稳定 30 fps floor |
| live heap after one route           |                    ≤ 128 MiB；回到 Title 后无持续单调增长 |
| complete distributable media        |                                                  ≤ 20 MiB |

未选择 route 的媒体/text pack、History UI 和作者工具不得为了方便全部塞入 initial graph。若 M4 的中立测量
证明预算无法达到，必须先分类 product media、recipe/API ergonomics 与可复现 engine gap；不能静默放宽数字。

## 8. Semantic coverage table

M0 冻结 baseline，M1 交付完整 author data/headless routes，M2 交付 Player/媒体/产品矩阵，M3 交付入口、
Save/recovery 与设置；下表明确区分已实现部分与仍需 M4 关闭的产品 evidence。

| Area             | Frozen baseline                                        | Planned implementation/evidence             | Current status / remaining evidence                                                  |
| ---------------- | ------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| 完整短篇         | 59 unique / 44 per route                               | Story graph、pack count、两次完整游玩       | M2 Player 两条路线已实现                                                             |
| 角色             | 2 named + narrator；每人 2 appearances                 | Scene/Stage/Inspector                       | M2 最终视觉与 Player 已实现                                                          |
| 场景             | control room + rooftop                                 | 两个 Authoring Scene、真实 Player/Inspector | M2 真实 Player 已实现                                                                |
| Choice/branch    | 一次不可同时满足的发送选择                             | `signalChoice` + 两个 named simulations     | M1 direct state/headless routes 已实现                                               |
| Endings          | 旧声入档 / 此刻入档                                    | route-specific text、voice、ending          | M2 voice/Player 已实现                                                               |
| Motion           | entrance、crossfade、ambient、frame blink、appearance  | Scene/Motion checks + Browser               | M2 Browser 播放已实现                                                                |
| Hold             | carrier lock                                           | normal/skip/reopen 收敛                     | M3 已用 200ms authoritative quantum、真实 Player partial commit 与 exact reopen 关闭 |
| Audio            | BGM、2 ambient、3 SFX、2 current voices                | manifest、intent/effect、replay、mute       | 八项媒体、intent/effect、replay、voice-aware Auto 与分声道 volume/mute 已实现        |
| Player QoL       | reveal、auto、skip-read、History、rollback             | focused tests + Browser                     | reveal/auto/skip/History、Ctrl/Tab/H/鼠标中键、全画布推进与 Back/Forward 已完成      |
| Save/recovery    | autosave、manual/quick、load、import/export、3 稳定点  | focused + reopen E2E                        | M3 已用 exact product tests 与 Browser journeys 分层关闭；Browser close 保持上述边界 |
| i18n             | 3 packs × zh-CN/en + fallback                          | pack admission、切换、overflow              | M3 已实现 live locale 与 Profile 持久化设置入口                                      |
| Responsive/Input | 360×640 至 1280×720、pointer/touch/keyboard            | Chromium/WebKit journeys                    | M2 完整矩阵已实现                                                                    |
| Accessibility    | focus、labels、200% zoom、reduced motion、silent tests | automated + human review                    | 自动化测试以 0-gain terminal 默认无声；产品默认非静音且 mute 可持久化                |
| Authoring        | 两 Scene 的 object/appearance/Motion 调整              | human + Agent CAS/undo/save tasks           | M4 已交付 ambient binding/phase 与 Agent CAS/undo/save；人类接手仍开放               |
| Targets          | Browser publish + Desktop static preview               | build/prebuilt/preview evidence             | M4 automated evidence 已完成；无 Desktop HMR claim                                   |
| Budgets          | §7 数值                                                | generic raw benchmark + profiling           | M4 workstation raw evidence 全部在预算内；不构成低端设备 qualification               |

## 9. 明确非目标与完成边界

本产品不引入 Ren'Py DSL/Save compatibility、自定义解释器、公共 VN framework、Blueprint、最终编辑器、custom
pending、presentation barrier、hold-when、mid-hold/shared input、monitor、hit region、Timeline、产品自定义
WholeCanvas、Content Database、Mod、Agent/RPC、DevDock、Runtime Inspector 或 Desktop HMR。

package-owned Splash/Title、默认 Save/Settings/System hosts 和 dev-only Inspector 属于选择的现有路径，不代表
产品建立第二个 surface/authority。若剧情自然需要新增能力，先修改本 denominator 并说明用户价值；“引擎已经
有”不是选择理由。

M0–M3 已交付 package/identity、负能力删除、完整 author data/headless routes、VN Player/媒体与产品矩阵，
以及入口、Save/recovery/settings。M4 正在完成作者任务和产品证据；M5 才可将产品提升为旗舰。Bookshop 保持到 VN
完成，其后教学角色另行评审，本计划不预裁删除。

## 10. 许可与素材

产品代码与原创文本采用 MIT。图片、字体、音乐、环境声、SFX 和 voice 必须是项目原创、明确兼容许可或合法
生成的表达，并随包保留所需 notice。当前 BGM、ambient 与 SFX 是项目用 FFmpeg 9.0.1 程序化生成的原创音频；
两段 voice 使用 Apache-2.0 的 Kokoro 82M v1.1-zh 生成，未分发模型、工具链或第三方录音。不得复制 Ren'Py、
Bookshop、Template 或第三方 VN 的文案、角色、构图、录音、素材与品牌；参考产品只能用于行为层研究。
