export class TimeAxisByWordVo {
  class: string;
  word: string;
  start: number;
  end: number;
}

export function parseTimeAxisByWordVo(raw: any): TimeAxisByWordVo {
  return {
    class: raw['class'],
    word: raw['word'],
    start: raw['start'],
    end: raw['end'],
  };
}
