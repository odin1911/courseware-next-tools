# 视频动画资源体积统计

统计对象为 `src/pages/animations/assets` 中实际使用的 14 个动画资源、63 个动作。临时输入是从现有动画按 24 fps 自动导出的透明 PNG 帧；正式接入 AI alpha 视频后，只替换输入来源，三种交付格式不变。

## 按资源统计

WebM/MOV 列包含该平台视频和共用单帧 PNG；PNG 列包含图集及单帧。体积使用十进制单位：1 KB = 1000 B，1 MB = 1000 KB。

| 资源 | 原 ZIP | Chrome/Android WebM | Safari/iOS 13+ MOV | iOS 12 PNG | 三格式发布合计 |
| --- | ---: | ---: | ---: | ---: | ---: |
| BD_close | 45.8 KB | 250.7 KB | 628.8 KB | 2.92 MB | 3.61 MB |
| BD_flash | 32.7 KB | 608.8 KB | 1.32 MB | 3.65 MB | 5.31 MB |
| BD_laki | 58.9 KB | 386.3 KB | 772.4 KB | 2.58 MB | 3.69 MB |
| BD_lele | 53.5 KB | 297.8 KB | 672.7 KB | 2.80 MB | 3.72 MB |
| BD_mission_failed | 69.0 KB | 103.5 KB | 104.3 KB | 511.7 KB | 558.9 KB |
| BD_mission_successed | 107.0 KB | 97.6 KB | 94.8 KB | 413.7 KB | 459.3 KB |
| BD_nani | 63.1 KB | 273.3 KB | 612.6 KB | 2.46 MB | 3.30 MB |
| BD_ola | 60.6 KB | 341.4 KB | 717.8 KB | 2.79 MB | 3.80 MB |
| BD_open | 44.4 KB | 243.7 KB | 614.0 KB | 2.78 MB | 3.45 MB |
| BD_pay_money | 2.4 KB | 8.0 KB | 12.4 KB | 28.5 KB | 44.2 KB |
| BD_pili | 67.2 KB | 282.3 KB | 551.1 KB | 2.66 MB | 3.44 MB |
| BD_title | 36.0 KB | 180.5 KB | 358.4 KB | 1.30 MB | 1.69 MB |
| count | 83.6 KB | 174.2 KB | 394.7 KB | 1.42 MB | 1.97 MB |
| heart | 93.1 KB | 80.5 KB | 128.8 KB | 371.8 KB | 540.0 KB |
| **合计** | **817.1 KB** | **3.33 MB** | **6.98 MB** | **26.69 MB** | **35.58 MB** |

精确合计：原 ZIP 817.1 KB（817,117 B）；WebM 平台 3.33 MB（3,328,638 B）；MOV 平台 6.98 MB（6,983,426 B）；PNG 降级 26.69 MB（26,689,908 B）；三格式发布目录 35.58 MB（35,578,248 B）。

## 结论

- 49 个多帧动作使用视频，14 个单帧动作只使用 PNG；共发布 49 WebM、49 MOV、94 PNG。
- 相比 PNG 降级资源，WebM 平台下载量减少 87.5%，MOV 平台减少 73.8%，视频的体积优势明确。
- 视频不一定小于原 DragonBones ZIP：全量 WebM 平台为原 ZIP 的 4.07 倍，MOV 为 8.55 倍。这是逐像素视频替代矢量骨骼动画的预期代价。
- `BD_mission_successed`、`heart` 的 WebM 平台仍小于原 ZIP；大画布的门帘、闪光和标题是主要增量。
- 三套资源都会进入发布目录，但浏览器只请求当前平台视频；PNG 图集仅在 iOS 12 或视频失败时加载，不能同时预加载三套。
