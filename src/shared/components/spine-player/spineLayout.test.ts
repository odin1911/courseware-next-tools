import { describe, expect, it } from 'vitest';

import { resolveSpineFitBounds } from './spineLayout';

describe('spineLayout', () => {
  it('native 布局优先按骨骼内容 bounds 居中，而不是按整张 stage 居中', () => {
    expect(
      resolveSpineFitBounds({
        fitMode: 'native',
        stageRect: { x: 0, y: 0, width: 1024, height: 768 },
        backgroundRect: null,
        skeletonRect: { x: 120, y: 90, width: 360, height: 280 },
      }),
    ).toEqual({
      x: 120,
      y: 90,
      width: 360,
      height: 280,
    });
  });
});
