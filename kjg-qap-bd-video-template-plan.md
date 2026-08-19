# KJG_QAP_BD 视频模板试点实施计划

## 目标
- 以 `src/pages/KJG_QAP_BD_v2_2026` 为只读样板，新建 `src/pages/KJG_QAP_BD_v2_2026_video`。
- 首批仅把 `BD_laki.zip`、`BD_mission_successed.zip`、`count.zip` 替换为 WebM/MOV 主路径和 PNG 图集降级路径。
- 保持样板业务流程、布局、暂停恢复、循环和完成回调不变，并证明视频相对图集的单端下载体积优势。

## 范围与不做
- 不修改、重命名或格式化 `src/pages/KJG_QAP_BD_v2_2026` 中任何文件；执行前后用文件摘要比对。
- 新模板名暂定 `KJG_QAP_BD_v2_2026_video`；Vite 会根据新目录的 `index.html` 自动发现入口。
- 其余角色、失败结果和特效继续使用样板当前 DragonBones 路径，本轮不删除仓库级 DragonBones/Pixi 依赖。
- 不提交临时 RGBA 母版帧或缓存；只提交三种浏览器交付资源、manifest、播放器和测试。
- 不修改题目数据接口、CSS 场景位移、音频和状态机，也不执行 commit、push、分支或 PR 操作。
- `/Users/limin/work/courseware-next-frontend` 只作为只读来源；只复制新模板编译/运行实际可达的共享依赖，不整目录同步。

## 已确认事实
- `BD_laki` 为 24 fps：`enter 18`、`turn_round 15`、`wait 146`、`angry 69`、`happy_eating 65`、`sad_eating 66`、`pay_1 14`、`pay_2 16`、`end 1` 帧。
- `BD_mission_successed` 为 `start 10/end 1` 帧；`count` 为 `start 76/end 1` 帧，均为 24 fps。
- 共 10 个多帧动作，每个生成 VP9 alpha WebM、HEVC alpha MOV、PNG 图集；3 个 `end` 单帧仅生成透明 PNG。
- 样板运行时从 `assets/skeleton` 引用 laki 和成功动画；`count.zip` 仅见于 `assets/animations`，实际入口是当前缺失的共享 `countdown-overlay`。
- `MaluCharacter` 负责角色内部动画，外层 CSS 负责横移与暂停；成功动画入口是 `ResultOverlay`，倒计时入口是 `MainFlowOverlayLayer`。
- 执行前 `yarn typecheck` 因共享源码缺失而失败；现已从原项目恢复90个白名单文件并通过 typecheck、全仓测试、构建和样板浏览器主流程验证。
- 共享闭包额外依赖 `howler ^2.2.4`、`styled-components 6.4.2`、`@types/howler ^2.2.12`；已按原项目版本安装。
- 临时素材从现动画透明 Canvas 逐帧导出 RGBA PNG 母版，避免绿幕抠像损失；它只验证管线，不作为最终 AI 边缘画质标准。

## 修改点
1. 恢复最小共享依赖（已完成）
   - 从原项目原样复制 `src/shared/components/{fixed-stage-shell,lobby-start-button,lobby-sound-control,lobby-title-player,audio-manager,atlas-sprite,atlas-nine-slice,audio-button,frame-animation,animated-heart-hud,heart-lives-strip,game-question-visual,title-image,countdown-overlay,pause-chain-overlays,result-chain-overlays}` 中 import 可达的生产文件；不复制测试或无关组件。
   - 原样复制 import 可达的 `src/shared/{react,core,exercise-parser/src,utils}` 生产文件及其 `commonGame/commonGame3` 图集、audio-button 图片、倒计时/心碎/结果音频、`count.zip`、`heart.zip`；保留来源相对路径。
   - `src/shared/core/query.ts`：保留现有 `getQueryParam/getAllQueryParams`，仅补入原项目 `getCoursewareAppPropsFromQuery` 及其类型导入。
   - `package.json`、`yarn.lock`：只增加上述三个确需包，版本与原项目一致；现有依赖不升级。
   - 将复制白名单写入 `/tmp/kjg-video-shared-copy-files.txt`；复制后逐文件比对，除 `query.ts` 的加法合并外必须完全一致，后续视频改动不得进入共享目录。
2. 新模板基线
   - `src/pages/KJG_QAP_BD_v2_2026_video/`（新增）：复制样板源码、声音、纹理及仍在使用的 skeleton；不复制重复的 `assets/animations`，也不复制 laki/成功动画 zip。
   - `index.html`、`App.tsx`、现有测试副本：只更新新模板标识和断言，业务行为保持一致。
3. 临时素材与构建工具
   - `tools/ai-animation/README.md`（新增）：规定 AI alpha 视频、24 fps、统一画布/锚点、alpha 检查、临时目录与产物命名。
   - `tools/ai-animation/build-animation-assets.sh`（新增）：接受 AI alpha 视频或 RGBA 帧目录，一次生成 WebM、MOV、2048px 分页 PNG 图集和静态末帧；复用本机 FFmpeg，不增加依赖。
   - `tools/ai-animation/build-animation-manifest.mjs`（新增）：生成 `fps/canvas/anchor/actions`；动作记录 `frameCount/duration/loop/webm/mov/atlases/still`，并拒绝帧数或画布不一致。
   - `src/pages/KJG_QAP_BD_v2_2026_video/assets/raster/{BD_laki,BD_mission_successed,count}/`（新增）：存放三组最终资源与 manifest。
