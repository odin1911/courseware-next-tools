// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('@/shared/components/dragonbones-player', () => ({
  default: ({
    fitMode,
    showDebugBounds = false,
    style,
  }: {
    fitMode?: string;
    showDebugBounds?: boolean;
    style?: { width?: string | number; height?: string | number };
  }) => (
    <div
      aria-hidden="true"
      data-debug-bounds={showDebugBounds}
      data-fit-mode={fitMode}
      data-player-width={style?.width}
      data-player-height={style?.height}
    />
  ),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  window.history.replaceState({}, '', '/animations/');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function renderApp() {
  act(() => root.render(<App />));
}

describe('animations page', () => {
  it('列表展示目录中的动画并生成详情入口', () => {
    renderApp();

    expect(container.querySelector('h1')?.textContent).toBe('DragonBones 动画库');
    expect(container.querySelector('a[href="?asset=BD_laki.zip"]')?.textContent).toContain('laki');
    expect(container.querySelector('a[href="?asset=heart.zip"]')?.textContent).toContain('heart');
  });

  it('参考框默认开启并可统一关闭所有预览调试层', () => {
    renderApp();

    const toggle = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(toggle?.checked).toBe(true);
    expect(container.querySelectorAll('[data-debug-bounds="true"]')).toHaveLength(15);
    expect(container.querySelectorAll('[data-player-width="100%"]')).toHaveLength(15);
    expect(container.querySelectorAll('[data-player-height="auto"]')).toHaveLength(15);
    expect(container.querySelectorAll('[data-fit-mode="animation-bounds"]')).toHaveLength(15);

    act(() => toggle?.click());

    expect(toggle?.checked).toBe(false);
    expect(container.querySelectorAll('[data-debug-bounds="false"]')).toHaveLength(15);
  });

  it('asset 参数打开单个动画详情', () => {
    window.history.replaceState({}, '', '/animations/?asset=heart.zip');
    renderApp();

    expect(container.querySelector('h1')?.textContent).toBe('heart');
    expect(container.querySelector('a[href="./"]')?.textContent).toContain('返回动画列表');
    expect(container.querySelector('a[href="?asset=BD_laki.zip"]')).toBeNull();
    expect(container.querySelector('[data-fit-mode="animation-bounds"]')).not.toBeNull();
  });

  it('未知 asset 参数给出可返回的错误状态', () => {
    window.history.replaceState({}, '', '/animations/?asset=missing.zip');
    renderApp();

    expect(container.textContent).toContain('没有找到 missing.zip');
    expect(container.querySelector('a[href="./"]')?.textContent).toContain('返回动画列表');
  });
});
