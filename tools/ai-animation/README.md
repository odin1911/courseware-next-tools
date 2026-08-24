# AI 动画资源生成工具

每个动作会生成以下浏览器交付资源：

- VP9 alpha WebM：用于 Chrome 和 Android。
- HEVC alpha MOV：用于 Safari 13+ 和 iOS 13+。
- 分页 PNG 图集：用于 iOS 12 或视频播放失败时的降级路径。

工具以 24 fps RGBA PNG 帧序列作为统一转码中间输入。AI alpha 视频可以直接放在 `<source-root>/<asset>/<action>.mov`；工具会先提取并校验 RGBA 帧。已经导出的帧序列使用 `<source-root>/<asset>/<action>/frame-0001.png` 命名。

## 全量生成

在没有 AI alpha 视频时，使用现有动画临时导出 14 个资源的透明帧和配置：

```sh
node tools/ai-animation/export-dragonbones-frames.mjs \
  /tmp/all-animation-frames \
  tools/ai-animation/configs
```

脚本会自行启动 Vite 和无头 Chromium，读取 `src/pages/animations/exportProfiles.json`，并通过 `window.__dragonBonesFrameExporter` 保存 63 个动作。帧输出目录必须不存在；资源、profile、动作或任一帧失败时不会留下正式输出目录。

批量生成 14 个资源：

```sh
node tools/ai-animation/build-animation-assets.mjs \
  tools/ai-animation/configs \
  /tmp/all-animation-frames \
  /tmp/all-animation-raster
```

检查 `/tmp/all-animation-raster` 后，再整体同步到模板的 `assets/raster`。批量输出根目录必须不存在。HEVC alpha MOV 使用 `hevc_videotoolbox`，因此完整三格式构建必须在 macOS 上执行；Windows/Linux 可负责上游帧和通用格式，但不能用 Intel QSV 生成等价的 HEVC alpha。

## 单资源生成

```sh
tools/ai-animation/build-animation-assets.sh \
  tools/ai-animation/configs/BD_laki.json \
  /path/to/source-root \
  src/pages/KJG_QAP_BD_v2_2026_video/assets/raster/BD_laki
```

输出目录不能预先存在。生成工具会拒绝帧缺失、无 alpha 通道或画布尺寸不一致的输入。动态图集的目标边长为 2048px，并会裁掉未使用的行；单帧动作只生成一个 PNG。

## 临时 DragonBones 输入

在取得 AI alpha 视频样例之前，也可打开单资源导出地址，例如 `/src/pages/animations/index.html?export=BD_laki.zip`。`window.__dragonBonesFrameExporter` 会提供精确的帧元数据和透明 PNG 数据。该方式只用于一次性迁移输入；生成后的模板不再使用 DragonBones 播放已迁移动画。

同一资源的全部动作必须共用同一画布和锚点。角色在场景中的移动（例如横向行走）应继续由 CSS 控制，不要烘焙进视频或图集。
