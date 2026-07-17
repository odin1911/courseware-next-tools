import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';
import DirectPixiPreviewPane from './DirectPixiPreviewPane';

type DebugAsset = {
  id: string;
  title: string;
  note: string;
  zipUrl: string;
};

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
  play?: (animationName?: string, playTimes?: number) => void;
  gotoAndPlayByTime?: (animationName: string, time?: number, playTimes?: number) => void;
};

type DragonBonesSlotLike = {
  name?: string;
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

const DEFAULT_ARMATURE = 'armatures/skeleton_movie_1';
const DEFAULT_ANIMATION = 'wait_1';
const DEFAULT_FIT_MODE: FitMode = 'armature-tree';
const DEFAULT_PADDING = 6;

const RESOURCE_VIEWPORT = {
  width: 360,
  height: 280,
};

const LAB_ASSETS: DebugAsset[] = [
  {
    id: 'fish1',
    title: 'Fish1',
    note: '短泡与长泡切换的基准资源',
    zipUrl: new URL('./assets/fixtures/OLK_DDV_fish1.zip', import.meta.url)
      .href,
  },
  {
    id: 'fish2',
    title: 'Fish2',
    note: '第二条鱼，用于排除资源个例',
    zipUrl: new URL('./assets/fixtures/OLK_DDV_fish2.zip', import.meta.url)
      .href,
  },
  {
    id: 'octopus',
    title: 'Octopus',
    note: '章鱼骨架',
    zipUrl: new URL('./assets/fixtures/OLK_DDV_octopus.zip', import.meta.url)
      .href,
  },
  {
    id: 'shell',
    title: 'Shell',
    note: '贝壳骨架',
    zipUrl: new URL('./assets/fixtures/OLK_DDV_shell.zip', import.meta.url)
      .href,
  },
  {
    id: 'tortoise',
    title: 'Tortoise',
    note: '乌龟骨架',
    zipUrl: new URL('./assets/fixtures/OLK_DDV_tortoise.zip', import.meta.url)
      .href,
  },
];

const PRESET_ACTIONS = [
  {
    id: 'short-enter',
    label: '短泡出现',
    armature: DEFAULT_ARMATURE,
    animation: 'wait_1',
    fitMode: 'armature-tree' as FitMode,
  },
  {
    id: 'short-hold',
    label: '短泡稳定',
    armature: DEFAULT_ARMATURE,
    animation: 'wait_2',
    fitMode: 'armature-tree' as FitMode,
  },
  {
    id: 'long-enter',
    label: '长泡出现',
    armature: DEFAULT_ARMATURE,
    animation: 'wait_long_1',
    fitMode: 'armature-tree' as FitMode,
  },
  {
    id: 'long-hold',
    label: '长泡稳定',
    armature: DEFAULT_ARMATURE,
    animation: 'wait_long_2',
    fitMode: 'armature-tree' as FitMode,
  },
  {
    id: 'child-one',
    label: '直接看 one',
    armature: 'armatures/one',
    animation: '1',
    fitMode: 'display' as FitMode,
  },
  {
    id: 'child-long',
    label: '直接看 long',
    armature: 'armatures/long',
    animation: '1',
    fitMode: 'display' as FitMode,
  },
] as const;

const LAB_FEATURES = [
  {
    title: '资源切换',
    description: '快速切换 fish、octopus、shell 等骨架资源，直接观察不同动物的白气泡表现。',
  },
  {
    title: '双视口对照',
    description: '左侧固定资源级预览，右侧模拟 132x132 正式答题区，用同一动画同步对比。',
  },
  {
    title: '定位辅助',
    description: '支持叠加 HTML 文本、render rect 与 bubble rect，便于确认气泡真实边界。',
  },
  {
    title: '状态复现',
    description: '通过快捷预设、正式参数恢复和重播按钮，单独复现 wait_1、wait_2、one、long。',
  },
] as const;

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  color: '#11263a',
  fontFamily: 'Primer Print, heiti, sans-serif',
  background:
    'radial-gradient(circle at top left, rgba(250, 255, 255, 0.95), rgba(215, 242, 245, 0.94) 32%, rgba(114, 196, 209, 0.92) 68%, #2b7088 100%)',
};

