# Conditional overlay binding（状态条件化贴图）——裁决记录

状态：**已裁决并闭合（2026-08-29 当日）**。结论：**不新增引擎原语**。
能力已存在于既有权威面的组合；本案把该组合从「口口相传」升格为受
一致性测试保护的受认可模式，并显式挂起声明式变体表文档家族。

## 证据门

外部实验仓（imouto golden baseline）封板审计的「监视器中途换码
overlay」缺口（其账本 C4/#379）：原作 swallow 倒条右 21 贴片随
V160 锁在监视器**中途**翻转；克隆的 still-overlay-beats 是静态按拍
绑定，表达不了「同一拍内贴图随权威变量变化」，只能在 Story
compositor 里读权威态合成——即表现层长出了一只读原始状态的手。

## 审计结论：谓词面已经齐了

引擎已有的三件套正好覆盖这个形状，缺的只是把它们连起来的判例：

1. **权威条件键**：`SemanticStageStateV1` 每个条目携带
   `appearance: Readonly<Record<string, string>>`——纯数据、进 Save、
   进 digest。条件（如「锁已咬合」）写成 appearance 键即成为权威事实。
2. **中途翻转的写入路径**：`setAppearance` 是既有 `StageMutationV1`；
   领域事件 + reducer（parallel-monitors 交付）允许**舞台所有者**
   fold **别的模块**的事件——条件属于监视器时，舞台 reducer 订阅同一
   事件做镜像，写者（普通命令、围栏中写、监视器结算）自然全覆盖，
   无需每个写者手抄一份镜像突变。
3. **变体映射**：`resolveContent(contentId, appearance)` 是 Story
   投影，按 appearance 键返回不同 `assetIds`/`props`；render target
   逐投影重建，换 appearance 即换图，**不打扰任何在飞 hold**。

原作形状（V160 翻转 → 贴片换码）映射为：监视器/命令发领域事件 →
监视器 reducer 更新数值 && 舞台 reducer `setAppearance` → 目录按键
选变体 → 渲染器换图。全程单一决议路径、批次不变量、零表现权威。

## 一致性证据（Engine Lab）

`e2e/src/test/mid-hold-input.test.ts`（判例与 mid-hold-input 同居一
案，因为 C4 的原始形状就是「围栏中写翻贴图」）：

- 样本箱进场即带 `latch: "sealed"` appearance（**迟到进场从命令起点
  状态播种**——开关先开、箱子后进场时，进场即 engaged）；
- 围栏中写（`lab.engage_collector`）同一提交内：监视器数值翻转 &&
  舞台 appearance 翻到 `engaged` && 投影 `resolveContent` 解出
  engaged 变体——hold 剩余毫秒纹丝不动；
- 无箱时 fold 是 no-op（无孤儿镜像）；普通写与围栏写走同一 reducer
  （单写者纪律）。

渲染侧：`labStageContentCatalogV1` 的箱子分支按 `appearance.latch`
出 `props.latch`，Lab 渲染器以边框颜色 + `data-lab-latch` 呈现。

## 显式挂起

- **声明式变体表文档家族**（appearance 键 → 资产映射进数据，类似
  regions/chrome-layout 的家族化）：模式本身已被 Story 代码的
  `resolveContent` 覆盖；家族化是作者面改进，按仓规等**已审计的真实
  消费者**（imouto 重写轮）出现再立案。
- **表达式/谓词语言**（"当 V160>3 且 …"）：停。条件求值属权威代码；
  文档层只见最终的字符串键。

## 停

- 表现层（compositor/renderer）读原始 gameplay State 做条件合成；
- overlay 绑定获得路由权或第二决议路径;
- 为镜像键新增每写者重复的突变批（用领域事件 fold）。
