<!-- SPDX-License-Identifier: MIT -->

# Electronic Pet product and authoring ledger

状态：**M1–M2 已实现，M3 已开始；完整 Reference Product 仍为 WIP。** Primary baseline 是仓库内的
[`docs/game/electronic-pet.md`](../../docs/game/electronic-pet.md)，不是任何第三方应用。

## Semantic coverage

| Area                     | Baseline                                                                    | Current implementation/evidence             | Intentional difference or open work                    |
| ------------------------ | --------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| 新领养到成为家人         | 五段可观察进展                                                              | M3 已可跨 visit 到达 bonded                 | 成为家人的完整内容宽度仍开放                           |
| 信赖 × 心情              | 正交规则与可解释恢复                                                        | M3 完成 trusting、bonded 与腹部边界纵向切片 | 其余后期反馈仍开放                                     |
| 自主行为                 | 至少 16 个，含驻留、打断与重复抑制                                          | M3 完成 9/16 个及 9 个表现映射              | M3 完成 16 个与内容打磨                                |
| 互动                     | 八类主要互动、腹部邀请与边界反馈                                            | M3 完成脸、颈、背、腹部 4/8 类              | 尾根明确 defer；M3 完成其余互动                        |
| 玩具与照料               | 三种玩具、喂食、梳理、共同游戏                                              | M3 已完成首个背部梳理闭环                   | 另外两种玩具仍开放                                     |
| 3D 表现                  | 房间、rigged cat、动画与响应式质量档位                                      | M3 首个视觉/宽窄屏构图切片已完成            | 最终猫、房间细节与动画仍开放；不建设通用 3D engine     |
| 作者工作流               | Object 到代码/资源/互动/source 可定位，人类与 Agent 共用 operation/CAS/undo | M1 作者闭环已完成                           | 不要求无代码开发                                       |
| Save/recovery/offline    | 独立 Save floor、有限离线结算与回归摘要                                     | M2 完成 Save/reopen/reset 与摘要            | M5 完成完整 recovery/release 证据                      |
| i18n/audio/accessibility | 中英文本、音频、普通 DOM UI 的键盘与无障碍语义                              | 尚未实现                                    | M3–M4 完成                                             |
| Browser/Desktop          | Browser 产品与当前 Deno Desktop static preview                              | 工程外壳已声明                              | 不声明 Desktop HMR、durability 或 production promotion |

完成状态只能由完整产品分母和独立审查决定；一个漂亮的 3D 纵向切片不能关闭上表。

## Single-authority bindings

每个作者对象使用稳定 `objectId`，并由唯一作者文档追踪 renderer/model node、asset/clip、behavior
owner、interaction、source location 和 diagnostics。authoring compiler 生成 runtime direct plan；runtime
不解析 raw source，消费该计划与唯一 product-local binding table。Inspector 不直接写 gameplay State，renderer
不把权威值镜像进另一套 React store。

M1 的真实压力已由产品本地 3D authoring companion 关闭：它在现有 Authoring Host 内表达 Three objects、
bone/socket 和 raycast volume，没有复制 Host/session/source IO。M2 又增加一个产品私有、只读的同页 runtime
publisher，Inspector 可显示权威 activity reason、mood、needs 与关系摘要，但没有 gameplay write authority；
独立 Inspector 没有同页 Player 时保持 detached。两者都不是 public 3D/Inspector ABI，也没有引入万能
component registry、Prefab/Blueprint 或通用 3D framework。

## Target and performance ledger

直接抚摸的目标输入是 mouse pointer 与 touch；不提供键盘/手柄替代动作，普通 DOM UI 仍保持平台原生键盘与
无障碍语义。逗猫棒同样只接受 primary mouse/touch pointer，取消按钮只结束当前回合，不是键盘玩法替代。
布局覆盖主流宽屏、窄屏和高 DPR。M1 记录 startup/first
interactive、initial graph/assets、frame time、Long Tasks、heap、DPR/quality 与 hidden/idle frame loop 原始
测量。预算在真实 3D baseline 后冻结，不把一台机器的结果写成普适 promotion 阈值，也不在测量前添加
Worker、LRU/prefetch 或新 Host seam。

### M1 raw evidence（2026-08-27）

