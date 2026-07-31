# Story CLI

应用是自包含项目（各自的 `sillymaker.config.ts` 与 `vite.config.ts`）。构建是应用任务、在应用目录内运行；story CLI 承担诊断与仓库级聚合（在应用目录内 `deno task story <verb> .` 即选中该应用）。

## 应用目录内

| 命令                                      | 作用                                                                                                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deno task dev`                           | 本应用的 Vite 开发服务器                                                                                                                                              |
| `deno task build:web`                     | 生产 Player 构建到 `dist-web/`（`build` 是它的别名）                                                                                                                  |
| `deno task build:desktop [--target <t>]…` | 桌面包到 `dist-desktop/`（默认本机 `.app`；triple 交叉编译 `.app`/`.msi`/`.AppImage`；已知应用版本与 git commit 时附加到文件名，如 `App-0_1_0-abc1234-<triple>.msi`） |
| `deno task preview`                       | 用 HTTP 预览 `dist-web/`（`file://` 无法加载 ES module）                                                                                                              |
| `deno task story <verb> .`                | 应用内诊断：`inspect`、`check`、`simulate`、`dev --smoke`、`prebuilt-smoke`、`diff`                                                                                   |

`build:desktop` 把追加参数透传给打包动词：`--target <os-arch-triple>`（可重复）、`--compress[=xz|lzma|zstd]`、`--profile <release|debug>`。本地文件 store 尚未通过 durability promotion。

## 仓库根（工作区聚合）

| 命令                                               | 作用                                                 |
| -------------------------------------------------- | ---------------------------------------------------- |
| `deno task story check <app>` \| `--all`           | 结构化 Story 诊断                                    |
| `deno task story simulate <app> --scenario <name>` | 经 Agent 端口的 headless 脚本通关                    |
| `deno task story simulate … --trace <dot.paths>`   | 报告附加每步数值轨迹                                 |
| `deno task story inspect <app>`                    | 解析后的 Story 身份与组合报告                        |
| `deno task story diff <a.json> <b.json>`           | 两个 JSON 文件的结构化对比（存档、报告）             |
| `deno task story build <app>`                      | 从根构建一个已注册应用（CI 聚合）                    |
| `deno task story desktop <app>`                    | 从根为已注册应用做桌面打包                           |
| `deno task story dev <app>`                        | 单应用 Vite 开发服务器（`--smoke` 启动、探活、退出） |

## 仓库级

| 命令                                                                | 作用                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `deno task check`                                                   | 格式检查、lint、类型、全部单测、资产与 Story 检查                |
| `deno task test:e2e`                                                | 浏览器一致性套件（Chromium、WebKit、触摸 project）               |
| `deno task desktop:save-server --dist <app>/dist-web --saves <dir>` | preview 回环服务器，使用经校验的本地文件记录（`?records=local`） |
| `deno task docs:dev` / `docs:build`                                 | 本文档站                                                         |

种子让模拟可复现：`--seed <uint>` 转发给应用的引导熵。
