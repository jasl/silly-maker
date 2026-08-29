# Mod composition and distribution

状态：2026-07-29 接受的目标设计，2026-08-29 按内核内聚与 successor-based hot swap 修订；
[Production Mod V1](../plans/2026-08-29-production-mod-v1.md) 已交付其中有真实消费者支撑的 public
Stage A 与产品特定 Stage B。`@sillymaker/composition/mod` 是受支持的 trusted build-time metadata/
resolver/runtime subpath；One Last Sound Check 的 Mod-enabled build 是第一个发布后 declarative text/image
override 纵切。通用 distribution/install protocol、post-release trusted code、authoritative gameplay R2
adapter 与 untrusted isolation 仍是 **incubation**。本文固定 Mod V1 的分层、组合、身份、存档和分发边界；
完整 facet/Save 目标不因 focused Stage A 已发布而自动实现。当前 Story 仍按
[architecture](../architecture.md) 与 [story authoring](../story-authoring.md) 显式组合，不能把
public runtime 描述成 package discovery、安装器或市场。执行优先级由 [roadmap](../roadmap.md) 与
[production-floor sequence](../plans/2026-07-30-production-floor-sequence.md)
控制；设计存在不构成 public M0 激活。当前
[VN Genre Mod、History Mod 与作者工作流](../plans/2026-08-29-vn-genre-mod-authoring.md) 先交付
focused History R1 consumer；Production Mod V1 随后把其 substrate 提升到 public Stage A，并补上 §11 的
仓外 package smoke，但没有宣称完整公共生态。

当前产品 Host target 是 Browser 与 Deno Desktop；Electron 仅为未来 adapter，Node.js server、
通用 CLI 和 headless runtime 不是产品 target。辅助 headless conformance 仍可验证无 UI 的 Base
facet。当前 Application Runtime AR1 对 private Extension Runtime 的 direct/Cordis-core-derived
比较不等于激活本文的 resolver、manifest、public ABI、SDK 或 distribution。

## 1. Goal

SillyMaker 需要让一个最终游戏或应用通过组合受支持的能力包来完成，而不是把
VN、经营、养成、卡牌、Agent 工作台或某个具体游戏继续堆进引擎核心。

Mod 是组合和生命周期机制，不是碎片化指标。所有产品能力原则上都可以落在 Mod 边界上，
但只有需要独立选择、换代、诊断、分发或结构排除的能力才应真的拆开。Engine kernel 按
authority 保持内聚；产品核心玩法也应由一个内聚 required Mod/领域拥有，围绕核心、可被省略或
替换的能力再作为 optional Mod 组合。一个按钮、reducer、State slot 或相互强耦合的小段逻辑不会
仅为“全插件化”各自成为 Mod。

目标形态：

```text
SillyMaker engine mechanisms
  + selected first-party or third-party Mods
  + product-owned rules, content and UI
  = one resolved Application
```

Mod 系统需要同时回答：

- 作者如何显式选择和组合能力；
- npm package dependency 与游戏语义依赖各自负责什么；
- 多个贡献如何确定性合并，冲突时如何失败；
- Mod 集合如何进入构建身份、诊断、Save 兼容和迁移；
- 发布后的内容包与可执行代码分别能开放到什么程度；
- VN 等一等能力如何随引擎交付而不被迫全部进入 kernel。

非目标：

- 不为 Mod 发明另一套 gameplay State、事件总线、service locator 或依赖注入容器；
- 不扫描 `node_modules`、不靠 import side effect 自动注册；
- 不以“最后加载者覆盖前者”解决命令、State、路由或 renderer 冲突；
- 不在同一个运行中的 Session/command queue 原地改写 Simulation Mod graph；影响权威领域的
  install/uninstall/upgrade 必须走 R2 successor + exact identity/Save migration 或 adoption；
- 不把任意同 realm JavaScript 描述成安全沙箱；
- 不把 Agent 生成的一份 UI、一个窗口或一次报表误称为 Mod。
- 不把外部后台、companion service 或 LLM 连接误称为 Mod；它们经 typed RPC boundary 接入。

### 1.1 Public activation gate and 2026-08-29 ruling

以下 gate 最初约束 public resolver/ABI/SDK/distribution。2026-08-29 的 owner ruling 将它拆开评估：统一
Surface lifecycle、Save migration、Snapshot 规模合同、无万能 `install(context)` 的 resolver 形状与仓外
package smoke 已足以激活 focused trusted build-time Stage A；History 与产品特定 declarative overrides 提供
两个正交消费者。真实经营/时间经济预算、第二个 authoritative gameplay consumer 和通用发布后 trusted-code
分发仍未满足，因此不随 Stage A 晋级。

1. Managed Surface 的全部 live families——Overlay、System、Narrative/History
   与 whole-canvas primary/detail——已迁移到统一 lifecycle authority，surface
   contribution registry 形状稳定且不再建立在平行 store 上；
2. Save migration registry、load order 与 maintained fixture corpus 已作为发布能力
   落地；
3. Snapshot 性能契约能承载目标经营/时间经济 workload；
4. 至少两个真实 first-party capability slice 需要被独立选择/分发，且复制 Story-local
   slice 已产生可量化维护成本；
5. 应用在仓库外通过公开 package exports build/test 的 smoke 已稳定；
6. prototype 不需要万能 `install(context)`、service locator、node_modules scanning
   或 load-order override。

当前 public surface 只包含 `defineSillyModMetadataV1`、显式 catalog resolver/runtime、typed extension points、
selection successor 与 async resource handle。它不包含 facet-wide State/Save migration SDK、package discovery、
下载、marketplace、runtime npm resolver 或通用 authoritative R2 adapter。后续能力仍必须满足其对应 gate 并由
真实产品接受新的实施计划。

