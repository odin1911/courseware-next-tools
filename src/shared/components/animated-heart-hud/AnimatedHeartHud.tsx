import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';
import HeartLivesStrip, {
  HEART_LIFE_GAP,
  HEART_LIFE_HEIGHT,
  HEART_LIFE_WIDTH,
  HeartLifeSprite,
  getHeartLifeOffset,
} from '@/shared/components/heart-lives-strip';

const DEFAULT_HEART_ZIP_URL = new URL('../../assets/skeleton/heart.zip', import.meta.url).href;
const DEFAULT_HEART_BREAK_URL = new URL('../../assets/audios/heart_break.mp3', import.meta.url)
  .href;
const DEFAULT_HEART_ARMATURE = 'armatures/skeleton_movie_1';
const DEFAULT_STAGE_WIDTH = 1024;
const DEFAULT_STAGE_HEIGHT = 768;
const DEFAULT_CENTER_X = 512;
const DEFAULT_CENTER_Y = 384;
const DEFAULT_BONE_W = 323;
const DEFAULT_BONE_H = 272;

type HeartDisplayLike = {
  x?: number;
  y?: number;
  scale?: { x?: number; y?: number; set?: (value: number) => void };
};

export type AnimatedHeartHudPhase = 'idle' | 'flying' | 'breaking' | 'returning';

export interface AnimatedHeartHudProps {
  remainingLives: number;
  totalLives?: number;
  isWrongFeedback: boolean;
  soundVolume: number;
  hudLeft: number;
  hudTop: number;
  containerClassName?: string;
  containerTestId?: string;
  livesStripTestId?: string;
  heartZipUrl?: string;
  heartBreakAudioUrl?: string | null;
  heartArmature?: string;
  stageWidth?: number;
  stageHeight?: number;
  centerX?: number;
  centerY?: number;
  boneWidth?: number;
  boneHeight?: number;
  timings?: {
    flyMs?: number;
    breakMs?: number;
    returnMs?: number;
  };
  onAnimationComplete?: () => void;
}

