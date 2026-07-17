import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { PixiSkItem } from '@alo7/dragonbones-pixi';
import type { PixiSkMovie } from '@alo7/dragonbones-pixi';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as _PIXI from 'pixi.js';

const PIXI = _PIXI as any;

type FitMode = 'armature-tree' | 'display' | 'none';
type PreviewStatus = 'loading' | 'ready' | 'error';

type DisplayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PixiDisplayLike = {
  x: number;
  y: number;
  disableBatch?: () => void;
  getBounds?: () => DisplayRect;
  getLocalBounds?: () => DisplayRect;
  scale?: {
    set?: (x: number, y?: number) => void;
  };
  width?: number;
  height?: number;
};

type DragonBonesAnimationLike = {
  animationNames?: string[];
  lastAnimationName?: string;
};

type DragonBonesSlotLike = {
  displayIndex?: number;
  display?: PixiDisplayLike | null;
  childArmature?: DragonBonesArmatureLike | null;
};

type DragonBonesArmatureLike = {
  name?: string;
  display?: PixiDisplayLike | null;
  animation?: DragonBonesAnimationLike | null;
  getSlots?: () => DragonBonesSlotLike[];
  getSlot?: (name: string) => DragonBonesSlotLike | null;
};

type BubbleDebugInfo = {
  slotDisplayIndex: number | null;
  slotDisplayRect: DisplayRect | null;
  slotDisplayLocalRect: DisplayRect | null;
  childArmatureName: string | null;
  childArmatureDisplayRect: DisplayRect | null;
  childAnimationNames: string[];
  childLastAnimationName: string | null;
  childHasRequestedAnimation: boolean | null;
};

export interface DirectPixiPreviewPaneProps {
  label: string;
  note: string;
  zipUrl: string;
  armatureName: string;
  animationName: string;
  viewportWidth: number;
  viewportHeight: number;
  padding: number;
  fitMode: FitMode;
  overlayText: string;
  showOverlay: boolean;
  showRenderBounds: boolean;
  showBubbleBounds: boolean;
  replayToken: number;
}

function shouldLoopAnimation(animationName: string) {
  return animationName === '1' || animationName.startsWith('idle') || animationName.endsWith('_2');
}

function getDisplayLocalRect(display: PixiDisplayLike | null): DisplayRect | null {
  if (!display) {
    return null;
  }

  const bounds = display.getLocalBounds?.();

  if (bounds && bounds.width > 0 && bounds.height > 0) {
    return bounds;
  }

  if (
    typeof display.width === 'number' &&
    display.width > 0 &&
    typeof display.height === 'number' &&
    display.height > 0
  ) {
    return {
      x: 0,
      y: 0,
      width: display.width,
      height: display.height,
    } satisfies DisplayRect;
  }

  return null;
}

function getDisplayWorldRect(display: PixiDisplayLike | null): DisplayRect | null {
  if (!display) {
    return null;
  }

  const bounds = display.getBounds?.();

  if (bounds && bounds.width > 0 && bounds.height > 0) {
    return bounds;
  }

  return null;
}

function mergeRects(rects: DisplayRect[]) {
  if (rects.length === 0) {
    return null;
  }

  let minX = rects[0].x;
  let minY = rects[0].y;
  let maxX = rects[0].x + rects[0].width;
  let maxY = rects[0].y + rects[0].height;

  for (let index = 1; index < rects.length; index += 1) {
    const rect = rects[index];
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  } satisfies DisplayRect;
}

function collectArmatureDisplayRects(
  armature: DragonBonesArmatureLike | null,
  rects: DisplayRect[],
  seen = new Set<DragonBonesArmatureLike>(),
) {
  if (!armature || seen.has(armature)) {
    return;
  }

  seen.add(armature);

  for (const slot of armature.getSlots?.() ?? []) {
    const rect = getDisplayWorldRect(slot.display ?? null);

    if (rect) {
      rects.push(rect);
    }

    collectArmatureDisplayRects(slot.childArmature ?? null, rects, seen);
  }
}

function getArmatureRenderRect(
  armature: DragonBonesArmatureLike | null,
  display: PixiDisplayLike | null,
) {
  const rects: DisplayRect[] = [];
  const displayRect = getDisplayWorldRect(display);

  if (displayRect) {
    rects.push(displayRect);
  }

  collectArmatureDisplayRects(armature, rects);

  return mergeRects(rects);
}

