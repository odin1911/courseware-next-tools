import { useState } from 'react';
import type { LobbyStartButtonPhase } from '@/shared/components/lobby-start-button';
import { getRasterAsset } from '../rasterAssets';
import RasterAnimationPlayer from './raster-animation/RasterAnimationPlayer';

const TITLE_ASSET = getRasterAsset('BD_title');

export interface RasterLobbyTitleProps {
  width: number;
  height: number;
  floatAnimation?: string;
  onStartPhaseChange(nextPhase: Extract<LobbyStartButtonPhase, 'enter' | 'idle'>): void;
}

export default function RasterLobbyTitle({
  width,
  height,
  floatAnimation = 'none',
  onStartPhaseChange,
}: RasterLobbyTitleProps) {
  const [floating, setFloating] = useState(false);

  return (
    <div
      data-role="raster-lobby-title"
      style={{ position: 'absolute', left: 0, top: 0, width, height, animation: floating ? floatAnimation : 'none' }}
    >
      <RasterAnimationPlayer
        manifest={TITLE_ASSET.manifest}
        files={TITLE_ASSET.files}
        action="start"
        onComplete={() => {
          setFloating(true);
          onStartPhaseChange('enter');
        }}
        onError={() => {
          setFloating(true);
          onStartPhaseChange('idle');
        }}
      />
    </div>
  );
}
