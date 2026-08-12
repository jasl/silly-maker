# 示例

每个示例都是仓库 `examples/` 下完整、可独立运行的项目——可以直接复制任何一个作为起点，也可以在这里试玩部署版。

## 《雨巷猫舍》Cat Cafe

<p><a href="/play/cat-cafe/" target="_self">▶ 在浏览器中试玩</a></p>

旗舰示例：一款完整可发布的养成经营游戏。雨夜盘下巷尾小店，捡到一只湿透的奶猫，七周把店开起来、把小雨养大——四种结局外加无限后日谈。

它在引擎里锻炼的能力：

- **内容数据库**——活动、抚摸反应、竞赛招式、对手、图鉴条目都是带类型校验的数据表；调参就是改一行。
- **舞台命中区域**——抚摸走内容声明的部位区域，随猫的成长阶段缩放；反馈就地迸出（emoji + 气泡）。
- **Production Narrative Surface**——Cat Cafe 只声明一个 `application.ui().narrative`；引擎拥有打字机、自动/跳过已读、History 与已读跟踪，Story 只提供被动皮肤。
- **Package-owned WholeCanvas 结局**——语义结局状态选中唯一全画布 primary，所有更低 Stage layer 同时 inert。“继续”进入无限后日谈；Restart 直接安装 fresh gameplay，不返回 Title。
- **确定性模拟**——事件池相遇、回合制运动会、带硬边界的玩家回退、存档安全点。
- **场景驱动声音层**——BGM/环境声/音效跟随发布的游戏视图；三条音量总线持久在玩家档案里。
- **双语文本 + 浏览器语言自动检测**、风格统一的美术，以及本机/交叉目标 Desktop 打包 preview（`.app`、Windows `.msi` 或 `.AppImage`）；其文件持久化仍需通过 durability promotion gate。

## SillyOS 98

<p><a href="/play/silly-os/" target="_self">▶ 在浏览器中开机</a></p>

一台复古电脑——不是游戏。用这套引擎做的一次**不务正业**尝试：开机直达重叠窗口、任务栏、开始菜单，以及扫雷、记事本、年代感浏览器、显示属性与控制面板。

它存在的意义：证明引擎在视觉小说之外也站得住。

- **流体视口**——桌面 1:1 平铺任意浏览器区域（含手机竖屏），无黑边。
- **窗口管理是 UI 瞬态**——约 180 行的 Story 侧 store 搞定 z 序、焦点、最小化/最大化、拖拽与边界钳制。
- **硬盘语义，不暴露存档**——持久化完全内部处理，玩家看不到槽位或存档对话框。关掉标签页再开机，文件都在。
- **自绘系统外观**——引擎默认系统菜单、标题屏、设置对话框全部隐藏；Win98 风格的按下反馈与内凹输入框是纯 CSS。
- **没有 Narrative writer**——`application.ui()` 刻意省略 `narrative`；这台桌面不会为用不到的对话 runtime 付出成本，也不会自行模仿一份。
- **没有 WholeCanvas allocation**——自定义 shell 同时省略 `titleScreen` 与 `application.ui().wholeCanvas`，包括关机路径也不挂载 WholeCanvas Host 或 Story definition。

## 《打烊前的旧书店》Bookshop

它现在与 starter、Cat Cafe 一样，通过 `defineNarrativeSurfaceV1` 声明组合层拥有的 production Narrative Surface。

一段短叙事——引擎史上第一个由外部模型一次通过写成的 Story。作为最小剧本参考保留：say/choice 节点、旗标、一枚硬币、两个结局。
