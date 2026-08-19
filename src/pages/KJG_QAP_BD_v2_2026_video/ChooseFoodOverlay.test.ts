import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const chooseFoodOverlaySource = readFileSync(
  new URL('./components/overlays/ChooseFoodOverlay.tsx', import.meta.url),
  'utf8',
);

describe('KJG_QAP_BD_v2_2026 ChooseFoodOverlay', () => {
  it('choose-food 不应额外渲染白色圆框资源', () => {
    expect(chooseFoodOverlaySource).not.toContain('KJG_QAP_BD_v2_circle_img_white');
  });
});
