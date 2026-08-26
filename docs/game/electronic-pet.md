# Electronic Pet Reference Product

状态：**2026-08-27 经所有者接受的活动产品合同；M1–M2 已实现，M3 已开始，完整产品仍为 WIP。**
`electronic-pet` 是工作名与预期应用 ID，最终品牌名不属于本合同。实现计划见
[Electronic Pet Reference Product 实施计划](../engine/plans/2026-08-27-electronic-pet-reference-product.md)。

本项目是原创电子宠物游戏，不是 `references/Meow-Generator` 或其他项目的移植。Meow Generator 只作为
外观生成与 3D 表现研究输入；其代码、素材、身份、测试和工程结构不得进入产品。参考游戏只提供公开行为与
设计经验，产品表达、代码、素材和规则均由 SillyMaker 自有实现。

在本产品完成并通过独立验收前，《雨巷猫舍》仍是当前旗舰。新产品完成接替条件后，Cat Cafe 将连同其应用、
发布路径和明确放弃的预发布 Save floor 一次性退役，不保留兼容 alias 或半个旧产品。

## 1. 产品命题

玩家刚领养一只仍在适应新家的小猫。游戏的核心不是把几根数值条刷满，而是：

> 观察猫的姿态、声音和主动行为，理解它当下的意愿，在尊重边界的过程中逐渐成为它信任的家人。

成熟产品提供了互补参考：

