// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function renderApp(userAgent: string) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent });
  const App = await import('./App').then((module) => module.default).catch(() => null);
  expect(App).not.toBeNull();
  if (!App) return;

  await act(async () => root.render(<App />));
}

describe('video animation debug page', () => {
  test.each([
    ['Chrome', 'Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36', 'video/webm; codecs="vp9"'],
    ['Safari', 'Mozilla/5.0 Version/18.0 Safari/605.1.15', 'video/quicktime; codecs="hvc1"'],
  ])('%s lists every animation with both formats in browser-preferred order', async (_, ua, firstType) => {
    await renderApp(ua);

    const videos = [...container.querySelectorAll('video')];
    expect(videos).toHaveLength(49);
    for (const video of videos) {
      const sources = [...video.querySelectorAll('source')];
      expect(sources).toHaveLength(2);
      expect(sources[0].type).toBe(firstType);
      expect(new Set(sources.map((source) => source.type))).toEqual(
        new Set(['video/webm; codecs="vp9"', 'video/quicktime; codecs="hvc1"']),
      );
    }
  });

  test('reports the resource type actually selected by the browser', async () => {
    await renderApp('Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36');
    const video = container.querySelector('video');
    if (!video) throw new Error('video was not rendered');
    Object.defineProperty(video, 'currentSrc', {
      configurable: true,
      value: 'http://localhost/assets/wait.webm?cache=1',
    });

    act(() => video.dispatchEvent(new Event('loadedmetadata')));

    const card = video.closest('[data-video-card]');
    expect(card?.getAttribute('data-selected-format')).toBe('webm');
    expect(card?.textContent).toContain('实际使用：WebM');
    expect(card?.textContent).toContain('wait.webm?cache=1');
  });
});
