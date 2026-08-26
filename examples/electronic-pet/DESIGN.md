<!-- SPDX-License-Identifier: MIT -->

# Electronic Pet product and authoring ledger

状态：**M1–M2 已实现，M3 已开始；完整 Reference Product 仍为 WIP。** Primary baseline 是仓库内的
[`docs/game/electronic-pet.md`](../../docs/game/electronic-pet.md)，不是任何第三方应用。

## Semantic coverage

| Area                     | Baseline                                                                    | Current implementation/evidence  | Intentional difference or open work                    |
| ------------------------ | --------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------ |
| 新领养到成为家人         | 五段可观察进展                                                              | M2 完成到家、靠近、形成日常      | M3 完成建立信任与成为家人                              |
| 信赖 × 心情              | 正交规则与可解释恢复                                                        | M2 单一权威 owner 与原因投影     | M3 完成后期深度与反馈                                  |
| 自主行为                 | 至少 16 个，含驻留、打断与重复抑制                                          | M2 完成 8/16 个及 8 个表现映射   | M3 完成 16 个与内容打磨                                |
| 互动                     | 八类主要互动、腹部邀请与边界反馈                                            | M2 完成脸、颈、背 3/8 类         | 尾根明确 defer；M3 完成其余互动                        |
| 玩具与照料               | 三种玩具、喂食、梳理、共同游戏                                              | M2 完成照料、闻手与逗猫棒 1/3    | M3 完成梳理及另外两种玩具                              |
| 3D 表现                  | 房间、rigged cat、动画与响应式质量档位                                      | M3 首个视觉/宽窄屏构图切片已完成 | 最终猫、房间细节与动画仍开放；不建设通用 3D engine     |
| 作者工作流               | Object 到代码/资源/互动/source 可定位，人类与 Agent 共用 operation/CAS/undo | M1 作者闭环已完成                | 不要求无代码开发                                       |
| Save/recovery/offline    | 独立 Save floor、有限离线结算与回归摘要                                     | M2 完成 Save/reopen/reset 与摘要 | M5 完成完整 recovery/release 证据                      |
| i18n/audio/accessibility | 中英文本、音频、普通 DOM UI 的键盘与无障碍语义                              | 尚未实现                         | M3–M4 完成                                             |
| Browser/Desktop          | Browser 产品与当前 Deno Desktop static preview                              | 工程外壳已声明                   | 不声明 Desktop HMR、durability 或 production promotion |

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

## Asset and reference ledger

- `references/Meow-Generator`：研究输入；许可不足以直接复用，生产依赖为零；
- Neko Atsume、Nintendogs、Tamagotchi：仅提供公开行为层 secondary inspiration；
- `assets/models/electronic-pet-cat-m1.glb`：本项目原创生成并按仓库媒体资产规则以 CC0 1.0
  提供；模型由 Three.js r185
  程序化网格、基础材质、简化骨架和关键帧 `Idle` 动画构成，再以 `THREE.GLTFExporter r185`
  导出。它不嵌入第三方模型或贴图，也不要求保留独立生成/provenance 工具链；
- 后续生产模型、贴图和音频必须由项目自有或兼容许可素材补充，并在实际加入时通过普通设计或
  notice 表面记录。
