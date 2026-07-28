# 架构

SillyMaker 是浏览器优先、可 headless 运行的剧情游戏引擎。四个 MIT 包拥有通用机器；你的游戏是一个声明数据与规则的 Story 包。

## 包结构

```text
@sillymaker/base      合同、Story 创作、确定性运行时、会话、
                      持久化、重放、诊断（无 React、无 DOM、无浏览器存储）
@sillymaker/ui        React 游戏壳：舞台、HUD、浮层、面板、
                      音频呈现器、播放系统、DevDock
@sillymaker/web       浏览器宿主：IndexedDB/HTTP 持久化、挂载、
                      能力、自动化、指针输入
@sillymaker/tooling   项目配置与 story CLI

e2e/  template/  examples/    Story 包（你的游戏就是其中之一）
```

Story 只 import 发布的包出口——不碰引擎内部、不碰其他 Story，边界有测试强制。

## 权威数据流

```text
Story 定义
  → 解析后的 GameSimulation
  → GameSession / GameSnapshot          （唯一权威）
  → GameQueries → SemanticPublication   （不可变投影）
  → RuntimePresentationPublication
  → React 渲染器                         （可替换、无状态）
```

一个会话拥有玩法状态并串行化所有操作。UI 渲染不可变投影、回发语义意图；各种输入设备（指针、触摸、键盘、手柄、自动化）映射到同一组语义动作。存档只存纯版本化数据——绝不含 DOM、渲染器状态或动画进度。

## 设计原则

- **单一权威、原子提交。** 命令要么提交完整有效的结果、要么不留痕迹。渲染器、音频元素、React state 永远不是第二真相源。
- **该确定的地方确定。** RNG 随快照；重放与回退复现同一局；headless 与浏览器共享同一语义契约。
- **静态数据与动态状态分离。** 内容表（解析期校验、只读查询）放定义；版本化模块 schema 放可变状态。
- **发布契约优于口头约定。** 舞台层序、层叠刻度、状态 schema、存档格式、文本目录——每个都是被校验、被测试的契约，让成类的 bug 死在 CI 而不是玩家会话里。
- **呈现可降级，玩法不阻塞。** 图缺了落回代码渲染器，音频缺了落回静音，reduced motion 落回瞬时结算。

## 为什么是 TypeScript + JSX 而不是 DSL

这个品类的引擎历史上都会长出自制脚本语言（Ren'Py 的 Screen Language、RPG Maker 的事件指令）。SillyMaker 刻意不做：剧本、规则与 UI 就是普通 TypeScript 和 JSX。类型检查完成了 DSL 解析器该做的校验；游戏需要真逻辑时整门语言都在手边；而对本引擎最关键的是——**LLM 对 TypeScript/React 的熟练度远超任何自制游戏 DSL**，这正是 [AI 优先工作流](/zh/guide/getting-started)可靠的原因。Unity 自己的轨迹（UXML/USS，一个 HTML/CSS 方言）也说明游戏 UI 终归收敛于此；我们直接站在原版上。

更深入的工程文档在仓库 `docs/engine/` 下——[架构](https://github.com/jasl/silly-maker/blob/main/docs/engine/architecture.md)、[特性](https://github.com/jasl/silly-maker/blob/main/docs/engine/features.md)与[路线图](https://github.com/jasl/silly-maker/blob/main/docs/engine/roadmap.md)。
