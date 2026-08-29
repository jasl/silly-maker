# Presentation RNG（表现层可续接确定性随机流）

状态：**已交付（2026-08-29）**。高保真演出验证暴露了非周期字效、散布与
相位抖动的共同需求：这些像素不应进入权威 State，但 renderer 本地
`Math.random()` 又无法让同一条已提交轨迹稳定复现。本切片只补这一条
零权威随机流，不引入粒子系统、表现脚本 DSL 或新文档家族。

## 合同

focused `@sillymaker/ui/presentation-run` 提供：

- `derivePresentationSeedV1(parts)`：把 occurrence/cue/effect id 与已提交
  ordinal 等跨 reload 稳定事实，按类型和长度分隔后折叠为非零 uint32；
- `createPresentationRngStreamV1(seed | state)`：提供 `nextUint32()`、无偏
  `nextInt(exclusiveMax)`、inclusive `nextIntInRange(min, max)`，以及可精确
  续接下一次 draw 的普通数据 `{ algorithm: "xorshift32-v1", cursor }`；
- xorshift32 的非零状态空间有 `2^32−1` 个值；整数宽度最多
  `2^32−1`，draw 先归一化到该完整空间再做 rejection sampling，避免
  modulo bias。

## 边界

- 流和 continuation 不进入 State、Save、digest、replay 或 CommandLog；
- 权威规则继续只使用 Session transactional `RuleRngV1`；两者可以采用
  同一受测算法核，但不共享状态或 API；
- seed 只来自已提交且跨 reload 稳定的事实。presentation epoch、墙钟、
  `performance.now()` 和另一个随机值都不是合法 seed 来源；
- continuation 只服务同一应用运行中的 renderer remount/组件换代。若产品
  要求 Save 后恢复到逐粒子相位，应重新审视权威边界，而不是把这个对象
  偷塞进 Save。

## 停

- 将本工具扩张成粒子、天气、时间线或随机表达式框架；
- 权威代码改用表现流；
- 为不稳定 seed 增加防御性猜测或 Host 中间层。
