import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  getFrameState,
  locateAtlasFrame,
  selectRasterRenderer,
  type RasterAction,
  type RasterManifest,
  type RasterRenderer,
  type RasterRendererPreference,
} from './rasterPlayback';

type RasterStatus = 'loading-video' | 'video' | 'loading-atlas' | 'atlas' | 'failed';

export interface RasterAnimationPlayerProps {
  manifest: RasterManifest;
  files: Record<string, string>;
  action: string;
  origin?: { x: number; y: number };
  loop?: boolean;
  paused?: boolean;
  restartKey?: number | string;
  renderer?: RasterRendererPreference;
  className?: string;
  style?: CSSProperties;
  onReady?: () => void;
  onComplete?: () => void;
  onError?: (message: string) => void;
}

function getQueryRenderer(): RasterRendererPreference {
  if (typeof window === 'undefined') return 'auto';
  const value = new URLSearchParams(window.location.search).get('renderer');
  return value === 'webm' ||
    value === 'mov' ||
    value === 'atlas' ||
    value === 'broken-video'
    ? value
    : 'auto';
}

function selectInitialRenderer(preference: RasterRendererPreference): RasterRenderer {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return 'atlas';
  const probe = document.createElement('video');

  return selectRasterRenderer({
    preference,
    userAgent: navigator.userAgent,
    canPlayWebm: probe.canPlayType('video/webm; codecs="vp9"') !== '',
    canPlayMov: probe.canPlayType('video/quicktime; codecs="hvc1"') !== '',
  });
}

function AtlasCanvas({
  manifest,
  files,
  action,
  loop,
  paused,
  restartKey,
  initialElapsedMs,
  setStatus,
  onReady,
  onComplete,
  onError,
}: {
  manifest: RasterManifest;
  files: Record<string, string>;
  action: RasterAction;
  loop: boolean;
  paused: boolean;
  restartKey?: number | string;
  initialElapsedMs: number;
  setStatus(status: RasterStatus): void;
  onReady(): void;
  onComplete(): void;
  onError(message: string): void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageSrcRef = useRef('');
  const elapsedMsRef = useRef(0);
  const startedAtRef = useRef(0);
  const runningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const readyRef = useRef(false);
  const completedRef = useRef(false);
  const lastDrawnFrameRef = useRef(-1);
  const tickRef = useRef<(now: number) => void>(() => {});
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    runningRef.current = false;
  }, []);

  const drawFrame = useCallback(
    async (frame: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) throw new Error('Canvas 2D is unavailable');

      const located = action.still
        ? { src: action.still, column: 0, row: 0 }
        : (() => {
            const frameLocation = locateAtlasFrame(action.atlases ?? [], frame);
            return {
              src: frameLocation.atlas.src,
              column: frameLocation.column,
              row: frameLocation.row,
            };
          })();
      const source = files[located.src];
      if (!source) throw new Error(`missing raster asset: ${located.src}`);

      if (imageSrcRef.current !== source || !imageRef.current) {
        setStatus('loading-atlas');
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const nextImage = new Image();
          nextImage.onload = () => resolve(nextImage);
          nextImage.onerror = () => reject(new Error(`failed to load atlas: ${located.src}`));
          nextImage.src = source;
        });
        imageRef.current = image;
        imageSrcRef.current = source;
      }

      context.clearRect(0, 0, manifest.canvas.width, manifest.canvas.height);
      context.drawImage(
        imageRef.current,
        located.column * manifest.canvas.width,
        located.row * manifest.canvas.height,
        manifest.canvas.width,
        manifest.canvas.height,
        0,
        0,
        manifest.canvas.width,
        manifest.canvas.height,
      );

      setStatus('atlas');
      if (!readyRef.current) {
        readyRef.current = true;
        onReady();
      }
    }, [action, files, manifest.canvas.height, manifest.canvas.width, onReady, setStatus],
  );

  const drawFrameIfChanged = useCallback(
    async (frame: number) => {
      if (lastDrawnFrameRef.current === frame) return;
      await drawFrame(frame);
      lastDrawnFrameRef.current = frame;
    },
    [drawFrame],
  );

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    stop();
    elapsedMsRef.current = initialElapsedMs;
    imageRef.current = null;
    imageSrcRef.current = '';
    readyRef.current = false;
    completedRef.current = false;
    lastDrawnFrameRef.current = -1;

    tickRef.current = (now: number) => {
      const elapsedSeconds = (elapsedMsRef.current + now - startedAtRef.current) / 1000;
      const frameState = getFrameState(action, elapsedSeconds, manifest.fps, loop);

      void drawFrameIfChanged(frameState.frame)
        .then(() => {
          if (generationRef.current !== generation || !runningRef.current) return;
          if (frameState.complete) {
            stop();
            if (!completedRef.current) {
              completedRef.current = true;
              onComplete();
            }
            return;
          }
          rafRef.current = window.requestAnimationFrame(tickRef.current);
        })
        .catch((reason) => onError(reason instanceof Error ? reason.message : String(reason)));
    };

    const initialFrame = getFrameState(action, initialElapsedMs / 1000, manifest.fps, loop).frame;
    void drawFrameIfChanged(initialFrame)
      .then(() => {
        if (generationRef.current !== generation || pausedRef.current || action.still) return;
        startedAtRef.current = performance.now();
        runningRef.current = true;
        rafRef.current = window.requestAnimationFrame(tickRef.current);
      })
      .catch((reason) => onError(reason instanceof Error ? reason.message : String(reason)));

    return stop;
  }, [
    action,
    drawFrameIfChanged,
    initialElapsedMs,
    loop,
    manifest.fps,
    onComplete,
    onError,
    restartKey,
    stop,
  ]);

  useEffect(() => {
    if (!readyRef.current || action.still) return;

    if (paused) {
      if (runningRef.current) {
        elapsedMsRef.current += performance.now() - startedAtRef.current;
      }
      stop();
      return;
    }

    if (runningRef.current || completedRef.current) return;
    startedAtRef.current = performance.now();
    runningRef.current = true;
    rafRef.current = window.requestAnimationFrame(tickRef.current);
  }, [action.still, paused, stop]);

  return (
    <canvas
      ref={canvasRef}
      width={manifest.canvas.width}
      height={manifest.canvas.height}
      aria-hidden="true"
      style={{ display: 'block', width: manifest.canvas.width, height: manifest.canvas.height }}
    />
  );
}

