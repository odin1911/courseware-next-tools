# AI 动画替代 DragonBones 实施方案

## 目标
- 新动画生产改为“AI 生成视频 → 透明栅格母版 → 浏览器交付资源”，不再制作 DragonBones 骨骼包。
- 模板运行时优先使用透明视频以降低下载体积，透明帧图集仅用于 iOS 12 或视频播放失败降级。
- 保持现有动作切换、循环、暂停恢复、结束回调、CSS 位移、层级和独立音效行为。

## 范围与不做
- 范围：`src/pages/animations/assets` 的 15 个现有包及 `KJG_QAP_BD_v2_2026` 对同名模板动画的调用。
- 范围：AI 素材规范、抠像/透明母版、视频编码、图集打包、播放器和模板迁移。
- 范围：无 AI 样例期间，以现动画透明 Canvas 逐帧导出作为一次性管线验证输入。
- 不改题目下发的动态 `skeletonUrl`；它是另一条题目资源链。
- 不把角色行走、门帘横移、金币飞行等 CSS 运动烘焙进素材。
- 不引入 Lottie、Rive、Spine 等新的动画制作/runtime 体系。
- 现 DragonBones 工具只允许用于一次性视觉对照；新素材生产和最终模板均不依赖它。

## 已确认事实
- 15 个资源共 65 个动作入口；5 个角色各 9 个动作，模板业务使用其中 7 类角色动作。
- `BD_ola` 为 24 fps；最长 `wait` 6.333 秒/152 帧，`end` 只有 1 帧。
- 角色动作的透明画布尺寸不同；所有替代格式都必须统一角色画布/锚点，否则切动作会跳位。
- Chrome 31 起支持 WebM alpha，因此 Chrome 56 可用；Safari 的 HEVC alpha 最低为 iOS 13 / Safari 13，iOS 12 不可用。
- Android 9 只限定操作系统，不限定 Chrome/WebView 内核；透明视频验收还必须固定 Chrome 或 Android System WebView 56+。
- APNG 支持透明动画且覆盖 Safari 8，但 `<img>` 没有标准 pause、seek、currentTime、ended 控制。
- Animated WebP 需要 Safari 14+，不能覆盖 iOS 12；Animated AVIF 的动画支持下限更高。
- Canvas 2D `drawImage()` 与 `requestAnimationFrame()` 可覆盖 iOS 12，并能实现精确帧控制。
- 模板所需共享模块已从原项目按静态依赖闭包恢复，`yarn typecheck`、测试和构建均已通过基线验证。
- 正式流程假设 AI 输出带 alpha，导入时仍需抽帧验证 alpha；临时 DragonBones 透明帧只验证生产与播放管线，不代表最终 AI 边缘质量。

## AI 动画统一生产母版
1. 正式输入为 AI 生成的带 alpha 视频；迁移验证期录制现有动画播放，抠像后转为 RGBA PNG 帧。迁移完成后不再需要 DragonBones。
2. 每个业务动作单独生成，命名保持 `enter/wait/angry/happy_eating/...`，不要生成一条包含全部动作的长视频。
3. AI 直接输出 alpha 时保留透明通道；否则使用纯色背景生成并离线抠像，人工检查头发、半透明光效和运动模糊边缘。
4. 统一转为 24 fps、RGBA PNG 序列；同一角色的全部动作使用同一画布、脚底锚点和缩放。
5. 生成 manifest：动作名、fps、frameCount、duration、loop、画布尺寸、锚点、音效 cue；单帧动作只产 PNG。
6. RGBA PNG 序列是唯一母版；每个动作固定生成 VP9 alpha WebM、HEVC alpha MOV、PNG 图集 + manifest 三份交付物。

## 运行时选路与降级
- 初选：iOS 12 直接使用图集；Safari 13+ / iOS 13+ 选择 MOV；Chrome/Android 在 `canPlayType` 通过后选择 WebM；其它环境使用图集。
- 状态：`loading-video → video`；视频 `error`、`play()` 拒绝或解码失败时执行 `loading-atlas → atlas`，图集失败才进入 `failed`。
- `<source>` 只负责视频格式候选，不会创建 Canvas；降级由统一播放器卸载 `<video>`、懒加载当前动作图集并恢复 elapsed/loop 状态。
- `canPlayType` 只能预筛编码支持，不能证明 alpha 正确；巡检页必须用棋盘格背景进行目标设备目测。

## 浏览器基线 A：双编码透明视频主路径
- 基线：Chrome 56+；Android 9+ 且 Chrome/Android System WebView 56+；Safari 13+ / iOS 13+。
- 选择：Chromium/Firefox 使用 VP9 alpha WebM；Safari 13+ / iOS 13+ 使用 HEVC alpha MOV；单帧动作使用 PNG。
- 播放：原生 `<video muted playsInline preload>`，使用 `loop`、`pause()`、`currentTime=0`、`ended` 和 `error`。
- 优点：帧间压缩使角色长循环比 PNG 图集显著节省下载体积，并可使用浏览器视频解码路径。
- 成本：同一动作编码两份；Safari 真机必须检查 alpha 边缘和多视频并发。
- 限制：iOS 12 无透明视频路径，运行时改用基线 B 的 PNG 图集。

