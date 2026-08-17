import { useCallback, useEffect, useRef, useState } from 'react';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';
import {
  getMaluMoveDuration,
  MALU_ENTRY_START_X,
  resolveMaluAnimation,
  BD_DRAGONBONES_ARMATURE,
  shouldLoopMaluAnimation,
} from '../../logic/runtime';

const ZIP_URLS: Record<string, string> = {
  ola: new URL('../../assets/skeleton/BD_ola.zip', import.meta.url).href,
  laki: new URL('../../assets/skeleton/BD_laki.zip', import.meta.url).href,
  lele: new URL('../../assets/skeleton/BD_lele.zip', import.meta.url).href,
  nani: new URL('../../assets/skeleton/BD_nani.zip', import.meta.url).href,
  pili: new URL('../../assets/skeleton/BD_pili.zip', import.meta.url).href,
};

const MALU_VIEWPORT_WIDTH = 173;
const MALU_VIEWPORT_HEIGHT = 474;
const MALU_CANVAS_PADDING_LEFT = 240;
const MALU_CANVAS_PADDING_TOP = 120;
const MALU_CANVAS_PADDING_RIGHT = 240;
const MALU_CANVAS_PADDING_BOTTOM = 80;
const MALU_CANVAS_WIDTH =
  MALU_VIEWPORT_WIDTH + MALU_CANVAS_PADDING_LEFT + MALU_CANVAS_PADDING_RIGHT;
const MALU_CANVAS_HEIGHT =
  MALU_VIEWPORT_HEIGHT + MALU_CANVAS_PADDING_TOP + MALU_CANVAS_PADDING_BOTTOM;
const MALU_SLOT_TOP_BY_CHAR: Record<string, number> = {
  ola: 244,
  laki: 245,
  lele: 245,
  nani: 238,
  pili: 245,
};

function applyDisplayPadding(player: DragonBonesHandle | null, slotTop: number) {
  const display = player?.getDisplay() as { x?: number; y?: number } | null;

  if (!display) {
    return;
  }

  display.x = MALU_CANVAS_PADDING_LEFT;
  display.y = MALU_CANVAS_PADDING_TOP + slotTop;
}

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
  const playerRef = useRef<DragonBonesHandle | null>(null);
  const onEnteredRef = useRef(onEntered);
  const entryDuration = getMaluMoveDuration(startX, posX);
  const slotTop = MALU_SLOT_TOP_BY_CHAR[charName] ?? 244;
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
  const [isReady, setIsReady] = useState(false);
  const [armatureNames, setArmatureNames] = useState<string[]>([]);
  const [animationList, setAnimationList] = useState<string[]>([]);

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

  useEffect(() => {
    if (!isReady || !playerRef.current) {
      return;
    }

    applyDisplayPadding(playerRef.current, slotTop);

    const animations = playerRef.current.getAnimationList();
    setAnimationList(animations);
    const resolvedAnimation = resolveMaluAnimation(animations, animationName);

    if (!resolvedAnimation) {
      return;
    }

    playerRef.current.play(
      resolvedAnimation,
      shouldLoopMaluAnimation(animationName, resolvedAnimation),
    );
  }, [animationName, charName, entryKey, isReady, slotTop]);

  useEffect(() => {
    playerRef.current?.setPause(paused);
  }, [paused]);

  return (
    <div
      data-role="malu"
      data-malu-name={charName}
      data-animation={animationName}
      data-armatures={armatureNames.join(',')}
      data-animation-list={animationList.join(',')}
      data-render-mode="dragonbones"
      data-asset-source="skeleton"
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
      <DragonBonesPlayer
        ref={playerRef}
        zipUrl={ZIP_URLS[charName] ?? ZIP_URLS.ola}
        armature={BD_DRAGONBONES_ARMATURE}
        width={MALU_CANVAS_WIDTH}
        height={MALU_CANVAS_HEIGHT}
        autoPlay={false}
        onReady={() => {
          applyDisplayPadding(playerRef.current, slotTop);
          setArmatureNames(playerRef.current?.getArmatureNames() ?? []);
          setAnimationList(playerRef.current?.getAnimationList() ?? []);
          setIsReady(true);
        }}
        style={{
          position: 'absolute',
          left: -MALU_CANVAS_PADDING_LEFT,
          top: -MALU_CANVAS_PADDING_TOP,
        }}
      />
    </div>
  );
}