function resolveBubbleDisplay(armature: DragonBonesArmatureLike | null): PixiDisplayLike | null {
  if (!armature) {
    return null;
  }

  const directBubbleSlot = armature.getSlot?.('bubble') ?? null;

  if (getDisplayWorldRect(directBubbleSlot?.display ?? null)) {
    return directBubbleSlot?.display ?? null;
  }

  for (const slot of armature.getSlots?.() ?? []) {
    const childDisplay = resolveBubbleDisplay(slot.childArmature ?? null);

    if (childDisplay) {
      return childDisplay;
    }
  }

  return null;
}

function inspectBubbleDebugInfo(
  armature: DragonBonesArmatureLike | null,
  requestedAnimationName: string,
): BubbleDebugInfo | null {
  if (!armature) {
    return null;
  }

  const bubbleSlot = armature.getSlot?.('bubble') ?? null;
  const childArmature = bubbleSlot?.childArmature ?? null;
  const childAnimationNames = childArmature?.animation?.animationNames ?? [];

  return {
    slotDisplayIndex:
      typeof bubbleSlot?.displayIndex === 'number' ? bubbleSlot.displayIndex : null,
    slotDisplayRect: getDisplayWorldRect(bubbleSlot?.display ?? null),
    slotDisplayLocalRect: getDisplayLocalRect(bubbleSlot?.display ?? null),
    childArmatureName: childArmature?.name ?? null,
    childArmatureDisplayRect: getDisplayWorldRect(childArmature?.display ?? null),
    childAnimationNames,
    childLastAnimationName: childArmature?.animation?.lastAnimationName ?? null,
    childHasRequestedAnimation:
      childAnimationNames.length > 0 ? childAnimationNames.includes(requestedAnimationName) : null,
  } satisfies BubbleDebugInfo;
}

function fitDisplayToViewport(
  display: PixiDisplayLike,
  bounds: DisplayRect,
  width: number,
  height: number,
  padding: number,
) {
  const safeWidth = Math.max(width - padding * 2, 1);
  const safeHeight = Math.max(height - padding * 2, 1);
  const fitScale = Math.min(safeWidth / bounds.width, safeHeight / bounds.height, 1);

  display.scale?.set?.(fitScale, fitScale);
  display.x = width / 2 - (bounds.x + bounds.width / 2) * fitScale;
  display.y = height / 2 - (bounds.y + bounds.height / 2) * fitScale;
}

function formatRect(rect: DisplayRect | null) {
  if (!rect) {
    return '未找到';
  }

  return `${Math.round(rect.x)}, ${Math.round(rect.y)}, ${Math.round(rect.width)} x ${Math.round(rect.height)}`;
}

function getStatusStyle(status: PreviewStatus): CSSProperties {
  if (status === 'ready') {
    return {
      borderColor: 'rgba(35, 144, 115, 0.16)',
      background: 'rgba(220, 255, 244, 0.9)',
      color: '#116145',
    };
  }

  if (status === 'error') {
    return {
      borderColor: 'rgba(190, 54, 77, 0.16)',
      background: 'rgba(255, 231, 236, 0.94)',
      color: '#8d1f37',
    };
  }

  return {
    borderColor: 'rgba(176, 112, 12, 0.16)',
    background: 'rgba(255, 243, 204, 0.92)',
    color: '#8a580a',
  };
}