- [Neko Atsume 2](https://www.nekoatsume.com/sp2/index_en.html) 用猫对食物和物品的偏好建立“布置、离开、
  回来发现”的自主生活循环；
- [Neko Atsume Purrfect](https://www.nekoatsume.com/vr/index_en.html) 证明逗猫棒、抱起与腹部互动可以成为
  直接空间交互；
- [Nintendogs + Cats](https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/manual-3DS-nintendogs-cats-en?_a=DATAg1AAZAA0)
  以反复相处、抚摸和训练建立关系与互动熟练度；
- [Tamagotchi Uni](https://tamagotchi-official.com/manual/toy/uni/Uni_WEB_IS_EN.pdf) 让时间、需求、人格和物品
  偏好产生长期后果；
- [Cats Protection 的抚摸指南](https://www.cats.org.uk/cats-blog/how-to-pet-a-cat) 提醒：互动应由猫决定，
  顺着毛发生长方向触摸，露出腹部通常表示信任，却通常不是触摸邀请；
- [猫对不同身体区域触摸的行为研究](https://www.sciencedirect.com/science/article/pii/S0168159114002779) 与
  [AAFP/ISFM 猫友好互动指南](https://pmc.ncbi.nlm.nih.gov/articles/PMC10845437/) 都提示：头脸区域通常
  更容易接受，尾根附近的 caudal 区域更容易出现负面反应，实际偏好仍有明显个体差异。

本产品不吸收广告、抽卡、轮盘、内疚式惩罚、服务器依赖或与猫无关的小游戏大厅。游戏的长期价值来自猫的
自主性、玩家逐渐学会阅读反馈，以及双方形成的共同记忆。

## 2. 核心循环与剧情进展

每次短会话遵循同一循环：

```text
观察猫正在做什么
  -> 判断需求、邀请或拒绝
  -> 选择照料、接触或共同游戏
  -> 猫立即以身体、声音和动作回应
  -> 形成短期心情、长期信赖与有意义的记忆
  -> 布置食物、玩具和环境后离开
  -> 下次回来看到离线期间的少量可读事件
```

领养过程分为五个可观察阶段，而不是五张解锁页面：

1. **到家**：猫躲在航空箱或安全角落；玩家准备水、食物、猫砂和藏身处，强行触碰只会延长警戒。
2. **第一次主动靠近**：玩家给出空间后，猫开始探索、观察和闻手。
3. **形成日常**：玩家发现第一种食物、触摸方式或玩具偏好，猫开始在同一房间休息。
4. **建立信任**：猫会在玩家面前睡觉、梳理、侧躺或展示腹部，并接受更近距离的照料。
5. **成为家人**：猫主动迎接、叼来玩具、踩奶、趴腿或发出少量特殊接触邀请。

剧情节点由已经发生的行为事实和不同会话中的关系证据推动，不由重复执行同一个按钮得到的裸数值触发。

当前 M2 实现覆盖前三个阶段的早期闭环：准备水、猫砂、藏身处与食物后，小猫先观察，再通过安静陪伴或低频
时间结算主动靠近并发出闻手邀请；形成日常要求跨会话、多样证据。建立信任与成为家人仍属于 M3 及之后，
不能由这个早期闭环代替。

## 3. 信赖与心情

### 3.1 两个正交轴

**信赖**是缓慢、长期的关系进展。它决定猫愿意开放哪些互动，但不代表猫随时同意。第一版使用四个稳定
阶段：

- `newcomer`：躲藏和观察；正确行为主要是准备环境、安静陪伴和保持距离；
- `familiar`：会主动闻手、靠近和蹭脸；心情合适时接受短暂的头脸接触；
- `trusting`：会在玩家附近休息、展示脆弱姿态并接受梳理或背部接触；
- `bonded`：解锁迎接、叼玩具、踩奶、趴腿和少量明确的特殊邀请。

信赖不能靠连续摸同一区域刷取。阶段推进至少组合不同会话中的多种证据：响应猫主动发出的邀请、主动尊重
拒绝、在警告出现前从细微信号及时停止、找到偏好、完成共同游戏，以及稳定照料。警告出现后及时停手只阻止
进一步的负面结果并帮助 mood 恢复；反复触发 warning 永不累积关系收益。

**心情**是短期状态。它决定猫此刻是否愿意互动以及反馈强度，但不会永久删除已经形成的关系：

- `guarded`：警戒或躲避，适合安静陪伴和布置资源；
- `calm`：放松观察或休息，依据信赖接受低强度互动；
- `social`：主动靠近、蹭脸或叫声邀请，适合抚摸和梳理；
- `playful`：适合追逐、扑击和玩具，直接伸手可能被当成猎物；
- `overstimulated`：已经过度兴奋，尾、耳和皮肤先给出停止信号。

饥饿、精力、舒适和好奇是照料输入，不再复制成第三套关系进度。它们影响 activity 和 mood；高信赖的猫也会
因为困倦或过度刺激而拒绝接触，低信赖的猫也可能因好奇主动闻手或玩远距离玩具。

### 3.2 固定求值顺序

不要维护完整的“信赖 × 心情 × 姿态 × 手势 × 个性”组合矩阵。每次互动使用一条可解释的固定管线：

```text
当前姿态是否让部位可触达
  -> 猫是否发出了仍有效的邀请
  -> 信赖阶段是否允许尝试这种互动
  -> 当前心情的接受度修正
  -> 个体偏好修正
  -> 手势质量与本次互动持续时间
  -> 近期有意义的记忆
  -> invite | accept | tolerate | warn | refuse
```

`tolerate` 不是成功。表现必须让玩家区分“猫没有离开”和“猫正在享受”；若玩家只看按钮或数值、不看动画、
姿态和声音也能稳定获得最优结果，本互动设计即未通过验收。

第一版权威状态只保存：信赖阶段与关系证据、短期 mood、needs、当前 activity/pose、可选 invitation、少量
稳定偏好、玩具熟练度，以及最多八条近期语义互动结果。`willingness` 由这些状态派生，不单独持久化；
pointer 轨迹、骨骼、动画帧、粒子和瞬时物理不进入 Save。

### 3.3 猫的自主行为

心情和 activity 必须有玩家能够理解的原因与恢复路径，不能由隐藏定时器直接翻转，也不能被一个按钮直接设为
目标值。每次 activity 在一个低频语义结算点选择，读取与候选 activity 相关的 needs、trust、环境资源和近期
行为；互动求值独立读取 mood、trust、固定偏好和 gesture quality。需要变化时可以消费产品已有的确定性
随机源，但相同权威输入仍必须可 replay。后续活动只有在真实规则需要时才增加 mood/preference 输入，不为满足
字段清单制造无效分支。

每个 activity 声明最短停留时间、可打断条件和近期重复抑制。重要转换先通过姿态、注视、叫声或环境动作给出
可读前兆；玩家始终可以选择不接触，猫也可以在没有玩家输入时探索、休息、玩耍或主动邀请。信赖只吸收跨会话、
多样且不可重复刷取的语义事实，不从每次自主 tick 或相同动画循环获得增量。

同一个 urgent activity 在最短停留期内不能用同一 need 自我打断并重建 occurrence；只有另一个 urgent need
可以提前改选。自然到期时只 O(1) 结算一次当前 activity 的直接结果，再选择 successor；长离线不逐分钟模拟，
被其他 urgent activity 提前打断的未完成行为也不获得完成收益。

这些规则使用普通 TypeScript、现有确定性 State 和产品本地的冷编译数据实现；本项目不因此建立通用 behavior
tree、AI scheduler 或新的规则 DSL。

### 3.4 身体区域、毛流与个体偏好

直接抚摸只以鼠标和触控为一等输入。鼠标使用按下、连续移动、抬起；触控使用手指持续接触与滑动。轻点、
取消、轨迹过短或离开有效接触面不能伪装成一次完整抚摸。键盘和手柄不提供“等价抚摸”动作；菜单、设置、
Inspector 等普通 DOM UI 仍遵循平台原生的键盘和无障碍语义。

`hidden` 姿态不暴露可提交的触摸区域，界面必须说明下一步照料动作；但只要模型仍有可见、可命中的身体部分，
鼠标 hover 与 mouse/touch down 就必须给出 presentation-local 的阻止光标和“还不准备被触碰”反馈，不能静默
忽略。这项反馈不创建 gesture accumulator 或 Game command。猫已经可见但仍是 `newcomer` 时，完成的直接触摸
会得到明确拒绝和表现反馈，但不会增加信赖、建立首次接触或发现身体偏好；也不能让照料按钮的成功结果伪装成
触摸反馈。完成闻手后，当前姿态可达的区域才按心情、信赖、固定偏好和手势质量求值。
场景说明与状态浮层不得截获底层画布指针；一次已在起始区域形成有效轨迹的手势可以在抬手前短暂离开表面，
离面段本身不计入方向或距离。鼠标悬停在当前可达区域时应显示平台原生的可抓取光标；按住后以跟随指针的
轻量进度反馈说明还需滑动多少，达到有效距离后再提示可松手完成。轻点或短拖必须给出“继续滑动”类反馈而
不是沉默；触控复用按下与进度反馈但不伪造 hover。

身体区域采用两层规则，而不是把某个部位写成固定奖励按钮：

- 脸颊、下巴、头顶、颈部和肩部是较稳定的正向先验，适合作为早期安全接触；
- 背部从中性到正向，仍受速度、方向、持续时间与个体偏好影响；
- 尾根是高个体差异的敏感区域，不是通用“舒服点”。这项政策保留，但 M2 不提供 tail-root authored volume、
  runtime binding 或 gameplay rule；它明确 defer，不能以不可达 rule/profile 冒充已实现互动。未来实现时，
  玩家应从耳朵、尾巴、皮肤、姿态和离开行为逐渐发现这只猫的真实偏好；
- 腹部默认敏感，继续由独立 invitation 保护；尾巴、腿和脚掌不作为第一版主动抚摸目标。

每个较小的可编辑 interaction volume 可以声明一个模型局部坐标下的 `preferredStrokeDirection`。renderer 将
连续 raycast 命中转换到该局部空间，按累计位移与声明方向的关系归类为 `with-fur`、`cross-fur` 或
`against-fur`。曲面通过少量分区和各自的方向表达，不建立 UV 向量场、毛发模拟或通用 gesture DSL；
Inspector 以简单箭头显示和编辑这项属性。顺毛是正向先验，横向和逆毛依次提高警告/拒绝概率，但当前 mood、
信赖、邀请和固定猫的个体偏好仍可改变最终表现。

固定猫的完整偏好由静态产品内容持有；State 只保存玩家已经发现的偏好证据，不保存另一套动态人格矩阵。

### 3.5 腹部互动

`supine-relaxed` 只表示猫露出腹部；独立、当前的 `belly_offer` invitation 才表示可以尝试触摸。

- `newcomer` / `familiar`：可能偶尔露腹，但玩家触碰时猫会收腿、转身或轻拍手；
- `trusting`：露腹首先是信任表现，正确反馈通常是继续摸头、慢眨眼或停下来观察；
- `bonded` + `calm/social` + belly-friendly preference：猫以放松前爪、持续注视等更明确动作发出
  `belly_offer`；
- 慢而短的手势得到呼噜、眯眼、脚趾蜷缩和进一步舒展；
- 过快或过久先进入 warning window；玩家及时停手只终止负面升级并帮助 mood 恢复，忽略警告才转为抱手、
  兔子蹬、翻身离开或 `overstimulated`；
- 主动尊重已有拒绝、在 warning 前读懂停止信号或正确响应 invitation 可以成为关系证据；重复诱发 warning
  没有正向收益。

拒绝不应造成夸张惩罚；真正损害关系的是在已经明确拒绝后持续强迫。一次失败可以通过安静恢复和之后的正确
互动消退。

### 3.6 手势与表现边界

渲染层在本地收集指针轨迹、raycast、动画和声音，只在手势结束或产品明确的低频结算点提交一次有界语义结果：

```ts
type PetGestureResult =
  & {
    readonly targetInteractionId: string;
    readonly expectedPoseOccurrenceId: string;
    readonly expectedInvitationOccurrenceId?: string;
    readonly speed: "slow" | "steady" | "fast";
    readonly duration: "brief" | "sustained";
  }
  & (
    | { readonly gesture: "tap" }
    | {
      readonly gesture: "stroke" | "rub";
      readonly direction: "with-fur" | "cross-fur" | "against-fur";
    }
  );
```

`targetInteractionId` 已映射到身体区域，不在 command 中复制 `zone`。权威规则验证当前 pose/invitation，
再提交 mood、trust evidence、preference memory 和结果。不要为每个 `pointermove` 创建 Game command，也不要
等待权威提交才开始轻微的 renderer-local 跟手反馈。输入设备来源、原始轨迹、逐帧 raycast 和动画反馈只属于
renderer，不进入 State、Save 或 replay。指针进度直接投影同一个局部空间有效距离阈值；不能在 UI 复制第二套
判定，也不能因视觉反馈为每个 `pointermove` 触发 React render 或额外 Game command。

## 4. 第一版完整产品分母

本项目是原创完整产品，primary baseline 就是本合同；参考游戏都是 secondary inspiration，不能在实现中换成
某个较小原型或纵向切片。第一版至少包含：

- 一只固定人格、深入制作且具有稳定 identity 的猫；外观变体不能代替行为深度；
- 一个随关系逐步开放的主要房间，具备可理解的昼夜/氛围变化；
- 四个信赖阶段、五种心情、四类照料输入和至少八个主要 activity/pose；
- 闻手、头脸抚摸、背部抚摸、腹部试探、喂食、梳理、逗猫棒、球或寻找游戏；
- 三种玩法不同的玩具：逗猫棒、球、益智喂食器；至少一种必须是真实拖动/投掷或追逐交互；
- 至少十六个自主行为、二十个制作过的反应片段、四至五个关系里程碑；
- 每类直接互动至少有可读的接受、警告和拒绝反馈；
- 有限且可解释的离线结算、回归摘要、托管/旅行模式，以及不会因长时间离开造成死亡或永久伤害的恢复路径；
- Save/reopen、重置确认、照片/档案/回忆册、设置、音频、locale-addressable 中英文本；
- Browser 与当前 Deno Desktop static preview；宽窄屏、鼠标/触控直接互动、普通 DOM UI 键盘可达、
  200% zoom/reflow、reduced motion 和默认静音自动测试。

普通玩家界面不直接展示信赖数字、精确心情算法或“最优按钮”。Inspector 可以显示权威状态、当前求值路径、
阻断原因、最近语义结果和资源/表现绑定，供开发和调试使用。

截至 M2，已实现的内容宽度是 8/16 个自主行为、脸/颈/背 3/8 类互动、逗猫棒 1/3 种玩具，以及
`accept | tolerate | warn | refuse` 四类表现映射；Save/reopen、reset、有界离线结算与回归摘要也已接入。
同页嵌入式 Inspector 通过产品私有只读 publisher 显示 activity/reason、pose、mood、needs 与关系摘要，
没有 gameplay write port；独立 Inspector 没有同页 Player 时保持 detached。其余完整产品分母继续由 M3–M5
承担。M3 的首个视觉切片已经用产品本地房间构图、环境补光、阴影和宽窄屏响应式相机替换了最早的空房验证
画面，并保持同一作者 camera/light/Object authority；现有猫 GLB 和房间细节仍不是最终美术验收。M3 将继续
统一猫与居住空间的产品方向，并同步扩充姿态、动画和声音反馈；M4 再完成代表性
设备上的视觉、可访问性和性能收口。交互是否可发现、目标是否可触达、反馈是否可读不属于“以后美化”，必须在
对应玩法里即时修正。

## 5. 工程与创作合同

### 5.1 责任分层

推荐工程 locality：

```text
src/
  game/          # trust、mood、care、memory、command 与规则
  content/       # 猫、食物、玩具、反应、动画和资源声明
  scenes/home/   # 房间空间构图、对象、局部演出和作者数据
  story/         # 领养与关系里程碑
  presentation/  # Three/React renderer、raycast、动画与瞬时反馈
  ui/            # DOM HUD、设置、相册和可访问替代操作
  application/   # 产品 composition root、Host 与 persistence 接线
  tooling/       # 产品的 Inspector binding 与作者适配
```

权威 gameplay State、静态内容、renderer-local state、Host wall time/storage、资源 owner 和 Input owner 必须
明确分离。复杂行为规则继续使用普通 TypeScript；结构、对象、公开参数和资源绑定使用可寻址作者数据。既不把
所有代码变成表单，也不允许关键属性散落在 Scene JSON、GLTF transform、TS 常量和 React state 四个权威中。

### 5.2 Object 与代码绑定

每个需要人类或 Agent 微调的房间物体、猫主体、玩具、camera/light 和三维互动区必须拥有稳定逻辑
`objectId`。代码侧明确投影：

```text
objectId
  -> renderer/model node
  -> asset / clip / material declaration
  -> behavior owner
  -> animation / interaction binding
  -> source location and diagnostics
```

GLTF node/bone 名可以作为导入映射来源，但不能偷偷成为 gameplay 或 Save identity。产品的 `deno task check`
组合共享 Story `app check` 与产品本地 PetScene compiler，至少报告重复 ID、缺失/孤立引用和无法解析的对象到
代码绑定。运行热路径消费冷编译 direct plan，不逐帧遍历作者树、
序列化 Inspector 数据或把对象镜像成另一份 React gameplay State。

### 5.3 Inspector 与未来编辑器压力

产品完成前必须通过真实作者任务：

- hierarchy 与真实画布 picking 能选中猫、三个玩具、主要房间对象、camera/light 和互动区；
- 人类无需修改 TypeScript 即可微调真实需要的 3D transform、camera framing、light、互动 volume/socket，
  以及明确公开的材质/动画参数；
- Inspector 显示代码 owner、资源/clip/source、interaction intent、当前状态和诊断；
- Agent 使用与人类相同的文档、structured operation、undo/redo、CAS 和 compiler diagnostics 完成修改，
  不生成隐藏的 Agent-only 表示；
- 人类可以在 Agent 修改后继续选择、审查、微调和保存；Inspector preview 不直接写 gameplay State；
- 普通 Player final graph 排除 Inspector 和 source-write implementation。

通用 Authoring Scene/Inspector 继续负责 2D object hierarchy、source map、真实 Stage preview、有限属性编辑与
只读 interaction/Motion/Timeline facet。M1 没有把它扩成通用 3D editor，而是在同一个 Authoring Host 内使用
workspace-private product companion，使内部 Three objects、bone/socket 和 raycast volumes 可定位、可编辑并
共用原有 operation/CAS owner。M2 的同页只读 runtime publisher 补充 activity reason、mood、needs 与关系
摘要；两条接缝都保持产品局部，不构成 public 3D/Inspector framework。

当前实现继续直接使用成熟 Web 3D/React 库。不得因此建设通用 3D engine、ECS、物理抽象、万能 component
registry、Prefab、Blueprint VM 或最终编辑器。

## 6. 性能与产品质量

- 首屏只加载主要房间、猫和当前交互需要的资源；相册、照片工具、后续内容和作者工具保持按需；
- 当前低端目标设备、主流手机/平板/电脑和 Deno Desktop 分别记录 startup、GUI readiness、first
  interactive、初始 JS/CSS/assets、常驻 heap、互动 Long Tasks、帧时间和资源释放趋势；
- 交互目标为主流设备平稳 60 fps，接受的当前低端 floor 不低于稳定 30 fps；具体代表设备和 raw baseline 在
  第一轮真实 3D 集成后冻结，不把某台机器数字写成跨机器 CI 阈值；
- device-pixel-ratio、阴影、后处理和物理细节使用少量质量档位；页面隐藏、静止或低功耗策略应暂停或降低无效
  frame loop；
- 离线进展以有界、解析式摘要结算，不逐分钟重放；Save 不包含模型、缓存、动画帧或物理世界；
- 用 profiler 和产品 benchmark 证明问题后再增加 Worker、资源缓存框架或新的 Host seam。

## 7. 明确非目标

- 多宠物、繁殖、联网社交、账号、云端生存依赖或位置/AR；
- 广告、付费货币、抽卡、轮盘和通用小游戏大厅；
- 猫死亡、永久伤害或因用户离线制造内疚的惩罚；
- 完整身体生成器、SDF 编辑器、GLB 导出或 Meow Generator 兼容层；
- 通用 3D engine、ECS、物理框架、Prefab、Blueprint/行为图、最终编辑器；
- public Mod resolver/ABI/SDK/distribution、Desktop HMR activation 或 Desktop production promotion。

这些非目标不否定以后由真实产品证据激活的能力；它们只防止第一版在证明核心关系与作者工作流之前扩张。

## 8. 完成定义

产品只有在以下条件全部满足后才能称为完整、接替 Cat Cafe 或作为引擎能力证据：

1. §4 的数量和全部早期、中期、后期关系阶段均可真实到达，不以一日循环或腹部互动纵切代替其余内容；
2. 不查看隐藏数值也能从猫的表现理解邀请、接受、忍耐、警告和拒绝；
3. Save/reopen、离线回归、输入、响应式、i18n、音频、accessibility、预算和发布路径通过产品级验证；
4. §5.3 的人类与 Agent 作者任务通过，代码与 Object 绑定可定位、可检查、可继续编辑；
5. 独立 product review 对照 semantic coverage table 确认完整，独立 engine review 只把中立可复现问题提升为
   引擎缺口；
6. 新产品拥有自己的 release floor 决策，Cat Cafe 的现有 Save floor、E2E、网站和 workspace 责任按实施计划
   显式处置后，才执行旗舰切换与旧产品删除。
