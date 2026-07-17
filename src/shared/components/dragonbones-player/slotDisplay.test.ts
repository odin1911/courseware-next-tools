import { describe, expect, it, vi } from 'vitest';
import type { DragonBonesHandle } from './DragonBonesPlayer';
import type { DragonBonesSlotLike } from './slotDisplay';
import { replaceDragonBonesSlotDisplay, restoreDragonBonesSlotDisplay } from './slotDisplay';

function createPlayer(slot: unknown, renderCurrentFrame = vi.fn()) {
  return {
    getArmature: () => ({
      getSlot: () => slot,
    }),
    renderCurrentFrame,
  } as unknown as DragonBonesHandle;
}

describe('replaceDragonBonesSlotDisplay', () => {
  it('replaces the active displayList entry and can restore it', () => {
    const slot: DragonBonesSlotLike = {
      display: 'current',
      displayIndex: 1,
      displayList: ['hidden', 'old'],
      rawDisplay: 'raw',
    };
    const renderCurrentFrame = vi.fn();

    const handle = replaceDragonBonesSlotDisplay(
      createPlayer(slot, renderCurrentFrame),
      'card_front',
      ({ sourceDisplay, displayIndex }) => ({ sourceDisplay, displayIndex }),
    );

    expect(handle?.display).toEqual({ sourceDisplay: 'old', displayIndex: 1 });
    expect(slot.displayList).toEqual(['hidden', handle?.display]);
    expect(renderCurrentFrame).toHaveBeenCalledTimes(1);

    restoreDragonBonesSlotDisplay(handle);

    expect(slot.displayList).toEqual(['hidden', 'old']);
  });

  it('falls back to slot.display when no displayList is available', () => {
    const replacement = {};
    const slot: DragonBonesSlotLike = {
      display: 'current',
    };

    const handle = replaceDragonBonesSlotDisplay(
      createPlayer(slot),
      'card_front',
      () => replacement,
    );

    expect(handle?.previousDisplay).toBe('current');
    expect(slot.displayList).toEqual([replacement]);

    slot.display = replacement;
    restoreDragonBonesSlotDisplay(handle);

    expect(slot.display).toBe('current');
  });
});
