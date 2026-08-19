# AI 动画资源生成工具

每个动作会生成以下浏览器交付资源：

- VP9 alpha WebM：用于 Chrome 和 Android。
- HEVC alpha MOV：用于 Safari 13+ 和 iOS 13+。
- 分页 PNG 图集：用于 iOS 12 或视频播放失败时的降级路径。

工具以 24 fps RGBA PNG 帧序列作为统一转码中间输入。AI alpha 视频可以直接放在 `<source-root>/<asset>/<action>.mov`；工具会先提取并校验 RGBA 帧。已经导出的帧序列使用 `<source-root>/<asset>/<action>/frame-0001.png` 命名。

```sh
tools/ai-animation/build-animation-assets.sh \
  tools/ai-animation/configs/BD_laki.json \
  /path/to/source-root \
  src/pages/KJG_QAP_BD_v2_2026_video/assets/raster/BD_laki
```

输出目录不能预先存在。生成工具会拒绝帧缺失、无 alpha 通道或画布尺寸不一致的输入。动态图集的目标边长为 2048px，并会裁掉未使用的行；单帧动作只生成一个 PNG。

## 临时 DragonBones 输入

在取得 AI alpha 视频样例之前，可打开动画导出地址，例如 `/src/pages/animations/index.html?export=BD_laki.zip`。`window.__dragonBonesFrameExporter` 会提供精确的帧元数据和透明 PNG 数据。该方式只用于一次性迁移输入；生成后的模板不再使用 DragonBones 播放已迁移动画。

同一资源的全部动作必须共用同一画布和锚点。角色在场景中的移动（例如横向行走）应继续由 CSS 控制，不要烘焙进视频或图集。
