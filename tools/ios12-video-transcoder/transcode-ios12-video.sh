#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
用法:
  ./transcode-ios12-video.sh --mode <format|seek> <输入视频> <输出基础名.mp4>

输出规格:
  - H.264 High Profile Level 4.1，最大 1920x1080，25fps，yuv420p
  - format: 最长 10 秒 GOP，允许场景切换关键帧，适合连续播放
  - seek: 每 1 秒一个 IDR，适合指定时间播放
  - AAC-LC，48kHz，双声道，128kbit/s
  - MP4 faststart
  - 自动添加 -f10s 或 -s1s 后缀

说明:
  输出文件已存在时不会覆盖。
EOF
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 4 || $1 != "--mode" ]]; then
  usage >&2
  exit 1
fi

mode=$2
input_file=$3
requested_output_file=$4

case "$mode" in
  format)
    output_suffix=-f10s
    mode_description='maxGOP=250帧'
    ;;
  seek)
    output_suffix=-s1s
    mode_description='GOP=25帧'
    ;;
  *)
    echo "错误: mode 必须是 format 或 seek: $mode" >&2
    exit 1
    ;;
esac

for command_name in ffmpeg ffprobe; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "错误: 未找到 $command_name，请先安装 FFmpeg。" >&2
    exit 1
  fi
done

if [[ ! -f "$input_file" ]]; then
  echo "错误: 输入文件不存在: $input_file" >&2
  exit 1
fi

if [[ ${requested_output_file##*.} != "mp4" ]]; then
  echo "错误: 输出文件必须使用 .mp4 扩展名: $requested_output_file" >&2
  exit 1
fi

if [[ "$requested_output_file" == *"${output_suffix}.mp4" ]]; then
  output_file=$requested_output_file
else
  output_file="${requested_output_file%.mp4}${output_suffix}.mp4"
fi

if [[ -e "$output_file" ]]; then
  echo "错误: 输出文件已存在，不会覆盖: $output_file" >&2
  exit 1
fi

mkdir -p "$(dirname "$output_file")"

ffmpeg_args=(
  -hide_banner -i "$input_file"
  -map 0:v:0 -map '0:a:0?' -sn -dn
  -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,format=yuv420p"
  -r 25 -fps_mode cfr
  -c:v libx264 -profile:v high -level:v 4.1 -tag:v avc1
  -preset medium -crf 20 -maxrate 8M -bufsize 16M
)

if [[ "$mode" == "format" ]]; then
  ffmpeg_args+=(-g 250 -keyint_min 25 -sc_threshold 40)
else
  ffmpeg_args+=(-g 25 -keyint_min 25 -sc_threshold 0 -x264-params "open-gop=0")
fi

ffmpeg_args+=(
  -bf 2 -refs 3
  -c:a aac -profile:a aac_low -b:a 128k -ar 48000 -ac 2
  -movflags +faststart -map_metadata -1 -map_chapters -1
  -n "$output_file"
)

ffmpeg "${ffmpeg_args[@]}"

probe_value() {
  local entry=$1
  ffprobe -v error -select_streams v:0 \
    -show_entries "stream=$entry" -of default=noprint_wrappers=1:nokey=1 \
    "$output_file"
}

codec_name=$(probe_value codec_name)
profile=$(probe_value profile)
level=$(probe_value level)
pixel_format=$(probe_value pix_fmt)
frame_rate=$(probe_value r_frame_rate)

width=$(probe_value width)
height=$(probe_value height)

if [[ "$codec_name" != "h264" || "$profile" != "High" || "$level" != "41" || \
      "$width" -gt 1920 || "$height" -gt 1080 || \
      "$pixel_format" != "yuv420p" || "$frame_rate" != "25/1" ]]; then
  echo "错误: 输出文件未通过编码规格检查。" >&2
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=codec_name,codec_tag_string,profile,level,width,height,pix_fmt,r_frame_rate,refs \
    -of default=noprint_wrappers=1 "$output_file" >&2
  exit 1
fi

echo "转换完成并通过基础规格检查: mode=$mode, $mode_description, $output_file"
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,codec_tag_string,profile,level,width,height,pix_fmt,r_frame_rate,refs \
  -of default=noprint_wrappers=1 "$output_file"
