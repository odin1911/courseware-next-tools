import { describe, expect, it } from 'vitest';
import { BURGER_DINER_STAGE_PRESET, burgerDinerStageLayout } from './stage-layout';

describe('KJG_QAP_BD_v2_2026 stage layout', () => {
  it('用模板常量声明当前开发态舞台规格，不通过 URL 参数运行时切换', () => {
    expect(BURGER_DINER_STAGE_PRESET).toBe('1280x720');
    expect(burgerDinerStageLayout).toEqual({
      presetKey: BURGER_DINER_STAGE_PRESET,
      legacyContentFrame: {
        width: 1024,
        height: 768,
        fitMode: 'contain',
      },
    });
  });
});
