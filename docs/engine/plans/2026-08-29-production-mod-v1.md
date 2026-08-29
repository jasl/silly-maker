# Production Mod V1 计划

状态：**2026-08-29 经所有者接受并完成 M0–M4。**

[Production-floor sequence](2026-07-30-production-floor-sequence.md) 是唯一跨计划排序入口。本计划接续已关闭的
[VN Genre Mod、History Mod 与作者工作流](2026-08-29-vn-genre-mod-authoring.md)，拥有受支持的公共
build-time Mod 合同、仓外 package 消费，以及第一个发布后 declarative Mod 产品纵切。它不以一个虚构的 VN
玩法开关冒充 authoritative gameplay Mod，也不建设 marketplace、目录扫描、npm runtime resolver 或不可信代码
sandbox。

## 1. Gate 裁决与范围

所有者要求先完成生产 Mod 能力。计划接受时，统一 surface lifecycle、Save migration、Snapshot
中性规模合同和无万能 `install(context)` 的 resolver 形状已经具备，仓外 package smoke 尚未具备；M2
已补齐该缺口。真实经营/时间经济产品预算与第二个 authoritative gameplay Mod 消费者仍不存在。

因此本轮激活两条已有真实消费者支撑的能力：

- **Stage A：** 公共、build-time trusted Mod metadata/resolver/runtime 合同；应用显式选择可信 package，候选
  generation 经完整 publication acknowledgement 换代，未选择时可从 final graph 结构排除；
- **Stage B：** 发布后 declarative text/asset override Artifact；产品显式取得并启用受约束数据，经过一次
  admission、目标/版本/引用闭包与预算校验后再创建 successor。

同 realm trusted code Artifact 的通用安装格式、任意远端 executable 和 authoritative gameplay Mod 的动态 R2
产品晋级继续等待真实消费者。现有 R2 exact Save + lease handoff substrate 保留；本计划不得为满足 checklist
而拆分《最后一次试音》的 Narrative/Stage 权威。

## 2. 边界

```text
external Mod package
  -> public Mod metadata + typed contributions
  -> application-selected public resolver/runtime
  -> application-owned extension points and publication

post-release declarative Artifact bytes
  -> bounded decode/admission
  -> explicit target/version/override slot
  -> product content/asset successor
```

- public Mod API 不暴露 Direct lifecycle、Context、service locator、Host、Session、Save 或 source IO；
- metadata 与 resolved manifest 是 JSON-safe 诊断/身份数据，live handle 不进入 manifest、State 或 Save；
- unrelated Mod 顺序 canonical，required/optional/conflict 与 contribution collision 失败语义明确；
- public async resource handle 必须在 rollback、successor retirement 和 application close 时被等待；
- Stage B 只允许具名 override slot，不以 duplicate ID + last-wins 实现覆盖；
- text/asset override 不改变 authoritative State、Snapshot、History、Save 或 replay；R2 retirement 开始前
  的 admission、资源、resolution 与 publication failure 保留 live predecessor。R2 disposal 开始后的
  release failure 是 terminal；release 成功后的 Web successor 启动失败只保留当前 controller selection
  与 exact retryable handoff，旧应用不再 live；
- production 是否包含 resolver/loader/manager 由产品显式选择，普通 Template 与未选择产品结构排除。

## 3. 里程碑与验收

### M0 — 合同与当前事实

- 记录本 gate 裁决并激活本计划；
- 修正 live architecture 中“尚无端到端产品 consumer”的过时描述；
- 把 Vite 8.2.1 已弃用的 `advancedChunks` 等价迁移到 `codeSplitting`，保持现有 chunk 语义。

### M1 — 公共 Stage A Mod 合同

- 交付受支持的 public Mod subpath，类型名与 exports 不穿透 `internal/*`；
- metadata 包含 contract revision、Mod ID/version、engine API、required/optional/conflict 与 facet；
- resolver 输出 canonical active order、typed compiled points 与 detached readonly resolved manifest；
- duplicate、missing/cycle/conflict/kind/target/collision/load/compile/setup/publication failure 均保留 predecessor；
- public setup/dispose handle 接入既有 lifecycle，不建立第二个 runtime；
- History 与 Engine Lab conformance 迁移到公共入口，旧 private Mod export 删除。

### M2 — 可发布 package 与仓外消费

- 产生包含 JavaScript、`.d.ts`、source maps、适用 exported assets 和发布用 manifest 的 package Artifact；
  export 不指向 `src/**`；
- workspace dependency 转为精确 package version，保留 Browser/Deno 条件与 side-effect 声明；
- 临时仓外 consumer 从 tarball 安装，在 Deno 运行 public resolver，并由 Vite 构建及真实 Browser 执行；
- package 构建不发布远端、不修改 registry，也不把一次 smoke 冒充已经上线 npm。

### M3 — VN declarative text/asset Mods

