import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { getVisibleAssets, shouldShowComparisonPanel } from './spineToolConfig';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const overviewSource = readFileSync(new URL('./OverviewMode.tsx', import.meta.url), 'utf8');
const drawModeSource = readFileSync(new URL('./KjtApDrawMode.tsx', import.meta.url), 'utf8');
const shellSource = readFileSync(new URL('./SpineToolShell.tsx', import.meta.url), 'utf8');
const runtimeCardSource = readFileSync(new URL('./SpineRuntimeCard.tsx', import.meta.url), 'utf8');

describe('spine-tool Count2 mode routing', () => {
  it('mode=kjt-ap-draw 时只暴露 3 个 Draw 专项样本', () => {
    const assets = [
      { id: 'alpha', zipUrl: '/alpha.zip' },
      { id: 'shape_draw_triangle_billiards', zipUrl: '/shape_draw_triangle_billiards.zip' },
      { id: 'shape_draw_triangle_sign', zipUrl: '/shape_draw_triangle_sign.zip' },
      { id: 'shape_draw_triangle_set_square', zipUrl: '/shape_draw_triangle_set_square.zip' },
      { id: 'count2_farm', zipUrl: '/count2_farm.zip' },
      { id: 'beta', zipUrl: '/beta.zip' },
    ];

    expect(getVisibleAssets('kjt-ap-draw', assets).map((asset) => asset.id)).toEqual([
      'shape_draw_triangle_billiards',
      'shape_draw_triangle_sign',
      'shape_draw_triangle_set_square',
    ]);
  });

  it('mode=count2-farm 时只暴露 Count2 单资源，并且只有 Count2 开启双面板', () => {
    const assets = [
      { id: 'alpha', zipUrl: '/alpha.zip' },
      { id: 'count2_farm', zipUrl: '/count2_farm.zip' },
      { id: 'beta', zipUrl: '/beta.zip' },
    ];

    expect(getVisibleAssets('', assets).map((asset) => asset.id)).toEqual(['alpha', 'beta']);
    expect(getVisibleAssets('count2-farm', assets).map((asset) => asset.id)).toEqual([
      'count2_farm',
    ]);

    expect(shouldShowComparisonPanel('count2_farm')).toBe(true);
    expect(shouldShowComparisonPanel('alpha')).toBe(false);
    expect(shouldShowComparisonPanel('beta')).toBe(false);
  });

  it('App 支持 Count2 Farm URL 模式切换', () => {
    expect(appSource).toContain("import OverviewMode from './OverviewMode'");
    expect(appSource).toContain(
      'const { focusedMode, count2Url, kjtApDrawUrl, mainUrl } = getPageState();',
    );
    expect(appSource).toContain('const isCount2Mode = focusedMode === COUNT2_FARM_MODE;');
    expect(appSource).toContain('const visibleAssets = getVisibleAssets(focusedMode, spineAssets)');
    expect(appSource).toContain('<OverviewMode');
    expect(appSource).toContain('count2Url={count2Url}');
    expect(appSource).toContain('kjtApDrawUrl={kjtApDrawUrl}');
    expect(overviewSource).toContain('Count2 Farm 专项验证');
    expect(overviewSource).toContain('切到 Count2 Farm');
    expect(overviewSource).toContain('返回全部资源');
    expect(overviewSource).toContain('visibleCount={visibleAssets.length}');
    expect(overviewSource).toContain('{visibleAssets.map((asset) => (');
    expect(shellSource).toContain('动画数量：{visibleCount}');
  });

  it('App 支持 Draw 专项 URL 模式切换', () => {
    expect(appSource).toContain('const isKjtApDrawMode = focusedMode === KJT_AP_DRAW_MODE;');
    expect(appSource).toContain("'KJT_AP_DRAW_v2 Draw 专项验证'");
    expect(appSource).toContain("'返回全部资源'");
    expect(overviewSource).toContain("'切到 Draw 专项'");
  });

  it('App 把 Draw 专项分发到独立 mode 组件', () => {
    expect(appSource).toContain("import KjtApDrawMode from './KjtApDrawMode'");
    expect(appSource).toContain('<KjtApDrawMode');
    expect(appSource).toContain('visibleAssets={visibleAssets}');
    expect(appSource).toContain('mainUrl={mainUrl}');
  });

  it('App 把 overview 和运行时卡片分发到独立模块', () => {
    expect(appSource).toContain("import OverviewMode from './OverviewMode'");
    expect(appSource).toContain("import { SpineRuntimeCard } from './SpineRuntimeCard'");
    expect(appSource).toContain('<OverviewMode');
    expect(appSource).toContain('count2Url={count2Url}');
    expect(appSource).toContain('kjtApDrawUrl={kjtApDrawUrl}');
  });

  it('Overview 和 Draw mode 复用同一个 shell', () => {
    expect(overviewSource).toContain("import SpineToolShell from './SpineToolShell'");
    expect(drawModeSource).toContain("import SpineToolShell from './SpineToolShell'");
    expect(overviewSource).toContain('<SpineToolShell');
    expect(drawModeSource).toContain('<SpineToolShell');
  });

  it('App 通过 shared Spine loader 解析 zip，并把 diagnostics 留在页面层', () => {
    expect(runtimeCardSource).toContain("from '@/shared/components/spine-player/spine-zip'");
    expect(runtimeCardSource).toContain('parseSpineZipBytes');
    expect(runtimeCardSource).toContain('resolveSpineTextureEntryPath');
    expect(runtimeCardSource).toContain(
      "from '@/shared/components/spine-player/spine-asset-loader'",
    );
    expect(runtimeCardSource).toContain('loadSpineDecodedAssets');
    expect(runtimeCardSource).not.toContain('unzipSync');
    expect(runtimeCardSource).not.toContain('createObjectURL');
    expect(runtimeCardSource).not.toContain('new Image');
  });

  it('Count2 Farm 视图会切到 project spine-player 对比面板', () => {
    expect(runtimeCardSource).toContain('shouldShowComparisonPanel(asset.id)');
    expect(runtimeCardSource).toContain('comparisonGridStyle');
    expect(runtimeCardSource).toContain('SpinePlayerWebGl');
    expect(runtimeCardSource).toContain('project spine-player');
    expect(runtimeCardSource).toContain('sharedPanelPlayerStyle');
    expect(runtimeCardSource).toContain('zipUrl={asset.zipUrl}');
  });

  it('spine-tool 动画默认单次播放，点击按钮时再单次重播', () => {
    expect(runtimeCardSource).toContain(
      'context.animationState.setAnimation(0, initialAnimation, false);',
    );
    expect(runtimeCardSource).toContain(
      'playerRef.current.animationState.setAnimation(0, currentAnimation, false);',
    );
    expect(runtimeCardSource).toContain(
      'playerRef.current.animationState.setAnimation(0, name, false);',
    );
    expect(runtimeCardSource).toContain(
      'sharedPlayerRef.current?.play(currentAnimation || undefined, false);',
    );
    expect(runtimeCardSource).toContain('sharedPlayerRef.current?.play(name, false);');
    expect(runtimeCardSource).toContain('loop={false}');
  });

  it('Draw 专项卡片会显示 draw 的 mask 源图片，并明确标注用于 mask', () => {
    expect(runtimeCardSource).toContain("slot.slotName === 'draw'");
    expect(runtimeCardSource).toContain('slot.maskExport.dataUrl');
    expect(runtimeCardSource).toContain('用于 mask 的源图片');
    expect(runtimeCardSource).toContain('alt={`${slot.slotName} mask source`}');
  });
});
