import { useEffect, useRef, useState } from 'react';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';
import { resolveAnimationName, BD_DRAGONBONES_ARMATURE } from '../../logic/runtime';

const OPEN_ZIP_URL = new URL('../../assets/skeleton/BD_open.zip', import.meta.url).href;
const CLOSE_ZIP_URL = new URL('../../assets/skeleton/BD_close.zip', import.meta.url).href;
const CURTAIN_VIEWPORT_WIDTH = 414;
const CURTAIN_VIEWPORT_HEIGHT = 354;
const CURTAIN_CANVAS_PADDING_RIGHT = 371;
const CURTAIN_CANVAS_PADDING_BOTTOM = 188;
const CURTAIN_CANVAS_WIDTH = CURTAIN_VIEWPORT_WIDTH + CURTAIN_CANVAS_PADDING_RIGHT;
const CURTAIN_CANVAS_HEIGHT = CURTAIN_VIEWPORT_HEIGHT + CURTAIN_CANVAS_PADDING_BOTTOM;
const CURTAIN_ENTER_ANIMATION = 'start';
const CURTAIN_HOLD_ANIMATION = 'end';

function resolveCurtainAnimation(animationList: string[], phase: 'entering' | 'hold') {
  return resolveAnimationName(animationList, [
    phase === 'entering' ? CURTAIN_ENTER_ANIMATION : CURTAIN_HOLD_ANIMATION,
  ]);
}

export interface DayCurtainProps {
  phase: 'opening' | 'closing';
}

export default function DayCurtain({ phase }: DayCurtainProps) {
  const playerRef = useRef<DragonBonesHandle | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [motionPhase, setMotionPhase] = useState<'ready' | 'entering' | 'hold' | 'exiting'>(
    'ready',
  );

  useEffect(() => {
    if (!isReady || !playerRef.current) {
      return;
    }

    if (motionPhase !== 'entering' && motionPhase !== 'hold') {
      return;
    }

    const animationList = playerRef.current.getAnimationList();
    const animationName = resolveCurtainAnimation(animationList, motionPhase);

    if (animationName) {
      playerRef.current.play(animationName, false);
    }
  }, [isReady, motionPhase]);

  useEffect(() => {
    setIsReady(false);
    setMotionPhase('ready');
    const enterFrame = window.requestAnimationFrame(() => {
      setMotionPhase('entering');
    });
    const holdTimer = window.setTimeout(() => {
      setMotionPhase('hold');
    }, 1000);
    const exitTimer = window.setTimeout(() => {
      setMotionPhase('exiting');
    }, 1800);

    return () => {
      window.cancelAnimationFrame(enterFrame);
      window.clearTimeout(holdTimer);
      window.clearTimeout(exitTimer);
    };
  }, [phase]);

  return (
    <div
      data-role="day-switch-content"
      data-animation={
        motionPhase === 'hold' ? 'hold' : motionPhase === 'exiting' ? 'exit' : 'enter'
      }
      data-render-mode="dragonbones"
      data-asset-source="skeleton"
      style={{ position: 'absolute', left: 0, top: 0, width: 1024, height: 768 }}
    >
      <div
        data-role="day-switch-panel"
        data-motion-phase={motionPhase}
        style={{
          position: 'absolute',
          left: 305,
          top: 207,
          width: CURTAIN_VIEWPORT_WIDTH,
          height: CURTAIN_VIEWPORT_HEIGHT,
          overflow: 'visible',
          transform:
            motionPhase === 'ready'
              ? 'translateX(719px)'
              : motionPhase === 'entering' || motionPhase === 'hold'
                ? 'translateX(0px)'
                : 'translateX(-719px)',
          transition:
            motionPhase === 'entering' || motionPhase === 'exiting'
              ? 'transform 300ms linear'
              : 'none',
        }}
      >
        <DragonBonesPlayer
          ref={playerRef}
          zipUrl={phase === 'opening' ? OPEN_ZIP_URL : CLOSE_ZIP_URL}
          armature={BD_DRAGONBONES_ARMATURE}
          width={CURTAIN_CANVAS_WIDTH}
          height={CURTAIN_CANVAS_HEIGHT}
          autoPlay={false}
          onReady={() => setIsReady(true)}
          style={{ position: 'absolute', left: '-70%', top: '-30%' }}
        />
      </div>
    </div>
  );
}
