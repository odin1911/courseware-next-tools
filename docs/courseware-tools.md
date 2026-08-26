# Courseware Tools 页面说明

本文汇总本仓库三个资源验证页面的定位、入口、操作方式和已验证结论，可随工具项目独立迁移。

## 页面与入口

| 页面 | 默认入口 | 职责 |
| --- | --- | --- |
| `dragonbones-tool` | `/src/pages/dragonbones-tool/index.html` | DragonBones zip 巡检、动作测量、帧导出和 Pixi 文本注入验证 |
| `ddvk-answer-area-lab` | `/src/pages/ddvk-answer-area-lab/index.html` | DDVK 答题区的共享播放器与直连 Pixi 对照诊断 |
| `spine-tool` | `/src/pages/spine-tool/index.html` | Spine zip 诊断、slot/region 预览、专项资源契约检查和运行时对照 |

这些页面只负责暴露资源与运行时事实，不承载正式课件业务流程。

## DragonBones 工具

### 功能

- 批量加载 DragonBones zip，显示加载状态、armature 和 animation 列表。
- 切换 armature、播放或重播指定动作。
- 按真实宿主尺寸逐帧采样动作 bounds，输出最大区域和 `left/top/right/bottom` 安全区。
- 比较 required padding 与已录入的页面 padding/offset，标记裁切和位置漂移风险。
- 将指定动画逐帧导出为图片。
- 在 Pixi 舞台层、骨架根层或指定 `slot.display` 注入文本，验证原模板的显示对象替换路径。

### URL 模式

- 默认入口：查看通用资源列表。
- `?mode=<asset-id>`：只查看指定资源，例如 `?mode=count2_farm`。
- `?feature=frame-export`：进入逐帧图片导出页面。

### 动作裁切测量流程

1. 把目标 zip 加入页面资源配置，并把卡片宽高设为正式使用场景的宿主尺寸。
2. 选择 armature 和 animation，执行动作分析。
3. 记录最大区域与四边安全区。
4. 使用方放大实际 canvas，并用等量负偏移抵消新增的 left/top padding，保持原始屏幕落点。

已验证案例：`SKR_malu.zip` 在 `244 x 125` 宿主下播放 `error`，最大区域为 `x=-255.85 y=-75.81 w=527.70 h=171.32`，建议安全区为 `left=256 top=76 right=28 bottom=0`。

### Pixi 文本注入

- 舞台层：文本坐标按 canvas 像素计算。
- 骨架根层：文本跟随根 display 的缩放和偏移。
- `slot:<name>`：用 `PIXI.Text` 临时替换 slot display；关闭或切换目标时恢复旧 display。

`KJ_QA_PP_v2 Bubble` 的 `text_area` slot 已用于同 canvas 嵌字验证：替换后洋红占位块消失，文字像素进入 Pixi 渲染树。

## DDVK 答题区诊断页

页面并排运行两条链路：

- 共享封装：通过 `DragonBonesPlayer` 播放。
- 直连基线：直接调用 `PixiSkItem.createMovie()` 播放。

“短泡稳定”预设使用根骨架 `armatures/skeleton_movie_1` 的 `wait_2` 动作。直连链已确认：

- `bubble slot displayIndex = 0`
- `bubble child armature = armatures/one`
- `bubble rect` 可正常取得

因此，短泡缺失不应直接归因于 `@alo7/dragonbones-pixi`。已定位过的本地问题是共享封装在空排除名单下误拆全部 child armature。诊断顺序应为：共享封装、业务动画切换与挂载、最后才是底层包。

`Non-existent animation: armatures/one -> wait_2` warning 与短泡 child armature 是否存在不是同一问题，不能单独作为短泡故障证据。

## Spine 工具

### 功能

- 自动扫描页面 assets 中的 Spine zip。
- 校验 atlas、json、纹理文件并输出 zip diagnostics。
- 使用 Spine 3.8 WebGL runtime 播放动画。
- 读取动画、slot、attachment 和 atlas region。
- 导出 region 位图及 slot 预览。
- 对比 direct runtime 与共享 `SpinePlayerWebGl` 的显示结果。

### URL 模式

- 默认入口：通用 Spine 资源列表，不展示 Count2 Farm 专项资源。
- `?mode=count2-farm`：只展示 Count2 Farm，并提供 direct runtime 与共享播放器对照。
- `?mode=kjt-ap-draw`：只展示 Draw 三角板样本及资源契约检查结果。

### Count2 Farm

Count2 Farm 对照页用于区分原始 runtime 基线与项目播放器最终效果：

- direct runtime 面板只验证动画本体，不显示 zip 扩展资源 `bg.png`。
- shared player 面板应在骨骼层下显示 `bg.png`。
- atlas region、slot 位图和缩略图导出不混入整张背景图。

### KJT_AP_DRAW_v2 契约检查

Draw 样本必须满足：

- 存在 `start / animation / end` 三个动作。
- 存在 `draw / draw2 / draw3` 三个 slot。
- 三个 slot 的默认 attachment 均为可导出的 `region`。
- `draw` 可导出 mask 位图与偏移。
- `draw2`、`draw3` 可导出有效缩略图。

缺少任一硬条件时应明确失败，不使用占位 UI、其他动作或近似 mask 让样本“看起来可用”。

## 使用边界

- 工具结果用于资源诊断和量化，不代替原模板源码、EXML、PRD 或业务状态链证据。
- 工具页面中的预览布局、实验开关、direct runtime 对照和 fallback 不应复制到正式课件。
- 页面专项结论需要保留宿主尺寸、动作名、测量方式和结果，避免只记录截图观感。
