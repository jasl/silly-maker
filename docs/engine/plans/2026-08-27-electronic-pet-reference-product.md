# Electronic Pet Reference Product 实施计划

状态：**2026-08-27 经所有者接受；M0–M2 已实现，M3 已开始，产品仍为 WIP，M4–M5 尚未开始。**

[Production-floor sequence](2026-07-30-production-floor-sequence.md) 是唯一跨计划排序入口。本计划是
Neutral GUI Host 关闭后所有者显式选择的唯一 Reference Product 车道，不是 broad engine lane。产品合同见
[Electronic Pet Reference Product](../../game/electronic-pet.md)。

当前 Cat Cafe 继续作为旗舰和维护中的 Save/browser 产品证据，电子宠物以独立 WIP 应用并行实现。只有新产品
完成完整分母、作者工作流、产品证据和独立审查后，才执行一次 Cat Cafe retirement cutover。不得在 Cat Cafe
package 内原地改造成另一个产品，也不得以旧产品 Save 兼容层把两种完全不同的 State 身份粘在一起。

Deno Desktop adapter 继续 package-private、explicit、default-off；stable source/behavior revalidation、
maintained Desktop HMR 与 production promotion 保持独立。本产品可以使用 Browser 和现有 static Desktop
preview，不领取这些条件车道。

## 1. 产品分母、参考与许可边界

本产品是原创的长期状态虚拟伴侣。Primary baseline 是
[产品合同](../../game/electronic-pet.md)，不是某个第三方 application 或参考目录。Neko Atsume、Nintendogs、
Tamagotchi 等只是公开行为层的 secondary inspiration；`references/Meow-Generator` 只提供未跟踪研究输入，
其许可不满足本仓库直接复用要求，生产源码、素材、fixture、generator、测试、构建和命名均不得依赖或复制它。

M0 冻结的最小完整分母包括：新领养到成为家人的五段可观察进展、信赖与心情正交规则、姿态/邀请/偏好/手势/
近期记忆共同求值、完整腹部互动、八类主要互动、三种玩具、至少十六个自主行为、二十个反应片段、有限离线
推进、Save/recovery、照片/记忆、中英文本、音频与 Browser/Deno Desktop target uplift。实现可以增加内容和
打磨，但不得在开发中缩减这些内容来获得“完成”。

产品的 semantic coverage table 在 WIP README/DESIGN 中维护，至少覆盖：领养早/中/后期、信赖阶段、心情、
自主行为、每类互动的接受/警告/拒绝、玩具、照料、离线回归、Save/recovery、设置、输入、响应式、i18n、音频、
accessibility、作者任务和发布路径。它不是 exact source/file/DOM/asset inventory。

## 2. 接受的架构与玩法边界

### 2.1 权威规则

- 一个 Game Session/State/Save/replay authority 拥有 trust、mood、needs、activity/pose、当前 invitation、
  semantic recent memory、preferences 和 progression facts；
- renderer 拥有 Three scene objects、骨骼、raycast、pointer trajectory、动画 blend、粒子、音频播放和瞬时物理；
- Host 提供已 admission 的 wall-time sample、storage 和平台资源；离线进展通过一个有界产品 command 解析式
  结算，不逐分钟 replay，也不直接在 reducer 中读取墙钟；
- 鼠标/触控直接抚摸汇入同一个 semantic action owner。连续 gesture 在表现层聚合，结束时提交一次
  occurrence/invitation-fenced 语义结果；输入设备来源和原始轨迹不进入 State/Save。键盘继续服务普通 DOM UI，
  不模拟抚摸，手柄不属于本产品输入分母；
- trust 是慢速关系轴，mood 是短期意愿轴。高 trust 不覆盖当前拒绝，低 trust 也不禁止好奇或远距离游戏；
- interaction evaluation 使用产品合同定义的固定顺序和五类结果，不建立通用 rule engine、behavior tree VM
  或组合矩阵；
- mood 变化必须有明确原因和恢复路径；activity 在低频语义结算点读取 needs/mood/trust/environment/
  preferences/recent behavior，并声明最短停留、可打断条件与近期重复抑制。重要转换先给玩家可读前兆，且不
  强迫输入。

### 2.2 3D 与 React integration

- 从成熟 Three/React/Web 生态依赖开始；产品本地拥有 renderer、asset/clip mapping、raycast 和质量档位；
- 现有 Code Surface 可以承载 3D canvas，但一个 opaque component 只证明 runtime integration，不能完成作者
  工作流；
- 不扩张现有 2D Motion 为通用 3D animation system，不把引擎 Stage transform 偷换成部分 3D contract；
- 第一轮只表达一间房、一只猫、一个玩具和一个 bone/socket-attached interaction volume，先找到最小可维护
  作者边界；