const panelStyle: CSSProperties = {
  borderRadius: 24,
  background: 'rgba(246, 253, 255, 0.84)',
  boxShadow: '0 18px 40px rgba(17, 54, 75, 0.18)',
  backdropFilter: 'blur(12px)',
};

const chipStyle: CSSProperties = {
  border: '1px solid rgba(28, 104, 129, 0.18)',
  borderRadius: 999,
  padding: '8px 14px',
  background: 'rgba(255, 255, 255, 0.78)',
  color: '#13465d',
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1,
  cursor: 'pointer',
};

const activeChipStyle: CSSProperties = {
  ...chipStyle,
  background: '#0f5d78',
  color: '#f6feff',
  borderColor: 'transparent',
  boxShadow: '0 10px 22px rgba(15, 93, 120, 0.24)',
};

const fieldStyle: CSSProperties = {
  width: '100%',
  borderRadius: 14,
  border: '1px solid rgba(29, 113, 138, 0.16)',
  background: 'rgba(255, 255, 255, 0.82)',
  color: '#14384a',
  padding: '10px 12px',
  fontSize: 14,
  fontWeight: 700,
};

const featureCardStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  borderRadius: 18,
  padding: '14px 16px',
  background: 'rgba(255, 255, 255, 0.68)',
  boxShadow: 'inset 0 0 0 1px rgba(17, 93, 120, 0.08)',
};

