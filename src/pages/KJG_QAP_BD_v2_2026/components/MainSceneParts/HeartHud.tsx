import AnimatedHeartHud from '@/shared/components/animated-heart-hud/AnimatedHeartHud';

export interface HeartHudProps {
  hearts: number;
  maxHearts: number;
  isWrongFeedback: boolean;
  soundVolume: number;
  heartBreakAudioUrl?: string | null;
}

export default function HeartHud({
  hearts,
  maxHearts,
  isWrongFeedback,
  soundVolume,
  heartBreakAudioUrl,
}: HeartHudProps) {
  return (
    <div
      aria-label="heart-hud"
      data-role="heart-hud"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 1024,
        height: 768,
        pointerEvents: 'none',
      }}
    >
      <AnimatedHeartHud
        remainingLives={hearts}
        totalLives={maxHearts}
        isWrongFeedback={isWrongFeedback}
        soundVolume={soundVolume}
        hudLeft={35}
        hudTop={35}
        containerTestId="bd-heart-container"
        heartBreakAudioUrl={heartBreakAudioUrl}
        stageWidth={1024}
        stageHeight={768}
      />
    </div>
  );
}
