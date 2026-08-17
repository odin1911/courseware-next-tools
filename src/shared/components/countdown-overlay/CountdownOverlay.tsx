import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createAudioManager } from '@/shared/components/audio-manager';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';

const COUNTDOWN_ZIP_URL = new URL('../../assets/skeleton/count.zip', import.meta.url).href;
const COUNTDOWN_AUDIO_URL = new URL('../../assets/audios/3-2-1-go.mp3', import.meta.url).href;
const COUNTDOWN_ARMATURE = 'armatures/skeleton_movie_1';
const COUNTDOWN_STAGE_WIDTH = 1024;
const COUNTDOWN_STAGE_HEIGHT = 768;
const COUNTDOWN_HOST_LEFT = 316;
const COUNTDOWN_HOST_TOP = 162;
const COUNTDOWN_ERROR_FALLBACK_MS = 2100;

export interface CountdownOverlayProps {
  countdownValue: number;
  onComplete?: () => void;
  showBackdrop?: boolean;
}

export default function CountdownOverlay({
  countdownValue,
  onComplete,
  showBackdrop = true,
}: CountdownOverlayProps) {
  const countdownLabel = countdownValue <= 1 ? 'GO' : String(countdownValue - 1);
  const playerRef = useRef<DragonBonesHandle | null>(null);
  const audioManagerRef = useRef(createAudioManager());
  const completionTimerRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [hasPlayerError, setHasPlayerError] = useState(false);

  const triggerComplete = useCallback(() => {
    if (hasCompletedRef.current) {
      return;
    }

    hasCompletedRef.current = true;
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    const audioManager = audioManagerRef.current;

    audioManager.play({
      src: COUNTDOWN_AUDIO_URL,
      loop: false,
      volume: 1,
    });

    return () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
      }
      audioManager.destroy();
    };
  }, []);

  useLayoutEffect(() => {
    if (!isPlayerReady || hasPlayerError) {
      return;
    }

    const display = playerRef.current?.getDisplay() as { x?: number; y?: number } | null;

    if (display) {
      display.x = COUNTDOWN_HOST_LEFT;
      display.y = COUNTDOWN_HOST_TOP;
    }

    playerRef.current?.play(undefined, false);
  }, [hasPlayerError, isPlayerReady]);

  return (
    <div
      data-testid="countdown-overlay"
      data-countdown-label={countdownLabel}
      data-countdown-player-ready={isPlayerReady ? 'true' : 'false'}
      data-countdown-player-error={hasPlayerError ? 'true' : 'false'}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        overflow: 'hidden',
        pointerEvents: 'auto',
        animation: 'ddvkOverlayFadeIn 180ms ease-out',
      }}
    >
      {showBackdrop && (
        <div
          data-testid="countdown-backdrop"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: COUNTDOWN_STAGE_WIDTH,
          height: COUNTDOWN_STAGE_HEIGHT,
          transform: 'translate(-50%, -50%)',
          visibility: isPlayerReady && !hasPlayerError ? 'visible' : 'hidden',
        }}
      >
        <DragonBonesPlayer
          ref={playerRef}
          zipUrl={COUNTDOWN_ZIP_URL}
          armature={COUNTDOWN_ARMATURE}
          width={COUNTDOWN_STAGE_WIDTH}
          height={COUNTDOWN_STAGE_HEIGHT}
          autoPlay={false}
          onComplete={() => {
            triggerComplete();
          }}
          onReady={() => {
            setIsPlayerReady(true);
            setHasPlayerError(false);
          }}
          onError={() => {
            setHasPlayerError(true);
            setIsPlayerReady(false);
            if (completionTimerRef.current !== null) {
              return;
            }

            completionTimerRef.current = window.setTimeout(() => {
              completionTimerRef.current = null;
              triggerComplete();
            }, COUNTDOWN_ERROR_FALLBACK_MS);
          }}
          style={{ width: COUNTDOWN_STAGE_WIDTH, height: COUNTDOWN_STAGE_HEIGHT }}
        />
      </div>
    </div>
  );
}
