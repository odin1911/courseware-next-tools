// @vitest-environment jsdom

import { act, forwardRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import FinalFoodFlash from './FinalFoodFlash';
import PayMoneyEffect from './PayMoneyEffect';

vi.mock('@/shared/components/dragonbones-player', () => ({
  default: forwardRef(() => <div data-testid="legacy-dragonbones" />),
}));

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('main scene raster effects', () => {
  test('renders pay-money and flash from generated video resources', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    window.history.replaceState({}, '', '/?renderer=webm');
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <>
          <PayMoneyEffect
            state={{ token: 1, startX: 30, startY: 212, endX: 602, endY: 31, phase: 'desk' }}
          />
          <FinalFoodFlash />
        </>,
      );
    });

    const sources = [...container.querySelectorAll('video')].map((video) => video.src);
    expect(sources.some((source) => source.includes('/BD_pay_money/start.webm'))).toBe(true);
    expect(sources.some((source) => source.includes('/BD_flash/start.webm'))).toBe(true);
    expect(container.querySelector('[data-testid="legacy-dragonbones"]')).toBeNull();

    act(() => root.unmount());
  });
});
