import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioManager } from '@/shared/components/audio-manager';
import { countRasterAsset } from '../../rasterAssets';
import RasterAnimationPlayer from '../raster-animation/RasterAnimationPlayer';

const COUNTDOWN_AUDIO_URL = new URL(
  '../../../../shared/assets/audios/3-2-1-go.mp3',
  import.meta.url,
).href;
const COUNTDOWN_STAGE_WIDTH = 1024;
const COUNTDOWN_STAGE_HEIGHT = 768;
const COUNTDOWN_ERROR_FALLBACK_MS = 2100;

export interface RasterCountdownOverlayProps {
  countdownValue: number;
  onComplete?: () => void;
  showBackdrop?: boolean;
}

export default function RasterCountdownOverlay({
  countdownValue,
  onComplete,
  showBackdrop = true,
}: RasterCountdownOverlayProps) {
  const countdownLabel = countdownValue <= 1 ? 'GO' : String(countdownValue - 1);
  const audioManagerRef = useRef(createAudioManager());
  const completionTimerRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const triggerComplete = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    const audioManager = audioManagerRef.current;
    audioManager.play({ src: COUNTDOWN_AUDIO_URL, loop: false, volume: 1 });

    return () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
      }
      audioManager.destroy();
    };
  }, []);

  return (
    <div
      data-testid="countdown-overlay"
      data-countdown-label={countdownLabel}
      data-countdown-player-ready={status === 'ready' ? 'true' : 'false'}
      data-countdown-player-error={status === 'error' ? 'true' : 'false'}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        overflow: 'hidden',
        pointerEvents: 'auto',
        animation: 'ddvkOverlayFadeIn 180ms ease-out',
      }}
    >
      {showBackdrop && (
        <div
          data-testid="countdown-backdrop"
          style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.5)' }}
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
          visibility: status === 'error' ? 'hidden' : 'visible',
        }}
      >
        <RasterAnimationPlayer
          manifest={countRasterAsset.manifest}
          files={countRasterAsset.files}
          action="start"
          onReady={() => setStatus('ready')}
          onComplete={triggerComplete}
          onError={() => {
            setStatus('error');
            if (completionTimerRef.current !== null) return;
            completionTimerRef.current = window.setTimeout(() => {
              completionTimerRef.current = null;
              triggerComplete();
            }, COUNTDOWN_ERROR_FALLBACK_MS);
          }}
        />
      </div>
    </div>
  );
}
