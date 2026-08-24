<!-- SPDX-License-Identifier: MIT -->

# Starter template Story

这是一个可以直接游玩的 scene-first 最小 Story，也是开新游戏的起点。默认入口刻意只组合必要 Player；参考 DevDock/预制设置另有显式入口：

```sh
deno task dev        # 启动最小 Player（根目录可用 deno task author template）
```

需要第一方完整参考外圈时打开同一 dev server 的 `/reference.html`；它显式组合 `@sillymaker/web/reference` 的预制设置与 DevDock，不是最小产品的隐式依赖。从仓库根运行 `deno task author template` 会启动这个应用自己的 dev server；随后直接打开同源 `/__sillymaker/inspector/`，或从 reference DevDock 进入独立、仅开发期的 Inspector。它列出 Authoring Scene，显示 Layer/Object 层级与真实 Stage 预览，可修改 local transform、contentId/appearance 和对象/Layer 顺序，查看命中区域、Motion、Timeline、交互与源码位置等 facet，并只读 scrub Motion/Timeline。保存通过 CAS 只写 `src/scenes/opening/opening.authoring-scene.json`；对象创建、cue/Motion 定义和其他不在这个有限编辑面内的内容仍直接改源文件。场景文档是构图、站位和每 cue 表现声明的唯一作者权威；剧本只引用 cue。

复制本目录、全局替换 `template`/`Template` 为你的故事名、改好 `sillymaker.config.ts`，即可开始创作——副本本身就是完整项目（自带 `vite.config.ts` 与本地 story CLI）。在本仓库内开发时，把目录加进根 `project.config.ts` 清单；在仓库外开发时，把 `package.json` 里的引擎依赖改为相对 `file:` 路径并在 `deno.json` 设 `"nodeModulesDir": "manual"`。

## 现在就能跑

```sh
deno task story check .                              # 结构化 Story 诊断（含 scene/motion lint）
deno task story simulate . --scenario opening        # 无浏览器跑完整叙事
deno task test                                        # 基线 + 图 lint + 全剧本走通
deno task dev                                         # 在本目录启动开发服务器
                                                     # / = minimal，/reference.html = reference outer UI
deno task build:web                                   # 静态构建到 dist-web/（`build` 是它的别名）
deno task build:desktop                               # 桌面 preview 到 dist-desktop/（可加 --target <triple>）
deno task preview                                     # 用 HTTP 预览 dist-web/
deno task clean                                       # 清理 dist-web/ 与 dist-desktop/
```

## 文件地图（按"你想改什么"排列）

| 想改什么                            | 文件                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 台词、选项（含文字）                | `src/story/narrative.ts` 的剧本数组（文本内联；一个短名派生全部 id——加一句只改这一处）                                                |
| 场景构图（层级/站位/外观/cue 绑定） | `src/scenes/opening/opening.authoring-scene.json`（Inspector 支持有限字段，其余直接编辑）+ `src/scenes/opening/motions/*.motion.json` |
| 界面文案、多语言覆盖                | `src/content/presentation.ts`（textId → 文本；剧本条目自动并入，其他语言按同 textId 覆盖）                                            |
| 舞台内容与渲染器绑定                | `src/content/presentation.ts` 的 `templateStageContentCatalogV1` + `src/ui/stage-renderers.tsx`                                       |
| 玩法规则与命令                      | `src/game/simulation.ts`（`template.inventory` 是可替换的空壳模块）                                                                   |
| 玩家可见的动作目录                  | `src/application/semantic.ts`（Advanced 层）                                                                                          |
| UI 布局与对话框样式                 | `src/application/composition.tsx`（Advanced 层——普通场景制作不改这里）                                                                |
| 模块清单与版本                      | `src/game/simulation-definition.ts`（manifest/contract revision）+ `src/story.ts`（package identity revision）                        |
| 网页标题与分享卡片                  | `metadata.json`（标题/描述/语言/主题色/分享图/favicon，构建时注入 `<head>`）                                                          |

## 剧本模型（不是 DSL，就是 TypeScript 数据）

块五种：`say`（对白，等玩家确认）、`stage`（场景 open/cue 或 `setAppearance` 舞台操作）、`choice`（菜单，选项可设 flag、可原子消耗金币）、`branch`（按已保存 flags 声明式路由，末条可为 else 臂）、`end`。场景条目还可声明存在期循环动效（`ambient`，如开场的薄雾漂移——普通 motion 文档在条目 settle 期间按表现时钟循环采样，纯表现、零权威字节）。剧本是**纯数据交互文档**，由 `src/story/narrative-kit.ts` 的 kit 编译（interaction-table 提案的 template 版）：一个短名派生 `node.*`/`interaction.*`/`text.*` 全部 id 且每个派生 id 都有显式覆盖位（迁移存量剧本可保 id 字节不变），默认语言台词直接写在块里；重名、同 id 异文本、未知 speaker、未解析跳转、坏 stage op 都在构造期报错。编译仍可产出只读 `NarrativeFlowGraph` 投影（带标签边 + 文档分组），但当前 Inspector 不提供 Flow workspace。原有 Regions/Chrome 编辑 UI 同样已退出；对应 JSON 数据与运行时合同仍保留，直接编辑并由检查/测试验证。Engine Lab（`e2e`）额外演示 `pause`/`barrier`/`custom` 三种边界与音频、玩家播放系统。

改完剧本的验证环（几秒钟）：

```sh
deno task typecheck && deno task test
deno task story simulate . --scenario opening
```

scenario 脚本与测试默认解析“当前待决交互”，中途插台词不需要重排编号；只有显式钉住 `expectedOccurrenceId` 的步骤（练 stale fence 用）才关心编号。改一个块的 `name` 等于换 id——存档历史引用 textId，改名当成有意破坏来做（或用块的 `textId` override 钉住旧 id）。

## 授权

模板和 SillyMaker 引擎代码是 MIT。复制出去的新 Story 可以为自己新增的代码与
内容选择授权，但独立分发时仍须保留 SillyMaker 的 MIT 文本，并让实际随包材料
要求的 notice 可通过产品内页面、伴随文件或稳定链接获得。`dist-web/` 可直接部署；
基线 HTML 已链接仓库维护的第一方 runtime notice 最小集合，但新增依赖仍由分发者
检查并补充。技术 manifest 仅在需要离线交接、完整性、签名或商店打包时使用。