- 只有产品内真实证据显示同一 SillyMaker-specific integration 边界有独立维护价值，才考虑未来 `contrib`
  package；本计划不预建 renderer/physics framework。

### 2.3 人类、Agent 与 Inspector

一个可创作属性只有一个作者 authority。Scene/Object authoring data、GLTF import mapping、TypeScript behavior
owner、React renderer state 和 authoritative gameplay State 不得保存彼此冲突的同一值。

每个作者对象拥有 stable `objectId`，并能追踪到 renderer/model node、资源/clip、behavior owner、interaction、
source location 与 diagnostics。人类和 Agent 使用同一 authoring document、structured operations、CAS、
undo/redo 和 compiler diagnostics；Agent 不生成 Inspector 无法理解的隐藏表示，Inspector 也不成为第二个
Game Session writer。

M1 已证明现有通用 2D Inspector 不应扩张成通用 3D framework；产品改用现有 Authoring Host 的
workspace-private companion 表达猫、玩具、camera/light、骨骼挂点和三维互动区，并复用同一个
document/session/operation/CAS owner。M2 的产品私有只读 publisher 再把当前 gameplay explanation 提供给同页
Inspector。这里没有 public 3D/Inspector ABI，也不能用 `appearance` 字符串、内部 import 或复制
Host/session/source IO 绕过。

## 3. M0–M5 顺序

### M0 — 产品合同与并行边界（已完成）

- 在 `docs/game/electronic-pet.md` 冻结原创 product intent、参考/许可边界、信赖 × 心情规则、互动求值、完整
  内容分母、Object/代码/Inspector 验收、性能策略和非目标；
- 本计划冻结实现顺序、engine-gap protocol、Cat Cafe 接替矩阵与 retirement gate；
- production-floor、roadmap、AGENTS 与 game index 指向本活动车道；Cat Cafe 在并行期间仍是当前旗舰；
- 不创建应用代码、兼容 wrapper、通用 3D proposal、Prefab/Blueprint、benchmark framework 或新治理系统。

### M1 — 3D runtime 与作者闭环（2026-08-27 已完成）

- 从当时 tracked `template/` 创建独立 `examples/electronic-pet` WIP package，先删除未选择的能力；每个 example
  独立拥有 config、source、assets、tests、README/DESIGN 和 build；
- 使用项目自有/兼容许可的一只 rigged cat、一个房间和一个玩具，接入成熟 Three/React 依赖；建立产品本地
  scene/object declaration、GLTF node/bone import mapping、asset/clip declaration、renderer direct plan 和明确
  resource disposal；
- 建立一个 bone/socket-attached interaction volume 和一次 gesture aggregation，证明鼠标/触控进入同一个
  semantic result，但本阶段不把漂亮摸猫纵切称为游戏完成；
- 完成第一个作者闭环：Inspector hierarchy 与画布 pick 可定位猫、玩具和 interaction volume；人类可以调整
  transform、camera framing、light、volume/socket 和少量公开材质/动画参数；Agent 用同一 structured
  operation 完成一种修改，人类继续审查、undo、CAS save；
- 产品的 `deno task check` 组合共享 Story `app check` 与产品本地 PetScene compiler，报告
  duplicate/missing/orphan object binding。Player final graph 排除
  Inspector/source-write，runtime 不解析 raw source，只消费 cold-compiled plan 与唯一 product binding table；
- 记录 startup/first interactive、initial graph/assets、frame time、Long Tasks、heap、DPR/quality 和 hidden/idle
  frame-loop baseline。没有测量证据不添加 Worker、LRU/prefetch framework 或新 Host seam；
- 若 supported exports 无法完成作者闭环，先在产品本地复现具体失败，再只为 stable Object ↔ code ↔ source/
  operation 关系接受一个 focused engine correction。M1 在 workaround 移除并复验前不关闭。

M1 closure：

- `examples/electronic-pet` 已成为独立 WIP application。其项目原创 CC0 GLB、房间、玩具、猫骨骼/动画、
  socket-attached interaction volume 和 Three renderer 全部由产品本地拥有；资源只在需要渲染时加载，显式
  释放 geometry/material/texture/skeleton/mixer/listener/observer/renderer，初始化失败也走同一幂等释放路径；
- 一个产品本地 binding table 把 authored object/model/interaction ID 连接到 asset、renderer、semantic action 和
  TypeScript owner。compiler 在 cold path 报告 missing/conflict/orphan binding；runtime 不解析 raw source，消费
  cold-compiled plan 与这张唯一 product-local binding table；
