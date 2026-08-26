<!-- SPDX-License-Identifier: MIT -->

# Electronic Pet Reference Product

这是 SillyMaker 的原创电子宠物 Reference Product。**M1 的 3D runtime 与作者闭环、M2 的权威领养与
照料循环均已实现；M3 已完成首个产品视觉与宽窄屏构图切片，完整产品仍是 WIP。** 它从当前
`template/` 工程形状创建，但已经移除模板的雨夜 Narrative、coin、2D opening、Chrome、
reference outer UI 和对应测试，不把 starter 占位能力伪装成产品能力。

产品合同与执行顺序分别见：

- [`docs/game/electronic-pet.md`](../../docs/game/electronic-pet.md)
- [`docs/engine/plans/2026-08-27-electronic-pet-reference-product.md`](../../docs/engine/plans/2026-08-27-electronic-pet-reference-product.md)

当前实现包含到家、观察、第一次靠近与跨会话形成日常的早期关系闭环，8/16 个自主行为、脸/颈/背
3/8 类互动、逗猫棒 1/3 种玩具，以及 `accept | tolerate | warn | refuse` 四类结果表现。Save/reopen、
重置确认、有界离线结算和回归摘要由同一个权威 State/Session owner 持有。直接抚摸与逗猫棒玩法只接受
鼠标/触控 Pointer Events；键盘继续服务普通 DOM UI，不模拟抚摸，手柄不属于产品输入分母。

尾根仍保留“高个体差异敏感区”的设计政策，但当前没有 authored volume、runtime binding 或 gameplay
rule；它明确 defer，不作为 M2 已实现互动。腹部、梳理、另外两种玩具、后期关系、完整内容与产品打磨仍由
M3–M5 承担。
在完整产品分母、作者任务、产品证据和独立审查关闭前，本项目不能被称为完整游戏，也不会
替代当前旗舰 Cat Cafe。

## 开发命令

```sh
deno task dev
deno task check
deno task test
deno task build:web
deno task build:desktop
deno task preview
deno task clean
```

完整产品检查 `deno task check` 先运行共享 Story `app check`，再运行产品本地 PetScene compiler，因而会报告
重复/缺失/孤立 Object 与代码绑定。仓库根目录的 `deno task app check example-electronic-pet` 只负责共享 Story
和通用作者 source family；其他 `app` verb 仍可从根目录按 application ID 选择本应用。开发服务器的
同源 `/__sillymaker/inspector/` 是仅开发期 Inspector；同页嵌入式 Inspector 通过产品私有的只读 runtime
publisher 显示 activity/reason、mood、needs 与关系摘要，但没有 gameplay command/write authority。独立
Inspector 没有同页 Player 时只编辑作者场景。普通 Player 构建不得包含 authoring UI 或 source-write
implementation。

## 当前工程边界

- `src/game/`：唯一权威 Game State、commands、rules 与 projections；
- `src/application/`：Browser/Deno Desktop 共用的应用组合与 Host 绑定；
- `src/presentation/`：Three renderer、资源与动画映射、gesture 聚合和瞬时表现状态；
- `src/authoring/`：产品作者文档、cold compiler、Inspector binding 与 structured operations；
- `src/tooling/`：开发服务器期产品 source IO；
- `assets/`：应用自有且许可兼容的 runtime 模型、贴图和媒体。

权威 State 不读取 DOM、Three object 或墙钟；renderer 不复制 gameplay authority。每个可创作对象
必须能从 stable object ID 定位到资源、renderer、interaction、代码 owner 和 source。详见
[`DESIGN.md`](./DESIGN.md)。

## 许可

本项目代码与自有文本采用 MIT，`examples/*/assets/**` 下的项目原创媒体素材遵循仓库统一的
CC0 1.0 范围。当前 M1 引入的
`assets/models/electronic-pet-cat-m1.glb` 是为本项目原创生成的低多边形猫模型，不包含第三方
模型或贴图；它的网格、基础材质、简化骨架和 `Idle` 动画由 Three.js r185 程序化构造，再由
`THREE.GLTFExporter r185` 导出为单文件 GLB。这里保留的是普通制作说明，不维护独立的素材
provenance 或再生成系统。

后续模型、贴图、音频和其他素材在进入仓库前仍须具有明确兼容许可，并在本项目的设计或标准
notice 表面记录。`references/Meow-Generator` 只可作为未跟踪研究输入，不得复制其代码、素材、
命名、测试或工程结构。
