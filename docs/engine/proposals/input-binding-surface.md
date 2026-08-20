# 输入绑定面（input binding surface）：统一 input 声明块与长按键端口

- 状态：已接受（2026-08-20 owner 对话裁决），随裁决当日落地。
- 范围：`@sillymaker/web` 应用声明、`@sillymaker/ui` 输入适配器。
- 关联：`docs/engine/proposals/parallel-monitors.md` 3a 节（倍速/跳过试点）。

## 背景与缺口

倍速试点（按住 Ctrl 钉 2×+auto）暴露了输入面所有权的一条裂缝：

- 「禁用 + 子树恢复」这一半**已经存在且形态正确**：`nativeBehaviorReset`
  的配置是显式布尔（`suppressContextMenu` / `suppressTextSelection`），
  可编辑控件自动保留原生行为，任意子树用 `data-native-menu` /
  `data-native-text` 属性恢复。属性方案穿透 portal、无需 context 穿线，
  是恢复机制的正解，不重做。
- 「绑定新行为」缺一半：键盘适配器只有「离散按下 → 动作」一种语义，且
  无条件丢弃带修饰键的事件。任何长按/修饰键绑定（VN 惯例的 Ctrl 快进）
  只能绕过引擎裸挂 `window` 监听——丢掉适配器全部防护规则。试点的可复现
  冲突：在调试坞工具窗输入框里 Ctrl+A 全选、或在 `data-native-text` 区域
  Ctrl+C 复制，都会瞬间触发快进。

裂缝的本质是声明面分散：`inputMaps`（keyboard/pointer/gamepad）与
`nativeBehaviorReset` 平行两个字段，长按语义无处安放。

## 合同

### 1. 统一 `input` 声明块（替换 `inputMaps` + `nativeBehaviorReset`）

```ts
readonly input?: {
  readonly keyboard?: KeyboardActionMapV1;   // 现有：KeyboardEvent.code → 动作（离散，走 InputRouter）
  readonly held?: HeldKeyMapV1;              // 新增：KeyboardEvent.key → 动作（长按状态，走端口）
  readonly pointer?: PointerActionMapV1;     // 现有
  readonly gamepad?: GamepadActionMapV1;     // 现有
  readonly nativeBehavior?: NativeBehaviorResetConfigV1 | false;  // 现有工具收编，默认安装，false 显式退出
};
```

直接迁移、删除旧字段，不留兼容垫片（内部仓消费者一次改完：e2e、
template、examples/*、外部试点仓）。

注意键的身份差异：离散表用 `code`（物理键位），长按表用 `key`（逻辑键，
`"Control"` 折叠左右两颗物理修饰键）。

### 2. `HeldInputPortV1`：长按是状态，不是事件

```ts
export type HeldKeyMapV1 = Readonly<Record<string, InputActionIdV1>>;

export interface HeldInputStateV1 {
  readonly heldActionIds: ReadonlySet<InputActionIdV1>;
}

export interface HeldInputPortV1 {
  readonly state: {
    getCurrent(): HeldInputStateV1;
    subscribe(listener: () => void): () => void;
  };
}
```

- 长按动作**不进 InputRouter**（router 路由离散事件到上下文处理器；长按
  是持续状态），**不进 CommandLog**（物理键永远不是权威输入；Story 订阅
  端口后自行决定表现策略，如钉倍率、开 auto）。
- 端口由 web 组合器在 `ui()` 之前创建并放进 ui 上下文（`heldInput`），
  与 `presentationRate` 同款形状；适配器在挂载后按 `input.held` 安装，
  与 `nativeBehaviorReset` 同址、同销毁钩子。

### 3. 接合与释放规则（适配器集中承担的浏览器边角）

- **接合（engage）过滤**：可编辑控件（input/textarea/select/
  contenteditable）、`data-native-text`、调试铬（`data-debug-dock` /
  `data-devdock-window`）、`data-blocking-focus-scope` 内不接合；IME
  组字（`isComposing` / `"Process"`）不接合；`defaultPrevented` 的事件
  不接合（尊重更早的认领者）。**故意不含**通用交互控件选择器：焦点落在
  舞台按钮上时按住修饰键没有原生含义，不该挡快进。
- **释放（release）无条件**：接合后的键无论 keyup 落在哪个作用域都释放；
  `window` blur 释放全部（切窗/Ctrl+Tab 不卡键）；适配器卸载释放全部。
- repeat 忽略；多键映射同一动作按引用计数收敛（任一键按住即视为持有）。
- 不 `preventDefault`：长按修饰键期间的浏览器默认行为（若有）保留。

### 4. 动作 ID

`playerInputActionIdsV1` 增加 `fastForward = "player.fast_forward"`：
快进与 toggleAuto/toggleSkip 同族，是玩家/表现控制动作，不是游戏语义。

## 首消费者

外部试点仓的 Ctrl 快进从裸 `window` 监听迁移到
`input.held: { Control: playerInputActionIdsV1.fastForward }` + 订阅
`heldInput` 端口。「按住=钉 2×+开 auto，松开恢复基础倍率+关我们开的
auto，hold/过场只加速穿进 say 补开」的策略保持应用侧不变；裸监听删除，
编辑框/调试铬内按 Ctrl 不再误触发。

## 非目标

- 输入上下文栈、按键重绑定 UI、手柄长按、输入事件总线——单一消费者
  撑不起，等第二个真实需求。
- 程序化的 `restoreTextSelection(element)` 类 API——属性恢复
  （`data-native-menu` / `data-native-text`）是正解，保持。
- 调试铬自持键（坞 Escape 等）维持特权层现状，不并入。

## 验收

- 引擎单测：接合/释放、engage 过滤各作用域、release 无条件、blur 全
  释放、repeat 忽略、多键同动作引用计数、卸载清理。
- 内部仓声明迁移（e2e/template/examples）+ `deno task check` 绿。
- 试点仓迁移到端口 + 全量 vitest 绿。
- `features.md` 输入条目更新为统一 `input` 块与长按端口。