可信 build-time identifier 只要求非空、trimmed 且不含控制字符；没有真实格式或 UX 预算时不得加入字符数
硬上限。文件型 Artifact 继续在自己的 ingress 以总字节、深度、节点数和资源预算约束不可信输入，两种边界
不得混用。

## 2. Vocabulary and layers

| Term               | Owns                                                                                                 | Does not mean                        |
| ------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Engine**         | 通用 definition/resolution、Session、确定性提交、Save、presentation primitives、Host 和 Mod resolver | 某个品类的全部成品玩法               |
| **GameplayModule** | Simulation 内的 State ownership、schema、规则能力与局部 invariant                                    | npm 包、UI 纵切或发布单元            |
| **Feature slice**  | 一个 Story 或 Mod 内按玩法内聚代码的目录/组织模式                                                    | 稳定公共 ABI 或自动激活单元          |
| **Mod**            | 跨 Simulation、content、semantic、presentation、UI 与 tooling 的受声明垂直贡献                       | package 名、动态脚本或第二套 runtime |
| **Package**        | 开发/构建期的物理代码分发、依赖安装和 exports                                                        | Mod 激活、Save 影响或语义兼容合同    |
| **Application**    | 显式选择的 Mod 集合、产品规则/内容、Host 配置与最终 composition root                                 | 自动发现的插件目录                   |
| **UI Artifact**    | 某次生成、编辑并提交的 UI 文档或前端预览及其不可变 revision                                          | 可安装、可依赖的 Mod                 |

一个 Mod 可以包含零个、一个或多个 GameplayModules，也可以只是 presentation、UI
或 tooling 贡献。反过来，一个 Story-local GameplayModule
不需要为了“看起来可复用”而立即变成 Mod。

Feature slice
是代码内聚方式。只有当一个纵切需要被独立选择、依赖、版本化、诊断或分发时，才值得提升为
Mod。

## 3. Composition boundary

Mod graph 位于现有 GamePackage、GameplayModule 和 Application composer 之上：

```text
package manager + lockfile
  -> explicit Mod metadata and selected facet imports
  -> resolve activation graph
  -> compose Base / UI / Web / Tooling facets at their existing boundaries
  -> ResolvedModManifest
  -> GamePackage / Core-UI-Web application definitions
  -> resolve Story
  -> create disposable Application instance and Session
```

Mod resolution 必须在 Story resolution 和 Application instance
创建之前完成。解析结果冻结后，当前 instance 只消费一个不可变的 resolved Mod
set。

一个逻辑 Mod 有一个身份，但不等于一个交给 Base 的万能对象。它可以按现有 package
dependency direction 暴露独立 facet entry：

```text
@example/management/mod       metadata, dependency and contribution summary
@example/management/base      Simulation/content factory; no React/DOM
@example/management/ui        React presentation and UI contribution
@example/management/web       browser Host adapter, when genuinely required
@example/management/tooling   supported-Host authoring/build tooling
```

不存在的 facet 不导出。辅助 headless conformance 只解析 metadata/Base，不能为了读取
Mod 身份而加载 React；Base resolver 永远不接收 UI/Web/Tooling
implementation。Web composition root 可以汇合已分别验证的 facet，但不能反向改变
package ownership。

需要分开的图至少有四张：

| Graph                           | Resolver                            | Meaning                                            |
| ------------------------------- | ----------------------------------- | -------------------------------------------------- |
| package/lock graph              | Deno/npm                            | 哪些物理包和精确版本已安装                         |
| Mod activation graph            | Mod resolver                        | 应用显式启用了哪些 Mod；required/optional/conflict |
| GameplayModule capability graph | Authoring Kit                       | typed `requires`/`provides` 如何绑定               |
| lifecycle graphs                | Authoring Kit / each facet composer | Module 与同 facet instance resource 的初始化约束   |

物理安装不产生激活；Mod 依赖不自动授予 GameplayModule
capability；依赖边也不自动等于 lifecycle 顺序。Core → UI → Web 的 composer
层级是固定边界，不受 Mod 排序改写。

增加、删除或替换代码 Mod 的生命周期是 candidate-first：

```text
resolve/load/compile candidate Mod set
  -> mount candidate in staging-safe lifecycle
  -> validate identity and migrate/adopt persisted data when authoritative
  -> consumer acknowledgement + atomic publication
  -> retire predecessor
```

R1 presentation/tooling Mod 可以在保留 GameSession 的情况下换代；Simulation/权威 Mod 通过现有
R2 rebootstrap/persistence handoff 创建 successor instance。两者都可以做到同一窗口、零 page reload，
但都不能在旧 Session 内改写已经解析的 Module graph。候选在 publication 前失败时 predecessor 保持
可用；已经释放 predecessor lease 的 R2 失败只允许使用可证明 current 的 handoff 重试。

## 4. Author definition and facet factories

完整 capability 目标需要一个 JSON-safe metadata definition，以及按 package layer
分开的纯、同步、无副作用 facet factory。当前 public Stage A 已实现 metadata 的 contract revision、稳定
`modId`/version、engine API ranges、required/optional/conflict 与 facets，以及 application-owned typed
contributions/extension points；尚未实现下例中的 State namespace、migration 和独立 Base/UI/Web/Tooling facet
factory SDK。所以下例仍是后续完整合同草图，不是当前 `@sillymaker/composition/mod` API：

