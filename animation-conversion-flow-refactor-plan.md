# 动画转换流程职责拆分实施计划

## 目标

- 将转换链收敛为只生产资源事实：`fps`、`canvas`、`frameCount`、资源内在 `anchor` 及 WebM/MOV/PNG 文件。
- 将 `origin`（场景位置）和 `loop`（本次播放策略）放回模板运行时，保证视频与 PNG 图集消费同一套参数。
- 删除逐资源手工维护的 `exportProfiles.json` 和仓库内预生成配置，支持大量模板按“临时任务目录 → 发布资源”运行。
- 保持现有 VP9 alpha WebM、HEVC alpha MOV、PNG 图集降级能力和当前浏览器基线。

## 范围与不做

- 修改 DragonBones 临时帧导出、生成配置、manifest、Raster 播放器、视频模板调用点、相关测试和生成文档。
- 在临时目录完整重跑 14 个已迁移动画，并发布新的 manifest；媒体像素、动作帧数和编码参数不因本次职责拆分而改变。
- 不修改样板 `src/pages/KJG_QAP_BD_v2_2026`，不恢复已移除的 DragonBones 运行时或资源。
- 不改变 FFmpeg 编码器选择、浏览器格式选择和视频失败切 PNG 的逻辑，不新增依赖或通用配置框架。
- 不实现 AI 视频供应侧；AI alpha 视频和 DragonBones 临时录帧继续汇合到同一 RGBA 帧输入。
- 本计划不包含 commit、push、分支或 PR 操作。

## 已确认事实

- `src/pages/animations/frameExporter.ts` 当前使用 `origin + minBounds - padding` 计算 `anchor`，把模板位置混入了资源元数据；`transform` 本身不依赖 `origin`。
- `src/pages/animations/exportProfiles.json` 当前为 14 个资源手工保存 `origin` 和循环动作，批量模板迁移时不可维护。
- `tools/ai-animation/configs/*.json` 是导出器生成的测量结果/编码输入，不是人工预配置；当前被提交仅是试点期过渡状态。
- `tools/ai-animation/build-animation-manifest.mjs` 当前把 `loop` 写入每个 action；播放器的视频和 Canvas 路径都读取它。
- 模板已有真实循环规则：角色复用 `shouldLoopMaluAnimation`；闪光和成功/失败结果原来自动循环；其余当前调用为单次播放。
- 角色场景纵向位置为 `ola:244`、`laki:245`、`lele:245`、`nani:238`、`pili:245`；倒计时为 `(316,162)`，心碎为 `(512,384)`，其余迁移资源 origin 为 `(0,0)`。
- 旧骨骼大画布 padding 只用于防裁切；转换后的联合画布与内在 anchor 已承担该职责，不需要恢复。
- 现有 14 份 manifest 都必须迁移；只删除 `loop` 而不重算 anchor 会保留错误语义。

## 修改点

1. **纯化导出几何**
   - 修改 `src/pages/animations/frameExporter.ts`：`buildExportGeometry` 不再接收 `origin`。
   - 新公式：`anchor = minBounds - exportPadding`，`transform = exportPadding - minBounds`，因此 `anchor + transform = 0`。
   - 保留联合 bounds、偶数画布和透明 padding 规则；修改 `src/pages/animations/frameExporter.test.ts` 验证 origin 无关性和公式恒等式。

2. **删除导出 profile**
   - 修改 `src/pages/animations/AnimationFrameExporter.tsx`：删除 `origin` 属性，直接输出资源内在 anchor。
   - 修改 `src/pages/animations/App.tsx`：删除 `exportProfiles.json` 导入和 profile 查找，导出 URL 只由资源名驱动。
   - 删除 `src/pages/animations/exportProfiles.json` 与 `src/pages/animations/exportProfiles.test.ts`。

3. **让转换配置完全由测量结果生成**
   - 修改 `tools/ai-animation/export-dragonbones-frames.mjs`：`createExportConfig(meta)` 只输出 `asset/fps/canvas/anchor/actions[{name,frameCount}]`；删除 `profiles` 参数、校验和文件读取。
   - 保留资源自动发现、排序、逐帧采集和原子目录发布；配置继续写入调用者指定目录。
   - 修改 `tools/ai-animation/export-dragonbones-frames.test.mjs`：覆盖无 profile 全量导出、纯测量配置和失败时不留半成品。
   - 删除受版本控制的 `tools/ai-animation/configs/*.json`；文档命令改为把配置写入 `/tmp/all-animation-configs`。

4. **升级 manifest 为纯资源描述**
   - 修改 `tools/ai-animation/build-animation-manifest.mjs`：action 不再生成 `loop`，manifest `version` 从 `1` 升为 `2`。
   - 旧配置中的额外 `loop` 字段允许被读取但直接丢弃，便于一次性迁移；旧 v1 manifest 因 anchor 语义不明确，不做运行时猜测，必须重新生成。
   - 修改 `tools/ai-animation/build-animation-manifest.test.mjs`：验证 v2、无 `loop`、旧配置字段被忽略及现有图集分页行为不变。

