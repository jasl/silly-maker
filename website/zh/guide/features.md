# 引擎提供什么

一次能力巡礼：Story 靠声明（而不是自建）就能获得的东西。以下每一项都被随附示例真实使用、被引擎测试套件盯守。

## 确定性内核

- **单一权威会话**拥有玩法状态；UI 与自动化只发语义意图，绝不直接改状态。命令要么原子提交、要么不留痕迹。
- **RNG 随快照存储**——读档重放、回退重试得到完全相同的结果。没有 SL 大法，没有刷结果漏洞。
- **权威重放**：在受支持、经过校验的模拟路径上，命令日志重建状态，引擎校验摘要与记录证据。维护中的 Engine Lab transcript 在 headless 与浏览器运行中得到相同权威状态；任意 Story global 与 Presentation/Host 时序不在这项保证内。
- **玩家回退**：可选的有界检查点环，Story 可把不可逆命令（开赛、确认结局）标为硬边界，历史不可穿越。

## 创作面

- **叙事脚本**是普通 TypeScript 数据：say / choice / stage / branch / hold / end 节点与旗标，解析期校验，可做图 lint（不可达节点、缺失文本、非法分支目标）。
- **内容数据库**：静态定义（物品、活动、事件、反应）放进带类型查询的表，解析期校验——调参就是改一行。可变状态放版本化、schema 校验的模块。
- **事件池**：条件门控的加权抽取，走事务性 RNG，每次抽取附 JSON 可读解释。
- **文本目录**：所有显示文字都在 textId 后面，多语言目录带一致性检查——i18n 内建，玩家语言偏好持久化。

## 舞台与呈现

- **语义舞台**：Story 发布纯数据目标（内容 ID、位置、外观、命中区域），可替换的 React 渲染器负责画。存档永不包含渲染器状态。
- **命中区域**随所属内容缩放移动；指针、触摸、键盘走同一条语义路径。
- **转场与时间轴**：校验过的纯数据定义（crossfade/slide/cut；tween/repeat/event 步骤），在宿主中立的呈现时钟上执行，带 reduced-motion 降级与跳过语义。
- **声音**：可存档的连续意图（BGM/环境声/语音，读档精确还原）+ 只在提交时发生的一次性音效（epoch 围栏防重放）；音乐/语音/音效三条玩家音量总线跨会话持久。
- **层叠是发布契约**：舞台层与层内表面的 z 顺序来自令牌刻度，测试盯守——禁写裸 z-index。

## 玩家侧基线

声明一个标题屏就得到完整前门：片头（例如工作室或游戏开场）、新游戏/继续/载入存档/设置、单模态系统菜单（保存与设置互斥，Esc 关闭）。Splash 与 Title 保持现有 `titleScreen` 创作形状，但现在是 package-owned 的纯 WholeCanvas renderer，不再平行写入 Root/System。标准 Saves Surface 自带槽位列表、时间戳、导入导出与 Story 声明的安全点；Story 可以用自定义 React component 替换主体，但 System modal、input、focus 与 lifecycle authority 仍由引擎持有。载入成功会安装 presentation successor 后直接进游戏，因此已退休对话框的旧 continuation 不会再关闭后来新开的对话框。设置出厂含三条音量、静音、文字速度、自动播放停留、全屏与开发者工具开关。实际消费 Player Profile `skipCutscenes` 偏好的 Story 可以显式开启“跳过过场”复选框；它只能立即结算可跳过的表现等待，不能跳过玩法时间或语义命令。Story 通过 `defineNarrativeSurfaceV1` 创建一个不透明 `NarrativeSurfaceDefinitionV1`，并从 `application.ui().narrative` 返回，即可启用 production Narrative Surface。它的五项声明分别选取 Narrative 数据、派发语义 resolution、渲染被动 React UI、解析本地化文本，以及可选地重播当前语音。UI 组合是 lifecycle、打字机/自动/跳过已读、History、Player Profile、时钟、input、focus 与 Stage 接线的唯一 writer。Engine Lab、starter Template、Bookshop 与 Cat Cafe 均已使用该路径；SillyOS 则刻意省略。Story 自有的 WholeCanvas primary/detail 通过 `defineWholeCanvasSurfaceV1` 进入，source 可选语义发布 selector 或狭窄的 `createWholeCanvasApplicationSourceV1`；immutable renderer frame 只暴露有界 action/back，而 package 拥有 readiness、exact-parent detail、input、focus 与 Stage placement。Cat Cafe 由发布选中的结局是第一消费者：继续会进入无限后日谈，Restart 则不返回 Title，直接开始 fresh gameplay。Engine Lab 只在 `?whole_canvas_conformance=1` 时成为中立的第二消费者，默认路由省略该 definition。SillyOS 同时省略 `titleScreen` 和 `application.ui().wholeCanvas`，因此不分配 WholeCanvas Host。玩法窗体（图鉴、商店、道具箱……）声明为 Workspace Overlay 后会继承统一的 `PanelV1` 窗体外壳。System dialog、Workspace Overlay、Narrative 与 WholeCanvas 共用 UI 拥有的 Managed Surface 组合：renderer 或必需端口准入失败不会改变当前 Surface、input 或 focus，延迟 replacement 会保留当前 subtree，直到 candidate ready，而 current WholeCanvas primary 会使所有更低 Stage layer 处于 inert。

## 持久化

存档是纯数据、带版本、经校验——快速槽加编号手动槽（数量由游戏声明，默认 8，也可设为 0）再加当前/上一自动档。记录可以携带供自定义槽位 UI 使用的有界 Story 摘要与玩家备注；标准存档对话框暂不渲染这些 annotation。Host profile 在存档之外保存偏好与**元进度**（图鉴解锁、结局达成），跨周目收藏在重开与回退后依然保留。浏览器使用具备批量原子提交与乐观修订的生产级 IndexedDB store；当前桌面文件渠道是可用 preview：本地协议和单记录替换已加固，但多记录崩溃原子性与跨进程 CAS 尚在 production-floor 计划中。

## 给人与给 AI 的工具

- `story check` / `story simulate` 输出结构化 JSON：agent（或 CI）可以校验叙事图、headless 玩通每条路线。`--trace` 打印逐步数值轨迹；`story diff` 结构化对比两份存档或报告。
- **DevDock** 是唯一的能力门控调试 UI（绝不混进玩家 UI）。「调试」启动器分组为 **状态**（导出/导入、引擎 **状态查看** / **状态编辑**、刷新状态、初始化、带确认的清空存储）、**场景**（冻结画面、dev server 宣告时出现 Studio、其他只读场景工具）、以及 Story 专用 **作弊**。cheat 级工具在 `cheats` 开启前保持禁用。
- 交付：`deno task build:web` 产出可直接静态托管的 `dist-web/`，`site:build`
  负责组合文档站。声明了 `build:desktop` 的应用可产出本机或交叉目标 Desktop
  preview（`.app`、Windows `.msi` 安装包、`.AppImage`）；shell 领取启动窗口，
  以本次启动的精确 origin 和页面 capability 隔离私有本地路由；原生关闭时会先
  取消未完成的非权威下载，再排空本地 HTTP server。签名/公证与 durable store
  仍有明确发布门槛。
  Player HTML 链接到 [SillyMaker 项目许可证](/zh/reference/licenses)；项目法律
  文件也可以复制到显式选择的离线输出目录。打包、签名与完整性检查由目标平台
  工具负责。
