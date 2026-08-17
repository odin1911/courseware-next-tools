export class TimeAxisBySentenceVo {
  lyric: string;
  start: number;
  end: number;
}

export function parseTimeAxisBySentenceVo(raw: any): TimeAxisBySentenceVo {
  const lyric: string = raw['lyric'];
  const timeStr: string = lyric
    ? lyric.substring(lyric.lastIndexOf('[') + 1, lyric.lastIndexOf(']'))
    : '';
  const times: string[] = timeStr.split(',');
  return {
    lyric,
    start: +times[0],
    end: +times[times.length - 1],
  };
}
