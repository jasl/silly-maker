<!-- SPDX-License-Identifier: MIT -->

# 示例：打烊前的旧书店

第一个收编的示例 Story：雨夜打烊前，店主老周与常客阿澄的短篇。两个角色、两次背景切换、两个选择（其一原子消耗一枚金币）、flag 分支双结局。

它按模板 README 的“复制并改名”流程组织为独立应用，可作为最小完整剧本写法参考。

```sh
deno task story check example-bookshop
deno task story simulate example-bookshop --scenario helped   # 帮找书 → 买下诗集 → 温暖结局
deno task story simulate example-bookshop --scenario ushered  # 催离店 → 不买 → 平淡结局
deno run -A npm:vitest run examples/bookshop      # 基线 + 图 lint + 双路线
deno run -A npm:vite --mode example-bookshop                   # 浏览器游玩（根分发；也可在本目录 deno run -A npm:vite）
```

示例的定位：可运行的剧本写法参考。新游戏请从 `template` 复制起步，不要在示例上继续开发。