```ts
// @example/management/mod — safe for project tooling and auxiliary inspection
export const metadata = defineSillyModMetadataV1({
  contractRevision: 1,
  modId: "org.sillymaker.management",
  engineApi: { base: "^1", ui: "^1" },
  dependencies: {
    requires: [{ modId: "org.sillymaker.vn", version: "^1" }],
    optional: [],
    conflicts: [],
  },
  facets: ["base", "ui"],
  state: {
    namespaces: [{ namespace: "management", schemaRevision: 1 }],
  },
});

// @example/management/base — parameterized by the application's closed types
export function createManagementBaseFacetV1(input: {
  game: GameAuthoringKitV1<ApplicationGameTypes>;
  contracts: ManagementApplicationContractsV1;
}) {
  return defineBaseModFacetV1(metadata, {
    modules,
    contentTables,
    commandCoordinators,
    migrations,
  });
}

// @example/management/ui — no raw State or foreign write authority
export function createManagementUiFacetV1(input: {
  publication: ManagementPublicationAdapterV1;
  intents: ManagementIntentAdapterV1;
}) {
  return defineUiModFacetV1(metadata, { renderers, slots, windows });
}
```

正式类型至少需要表达：

- `contractRevision: 1`：Mod definition/manifest 结构版本；
- 稳定 `modId`：与 npm package name 解耦，不因转移 registry 或 monorepo
  路径而改变；
- 支持的 SillyMaker public API range，按实际消费的 Base/UI/Web/Tooling facet
  声明；
- `requires`、`optional`、`conflicts` 三种不同语义；
- 可枚举的 contribution facets 与各 facet 的独立 public entry；
- 由具体 facet 声明、定位到 resource ID 的 lifecycle 约束，而不是 Mod-wide load
  order；
- 自己拥有的 State namespace、schema revision 与相邻版本 migration；
- 会进入 resolution、Save 或 Artifact identity 的 content/reference/resource
  元数据。

metadata 可被 tooling 读取，不含 React component、schema closure 或 live
handle。Facet factory 可以返回 builder 输出、React component 和普通 TypeScript
函数，所以其结果不是 JSON manifest；但 factory 求值仍不得：

- 创建 Session、打开数据库、读写 DOM 或注册全局 listener；
- 修改全局 registry；
- 根据 import 顺序覆盖另一个定义；
- 在 resolution 期间执行网络请求或异步资源加载。

需要 live handle 的工作属于 Application instance 创建后的既有 Core/UI/Web
composer 和受控 extension lifecycle，而不是一个通用的 `install(context)` 后门。

### 4.1 Application type family

当前 SillyMaker 的 State、command、fact、rejection、semantic action 与 query
都属于一个应用封闭的 TypeScript type family。可复用 Mod 不能导出绑定到任意 Story
的预实例化 GameplayModule，再用 `unknown`、cast 或字符串查询假装通用。

V1 允许两种诚实形态：

- **Story-specific Mod**：已经绑定一个应用 type family，只能被该 Story/product
  family 消费；
- **Reusable Mod**：导出接受 `GameAuthoringKit`、schema witness 和显式 typed
  adapter 的 facet factory，由应用实例化进自己的 type family。

first-party VN/经营/养成 Mod 以第二种为目标。冻结公共 API 前，type prototype
必须证明至少两个 application consumer 能在不擦除联合类型、不引入 service
locator、不允许 foreign State write 的前提下消费同一 factory。

## 5. Dependency model

### 5.1 Physical dependencies

`package.json` 与 lockfile 负责“代码能否被安装和导入”：

| Field                     | Intended use                                                             |
| ------------------------- | ------------------------------------------------------------------------ |
| `dependencies`            | Mod 实现真正 import 的普通库或私有 helper                                |
| `peerDependencies`        | 必须与 Host 共享单例/合同的 SillyMaker、React 等 public runtime          |
| `exports`                 | 受支持的 `./mod`、`./base`、`./ui`、`./web`、`./tooling`、CSS 或资源入口 |
| `files` / package tarball | 实际发布内容                                                             |
| lockfile                  | 精确物理包图与完整性                                                     |

它们不负责 Mod 是否被应用激活、哪个 contribution 可用、Save 是否兼容、State
归谁、初始化顺序或冲突策略。

### 5.2 Semantic dependencies

Mod definition 负责“已选择的能力是否能合法组合”：

- `requires`：缺失或版本不满足时 resolution 失败；
- `optional`：目标也被 Application 显式激活且兼容时，允许本 Mod
  增加本地贡献；缺失时仍必须有完整确定的行为；
- `conflicts`：目标存在且范围命中时 resolution 失败。

V1 的 dependency target 使用稳定 `modId`。按“某个 capability 任意选
provider”的自动替换会引入选择歧义，暂不进入 V1；resolved manifest 可以记录
capability/provider 事实，等真实消费者证明需要后再设计 bounded provider
selection。

`optional` 不会从 package graph 自动 import/activate
目标；未被应用选择的目标视为不存在。

复杂的可选跨 Mod 协作优先使用显式 **bridge Mod**：

```text
management Mod + character-progression Mod
  + management-character bridge Mod
```

这样组合逻辑有自己的身份、测试和 Save
影响，不隐藏在“两边都存在时偷偷运行”的分支里。

GameplayModule 的 typed `requires`/`provides` 与 `initializesAfter` 继续由
Authoring Kit 解析。Mod resolver 只把已选择贡献汇入唯一的 Module
graph，不建立平行 capability container。

### 5.3 Lifecycle ordering

V1 不提供含义模糊的 Mod-wide `initializesAfter`：

- 纯 metadata/definition/facet factory 的合并与输入排列无关，不需要初始化顺序；
- GameplayModule 的启动顺序继续由 Authoring Kit 的 Module lifecycle graph 负责；
- Core → UI → Web 的 Application composer 层级固定，Mod 不能声明跨层反向顺序；
- 只有某个 facet composer 真正支持 named instance resource 时，resource
  descriptor 才可用 `{ modId, resourceId }` 声明同 facet 的 `initializesAfter`；
