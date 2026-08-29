# 2026-08-30 阶段收口记录

状态：**完成。**

本记录关闭 2026-08-29 Production Mod V1、VN Genre Mod 与主分支吸收后的代码/文档质量轮。它不是新的
能力 lane，不改变 Production-floor sequence，也不自动激活后继计划。

## 1. 结论

- 主分支已经通过普通 merge ancestry 纳入当前分支；当前实现不需要重新引入 Cordis、第二套 lifecycle、State、
  Save、Narrative 或 publication authority。
- VN 通用 interaction/compiler/runtime、可选 History presentation、Inspector contribution 与公共 Mod 冷路径职责
  继续正交；命令、reducer 与 render 热路径没有新增动态 service lookup。
- Template 继续作为不选择公共 Mod runtime 的完整 structural negative control，没有真实反馈要求修改。
- SillyOS 在独立 worktree 继续孵化，本轮不读取其未合并工作，也不以它作为本轮完成证据。

## 2. 已修正的代码问题

- Inspector 数字字段改用浏览器 `valueAsNumber`；空输入不再被 `Number("")` 静默提交为 `0`。
- History bridge 的 close callback 只在 React commit 后换代，未提交 render 不再泄漏 callback。
- History publication 隔离 observer fault；单个 subscriber 抛错不会让 bridge 已切到候选、上层 Mod controller
  却回滚候选而形成 lifecycle split-brain。
- VN interaction compiler 在冷路径统一拒绝 say/choice/hold 的重复 `definitionId`，不再把冲突留给 runtime
  first-wins Map 或下游 lint。
- Narrative ready-mint fault 在 effect setup 抛出前立即断开已建立的 `MutationObserver`，避免异常路径保留候选
  runtime 和 live DOM ancestors。
- VN Inspector source-open handler 改为显式 async helper；行为不变，Promise 失败语义仍由既有 source client 收口。

上述问题均补入或扩展现有 focused regression；没有为此增加 lifecycle framework、通用 Context、重复 admission
或防御性 freeze。

## 3. React Doctor 复核

仓库任务固定为 `react-doctor@0.9.12` 并使用 `--no-cache`，避免同一收口轮在不同解析版本或缓存结果上比较。

- fresh full scan：1,196 files；初始 232 diagnostics，修正后 229；Bugs 从 11 errors / 45 warnings 降为
  10 errors / 43 warnings；
- changed-scope 复扫只剩 Narrative effect cleanup 一项。源码和 fault-path 测试证明正常 teardown、inert 分支、
  ready-mint throw、detached shell 与 queued settlement 均调用同一 disconnect owner；该规则不能跟踪本地
  cleanup helper，因此仍报告已经修复的异常路径；
- 其余 9 个 full-scan error 经独立源码复核：Game Audio 与另一个 Narrative effect 均有完整 teardown；
  localized-copy callback 是契约明确的纯 projection；7 个 ref 写入是 `current === null` 保护的确定性一次性 lazy
  initialization，其中一项只在测试 helper。没有发现 render 阶段 publication、订阅、外部 owner 或并发泄漏；
- 其余 warnings 主要来自测试中的 JSON round-trip clone、要求顺序的 lifecycle/IO、bench/cold compiler 小集合遍历、
  有意可聚焦的 History scroll region 和受控 Managed Surface backdrop。未为清零分数而改写权威时序、批量拆组件或
  引入缓存；
- React Doctor 的 dead-code 子检查在 full scan 中仍报告 `Results are incomplete: dead-code checks failed`。
  因此本轮不声称 React Doctor dead-code 通过；公开导出、类型、lint、final graph 和构建边界由仓库自身检查继续负责。

## 4. 文档当前事实修订

- 索引区分已交付的 focused public Mod Stage A / product-specific declarative Stage B 与仍未激活的 discovery、
  distribution、authoritative R2 adapter、arbitrary-code install 和 sandbox。
- 旧 Studio 计划保留为历史 substrate；当前产品面明确为 Inspector-first Authoring Host。
- 补齐 `@sillymaker/ui` 的 `./chrome` / `./presentation-run` 和官方 `@sillymaker/vn` package 职责。
- 修正 addressable owner、四套 Browser E2E 聚合、Engine Lab HMR 例外、Cat Cafe 退役状态与 SillyOS WIP 完整度表述。
- One Last Sound Check README 现在准确描述公共 Mod successor 和生产结构排除，不再把已发布能力写成 private runtime。

历史交付段落仍保留当时事实；网站有意存在的内容 TODO 不在本轮伪装成已经完成。

## 5. 验证

- `deno task check`：format、typed oxlint、Stylelint、typecheck、determinism、398 test files / 5,556 tests、
  6 Composition/State benchmark tests、公共 Mod 仓外 tarball + Deno/Vite/Chromium smoke、runtime assets、
  全部活跃应用静态检查与 Engine Lab production build 通过；
- focused VN/Inspector/Narrative regressions 通过，包括 Narrative Host 62/62；
- `deno task docs:build` 通过，49 个静态页面生成；
- One Last Sound Check ordinary build（467 modules）与 Mod-enabled build（483 modules）通过；
- One Last Sound Check Playwright matrix：Chromium、WebKit、Firefox Save filter 与 mobile project 共 42 passed，
  2 skipped（既有项目过滤规则）；
- `deno fmt --check` 与 `git diff --check` 通过。

两次独立代码审查、一次文档当前事实审查和一次 React Doctor error 复核在修正上述问题后均无剩余 blocker 或
should-fix。完成后没有自动激活后继 lane。
