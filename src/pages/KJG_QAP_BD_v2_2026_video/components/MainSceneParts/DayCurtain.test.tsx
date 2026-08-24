// @vitest-environment jsdom

import { act, forwardRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import DayCurtain from './DayCurtain';

vi.mock('@/shared/components/dragonbones-player', () => ({
  default: forwardRef(() => <div data-testid="legacy-dragonbones" />),
}));

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DayCurtain raster resources', () => {
  test('selects the generated open and close animations by phase', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.useFakeTimers();
    window.history.replaceState({}, '', '/?renderer=webm');
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(<DayCurtain phase="opening" />));
    expect(container.querySelector('video')?.src).toContain('/BD_open/start.webm');
    expect(container.querySelector('[data-testid="legacy-dragonbones"]')).toBeNull();

    act(() => root.render(<DayCurtain phase="closing" />));
    expect(container.querySelector('video')?.src).toContain('/BD_close/start.webm');

    act(() => root.unmount());
  });
});