5. **把 origin 和 loop 变成播放参数**
   - 修改 `src/pages/KJG_QAP_BD_v2_2026_video/components/raster-animation/rasterPlayback.ts`：从 `RasterAction` 删除 `loop`；`getFrameState` 显式接收本次播放的 `loop`。
   - 修改 `src/pages/KJG_QAP_BD_v2_2026_video/components/raster-animation/RasterAnimationPlayer.tsx`：新增可选 `origin` 与 `loop` 属性，默认分别为 `(0,0)` 和 `false`。
   - 视频使用 `loop` 属性，Canvas 使用同一参数计算帧；根位置使用 `origin + manifest.anchor`，样式仍可覆盖最终布局。
   - 修改 `rasterPlayback.test.ts` 和 `RasterAnimationPlayer.test.tsx`：同时验证视频/图集循环一致、非循环完成回调、origin 与 anchor 相加、视频失败接续图集。

6. **在模板调用点恢复业务语义**
   - 修改 `components/MainSceneParts/MaluCharacter.tsx`：恢复角色 slotTop 映射，传入 `origin`；复用现有 `shouldLoopMaluAnimation(animationName, rasterAnimation)` 传入 `loop`，不恢复旧 Canvas padding 常量。
   - 修改 `components/overlays/RasterCountdownOverlay.tsx`：传入倒计时 origin `(316,162)`，保持单次播放。
   - 修改 `components/MainSceneParts/HeartHud.tsx`：传入心碎 origin `(512,384)`，保持单次播放。
   - 修改 `components/MainSceneParts/FinalFoodFlash.tsx` 与 `components/overlays/RasterSuccessOverlay.tsx`：显式传入 `loop`，保持原 DragonBones 自动循环行为。
   - `DayCurtain.tsx`、`PayMoneyEffect.tsx`、`RasterLobbyTitle.tsx` 保持默认单次播放；现有视觉缩放/偏移是模板布局，继续保留。
   - 更新对应组件测试，分别断言角色循环分支、特效循环和关键 origin；不为每个零值调用添加重复测试。

7. **阻止旧 manifest 静默混用**
   - 修改 `src/pages/KJG_QAP_BD_v2_2026_video/rasterAssets.ts`：加载资源时要求 `manifest.version === 2`，旧资源给出明确错误。
   - 修改 `src/pages/KJG_QAP_BD_v2_2026_video/rasterAssets.test.ts`：断言受控资源清单全部为 v2；未知资源测试保持不变。
   - 影响面仅为视频模板的 14 个 raster 资源；所有调用入口与 manifest 在同一变更中升级。

8. **重新生成并同步发布资源**
   - 导出到全新的 `/tmp/all-animation-frames` 与 `/tmp/all-animation-configs`，再构建到 `/tmp/all-animation-raster`。
   - 对比动作名、帧数、画布和媒体文件清单，确认本次没有意外丢失或新增动作；因为捕获 transform、画布和编码参数未变，只同步 14 份新 manifest，避免重写无语义变化的媒体文件。
   - 审计已发布 manifest 全部为 v2、无 `loop`、anchor 为资源内在偏移。

9. **更新独立转换文档**
   - 修改 `tools/ai-animation/README.md`：命令改用临时配置目录，明确配置是生成中间件而非仓库预配置。
   - 修改 `tools/ai-animation/video-generation-pipeline.md`：移除“当前过渡状态”描述，以职责表、两条公式和 v2 manifest 作为完成态规范。

## 验证命令

```sh
node tools/ai-animation/export-dragonbones-frames.mjs \
  /tmp/all-animation-frames \
  /tmp/all-animation-configs

node tools/ai-animation/build-animation-assets.mjs \
  /tmp/all-animation-configs \
  /tmp/all-animation-frames \
  /tmp/all-animation-raster

yarn typecheck
yarn test
yarn build
git diff --exit-code -- src/pages/KJG_QAP_BD_v2_2026
```

- 自动验证现有调试页的 `?renderer=webm`、`?renderer=atlas`、`?renderer=broken-video`；MOV 由人在 Safari 中验收并记录环境与结果。
- 检查 14 个 manifest：`version=2`、action 无 `loop`，且模板实际位置等于 `origin + anchor`。

## 验收标准

- 导出流程不读取或要求任何逐资源 profile；新增动画只需可测量源资源和临时任务目录。
- 生成配置与 manifest 不包含 `origin` 或 `loop`；manifest 只描述资源事实。
- 视频与 PNG 图集在相同模板参数下具有一致的位置、循环、暂停、完成和失败降级行为。
- 5 个角色、倒计时、心碎、闪光、成功/失败结果的布局与原基线一致；门帘、金币、标题无回归。
- 14 个资源可从用例输入完整生成三格式并在视频模板运行；旧 v1 manifest 不会被静默加载。
- WebM 与 PNG 图集满足自动验收条件；MOV 已在 Safari 中完成人工验收并记录结果，不以 Chromium 结果替代 Safari 结论。
- 类型检查、全量测试、生产构建通过，原样板目录无改动。

## 风险与兼容性

- anchor 语义改变无法从旧 v1 数值可靠反推；通过版本升级、全量重生成和加载时拒绝旧版本处理，不加入猜测性兼容层。
- 模板 origin 漏传会造成可见位移；用角色映射、倒计时/心碎关键值测试和浏览器截图验收防止遗漏。
- 循环策略漏传会变成默认单次播放；对角色动态循环、闪光和结果动画单独回归，其他动作保持安全默认值 `false`。
- 当前 HEVC alpha 完整生成仍依赖 macOS `hevc_videotoolbox`；本次只拆职责，不扩大跨平台编码范围。
- `/tmp` 目标目录必须不存在；重复执行前使用新的任务目录名，避免覆盖已有导出结果。
