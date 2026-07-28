# 本地参考资料登记表

日期：2026-07-10
作用：记录被 `.gitignore` 排除、但会影响研究判断的本地资料

本表只记录溯源和项目内部使用边界。根许可证不能证明压缩包内每个第三方工具、翻译、图片或附加内容都具有相同许可；直接使用任何内容前仍需逐项确认。

## `references/degrees-of-lewdity`

| 字段     | 值                                                                                       |
| -------- | ---------------------------------------------------------------------------------------- |
| 类型     | Git 源码 checkout                                                                        |
| 上游     | `https://gitgud.io/Vrelnir/degrees-of-lewdity.git`                                       |
| 取得日期 | 未记录；首次登记 2026-07-10                                                              |
| revision | `3ecf56d7337e76a0bdf9f5284c483d7ecdd511d0`                                               |
| tag      | `0.5.10.12`                                                                              |
| 根许可证 | CC BY-NC-SA 4.0，见本地 `LICENSE`                                                        |
| 当前用途 | 只读研究时间、事件、存档、构建和调试工具需求                                             |
| 禁止用途 | 不复制代码、文本、资源、schema、常量或独特数据结构；不进入构建、测试、fixture 或代码生成 |

研究记录：`degrees-of-lewdity-notes.md`；2026-07-28 对照复查：`2026-07-28-dol-engine-gap-review.md`。

## `references/DoL-0.5.10.12-Lyra-1.0.8a-besc-hikari-0628`

| 字段                  | 值                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 类型                  | 非 Git 的中文本地化发行目录，包含编译 HTML 与说明文件                                                                                               |
| README 指向的上游     | `https://github.com/Eltirosto/Degrees-of-Lewdity-Chinese-Localization`                                                                              |
| README 宣传的下载页   | `https://eltirosto.github.io/Degrees-of-Lewdity-Chinese-Localization/download.html` 与 GitHub `releases/latest`；不能证明当前目录实际来自其中任一处 |
| 取得日期              | 未记录；首次登记 2026-07-10                                                                                                                         |
| 实际取得来源          | 未知；若用户以后找到下载记录，应补充原始 release asset URL                                                                                          |
| 目录版本线索          | `DoL 0.5.10.12`、`Lyra 1.0.8a`，以目录名为准，未独立验证                                                                                            |
| 根许可证              | CC BY-NC-SA 4.0，见本地 `LICENSE`                                                                                                                   |
| 额外条款              | 本地 `README.md` 与 `CREDITS.md` 含发布、汉化和贡献者说明，不能假定全部内容仅受根许可证约束                                                         |
| 快照规模              | 42,177 个文件，242,998,557 bytes                                                                                                                    |
| 完整 manifest SHA-256 | `ee47cad904f231a58357a3ceb1d9b4d1b3ef9deb228657b7e774077a349b1c9f`                                                                                  |
| 编译 HTML SHA-256     | `31ee16ddc778ca1286de3b557d82a50cb1958024f43fd0b6a7613268b91e1bbe`                                                                                  |
| README SHA-256        | `ecb78a821a095874805b5324547baa224b2e146abcef1b31795af285dd120293`                                                                                  |
| CREDITS SHA-256       | `b9290bd217e8880cad594182d9fdf5d868a6ba0a82a437ae2ca8894205b20de2`                                                                                  |
| LICENSE SHA-256       | `224266396581e902e6828d34924537b3d2f094355e6dbc74ceedcaa4196dc361`                                                                                  |
| 当前用途              | 登记存在；当前工程研究不需要该发行包                                                                                                                |
| 禁止用途              | 不打开游戏内容用于提取文本/资源；不复制汉化、图片、编译产物或 Mod；不进入构建、测试或代码生成                                                       |

完整 manifest 在该发行目录内用以下命令生成；路径保留 `./` 前缀，并使用 C locale 排序：

```sh
find . -type f -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256 | shasum -a 256
```

## `references/renpy`

