import { useRef, useState } from 'react';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';
import type { LobbyStartButtonPhase } from '@/shared/components/lobby-start-button';

interface LobbyTitlePlayerProps {
  zipUrl: string;
  armature: string;
  width: number;
  height: number;
  displayScale?: number;
  startAnimationName?: string;
  floatAnimation?: string;
  onStartPhaseChange(nextPhase: Extract<LobbyStartButtonPhase, 'enter' | 'idle'>): void;
}

export default function LobbyTitlePlayer({
  zipUrl,
  armature,
  width,
  height,
  displayScale,
  startAnimationName = 'start',
  floatAnimation = 'none',
  onStartPhaseChange,
}: LobbyTitlePlayerProps) {
  const playerRef = useRef<DragonBonesHandle | null>(null);
  const [titleFloating, setTitleFloating] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height,
        animation: titleFloating ? floatAnimation : 'none',
      }}
    >
      <DragonBonesPlayer
        ref={playerRef}
        zipUrl={zipUrl}
        armature={armature}
        width={width}
        height={height}
        displayScale={displayScale}
        autoPlay={false}
        onError={() => {
          setTitleFloating(true);
          onStartPhaseChange('idle');
        }}
        onReady={() => {
          playerRef.current?.play(startAnimationName, false);
        }}
        onComplete={(animationName) => {
          if (animationName !== startAnimationName) {
            return;
          }

          setTitleFloating(true);
          onStartPhaseChange('enter');
        }}
      />
    </div>
  );
}
