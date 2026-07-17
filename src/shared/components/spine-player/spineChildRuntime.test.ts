import { describe, expect, it } from 'vitest';

import {
  createAnimationSampleTimes,
  resolveRequestedChildBoneName,
  resolveSlotRectFromSkeleton,
} from './spineChildRuntime';

describe('spineChildRuntime', () => {
  it('精确 bone 名优先，唯一 shortName 才回退', () => {
    expect(
      resolveRequestedChildBoneName(
        [{ name: 'root' }, { name: 'group/mc-1-1', parent: 'root' }],
        'group/mc-1-1',
      ),
    ).toBe('group/mc-1-1');

    expect(
      resolveRequestedChildBoneName(
        [{ name: 'root' }, { name: 'group/mc-1-1', parent: 'root' }],
        'mc-1-1',
      ),
    ).toBe('group/mc-1-1');
  });

  it('动画采样时间会包含 0、关键帧和 duration', () => {
    expect(
      createAnimationSampleTimes({
        bones: {
          hero: {
            translate: [{ time: 0 }, { time: 0.5 }, { time: 1 }],
          },
        },
      }),
    ).toContain(1);
  });

  it('按当前 skeleton pose 解析 slot 的 worldRect 和 screenRect', () => {
    const result = resolveSlotRectFromSkeleton({
      skeleton: {
        slots: [
          {
            data: { name: 'draw' },
            getAttachment: () => ({
              worldVerticesLength: 8,
              computeWorldVertices: (
                _slot: unknown,
                _start: number,
                _count: number,
                vertices: Float32Array,
              ) => {
                vertices.set([10, 20, 40, 20, 40, 60, 10, 60]);
              },
            }),
          },
        ],
      },
      slotName: 'draw',
      viewWidth: 100,
      viewHeight: 100,
      contentBounds: { x: 0, y: 0, width: 100, height: 100 },
      fitRatio: 1,
      flipY: false,
    });

    expect(result).toEqual({
      slotName: 'draw',
      worldRect: { x: 10, y: 20, width: 30, height: 40 },
      screenRect: { x: 10, y: 40, width: 30, height: 40 },
    });
  });

  it('native 布局会按内容 bounds 原尺寸居中，不按 board 尺寸缩放 slot rect', () => {
    const result = resolveSlotRectFromSkeleton({
      skeleton: {
        slots: [
          {
            data: { name: 'draw' },
            getAttachment: () => ({
              worldVerticesLength: 8,
              computeWorldVertices: (
                _slot: unknown,
                _start: number,
                _count: number,
                vertices: Float32Array,
              ) => {
                vertices.set([100, 200, 300, 200, 300, 400, 100, 400]);
              },
            }),
          },
        ],
      },
      slotName: 'draw',
      viewWidth: 717,
      viewHeight: 551,
      contentBounds: { x: 100, y: 200, width: 200, height: 200 },
      fitRatio: 1,
      flipY: false,
      fitMode: 'native',
    } as Parameters<typeof resolveSlotRectFromSkeleton>[0]);

    expect(result).toEqual({
      slotName: 'draw',
      worldRect: { x: 100, y: 200, width: 200, height: 200 },
      screenRect: { x: 258.5, y: 175.5, width: 200, height: 200 },
    });
  });

  it('region attachment 即使带有 worldVerticesLength，也要兼容 bone 签名的 computeWorldVertices', () => {
    const bone = { name: 'draw-bone' };
    const result = resolveSlotRectFromSkeleton({
      skeleton: {
        slots: [
          {
            data: { name: 'draw' },
            bone,
            getAttachment: () => ({
              worldVerticesLength: 8,
              computeWorldVertices: (
                targetBone: unknown,
                vertices: Float32Array,
                _offset: number,
                _stride: number,
              ) => {
                if (targetBone !== bone) {
                  throw new Error('expected bone signature');
                }

                vertices.set([12, 18, 52, 18, 52, 48, 12, 48]);
              },
            }),
          },
        ],
      },
      slotName: 'draw',
      viewWidth: 100,
      viewHeight: 100,
      contentBounds: { x: 0, y: 0, width: 100, height: 100 },
      fitRatio: 1,
      flipY: false,
    });

    expect(result).toEqual({
      slotName: 'draw',
      worldRect: { x: 12, y: 18, width: 40, height: 30 },
      screenRect: { x: 12, y: 52, width: 40, height: 30 },
    });
  });

  it('已套过渲染 transform 的 skeleton pose 不应再次重复换算 slot rect', () => {
    const result = resolveSlotRectFromSkeleton({
      skeleton: {
        slots: [
          {
            data: { name: 'draw' },
            getAttachment: () => ({
              worldVerticesLength: 8,
              computeWorldVertices: (
                _slot: unknown,
                _start: number,
                _count: number,
                vertices: Float32Array,
              ) => {
                vertices.set([-190, -130, 190, -130, 190, 187, -190, 187]);
              },
            }),
          },
        ],
      },
      slotName: 'draw',
      viewWidth: 717,
      viewHeight: 551,
      contentBounds: { x: 120, y: 90, width: 360, height: 280 },
      fitRatio: 1,
      flipY: false,
      fitMode: 'native',
      worldRectSpace: 'viewport',
    } as Parameters<typeof resolveSlotRectFromSkeleton>[0]);

    expect(result).toEqual({
      slotName: 'draw',
      worldRect: { x: -190, y: -130, width: 380, height: 317 },
      screenRect: { x: 168.5, y: 88.5, width: 380, height: 317 },
    });
  });
});
