# AI 动画替代 DragonBones 技术依据

本文档用于说明视频动画替代功能汇报结论的技术依据，包括平台能力、资源生产方式、运行时选路、未选择方案和风险边界。开发文件清单、验证命令与验收步骤由代码、工具说明和验收文档维护。

## 文档职责与数据快照

- 本文档是后续方案设计和汇报生成的技术依据，不代替代码实现、工具操作说明或设备验收记录。
- 当前资源数量、动作数量、体积和设备结果属于 DEMO 数据快照，统计日期为2026年8月25日；资源或平台范围变化后必须重新统计。
- 平台能力、三格式选路、生产边界和未选择方案属于技术决策；调整这些结论时需要同时记录变更原因和影响范围。

## 技术目标与范围边界

- 新动画生产采用“AI Alpha 视频 → RGBA 帧母版 → 浏览器交付资源”，不再制作新的 DragonBones 骨骼包。
- 交付资源必须支持透明背景，并覆盖 iOS 12及后续版本、Android、Chrome和 PC 浏览器。
- 保持动作切换、循环、暂停、恢复、重播、完成回调、CSS 位移、显示层级和独立音效行为。
- 题目下发的动态 `skeletonUrl` 属于另一条题目资源链，不在本次替代范围内。
- 角色行走、门帘横移、金币飞行等模板布局运动继续由 CSS 或模板状态控制，不烘焙进视频。
- Lottie、Rive、Spine 等方案需要重新制作矢量或骨骼资产，不符合本次 AI 视频生产目标。

## 已确认事实

- 初始盘点包含15个资源、65个动作；排除未进入本次模板动画迁移范围的 `SoundBtnS` 及其两个动作后，最终 DEMO 覆盖14个资源、63个动作。
- 最终资源中49个多帧动作生成 WebM、MOV和 PNG图集，14个单帧动作只生成透明 PNG。
- `BD_ola` 为24 fps；`wait` 是6.333秒、152帧的长循环动作，`end` 只有1帧。该样本说明运行时既要支持长视频循环，也要避免为单帧动作生成视频。
- 同一角色不同动作的透明画布尺寸可能不同。当前生产链使用统一画布和锚点，避免动作切换时位置跳动。
- Chromium 可使用 VP9 Alpha WebM；Safari / iOS 的 HEVC Alpha 路径从 iOS 13 / Safari 13开始，iOS 12不能使用该透明视频路径。
- Android系统版本不能单独证明 WebM Alpha 可用，还需要确认实际 Chrome或 Android System WebView 的解码能力。
- Canvas 2D的 `drawImage()` 与 `requestAnimationFrame()` 能覆盖 iOS 12，并提供帧号、暂停、循环和完成回调控制。
- `canPlayType()` 只能预筛编码支持，不能证明透明通道显示正确，透明边缘仍需在目标设备上人工检查。
- AI 素材的头发、半透明光效、粒子和运动模糊边缘需要人工验收，编码步骤不能修复源素材的 Alpha 质量问题。

## 统一资源生产链

1. 正式输入为 AI 生成的 Alpha 视频；DEMO 阶段从现有 DragonBones 动画导出透明帧，仅用于验证生产和播放管线。
2. 每个业务动作独立生产，保持现有动作命名，不生成包含全部动作的长视频。
3. 输入统一标准化为24 fps RGBA PNG帧；同一角色的全部动作保持一致的画布、锚点和缩放。
4. 从同一套 RGBA帧生成 VP9 Alpha WebM、HEVC Alpha MOV、PNG图集和统一 manifest，保证三条路径的帧数、时长、位置与透明内容一致。
5. 单帧动作只生成普通透明 PNG，不生成没有播放价值的视频。

## 运行时选路与降级

| 环境 | 主路径 | 失败处理 |
| --- | --- | --- |
| Chrome / Android / 支持 VP9 Alpha的非 Safari浏览器 | VP9 Alpha WebM | 切换 PNG图集 |
| Safari / iOS 13+ | HEVC Alpha MOV | 切换 PNG图集 |
| iOS 12 | PNG图集 Canvas | 图集失败后报告错误 |
| 视频加载、解码或播放失败 | PNG图集 Canvas | 保持业务流程和动作时间语义 |

- 视频路径使用原生 `<video muted playsInline preload>`，保留循环、暂停、重播和结束事件。
- PNG路径按动作、按图集页懒加载，由 Canvas按时间戳计算帧号。
- 视频失败后卸载失败视频，从相邻时间位置切换到图集，不从头重播。
- 浏览器只请求当前平台使用的格式，不同时下载 WebM、MOV和全部 PNG图集。
- 动作切换后应释放旧图集引用；页面暂停或卸载后停止 Canvas绘制。

## 三条交付路径的依据

### VP9 Alpha WebM

- 支持透明通道，适用于 Chrome、Android和其他满足解码条件的 Chromium环境。
- 帧间压缩使长循环动作的下载体积明显小于 PNG图集。
- 不覆盖 iOS 12和当前 Safari主路径。

### HEVC Alpha MOV

- Apple平台的透明视频主路径，适用于 Safari和 iOS 13+。
- 不覆盖 iOS 12，且必须通过 Apple真机验证透明边缘、自动播放和多视频行为。