- 环境：macOS arm64、Deno 2.9.5、V8 15.0、Chromium 151；数字来自 dirty checkout，只用于后续同环境趋势对比；
- release graph：全部文件 `1,889,922 B raw / 488,877 B gzip`；全部 JavaScript
  `1,774,232 / 459,270 B`；runtime assets `87,939 / 23,184 B`；Inspector/source writer、Agent/RPC、
  DevDock/settings 与 Mod/Extension runtime 均未进入普通 Player graph；
- 删除键盘替代按钮后，M1 场景在真实鼠标/触控手势前没有普通 DOM action，通用 startup benchmark 的
  first-interactive selector 不再适用。此前基于该按钮的 GUI readiness / first-interactive 数字已作废；
  M2 已出现真实产品控件，新测量见下节；不为 benchmark 改造产品；
- headed 1280×800 / requested DPR 2：balanced 档实际 canvas 1920×1200；一次动画交互 frame interval
  P50/P95 `8.3/9.0 ms`，callback duration P50/P95 `0.7/1.0 ms`，Long Task 0，JS heap used
  `12,541,516 B`；可见静止和动画完成后均无持续 RAF；
- 自动 runner 的第二页没有让被测页进入 `hidden`，故不提供伪造的 hidden RAF 数字；M4 在代表性真实浏览器/
  设备上复验后台行为。现有 runtime 采用 Three `Timer` 与 demand-driven RAF，而不是永久 animation loop；
- 输入修正后的 focused product journey 为 Chromium `5/5`、WebKit `4/5 + 1 skipped`；WebKit 跳过项仅因
  Playwright 没有 native touch-drag injection。输入修正前的完整 Examples matrix `76 passed / 2 skipped`
  只保留为历史证据。

这组 raw measurements 没有触发 Worker、LRU/prefetch、通用 renderer framework 或新 Host seam。

### M2 implementation boundary

- `game/` 的唯一 State owner 保存 trust、mood、needs、activity/pose、invitation、跨会话 evidence 与最多八条
  recent memory；pointer 轨迹、Three objects 和动画仍留在 presentation；
- 到家流程在四项 home readiness 后先进入观察，再通过明确的安静陪伴/低频时间结算进入主动靠近和闻手邀请；
  日常关系只吸收跨会话、多样且不可重复刷取的证据；
- 8 个自主行为各有最短停留、跨 need 打断、近期重复抑制、确定性随机选择和 Inspector reason；同一 urgent
  activity 不在停留期内自我重选，自然到期只 O(1) 结算一次直接结果；4 个 outcome class 各有独立的
  product-local reaction mapping；
- 已实现喂食、闻手、脸/颈/背抚摸与一个逗猫棒回合。Tail-root 只保留高差异设计政策，当前没有 authored、
  runtime 或 rule surface；腹部、梳理、其余玩具和更深反馈属于 M3；
- Save/reopen、reset、一次 O(1) 有界离线结算和回归摘要复用现有引擎合同；没有逐分钟 replay；
- 规则继续是普通 TypeScript 与现有 transactional RNG，没有 behavior tree、scheduler、gesture DSL、通用 3D
  framework 或第二份 gameplay store。

### M2 raw evidence（2026-08-27）

- 同一 dirty checkout / macOS arm64 / Deno 2.9.5 / Chromium 151 的三次 release startup samples：GUI
  readiness `113.6 / 87.4 / 84.3 ms`，first interactive `113.7 / 87.5 / 84.4 ms`；
- release graph：全部文件 `1,944,631 B raw / 505,003 B gzip`，全部 JavaScript
  `1,822,096 / 473,759 B`，runtime assets `87,935 / 23,182 B`；
- 产品 Vitest `11 files / 66 tests`；Browser Chromium `10/10`、WebKit `9 passed / 1 skipped`；完整
  `deno task check` 为 `390` 个 Vitest 文件、`5,475` 项测试与 `6` 项 composition-state workload，随后全部
  application checks 与 E2E build 通过；
- 这些数字只用于同环境趋势。M2 没有因包体或启动结果增加 Worker、prefetch/cache framework、通用 3D
  renderer 层或 promotion threshold。

### M3 trust and grooming slice（2026-08-27）

- `trusting` 现在由真实产品旅程到达：形成日常后，猫在后续主动靠近中发出头部接触邀请；只有当前邀请与
  activity occurrence 同时匹配且真实接触被接受时，才会按 visit 记一次响应证据。建立信任还要求跨 visit 的
  两次邀请响应、共同游戏和已发现偏好；重复同一 visit、`tolerate`、stale invitation/activity 均不能刷取进展；