- 产品 `deno task check` 先运行共享 Story check，再执行该 product-local PetScene compiler；根 workspace
  `app check` 不伪称认识这个自定义 source family，也未为单一产品扩展通用 Scene schema；
- 真实 mouse pointer stroke 与 Chromium native touch stroke 汇入同一个 `targetInteractionId` 语义结果并各自
  只提交一次；无位移 tap 不再伪装为 stroke。键盘抚摸入口与无玩法消费的 input `source` 已从 runtime、
  authoritative schema/State、UI 和测试删除；宽窄屏 Browser evidence 通过；
- 产品 3D Inspector 通过现有 Authoring Host 的一个 workspace-private replacement placement 接入，没有复制
  Host/session/source IO。hierarchy、真实画布 pick、transform/camera/light/material/animation/socket/volume 编辑、
  Agent operation、人类 undo/redo 与 raw-byte digest CAS 共用一个 document/session/operation owner；冲突刷新磁盘
  baseline 后保留 draft/history 供明确重试；
- 普通 Player release graph 仍冷编译产品 scene document，但 Inspector、source writer、Authoring companion、
  Agent/RPC、DevDock/settings 与 Mod/Extension runtime module 命中均为 0；未增加 public 3D/Inspector/Mod ABI；
- 2026-08-27 输入合同修正后的 macOS arm64、Deno 2.9.5 原始基线：release 全产物
  `1,889,922 B raw / 488,877 B gzip`，JavaScript `1,774,232 / 459,270 B`，runtime assets
  `87,939 / 23,184 B`。这些是 dirty checkout 上的本机趋势证据，不是跨机器预算；
- 删除键盘替代按钮后，M1 场景在真正的鼠标/触控手势发生前没有普通 DOM action；通用 GUI benchmark 的
  first-interactive selector 因而不再适用。此前 `74.6–93.1 ms` GUI readiness / `835.4–877.2 ms`
  first-interactive 使用了已删除的键盘替代按钮，本计划明确作废而不伪装成当前证据；M2 出现真实产品控件后
  重新测量，不为 benchmark 改造产品或扩建 selector 协议；
- 1280×800、请求 DPR 2 的 headed profile 中，balanced 档 canvas 为 1920×1200（有效 DPR 1.5）；一次动画交互
  RAF interval P50/P95 为 `8.3/9.0 ms`，callback duration P50/P95 为 `0.7/1.0 ms`，Long Task 为 0，
  JS heap used 为 `12,541,516 B`，可见静止及动画结束后的额外 RAF 都为 0。自动 runner 打开第二页后原页仍
  报告 `visible`，因此本轮没有伪称获得 hidden-tab 数字；真实后台切换留给 M4 代表性浏览器/设备复验；
- 输入合同修正后的 focused product Browser evidence 为 Chromium `5/5`、WebKit `4/5 + 1 skipped`；跳过项是
  Playwright 在 WebKit 没有 native touch-drag injection，不是产品失败。输入修正前的完整 Examples matrix
  `76 passed / 2 skipped` 只保留为历史证据，不冒充当前全矩阵结果。M1 没有把这一纵切称为完整游戏，
  Cat Cafe 的旗舰、Save 和发布责任均未改变。

### M2 — 完整权威领养与照料循环（2026-08-27 已实现）

- 建立清晰 locality：`game/`、`content/`、`scenes/home/`、`story/`、`presentation/`、`ui/`、
  `application/` 与 `tooling/`；禁止把产品收口成一个大 TSX 或万能 store；
- 完成到家、第一次靠近、形成日常的前中期流程，以及 trust/mood/needs/activity/invitation/recent-memory 的
  单一 State owner、commands、rules、queries 和 projections；
- 完成喂食、闻手、头脸/背部触摸、一种共同游戏、至少八个自主行为和对应接受/警告/拒绝表现；
- 将直接触摸限定为鼠标/触控：每个小型 authorable interaction volume 可声明一个模型局部
  `preferredStrokeDirection`，Inspector 以箭头显示/编辑；renderer 只在手势结束时提交有界的
  `with-fur | cross-fur | against-fur` 结果。头脸/颈肩使用正向通用先验，背部受偏好修正，尾根作为高个体
  差异敏感区而不是固定奖励；不建立 UV 向量场、毛发模拟、通用 gesture DSL 或逐点 Game command；
- 自主行为选择读取与该 activity 相关的权威 needs/trust、环境与近期行为；互动求值另行读取 mood、trust、
  固定偏好与 gesture quality。两者具备最短停留或明确 currentness、重复抑制和可在 Inspector 解释的原因；
  使用普通 TypeScript 与现有确定性随机源，不新建 behavior tree/DSL/scheduler；
