---
layout: home

hero:
  name: SillyMaker
  text: 对 LLM 友好的剧情游戏引擎
  tagline: TypeScript + React。确定性模拟、语义舞台、原子存档——人类与 AI 代理都能创作。
  actions:
    - theme: brand
      text: 用 AI 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/jasl/silly-maker

features:
  - title: 同时服务两种作者
    details: AI 代理有结构化诊断、headless 模拟与创作金丝雀；人类有 DevDock 实时检查器、可写调参面板、数值轨迹与存档对比。
  - title: 构造上的确定性
    details: 一个会话拥有权威状态。命令要么原子提交、要么不留痕迹；RNG 随快照存储，重放与玩家回滚逐位一致。
  - title: 语义舞台，而非画布
    details: Story 发布纯数据的舞台目标——内容 ID、位置、外观、命中区域。渲染器是可替换的 React 组件；存档永不包含渲染器状态。
  - title: 静态数据即内容表
    details: 物品、活动、事件、反应都定义在带类型查询的内容数据库表里并在解析期校验。可变状态归模块。调参就是改一行表数据。
  - title: 不止视觉小说
    details: SillyOS 98 用同一台引擎复刻复古桌面——重叠可拖拽窗口、任务栏、确定性扫雷，以及文件随存档持久的记事本。
---
