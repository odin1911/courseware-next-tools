import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('./components/MainScene.tsx', import.meta.url), 'utf8');
const flowLayerSource = readFileSync(
  new URL('./components/overlays/MainFlowOverlayLayer.tsx', import.meta.url),
  'utf8',
);
const modalLayerSource = readFileSync(
  new URL('./components/overlays/MainModalOverlayLayer.tsx', import.meta.url),
  'utf8',
);
const chooseFoodSource = readFileSync(
  new URL('./components/overlays/ChooseFoodOverlay.tsx', import.meta.url),
  'utf8',
);
const dayCurtainSource = readFileSync(
  new URL('./components/MainSceneParts/DayCurtain.tsx', import.meta.url),
  'utf8',
);

describe('KJG_QAP_BD_v2_2026 overlay layering', () => {
  it('Main 流程 overlay 统一由 MainFlowOverlayLayer 管理', () => {
    expect(mainSource).toContain('<MainFlowOverlayLayer');
    expect(mainSource).not.toContain('isChooseFoodVisible');
    expect(mainSource).not.toContain('dayCurtainPhase');
    expect(flowLayerSource).toContain("mainSubstate === 'countdown'");
    expect(flowLayerSource).toContain("mainSubstate === 'day-opening'");
    expect(flowLayerSource).toContain("mainSubstate === 'day-closing'");
    expect(flowLayerSource).toContain("mainSubstate === 'choose-food'");
  });

  it('Flow 遮罩覆盖舞台，legacy 内容层只定位 panel', () => {
    expect(flowLayerSource).toContain('data-main-flow-overlay-host="true"');
    expect(flowLayerSource).toContain('zIndex={10}');
    expect(flowLayerSource).toContain('pointerEvents="auto"');
    expect(flowLayerSource).toContain('<FixedStageContentFrameLayer');
    expect(flowLayerSource).toContain("background: 'rgba(7, 24, 31, 0.45)'");
    expect(flowLayerSource).not.toContain('inset:');
    expect(chooseFoodSource).toContain('data-role="choose-food-panel"');
    expect(chooseFoodSource).not.toContain("background: 'rgba(7, 24, 31, 0.45)'");
    expect(dayCurtainSource).not.toContain('FixedStageLayer');
  });

  it('Main 模态 overlay 统一位于 Scene 根 z=30', () => {
    expect(appSource).toContain('<MainModalOverlayLayer');
    expect(appSource).toContain("mainModalScene === 'pause'");
    expect(appSource).toContain("mainModalScene === 'second-confirm'");
    expect(modalLayerSource).toContain('data-main-modal-overlay-host="true"');
    expect(modalLayerSource).toContain('zIndex={30}');
    expect(modalLayerSource).toContain('pointerEvents="auto"');
    expect(modalLayerSource).toContain("mainModalScene === 'result'");
    expect(modalLayerSource).toContain("mainModalScene === 'word-list'");
  });

  it('App 不再统一切背景，scene 继续拥有私有背景', () => {
    expect(appSource).not.toContain('StageBackground');
    expect(appSource).toContain('legacyContentFrame');
  });
});
