import { describe, expect, it, vi } from 'vitest';

import { hideSkeletonSlots } from './spineSlotVisibility';

describe('spineSlotVisibility', () => {
  it('会清掉命中的 slot attachment，未命中的保持不变', () => {
    const draw2Slot = {
      data: { name: 'draw2' },
      attachment: { name: 'draw2-attachment' },
    };
    const draw3Setter = vi.fn();
    const draw3Slot = {
      data: { name: 'draw3' },
      setAttachment: draw3Setter,
    };
    const drawSlot = {
      data: { name: 'draw' },
      attachment: { name: 'draw-attachment' },
    };

    hideSkeletonSlots(
      {
        slots: [draw2Slot, draw3Slot, drawSlot],
      },
      ['draw2', 'draw3'],
    );

    expect(draw2Slot.attachment).toBeNull();
    expect(draw3Setter).toHaveBeenCalledWith(null);
    expect(drawSlot.attachment).toEqual({ name: 'draw-attachment' });
  });
});
