# 星鲸终端发布指南

请在发布 `v2.4.0` 前完成以下检查：

- 确认 **航行灯** 与 _返航灯_ 使用统一译名。
- 保留占位符 `{captainName}` 和 `%SIGNAL_ID%`。
- 不要修改 [控制台](https://example.test/console?mode=safe) 的地址。

| 状态   | 操作                         |
| ------ | ---------------------------- |
| 待命   | 等待主操作员确认             |
| 已连接 | 记录 `channel.open()` 的结果 |

<notice data-code="ORBIT-3">本行文字需要翻译，标签和属性不变。</notice>

```ts
const greeting = "这段代码不翻译";
```