- lifecycle target 不会自动激活目标 Mod；目标必须已被 Application
  选择。若它必须存在，同时声明 `requires`；
- cross-facet lifecycle edge、只写 `modId` 的模糊 target 和用 lifecycle 决定
  override winner 都是 resolution error。

每个被激活的 facet 独立验证自己的 resource DAG。辅助 headless conformance 不加载也不验证
UI/Web implementation graph；Browser 或 Deno Desktop GUI Application 则在创建 instance 前
验证所有已选 facet，再按固定 composer 层级初始化。

### 5.4 Application activation

应用必须显式 import 并列出激活项：

```ts
defineSillyApplicationV1({
  mods: defineSillyModActivationSetV1([
    { metadata: vnMetadata, base: vnBaseFacet, ui: vnUiFacet },
    {
      metadata: managementMetadata,
      base: managementBaseFacet,
      ui: managementUiFacet,
    },
    {
      metadata: characterProgressionMetadata,
      base: characterProgressionBaseFacet,
      ui: characterProgressionUiFacet,
    },
    { metadata: productBridgeMetadata, base: productBridgeBaseFacet },
  ]),
  product: productOwnedContributions,
});
```

应用根是最终选择权威。Browser/Deno Desktop GUI root 可以汇合产品已选 facet；辅助
headless conformance/Core root 只传 metadata/Base 子集。一个 package 被安装、被另一个
package import，或出现在
lockfile 中，都不等于它已激活。

## 6. Resolution and merge rules

Resolver 接收显式定义和它们的物理来源元数据，产生一次性解析结果：

1. 验证 definition revision、`modId` 唯一性和 engine API compatibility；
2. 对照来源元数据确定 package/export/version，解析 required/optional/conflict
   graph；
3. 独立验证 GameplayModule 与各已加载 facet 的 lifecycle graph；
4. 按 dependency 拓扑排序；无边关系使用 canonical `modId` 排序；
5. 按 facet 收集贡献，执行每类 contribution 的明确 merge policy；
6. 把 GameplayModules 交给现有唯一 Module composer，再验证 State
   ownership、capability DAG 和 lifecycle DAG；
7. 产生 frozen resolved application input 与 `ResolvedModManifestV1`。

默认合并矩阵：

| Contribution                                                       | Default V1 policy                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `modId` / one activated source                                     | 同一 activation set 只允许一个精确来源和版本                                               |
| GameplayModule ID                                                  | duplicate hard fail                                                                        |
| State namespace / slot / migration owner                           | duplicate hard fail                                                                        |
| typed capability provider                                          | 沿 Authoring Kit 规则；duplicate/missing/cycle hard fail                                   |
| command kind / semantic action / Query/Mutation tool or catalog ID | duplicate hard fail                                                                        |
| content table ID                                                   | duplicate hard fail；表内 row ID 由 table schema 校验                                      |
| text / asset / stable reference ID                                 | duplicate hard fail                                                                        |
| renderer / contribution ID                                         | duplicate hard fail，与现有 UI registry 一致                                               |
| UI slot ordered contribution                                       | contribution ID 唯一；仅在该 slot 明确是 multi-provider 时按 canonical resolved order 组合 |
| route / window type / overlay type / input context                 | duplicate hard fail                                                                        |
| singleton Host adapter / capability                                | duplicate hard fail                                                                        |

某类贡献若确实允许多提供者，公共合同必须定义它是 ordered list、map、pipeline
还是 explicit override slot，并说明顺序和失败语义。合法替换只能通过有目标
ID、目标版本范围和 provenance 的 Hotfix/bridge/override surface
完成；`last wins` 不能作为未写明的默认规则。

Product-owned contributions 走同一 resolver
规则。应用不能绕开冲突检查获得特殊覆盖权；确需替换时使用可审计、具名、受版本约束的
patch/override surface。

## 7. Identity and version axes

以下版本不可合并成一个“application version”：

| Axis                         | Answers                                 |
| ---------------------------- | --------------------------------------- |
| package/distribution version | 安装了哪份物理代码                      |
| Mod contract revision        | definition/manifest 用哪代结构          |
| engine API range             | Mod 依赖哪代 SillyMaker public contract |
| State schema revision        | 此 Mod 拥有的持久 State 如何解析和迁移  |
| content/reference digest     | 稳定内容 ID 和被引用数据究竟是哪一版    |
| code/resource digest         | 构建、缓存、诊断和完整性看到的实际字节  |

`modId` 由作者定义；package name、package version、export path 和代码 digest 由
package/build source metadata 提供，避免在两个地方手工维护同一版本。开发期
workspace source 也必须得到明确的 resolved source
identity，不能用“本地所以忽略版本”跳过诊断。

概念 `ResolvedModManifestV1` 至少包含：

```text
contract revision
application and engine identities
ordered Mod entries:
  mod ID
  package name, package version and export
  engine API ranges
  resolved dependency and facet-scoped lifecycle edges
  contribution facets and stable IDs
  State namespaces and schema revisions
  code, content, reference and resource digests
aggregate composition and compatibility digests
```

Aggregate compatibility identity 至少分为：

- State contract/schema identity；
- Simulation behavior identity（module topology、rules、commands、deterministic
  content）；
- gameplay/content stable reference-closure identity；
- Presentation identity；
- Tooling identity；
- 仅用于诊断的 physical code/resource digest 与 build metadata。

Simulation behavior identity 的预期构成是语义投影而非整包 import-closure code
digest：module topology 与 command/rule/query 的确定性投影，加上每个 executable
provider 自带的 sourceDigest（现有 Story resolver 已按
`["provider", providerId, sourceDigest]`
投影可执行节点）。这样“仅物理来源变化而语义身份 exact”一行才可达，同时规则
函数体的行为漂移仍被 per-provider digest 捕获，与第 15 节“不放行 rules drift”的
stop rule 不冲突。

