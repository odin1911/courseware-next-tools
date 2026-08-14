#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
用法:
  ./transcode-videos.sh <format|seek> [视频文件名 ...]

说明:
  - 不指定文件名时，转换 videos/ 顶层的所有 MP4、MOV 和 M4V。
  - 指定文件名时，只转换对应文件。
  - 输出写入 videos/converted/，文件名带 -f10s 或 -s1s 后缀。
EOF
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 1
fi

mode=$1
shift

if [[ "$mode" != "format" && "$mode" != "seek" ]]; then
  echo "错误: mode 必须是 format 或 seek: $mode" >&2
  exit 1
fi

if [[ "$mode" == "format" ]]; then
  output_suffix=-f10s
else
  output_suffix=-s1s
fi

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
video_dir="$script_dir/videos"
output_dir="$video_dir/converted"
transcoder="$script_dir/transcode-ios12-video.sh"

if [[ ! -x "$transcoder" ]]; then
  echo "错误: 转换脚本不存在或不可执行: $transcoder" >&2
  exit 1
fi

mkdir -p "$video_dir" "$output_dir"

video_files=()

if [[ $# -gt 0 ]]; then
  for filename in "$@"; do
    input_file="$video_dir/$filename"
    if [[ ! -f "$input_file" ]]; then
      echo "错误: 视频文件不存在: $input_file" >&2
      exit 1
    fi
    video_files+=("$input_file")
  done
else
  shopt -s nullglob nocaseglob
  video_files=("$video_dir"/*.mp4 "$video_dir"/*.mov "$video_dir"/*.m4v)
  shopt -u nullglob nocaseglob
fi

if [[ ${#video_files[@]} -eq 0 ]]; then
  echo "未找到待转换视频: $video_dir"
  exit 0
fi

converted_count=0
skipped_count=0

for input_file in "${video_files[@]}"; do
  filename=$(basename "$input_file")
  output_file="$output_dir/${filename%.*}${output_suffix}.mp4"

  if [[ -e "$output_file" ]]; then
    echo "跳过已存在输出: $output_file"
    ((skipped_count += 1))
    continue
  fi

  echo "转换: $input_file"
  "$transcoder" --mode "$mode" "$input_file" "$output_file"
  ((converted_count += 1))
done

echo "批量转换完成: mode=${mode}，成功 ${converted_count}，跳过 ${skipped_count}，输出目录 $output_dir"
