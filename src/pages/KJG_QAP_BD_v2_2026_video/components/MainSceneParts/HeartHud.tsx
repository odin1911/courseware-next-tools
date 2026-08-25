import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import HeartLivesStrip, {
  HEART_LIFE_GAP,
  HEART_LIFE_HEIGHT,
  HEART_LIFE_WIDTH,
  HeartLifeSprite,
  getHeartLifeOffset,
} from '@/shared/components/heart-lives-strip';
import { getRasterAsset } from '../../rasterAssets';
import RasterAnimationPlayer from '../raster-animation/RasterAnimationPlayer';

const HEART_ASSET = getRasterAsset('heart');
const HUD_LEFT = 35;
const HUD_TOP = 35;
const CENTER_X = 512;
const CENTER_Y = 384;
const FLY_MS = 500;
const BREAK_MS = 500;
const RETURN_MS = 500;
const BONE_WIDTH = 323;
const BONE_HEIGHT = 272;

export interface HeartHudProps {
  hearts: number;
  maxHearts: number;
  isWrongFeedback: boolean;
  soundVolume: number;
  heartBreakAudioUrl?: string | null;
}

type HeartPhase = 'idle' | 'flying' | 'breaking' | 'returning';

export default function HeartHud({
  hearts,
  maxHearts,
  isWrongFeedback,
  soundVolume,
  heartBreakAudioUrl,
}: HeartHudProps) {
  const [phase, setPhase] = useState<HeartPhase>('idle');
  const [heartIndex, setHeartIndex] = useState(0);
  const previousWrongRef = useRef(false);
  const flyingRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = heartBreakAudioUrl ? new Audio(heartBreakAudioUrl) : null;
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [heartBreakAudioUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(soundVolume, 1));
  }, [soundVolume]);

  useEffect(() => {
    const justEntered = isWrongFeedback && !previousWrongRef.current;
    previousWrongRef.current = isWrongFeedback;
    if (!justEntered || hearts < 0 || hearts >= maxHearts) return;

    timersRef.current.forEach(window.clearTimeout);
    setHeartIndex(hearts);
    setPhase('flying');
    timersRef.current = [
      window.setTimeout(() => {
        setPhase('breaking');
        void audioRef.current?.play().catch(() => undefined);
      }, FLY_MS),
      window.setTimeout(() => setPhase('returning'), FLY_MS + BREAK_MS),
      window.setTimeout(() => setPhase('idle'), FLY_MS + BREAK_MS + RETURN_MS),
    ];
  }, [hearts, isWrongFeedback, maxHearts]);

  useEffect(
    () => () => {
      timersRef.current.forEach(window.clearTimeout);
    },
    [],
  );

  useLayoutEffect(() => {
    if (phase !== 'flying' || !flyingRef.current) return;
    const heartCenterX = getHeartLifeOffset(heartIndex) + HEART_LIFE_WIDTH / 2;
    const heartCenterY = HEART_LIFE_HEIGHT / 2;
    const element = flyingRef.current;
    element.style.transition = 'none';
    element.style.transform = 'translate(0px, 0px) scale(1, 1)';
    void element.getBoundingClientRect();
    element.style.transition = `transform ${FLY_MS}ms ease-in`;
    element.style.transform = `translate(${CENTER_X - HUD_LEFT - heartCenterX}px, ${CENTER_Y - HUD_TOP - heartCenterY}px) scale(${BONE_WIDTH / HEART_LIFE_WIDTH}, ${BONE_HEIGHT / HEART_LIFE_HEIGHT})`;
  }, [heartIndex, phase]);

  const targetX = HUD_LEFT + getHeartLifeOffset(heartIndex) + HEART_LIFE_WIDTH / 2;
  const targetY = HUD_TOP + HEART_LIFE_HEIGHT / 2;
  const isBreaking = phase === 'breaking' || phase === 'returning';
  const stripWidth = HEART_LIFE_WIDTH * maxHearts + HEART_LIFE_GAP * Math.max(0, maxHearts - 1);

  return (
    <div
      aria-label="heart-hud"
      data-role="heart-hud"
      style={{ position: 'absolute', left: 0, top: 0, width: 1024, height: 768, pointerEvents: 'none' }}
    >
      <div
        data-testid="bd-heart-container"
        data-anim-phase={phase}
        data-anim-heart-index={heartIndex}
        style={{ position: 'absolute', left: HUD_LEFT, top: HUD_TOP, width: stripWidth, height: HEART_LIFE_HEIGHT }}
      >
        <HeartLivesStrip
          remainingLives={hearts}
          totalLives={maxHearts}
          hiddenIndexes={phase !== 'idle' ? [heartIndex] : undefined}
        />

        {phase === 'flying' ? (
          <div
            ref={flyingRef}
            style={{
              position: 'absolute',
              left: getHeartLifeOffset(heartIndex),
              top: 0,
              width: HEART_LIFE_WIDTH,
              height: HEART_LIFE_HEIGHT,
              transformOrigin: 'center center',
              zIndex: 10,
            }}
          >
            <HeartLifeSprite />
          </div>
        ) : null}

        {isBreaking ? (
          <div
            style={{
              position: 'absolute',
              left: -HUD_LEFT,
              top: -HUD_TOP,
              width: 1024,
              height: 768,
              zIndex: 10,
              transformOrigin: `${CENTER_X}px ${CENTER_Y}px`,
              transform:
                phase === 'returning'
                  ? `translate(${targetX - CENTER_X}px, ${targetY - CENTER_Y}px) scale(${HEART_LIFE_WIDTH / BONE_WIDTH}, ${HEART_LIFE_HEIGHT / BONE_HEIGHT})`
                  : 'none',
              transition: phase === 'returning' ? `transform ${RETURN_MS}ms linear` : 'none',
            }}
          >
            <RasterAnimationPlayer
              manifest={HEART_ASSET.manifest}
              files={HEART_ASSET.files}
              action="start"
              origin={{ x: CENTER_X, y: CENTER_Y }}
              restartKey={heartIndex}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