## 浏览器基线 B：PNG 图集降级路径
- 基线：Chrome 56+、Android 9+、iPhone 6s / iOS 12 Safari，并兼容后续版本。
- 触发：iOS 12、透明视频格式不支持、视频加载或解码失败。
- 交付：每动作透明 PNG 图集 + manifest；长动作按最大图集尺寸拆成多张，单帧动作使用普通 PNG。
- 播放：Canvas 2D 通过 `drawImage(atlas, sx, sy, sw, sh, ...)` 绘帧；用 `requestAnimationFrame` 的时间戳计算帧号。
- 控制：暂停时取消 rAF 并保存 elapsed；恢复续算；循环取模；一次性动作到末帧触发 `onComplete`。
- 资源：只预加载当前动作，切换后释放上一动作图片引用；禁止启动时解码 5 个角色的全部动作。
- 优点：完全保留 alpha 和确定性控制，不依赖视频 alpha、WebGL 或 DragonBones。
- 成本：文件和解码内存高于视频；需要图集切片工具与最小 Canvas 播放器。
- 加载：正常设备不下载图集；降级后也只加载当前动作，避免三份资源同时产生网络开销。

## 其它替代方案比较
| 方案 | 透明 | 精确暂停/结束 | iOS 12 | 结论 |
|------|------|---------------|--------|------|
| APNG | 是 | 否 | 是 | 仅用于无需精确回调的闪光、标题等简单动画 |
| Animated WebP | 是 | 否 | 否 | 可做现代端轻量装饰图，不作为统一格式 |
| Animated AVIF | 是 | 否 | 否 | 兼容下限高、编码慢，当前不选 |
| CSS sprites + `steps()` | 是 | 基本支持 | 是 | 适合短且单行的固定帧特效，角色长动作不选 |
| H.264 RGB+Alpha 遮罩 + WebGL | 是 | 是 | 理论可行 | 视频较小但 shader/并发风险高，只做性能实验备选 |
| Lottie/Rive/Spine | 是 | 是 | 依运行时 | 需要重新制作矢量/骨骼资产，违背 AI 视频生产目标 |

## 推荐决策
- 每个动作统一发布 WebM、MOV、PNG 图集三种格式，但客户端只下载当前设备选中的一种。
- Chrome/Android 选 WebM，iOS 13+ / Safari 选 MOV，iOS 12 或视频错误切换 PNG 图集；降级后保持同一动作时间和完成回调语义。
- APNG 只可局部优化简单特效，不能替代角色、倒计时、门帘等受控动画。
- 不选择双通道遮罩视频，除非基线 B 的图集实测超过内存/包体指标后再做一项独立实验。

## 修改点
- `tools/ai-animation/README.md`（新增）
  - 固化 AI prompt 约束、纯色背景/alpha、24 fps、动作命名、统一画布、人工边缘检查和目录结构。
- `tools/ai-animation/build-animation-assets.sh`（新增）
  - 以 RGBA PNG 序列为输入；一次生成 WebM、MOV、PNG 图集三份资源；已有输出不覆盖。
- `tools/ai-animation/build-animation-manifest.mjs`（新增）
  - 生成动作帧数、时长、循环、图集切片、画布和锚点；拒绝不同动作画布不一致的角色。
- `src/shared/components/raster-animation-player/RasterAnimationPlayer.tsx`（新增）
  - 对模板暴露统一声明式 props；按设备选择透明视频，加载/解码失败后切换 Canvas 图集。
- `src/shared/components/raster-animation-player/VideoRenderer.tsx`（新增）
  - 实现基线 A 的加载、重播、循环、暂停、结束和播放拒绝处理。
- `src/shared/components/raster-animation-player/FrameAtlasRenderer.tsx`（新增）
  - 实现基线 B 的时间戳帧计算、图集切片、懒加载、暂停恢复和完成回调。
- `src/shared/components/raster-animation-player/RasterAnimationPlayer.test.tsx`（新增）
  - 覆盖设备选路、动作切换、暂停恢复、循环、视频错误转图集、图集错误和卸载清理。
- `src/pages/KJG_QAP_BD_v2_2026/assets/animations-raster/`（新增）
  - 每个动作存放 WebM、MOV、PNG 图集及 manifest，不再复制 `animations/skeleton` 两套资源。
- `src/pages/KJG_QAP_BD_v2_2026/logic/runtime.ts`
  - 保留业务动作别名/循环规则，改为解析 raster manifest；题目数据接口不变。
