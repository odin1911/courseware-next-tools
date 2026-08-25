import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');
const modalLayerSource = readFileSync(
  new URL('./components/overlays/MainModalOverlayLayer.tsx', import.meta.url),
  'utf8',
);

describe('KJG_QAP_BD_v2_2026 App', () => {
  it('DEMO 启动只用 mock 参数选择内置数据，不指定视频渲染或回退逻辑', () => {
    expect(mainSource).toContain("new URLSearchParams(window.location.search).has('mock')");
    expect(mainSource).toContain("'../../shared/core/mock/KJG_QAP_BD_v2.json'");
    expect(mainSource).toContain('import.meta.url');
    expect(mainSource).not.toContain('renderer');
  });

  it('Lobby 初始音量应默认使用 0.1 以对齐 tamic', () => {
    expect(appSource).toContain('const [soundVolume, setSoundVolume] = useState(0.1);');
  });

  it('舞台壳改造后应改为接入 shared fixed-stage-shell，而不是继续保留页面私有舞台缩放函数', () => {
    expect(appSource).toContain('FixedStageShell');
    expect(appSource).toContain('useFixedStageScale');
    expect(appSource).not.toContain('function useStageScale()');
    expect(appSource).not.toContain('function getStageStyle(scale: number): CSSProperties {');
  });

  it('方案 2 下 App 不再统一渲染 StageBackground，而是把 presetKey 下发给 scene', () => {
    expect(appSource).not.toContain("import StageBackground from './components/StageBackground';");
    expect(appSource).not.toContain('background={<StageBackground');
    expect(appSource).toContain('<LobbyScene');
    expect(appSource).toContain('presetKey={stageLayout.presetKey}');
    expect(appSource).toContain('<MainScene');
  });

  it('当前规格由模板常量控制，旧 UI 通过 legacyContentFrame 收进 720 高舞台', () => {
    expect(appSource).toContain('legacyContentFrame');
    expect(appSource).not.toContain('resolveBurgerDinerStagePreset');
    expect(appSource).toContain('burgerDinerStageLayout');
  });

  it('Main 模态弹窗应统一挂在 scene 根舞台层', () => {
    const overlayHostIndex = modalLayerSource.indexOf('data-main-modal-overlay-host="true"');
    const pauseOverlayIndex = modalLayerSource.indexOf('<PauseOverlay', overlayHostIndex);
    const resultOverlayIndex = modalLayerSource.indexOf('<ResultOverlay', overlayHostIndex);
    const wordListOverlayIndex = modalLayerSource.indexOf('<WordListOverlay', overlayHostIndex);

    expect(overlayHostIndex).toBeGreaterThanOrEqual(0);
    expect(pauseOverlayIndex).toBeGreaterThan(overlayHostIndex);
    expect(resultOverlayIndex).toBeGreaterThan(overlayHostIndex);
    expect(wordListOverlayIndex).toBeGreaterThan(overlayHostIndex);
    expect(appSource).toContain('<MainModalOverlayLayer');
    expect(modalLayerSource).not.toContain('data-stage-overlay-mask="true"');
    expect(appSource).not.toContain('contentFrame={stageLayout.legacyContentFrame}');
    expect(modalLayerSource).toContain('FixedStageLayer');
    expect(modalLayerSource).toContain('pointerEvents="auto"');
    expect(modalLayerSource).toContain('zIndex={30}');
  });

  it('word-list 不应直接复用补足到 10 题的 gameplay wordBanks', () => {
    expect(appSource).not.toContain(
      '<WordListOverlay entries={wordBanks} onHome={returnToLobby} onReset={resetToNewRun} />',
    );
  });
});