它与 lockfile 互补：

- lockfile 证明物理依赖图；
- resolved manifest 证明哪些 Mod 被激活、贡献了什么、最终产品是什么。

构建 Artifact 必须携带 resolved manifest。浏览器运行时不从 npm registry
重新推导它。

## 8. Save compatibility and migration

Save 记录的是影响该 Snapshot 的 resolved Mod provenance，而不只是 application
semver。Load 先比较聚合身份，再按以下矩阵处理：

| Identity difference                                                                       | Default load policy                                   | Explicit escape                                                                                              |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| exact State + Simulation + reference identity                                             | load normally                                         | none needed                                                                                                  |
| State schema/contract changed                                                             | reject normal load                                    | ordered pure migration with exact source/target State and Simulation identities                              |
| same State schema, Simulation rules/commands/topology changed                             | reject normal load; inspect-only may remain available | exact adoption declaration from old Simulation identity to new, then references/invariants/digest validation |
| gameplay/content reference closure changed                                                | reject when any saved ID cannot be resolved           | explicit rename/adoption mapping or State migration, followed by full reference validation                   |
| Presentation identity/reference only changed                                              | load with warning and fallback policy                 | optional presentation adoption; never gameplay migration                                                     |
| Tooling identity only changed                                                             | ignore for player Save compatibility                  | none                                                                                                         |
| physical code/resource digest changed while all relevant semantic identities remain exact | diagnostic/warning, not automatic gameplay rejection  | policy may require exact build for a competitive/audited product                                             |

Migration 转换 State，并精确绑定 source/target State 与 Simulation
identity；adoption 明确声明“旧 State 无需转换也可由新 Simulation
接管”。二者都不能用宽泛 npm semver 猜测。adoption 声明集合的发布工具化、lineage
边界策略与玩家可读结果由 [save migration design](save-migration.md) 的 product
surface 固定；本节不重复。一个垂直 Mod 可以同时具有多类影响；resolved manifest
按实际 contribution、State ownership 和 reference closure
推导影响，而不是信任作者给整包贴一个模糊标签。即使一个 package 自称
presentation-only，只要它拥有 Save 中稳定语义 State 引用的
renderer、asset、interaction 或 content ID，就必须进入相应 reference
compatibility；是否阻断 load 则由该引用参与 gameplay authority 还是拥有安全
presentation fallback 决定。

每个 Stateful Mod 只迁移自己声明拥有的 namespace，且至少提供相邻 schema revision
的纯、确定性迁移：

```text
bounded raw envelope decode
  -> engine-owned envelope format migration
  -> identify saved Mod provenance and old schema revisions
  -> migrate each owned namespace
  -> validate aggregate State schema
  -> require exact Simulation identity, a migration-authorized target, or exact adoption
  -> validate content/reference IDs
  -> run aggregate invariants and digest checks
  -> atomically install one new replay anchor
```

Envelope format 由 engine-owned migration 处理；Mod 只迁移自己 namespace 的
State schema，二者不能共享一个模糊 registry。这要求改造当前“先用 current
`snapshotSchema` 解码整个 envelope，再做 compatibility/reference/invariant
检查”的顺序；旧 schema State 不能在 migration 获得机会前就被 current schema
拒绝。Raw decode
仍受字节数、深度、节点数和字段类型上限约束，不能为了迁移放开不受限输入。该解码顺序改造与一等
migration registry 是引擎级合同，由 [save migration design](save-migration.md)
固定并独立于 Mod 系统先行落地；本节只增加 per-namespace 切分与跨 Mod 协调。

跨 Mod 数据迁移由具名 bridge/application migration 协调，不能让一个普通 Mod
任意改写另一个 Mod 的 State。任何失败都留下旧 Session/Save 数据不变。

移除 Stateful Mod 不是“删掉它的字段继续玩”。产品若支持卸载，必须提供显式
export/adoption/drop policy，展示将失去的数据并产生新
lineage；默认行为是拒绝加载。

## 9. Lifecycle and hot reload

Mod definition、resolved definition、Application instance 三层继续遵守现有
composer 生命周期：

- definition 可被多次解析，不持有 live resource；
- resolved Mod set immutable，可供一次或多次新 instance 使用；
- instance 独占 Session、lease、listener、Host handle 和 disposable extension。

开发 HMR 或用户切换 Mod 集合时按 authority 创建 successor：纯 presentation/tooling contribution
走 R1 owner successor并保留 GameSession；Simulation/State/Save identity 受影响时创建 R2
Application/Game successor。不得在 command queue 中途替换 definition，也不得让旧 contribution
registry 与新 Simulation 共存。

若 facet 创建 instance resource，初始化失败必须回滚已经创建的资源；dispose
按初始化逆序、exactly once 执行。任何 live handle 都不能进入
definition、resolved manifest 或 Save。

同 facet resource 按其已验证 DAG 初始化并逆序 dispose；不同 facet 永远服从固定
Core → UI → Web 创建顺序和 Web → UI → Core 释放顺序。offline build tooling 是独立命令
生命周期；in-app DevDock、Inspector/editor 与 Agent workspace 等 tooling 是 Application sibling
或 R1 contribution，由 build-known Tooling Mod 显式选择，不进入 gameplay State，也不取得
GameSession writer。

