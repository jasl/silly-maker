<!-- SPDX-License-Identifier: MIT -->

# Starter template Story

这是一个可以直接游玩的 scene-first 最小 Story，也是开新游戏的起点。先玩起来，再进 Studio 改场景：

```sh
deno task dev        # 启动游戏（根目录可用 deno task author template）
```

打开游戏 → 设置 → 开发者工具 → **调试 → 场景 → Studio**（同源新标签，进行中的会话继续跑）。在 Studio 里可以直接拖动小梅、改缩放、换入场动画，保存后运行中的游戏 HMR 生效，`git diff` 只会出现 `src/scenes/opening/opening.scene.json`（以及编辑过的 `*.motion.json`）。场景文档是构图/站位/cue→motion 绑定的唯一作者权威；剧本只引用 cue。

复制本目录、全局替换 `template`/`Template` 为你的故事名、改好 `sillymaker.config.ts`，即可开始创作——副本本身就是完整项目（自带 `vite.config.ts` 与本地 story CLI）。在本仓库内开发时，把目录加进根 `project.config.ts` 清单；在仓库外开发时，把 `package.json` 里的引擎依赖改为相对 `file:` 路径并在 `deno.json` 设 `"nodeModulesDir": "manual"`。

## 现在就能跑

```sh
deno task story check .                              # 结构化 Story 诊断（含 scene/motion lint）
deno task story simulate . --scenario opening        # 无浏览器跑完整叙事
deno task test                                        # 基线 + 图 lint + 全剧本走通
deno task dev                                         # 在本目录启动开发服务器
deno task build:web                                   # 静态构建到 dist-web/（`build` 是它的别名）
deno task build:desktop                               # 桌面 preview 到 dist-desktop/（可加 --target <triple>）
deno task preview                                     # 用 HTTP 预览 dist-web/
deno task clean                                       # 清理 dist-web/ 与 dist-desktop/
```

## 文件地图（按"你想改什么"排列）

| 想改什么                           | 文件                                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 台词、选项（含文字）               | `src/narrative.ts` 的剧本数组（文本内联；一个短名派生全部 id——加一句只改这一处）                          |
| 场景构图（站位/缩放/入场动画绑定） | `src/scenes/opening/opening.scene.json`（推荐用 Studio 编辑）+ `src/scenes/opening/motions/*.motion.json` |
| 界面文案、多语言覆盖               | `src/presentation.ts`（textId → 文本；剧本条目自动并入，其他语言按同 textId 覆盖）                        |
| 舞台内容与渲染器绑定               | `src/presentation.ts` 的 `templateStageContentCatalogV1` + `src/stage-renderers.tsx`                      |
| 玩法规则与命令                     | `src/simulation.ts`（`template.inventory` 是可替换的空壳模块）                                            |
| 玩家可见的动作目录                 | `src/application/semantic.ts`（Advanced 层）                                                              |
| UI 布局与对话框样式                | `src/application/composition.tsx`（Advanced 层——普通场景制作不改这里）                                    |
| 模块清单与版本                     | `src/simulation-definition.ts`（manifest/contract revision）+ `src/story.ts`（package identity revision） |
| 网页标题与分享卡片                 | `metadata.json`（标题/描述/语言/主题色/分享图/favicon，构建时注入 `<head>`）                              |

## 剧本模型（不是 DSL，就是 TypeScript 数据）

节点五种：`say`（对白，等玩家确认）、`stage`（纯舞台变更）、`choice`（菜单，选项可设 flag、可原子消耗金币）、`branch`（按已保存 flags 纯路由，必须落在 `successors` 里）、`end`。剧本用 `src/narrative-kit.ts` 的 builder 书写：一个短名派生 `node.*`/`interaction.*`/`text.*` 全部 id，默认语言台词直接写在节点里；重名、同 id 异文本、未知 speaker 都在构造期报错。Engine Lab（`e2e`）额外演示 `pause`/`barrier`/`custom` 三种边界与音频、玩家播放系统。

改完剧本的验证环（几秒钟）：

```sh
deno task typecheck && deno task test
deno task story simulate . --scenario opening
```

scenario 脚本与测试默认解析“当前待决交互”，中途插台词不需要重排编号；只有显式钉住 `expectedOccurrenceId` 的步骤（练 stale fence 用）才关心编号。改一个节点的 `name` 等于换 id——存档历史引用 textId，改名当成有意破坏来做（或用 builder 的 `textId` override 钉住旧 id）。

## 授权

模板和 SillyMaker 引擎代码是 MIT。复制出去的新 Story 可以为自己新增的代码与
内容选择授权，但独立分发时仍须保留 SillyMaker 的 MIT 文本，并让实际随包材料
要求的 notice 可通过产品内页面、伴随文件或稳定链接获得。`dist-web/` 可直接部署；
基线 HTML 已链接仓库维护的第一方 runtime notice 最小集合，但新增依赖仍由分发者
检查并补充。技术 manifest 仅在需要离线交接、完整性、签名或商店打包时使用。
