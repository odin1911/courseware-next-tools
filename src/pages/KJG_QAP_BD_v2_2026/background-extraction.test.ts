import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const lobbySource = readFileSync(new URL('./components/LobbyScene.tsx', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('./components/MainScene.tsx', import.meta.url), 'utf8');
const stageBackgroundsSource = readFileSync(
  new URL('./stage-backgrounds.tsx', import.meta.url),
  'utf8',
);

describe('KJG_QAP_BD_v2_2026 background extraction', () => {
  it('背景不再由 App 统一切换，也不把 1280 资源选择散落在 scene 中', () => {
    expect(appSource).not.toContain('StageBackground');
    expect(lobbySource).toContain('BurgerDinerStageBackgroundImage');
    expect(mainSource).toContain('BurgerDinerStageBackgroundImage');
    expect(lobbySource).not.toContain('FixedStagePresetSwitch');
    expect(mainSource).not.toContain('FixedStagePresetSwitch');
    expect(lobbySource).not.toContain('BD_lobby_bg.png');
    expect(lobbySource).not.toContain('BD_lobby_bg_1280.png');
    expect(mainSource).not.toContain('BD_main_bg_0.png');
    expect(mainSource).not.toContain('BD_main_bg_1.png');
    expect(mainSource).not.toContain('BD_main_bg_0_1280.png');
    expect(mainSource).not.toContain('BD_main_bg_1_1280.png');
  });

  it('只集中记录 1280 背景资源', () => {
    expect(stageBackgroundsSource).toContain('BD_lobby_bg_1280.png');
    expect(stageBackgroundsSource).toContain('BD_main_bg_0_1280.png');
    expect(stageBackgroundsSource).toContain('BD_main_bg_1_1280.png');
    expect(stageBackgroundsSource).toContain("'1280x720'");
  });
});
