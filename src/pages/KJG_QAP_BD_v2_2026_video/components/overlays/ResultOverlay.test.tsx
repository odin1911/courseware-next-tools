// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ResultOverlay from './ResultOverlay';

vi.mock('@/shared/components/audio-manager', () => ({
  createAudioManager: () => ({ play: vi.fn(), stop: vi.fn(), destroy: vi.fn() }),
}));

vi.mock('@/shared/components/result-chain-overlays', () => ({
  ResultOverlay: () => <div data-testid="legacy-result-overlay" />,
}));

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ResultOverlay raster resources', () => {
  test('uses generated success and failure animations', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    window.history.replaceState({}, '', '/?renderer=webm');
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(<ResultOverlay result="success" onConfirm={() => {}} />));
    expect(container.querySelector('video')?.src).toContain('/BD_mission_successed/start.webm');

    act(() => root.render(<ResultOverlay result="fail" onConfirm={() => {}} />));
    expect(container.querySelector('video')?.src).toContain('/BD_mission_failed/start.webm');
    expect(container.querySelector('[data-testid="legacy-result-overlay"]')).toBeNull();

    act(() => root.unmount());
  });
});
