<!-- SPDX-License-Identifier: MIT -->

# Starter template Story

这是一个可以直接游玩的最小 Story，也是开新游戏的起点。复制本目录、全局替换 `template`/`Template` 为你的故事名、在 `project.config.ts` 注册一条应用，即可开始创作。

## 现在就能跑

```sh
deno task story check template                       # 结构化 Story 诊断
deno task story simulate template --scenario opening # 无浏览器跑完整叙事
deno run -A npm:vitest run template      # 基线 + 图 lint + 全剧本走通
deno run -A npm:vite --mode template                  # 浏览器游玩
deno task story build template                       # 静态构建到 dist/template
```

## 文件地图（按"你想改什么"排列）

| 想改什么                 | 文件                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 台词、选项文字、界面文案 | `src/presentation.ts`（textId → 文本，全部字符串都在这里）                                                                 |
| 剧情节点、分支、舞台指令 | `src/narrative.ts` 的 `templateScriptV1`                                                                                   |
| 舞台内容与渲染器绑定     | `src/presentation.ts` 的 `templateStageContentCatalogV1` + `src/application/composition.tsx` 的 `templateStageRenderersV1` |
| 玩法规则与命令           | `src/simulation.ts`（`template.inventory` 是可替换的空壳模块）                                                             |
| 玩家可见的动作目录       | `src/application/semantic.ts`                                                                                              |
| UI 布局与对话框样式      | `src/application/composition.tsx`                                                                                          |
| 模块清单与版本           | `src/story.ts`（版本纪律写在文件头注释里）                                                                                 |
| 网页标题与分享卡片       | `metadata.json`（标题/描述/语言/主题色/分享图/favicon，构建时注入 `<head>`）                                               |

## 剧本模型（不是 DSL，就是 TypeScript 数据）

节点五种：`say`（对白，等玩家确认）、`stage`（纯舞台变更）、`choice`（菜单，选项可设 flag、可原子消耗金币）、`branch`（按已保存 flags 纯路由，必须落在 `successors` 里）、`end`。Engine Lab（`e2e`）额外演示 `pause`/`barrier`/`custom` 三种边界与音频、玩家播放系统。

改完剧本的验证环（几秒钟）：

```sh
deno task typecheck && deno run -A npm:vitest run template
deno task story simulate template --scenario opening
```

注意：新增/删除交互边界会移动 occurrence 编号；`src/tooling/simulation-target.ts` 的场景脚本和测试里按编号步进的断言要同步（失败信息会给出期望编号）。

## 授权

模板代码 MIT。复制出去的新 Story 归你自己的授权策略管。