export default function AnimatedHeartHud({
  remainingLives,
  totalLives = 3,
  isWrongFeedback,
  soundVolume,
  hudLeft,
  hudTop,
  containerClassName,
  containerTestId,
  livesStripTestId,
  heartZipUrl = DEFAULT_HEART_ZIP_URL,
  heartBreakAudioUrl = DEFAULT_HEART_BREAK_URL,
  heartArmature = DEFAULT_HEART_ARMATURE,
  stageWidth = DEFAULT_STAGE_WIDTH,
  stageHeight = DEFAULT_STAGE_HEIGHT,
  centerX = DEFAULT_CENTER_X,
  centerY = DEFAULT_CENTER_Y,
  boneWidth = DEFAULT_BONE_W,
  boneHeight = DEFAULT_BONE_H,
  timings,
  onAnimationComplete,
}: AnimatedHeartHudProps) {
  const flyMs = timings?.flyMs ?? 500;
  const breakMs = timings?.breakMs ?? 500;
  const returnMs = timings?.returnMs ?? 500;
  const [animPhase, setAnimPhase] = useState<AnimatedHeartHudPhase>('idle');
  const [animHeartIdx, setAnimHeartIdx] = useState(0);
  const flyDivRef = useRef<HTMLDivElement | null>(null);
  const heartPlayerRef = useRef<DragonBonesHandle | null>(null);
  const heartBreakAudioRef = useRef<HTMLAudioElement | null>(null);
  const prevWrongFeedbackRef = useRef(false);
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  const phaseTimersRef = useRef<number[]>([]);
  const flyBackRafRef = useRef<number>(0);

  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    if (!heartBreakAudioUrl) {
      heartBreakAudioRef.current = null;
      return undefined;
    }

    heartBreakAudioRef.current = new Audio(heartBreakAudioUrl);

    return () => {
      phaseTimersRef.current.forEach(window.clearTimeout);
      cancelAnimationFrame(flyBackRafRef.current);
      heartBreakAudioRef.current?.pause();
      heartBreakAudioRef.current = null;
    };
  }, [heartBreakAudioUrl]);

  useEffect(() => {
    if (heartBreakAudioRef.current) {
      heartBreakAudioRef.current.volume = Math.max(0, Math.min(soundVolume, 1));
    }
  }, [soundVolume]);

  useEffect(() => {
    const justEntered = isWrongFeedback && !prevWrongFeedbackRef.current;
    prevWrongFeedbackRef.current = isWrongFeedback;

    if (!justEntered) {
      return;
    }

    const heartIdx = remainingLives;
    if (heartIdx < 0 || heartIdx >= totalLives) {
      return;
    }

    phaseTimersRef.current.forEach(window.clearTimeout);
    cancelAnimationFrame(flyBackRafRef.current);
    phaseTimersRef.current = [];

    setAnimHeartIdx(heartIdx);
    setAnimPhase('flying');

    const enterBreakingTimer = window.setTimeout(() => {
      setAnimPhase('breaking');
      heartBreakAudioRef.current?.play().catch(() => undefined);
      heartPlayerRef.current?.play('start', false);
    }, flyMs);

    const enterReturningTimer = window.setTimeout(() => {
      setAnimPhase('returning');

      const endX = hudLeft + getHeartLifeOffset(heartIdx) + HEART_LIFE_WIDTH / 2;
      const endY = hudTop + HEART_LIFE_HEIGHT / 2;
      const startTime = performance.now();

      const animate = (now: number) => {
        const progress = Math.min(1, (now - startTime) / returnMs);
        const display = heartPlayerRef.current?.getDisplay() as HeartDisplayLike | null;
        if (display) {
          display.x = centerX + (endX - centerX) * progress;
          display.y = centerY + (endY - centerY) * progress;
          const scaleX = 1 + (65 / boneWidth - 1) * progress;
          const scaleY = 1 + (46 / boneHeight - 1) * progress;

          if (display.scale?.set) {
            display.scale.set(scaleX);
          } else if (display.scale) {
            display.scale.x = scaleX;
            display.scale.y = scaleY;
          }
        }

        if (progress < 1) {
          flyBackRafRef.current = requestAnimationFrame(animate);
        }
      };

      flyBackRafRef.current = requestAnimationFrame(animate);
    }, flyMs + breakMs);

    const resetTimer = window.setTimeout(
      () => {
        setAnimPhase('idle');
        cancelAnimationFrame(flyBackRafRef.current);
        const display = heartPlayerRef.current?.getDisplay() as HeartDisplayLike | null;
        if (display) {
          display.x = centerX;
          display.y = centerY;
          if (display.scale?.set) {
            display.scale.set(1);
          } else if (display.scale) {
            display.scale.x = 1;
            display.scale.y = 1;
          }
        }
        onAnimationCompleteRef.current?.();
      },
      flyMs + breakMs + returnMs,
    );

    phaseTimersRef.current = [enterBreakingTimer, enterReturningTimer, resetTimer];
  }, [
    boneHeight,
    boneWidth,
    breakMs,
    centerX,
    centerY,
    flyMs,
    hudLeft,
    hudTop,
    isWrongFeedback,
    remainingLives,
    returnMs,
    totalLives,
  ]);

  useLayoutEffect(() => {
    if (animPhase !== 'flying' || !flyDivRef.current) {
      return;
    }

    const heartOffset = getHeartLifeOffset(animHeartIdx);
    const heartCenterX = heartOffset + HEART_LIFE_WIDTH / 2;
    const heartCenterY = HEART_LIFE_HEIGHT / 2;
    const localCenterX = centerX - hudLeft;
    const localCenterY = centerY - hudTop;
    const deltaX = localCenterX - heartCenterX;
    const deltaY = localCenterY - heartCenterY;
    const scaleX = boneWidth / 65;
    const scaleY = boneHeight / 46;

    const element = flyDivRef.current;
    element.style.transition = 'none';
    element.style.transform = 'translate(0px, 0px) scale(1, 1)';
    void element.getBoundingClientRect();
    element.style.transition = `transform ${flyMs}ms ease-in`;
    element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;
  }, [animHeartIdx, animPhase, boneHeight, boneWidth, centerX, centerY, flyMs, hudLeft, hudTop]);

  const isAnimating = animPhase !== 'idle';
  const stripWidth = HEART_LIFE_WIDTH * totalLives + HEART_LIFE_GAP * Math.max(0, totalLives - 1);

  return (
    <div
      className={containerClassName}
      data-testid={containerTestId}
      data-current-lives={String(remainingLives)}
      data-anim-phase={animPhase}
      data-anim-heart-index={String(animHeartIdx)}
      style={{
        position: 'absolute',
        left: hudLeft,
        top: hudTop,
        width: stripWidth,
        height: HEART_LIFE_HEIGHT,
      }}
    >
      <HeartLivesStrip
        remainingLives={remainingLives}
        totalLives={totalLives}
        hiddenIndexes={isAnimating ? [animHeartIdx] : undefined}
        testId={livesStripTestId}
      />

      {animPhase === 'flying' ? (
        <div
          ref={flyDivRef}
          style={{
            position: 'absolute',
            left: getHeartLifeOffset(animHeartIdx),
            top: 0,
            width: HEART_LIFE_WIDTH,
            height: HEART_LIFE_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transformOrigin: 'center center',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <HeartLifeSprite />
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: -hudLeft,
          top: -hudTop,
          width: stageWidth,
          height: stageHeight,
          pointerEvents: 'none',
          zIndex: 10,
          visibility: animPhase === 'breaking' || animPhase === 'returning' ? 'visible' : 'hidden',
        }}
      >
        <DragonBonesPlayer
          ref={heartPlayerRef}
          zipUrl={heartZipUrl}
          armature={heartArmature}
          autoPlay={false}
          width={stageWidth}
          height={stageHeight}
          onReady={() => {
            const display = heartPlayerRef.current?.getDisplay() as HeartDisplayLike | null;
            if (display) {
              display.x = centerX;
              display.y = centerY;
            }
          }}
        />
      </div>
    </div>
  );
}
