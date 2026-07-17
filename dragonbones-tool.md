# dragonbones-tool 工具说明

本文档只说明同级项目 `../courseware-next-tools/src/pages/dragonbones-tool` 的职责边界与使用方式。

## 定位

- 通用 DragonBones 资源验证工具。
- 用于确认 zip 资源能否加载、包含哪些 armature、暴露哪些动画。
- 用于量化某段动作在固定宿主尺寸下的最大占用区域，以及页面侧所需的安全区 padding。
- 用于预研 Pixi 运行时文本注入：舞台层、骨架根层、`slot.display` 替换。

## 适用场景

- 某个 DragonBones zip 是否损坏或加载失败。
- 某个资源包含哪些 armature、动画能否正常播放。
- 某段动作是否存在显示裁切，页面本地需要补多少 padding。

## 使用流程

1. 把目标 zip 资源加入 `../courseware-next-tools/src/pages/dragonbones-tool`，并把卡片宽高设成正式页面中的真实宿主尺寸。
2. 切到目标 armature 和 animation，点击“分析当前动作”。
3. 读取工具页输出的 `最大区域` 与 `建议安全区`。
4. 优先把 `left/top/right/bottom` 回写到页面本地动画宿主补偿，而不是先改共享 `DragonBonesPlayer`。
5. 页面侧补偿需要同时放大实际渲染画布，并用等量负偏移抵消新增 padding，保持原模板屏幕落点不变。

## 嵌字调试

1. 在资源卡片中打开“嵌字调试”。
2. 选择目标：
   - `舞台层`：把 `PIXI.Text` 加到 DragonBones display 的父级舞台，坐标按 canvas 像素理解。
   - `骨架根层`：把 `PIXI.Text` 加到当前 armature 根 display，文本跟随根 display 的缩放和偏移。
   - `slot: <name>`：用 `PIXI.Text` 替换当前 armature 的 `slot.display`，用于验证原模板里 text slot / image slot 注入路径。
3. 调整文本、坐标、字号和颜色，观察 canvas 内渲染结果。

当前项目中尚未发现正式模板直接使用 `PIXI.Text` 嵌入 DragonBones；已有代码主要使用 `getDisplay()` 做 bounds / 位置对齐，或用 `slot.childArmature = null` 做子骨架裁剪。工具页的嵌字能力先作为验证入口，不能直接复制到正式模板。

源码依据：

- `/Users/limin/demo/DragonBonesJS/DragonBones/src/dragonBones/armature/Slot.ts` 的 `display` 注释明确把 `slot.display = new yourEngine.TextField()` 作为替换显示对象示例。
- `/Users/limin/demo/DragonBonesJS/Pixi/4.x/src/dragonBones/pixi/PixiSlot.ts` 在 `_replaceDisplay()` 中会把新显示对象加入 armature display、与旧显示对象交换层级并移除旧对象；工具页 slot 嵌字因此需要保留旧 display，关闭或切换目标时恢复。
- `KJ_QA_PP_v2 Bubble` 卡片使用 `src/pages/KJ_QA_PP_v2_2026/assets/skeleton/PP_bubble_0.zip` 做同 canvas 嵌字验证。原模板不是对 `#ff00ff` 做色键透明化，而是在 `BubbleView` 初始化时取得 `text_area` slot，用默认 display 的宽高计算文本布局后执行 `mTextAreaSlot.display = this.textSprite`。因此工具页水泡卡片默认开启嵌字，并把目标设为 `slot:text_area`；E2E 先确认该 slot 替换后 canvas 不再出现洋红占位块，再读取蓝色文字像素确认文字已进入 Pixi 渲染树。

## 已验证案例

- `SKR_malu.zip` 已按 SKR 主场景真实宿主 `244 x 125` 建卡。
- `error` 动作分析结果：最大区域 `x=-255.85 y=-75.81 w=527.70 h=171.32`。
- 对应建议安全区：`left=256 top=76 right=28 bottom=0`。
- 因此 SKR 主场景最终取值为 `MALU_CANVAS_PADDING_LEFT = 256`、`MALU_CANVAS_PADDING_TOP = 76`。

## 注意

- 这不是正式课件页面，不提供业务状态流转。
- 不用于验证页面私有 UI 叠字或答题区布局问题。
- 不要把工具页里的局部调试逻辑直接当成正式模板实现。