- `MaluCharacter.tsx`、`DayCurtain.tsx`、`FinalFoodFlash.tsx`、`PayMoneyEffect.tsx`
  - 替换内部渲染器；保留宿主尺寸、CSS 位移、定时和暂停逻辑。
- `LobbyScene.tsx`、`MainFlowOverlayLayer.tsx`、`HeartHud.tsx`、`ResultOverlay.tsx`
  - 标题、倒计时、心碎、结果动画改用 raster player；共享模块源码恢复后补齐其入口。
- `src/pages/animations/`
  - 改为 raster 巡检与降级验证页；提供 `auto/webm/mov/atlas/broken-video` 模式，显示渲染器、媒体事件、请求资源和透明棋盘格。
- `package.json`、`yarn.lock`
  - 本模板与巡检页迁移后清理 DragonBones 直接依赖；`pixi.js` 仅在全仓无其它调用时删除。

## 接口与旧数据兼容
- manifest 核心字段：`fps`、`canvas`、`anchor`、`actions[name]`；动作包含 `duration/loop/still/webm/mov/atlases`。
- 播放器 props：`asset`、`action`、`paused`、`restartKey`、`onReady/onComplete/onError`。
- `normalizeBDExercise`、`BDWordItem.skeletonUrl`、题目数据格式、音频管理和场景状态机入口不变。
- 本模板生产构建不引用 DragonBones；仓库其它模板如仍使用 DragonBones，仓库级删除依赖需另行清零调用。

## 验证命令
- `yarn test src/shared/components/raster-animation-player src/pages/KJG_QAP_BD_v2_2026`
- `yarn typecheck`
- `BUILD_ENTRY=KJG_QAP_BD_v2_2026 yarn build`
- `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,pix_fmt,r_frame_rate:format=duration -of json src/pages/KJG_QAP_BD_v2_2026/assets/animations-raster/BD_ola/wait.webm`
- `rg -n "dragonbones|DragonBones|\.zip" src/pages/KJG_QAP_BD_v2_2026 src/pages/animations`
- VP9：`ffmpeg -framerate 24 -i frame-%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -crf 30 -b:v 0 -an output.webm`
- HEVC alpha：`ffmpeg -framerate 24 -i frame-%04d.png -vf format=bgra -c:v hevc_videotoolbox -alpha_quality 0.75 -tag:v hvc1 -an output.mov`

## 验收标准
- 新动画从 AI 母版生成，不需要 DragonBones 编辑器、骨骼、atlas JSON 或 dbbin。
- 模板与 raster 巡检页不再导入 `DragonBonesPlayer`，资源目录不再包含本组 zip。
- 每个动画动作同时产出 WebM、MOV、PNG 图集，目标设备只请求选中的资源；模拟视频错误后可切到图集继续播放。
- 巡检页 `broken-video` 使用无效视频 URL 触发真实 `error`，验证 DOM 从 `<video>` 切为 `<canvas>`，且只在降级后请求图集。
- 角色动作切换无跳位；暂停/恢复、重播、循环、一次性完成和 CSS 位移与现实现一致。
- 棋盘格背景无黑底、白边、首帧闪烁、末帧回跳；5 个角色并发无明显掉帧。
- 基线 B 不预解码未使用动作，页面隐藏/卸载后停止 rAF 并释放图集引用。
- 同动作 WebM/MOV 的下载体积应小于 PNG 图集合计体积；以最长 `wait` 动作为重点记录构建产物大小。

## 风险与兼容性
- AI 抠像边缘和角色一致性是生产质量的首要风险，必须保留人工验收，不由编码步骤修复。
- 基线 A 需要双编码并做 Safari HEVC alpha 真机测试；循环视频不触发 `ended`。
- 基线 B 的主要风险是下载体积和解码内存；`BD_ola/wait` 单动作原始 RGBA 约 13.3 MB，应按动作加载并允许拆图集。
- 三份格式会增加构建产物/CDN 存储体积；视频优势依赖按设备按需请求，Service Worker 或预缓存清单不得提前下载全部变体。
- APNG/WebP/AVIF 即使格式支持透明，也无法直接提供本模板需要的媒体控制契约。
- 共享源码完整性前置已完成；后续仍需保持复制文件与原项目版本一致。

## 网络依据
- [W3C PNG 3：APNG 与 alpha](https://www.w3.org/TR/png-3/)
- [MDN：APNG/WebP/AVIF 格式与浏览器下限](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types)
- [MDN：Canvas `drawImage()`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)
- [MDN：`requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [Chrome：WebM alpha](https://developer.chrome.com/blog/alpha-transparency-in-chrome-video)
- [Apple：HEVC alpha 从 iOS 13 / Safari 13 起支持](https://developer.apple.com/videos/play/wwdc2019/506/)
