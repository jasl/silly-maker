<!-- SPDX-License-Identifier: MIT -->

# 示例：打烊前的旧书店

第一个收编的示例 Story：雨夜打烊前，店主老周与常客阿澄的短篇。两个角色、两次背景切换、两个选择（其一原子消耗一枚金币）、flag 分支双结局。

它由一次真实的模型作者实验产出（Grok 4.5 在起点模板上按任务书一次性交付，评审记录见 `docs/research/` 引用的实验档案），随后按模板 README 的"复制并改名"流程收编为独立应用。

```sh
pnpm story check example-bookshop
pnpm story simulate example-bookshop --scenario helped   # 帮找书 → 买下诗集 → 温暖结局
pnpm story simulate example-bookshop --scenario ushered  # 催离店 → 不买 → 平淡结局
pnpm exec vitest run game/stories/examples/bookshop      # 基线 + 图 lint + 双路线
pnpm exec vite --mode example-bookshop                   # 浏览器游玩
```

示例的定位：可运行的剧本写法参考。新游戏请从 `game/stories/template` 复制起步，不要在示例上继续开发。
