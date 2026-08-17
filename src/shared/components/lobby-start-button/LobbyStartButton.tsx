import AtlasSprite from '@/shared/components/atlas-sprite';
import type { TextureAtlasData } from '@/shared/core/atlas';

export type LobbyStartButtonPhase = 'hidden' | 'enter' | 'idle';

interface LobbyStartButtonProps {
  phase: LobbyStartButtonPhase;
  onClick(): void;
  onEnterComplete?(): void;
  disabled?: boolean;
  atlasUrl: string;
  atlasData: TextureAtlasData;
  frameName: string;
  displayScale?: number;
  atlasSize?: { width: number; height: number };
  left: number;
  top: number;
  width: number;
  height: number;
  enterAnimation?: string;
  enterAnimationName?: string;
  idleAnimation?: string;
  transformOrigin?: string;
  dataRole?: string;
  testId?: string;
  ariaLabel?: string;
}

export default function LobbyStartButton({
  phase,
  onClick,
  onEnterComplete,
  disabled = false,
  atlasUrl,
  atlasData,
  frameName,
  displayScale,
  atlasSize,
  left,
  top,
  width,
  height,
  enterAnimation,
  enterAnimationName,
  idleAnimation,
  transformOrigin,
  dataRole = 'start',
  testId = 'lobby-start-button',
  ariaLabel = '开始游戏',
}: LobbyStartButtonProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        opacity: phase === 'hidden' ? 0 : 1,
        pointerEvents: phase === 'hidden' ? 'none' : 'auto',
      }}
    >
      <button
        type="button"
        data-role={dataRole}
        data-testid={testId}
        aria-label={ariaLabel}
        onClick={onClick}
        disabled={phase === 'hidden' || disabled}
        onAnimationEnd={(event) => {
          if (
            phase === 'enter' &&
            (!enterAnimationName || event.animationName === enterAnimationName)
          ) {
            onEnterComplete?.();
          }
        }}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width,
          height,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          transformOrigin,
          animation:
            phase === 'enter'
              ? (enterAnimation ?? 'none')
              : phase === 'idle'
                ? (idleAnimation ?? 'none')
                : 'none',
        }}
      >
        <AtlasSprite
          atlasUrl={atlasUrl}
          atlasData={atlasData}
          frameName={frameName}
          displayScale={displayScale}
          atlasSize={atlasSize}
        />
      </button>
    </div>
  );
}
