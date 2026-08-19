import type { CSSProperties } from 'react';
import type { FixedStagePresetKey } from '@/shared/components/fixed-stage-shell';

const LOBBY_BG_1280_URL = new URL('./assets/textures/BD_lobby_bg_1280.png', import.meta.url).href;
const MAIN_BG_BOTTOM_1280_URL = new URL('./assets/textures/BD_main_bg_0_1280.png', import.meta.url)
  .href;
const MAIN_BG_TOP_1280_URL = new URL('./assets/textures/BD_main_bg_1_1280.png', import.meta.url)
  .href;

export type BurgerDinerStageBackgroundKey = 'lobby' | 'mainBottom' | 'mainTop';

interface BurgerDinerStageBackgroundAsset {
  assetKey: string;
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  midground?: boolean;
}

const burgerDinerStageBackgrounds: Record<
  BurgerDinerStageBackgroundKey,
  Record<FixedStagePresetKey, BurgerDinerStageBackgroundAsset>
> = {
  lobby: {
    '1280x720': {
      assetKey: 'bd-lobby-bg-1280',
      src: LOBBY_BG_1280_URL,
      left: 0,
      top: 0,
      width: 1280,
      height: 720,
    },
  },
  mainBottom: {
    '1280x720': {
      assetKey: 'bd-main-bg-bottom-1280',
      src: MAIN_BG_BOTTOM_1280_URL,
      left: 0,
      top: 0,
      width: 1280,
      height: 244,
    },
  },
  mainTop: {
    '1280x720': {
      assetKey: 'bd-main-bg-top-1280',
      src: MAIN_BG_TOP_1280_URL,
      left: 0,
      top: 209,
      width: 1280,
      height: 511,
      midground: true,
    },
  },
};

export function getBurgerDinerStageBackground(
  presetKey: FixedStagePresetKey,
  backgroundKey: BurgerDinerStageBackgroundKey,
) {
  return burgerDinerStageBackgrounds[backgroundKey][presetKey];
}

export function BurgerDinerStageBackgroundImage({
  presetKey,
  backgroundKey,
}: {
  presetKey: FixedStagePresetKey;
  backgroundKey: BurgerDinerStageBackgroundKey;
}) {
  const asset = getBurgerDinerStageBackground(presetKey, backgroundKey);
  const style: CSSProperties = {
    position: 'absolute',
    left: asset.left,
    top: asset.top,
    width: asset.width,
    height: asset.height,
  };

  return (
    <img
      data-stage-background-layer="true"
      data-stage-midground-layer={asset.midground ? 'true' : undefined}
      data-asset-key={asset.assetKey}
      src={asset.src}
      alt=""
      aria-hidden="true"
      style={style}
    />
  );
}
