# 全量动画资源视频替代实施计划

## 目标
- 将 `src/pages/animations/assets` 中 14 个 DragonBones ZIP、63 个动作全部转换为 VP9 alpha WebM、HEVC alpha MOV、PNG 图集/单帧 PNG。
- 在 `KJG_QAP_BD_v2_2026_video` 中接入这 14 个资源，移除对应 DragonBones 加载路径，同时保持已验收交互和视觉效果。
- 把“页面逐帧导出 → 三格式生成 → 模板播放”变成可重复执行的工程流程，为后续 AI alpha 视频替换输入保留同一出口。

## 范围与不做
- 范围包含 14 个已使用资源：5 个角色、标题、开/关帘、闪光、金币、成功/失败、倒计时、心碎。
- `src/pages/KJG_QAP_BD_v2_2026` 样板保持不变；只改 `KJG_QAP_BD_v2_2026_video`。
- 不删除共享 DragonBones 组件和依赖，因为原样板及题目数据动态传入的骨骼资源仍使用它们；本次只移除保留的 14 个动画库 ZIP 在视频模板中的生产和播放路径。
- 不改变已确认的浏览器格式矩阵，不新增播放器框架或第三方依赖。
- 不在本阶段解决 Windows/Linux 生成 HEVC alpha MOV；该格式继续由 macOS `hevc_videotoolbox` 构建节点生成。

## 已确认事实
- 动画库现有 14 个 ZIP、63 个动作，其中 5 个角色各 9 个动作，其余 9 个资源各 2 个动作。
- 当前已完成 `BD_laki`、`BD_mission_successed`、`count`，共 10 个视频动作、3 个单帧动作。
- 剩余 11 个资源预计新增 39 个视频动作和 11 个单帧动作；最终准确数量以自动读取的帧元数据为准。
- `AnimationFrameExporter` 已能计算资源联合画布、锚点并返回 straight-alpha PNG data URL；缺少浏览器到磁盘的批量导出。
- `build-animation-assets.mjs` 已能把帧目录或 alpha 视频生成 WebM、MOV、PNG 图集和 manifest，并已处理 MOV 白边问题。
- `RasterAnimationPlayer` 已覆盖格式选择、视频失败主动切图集、循环、完成回调、暂停恢复和中途接续。
- Playwright、Vite、FFmpeg 已在现有环境中可用，不需要新增包。

## 修改点

### 1. 自动导出全部透明帧和配置
- 新建 `src/pages/animations/exportProfiles.json`：记录 14 个资源的场景原点和循环动作；角色动作共享同一画布/锚点。
- 修改 `src/pages/animations/App.tsx`：从 profile 读取原点，替代目前只覆盖 3 个资源的 `EXPORT_ORIGINS`。
- 保持 `src/pages/animations/AnimationFrameExporter.tsx` 的逐帧渲染职责；仅在批量脚本实际需要时补充可序列化元数据，不改变渲染算法。
- 新建 `tools/ai-animation/export-dragonbones-frames.mjs`：使用现有 Vite 和 Playwright 启动导出页，按 ZIP 列表读取 `window.__dragonBonesFrameExporter`，写出连续 PNG 帧和 14 份 config；已完成的 3 份 config 必须保持画布、锚点、帧数兼容。
- 新建 `tools/ai-animation/export-dragonbones-frames.test.mjs`：验证 data URL 解码、帧命名、profile 缺失时报错及 config 生成。
- 预期行为：一次命令可从 14 个 ZIP 得到可重复的帧目录与配置；任何资源、动作、帧或 profile 缺失时整体失败，不产生半成品目录。

### 2. 批量生成三格式资源
- 修改 `tools/ai-animation/build-animation-assets.mjs`：保留单资源接口，增加配置目录批处理入口；每个资源继续使用临时目录和原子重命名。
- 修改 `tools/ai-animation/build-animation-assets.test.mjs`：覆盖批处理排序、已存在输出、单资源失败时的错误上报；保留 WebM/MOV/图集命令断言。
- 新增 `tools/ai-animation/configs/*.json` 至完整 14 份；配置由导出脚本生成，不手工复制帧数和画布。
- 生成 `src/pages/KJG_QAP_BD_v2_2026_video/assets/raster/<asset>/` 全部 14 个目录；单帧动作只保留 PNG，多帧动作包含 WebM、MOV、分页 PNG 图集和 manifest。
- 预期行为：正式 AI alpha 视频到位后，只替换动作输入文件并重跑生成器，不再经过 DragonBones 导出页。

### 3. 将资源加载收敛为全量映射
- 修改 `src/pages/KJG_QAP_BD_v2_2026_video/rasterAssets.ts`：用现有 `import.meta.glob` 同时收集 manifest 和媒体文件，按资源名返回 `{manifest, files}`，替代 3 个手写导出。
- 修改 `src/pages/KJG_QAP_BD_v2_2026_video/video-animation.test.ts`：自动扫描 14 个 manifest，校验引用文件存在、动作完整、三格式规则和不引用 ZIP。
- 预期行为：新增资源目录无需再增加一组静态 import；拼错资源名会立即抛出明确错误。