| 字段             | 值                                                                                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 类型             | Git 源码 checkout                                                                                                                                                                                                                                        |
| 上游             | `https://github.com/renpy/renpy.git`                                                                                                                                                                                                                     |
| 取得日期         | 2026-07-14，由本地 Git clone reflog 核验；首次登记 2026-07-19                                                                                                                                                                                            |
| branch           | `master`；上游 README 将其定义为面向下一次 feature release 的开发分支，而非稳定发行分支                                                                                                                                                                  |
| revision         | `09f67c6d1721cb8652cebf5507bbc43457a8c2a7`                                                                                                                                                                                                               |
| describe         | `8.5.3.26051504-601-g09f67c6d1`；HEAD 比最近 tag `8.5.3.26051504` 前进 601 commits，HEAD 本身没有 tag                                                                                                                                                    |
| 许可说明         | checkout 没有根 `LICENSE` 文件；根 `README.rst` 链接 Ren'Py 在线许可页，本地 `sphinx/source/license.rst` 是对应文档源。该文件说明大部分 Ren'Py 受 MIT 许可，部分衍生代码受 LGPL 许可，二进制还可能包含多种独立许可的第三方组件；逐文件版权和许可说明优先 |
| README SHA-256   | `c10644bd874b798e8f84d8614df2e0f4317f790785bd2ed21a32dc45e7f0fb15`                                                                                                                                                                                       |
| 许可说明 SHA-256 | `b5d4610dfb530c53d5ce681e913f313903948616eb7b4ff8e8ddd19337852c1e`                                                                                                                                                                                       |
| 当前用途         | 只读研究成熟 Visual Novel 引擎的一般能力边界和创作工作流，包括舞台、图层与稳定标签、转场和演出生命周期、交互暂停、历史、已读、自动与跳过、音频意图、保存、加载与回滚，以及预测和开发工具；只形成独立需求与设计判断                                       |
| 禁止用途         | 不复制或改编代码、文本、素材、schema、常量、命名体系、文件布局或独特数据结构；不进入生产 import、扫描、构建、测试、fixture、生成器、Image Gen 输入、截图或 Artifact；SillyMaker 实现必须依据自身需求和自有测试独立设计                                   |

研究记录：`renpy-engine-study.md`。

## `references/openui`

| 字段            | 值                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 类型            | Git 源码 checkout（monorepo：语言规范文档、解析器/渲染器包、示例）                                                                               |
| 上游            | `https://github.com/thesysdev/openui.git`                                                                                                        |
| 取得日期        | 2026-07-29 登记；本地 clone HEAD 提交于 2026-07-28                                                                                               |
| revision        | `5266f735ced4bad825a83eb5d32e3a43f72dc513`                                                                                                       |
| 根许可证        | MIT（Thesys Inc.），见本地 `LICENSE`                                                                                                             |
| LICENSE SHA-256 | `b6bdd2d3d161722fb3f3afc039114cfa9f3236f036e1c98e0853bc3a85f6cd9e`                                                                               |
| README SHA-256  | `0bc4bcb1c623f82d200a5a6f7002800ae6b29542728f31d0c55a50d2995cd73c`                                                                               |
| 当前用途        | 只读研究 Generative UI 开放标准（OpenUI Lang 语言、流式解析/渲染、组件库合同、Action/工具事件模型），评估与 SillyMaker 语义表现层的兼容性        |
| 禁止用途        | 不从 checkout 复制代码、schema 或文档进入本仓库；不进入构建、测试、fixture 或生成器。若未来集成，作为普通 npm 依赖消费其发布包（保留其自身条款） |

研究记录：`2026-07-29-openui-genui-support.md`。

## 新增资料流程

把新资料放入 `references/` 后，在使用前补充：

1. 来源 URL 与取得日期；
2. Git revision、发行版本或关键文件摘要；
3. 根许可证与额外 README/CREDITS 条款；
4. 资料类型：源码、发行包、本地化、素材或工具；
5. 本项目允许的研究范围；
6. 明确禁止的复制、再分发和构建依赖。

## `references/YouYeColored-Imouto_Life_Fantasy-v1.2.5-ArchiDreamZ-v2025.10.5`

| 字段     | 值                                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 类型     | RPG Maker MV 游戏发行目录（`assets/www` 标准布局：data/js/img/audio）                                                             |
| 上游     | 《妹相随/Imouto Life Fantasy》的民间 RPG Maker 重制中文版；原作版权归原开发者，重制与汉化未经确认授权，**版权状态不明**           |
| 取得日期 | 2026-07-28 登记                                                                                                                   |
| 版本标识 | 目录名内嵌 `v1.2.5` 与 `ArchiDreamZ-v2025.10.5`                                                                                   |
| 根许可证 | 无有效许可声明；按最严格假设处理                                                                                                  |
| 当前用途 | 只读研究：SLG（日程/数值/触摸/回忆）游戏的系统结构、数据组织方式与规模量级，用作 SillyMaker 能力缺口分析输入                      |
| 禁止用途 | 不复制任何剧情文本、图像、音频、事件脚本、变量表或独特数据结构；不作为复刻任务书素材；不进入构建、测试、fixture、生成器或任何产物 |

研究记录：`2026-07-28-imouto-rpgmv-gap-analysis.md`。