- 完成 Save/reopen、重置、有限离线结算和回归摘要；离线数值有界且可恢复，不因用户离开造成死亡或永久伤害；
- 中期 browser evidence 覆盖 early/middle 状态、stale pose/invitation rejection、gesture single-commit、
  no-partial failure、responsive/input 与 Inspector 不写 gameplay authority。

M2 implementation record：

- 产品按 `game/content/presentation/ui/application/authoring/tooling` locality 拆分；一个 Game Session/State/Save
  owner 持有 trust、mood、needs、activity/pose、invitation、关系 facts/evidence 与有界 recent memory，Player
  只读取 coarse projection；
- 到家阶段完成水、猫砂、藏身处与食物后先进入观察；安静陪伴或下一次低频时间结算确定性进入第一次靠近并
  发出 occurrence-fenced 闻手邀请。跨会话、多样证据建立日常，不能在一次访问中刷取；
- M2 内容宽度是 8/16 个自主行为、脸/颈/背 3/8 类互动、逗猫棒 1/3 种玩具，以及
  `accept | tolerate | warn | refuse` 四类 product-local reaction mapping。Tail-root 的高个体差异政策保留，
  但 authored volume、binding 与 rule 明确 defer，不作为不可达占位内容保留；
- 自主行为使用普通 TypeScript、产品本地静态内容与现有 transactional RNG，拥有最短停留、需求打断、近期
  重复抑制和可解释 reason；同一 urgent activity 不在最短停留内自我重选，不同 urgent need 才可提前打断，
  自然到期只 O(1) 结算一次当前行为（吃饭消费一份食物并缓解饥饿）；没有 behavior tree、VM、scheduler、
  规则 DSL 或通用 gesture framework；
- mouse/touch Pointer Events 是抚摸与逗猫棒的直接玩法输入；轨迹在 presentation 聚合，只有完成的 gesture
  提交一次 direction/speed/duration semantic command。键盘只服务普通 DOM UI，手柄不在产品分母；
- Save/reopen、reset confirmation、一次 O(1) 有界离线结算与回归摘要复用现有 persistence/Host clock，既不
  逐分钟 replay，也不因长时间离开造成死亡或永久伤害；
- 同页嵌入式 Inspector 通过产品私有只读 publisher 显示 activity/reason、pose、mood/cause、needs 与关系
  摘要；它没有 dispatch/write port。独立 Inspector 没有同页 Player 时保持 detached，authoring UI 仍由既有
  Authoring Host/session/operation/CAS owner 管理；没有新增 public Inspector ABI。

M2 closure evidence：

- 产品 Vitest 为 `11 files / 66 tests passed`；focused Browser journey 为 Chromium `10/10`、WebKit
  `9 passed / 1 skipped`。唯一 skip 仍是 Playwright WebKit 不提供 native touch-drag injection；mouse path、
  early/middle progression、stale activity/invitation 原子拒绝、Scene 持续 ready、Save/reopen/reset、响应式、
  Inspector 只读和 authoring operation/undo 不改变 public Game view 均有真实浏览器证据；
- `deno task check` 通过：`390` 个 Vitest 文件、`5,475` 项测试与 `6` 项 composition-state workload，随后
  runtime asset verification、全部 application checks 和 E2E release build 通过；
- dirty checkout、macOS arm64、Deno 2.9.5、Chromium 151 的三次 raw startup samples：GUI readiness
  `113.6 / 87.4 / 84.3 ms`，first interactive `113.7 / 87.5 / 84.4 ms`。这是同机趋势输入，不是预算或
  promotion threshold；
- release graph 为全部文件 `1,944,631 B raw / 505,003 B gzip`，全部 JavaScript
  `1,822,096 / 473,759 B`，runtime assets `87,935 / 23,182 B`。相对 M1，新增权威循环、照料 UI 与只读
  runtime publisher 的增量是全部文件 `+54,709 / +16,126 B`、JavaScript `+47,864 / +14,489 B`；
  authoring UI/source writer、Agent/RPC、DevDock/settings 与 Mod/Extension runtime 仍未进入普通 Player graph；
- React Doctor 扫描 70 个 changed/untracked React/TS 文件。activity 选择循环的重复数组查找已改为一次
  bounded Set；剩余一条 advisory 是产品私有 3D Inspector 的长组件。复核确认其只协调一个 document session、
  一个只读 runtime publication 和一个 CAS writer，当前拆分只会增加 prop plumbing；因此本轮不为消警告引入
  Context、field registry 或 property DSL，待 M3 继续扩展可编辑属性时再按真实增长提取只读说明区或属性面板。

M2 post-closure usability correction（2026-08-27）：

