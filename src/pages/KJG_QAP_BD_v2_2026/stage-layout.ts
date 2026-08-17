import type { FixedStageContentFrame } from '@/shared/components/fixed-stage-shell';
import type { FixedStagePresetKey } from '@/shared/components/fixed-stage-shell/presets';

export interface BurgerDinerStageLayout {
  presetKey: FixedStagePresetKey;
  legacyContentFrame: FixedStageContentFrame;
}

export const BURGER_DINER_STAGE_PRESET: FixedStagePresetKey = '1280x720';

export const burgerDinerStageLayout: BurgerDinerStageLayout = {
  presetKey: BURGER_DINER_STAGE_PRESET,
  legacyContentFrame: {
    width: 1024,
    height: 768,
    fitMode: 'contain',
  },
};
