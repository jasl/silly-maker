---
title: "审查与调试"
description: "使用 Runtime Inspector、诊断、聚焦测试和浏览器工具。"
---

把实际运行的产品与声明的源权威结合起来检查。Inspector 是面向 Authoring Scene
项目的开发期表面，不是通用浏览器调试器，也不是已完成的可视化编辑器。

## 打开当前 Inspector

从应用目录或仓库根启动：

```sh
deno task app dev <application-id>
```

打开同源 `/__sillymaker/inspector/` 路径。应用必须在
`sillymaker.config.ts` 中声明 Inspector binding；生产 Player build 会排除
该 binding、源码 writer 与 Inspector 实现。

## 它可以修改什么

对于 `*.authoring-scene.json` 源文件，Inspector 可以：

- 搜索 Scene，并浏览虚拟化的 Layer/Object 层级；
- 在真实 Stage preview 中选择可见、透明、group 或场景外对象；
- 修改 local transform、visual content、已有 appearance 值、同级对象顺序与
  Layer 顺序；
- 通过 Scene CAS 保存；已保存源文件发生变化时保留 dirty draft，供用户明确重试。

Hit region、Motion、Timeline、interaction/GUI intent、compiled layer 与源码位置
是只读 facet。Motion/Timeline scrub 只做分离的表现采样。对象创建、代码、
low-level Scene、Regions/Chrome 文档和 Motion keyframe 仍通过直接编辑源码或
聚焦工具完成。

## 把一个问题追踪到证据

1. 复现可见问题，定位对应的 Scene/Object 或 runtime facet。
2. 沿 Inspector 显示的源码位置找到唯一 owner 文档或代码路径。
3. 只修改这份权威，不把修复镜像到第二个 store。
4. 运行聚焦检查，再执行相关应用和浏览器路径：

```sh
deno task app check <application-id>
deno task app simulate <application-id> --scenario <name>
```

Simulation 只适用于声明了 scenario 的游戏应用；纯 GUI 应用使用自身聚焦单测与
浏览器验收。最终分别报告观察到的行为、修改的权威、自动证据、人工证据和仍存在
的引擎缺口。