- 真实浏览器复现确认 Three/socket/raycast 在 `familiar / near_player` 下正常；沉默来自 runtime 把所有
  `newcomer` interaction volume 清空，而界面始终提示抚摸。现在 `hidden` 继续不可触摸并显示安家引导；猫已
  可见时，过早触摸提交明确的 `refuse`，但不产生首次接触、信赖或偏好证据，闻手后同一画面路径恢复正常求值；
- Player 的最近互动反馈只投影真实 contact memory，不再把准备清水、食物、安静陪伴或闻手的 `accept` 冒充成
  抚摸结果；照料 UI 按实际 command 显示结果。每个已提交画面手势拥有 presentation-local 的反馈 occurrence，
  相同 outcome 也会重新触发可见提示与 `aria-live` 内容；
- 场景状态、引导和结果浮层不再截获 pointer。轨迹在起始 interaction volume 内达到有效距离后，短暂 ray miss
  或在表面外抬手不会抹掉整次手势，离面段也不会计入分类；信赖阶段改变会清除上一段位移反应，避免新状态仍
  沿用旧命中位置。窄屏把引导与结果移到照料面板之外的场景安全区；
- 当前可达区域的 mouse hover 使用平台原生 `grab`，按下使用 `grabbing`；一个 product-local 圆环直接投影
  同一 local-space gesture accumulator 的有效距离进度，达到阈值前提示继续滑动，达到后提示可松手，短拖
  释放则短暂提示距离不足。Touch 复用按下/进度/结果但没有伪 hover。高频反馈通过按帧合并的 DOM ref 更新，
  不进入 React State、Game command、Save/replay、Scene/Inspector，也没有扩展成引擎 gesture framework；
- `hidden` 仍不开放可提交触摸，但模型在验证级美术中明显可见，静默忽略会与画面冲突。当前可见 authored
  interaction volume 在不可达时提供 product-local `not-allowed` / “还不准备被触碰”反馈；mouse/touch down
  不 capture、不建立 accumulator、不提交 command 或关系证据。空白画面仍是默认指针，可达区域仍走唯一 gesture
  authority；没有 raycast 整个 GLB visual mesh 或建立第二套 hit authority；
- 最终产品复审还关闭了四个可达语义缺口：需求压力按 world-minute crossing 结算，因此分钟级 Host tick 与批量
  settlement 等价；安家完成事实与碗内当前食物分离，最后一份吃完不会把熟悉的猫退回 arrival；HUD/semantic
  action 只暴露当前真实可达的安静陪伴与身体互动；session-open 遇到合法 Save 的墙钟回退时以零 elapsed
  重新锚定，而 active 回退仍被拒绝，reset 即使 startup settlement 失败也可清除 Save 并重启；
- 最终修正后的产品 Vitest 为 `11 files / 66 tests passed`；focused Browser journey 仍为 Chromium `10/10`、
  WebKit `9 passed / 1 skipped`。Browser 证据现在直接覆盖 hidden 阶段 mouse/touch blocked non-commit、闻手前明确
  拒绝、闻手后真实 mouse contact、重复结果 occurrence、tap/off-surface non-commit、Chromium native touch，以及
  390px 浮层 pointer pass-through；唯一 skip 仍是 Playwright WebKit 没有 native touch-drag injection。完整
  `deno task check` 为 `390` 个 Vitest 文件、`5,475` 项测试与 `6` 项 composition-state workload，并通过 assets、
  全部 application checks 与 E2E release build。

M3 已由所有者另行启动，并完成视觉/构图、`trusting`/梳理、首个 `bonded`/腹部边界与叼球归还纵向切片；其余完整产品
分母、后期关系内容、剩余互动/玩具/行为、
音频/i18n 与作者接手仍保持开放，M4–M5 和 retirement gate 均未关闭。

### M3 — 关系深度、互动宽度与反馈质量

- 用统一的产品美术方向替换 M1 的验证级猫/房间几何、材质和构图，并让相机、光照、环境层次与触摸目标在
  宽窄屏都清晰可读；这不是最终设备 polish，但不能继续以验证素材代表成品质量；
- 完成 trusting/bonded 后期、腹部邀请、梳理、三种玩具、全部至少十六个自主行为、二十个反应片段和四至五个
  关系里程碑；
- 腹部 exposure 与 `belly_offer` 分离；过快/过久先警告，玩家及时停手只阻止负面升级并帮助 mood 恢复，
  忽略警告才触发 overstimulation/离开；主动尊重拒绝、在警告前停止或响应 invitation 才可成为关系证据，
  重复 warning 无收益；