当前公开 tooling contribution contract 保持窄而正交：DevDock 接收可动态加载的 panel set/handle，
Scene Inspector 接收 build-known `properties` tools。应用或公开 `@sillymaker/composition/mod` runtime
可以聚合这些普通 typed contributions，但 Host 只在公开边界 admission 一次；内部不再认证其
descriptor/来源。DevDock handle
和 Inspector binding 的同步或异步 `dispose` 都接入各自 owning lifecycle，application close、candidate
rollback、successor retirement 与 final disposal 会等待已取得的资源退出。Scene tool 只得到当前
Authoring Scene/facets/selection 和 revision-fenced operation port，不得到 Authoring Host、Session、source
IO、Save、Context 或 service locator。新的文档族工具另建 focused contract，不把 Scene slot 变成通用
editor/plugin framework。

resolved Mod set 在每个 generation 内仍冻结。动态装卸产生新 generation，而不是改变冻结对象；
候选 generation 必须先完成 admission、mount 与 application-owned publication acknowledgement，才退休
predecessor。代码实现已经被浏览器求值后不承诺从 ESM/CSS cache 物理擦除，卸载承诺的是 publication、
listener、resource handle 和 lifecycle owner 退出。开发环境可以自由重复这套 load/unload successor；
production 是否包含同一扩展入口由产品显式决定，省略时 loader/controller/implementation 必须从 final graph
结构排除。这个产品选择不等于 public install protocol。

## 10. Distribution stages and trust

“可通过 npm 安装”和“游戏发布后仍能装 Mod”是两个不同里程碑。

### Stage A — build-time trusted package（focused runtime 已交付）

第一阶段只支持在应用构建前安装和显式激活的可信 TypeScript/JavaScript
package。它与应用同 bundle、同 realm，拥有普通 JavaScript 可获得的权限。

当前 `@sillymaker/composition/mod` 已交付这一层的 metadata、resolver、typed extension point、selection
successor 与 async resource handle。它是 first-party VN/经营/养成包的起点。一个产品可以把 build-known catalog 与
selection surface 带入 production，但 catalog 外任意路径、远端代码、npm runtime resolution 和公共安装格式
仍不属于 Stage A。

### Stage B — post-release declarative artifact（首个产品子集已交付）

优先开放可验证的纯数据/content/assets、Mod-owned OpenUI template/catalog
或受约束 IR。它们无任意代码，可在 rebootstrap 时进入 resolver；schema、ID
closure、resource budgets 和 digests 必须通过后才激活。Conversation
中动态产生的 UiArtifactRevision 仍是产品数据，不因采用相同文档格式而成为 Mod。

One Last Sound Check 的独立 Mod-enabled build 已交付这一层的第一个产品特定子集：bounded same-origin
text/image overrides、exact product/version/story target、具名 replaceable slots 与完整 Web application
successor。OpenUI、数值、布局、通用 container/installer 仍未交付。

这是最适合真正“发布后
Mod”的第二阶段，因为它能覆盖剧情、数值、文本、素材、布局和组件受控
UI，而不立即承担任意代码风险。翻译/文本覆盖、素材替换与数值重平衡等主流社区 Mod
形态属于本阶段的受控 override surface（具名、带目标 ID 与版本范围，见第 6
节），而不是经由 duplicate-ID 冲突的 last-wins；在这些 override surface
落地前，第三方 Mod 事实上只能做纯增量贡献。

### Stage C — post-release trusted code artifact

若真实产品需要，可把 npm source package 构建成浏览器可消费的 Mod
Artifact。概念布局可能是：

```text
mod.json
main.mjs
assets/**
integrity.json
```

扩展名（例如 `.sillymod`）和文件格式在实现前不冻结。manifest 必须显式声明
`declarative`、`trusted_same_realm_code` 或未来隔离模式，不能让安装 UI
把数据包和可执行代码显示成同一信任级别。浏览器不会运行 npm
resolver；构建工具必须提前解析依赖、产出 ESM/资源和 resolved bundle
metadata。安装或启用后仍通过完整 rebootstrap 创建新 instance。

同 realm ESM 是**完全可信代码**。签名与 digest
只能证明来源和字节完整性，不能证明代码无恶意。

### Stage D — untrusted extension boundary

当前路线图不承诺不可信代码沙箱。若未来需求成立，边界必须是独立 origin
iframe、Worker/进程加 RPC、权限和资源预算，而不是给同 realm JavaScript
套一个“sandbox”名字。

异步隔离代码不能直接加入权威 command transaction 所需的同步 Module
graph。它可以作为外部工具、内容生成器或受控服务，产出经 schema 验证后再由
Session 原子提交的数据。

## 11. Public package gate

当前仓库中的 `@sillymaker/*` manifest 仍标记 private，尚未实际发布 registry package。Production Mod V1
已经把 Base、State 与 Composition stage 成真实 JavaScript、`.d.ts`、source maps 和发布用 manifests，过滤
private exports、去除 `src/**`/`workspace:*`，再由仓外临时 consumer 从 tarballs 安装并通过 Deno、Vite 与
Chromium。这个 smoke 证明 focused `@sillymaker/composition/mod` 的 package Artifact 可消费，不等于 package
已发布、形成完整 SDK，或满足 Deno Desktop production 资格。

开放更广的第三方代码 Mod 之前仍至少需要：

- 实际发布的 JavaScript、`.d.ts`、CSS 和 runtime assets，而不是导出仓库
  `src/**`；
- 明确 conditional exports、side-effects 和 Browser/Deno Desktop 支持面；Electron 必须另经
  Host adapter promotion；
- SillyMaker public API 与 first-party Mod 的 semver/兼容策略；
- 在仓库外 consumer 中完成目标 Host 的 install/build smoke；当前已覆盖辅助 Deno runtime、Vite/browser
  GUI，Deno Desktop package/GUI 仍待相应产品资格；
