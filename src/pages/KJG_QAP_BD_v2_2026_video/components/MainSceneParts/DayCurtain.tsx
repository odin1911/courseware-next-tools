import { useEffect, useState } from 'react';
import { getRasterAsset } from '../../rasterAssets';
import RasterAnimationPlayer from '../raster-animation/RasterAnimationPlayer';

const OPEN_ASSET = getRasterAsset('BD_open');
const CLOSE_ASSET = getRasterAsset('BD_close');
const CURTAIN_VIEWPORT_WIDTH = 414;
const CURTAIN_VIEWPORT_HEIGHT = 354;

export interface DayCurtainProps {
  phase: 'opening' | 'closing';
}

export default function DayCurtain({ phase }: DayCurtainProps) {
  const [motionPhase, setMotionPhase] = useState<'ready' | 'entering' | 'hold' | 'exiting'>(
    'ready',
  );
  const rasterAsset = phase === 'opening' ? OPEN_ASSET : CLOSE_ASSET;
  const rasterAction = motionPhase === 'ready' || motionPhase === 'entering' ? 'start' : 'end';

  useEffect(() => {
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
      data-render-mode="raster"
      data-asset-source="video-or-atlas"
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
        <RasterAnimationPlayer
          manifest={rasterAsset.manifest}
          files={rasterAsset.files}
          action={rasterAction}
          restartKey={`${phase}:${motionPhase}`}
          style={{
            left: rasterAsset.manifest.anchor.x - CURTAIN_VIEWPORT_WIDTH * 0.7,
            top: rasterAsset.manifest.anchor.y - CURTAIN_VIEWPORT_HEIGHT * 0.3,
          }}
        />
      </div>
    </div>
  );
}
