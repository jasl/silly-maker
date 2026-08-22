# Authorable chrome layout V1（铬布局文档与 Chrome workspace）实施计划

状态：**2026-08-22 开启并当日闭合（M0–M2 + 双消费者交付）**（所有者
当日接受提案，open questions q1–q3 全按建议采纳；明确定性为务实
V1——「下一轮引擎迭代再统筹更系统的方案（如果存在）」，本车道不是场
景/物体/交互统一抽象的终局裁决）。合同：
`docs/engine/proposals/authorable-chrome-layout.md`（闭合记录在提案状
态段）。M0（Story 侧布局文档）于同日在外部实验仓先行交付，零引擎改
动；M1（引擎家族 + index + lint + CAS 端口）与 M2（Studio Chrome
workspace 加 `StudioBindingV1.chrome` fixture 加 template HUD 仓内消
费者，浏览器验收为 template.spec.ts 的 chrome M2 用例：拖框 → 保存 →
落盘毕业 `human_tuned`）同日合入；外部实验仓 HUD 同日迁移到引擎家族
（`main-hud.chrome-layout.json` + 引擎 parser，本地解析器删除，全量
vitest 绿）。M3 按证据门保持未开。本文只拥有切片顺序、admission 落地
与验收；
[production-floor sequence](2026-07-30-production-floor-sequence.md)
仍是唯一跨计划排序入口。

## Admission 裁决（车道开启时固化）

- **家族形状镜像 regions。** `sillymaker.chrome-layout` 格式 +
  `.chrome-layout.json` 后缀 + `layout.` id 前缀（≤96、
  `^layout\.[a-z0-9_.-]+$`）+ exact-record 严拒未知键 + `authoring`
  块（`generated | human_tuned`、`locked`、`notes`）与保存毕业纪律
  同款。空文档（零条目）合法——Studio 新建文件的起点。
- **三节都进 V1（q2）。** `boxes`（带尺寸的摆放/命中框）、`anchors`
  （只定位不定尺寸的点）、`offsets`（命名整数标量）；坐标是逻辑画布
  空间安全整数（±1_000_000，尺寸 ≥1），负位合法（停靠露头就是负
  位）；三节条目总数 ≤256。条目名 1..96，无强制前缀（点分层级是惯
  例不是 admission）。名字唯一性按节内 JSON 对象天然保证，节间不共
  享命名空间。
- **端口路由走 motion/scene 风格。** `/__sillymaker/dev-sources/
  chrome-layout`（GET ?path= / POST）+ `/chrome-layouts`（GET 列
  表）；regions 的 `-document` 后缀是因为「regions」本身已是复数，
  chrome-layout 可自然复数。CAS 纪律逐条同款：sha256 磁盘字节
  digest、409 `digest_conflict`、tmp+rename 原子写、256 KiB 载荷上
  限、create 走 stem↔id 与 index 唯一性、同源守卫前置。
- **文档粒度按 surface（q1）。** 一份 HUD 一份文档；聚合需求出现再
  并，不做全局注册大文件。
- **Studio 预览 = Story 声明的 chrome fixture + 引擎线框回退
  （q3）。** `StudioBindingV1` 增可选 `chrome`（fixture 声明
  `layoutId` + `render(draft)`：用闭包里冻结的样例数据渲染**真实
  chrome 组件**，几何读传入的草稿文档）；无 fixture 的文档仍以纯线
  框（框/锚点轮廓）完整可编辑。引擎不猜发布形状，也不复用
  FixtureBrowser（那是锚定活会话的调试件）。
- **布局文档零权威。** 不进 Save/digest/replay；行为布尔、占用规
  则、合法性留 Story 代码。「停」节沿用提案。

## 里程碑

- **M1 引擎家族 + 工具链**：base `parseChromeLayoutDocumentV1` +
  格式/版本常量 + `chrome_layout_*` 诊断（`PresentationDataError`，
  与 regions 同族助手）+ story barrel 别名；authoring index 第四后
  缀与 `chromeLayouts` 桶；story check 四码 lint
  （`chrome_layout.document_json_invalid` / `document_invalid` /
  `id_duplicate` / `id_filename_mismatch`）；dev-server CAS 端口 +
  `devSourcesPluginV1` 注册 + 同源守卫覆盖；features /
  story-authoring / authoring-quickstart 文档段（顺手把
  design/authoring-architecture.md 的 index 形状补上 regions 与新家
  族）。
- **M2 Studio Chrome workspace + 双消费者**：studio 侧 chrome IO +
  文档会话；workspace 区（文档列表/新建、画布预览、框拖动/角柄缩
  放/锚点拖动、offsets 检查器、undo/redo/脏门、毕业保存、409 提
  示）；`StudioBindingV1.chrome` + 生成入口第四 IO；仓内消费者 =
  template HUD 盒（几何进 `*.chrome-layout.json`，运行时与 Studio
  同一文档）；外部实验仓 HUD 从本地解析器迁移到引擎家族（第二消费
  者）。
- **M3 意图绑定 widget**：不在本车道，证据门另立（提案 §4）。

## 验收

- 非法文档按稳定诊断码拒绝（格式/版本/id/label/画布/条目名/尺寸/
  上限/未知键各至少一条测试）；合法文档变更零 Save/digest/replay
  接触；
- story check：重名 layoutId 与文件名失配各报 lint；index / lint /
  端口同一走树纪律（node_modules 与点目录跳过）；
- CAS：stale digest 409 且磁盘字节原样；create 对已存在 / stem 失
  配 / 重复 id / 越界路径拒绝；写为 tmp+rename 原子改名；
- Studio：拖 template HUD 盒 → 保存 → 文档落盘且毕业
  `human_tuned`；无 fixture 的文档线框可编辑；draft 冲突提示可恢
  复；
- 克隆：HUD 文档换引擎 parser 后全量 vitest 绿，本地解析器删除。

## Defer

- M3 widget 层（证据门：第二个需要声明式图标按钮的真实消费者）；
- 跨文档引用 lint（chrome 文档引用资产/文本 id 的存在性检查）；
- 每 workspace 聚合视图与多文档批量操作。

## Stop conditions

沿用提案「停」节：布局文档获得路由权 → 停；行为布尔/占用规则进文
档 → 停；出现第二套 retained-mode UI 系统或全局 UI 场景图 → 停；运
行时从 DOM 反测几何写回 → 停。
