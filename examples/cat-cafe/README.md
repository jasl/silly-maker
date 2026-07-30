<!-- SPDX-License-Identifier: MIT -->

# 《雨巷猫舍》（example-cat-cafe）

全年龄原创养成经营游戏，也是 SillyMaker 引擎的旗舰示例。雨夜盘下巷尾小店的你，捡到一只湿透的奶猫——七周之内把店开起来、把"小雨"养大，周日傍晚去街区猫咪运动会看看她能走多远。

这是一个完整可玩、可发布的游戏：标题屏、开场剧情、日程经营、抚摸互动、回合制运动会、成长相册、多结局、双语（中文/English）、可持久化的设置，以及一套统一风格的手绘美术。

## 玩法

- **七周日历**：每天清晨/午间/傍晚/夜晚四个时段，行动力有限。
- **经营与照料**：开门营业赚钱、打扫店面、陪小雨玩、敏捷训练、采购鲜鱼、陪她午睡——活动的可用性由数值与时段决定。
- **抚摸**：直接点击舞台上的小雨（头/下巴/背/尾巴），反应由信任度查表决定；每天有次数上限。
- **周常来客**：每周有条件触发的常客事件（事件池加权抽取，权威可解释）。
- **猫咪运动会**：第 3/5/7 周周日傍晚，对阵糯米、烟灰、将军三位对手；扑跃/佯动/卖萌三招，士气归零定胜负。
- **成长相册**：七格回忆插画，跨存档解锁（Host 元进度）。
- **玩家回退**：一步回退最近的操作（防重掷：回退重试同一结果），运动会开赛与结局确认是不可逾越的边界。
- **VN 播放体验**：逐字打字机（速度可调）、自动播放（停留可调）、快进已读、对话历史回看——偏好持久化，读档不回退阅读进度。
- **声音层**：场景驱动的 BGM（店内/竞技场/结局）与常驻雨声、交互音效（抚摸/胜负/常客），音量设置持久化；素材为脚本合成的占位音频，可整体替换。
- **多结局 + 后日谈**：第七周周日夜结算四条结局线，结局进图鉴收藏；「继续经营」进入无限日常模式——日历不再封顶，每个周日都有友谊赛（对手轮换）。

## 运行

```bash
deno task story dev example-cat-cafe          # 浏览器开发（Vite）
deno task story build example-cat-cafe        # 生产构建 → 本目录 dist-web/
deno task story desktop example-cat-cafe      # macOS .app preview（含图标与本地文件存档）
deno task story simulate example-cat-cafe --scenario first-day   # 无头模拟
deno run -A npm:vitest run examples/cat-cafe  # 单元/语义测试
```

浏览器验收在引擎套件：`engine/packages/web/e2e/engine/hit-regions.spec.ts`（14 用例覆盖标题屏、抚摸、缩放、DevDock 调参、右键返回、语言切换、图鉴）。

## 开发者工具

游戏内「设置 → 开发者工具」打开 DevDock（默认关闭，不属于游戏 UI）：

- **状态检视**：实时 JSON 视图。
- **调参**：直接设数值（信任/活力/技艺/声誉/整洁/金钱）、快进天数、强制触发常客事件——全部走权威调试命令通道，提交进命令日志（`source: "debug"`），回放可复现。

配平工具（命令行）：

```bash
deno task story simulate example-cat-cafe --scenario seven-weeks --trace game.cat.trust,game.shop.money
deno task story diff saveA.json saveB.json
```

## 美术与素材

全套 23 张运行时美术（4 背景 + 9 只小雨立绘 + 3 对手 + 7 图鉴插画）为 AIGC 生成的统一水粉绘本风格，webp 格式、声明字节与 sha256 摘要、密封槽位；code-native 渲染器保留为降级路径。源档案与生成说明见 `art-source/aigc/cursor-image-gen/cat-cafe-2026-07/`。桌面图标为 `icon.png`。

## 目录

```text
examples/cat-cafe/
├── assets/          # 运行时美术（webp；digests 在 presentation.ts 声明）
├── icon.png         # 桌面打包图标
├── DESIGN.md        # 设计规格（数值、事件、结局）
├── src/
│   ├── state.ts         # 模块状态（版本化、校验）
│   ├── content.ts       # 内容数据库五张表 + 事件池条件
│   ├── simulation.ts    # 规则、命令、调试命令执行器
│   ├── narrative.ts     # 开场剧情
│   ├── presentation.ts  # 文案目录（zh/en）、资产槽位与包、舞台内容目录
│   ├── story.ts         # Story 组装
│   ├── application/     # 核心应用、语义适配器、web UI、DevDock 面板
│   ├── test/            # 基线/规则/语义链路测试
│   └── tooling/         # 无头模拟场景
└── vite.config.ts
```

## 授权

代码、文案与设计 MIT；AIGC 生成的美术与合成音频为 CC0 1.0 公共领域贡献（可商用、可演绎、无需署名）。见仓库根 `LICENSE.md`。工程背景：设计规格 [DESIGN.md](DESIGN.md)，引擎缺口分析 [研究笔记](../../docs/research/2026-07-28-mv-slg-gap-analysis.md)。
