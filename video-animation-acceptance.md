# 视频动画替代验收说明

## 启动服务

在项目根目录执行：

```sh
yarn dev --host 0.0.0.0
```

默认本机地址为 `http://127.0.0.1:5173`。手机验收时，手机与电脑需连接同一局域网，并把链接中的 `127.0.0.1` 替换为电脑局域网 IP，例如 `192.168.68.65`。

## 审核链接

- [新模板：自动选择格式](http://127.0.0.1:5173/src/pages/KJG_QAP_BD_v2_2026_video/index.html?channel=ng-preview&businessContentUuid=mock&fetchDataUrl=%2Fsrc%2Fshared%2Fcore%2Fmock%2FKJG_QAP_BD_v2.json&renderer=auto)
- [原 DragonBones 样板：用于对比](http://127.0.0.1:5173/src/pages/KJG_QAP_BD_v2_2026/index.html?channel=ng-preview&businessContentUuid=mock&fetchDataUrl=%2Fsrc%2Fshared%2Fcore%2Fmock%2FKJG_QAP_BD_v2.json)
- [强制 VP9 alpha WebM](http://127.0.0.1:5173/src/pages/KJG_QAP_BD_v2_2026_video/index.html?channel=ng-preview&businessContentUuid=mock&fetchDataUrl=%2Fsrc%2Fshared%2Fcore%2Fmock%2FKJG_QAP_BD_v2.json&renderer=webm)
- [强制 HEVC alpha MOV：使用 Safari](http://127.0.0.1:5173/src/pages/KJG_QAP_BD_v2_2026_video/index.html?channel=ng-preview&businessContentUuid=mock&fetchDataUrl=%2Fsrc%2Fshared%2Fcore%2Fmock%2FKJG_QAP_BD_v2.json&renderer=mov)
- [强制 PNG 图集 Canvas](http://127.0.0.1:5173/src/pages/KJG_QAP_BD_v2_2026_video/index.html?channel=ng-preview&businessContentUuid=mock&fetchDataUrl=%2Fsrc%2Fshared%2Fcore%2Fmock%2FKJG_QAP_BD_v2.json&renderer=atlas)
- [模拟视频失败并主动降级 PNG](http://127.0.0.1:5173/src/pages/KJG_QAP_BD_v2_2026_video/index.html?channel=ng-preview&businessContentUuid=mock&fetchDataUrl=%2Fsrc%2Fshared%2Fcore%2Fmock%2FKJG_QAP_BD_v2.json&renderer=broken-video)

## 内容验收流程

1. 同时打开新模板与原样板，点击开始。
2. 验收 `count`：开始后立即出现倒计时，播放结束后正常进入主场景。
3. 验收 `BD_laki`：检查进入、等待、转身、支付、开心、伤心、生气等状态。角色为随机出现，可多完成几轮进行观察。
4. 验收 `BD_mission_successed`：完成全部题目并进入成功结果页，确认动画和确认按钮正常。
5. 动画播放中点击暂停，确认画面冻结；点击继续后应从原位置恢复。
6. 使用“模拟视频失败”链接重复上述流程，确认页面主动切换至 PNG Canvas，业务流程不中断。

## 视觉验收标准

- 透明区域没有黑底、绿边、色边或矩形背景。
- 角色和特效的大小、锚点、位置与原样板一致。
- 动作切换没有明显跳动、缩放或位置漂移。
- 循环动作衔接没有闪帧或长时间停顿。
- 播放速度、动作内容和结束时机与原动画一致。
- WebM、MOV、PNG 三条路径显示的内容一致。
- 视频失败切换 Canvas 时不闪黑，并从失败时的相邻帧继续，而不是重新播放。

## 技术路径检查

在浏览器开发者工具 Console 执行：

```js
[...document.querySelectorAll('[data-raster-status]')].map((element) => ({
  action: element.dataset.rasterAction,
  renderer: element.dataset.rasterRenderer,
  status: element.dataset.rasterStatus,
  currentTime: element.querySelector('video')?.currentTime,
}));
```

预期结果：

| 环境 | renderer | status | DOM |
| --- | --- | --- | --- |
| Chrome 56+ / Android 9 Chrome | `webm` | `video` | `<video>` |
| Safari / iOS 13+ | `mov` | `video` | `<video>` |
| iOS 12 | `atlas` | `atlas` | `<canvas>` |
| 视频加载或播放失败 | `atlas` | `atlas` | `<canvas>` |

在 Network 面板筛选 `raster`，还应满足：

- Chrome/Android 自动路径请求 `.webm`。
- Safari/iOS 13+ 自动路径请求 `.mov`。
- PNG 路径按需请求 `*-atlas-*.png`。
- 新模板不请求 `BD_laki.zip`、`BD_mission_successed.zip` 或 `count.zip`。
- PNG 降级发生前不提前下载整套 PNG 图集。

## 真机验收矩阵

| 设备基线 | 审核入口 | 必验内容 |
| --- | --- | --- |
| Chrome 56 / Android 9 | `renderer=auto` | WebM 解码、透明合成、自动播放、暂停恢复 |
| iOS 13+ / Safari 13+ | `renderer=auto` | MOV 解码、透明合成、内联自动播放、暂停恢复 |
| iOS 12 | `renderer=auto` | PNG Canvas、帧率、内存、暂停恢复、完成回调 |
| 任意开发浏览器 | `renderer=broken-video` | 视频失败后主动切换 Canvas，流程不中断 |

## 验收记录

建议记录设备型号、系统版本、浏览器版本、实际 renderer、动作名称、结果和截图/录屏。任何透明边缘、位置、时长问题都应记录到具体资源及动作，例如 `BD_laki/wait.webm`。