- Scene 作者数据新增可见的梳子对象与绑定到猫背的 grooming interaction volume。两者复用既有 Scene
  compiler、Inspector、operation/CAS/undo 和 runtime binding，不增加通用 tool manager、gesture DSL、Scene
  kind 或 public engine API；Inspector 可从对象追到 interaction kind、action 和 behavior owner；
- 玩家取得信任后可用普通 DOM 控件拿起梳子。工具选择和原始轨迹只属于当前 renderer，会在 Save/reload 后
  回到手部模式；mouse/touch 继续共用 raycast、局部轨迹累计和 pointer-up 单次语义提交，短拖、取消、空白或
  不可达目标均零提交；
- 权威侧使用独立的 `pet.groom_complete` 边界，按 current activity、目标、姿态、信赖、心情、偏好、
  毛流方向、速度、时长与近期梳理求值。接受后只写一次 `relationship.first_grooming` 与现有有界 care memory，
  不新增可重复刷取的梳理计数；Save/reload 保留 trusting、事实和最近结果；
- 本切片没有加入音频，也没有关闭 bonded、腹部邀请、另外两种玩具、剩余行为/反应、i18n、设置、相册或完整
  M3。产品 Vitest、Chromium/WebKit 全旅程与最终仓库验证以本次提交记录为准。

### M3 belly boundary slice（2026-08-27）

- 新增第 9 个自主行为 `belly_expose` 与独立姿态 `supine_relaxed`。姿态只开放脸、颈和腹部目标；露腹表示
  脆弱姿态，不自动生成授权。只有已经 `bonded`、心情为 calm/social 且产品偏好允许时，后续新 activity
  occurrence 才会生成一次当前 `belly_offer`，成为 bonded 的同一次露腹不会追溯获得邀请；
- `bonded` 是真实可达且单调的权威阶段：已经 `trusting`、完成首次梳理，并在两个不同 visit 中于 warning
  前主动停止腹部试探。`newcomer` / `familiar` 的同类触碰只得到防备反馈，不预存成长证据；重复同 visit、
  warning 后才停手或继续越过警告也不刷取关系证据；
- warning window 只由当前 pointer gesture 的两个 one-shot timer 与瞬时 renderer phase 表达。State/Save
  只接收一次 `completed_before_warning | stopped_before_warning | stopped_in_warning |
  continued_after_warning` 终态；warning 后停手只恢复 calm，不增加关系证据，继续则进入 overstimulated 并
  产生新的 `observe_player` activity occurrence；
- Scene gesture 在 pointer-down 捕获 activity occurrence 与相关 invitation occurrence，pointer-up 不再借用
  最新 publication 的 token。contact、grooming 与 belly 共用这一 currentness 原则，stale successor 在权威
  边界原子拒绝；
- Scene 作者数据新增可由 Inspector 定位和修改的 `cat.belly` socket 与腹部 sphere volume。volume 位于仰卧
  身体的可见区域，不与头颈目标形成不可命中的遮挡；新增产品旅程只覆盖真实 hover、renderer-local warning、
  warning 前停手、跨 visit bonded、明确邀请和慢速短 stroke。既有专项 E2E 继续独立保护
  390×844/1280×800、Save/reload 和 stale activity/invitation 零部分变更；
- 本切片未增加 timer manager、gesture DSL、第二份 gameplay store 或 public engine API，也没有关闭另外两种
  玩具、其余行为/反应、音频、i18n、设置、相册或完整 M3。

## Asset and reference ledger

- `references/Meow-Generator`：研究输入；许可不足以直接复用，生产依赖为零；
- Neko Atsume、Nintendogs、Tamagotchi：仅提供公开行为层 secondary inspiration；
- `assets/models/electronic-pet-cat-m1.glb`：本项目原创生成并按仓库媒体资产规则以 CC0 1.0
  提供；模型由 Three.js r185
  程序化网格、基础材质、简化骨架和关键帧 `Idle` 动画构成，再以 `THREE.GLTFExporter r185`
  导出。它不嵌入第三方模型或贴图，也不要求保留独立生成/provenance 工具链；
- 后续生产模型、贴图和音频必须由项目自有或兼容许可素材补充，并在实际加入时通过普通设计或
  notice 表面记录。