- 每类互动都由姿态、声音和动作表达 accept/tolerate/warn/refuse；普通 UI 不暴露最优操作数字；
- 完成偏好发现、玩具熟练度、照片/回忆册、托管/旅行模式、设置、音频和 locale-addressable 中英文本；
- 使用 addressable content/asset/code boundaries 控制初始 graph 与 resident working set，不为单只猫建立通用
  loader、Worker scheduler 或 cache framework。

2026-08-27 完成 M3 的首个视觉与构图切片：Scene 作者数据新增可编辑的 ambient fill light；产品本地 Three
runtime 以作者 camera 为宽屏基线，只在 resize 与 activity change 时派生窄屏 framing，不在反应动画逐帧更新
相机；房间的窗框、踢脚线、圆形地毯、窝垫和食碗收进独立的 product-local procedural asset builder，当前仍是
一个 `pet.room` 聚合对象的内部 children，尚未成为逐个可选择、可编辑的 authored objects。该实现只扩展
Electronic Pet 私有 camera 数据，未增加引擎 API、通用 Scene schema、registry 或第二套 Object authority；猫、球、阴影和宽窄屏浮层构图经真实
1280×800、390×844 与 Chromium/WebKit 产品旅程验证。该切片只关闭验证级构图与可触达性阻断，最终猫与房间
美术、后期关系、剩余互动/玩具/行为、音频、i18n、设置、相册和完整 M3 分母仍然开放。

2026-08-27 完成 M3 的第二个关系与梳理切片：产品通过已存在的关系事实、跨 visit evidence、共同游戏与偏好
发现形成一条真实可达且单调的 `routine -> trusting` 旅程；后续主动靠近发出的头部接触邀请同时受 invitation /
activity occurrence currentness 约束，只有真实接受的当前邀请按 visit 记一次，重复同 visit、`tolerate` 与 stale
输入均无进展。Scene 作者数据新增一个可见 brush object 和绑定到猫背 socket 的 grooming volume，并复用现有
compiler、Inspector、operation/CAS/undo、runtime binding、raycast 与 stroke accumulator；没有建立 tool manager、
gesture DSL、第二套 hit authority、新 Scene kind 或 public engine API。工具选择和 pointer trajectory 留在
renderer-local presentation；独立 `pet.groom_complete` 在权威边界验证 current activity、目标、姿态与信赖，
再由普通 TypeScript 规则结合 mood、preference、毛流方向、速度、时长和近期记忆求值。接受结果写入一个真实
关系事实和既有有界 care memory，Save/reload 保留权威结果但不会恢复手持工具。Chromium/WebKit 已覆盖跨 visit
信任旅程、真实 mouse 梳理、短拖零提交、Save/reload、Inspector object/volume 和 Chromium native touch；WebKit
仅因 Playwright 不支持 native touch-drag injection 跳过触控案例。该切片未加入音频，也未关闭 bonded、腹部
邀请、另外两种玩具、剩余行为/反应、i18n、设置、相册或完整 M3。

2026-08-27 完成 M3 的第三个腹部边界切片：第 9 个自主行为 `belly_expose` 使用独立
`supine_relaxed` 姿态；姿态本身只表达脆弱与信任，只有已经 `bonded`、心情为 calm/social 且产品偏好允许时，
后续新的 activity occurrence 才生成 `belly_offer`。`bonded` 的真实单调路径要求已有 `trusting`、首次梳理，
以及两个不同 visit 中在 warning 前主动停止腹部试探；同一次成为 bonded 的露腹不会追溯生成邀请，重复同 visit、
warning 后停手和继续越过 warning 均不能刷取关系证据；`newcomer` / `familiar` 的同类触碰只得到防备反馈，
不会预存未来的 `boundaryRespect`。

Scene 作者数据增加绑定到 Spine 的 `cat.belly` socket 与独立 sphere volume，并通过现有 compiler、Inspector、
operation/CAS/undo、binding 与 raycast 表达；作者位置经真实产品画面修正，腹部目标在仰卧身体上可见、可 hover、
可命中且不再被头颈 volume 完全遮住。gesture runtime 只用当前 gesture 的两个 one-shot timer 表达 warning 与
继续越界，不创建权威 warning 状态、timer manager 或 gesture DSL。State/Save 只接收一次
`completed_before_warning | stopped_before_warning | stopped_in_warning | continued_after_warning` 终态：warning 后
停手只恢复 calm，继续则 overstimulated 并切到新的 `observe_player` occurrence。

