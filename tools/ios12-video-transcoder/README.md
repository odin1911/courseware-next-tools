# iOS 12 Safari 可跳转视频编码规格

## 1. 目标与适用范围

本规格用于需要在 iPhone 6s / iOS 12 Safari 中播放，并支持按指定时间快速跳转的课件 MP4 视频。

目标：

- 兼容旧版 iOS Safari 的硬件解码能力。
- 任意时间跳转时，最多回退约 1 秒到最近的独立解码点。
- 支持普通 `<video src="...mp4">` 渐进式下载，不要求 HLS。
- 固化成可重复执行、可验证的转码产物。

不以 4K 输出、HDR、透明视频、多音轨或无损压缩为目标。

## 2. 交付规格

| 项目 | 规格 | 理由 |
| --- | --- | --- |
| 容器 | MP4 | iOS Safari 原生支持，适合当前直接加载 MP4 的链路。 |
| MP4 布局 | `moov` 位于 `mdat` 前，启用 `faststart` | 浏览器拿到文件前部后即可读取索引和时长，减少等待完整下载的风险。 |
| 视频编码 | H.264/AVC，sample entry 为 `avc1` | iOS 12 兼容性稳定，避免使用旧设备不支持的新编码格式。 |
| Profile / Level | High Profile，Level 4.1 | 1080p25 不需要 Level 5；Apple 将 High@4.1 或以下作为最大兼容性建议。 |
| 分辨率 | 1920×1080；非 16:9 输入等比缩放后补黑边 | 限制单帧解码负担，避免 4K / Level 5.1 对旧设备造成兼容风险。 |
| 帧率 | 25 fps，CFR | 与当前课件视频一致；固定帧率让 25 帧 GOP 精确对应 1 秒。 |
| 像素格式 | `yuv420p`，8-bit 4:2:0 | 旧版硬件解码器兼容性最好。 |
| GOP / IDR | 闭合 GOP；每 25 帧一个 IDR；禁用场景切换额外关键帧 | 每秒形成一个稳定的随机访问点，方便按指定位置播放。 |
| 参考帧 | 最多 3 帧 | 低于 1080p Level 4.1 的 DPB 上限，给 B 帧重排保留余量。 |
| 码率控制 | CRF 20，最大视频码率 8 Mbit/s，VBV 16 Mbit | 兼顾课件文字清晰度、文件体积和旧设备持续解码压力。 |
| 音频 | AAC-LC，48 kHz，双声道，128 kbit/s | iOS 12 原生支持，并与现有素材采样率一致。 |
| 其他轨道 | 不输出字幕和 data 轨道 | 避免无关轨道造成容器兼容差异。 |

转换脚本：[`transcode-ios12-video.sh`](./transcode-ios12-video.sh)。

## 3. 关键决策说明

### 3.1 Level 4.1 不限制整段视频的关键帧数量

Level 限制的是单帧宏块数、每秒宏块处理量、码率和 DPB 容量。对 1920×1088 的编码图像，Level 4.1 的 DPB 约能保存 4 张已解码图像；这是某一时刻的解码缓冲容量，不是整段视频只能有 4 个关键帧。

每秒一个 IDR 与 Level 4.1 不冲突。IDR 越密集主要会降低压缩效率、增加文件体积，但能缩短 seek 后需要解码的 GOP 长度。

### 3.2 采用 1 秒 IDR，而不是只满足 Apple 的 2 秒建议

Apple HLS 编码规范建议每 2 秒存在一个 IDR，附录给出的常见配置为每 1～2 秒一个关键帧。本项目需要从指定时间开始播放，因此采用更严格的 1 秒间隔，将跳转后的预解码范围限制在约 1 秒内。

该 Apple 规范面向 HLS，普通 MP4 不受其强制约束；这里采用的是其中适合旧 Apple 设备的兼容性基线。

### 3.3 不使用 4K / Level 5.1

已检查的异常样本同时具有 3840×2160、High@5.1、仅首帧为关键帧、`moov` 位于文件末尾等风险因素，不能只凭一次播放失败把原因归到其中某一项。本规格统一降为 1080p、High@4.1、1 秒 IDR 并启用 `faststart`，一次消除这些风险。

已检查的可播放样本为 1080p25，实际内容不需要 Level 5.0；使用高于内容所需的 Level 不会提高画质，只会缩小旧设备兼容范围。

## 4. 使用方式

依赖：安装支持 `libx264` 和 AAC 的 `ffmpeg`，并确保 `ffmpeg`、`ffprobe` 位于 `PATH`。

```bash
./transcode-ios12-video.sh input.mp4 output.mp4
```

脚本默认不覆盖已有文件。需要替换时，先明确删除或移动旧输出文件，再重新执行。

## 5. 验证

查看编码规格：

```bash
ffprobe -v error \
  -select_streams v:0 \
  -show_entries stream=codec_name,codec_tag_string,profile,level,width,height,pix_fmt,r_frame_rate,refs \
  -of default=noprint_wrappers=1 \
  output.mp4
```

预期包括：

```text
codec_name=h264
profile=High
codec_tag_string=avc1
width=1920
height=1080
pix_fmt=yuv420p
level=41
r_frame_rate=25/1
```

查看关键帧时间：

```bash
ffprobe -v error \
  -select_streams v:0 \
  -skip_frame nokey \
  -show_frames \
  -show_entries frame=best_effort_timestamp_time,pict_type \
  -of csv=p=0 \
  output.mp4
```

预期关键帧位于 `0、1、2、3...` 秒，允许因时间基产生不超过一帧的显示误差。

最终验收还需在真实 iPhone 6s / iOS 12 Safari 上验证：首次播放、暂停恢复，以及跳转到视频开头、中部和尾部后均能正常出画和出声。

## 6. 依据

- [ITU-T H.264：Annex A / Table A-1 Level limits](https://www.itu.int/rec/T-REC-H.264/)
- [Apple HLS Authoring Specification for Apple Devices](https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices/)
- [Apple HLS Authoring Specification Appendixes](https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices-appendixes/)
- [FFmpeg Documentation](https://ffmpeg.org/ffmpeg.html)
- [FFprobe Documentation](https://ffmpeg.org/ffprobe.html)