### 4. 替换视频模板剩余动画调用
- 修改 `components/MainSceneParts/MaluCharacter.tsx`：5 个角色统一按 `BD_<name>` 读取 raster 资源，删除 4 个角色的 ZIP、播放器 ref、边界调整和 DragonBones 分支；保留 CSS 横向移动、暂停和动作映射。
- 修改 `components/MainSceneParts/DayCurtain.tsx`：`BD_open/BD_close` 使用 raster 的 `start/end`，保留外层入场、停留、退场位移时序。
- 修改 `components/MainSceneParts/PayMoneyEffect.tsx` 与 `FinalFoodFlash.tsx`：分别接入 `BD_pay_money/BD_flash`，保留现有 CSS 位移、尺寸和播放时机。
- 修改 `components/LobbyScene.tsx`：使用 `BD_title` 的 raster `start/end` 驱动标题进场、漂浮状态和开始按钮阶段，不修改共享 `LobbyTitlePlayer`。
- 修改 `components/overlays/RasterSuccessOverlay.tsx` 与 `ResultOverlay.tsx`：复用现有结果卡布局，同时支持 `BD_mission_successed/BD_mission_failed`，失败结果不再调用共享 DragonBones 结果播放器。
- 修改 `components/MainSceneParts/HeartHud.tsx`：用 `heart` 的 raster `start/end` 替代共享心碎骨骼，保留心形飞入中心、破碎、返回和音效时序。
- 修改相关现有测试：覆盖 5 个角色、开关帘、金币、闪光、标题、成功/失败、心碎的 raster 资源名、动作、完成回调和暂停恢复。
- 预期行为：视频模板对这 14 个业务资源只加载 WebM/MOV/PNG。

### 5. 清理、文档和回归
- 删除 `src/pages/KJG_QAP_BD_v2_2026_video/assets/skeleton/*.zip`；共享 `src/shared/assets/skeleton` 和原样板资源不动。
- 更新 `tools/ai-animation/README.md`：加入全量导出和批量生成命令。
- 更新 `tools/ai-animation/video-generation-pipeline.md`：补齐自动导出阶段、临时 DragonBones 输入退役条件、macOS MOV 构建约束和 AI 输入替换点。
- 更新 `src/pages/KJG_QAP_BD_v2_2026_video/video-animation-metrics.md`：记录 14 个资源的平台实际下载体积与三格式发布总量。

## 验证命令
```sh
node tools/ai-animation/export-dragonbones-frames.mjs /tmp/all-animation-frames tools/ai-animation/configs
node tools/ai-animation/build-animation-assets.mjs tools/ai-animation/configs /tmp/all-animation-frames src/pages/KJG_QAP_BD_v2_2026_video/assets/raster
yarn typecheck
yarn test
yarn build
git diff --exit-code -- src/pages/KJG_QAP_BD_v2_2026
```
- 浏览器验收继续使用视频模板 mock 链接，分别以 `renderer=webm`、`renderer=mov`、`renderer=atlas` 和 `renderer=broken-video` 验证。
- 用 Chrome/Android 验 WebM alpha，用 Safari/iOS 13+ 验 MOV alpha，用 iOS 12 或强制 atlas 验 PNG 图集。

## 验收标准
- 14 个资源均有 manifest；63 个动作均有输出，单帧不生成视频，多帧同时存在 WebM、MOV 和 PNG 图集。
- 视频模板实际使用的 14 个资源不再引用 ZIP 或 `DragonBonesPlayer`，`assets/skeleton` 目录为空并删除。
- 5 个角色切动作不跳位；门帘、标题、结果、心碎等完成回调与原流程一致；全局暂停恢复不重播或丢帧。
- 视频失败后自动切 PNG，切换时从接近当前时间继续；四种 renderer 验收路径均可完成游戏。
- MOV 无白边，WebM/MOV/PNG 背景透明；原样板目录零差异。
- 类型检查、全量测试、生产构建全部通过。

## 风险与兼容性
- 全量视频总发布体积会明显高于 DragonBones ZIP；按浏览器只下载一种视频格式，PNG 仅失败或 iOS 12 时加载，不能预加载三套。
- HEVC alpha MOV 仍绑定 macOS VideoToolbox；Windows Intel QSV 不提供等价 alpha 输出，跨平台 CI 需拆成“通用帧/WebM/PNG”和“macOS MOV”两个任务。
- 自动裁切后的奇数画布会在 MOV 编码时裁为偶数；manifest 必须使用编码后的最终尺寸，避免 1px 偏移或白边。
- 不同角色和特效原先使用不同运行时边界适配；每个 profile 的锚点需逐资源视觉验收，不能只看编码成功。
- 题目数据动态提供的 DragonBones/Spine 资源不属于这 14 个包，仍由 `GameQuestionVisual` 处理；若也要移除，应作为独立迁移范围。