export default function DirectPixiPreviewPane({
  label,
  note,
  zipUrl,
  armatureName,
  animationName,
  viewportWidth,
  viewportHeight,
  padding,
  fitMode,
  overlayText,
  showOverlay,
  showRenderBounds,
  showBubbleBounds,
  replayToken,
}: DirectPixiPreviewPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<any>(null);
  const itemRef = useRef<PixiSkItem | null>(null);
  const movieRef = useRef<PixiSkMovie | null>(null);
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [errorText, setErrorText] = useState('');
  const [bubbleRect, setBubbleRect] = useState<DisplayRect | null>(null);
  const [renderRect, setRenderRect] = useState<DisplayRect | null>(null);
  const [bubbleDebugInfo, setBubbleDebugInfo] = useState<BubbleDebugInfo | null>(null);

  useEffect(() => {
    setStatus('loading');
    setErrorText('');
    setBubbleRect(null);
    setRenderRect(null);
    setBubbleDebugInfo(null);

    const container = containerRef.current;

    if (!container) {
      return;
    }

    let disposed = false;
    const app = new PIXI.Application({
      width: viewportWidth,
      height: viewportHeight,
      transparent: 'notMultiplied',
    });
    const appView = app.view as HTMLCanvasElement;

    appView.style.display = 'block';
    appView.style.background = 'transparent';
    appView.style.border = '0';
    container.replaceChildren(appView);

    appRef.current = app;
    movieRef.current = null;
    itemRef.current = null;

    PixiSkItem.loadUrl(zipUrl)
      .then((item) => {
        if (disposed) {
          item.destroy();
          return;
        }

        const movie = item.createMovie(armatureName);

        if (!movie) {
          item.destroy();
          setStatus('error');
          setErrorText(`Failed to create movie for armature: ${armatureName}`);
          return;
        }

        itemRef.current = item;
        movieRef.current = movie;
        app.stage.addChild(movie.display);
        setStatus('ready');
        setErrorText('');
      })
      .catch((error) => {
        if (disposed) {
          return;
        }

        setStatus('error');
        setErrorText(error instanceof Error ? error.message : String(error));
      });

    return () => {
      disposed = true;

      if (container.firstChild === appView) {
        container.replaceChildren();
      }

      try {
        movieRef.current?.destroy();
      } catch {
        // noop
      }

      movieRef.current = null;

      try {
        itemRef.current?.destroy();
      } catch {
        // noop
      }

      itemRef.current = null;

      try {
        app.stop?.();
        app.destroy?.(true);
      } catch {
        // noop
      }

      appRef.current = null;
    };
  }, [armatureName, viewportHeight, viewportWidth, zipUrl]);

  useEffect(() => {
    if (status !== 'ready') {
      return;
    }

    const app = appRef.current;
    const movie = movieRef.current;

    if (!app || !movie) {
      return;
    }

    let frameCount = 0;
    let rafId = 0;
    let cancelled = false;

    movie.clearFadeInTime?.();
    movie.curtMovement = animationName;
    movie.play(shouldLoopAnimation(animationName) ? 0 : 1);
    app.start?.();

    const sync = () => {
      if (cancelled) {
        return;
      }

      const display = movie.display as PixiDisplayLike | null;
      const armature = movie.armatrue as DragonBonesArmatureLike | null;

      if (!display || !armature) {
        return;
      }

      display.scale?.set?.(1, 1);
      display.x = 0;
      display.y = 0;

      const measureRect =
        fitMode === 'display'
          ? getDisplayLocalRect(display)
          : getArmatureRenderRect(armature, display) ?? getDisplayLocalRect(display);

      if (fitMode !== 'none' && measureRect) {
        fitDisplayToViewport(display, measureRect, viewportWidth, viewportHeight, padding);
      }

      const nextRenderRect =
        fitMode === 'display'
          ? getDisplayWorldRect(display)
          : getArmatureRenderRect(armature, display) ?? getDisplayWorldRect(display);

      const nextBubbleDisplay = resolveBubbleDisplay(armature);
      nextBubbleDisplay?.disableBatch?.();
      const nextBubbleRect =
        getDisplayWorldRect(nextBubbleDisplay) ??
        (armatureName === 'armatures/one' || armatureName === 'armatures/long'
          ? nextRenderRect
          : null);
      const nextBubbleDebugInfo = inspectBubbleDebugInfo(armature, animationName);

      setRenderRect(nextRenderRect);
      setBubbleRect(nextBubbleRect);
      setBubbleDebugInfo(nextBubbleDebugInfo);

      if (frameCount >= 24) {
        return;
      }

      frameCount += 1;
      rafId = requestAnimationFrame(sync);
    };

    sync();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [animationName, armatureName, fitMode, padding, replayToken, status, viewportHeight, viewportWidth]);

  const overlayStyle: CSSProperties = {
    position: 'absolute',
    left: bubbleRect ? bubbleRect.x : 22,
    top: bubbleRect ? bubbleRect.y : 18,
    width: bubbleRect ? bubbleRect.width : Math.max(78, viewportWidth - 44),
    height: bubbleRect ? bubbleRect.height : 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: '#111111',
    fontSize: bubbleRect ? Math.max(16, Math.min(30, bubbleRect.height * 0.42)) : 18,
    fontWeight: 800,
    lineHeight: 1.05,
    pointerEvents: 'none',
    opacity: showOverlay ? 1 : 0,
    transition: 'opacity 180ms ease',
  };

  const renderBoundsStyle: CSSProperties = {
    position: 'absolute',
    left: renderRect?.x ?? 0,
    top: renderRect?.y ?? 0,
    width: renderRect?.width ?? 0,
    height: renderRect?.height ?? 0,
    boxSizing: 'border-box',
    border: '2px dashed rgba(231, 111, 47, 0.92)',
    background: 'rgba(231, 111, 47, 0.08)',
    pointerEvents: 'none',
    opacity: showRenderBounds && renderRect ? 1 : 0,
    transition: 'opacity 180ms ease',
  };

  const bubbleBoundsStyle: CSSProperties = {
    position: 'absolute',
    left: bubbleRect?.x ?? 0,
    top: bubbleRect?.y ?? 0,
    width: bubbleRect?.width ?? 0,
    height: bubbleRect?.height ?? 0,
    boxSizing: 'border-box',
    border: '2px solid rgba(15, 93, 120, 0.92)',
    background: 'rgba(15, 93, 120, 0.08)',
    pointerEvents: 'none',
    opacity: showBubbleBounds && bubbleRect ? 1 : 0,
    transition: 'opacity 180ms ease',
  };

  return (
    <section
      style={{
        borderRadius: 24,
        background: 'rgba(246, 253, 255, 0.84)',
        boxShadow: '0 18px 40px rgba(17, 54, 75, 0.18)',
        backdropFilter: 'blur(12px)',
        padding: 18,
        display: 'grid',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 700 }}>{label}</div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: 'rgba(18, 51, 70, 0.72)' }}>{note}</div>
        </div>
        <div
          style={{
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 999,
            padding: '7px 12px',
            fontSize: 12,
            fontWeight: 800,
            lineHeight: 1,
            ...getStatusStyle(status),
          }}
        >
          {status.toUpperCase()}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          width: viewportWidth,
          height: viewportHeight,
          margin: '0 auto',
          borderRadius: 20,
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, rgba(252, 244, 226, 0.96), rgba(238, 225, 182, 0.96)), repeating-linear-gradient(0deg, rgba(114, 74, 14, 0.08) 0 1px, transparent 1px 16px), repeating-linear-gradient(90deg, rgba(114, 74, 14, 0.08) 0 1px, transparent 1px 16px)',
          boxShadow: 'inset 0 0 0 1px rgba(102, 73, 19, 0.12)',
        }}
      >
        {status === 'error' ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              textAlign: 'center',
              color: '#8d1f37',
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.45,
            }}
          >
            {errorText}
          </div>
        ) : (
          <>
            <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
            <div style={renderBoundsStyle} />
            <div style={bubbleBoundsStyle} />
            <div style={overlayStyle}>{overlayText}</div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gap: 8, fontSize: 12, color: 'rgba(18, 51, 70, 0.82)' }}>
        <span>viewport: {viewportWidth} x {viewportHeight}</span>
        <span>fit mode: {fitMode}</span>
        <span>armature: {armatureName}</span>
        <span>animation: {animationName}</span>
        <span>render rect: {formatRect(renderRect)}</span>
        <span>bubble rect: {formatRect(bubbleRect)}</span>
        <span>
          bubble slot displayIndex:{' '}
          {bubbleDebugInfo?.slotDisplayIndex ?? 'null'}
        </span>
        <span>
          bubble slot display rect:{' '}
          {formatRect(bubbleDebugInfo?.slotDisplayRect ?? null)}
        </span>
        <span>
          bubble slot local rect:{' '}
          {formatRect(bubbleDebugInfo?.slotDisplayLocalRect ?? null)}
        </span>
        <span>
          bubble child armature:{' '}
          {bubbleDebugInfo?.childArmatureName ?? 'null'}
        </span>
        <span>
          bubble child display rect:{' '}
          {formatRect(bubbleDebugInfo?.childArmatureDisplayRect ?? null)}
        </span>
        <span>
          bubble child animations:{' '}
          {bubbleDebugInfo?.childAnimationNames.join(', ') || 'none'}
        </span>
        <span>
          bubble child last animation:{' '}
          {bubbleDebugInfo?.childLastAnimationName ?? 'null'}
        </span>
        <span>
          bubble child has requested animation:{' '}
          {bubbleDebugInfo?.childHasRequestedAnimation === null
            ? 'null'
            : bubbleDebugInfo?.childHasRequestedAnimation
              ? 'yes'
              : 'no'}
        </span>
      </div>
    </section>
  );
}