export default function RasterAnimationPlayer({
  manifest,
  files,
  action: actionName,
  origin = { x: 0, y: 0 },
  loop = false,
  paused = false,
  restartKey,
  renderer,
  className,
  style,
  onReady,
  onComplete,
  onError,
}: RasterAnimationPlayerProps) {
  const action = manifest.actions[actionName];
  const preference = renderer ?? getQueryRenderer();
  const [activeRenderer, setActiveRenderer] = useState<RasterRenderer>(() =>
    selectInitialRenderer(preference),
  );
  const [status, setStatus] = useState<RasterStatus>(() =>
    activeRenderer === 'atlas' ? 'loading-atlas' : 'loading-video',
  );
  const [atlasInitialElapsedMs, setAtlasInitialElapsedMs] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(false);
  const readyRef = useRef(false);
  const callbacksRef = useRef({ onReady, onComplete, onError });

  useEffect(() => {
    callbacksRef.current = { onReady, onComplete, onError };
  }, [onComplete, onError, onReady]);

  const fail = useCallback((message: string) => {
    setStatus('failed');
    callbacksRef.current.onError?.(message);
  }, []);

  const fallbackToAtlas = useCallback(() => {
    setAtlasInitialElapsedMs((videoRef.current?.currentTime ?? 0) * 1000);
    setActiveRenderer('atlas');
    setStatus('loading-atlas');
  }, []);

  const completeOnce = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    callbacksRef.current.onComplete?.();
  }, []);

  const readyOnce = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    callbacksRef.current.onReady?.();
  }, []);

  useEffect(() => {
    completedRef.current = false;
    readyRef.current = false;
    setAtlasInitialElapsedMs(0);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    const nextRenderer = selectInitialRenderer(preference);
    setActiveRenderer(nextRenderer);
    setStatus(nextRenderer === 'atlas' ? 'loading-atlas' : 'loading-video');
  }, [actionName, preference, restartKey]);

  useEffect(() => {
    if (activeRenderer === 'atlas' || status !== 'video') return;
    const video = videoRef.current;
    if (!video) return;

    if (paused) {
      video.pause();
      return;
    }

    void video.play().catch(fallbackToAtlas);
  }, [activeRenderer, fallbackToAtlas, paused, status]);

  const selectedFile = action?.[activeRenderer === 'webm' ? 'webm' : 'mov'];
  const selectedSource = selectedFile ? files[selectedFile] : '';
  const videoSource = preference === 'broken-video' ? `${selectedSource}.missing` : selectedSource;
  const rootStyle = useMemo<CSSProperties>(
    () => ({
      position: 'absolute',
      left: origin.x + manifest.anchor.x,
      top: origin.y + manifest.anchor.y,
      width: manifest.canvas.width,
      height: manifest.canvas.height,
      pointerEvents: 'none',
      ...style,
    }),
    [
      manifest.anchor.x,
      manifest.anchor.y,
      manifest.canvas.height,
      manifest.canvas.width,
      origin.x,
      origin.y,
      style,
    ],
  );

  if (!action) {
    return (
      <div
        className={className}
        data-raster-status="failed"
        data-raster-action={actionName}
        style={rootStyle}
      />
    );
  }

  return (
    <div
      className={className}
      data-raster-status={status}
      data-raster-renderer={activeRenderer}
      data-raster-action={actionName}
      style={rootStyle}
    >
      {activeRenderer === 'atlas' ? (
        <AtlasCanvas
          manifest={manifest}
          files={files}
          action={action}
          loop={loop}
          paused={paused}
          restartKey={restartKey}
          initialElapsedMs={atlasInitialElapsedMs}
          setStatus={setStatus}
          onReady={readyOnce}
          onComplete={completeOnce}
          onError={fail}
        />
      ) : (
        <video
          ref={videoRef}
          src={videoSource}
          muted
          playsInline
          preload="auto"
          loop={loop}
          aria-hidden="true"
          onLoadedData={() => {
            setStatus('video');
            readyOnce();
            if (!paused) void videoRef.current?.play().catch(fallbackToAtlas);
          }}
          onEnded={completeOnce}
          onError={fallbackToAtlas}
          style={{
            display: 'block',
            width: manifest.canvas.width,
            height: manifest.canvas.height,
          }}
        />
      )}
    </div>
  );
}