- One Last Sound Check 提供一个产品显式选择的 post-release declarative Mod 入口；
- Artifact 有有界格式、目标 application/version、具名 text/asset override 与资源预算；
- enable/disable/reload 创建 immutable selection successor，并遵循 §2 的 R2 两阶段失败边界；
- locale-addressable 文本和一项素材覆盖通过现有 Text/Asset owner 生效，不改 Narrative/Stage State 与 History；
- core production 结构排除 manager/decoder/artifact，Mod-enabled production 显式包含；
- 产品合同验证 enable/disable/reload、错误恢复与 Save/History 不变；Chromium/WebKit 从真实
  `dist-web-mods` 预构建验证非空中文文本和 WebP 素材覆盖。该产品特定数据路径不新增 Desktop Host 能力，
  本计划不借机晋级 Desktop production。

### M4 — 收口

- public type tests、resolver/property/lifecycle tests、仓外 smoke、build graph、VN unit/Browser/prebuilt evidence；
- `deno task check`、`git diff --check` 与 applicable React audit；
- 独立复审 admission ownership、热路径 lookup、无依据上限、重复 runtime/State/Save、final-graph exclusion；
- 同步 architecture/features/development/build/roadmap/Mod design 与 Template classification，再关闭本计划。

## 4. 明确不属于本轮

- public marketplace、目录扫描、npm runtime resolution 或自动发现；
- 不可信代码 sandbox、签名即安全、权限模拟或 same-realm 行为拦截；
- 通用 `.sillymod` 压缩容器、远端 registry、账户、审核或更新服务；
- 为证明 R2 而制造 VN 规则、State slot 或第二套 Simulation；
- Desktop durability/签名/商店发布、Ren'Py 能力补齐、SillyOS Agent/数据库工作。

## 5. 关闭记录

M0–M4 在同一轮关闭：

- `@sillymaker/composition/mod` 是受支持的 focused public entry；metadata admission、显式 catalog、
  dependency/conflict/collision resolution、cold compile、async setup/dispose 和 acknowledged selection successor
  共用既有 private Direct lifecycle，没有第二套 Context、service locator、State、Save 或 runtime；
- Base、State 与 Composition 先 emit JavaScript、declaration 和 maps，再生成过滤 private export、移除
  `workspace:*` 的 staged manifests。临时仓外项目只从本地 tarball 安装，并通过 Deno check/run、Vite build 与
  Chromium runtime；这不是 npm 发布、SDK distribution 或 registry 可用性声明；
- One Last Sound Check 的 Stage B 是产品私有的 exact-target text/image 格式与独立 production build，不是
  engine-wide manifest/container。选择文件不存在时为空集，普通 production build 完全结构排除 decoder、
  manager、selection 与 Artifact；
- Template 不改。它继续作为不选择 public Mod runtime 的完整 structural negative control；
- Vite 8.2.1 chunk 配置从已弃用的 `advancedChunks` 等价迁到 `codeSplitting`，没有改变分组意图。
- 删除从 private Extension 沿用到 public Mod identifier 的无依据 128 字符硬上限，并按普通 JavaScript
  semantics 删除 resolved manifest 的递归 freeze；公开合同保留 detached readonly 数据，不把防御性实现形状
  固化成 ABI。

本轮明确没有交付 public package discovery/installer/marketplace、实际 npm release、更广 facet SDK、
authoritative gameplay R2 Mod adapter、trusted post-release executable、任意远端代码、same-realm sandbox 或
Desktop production qualification。authoritative gameplay R2 继续等待真实产品消费者，不以 VN 路线伪造。

关闭验证：

- `deno task check`：格式、typed lint、Stylelint、全仓 typecheck、determinism、393 个测试文件/5,530 个测试、
  6 个 Composition/State benchmark、仓外 package smoke、runtime assets、全部应用静态检查与 E2E release build
  通过；
- focused public Mod/extension/VN Mod suite：7 个测试文件/44 个测试通过；
- 真实 `dist-web-mods` 预构建在 Chromium 与 WebKit 分别通过，用户可见的 `【Showcase Mod】` 文案与
  425×428 WebP Blob 素材均生效，页面与控制台无错误；
- 完整 Examples Playwright suite 在 Chromium、WebKit 与 mobile-portrait 项目中 65 项通过、2 项按既有项目
  过滤规则跳过；新增预构建服务没有干扰 Template、SillyOS 或普通 VN 路径；
- 普通 VN build 为 465 modules，查不到 declarative selection/manager/decoder 标记；显式 Mod build 为
  481 modules，并包含非空 selection、manifest、完整 text pack 与 WebP；
- React audit 的 9 条提示经源码分类：8 条属于冷路径确定顺序/小集合遍历，Blob URL 在构造失败、loader
  dispose 与校验 `finally` 中均有显式回收，不构成未修复问题；
- `git diff --check` 通过。独立复审没有发现新的 blocker、热路径负担、重复 authority 或无依据硬限制。

完成后没有自动激活后继 lane。