### PNG图集 Canvas

- 覆盖 iOS 12，也是视频加载、播放或解码失败时的兼容路径。
- 完整保留 RGBA像素，并可精确控制暂停、恢复、循环、帧号和完成回调。
- 主要成本是下载体积、解码内存和 Canvas逐帧绘制压力。
- iOS 12实机存在明显发热风险，正式生产时需要根据动画表现适当抽帧，并保持按动作、按页加载。

## 其它替代方案比较

| 方案 | 透明 | 精确暂停/结束 | iOS 12 | 当前结论 |
| --- | --- | --- | --- | --- |
| APNG | 是 | 否 | 是 | 只适合无需精确回调的图标、标题和短特效 |
| Animated WebP | 是 | 否 | 否 | 可用于现代端轻量装饰，不作为统一格式 |
| Animated AVIF | 是 | 否 | 否 | 兼容下限高、编码较慢，当前不选 |
| CSS sprites + `steps()` | 是 | 基本支持 | 是 | 适合短且规则的固定帧特效，不适合角色长动作 |
| H.264 RGB+Alpha双视频 + WebGL | 是 | 是 | 理论可行 | 需要双路同步、双解码和 Shader合成，并发风险高，只作为性能实验备选 |
| Lottie / Rive / Spine | 是 | 是 | 依运行时 | 需要重新制作矢量或骨骼资产，违背 AI视频生产目标 |
| SVG动画 | 是 | 依实现 | 是 | 无法从复杂视频稳定恢复路径、图层和关键帧语义，只适合原生矢量素材 |

## 推荐决策

- 每个多帧动作统一发布 WebM、MOV和 PNG图集，客户端只下载当前设备选中的格式。
- Chrome / Android选择 WebM，Safari / iOS 13+选择 MOV，iOS 12或视频失败使用 PNG图集。
- PNG图集是固定兼容路径，不是待删除的临时方案。
- APNG只可局部用于不需要精确控制的简单动画，不能替代角色、倒计时和门帘等受控动画。
- 当前不选择 H.264双视频方案；只有 PNG路径在正式指标下无法满足体积或内存要求时，才单独验证双视频的同步、并发和设备兼容性。
- 不继续增加媒体格式，后续重点是资源体积、Canvas渲染压力和生产维护标准。

## 风险与适用限制

- AI素材一致性和 Alpha边缘质量属于上游生产风险，需要人工检查，不能依赖编码自动修复。
- WebM与 MOV使用不同解码链路，透明边缘和播放行为需要分别验收。
- PNG图集是 iOS 12必要路径，也是当前体积、解码内存和渲染压力最大的部分。
- 三种格式会增加发布目录和 CDN存储体积；Service Worker或预缓存清单不得提前下载全部变体。
- 视频是逐像素动画，体积高于可复用纹理的骨骼动画属于预期结果。
- 当前结论处于 DEMO可行性验证阶段；正式性能指标、资源预算和生产维护标准应在进入正式开发后制定。

## 维护规则

- 支持平台或最低浏览器版本变化时，重新核对媒体能力，并同步更新运行时选路、替代方案比较和汇报结论。
- AI输入、RGBA标准化、交付格式或 manifest职责变化时，同步更新统一资源生产链和动画生成工具文档。
- 播放器选路、失败降级、暂停恢复或资源加载策略变化时，同步更新运行时章节和验收文档。
- 动画资源、动作数量或生成结果变化时，重新生成资源统计，并更新本文数据快照和汇报文档的当前资源结果。
- 新增或淘汰方案时，保留选择依据、未选择原因、适用边界和已验证设备，不只记录最终结论。

## 相关事实来源

- [视频动画替代功能可行性分析报告](./视频动画替代功能调研报告.md)：面向汇报的结论、当前资源结果和限制。
- [视频动画资源体积统计](../../src/pages/KJG_QAP_BD_v2_2026_video/video-animation-metrics.md)：资源数量、动作数量和各格式体积的原始统计。
- [AI动画资源生成工具](../../tools/ai-animation/README.md)：资源生成入口、输入输出和目录约定。
- [动画视频生成全流程](../../tools/ai-animation/video-generation-pipeline.md)：RGBA标准化、manifest和三格式生成细节。
- [视频动画替代验收说明](../../src/pages/KJG_QAP_BD_v2_2026_video/ACCEPTANCE.md)：浏览器、设备、播放行为和失败降级的验收记录。
- [视频格式对比结论](./视频格式对比结论.md) 与 [PNG图集优化方案](./PNG图集优化方案.md)：格式背景和 iOS 12兼容路径的专项补充。

## 参考依据

- [W3C PNG 3：APNG与 Alpha](https://www.w3.org/TR/png-3/)
- [MDN：APNG、WebP和 AVIF格式](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types)
- [MDN：Canvas `drawImage()`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)
- [MDN：`requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [Chrome：WebM Alpha](https://developer.chrome.com/blog/alpha-transparency-in-chrome-video)
- [Apple：HEVC Alpha从 iOS 13 / Safari 13开始支持](https://developer.apple.com/videos/play/wwdc2019/506/)