function sortArmatureNames(names: string[]) {
  const preferred = [DEFAULT_ARMATURE, 'armatures/one', 'armatures/long'];
  const uniqueNames = [...new Set(names.map((name) => String(name)).filter(Boolean))];

  return uniqueNames.sort((left, right) => {
    const leftIndex = preferred.indexOf(left);
    const rightIndex = preferred.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right);
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
}

function shouldLoopAnimation(animationName: string) {
  return animationName === '1' || animationName.startsWith('idle') || animationName.endsWith('_2');
}

function pickPreferredAnimation(animationNames: string[]) {
  const preferred = [DEFAULT_ANIMATION, 'wait_2', 'wait_long_1', 'wait_long_2', 'idle', '1'];

  for (const name of preferred) {
    if (animationNames.includes(name)) {
      return name;
    }
  }

  return animationNames[0] ?? '';
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

function playChildArmatureDefaultAnimation(childArmature: DragonBonesArmatureLike | null) {
  const animation = childArmature?.animation;
  const animationNames = animation?.animationNames ?? [];

  if (!animation || animationNames.length === 0) {
    return;
  }

  const fallbackAnimationName = animationNames.includes('1') ? '1' : animationNames[0];

  if (animation.lastAnimationName === fallbackAnimationName) {
    return;
  }

  if (typeof animation.play === 'function') {
    animation.play(fallbackAnimationName, 0);
    return;
  }

  animation.gotoAndPlayByTime?.(fallbackAnimationName, 0, 0);
}

function syncBubbleChildArmatureAnimation(armature: DragonBonesArmatureLike | null): boolean {
  if (!armature) {
    return false;
  }

  const bubbleChildArmature = armature.getSlot?.('bubble')?.childArmature ?? null;

  if (bubbleChildArmature) {
    playChildArmatureDefaultAnimation(bubbleChildArmature);
    return true;
  }

  for (const slot of armature.getSlots?.() ?? []) {
    if (syncBubbleChildArmatureAnimation(slot.childArmature ?? null)) {
      return true;
    }
  }

  return false;
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

type PreviewPaneProps = {
  label: string;
  note: string;
  asset: DebugAsset;
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
  onMetaLoaded?: (meta: { armatureNames: string[]; animationNames: string[] }) => void;
};

function PreviewPane({
  label,
  note,
  asset,
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
  onMetaLoaded,
}: PreviewPaneProps) {
  const playerRef = useRef<DragonBonesHandle | null>(null);
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
  }, [asset.id, armatureName]);

  useEffect(() => {
    if (status !== 'ready') {
      return;
    }

    const player = playerRef.current;

    if (!player) {
      return;
    }

    let frameCount = 0;
    let rafId = 0;

    const sync = () => {
      const display = player.getDisplay() as PixiDisplayLike | null;
      const armature = player.getArmature() as DragonBonesArmatureLike | null;

      if (!display || !armature) {
        return;
      }

      display.scale?.set?.(1, 1);
      display.x = 0;
      display.y = 0;

      syncBubbleChildArmatureAnimation(armature);

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

    player.clearFadeInTime();
    player.play(animationName, shouldLoopAnimation(animationName));
    sync();

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [
    animationName,
    armatureName,
    asset.id,
    fitMode,
    padding,
    replayToken,
    status,
    viewportHeight,
    viewportWidth,
  ]);

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
    <section style={{ ...panelStyle, padding: 18, display: 'grid', gap: 14 }}>
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
            'linear-gradient(180deg, rgba(226, 247, 252, 0.96), rgba(182, 226, 238, 0.96)), repeating-linear-gradient(0deg, rgba(14, 90, 114, 0.08) 0 1px, transparent 1px 16px), repeating-linear-gradient(90deg, rgba(14, 90, 114, 0.08) 0 1px, transparent 1px 16px)',
          boxShadow: 'inset 0 0 0 1px rgba(19, 78, 102, 0.12)',
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
            <DragonBonesPlayer
              ref={playerRef}
              zipUrl={asset.zipUrl}
              armature={armatureName}
              width={viewportWidth}
              height={viewportHeight}
              autoPlay={false}
              onReady={() => {
                setStatus('ready');
                setErrorText('');
                onMetaLoaded?.({
                  armatureNames: sortArmatureNames(playerRef.current?.getArmatureNames() ?? []),
                  animationNames: (playerRef.current?.getAnimationList() ?? []).map((name) => String(name)),
                });
              }}
              onError={(message) => {
                setStatus('error');
                setErrorText(message);
              }}
            />

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

export default function App() {
  const [selectedAssetId, setSelectedAssetId] = useState(LAB_ASSETS[0].id);
  const [selectedArmature, setSelectedArmature] = useState(DEFAULT_ARMATURE);
  const [selectedAnimation, setSelectedAnimation] = useState(DEFAULT_ANIMATION);
  const [fitMode, setFitMode] = useState<FitMode>(DEFAULT_FIT_MODE);
  const [padding, setPadding] = useState(DEFAULT_PADDING);
  const [viewportWidth, setViewportWidth] = useState(132);
  const [viewportHeight, setViewportHeight] = useState(132);
  const [overlayText, setOverlayText] = useState('candy');
  const [showOverlay, setShowOverlay] = useState(true);
  const [showRenderBounds, setShowRenderBounds] = useState(true);
  const [showBubbleBounds, setShowBubbleBounds] = useState(true);
  const [armatureOptions, setArmatureOptions] = useState<string[]>([]);
  const [animationOptions, setAnimationOptions] = useState<string[]>([]);
  const [pendingAnimation, setPendingAnimation] = useState<string | null>(null);
  const [replayToken, setReplayToken] = useState(0);

  const selectedAsset =
    LAB_ASSETS.find((asset) => asset.id === selectedAssetId) ?? LAB_ASSETS[0];

  useEffect(() => {
    setSelectedArmature(DEFAULT_ARMATURE);
    setSelectedAnimation(DEFAULT_ANIMATION);
    setArmatureOptions([]);
    setAnimationOptions([]);
    setPendingAnimation(null);
  }, [selectedAssetId]);

  useEffect(() => {
    setAnimationOptions([]);
  }, [selectedArmature]);

  useEffect(() => {
    if (armatureOptions.length === 0) {
      return;
    }

    if (!armatureOptions.includes(selectedArmature)) {
      setSelectedArmature(armatureOptions[0]);
    }
  }, [armatureOptions, selectedArmature]);

  const resolvedArmatureOptions =
    armatureOptions.length > 0
      ? armatureOptions
      : [DEFAULT_ARMATURE, 'armatures/one', 'armatures/long'];

  const fallbackAnimationOptions =
    selectedArmature === DEFAULT_ARMATURE
      ? ['idle', 'wait_1', 'wait_2', 'wait_long_1', 'wait_long_2', 'happy', 'angry', 'end']
      : ['1'];

  const resolvedAnimationOptions =
    animationOptions.length > 0 ? animationOptions : fallbackAnimationOptions;

  return (
    <div style={pageStyle} data-testid="ddvk-answer-area-lab-root">
      <div
        style={{
          maxWidth: 1360,
          margin: '0 auto',
          padding: '28px 18px 44px',
          display: 'grid',
          gap: 18,
        }}
      >
        <header style={{ ...panelStyle, padding: 24, display: 'grid', gap: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.08em', color: '#0f5d78' }}>
            DDVK ANSWER AREA LAB
          </div>
          <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.05, fontWeight: 700 }}>
            右侧答题区动画实验台
          </h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: 'rgba(17, 38, 58, 0.78)' }}>
            这个页面专门服务于 DDVK 右侧动物和白气泡调试。左边是资源级预览，右边是 132x132
            答题区预览；所有控制都脱离正式游戏流程，可以单独复现 `wait_1 / wait_2 / one / long`。
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={activeChipStyle}
              onClick={() => {
                setViewportWidth(132);
                setViewportHeight(132);
                setPadding(DEFAULT_PADDING);
                setFitMode('armature-tree');
                setReplayToken((value) => value + 1);
              }}
            >
              切回正式参数
            </button>
            <button
              type="button"
              style={chipStyle}
              onClick={() => {
                setViewportWidth(220);
                setViewportHeight(220);
                setPadding(10);
                setReplayToken((value) => value + 1);
              }}
            >
              放大视口
            </button>
            <button
              type="button"
              style={chipStyle}
              onClick={() => setReplayToken((value) => value + 1)}
            >
              重新播放
            </button>
          </div>
          <section style={{ display: 'grid', gap: 10 }} aria-label="功能说明">
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', color: '#0f5d78' }}>
              功能说明
            </div>
            <div
              style={{
                display: 'grid',
                gap: 12,
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              }}
            >
              {LAB_FEATURES.map((feature) => (
                <article key={feature.title} style={featureCardStyle}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#12354a' }}>{feature.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(17, 38, 58, 0.74)' }}>
                    {feature.description}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </header>

        <section style={{ ...panelStyle, padding: 20, display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f5d78' }}>资源</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {LAB_ASSETS.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  style={asset.id === selectedAssetId ? activeChipStyle : chipStyle}
                  onClick={() => setSelectedAssetId(asset.id)}
                >
                  {asset.title}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(17, 38, 58, 0.7)' }}>{selectedAsset.note}</div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f5d78' }}>快捷预设</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {PRESET_ACTIONS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  style={chipStyle}
                  onClick={() => {
                    setAnimationOptions([]);
                    setSelectedArmature(preset.armature);
                    setPendingAnimation(preset.animation);
                    setSelectedAnimation(preset.animation);
                    setFitMode(preset.fitMode);
                    setReplayToken((value) => value + 1);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 14,
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f5d78' }}>armature</span>
              <select
                style={fieldStyle}
                value={selectedArmature}
                onChange={(event) => {
                  setAnimationOptions([]);
                  setPendingAnimation(null);
                  setSelectedArmature(event.target.value);
                }}
              >
                {resolvedArmatureOptions.map((armatureName) => (
                  <option key={armatureName} value={armatureName}>
                    {armatureName}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f5d78' }}>animation</span>
              <select
                style={fieldStyle}
                value={selectedAnimation}
                onChange={(event) => {
                  setPendingAnimation(null);
                  setSelectedAnimation(event.target.value);
                }}
              >
                {resolvedAnimationOptions.map((animationName) => (
                  <option key={animationName} value={animationName}>
                    {animationName}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f5d78' }}>fit mode</span>
              <select
                style={fieldStyle}
                value={fitMode}
                onChange={(event) => setFitMode(event.target.value as FitMode)}
              >
                <option value="armature-tree">armature-tree</option>
                <option value="display">display</option>
                <option value="none">none</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f5d78' }}>overlay text</span>
              <input
                style={fieldStyle}
                value={overlayText}
                onChange={(event) => setOverlayText(event.target.value)}
              />
            </label>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 14,
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            }}
          >
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f5d78' }}>viewport width</span>
              <input
                type="number"
                min={80}
                max={420}
                style={fieldStyle}
                value={viewportWidth}
                onChange={(event) => setViewportWidth(Number(event.target.value) || 132)}
              />
            </label>

            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f5d78' }}>viewport height</span>
              <input
                type="number"
                min={80}
                max={420}
                style={fieldStyle}
                value={viewportHeight}
                onChange={(event) => setViewportHeight(Number(event.target.value) || 132)}
              />
            </label>

            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f5d78' }}>padding</span>
              <input
                type="number"
                min={0}
                max={40}
                style={fieldStyle}
                value={padding}
                onChange={(event) => setPadding(Number(event.target.value) || 0)}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                fontWeight: 800,
                color: '#0f5d78',
              }}
            >
              <input
                type="checkbox"
                checked={showOverlay}
                onChange={(event) => setShowOverlay(event.target.checked)}
              />
              显示 HTML 叠加文本
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                fontWeight: 800,
                color: '#0f5d78',
              }}
            >
              <input
                type="checkbox"
                checked={showRenderBounds}
                onChange={(event) => setShowRenderBounds(event.target.checked)}
              />
              显示 render rect（橙）
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                fontWeight: 800,
                color: '#0f5d78',
              }}
            >
              <input
                type="checkbox"
                checked={showBubbleBounds}
                onChange={(event) => setShowBubbleBounds(event.target.checked)}
              />
              显示 bubble rect（蓝）
            </label>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gap: 18,
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          }}
        >
          <PreviewPane
            label="资源级预览"
            note="固定 360x280，优先看资源本身和子骨骼联动。它负责回传 armature 与 animation 列表。"
            asset={selectedAsset}
            armatureName={selectedArmature}
            animationName={selectedAnimation}
            viewportWidth={RESOURCE_VIEWPORT.width}
            viewportHeight={RESOURCE_VIEWPORT.height}
            padding={24}
            fitMode="armature-tree"
            overlayText={overlayText}
            showOverlay={showOverlay}
            showRenderBounds={showRenderBounds}
            showBubbleBounds={showBubbleBounds}
            replayToken={replayToken}
            onMetaLoaded={({ armatureNames, animationNames }) => {
              setArmatureOptions(armatureNames);
              setAnimationOptions(animationNames);

              if (pendingAnimation) {
                if (animationNames.includes(pendingAnimation)) {
                  setSelectedAnimation(pendingAnimation);
                } else {
                  setSelectedAnimation(pickPreferredAnimation(animationNames));
                }

                setPendingAnimation(null);
                return;
              }

              if (!animationNames.includes(selectedAnimation)) {
                setSelectedAnimation(pickPreferredAnimation(animationNames));
              }
            }}
          />

          <PreviewPane
            label="答题区预览"
            note="这块专门模拟正式答题区：同一资源、同一动画，但视口和 fit 策略可改。"
            asset={selectedAsset}
            armatureName={selectedArmature}
            animationName={selectedAnimation}
            viewportWidth={viewportWidth}
            viewportHeight={viewportHeight}
            padding={padding}
            fitMode={fitMode}
            overlayText={overlayText}
            showOverlay={showOverlay}
            showRenderBounds={showRenderBounds}
            showBubbleBounds={showBubbleBounds}
            replayToken={replayToken}
          />

          <DirectPixiPreviewPane
            label="直连 @alo7/dragonbones-pixi"
            note="绕过共享 DragonBonesPlayer，直接用 PixiSkItem.createMovie()。如果这里也复现短泡问题，锅就在包或 runtime；如果这里只有共享面板异常，锅就在本地封装。"
            zipUrl={selectedAsset.zipUrl}
            armatureName={selectedArmature}
            animationName={selectedAnimation}
            viewportWidth={viewportWidth}
            viewportHeight={viewportHeight}
            padding={padding}
            fitMode={fitMode}
            overlayText={overlayText}
            showOverlay={showOverlay}
            showRenderBounds={showRenderBounds}
            showBubbleBounds={showBubbleBounds}
            replayToken={replayToken}
          />
        </section>
      </div>
    </div>
  );
}
