import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mainSceneSource = readFileSync(
  new URL('./components/MainScene.tsx', import.meta.url),
  'utf8',
);
const stageBackgroundsSource = readFileSync(
  new URL('./stage-backgrounds.tsx', import.meta.url),
  'utf8',
);
const flowLayerSource = readFileSync(
  new URL('./components/overlays/MainFlowOverlayLayer.tsx', import.meta.url),
  'utf8',
);
const hintVisualSource = readFileSync(
  new URL('./components/MainSceneParts/HintVisual.tsx', import.meta.url),
  'utf8',
);

describe('KJG_QAP_BD_v2_2026 MainScene', () => {
  it('主场景上半背景应作为 scene 级中间层挂载，避免被 1024 UI 容器裁切', () => {
    expect(mainSceneSource).toContain('FixedStageContentFrameLayer');
    expect(mainSceneSource).toContain('FixedStageLayer');
    expect(mainSceneSource).toContain('zIndex={1}');
    expect(mainSceneSource).toContain('data-stage-midground-host="true"');
    expect(mainSceneSource).toContain('zIndex={2}');
    expect(mainSceneSource).toContain('zIndex={3}');
    expect(mainSceneSource).toContain('backgroundKey="mainTop"');
    expect(stageBackgroundsSource).toContain("assetKey: 'bd-main-bg-top-1280'");
    expect(mainSceneSource).not.toContain('contentFrame={contentFrame}');
  });

  it('倒计时遮罩应挂在 scene 级容器中，由自身撑满当前舞台', () => {
    const upperFrameCloseIndex = mainSceneSource.lastIndexOf('</FixedStageContentFrameLayer>');
    const flowLayerIndex = mainSceneSource.indexOf('<MainFlowOverlayLayer');

    expect(flowLayerIndex).toBeGreaterThan(upperFrameCloseIndex);
    expect(flowLayerSource).toContain('data-overlay="countdown"');
    expect(flowLayerSource).toContain('zIndex={10}');
    expect(mainSceneSource).not.toContain(
      'width: 1024,\n                height: 768,\n                zIndex: 10',
    );
  });

  it('答案提交反馈期间仍保留底部挖空槽位，只清空槽位字母', () => {
    expect(mainSceneSource).toContain('<LetterSlots');
    expect(mainSceneSource).toContain(
      "letters={answerFeedback ? selectedLetters.map(() => '') : selectedLetters}",
    );
    expect(mainSceneSource).not.toContain(
      '!answerFeedback ? <LetterSlots letters={selectedLetters} /> : null',
    );
  });

  it('marc 图片提示应显式适配提示容器', () => {
    expect(hintVisualSource).toContain("fitSize={animationType === 'dragonbones'}");
  });
});