本切片同时修正了 Scene gesture 的 currentness 所有权：contact、grooming 与 belly 都在 pointer-down 捕获 activity
occurrence 及相关 invitation occurrence，pointer-up 不再借用最新 publication token；successor 使进行中的手势
失效，权威边界继续原子拒绝 stale command。新增 Chromium/WebKit 旅程只覆盖真实 renderer-local warning、warning
前停手、跨 visit bonded、后续明确邀请和慢速短 stroke；既有专项 E2E 继续独立保护
390×844/1280×800、Inspector belly object/volume、stale activity/invitation 零部分变更和 Save/reload。该切片把
实现宽度推进到 9/16 个自主行为和脸/颈/背/腹部 4/8 类直接互动，但未关闭另外两种玩具、其余行为/反应、音频、
i18n、设置、相册或完整 M3。

2026-08-27 完成 M3 的第四个叼球归还切片：第 10 个自主行为 `bring_ball` 只在 `bonded`、social/playful
且刺激需求允许时发出当前 `shared_play` invitation。首次归还前，选择规则在更紧急的需求行为之后优先展示
一次叼球，修正了早期阈值会被 `explore_room` 先行消耗、使邀请可能长期不可达的问题。该行为复用
`near_player` 姿态与已有 invitation/command family，没有增加 scheduler、behavior tree 或第二套 gameplay
authority。

Scene 作者数据继续把 `toy.ball` 表达为普通 model，并在猫头增加 `cat.mouth` socket；产品私有 binding 连接
model、toy、`pet.play_complete` 与 behavior owner。Inspector 复用既有 hierarchy、socket 编辑、operation/CAS/
undo 与只读 binding 面板，不增加 toy schema、Scene kind、伪 interaction volume 或 public engine API。
renderer 在唯一 Three canvas、raycaster、Pointer Events owner 与 demand-driven RAF 中完成 mouse/touch 抓取、
拖动和 throw → chase → return 表现。短拖/取消零提交；越界提交一次 `missed`，合法投球只在归还表现结束后
提交一次 `returned`。轨迹、抛物线、追逐、回程和输入来源均不进入 State/Save。

pointer-down 捕获 activity/invitation occurrence；successor 取消 renderer-local 手势/序列，权威命令继续原子
拒绝 stale pair。首次 `returned` 只写一次 `relationship.first_ball_return`、当前 visit 的 shared-play evidence
与既有有界 play memory；Save/reload 恢复语义结果而非瞬时动画。产品 Vitest、Chromium/WebKit 真实 mouse、
390×844 Chromium native touch、Save/reload 和 Inspector ball/socket/binding 证据通过。该切片把实现宽度推进到
10/16 个自主行为与 2/3 种玩具，但未增加 physics/toy runtime/gesture DSL/mastery framework，也未关闭益智
喂食器、其余行为/反应、音频、i18n、设置、相册或完整 M3。最终树的产品 Vitest 为
`13 files / 95 tests`，Electronic Pet Browser matrix 为 `27 passed / 3 skipped`（WebKit native touch-drag
injection 不可用）；全仓 `deno task check` 为 `392` 个 Vitest 文件、`5,504` 项测试与 `6` 项 Composition
workload，并通过全部 assets/application checks 和 E2E release build。文档站、Electronic Pet release build 与
React Doctor changed-scope advisory（0 findings）也通过。

### M4 — 产品完整性、作者接手与性能审查

- 非实现作者逐项核对 semantic coverage table、数量、领养早/中/后期、所有 interaction families、离线回归、
  recovery、设置、i18n、audio 和 representative device/input classes；一个完整循环或腹部演示不能替代缺项；
- 安排至少两项真实作者任务：人类调整对象/互动区/动画参数并保存；Agent 增加一个小自主行为或关系反馈，
  人类随后定位代码和对象、修改参数并继续发布；
- Browser Chromium/WebKit 覆盖鼠标/触控直接互动、普通 DOM UI 键盘可达、宽窄屏、200% zoom/reflow、
  reduced motion、默认静音、Save/reload、早中后状态和 recovery。自动化不强求每个浏览器与输入设备的笛卡尔积，
  但每个产品目标和输入类别都必须有真实证据；Desktop 只验证当前 static preview/normal close，不宣称 HMR/
  durability/production；
- 用通用 GUI startup benchmark 和产品 profiling 报告 raw measurements，不建立 promotion harness 或机器绑定
  阈值；确认代表性当前低端稳定 30 fps floor、主流 60 fps target 或记录未完成项；
- 独立 product review 与 engine review 分开分类 application defect、recipe/API ergonomics、optional
  integration 与 neutral-reproducible engine gap。通用修复必须有中立合同证据，产品移除 workaround 并复验；
- 仅把确有通用价值的工程形状和 recipe 回馈 `template/`，不复制电子宠物的数据、视觉或产品规则，也不因此
  自动建设 scaffold CLI。

### M5 — 发布接替与 Cat Cafe 原子退役