- package、Mod、transitive dependencies 与资源的可复现 build identity；
- 一条旧 Save + 新 Mod 版本的兼容/迁移验收。

只发布类型或让 monorepo 内 `workspace:*` 编译通过不满足这个 gate；当前 staged package smoke 也不能被写成
已经上线 npm。

## 12. First-party capability strategy

### VN is Tier 1

VN 是 SillyMaker 的基础能力，应该以一等 first-party capability 交付：

- 与引擎同仓或同发布节奏维护；
- 默认 starter/preset 可以直接选择；
- 有 conformance Story、Save/replay、input、a11y、desktop/browser 行为测试；
- 遵守明确 compatibility policy。

“first-party Mod”不表示把所有现有 VN primitive 从 `@sillymaker/ui` 或 Base
搬走。Engine 保留可复用机制；focused `@sillymaker/vn` package 组合 interaction document/compiler/runtime
policy 与选择性的 React presentation。Base 继续拥有 Narrative/State/Save/replay，UI 继续拥有 Managed
Narrative Surface、Stage/Input 和通用 player primitives；应用拥有自己的 predicate/effect、内容、State、
theme 与特殊表面。VN package 不导入 Composition Mod runtime；应用 adapter 才显式导入 public
`@sillymaker/composition/mod`、literal loaders、selection controller 与 publication acknowledgement。

VN 本身是一组内聚能力，不是一个不可裁剪的大包：

- `VN core` 负责 dialogue/choice/advance、Stage/Input 协作和基础呈现合同；
- History presentation、Auto/Skip playback、System/Save UI 等只有在具有独立产品取舍、生命周期或
  构建价值时成为少数 focused optional Mods；不按每个按钮拆分；
- traditional VN preset 只是显式选择 core 与常用 optional Mods 的薄组合，不建立第二套 runtime；
- RPG 可以选择同一 VN core 和自有 UI 而省略 History；完整 VN 产品可以选择 full preset；
- History 是否进入权威 State 是 Story/Save 合同，History UI 是否被选择是 presentation Mod 合同。
  省略 UI 不能静默改变 Snapshot bytes、Save lineage 或 replay 语义。

可选能力必须从未选择的 final module/source graph 结构排除，不能只以运行时 `enabled: false` 冒充
减包。History presentation 是第一个真实 consumer：literal dynamic loader 首次选择时取得 renderer、入口、
CSS 与 resource handle；R1 successor 在 React consumer commit acknowledgement 后切换，卸载到 `null` 时先关闭
已打开 surface 再等待 owner 释放。它与 traditional static full preset 运行同一 Narrative authority；core-only
build 不含 History implementation、loader、public selection controller 或其 private Direct transitive backend。
shared generic Narrative family 只保留通用
History 协作机制，authoritative History State/retention 仍由 Story/Save 拥有。改变其 schema/retention policy
必须走 R2 compatibility/migration，不能冒充 presentation hot swap。

DevDock load handle 与 Scene Inspector properties contribution 是公开的 build-known tooling output contracts；
它们和 History 已证明 focused hot-swap/publication surface。应用可以把这些普通 typed outputs 作为 public Mod
extension-point payload，但 output contract 本身不是 resolver，也不暴露 private Direct、Authoring Host、Context
或 service locator。

### SLG should be capability slices

“SLG”过于宽泛，不应先做一个万能 `mod-slg`。当前经营模拟 +
角色养成实验更适合验证：

- management/time-economy；
- character progression/relationship；
- interaction/picture stage；
- collection/meta progression；
- 它们之间的 product-owned 或 bridge composition。

经营/时间经济切片的规模验证以 roadmap 的 Snapshot integrity and commit
performance track 的性能契约为前提；该 track
落地前，大状态切片的验证结论不视为引擎结论（与 roadmap 的前置关系一致）。

一个能力 Mod 可以包含多个相互内聚的 GameplayModules，不按每个 State slot 拆 npm
包。等至少两个独立产品消费者证明相同合同后，再从 Story-local feature slice
提升为 first-party Mod。

卡牌、战斗等品类同样遵循真实消费者和 promotion rules，不以 taxonomy
先行制造空包。

## 13. OpenUI and Agent applications

OpenUI adapter、Agent Workspace、受控组件 library 或 Mutation gateway
可以成为可信 first-party/optional Mod，因为它们是可选择、可版本化的纵向能力。

Application bootstrap 时冻结这些 Mod 提供的 executable component/tool
catalogs。运行中可以动态创建或编辑 UI Artifact revision，但不能动态注入新的
component/tool implementation；新增可信代码仍需更新 Mod 并 rebootstrap。

但 Agent 生成的一份报表、窗体或前端预览是 **UI Artifact**：

```text
Conversation
  -> immutable UiArtifact / UiRevision
  -> renderer or sandboxed preview window
```

永久 UI revision 至少钉住完整 materialized document、格式/解析器版本、组件
library digest、tool binding contract、来源 message 和内容 digest。流式
chunk、partial AST、loading skeleton、optimistic state 和未提交 edit
是瞬态；窗口位置、打开/固定状态、tab 和可恢复表单选择属于 workspace/Host
record。业务事实仍进入领域 State、数据 Artifact 或 mutation receipt，不藏在 UI
文档里。Snapshot report 引用带 `asOf`/schema/digest/provenance 的不可变
DataArtifact，live dashboard
读取当前数据；两者每次访问都按当前主体/租户重新授权，区别是 snapshot
授权后读取固定字节而不重新 Query/生成。

