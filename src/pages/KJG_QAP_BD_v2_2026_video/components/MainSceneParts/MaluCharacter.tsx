import { useCallback, useEffect, useRef, useState } from 'react';
import { getRasterAsset } from '../../rasterAssets';
import RasterAnimationPlayer from '../raster-animation/RasterAnimationPlayer';
import {
  getMaluMoveDuration,
  MALU_ENTRY_START_X,
  resolveMaluAnimation,
} from '../../logic/runtime';

const RASTER_ASSETS = {
  laki: getRasterAsset('BD_laki'),
  lele: getRasterAsset('BD_lele'),
  nani: getRasterAsset('BD_nani'),
  ola: getRasterAsset('BD_ola'),
  pili: getRasterAsset('BD_pili'),
};

const MALU_VIEWPORT_WIDTH = 173;
const MALU_VIEWPORT_HEIGHT = 474;

export interface MaluCharacterProps {
  charName: string;
  animationName: 'enter' | 'idle' | 'angry' | 'happy' | 'sad' | 'pay' | 'turn';
  posX: number;
  entryKey: number;
  paused: boolean;
  startX?: number;
  zIndex?: number;
  onEntered?: () => void;
}

export default function MaluCharacter({
  charName,
  animationName,
  posX,
  entryKey,
  paused,
  startX = MALU_ENTRY_START_X,
  zIndex = 0,
  onEntered,
}: MaluCharacterProps) {
  const onEnteredRef = useRef(onEntered);
  const entryDuration = getMaluMoveDuration(startX, posX);
  const rasterAsset = RASTER_ASSETS[charName as keyof typeof RASTER_ASSETS] ?? RASTER_ASSETS.ola;
  const rasterAnimationList = Object.keys(rasterAsset.manifest.actions);
  const rasterAnimation = resolveMaluAnimation(rasterAnimationList, animationName);
  const entryFrameRef = useRef<number | null>(null);
  const entryTimerRef = useRef<number | null>(null);
  const motionRef = useRef({
    fromLeft: startX,
    toLeft: posX,
    remainingMs: entryDuration,
    startedAt: 0,
    active: false,
    pendingStart: false,
  });
  const [left, setLeft] = useState(startX);
  const [transitionMs, setTransitionMs] = useState(0);

  useEffect(() => {
    onEnteredRef.current = onEntered;
  }, [onEntered]);

  const clearEntryHandles = useCallback(() => {
    if (entryFrameRef.current !== null) {
      window.cancelAnimationFrame(entryFrameRef.current);
      entryFrameRef.current = null;
    }

    if (entryTimerRef.current !== null) {
      window.clearTimeout(entryTimerRef.current);
      entryTimerRef.current = null;
    }
  }, []);

  const handleEntered = useCallback(() => {
    motionRef.current.active = false;
    motionRef.current.pendingStart = false;
    motionRef.current.remainingMs = 0;
    onEnteredRef.current?.();
  }, []);

  const startEntryMotion = useCallback(
    (fromLeft: number, duration: number) => {
      clearEntryHandles();

      motionRef.current = {
        fromLeft,
        toLeft: posX,
        remainingMs: duration,
        startedAt: Date.now(),
        active: duration > 0,
        pendingStart: false,
      };

      setTransitionMs(duration);
      setLeft(posX);

      if (duration <= 0) {
        handleEntered();
        return;
      }

      entryTimerRef.current = window.setTimeout(() => {
        entryTimerRef.current = null;
        handleEntered();
      }, duration);
    },
    [clearEntryHandles, handleEntered, posX],
  );

  useEffect(() => {
    clearEntryHandles();
    setTransitionMs(0);
    setLeft(startX);

    motionRef.current = {
      fromLeft: startX,
      toLeft: posX,
      remainingMs: entryDuration,
      startedAt: 0,
      active: false,
      pendingStart: entryDuration > 0,
    };

    if (entryDuration <= 0) {
      handleEntered();
      return () => {};
    }

    if (!paused) {
      entryFrameRef.current = window.requestAnimationFrame(() => {
        entryFrameRef.current = null;
        startEntryMotion(startX, entryDuration);
      });
    }

    return () => {
      clearEntryHandles();
    };
  }, [clearEntryHandles, entryDuration, entryKey, handleEntered, posX, startEntryMotion, startX]);

  useEffect(() => {
    if (paused) {
      clearEntryHandles();

      if (!motionRef.current.active) {
        return;
      }

      const elapsedMs = Date.now() - motionRef.current.startedAt;
      const remainingMs = Math.max(0, motionRef.current.remainingMs - elapsedMs);
      const progress =
        motionRef.current.remainingMs > 0
          ? Math.min(Math.max(elapsedMs / motionRef.current.remainingMs, 0), 1)
          : 1;
      const frozenLeft =
        motionRef.current.fromLeft +
        (motionRef.current.toLeft - motionRef.current.fromLeft) * progress;

      motionRef.current = {
        fromLeft: frozenLeft,
        toLeft: motionRef.current.toLeft,
        remainingMs,
        startedAt: 0,
        active: false,
        pendingStart: remainingMs > 0,
      };
      setTransitionMs(0);
      setLeft(frozenLeft);
      return;
    }

    if (!motionRef.current.pendingStart || motionRef.current.remainingMs <= 0) {
      return;
    }

    entryFrameRef.current = window.requestAnimationFrame(() => {
      entryFrameRef.current = null;
      startEntryMotion(motionRef.current.fromLeft, motionRef.current.remainingMs);
    });

    return () => {
      if (entryFrameRef.current !== null) {
        window.cancelAnimationFrame(entryFrameRef.current);
        entryFrameRef.current = null;
      }
    };
  }, [clearEntryHandles, paused, startEntryMotion]);

  return (
    <div
      data-role="malu"
      data-malu-name={charName}
      data-animation={animationName}
      data-animation-list={rasterAnimationList.join(',')}
      data-render-mode="raster"
      data-asset-source="video-or-atlas"
      style={{
        position: 'absolute',
        left,
        top: 0,
        width: MALU_VIEWPORT_WIDTH,
        height: MALU_VIEWPORT_HEIGHT,
        transition: transitionMs > 0 ? `left ${transitionMs}ms linear` : 'none',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex,
      }}
    >
      <RasterAnimationPlayer
        manifest={rasterAsset.manifest}
        files={rasterAsset.files}
        action={rasterAnimation}
        paused={paused}
        restartKey={`${entryKey}:${animationName}`}
      />
    </div>
  );
}
