// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import RasterCountdownOverlay from './RasterCountdownOverlay';

vi.mock('@/shared/components/audio-manager', () => ({
  createAudioManager: () => ({ play: vi.fn(), destroy: vi.fn() }),
}));

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('RasterCountdownOverlay', () => {
  test('places the intrinsic raster canvas at the template countdown origin', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    window.history.replaceState({}, '', '/?renderer=webm');
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(<RasterCountdownOverlay countdownValue={3} />));

    const overlay = container.querySelector<HTMLElement>('[data-testid="countdown-overlay"]');
    const backdrop = container.querySelector<HTMLElement>('[data-testid="countdown-backdrop"]');
    for (const element of [overlay, backdrop]) {
      expect(element?.style.left).toBe('0px');
      expect(element?.style.top).toBe('0px');
      expect(element?.style.right).toBe('0px');
      expect(element?.style.bottom).toBe('0px');
    }

    const player = container.querySelector<HTMLElement>('[data-raster-action="start"]');
    expect(Number.parseFloat(player?.style.left ?? '')).toBeCloseTo(270.77001953125);
    expect(Number.parseFloat(player?.style.top ?? '')).toBeCloseTo(159.99926952514647);
    expect(player?.querySelector('video')?.loop).toBe(false);

    act(() => root.unmount());
  });
});