OpenUI 的 `Query` 只读投影；`Mutation` 通过 `toolProvider` 对接
permission/preview/confirm/idempotency/dispatch policy；普通 `onAction` 处理
continue、open URL、窗口或其他 presentation/Host intent，不能笼统等同于所有
mutation。由于参考实现最终按名字调用同一 provider，安全层必须在完整 program
preflight 时区分 Query/Mutation tool allowlist；首版也可以让 provider
只含只读工具、写操作走窄包装组件的 semantic adapter。`debug_tools`
不是生产用户/租户授权机制。

增量编辑以旧 revision + digest 为 base，流式生成 draft，完成后 materialize
完整文档、严格验证并 compare-and-swap 提交新 immutable revision。重放读取精确
revision，不重新执行 mutation。

任意生成的前端代码预览必须作为 Code Artifact 在隔离 iframe/Worker
边界运行。要提升为产品 UI 或 Mod，需经过普通 source
review、测试、构建和发布流程。

游戏 Save 与未来 Agent 产品的 Conversation/Artifact store
是两个持久化域；它们可以复用 Mod resolver、窗口系统、Host capabilities 和
diagnostics，但不能共享一个模糊的万能 Snapshot。

若 OpenUI Mod 只有 presentation/Host/tooling 影响，移除它应使相关 Artifact 得到
missing renderer/tool-contract 诊断和安全 fallback，而不是据此判定 GameSnapshot
损坏。

详见
[OpenUI integration research](../../research/2026-07-29-openui-genui-support.md)。

## 14. Delivery matrix

2026-08-29 的 [Production Mod V1 plan](../plans/2026-08-29-production-mod-v1.md) 已交付：

- public `defineSillyModMetadataV1`，exact/caret API/dependency ranges，required/optional/conflict 与 facets；
- application-explicit data/code catalog、canonical dependency order、typed extension points、collision/compile
  diagnostics 与 detached readonly resolved manifest；
- complete selection successor、publication acknowledgement、candidate rollback、async resource handle cleanup，
  private Direct backend 保持隐藏；
- History R1 与 Engine Lab consumers，以及默认 build 的 structural exclusion；
- staged Base/State/Composition publish candidates，仓外 tarball install、Deno resolver、Vite build、Chromium run；
- One Last Sound Check 产品特定的 bounded text/image Stage B，包含显式 selection、enable/reload/disable 与完整
  Web application successor。

尚未交付，且不能从上述能力推断出来：

- 内建 Base/UI/Web/Tooling facet factory SDK、per-Mod State namespace/provenance 与 migration；
- `@sillymaker/*` 的真实 registry 发布、semver support policy 与通用 third-party SDK 文档；
- 通用 declarative container/installer，以及 OpenUI、数值、布局或受约束 IR surfaces；
- public authoritative-gameplay R2 adapter、真实经营/时间经济 Mod consumer 与对应性能/Save migration 预算；
- post-release trusted executable Artifact、download/update/marketplace/runtime npm resolution；
- untrusted extension isolation。

这些后续项各自需要真实消费者、独立 active plan 和相应 Host/Save/性能证据。trusted executable 只有在需求与
threat model 明确后才进入；不可信扩展另立隔离设计，不能由当前 same-realm Stage A 自动推出。

## 15. Stop rules

实现中出现以下情况应暂停并修改设计：

- Mod resolver 与 Authoring Kit 各自维护一套 GameplayModule/capability
  authority；
- Base/auxiliary-conformance resolver 为读取一个纵向 Mod 而导入 React、DOM、Web 或
  Host-specific tooling；
- 可复用 Mod 把应用联合类型擦成 `unknown`、运行时 cast 或字符串 service
  locator；
- 一个 GameplayModule、State slot 或稳定 reference set 无法追溯到唯一
  Mod/application owner；
- package installation 被当作 application activation；
- 需要扫描目录、全局 registry 或 import side effect 才能发现 Mod；
- 依赖与 lifecycle ordering 混为一个 `loadOrder`；
- 用 Mod-wide `initializesAfter` 或 cross-facet edge 改写固定 Composer 层级；
- 重复 State、command、route、renderer 或 tool ID 靠最后加载者获胜；
- Session 存活期间更换 Simulation Mod graph；
- Save 在缺少 Stateful Mod 时静默删字段或继续运行；
- 仅因 State schema 未变就放行 Simulation rules/commands/topology drift；
- 用 npm/package semver 代替 State schema、content digest 或 engine API
  compatibility；
- 把签名的同 realm JavaScript 称作安全代码；
- 把某次 OpenUI 文档、窗口或 Agent 响应注册成 Mod；
- 为参考游戏兼容而引入通用无类型 variable/switch pool 或事件解释器。

## 16. Relationship to existing documents

- [roadmap](../roadmap.md)：决定优先级、promotion evidence 与 continuous
  tracks；
- [AI authoring](ai-authoring.md)：定义 Authoring Kit、Composer 和外部 package
  gate；
- [save migration](save-migration.md)：固定引擎级 Save 解码顺序与一等迁移
  registry；本文第 8 节的 per-namespace migration 建立在其上；
- [feature slices](../proposals/feature-slices.md)：定义 Story/Mod
  内部的纵切组织方式；
- [content database](../proposals/content-database.md)：提供 Mod 可贡献的只读
  typed content；
- [typed StateStore](../proposals/typed-state-store.md)：若采用，只改善
  Module-owned mutable State 的 DX；
- [build and release](../build-and-release.md)：描述当前 Player/Artifact
  流程；Mod manifest 未实现前不修改其现状声明。

设计参考
[Bannerlord.Module.Template](https://github.com/BUTR/Bannerlord.Module.Template)
的 package/template 分离思路，以及
[Bannerlord.BLSE dependency metadata](https://github.com/BUTR/Bannerlord.BLSE#community-dependency-metadata)
对 required、optional、incompatible 与 load-order metadata 的区分；SillyMaker
不复制其运行时或覆盖语义。
