# Deno Desktop HMR stable activation

状态：2026-08-28 交付关闭。该工作只关闭既有 verified-stable activation follow-up；不改变当前 VN
Reference Tour 产品车道的排序。

## Decision

Deno v2.9.6 是首个 release source 明确收录 PR #36488 in-runtime Vite 路径、且通过 SillyMaker
既定 stable behavior revalidation 的版本。维护中的显式入口为：

```sh
deno task app desktop-dev <application-id>
```

command 从 application 的真实 Web root 调用官方 `deno desktop --hmr .`，传入一个既有
package-private Desktop intent。adapter 无 public export，普通 `app dev`、`app build` 与 static
`app desktop` 均不选择它。preview records/downloads 位于 application-local、被忽略的
`tmp/sillymaker-desktop-dev/<application-id>/`；run identity 每次启动重新生成。

这里没有 hard-coded semver gate、Deno 未文档化 framework marker、external Vite server/proxy、
product companion、第二套 HMR graph 或进程树管理。运行失败只以直接 child 的非零 exit code 返回。

## Stable evidence

- 本机 binary 报告 `deno 2.9.6 (stable, release, aarch64-apple-darwin)`；release note 明确包含
  `fix(desktop): run Vite-based HMR dev servers inside the desktop runtime (#36488)`；
- isolated `DENO_DIR` 的真实 Engine Lab launch 由 Deno 识别为 Vite framework，并在 Desktop runtime
  内启动 Vite；startup window 被既有 adapter 接管，bootstrap target 为 `deno_desktop`；
- 同一 origin 的 private records route 对无 capability 请求返回 403，对 page-admitted capability 返回
  200，使用本次 isolated records directory；
- 在保留 HUD state 与已打开 overlay 后，对 component-only `LabHudV1` 做一次可见 edit 和 restore；
  两次均由 Fast Refresh 接收，同一 native window/origin 保持，page reload 为零，state/overlay 不丢失；
- 正常关闭 native window 后，renderer close participant、private ingress/exchange drain 与 record flush
  完成，直接持有的 Deno child 退出 0。

现有中立 tests 继续拥有 R1/R2、authoritative handoff、Agent currentness、CAS 与 failure/retry matrix；
native characterization 没有重复这些合同，也没有留下自动 source-mutation、report、PID 或 durable
evidence harness。

## Cleanup and limits

selected-canary 的 212 行 launcher 与 43 行专属 test 已删除；完整 upstream SHA 与历史 canary 结果
继续保留在 Application Runtime closure record，而不是变成产品 provenance/version-lock system。

Deno 2.9.6 的大 module graph runtime-thread stack、macOS bundle-signature/error-dialog 与 core
performance fixes 随 runtime 自动生效，无需 SillyMaker adapter。Clipboard、menu metadata、typed-array
Desktop binding 和 installer version/license 当前没有已接受 consumer 或 production packaging gate，
因此本轮不增加 facade 或顺手扩大 scope。

本轮不宣称 Desktop Authoring/Agent R0–R2、source-write、persistence durability、packaging、signing、
crash recovery、installer 或 multi-platform production qualification。public Deno compatibility floor
仍是 `>=2.9.0`，maintained development/CI 继续遵循 latest stable。

## Validation

- focused Desktop/HMR/Host/CLI unit contracts：96/96；
- Engine Lab Browser module-update matrix：Chromium + WebKit，8/8；
- `deno task check`：382 test files / 5,470 tests、6 benchmark tests、determinism、assets、全部 Story
  checks 与 Engine Lab release build；
- independent implementation review：无 blocker；
- stable native characterization：通过上述 ready/bootstrap/private-route/HMR/close matrix。
