import { describe, expect, it } from 'vitest';
import { mergeFrameExportBounds, resolveOriginalContentViewport } from './frameExportLogic';

describe('dragonbones-tool frame export logic', () => {
  it('合并逐帧内容包围盒时保留负坐标范围', () => {
    expect(
      mergeFrameExportBounds([
        { x: -12.4, y: 4, width: 30, height: 20 },
        { x: 8, y: -6.2, width: 10, height: 50 },
      ]),
    ).toEqual({
      x: -12.4,
      y: -6.2,
      width: 30.4,
      height: 50,
    });
  });

  it('按原始内容 bounds 生成整数画布和反向偏移', () => {
    expect(
      resolveOriginalContentViewport(
        {
          x: -12.4,
          y: 5.2,
          width: 40.6,
          height: 33.1,
        },
        8,
      ),
    ).toEqual({
      width: 58,
      height: 50,
      offsetX: 21,
      offsetY: 3,
      sourceX: -21,
      sourceY: -3,
    });
  });
});
