import { useRef } from 'react';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';
import { BD_DRAGONBONES_ARMATURE } from '../../logic/runtime';
import { fitPlayerToViewport } from './mainSceneGeometry';

const FLASH_ZIP_URL = new URL('../../assets/skeleton/BD_flash.zip', import.meta.url).href;

export default function FinalFoodFlash() {
  const playerRef = useRef<DragonBonesHandle | null>(null);

  return (
    <DragonBonesPlayer
      ref={playerRef}
      zipUrl={FLASH_ZIP_URL}
      armature={BD_DRAGONBONES_ARMATURE}
      width={562}
      height={556}
      autoPlay
      transparentMode="premultiplied"
      style={{
        position: 'absolute',
        left: -201,
        top: -238,
      }}
      onReady={() => {
        fitPlayerToViewport(playerRef.current, 562, 556, 0);
      }}
    />
  );
}