4. 新模板内最小播放器
   - `components/raster-animation/rasterPlayback.ts`（新增）：解析 manifest、选择 WebM/MOV/atlas、按 elapsed 计算图集帧号；不包含 React 状态。
   - `components/raster-animation/RasterAnimationPlayer.tsx`（新增）：实现 `loading-video/video/loading-atlas/atlas/failed`，处理 `muted/playsInline`、暂停、重播、循环、`ended/error` 和 Canvas 降级。
   - `components/raster-animation/rasterPlayback.test.ts`、`RasterAnimationPlayer.test.tsx`（新增）：验证平台选路、动作时长、视频错误转 Canvas、按需请求、暂停恢复和完成回调。
5. 三个业务接入点
   - `components/MainSceneParts/MaluCharacter.tsx`：仅 `charName === 'laki'` 使用 raster manifest；保留原外层尺寸、锚点、CSS 横移、暂停和动作别名，其余四个角色逻辑不变。
   - `components/overlays/MainFlowOverlayLayer.tsx` 与新增 `RasterCountdownOverlay.tsx`：复制共享倒计时的布局、音效和一次性回调契约，只把内部 DragonBones 替换为 `count/start`。
   - `components/overlays/ResultOverlay.tsx` 与新增 `RasterSuccessOverlay.tsx`：复制共享结果层的背景、标签、按钮、音效和位置，成功动画改用 `BD_mission_successed/start + end.png`；失败分支继续调用共享实现。
   - 共享组件仅作为读取/复制依据；本次行为差异全部留在新模板，样板和共享组件不做视频改造。
6. 巡检与失败验证
   - `src/pages/KJG_QAP_BD_v2_2026_video/video-animation.test.ts`（新增）：静态校验三份 manifest、10 个多帧动作和3个末帧，不允许引用目标 zip。
   - 新模板开发页通过查询参数支持 `renderer=auto|webm|mov|atlas|broken-video`；`broken-video` 替换为无效 URL，验证真实媒体错误后才请求图集。

## 验证命令
- 共享恢复后、新模板创建前先运行 `yarn typecheck`，确认样板基线恢复。
- `yarn test src/pages/KJG_QAP_BD_v2_2026_video`
- `yarn typecheck`
- `yarn build`
- `while IFS= read -r file; do [ "$file" = "src/shared/core/query.ts" ] || cmp -s "$file" "/Users/limin/work/courseware-next-frontend/$file" || exit 1; done < /tmp/kjg-video-shared-copy-files.txt`
- `rg -n "BD_laki\.zip|BD_mission_successed\.zip|count\.zip" src/pages/KJG_QAP_BD_v2_2026_video`
- `ffprobe -v error -show_entries stream=codec_name,pix_fmt,r_frame_rate:format=duration -of json src/pages/KJG_QAP_BD_v2_2026_video/assets/raster/BD_laki/wait.webm`
- `ffprobe -v error -show_entries stream=codec_name,pix_fmt,r_frame_rate:format=duration -of json src/pages/KJG_QAP_BD_v2_2026_video/assets/raster/BD_laki/wait.mov`
- 执行前后分别生成样板目录 SHA-256 清单并用 `diff` 比较，预期无输出。
- 浏览器巡检 `/src/pages/KJG_QAP_BD_v2_2026_video/index.html?renderer=broken-video`，确认 `<video>` 切为 `<canvas>`。
- 真机覆盖 Chrome 56、Android 9 + Chrome/WebView 56+、iOS 12 Safari、iOS 13+ Safari；记录渲染器、透明边缘、并发帧率和网络请求。

## 验收标准
- 样板目录摘要完全不变，新模板可由 Vite 独立访问，页面主流程与样板一致。
- 共享依赖仅包含静态 import/new URL 可达文件；除 `query.ts` 加法合并和三个精确依赖外，与原项目逐文件一致且没有格式化差异。
- 新模板不包含或请求三个目标 zip；其余未迁移动画仍可播放。
- 10 个多帧动作各有 WebM、MOV、PNG 图集，3 个 `end` 各有透明 PNG；manifest 帧数、24 fps、时长、循环和锚点正确。
- Chrome/Android 只请求 WebM，iOS 13+/Safari 只请求 MOV，iOS 12或视频错误只请求当前动作图集，不预下载另两种变体。
- laki 七类业务动作、倒计时完成、成功结果保持、全局暂停恢复和确认音效与样板一致。
- 棋盘格下无黑底、白边、切动作跳位或首帧闪烁；`broken-video` 可稳定降级且完成回调只触发一次。
- 记录每动作三种产物体积；`BD_laki/wait` 的 WebM 与 MOV 均小于其 PNG 图集合计体积。
- 缺失共享模块恢复后，定向测试、`yarn typecheck` 和 `yarn build` 全部通过。

## 风险与兼容性
- 共享依赖闭包较大，漏掉 `new URL` 资源会在运行时才暴露；执行时先恢复、typecheck、打开未改样板，再开始新模板视频改造。
- 当前透明 Canvas 逐帧导出只用于迁移验证；正式 AI alpha 样例到位后必须重新生成并重新验收边缘质量。
- `canPlayType` 不能证明 alpha 正确；Chrome/Android 与 Safari 必须用棋盘格真机目测，iOS 12固定走 Canvas。
- PNG 图集解码内存高，必须按当前动作懒加载和释放；三种产物不得全部进入 Service Worker 预缓存。
- HEVC alpha 依赖 macOS VideoToolbox 编码和 iOS 13+/Safari 13+；编码失败不得用普通无 alpha HEVC 冒充。
