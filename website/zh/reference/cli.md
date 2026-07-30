# Story CLI

所有命令都在仓库根目录经 Deno task 运行。

## 日常

| 命令                                               | 作用                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| `deno task story dev <app>`                        | 单应用 Vite 开发服务器（`--smoke` 启动、探活、退出）                    |
| `deno task story check <app>` \| `--all`           | 结构化 Story 诊断                                                       |
| `deno task story simulate <app> --scenario <name>` | 经 Agent 端口的 headless 脚本通关                                       |
| `deno task story simulate … --trace <dot.paths>`   | 报告附加每步数值轨迹                                                    |
| `deno task story build <app>`                      | 生产 Player 构建到 `<app>/dist-web`                                     |
| `deno task story desktop <app>`                    | macOS `.app` 打包 preview；本地文件 store 尚未通过 durability promotion |
| `deno task story diff <a.json> <b.json>`           | 两个 JSON 文件的结构化对比（存档、报告）                                |
| `deno task story inspect <app>`                    | 解析后的 Story 身份与组合报告                                           |

## 仓库级

| 命令                                                                | 作用                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `deno task check`                                                   | 格式检查、lint、类型、全部单测、资产与 Story 检查                |
| `deno task test:e2e`                                                | 浏览器一致性套件（Chromium、WebKit、触摸 project）               |
| `deno task desktop:save-server --dist <app>/dist-web --saves <dir>` | preview 回环服务器，使用经校验的本地文件记录（`?records=local`） |
| `deno task docs:dev` / `docs:build`                                 | 本文档站                                                         |

种子让模拟可复现：`--seed <uint>` 转发给应用的引导熵。