- 新产品通过 application-local tests、product Browser E2E、release/prebuilt smoke、runtime assets、final graph、
  accessibility、raw budgets、`deno task check` 与受影响 React Doctor advisory；
- 冻结新产品准备长期维护的首个 Save floor；WIP revision 不提前制造多份兼容承诺；
- 若产品真实选择 Browser R2，显式迁移 source-identity/Save transition owner，并用 forward/reverse product
  evidence 验证；不得把 scope-frozen collector 机械复制成第三个永久 owner。若不选择 R2，Engine Lab 继续
  持有中立 R2 合同，新产品诚实使用普通 Vite/R3；
- 完成 §4 的责任矩阵，更新网站、workspace、部署、live docs 与 flagship 表述；
- 显式宣布从本次接替起不再支持 Cat Cafe revision 1 Save。删除 fixture、release-corpus descriptor/product
  union、产品 migration/browser flows 和 live support 文案；不把 Cat Cafe Save 迁移到电子宠物；
- 同一 retirement slice 删除 `examples/cat-cafe/**`、专属 E2E/fixtures/assets/tools、workspace/project registry、
  site route/build/deploy wiring、当前 docs 和 lockfile 残留。不保留 archive 源码、alias、deprecated wrapper 或
  双轨发布；dated closed plans/proposals 保留其历史事实。

## 4. Cat Cafe 接替矩阵

| Cat Cafe 当前责任                         | 电子宠物接替或退役条件                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| 当前旗舰完整游戏                          | §1 完整分母、独立 product review 和可发布 build 全部关闭后切换                                |
| revision 1 Save floor                     | M5 显式终止支持并删除 physical fixture/corpus/live docs；电子宠物建立独立 floor，不跨产品迁移 |
| Browser Save/recovery                     | 新产品证明 Save/reopen、backup/recovery 和普通 reload；只保护实际采用的产品流程               |
| Browser R2 product evidence               | 真实选择时显式转移 owner；否则 Engine Lab 保留中立合同，不为计数伪造产品消费                  |
| 直接互动、普通 UI 可达性与响应式          | 新产品用鼠标/触控 3D gesture、普通 DOM 键盘/无障碍语义和 target uplift 提供产品级证据         |
| Content Database / Event Pool             | 食物、玩具、反应、偏好和自主行为自然消费；若最终设计不需要，不能为了第二消费者计数强塞        |
| 真实媒体、Audio 与 asset checks           | 新模型/贴图/音频/照片素材接替实际产品验证                                                     |
| Inspector/作者工作流压力                  | Object ↔ code binding、3D pick/edit 和 human/Agent handoff 任务通过                           |
| Narrative/WholeCanvas/rollback 等特定玩法 | 只迁移新产品实际需要的合同；接受的独立能力继续由 Engine Lab/focused tests 维护                |
| 网站、workspace、部署和文档               | M5 同一原子切换，不留下维护中旧入口                                                           |

不得因为 Cat Cafe 退役而删除 Event Pool、Content Database、rollback、audio、Motion、WholeCanvas、low-level
Scene 等已接受引擎能力；“仓库内没有当前消费者”不能单独推导删除。也不得为了保住第二消费者数量，污染电子
宠物的产品语义。历史计划中已经发生的 Cat Cafe 证据继续成立，live 文档只更新现在时事实。

## 5. 验收与停止条件

每个里程碑先跑产品/engine focused tests，再跑受影响的 browser/build/check；只在切片关闭时运行必要 broader
gate。自动测试保护可观察规则、Save/currentness、Object binding、authoring CAS 和真实用户旅程，不建立完整
DOM/Three object/source inventory、pixel-diff framework 或一次性 durable evidence system。

只有以下情况暂停请求所有者裁决：

- 需要改变 public/wire/Save/digest/replay compatibility，或无法保持唯一 writable authority、CAS 与 atomic
  no-partial commit；
- 需要从 unsupported `src/**` import、复制 Authoring Host/session/source IO，或无法给 3D object/interaction
  建立唯一 author authority；
- 两个真实消费者对同一公共 Object/Inspector contract 提出冲突要求；
- measured 产品 baseline 证明当前主线程/资源边界无法满足产品 floor，且最小修复需要 Worker/process/new Host
  boundary；
- Cat Cafe Save floor、发布入口或 historical evidence 的处置无法明确；
- 只能通过缩减产品分母、隐藏缺项或把纵向切片称为完成才能继续。

普通产品命名、私有 helper shape、TypeScript 文件拆分、动画素材选择和等价内部规则采用最简单可验证方案继续。
产品本地复杂逻辑不自动成为 engine gap；确认的 gap 也不授权通用 3D engine、Prefab、Blueprint、public Mod
platform、Desktop HMR 或最终编辑器。
