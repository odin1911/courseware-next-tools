import { get } from '../../utils/futil';

export interface BubblePointVo {
  x: number;
  y: number;
}

export class BubbleRectPositionVo {
  x: number;
  y: number;
  width: number;
  height: number;
  points: BubblePointVo[];
  tailDirection: string;
}

export class BubbleVo {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  position: number;
  bubbleVisible: boolean;
  style: string;
  bubbleVideoPosition: BubbleRectPositionVo | null;
  bubbleClickAreaPosition: BubbleRectPositionVo | null;
}

function toNumber(value: unknown, fallback: number): number {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function parseBubblePointVo(raw: any): BubblePointVo {
  return {
    x: toNumber(get(raw, 'x', 0), 0),
    y: toNumber(get(raw, 'y', 0), 0),
  };
}

function parseBubbleRectPositionVo(raw: any): BubbleRectPositionVo | null {
  if (!raw) {
    return null;
  }

  const ret = new BubbleRectPositionVo();
  ret.x = toNumber(get(raw, 'x', 0), 0);
  ret.y = toNumber(get(raw, 'y', 0), 0);
  ret.width = toNumber(get(raw, 'width', 0), 0);
  ret.height = toNumber(get(raw, 'height', 0), 0);
  ret.points = Array.isArray(get(raw, 'points', []))
    ? get(raw, 'points', []).map(parseBubblePointVo)
    : [];
  ret.tailDirection = get(raw, 'tailDirection', '') || '';
  return ret;
}

function parseBooleanFlag(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return fallback;
}

export function parseBubbleVo(raw: any): BubbleVo {
  const ret = new BubbleVo();
  const attributes = get(raw, 'attributes', {});

  ret.id = '' + get(raw, 'id', '');
  ret.text = get(attributes, 'text', '') || '';
  ret.startTime = toNumber(get(attributes, 'start-time', 0), 0);
  ret.endTime = toNumber(get(attributes, 'end-time', 0), 0);
  ret.position = toNumber(get(attributes, 'position', 0), 0);
  ret.bubbleVisible = parseBooleanFlag(get(attributes, 'bubble-visible', true), true);
  ret.style = get(attributes, 'style', '') || '';
  ret.bubbleVideoPosition = parseBubbleRectPositionVo(
    get(attributes, 'bubble-video-position', null),
  );
  ret.bubbleClickAreaPosition = parseBubbleRectPositionVo(
    get(attributes, 'bubble-click-area-position', null),
  );
  return ret;
}
