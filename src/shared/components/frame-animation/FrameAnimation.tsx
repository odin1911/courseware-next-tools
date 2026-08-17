import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ImgHTMLAttributes,
} from 'react';

export interface FrameAnimationHandle {
  play: () => void;
  stop: (resetToIdle?: boolean) => void;
  reset: () => void;
}

export interface FrameAnimationProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  frames: string[];
  isPlaying?: boolean;
  autoplay?: boolean;
  frameDurationMs?: number;
  idleFrameIndex?: number;
  startFrameIndex?: number;
  endFrameIndex?: number;
  loop?: boolean;
  resetOnStop?: boolean;
  onFrameChange?: (frameIndex: number) => void;
  onAnimationEnd?: () => void;
}

function clampFrameIndex(index: number, maxIndex: number) {
  if (maxIndex < 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), maxIndex);
}

const FrameAnimation = forwardRef<FrameAnimationHandle, FrameAnimationProps>(
  function FrameAnimation(
    {
      frames,
      isPlaying,
      autoplay = false,
      frameDurationMs = 100,
      idleFrameIndex = 0,
      startFrameIndex,
      endFrameIndex,
      loop = true,
      resetOnStop = true,
      onFrameChange,
      onAnimationEnd,
      alt = '',
      ...imgProps
    },
    ref,
  ) {
    const isControlled = typeof isPlaying === 'boolean';
    const maxFrameIndex = frames.length - 1;
    const safeIdleFrameIndex = clampFrameIndex(idleFrameIndex, maxFrameIndex);
    const safeStartFrameIndex = clampFrameIndex(
      startFrameIndex ?? safeIdleFrameIndex,
      maxFrameIndex,
    );
    const safeEndFrameIndex = clampFrameIndex(endFrameIndex ?? maxFrameIndex, maxFrameIndex);
    const playRangeStart = Math.min(safeStartFrameIndex, safeEndFrameIndex);
    const playRangeEnd = Math.max(safeStartFrameIndex, safeEndFrameIndex);

    const [internalPlaying, setInternalPlaying] = useState(autoplay);
    const [frameIndex, setFrameIndex] = useState(safeIdleFrameIndex);
    const intervalRef = useRef<number | null>(null);
    const resolvedPlaying = isControlled ? Boolean(isPlaying) : internalPlaying;

    const currentFrame = useMemo(() => {
      if (!frames.length) {
        return '';
      }

      return frames[clampFrameIndex(frameIndex, maxFrameIndex)] || frames[0];
    }, [frameIndex, frames, maxFrameIndex]);

    function clearTimer() {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function moveToIdleFrame() {
      setFrameIndex(safeIdleFrameIndex);
    }

    function stopInternal(resetToIdle = resetOnStop) {
      clearTimer();

      if (!isControlled) {
        setInternalPlaying(false);
      }

      if (resetToIdle) {
        moveToIdleFrame();
      }
    }

    function playInternal() {
      if (!frames.length) {
        return;
      }

      if (!isControlled) {
        setInternalPlaying(true);
      }

      setFrameIndex((current) => {
        if (current < playRangeStart || current > playRangeEnd) {
          return playRangeStart;
        }

        if (current === safeIdleFrameIndex && playRangeStart !== safeIdleFrameIndex) {
          return playRangeStart;
        }

        return current;
      });
    }

    useImperativeHandle(
      ref,
      () => ({
        play: playInternal,
        stop: stopInternal,
        reset: moveToIdleFrame,
      }),
      [frames.length, isControlled, playRangeEnd, playRangeStart, resetOnStop, safeIdleFrameIndex],
    );

    useEffect(() => {
      onFrameChange?.(frameIndex);
    }, [frameIndex, onFrameChange]);

    useEffect(() => {
      clearTimer();
      setFrameIndex((current) => clampFrameIndex(current, maxFrameIndex));

      return () => {
        clearTimer();
      };
    }, [maxFrameIndex]);

    useEffect(() => {
      if (!frames.length) {
        clearTimer();
        return;
      }

      if (!resolvedPlaying) {
        clearTimer();

        if (resetOnStop) {
          moveToIdleFrame();
        }
        return;
      }

      setFrameIndex((current) => {
        if (current < playRangeStart || current > playRangeEnd) {
          return playRangeStart;
        }

        if (current === safeIdleFrameIndex && playRangeStart !== safeIdleFrameIndex) {
          return playRangeStart;
        }

        return current;
      });

      clearTimer();
      intervalRef.current = window.setInterval(() => {
        setFrameIndex((current) => {
          const normalized =
            current < playRangeStart || current > playRangeEnd ? playRangeStart : current;

          if (normalized >= playRangeEnd) {
            if (loop) {
              return playRangeStart;
            }

            clearTimer();

            if (!isControlled) {
              setInternalPlaying(false);
            }

            window.setTimeout(() => onAnimationEnd?.(), 0);
            return playRangeEnd;
          }

          return normalized + 1;
        });
      }, frameDurationMs);

      return () => {
        clearTimer();
      };
    }, [
      frameDurationMs,
      frames.length,
      isControlled,
      loop,
      onAnimationEnd,
      playRangeEnd,
      playRangeStart,
      resetOnStop,
      resolvedPlaying,
      safeIdleFrameIndex,
    ]);

    if (!currentFrame) {
      return null;
    }

    return <img {...imgProps} src={currentFrame} alt={alt} />;
  },
);

export default FrameAnimation;
