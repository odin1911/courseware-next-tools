import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';
import { pickInitialArmature } from './armatureSelection';
import type { DemoAsset } from './demoAssets';
import {
  mergeFrameExportBounds,
  resolveOriginalContentViewport,
  type FrameExportBounds,
} from './frameExportLogic';
// pixi.js v4 的运行时类型与当前工具页注入场景不完整，沿用共享播放器的 any 访问方式。
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as _PIXI from 'pixi.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PIXI = _PIXI as any;

type DemoStatus = 'loading' | 'ready' | 'error';

type DisplayBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PixiDisplayLike = {
  x: number;
  y: number;
  name?: string;
  parent?: PixiContainerLike | null;
  destroy?: () => void;
  getBounds?: () => DisplayBounds;
  width?: number;
  height?: number;
  scale?: {
    set?: (x: number, y?: number) => void;
  };
  anchor?: {
    set?: (x: number, y?: number) => void;
  };
};

type PixiContainerLike = PixiDisplayLike & {
  addChild?: (child: PixiDisplayLike) => void;
  removeChild?: (child: PixiDisplayLike) => void;
  getChildByName?: (name: string) => PixiDisplayLike | null;
};

type DragonBonesSlotLike = {
  name?: string;
  display?: PixiDisplayLike | null;
  childArmature?: ChildArmatureLike | null;
};

type ChildArmatureLike = {
  getSlot?: (name: string) => DragonBonesSlotLike | null;
  getSlots?: () => DragonBonesSlotLike[];
};

type EmbeddedTextHandle =
  | {
      mode: 'container';
      container: PixiContainerLike;
      textNode: PixiDisplayLike;
    }
  | {
      mode: 'slot';
      slot: DragonBonesSlotLike;
      previousDisplay: PixiDisplayLike | null | undefined;
      textNode: PixiDisplayLike;
    };

type EmbeddedTextSettings = {
  enabled: boolean;
  text: string;
  target: string;
  x: number;
  y: number;
  fontSize: number;
  fill: string;
};

type MotionAnalysisResult = {
  animationName: string;
  frameCount: number;
  bounds: FrameExportBounds;
  viewport: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  requiredPadding: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
};

const EMBEDDED_TEXT_NAME = '__dragonbones_tool_embedded_text__';
const EMBED_TARGET_STAGE = '__stage__';
const EMBED_TARGET_ROOT = '__root__';
const EMBED_SLOT_PREFIX = 'slot:';
const ANALYSIS_PADDING = 0;

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 80,
  padding: '6px 12px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.04em',
};

const buttonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 999,
  padding: '8px 12px',
  background: '#ff7c42',
  color: '#fffaf3',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1,
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: '#fff3e9',
  color: '#b44f16',
  border: '1px solid rgba(221, 108, 48, 0.2)',
};

const inputStyle: CSSProperties = {
  minHeight: 34,
  border: '1px solid rgba(180, 79, 22, 0.2)',
  borderRadius: 10,
  padding: '6px 10px',
  background: 'rgba(255, 255, 255, 0.82)',
  color: '#5a2508',
  fontSize: 13,
};

const embeddedLabelStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  minWidth: 120,
  fontSize: 12,
  fontWeight: 700,
  color: 'rgba(90, 37, 8, 0.72)',
};

function getBadgeStyle(status: DemoStatus): CSSProperties {
  if (status === 'ready') {
    return {
      ...badgeStyle,
      color: '#116537',
      background: 'rgba(212, 255, 224, 0.86)',
    };
  }

  if (status === 'error') {
    return {
      ...badgeStyle,
      color: '#a21d2c',
      background: 'rgba(255, 223, 228, 0.96)',
    };
  }

  return {
    ...badgeStyle,
    color: '#92520b',
    background: 'rgba(255, 238, 199, 0.92)',
  };
}

function getStatusLabel(status: DemoStatus) {
  if (status === 'ready') {
    return 'READY';
  }

  if (status === 'error') {
    return 'ERROR';
  }

  return 'LOADING';
}

function getDisplayRect(display: PixiDisplayLike | null) {
  if (!display) {
    return null;
  }

  const bounds = display.getBounds?.();

  if (
    bounds &&
    typeof bounds.x === 'number' &&
    typeof bounds.y === 'number' &&
    bounds.width > 0 &&
    bounds.height > 0
  ) {
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
  }

  if (
    typeof display.x === 'number' &&
    typeof display.y === 'number' &&
    typeof display.width === 'number' &&
    display.width > 0 &&
    typeof display.height === 'number' &&
    display.height > 0
  ) {
    return {
      x: display.x,
      y: display.y,
      width: display.width,
      height: display.height,
    };
  }

  return null;
}

function mergeDisplayRects(rects: DisplayBounds[]) {
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
  } satisfies DisplayBounds;
}

function collectArmatureDisplayRects(
  armature: ChildArmatureLike | null,
  rects: DisplayBounds[],
  seen = new Set<ChildArmatureLike>(),
) {
  if (!armature || seen.has(armature)) {
    return;
  }

  seen.add(armature);

  for (const slot of armature.getSlots?.() ?? []) {
    const rect = getDisplayRect(slot.display ?? null);

    if (rect) {
      rects.push(rect);
    }

    collectArmatureDisplayRects(slot.childArmature ?? null, rects, seen);
  }
}

function getSlotNames(armature: ChildArmatureLike | null) {
  const slots = armature?.getSlots?.() ?? [];
  const names = slots.map((slot) => slot.name).filter((name): name is string => !!name);

  return [...new Set(names)];
}

function createPixiText(settings: EmbeddedTextSettings) {
  const textNode = new PIXI.Text(settings.text, {
    fontFamily: 'Primer Print, Arial, sans-serif',
    fontSize: settings.fontSize,
    fontWeight: '700',
    fill: settings.fill,
    align: 'center',
    stroke: '#ffffff',
    strokeThickness: Math.max(2, Math.round(settings.fontSize / 9)),
    wordWrap: true,
    wordWrapWidth: Math.max(settings.fontSize * 5, 120),
  }) as PixiDisplayLike;

  textNode.name = EMBEDDED_TEXT_NAME;
  textNode.x = settings.x;
  textNode.y = settings.y;
  textNode.anchor?.set?.(0.5);

  return textNode;
}

function clearEmbeddedText(handle: EmbeddedTextHandle | null) {
  if (!handle) {
    return;
  }

  if (handle.mode === 'slot') {
    if (handle.slot.display === handle.textNode) {
      handle.slot.display = handle.previousDisplay;
    }

    handle.textNode.destroy?.();
    return;
  }

  handle.container.removeChild?.(handle.textNode);
  handle.textNode.destroy?.();
}

function attachEmbeddedText(
  player: DragonBonesHandle | null,
  settings: EmbeddedTextSettings,
): EmbeddedTextHandle | null {
  if (!settings.enabled || settings.text.trim().length === 0) {
    return null;
  }

  const display = player?.getDisplay() as PixiContainerLike | null;

  if (!display) {
    return null;
  }

  const textNode = createPixiText(settings);

  if (settings.target.startsWith(EMBED_SLOT_PREFIX)) {
    const slotName = settings.target.slice(EMBED_SLOT_PREFIX.length);
    const armature = player?.getArmature() as ChildArmatureLike | null;
    const slot = armature?.getSlot?.(slotName) ?? null;

    if (!slot) {
      textNode.destroy?.();
      return null;
    }

    const previousDisplay = slot.display;
    slot.display = textNode;

    return {
      mode: 'slot',
      slot,
      previousDisplay,
      textNode,
    };
  }

  const container =
    settings.target === EMBED_TARGET_ROOT ? display : (display.parent as PixiContainerLike | null);

  if (!container) {
    textNode.destroy?.();
    return null;
  }

  const staleText = container.getChildByName?.(EMBEDDED_TEXT_NAME);
  if (staleText) {
    container.removeChild?.(staleText);
    staleText.destroy?.();
  }

  container.addChild?.(textNode);

  return {
    mode: 'container',
    container,
    textNode,
  };
}

function getArmatureRenderRect(player: DragonBonesHandle | null) {
  const rects: DisplayBounds[] = [];
  const displayRect = getDisplayRect(player?.getDisplay() as PixiDisplayLike | null);

  if (displayRect) {
    rects.push(displayRect);
  }

  collectArmatureDisplayRects(player?.getArmature() as ChildArmatureLike | null, rects);

  return mergeDisplayRects(rects);
}

function fitDisplayToViewport(
  player: DragonBonesHandle | null,
  width: number,
  height: number,
  padding = 18,
) {
  const display = player?.getDisplay() as PixiDisplayLike | null;
  const bounds = getArmatureRenderRect(player);

  if (!display || !bounds || bounds.width <= 0 || bounds.height <= 0) {
    return;
  }

  const safeWidth = Math.max(width - padding * 2, 1);
  const safeHeight = Math.max(height - padding * 2, 1);
  const fitScale = Math.min(safeWidth / bounds.width, safeHeight / bounds.height, 1);

  display.scale?.set?.(fitScale, fitScale);
  display.x = width / 2 - (bounds.x + bounds.width / 2) * fitScale;
  display.y = height / 2 - (bounds.y + bounds.height / 2) * fitScale;
}

function toAnimationList(raw: string[]) {
  const list = raw.map((name) => String(name)).filter((name) => name.length > 0);

  return [...new Set(list)];
}

function pickDefaultAnimation(animationList: string[]) {
  const preferred = ['start', 'idle', 'wait_1', 'wait_2', 'happy', 'angry', 'end'];

  for (const name of preferred) {
    if (animationList.includes(name)) {
      return name;
    }
  }

  return animationList[0] ?? '';
}

function shouldLoop(animationName: string) {
  return (
    animationName.startsWith('idle') || animationName.startsWith('wait') || animationName === '1'
  );
}

function runPlayerStep(stepName: string, callback: () => void) {
  try {
    callback();
  } catch (error) {
    console.warn(`[dragonbones-tool] player step failed: ${stepName}`, error);
  }
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export default function DemoCard({ asset }: { asset: DemoAsset }) {
  const embeddedDefaults = asset.embeddedTextDefaults;
  const playerRef = useRef<DragonBonesHandle | null>(null);
  const discoveredArmaturesRef = useRef<string[]>(asset.armatures ?? []);
  const embeddedTextHandleRef = useRef<EmbeddedTextHandle | null>(null);
  const [status, setStatus] = useState<DemoStatus>('loading');
  const [errorText, setErrorText] = useState('');
  const [animationList, setAnimationList] = useState<string[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState('');
  const [armatureList, setArmatureList] = useState<string[]>([]);
  const [slotNames, setSlotNames] = useState<string[]>([]);
  const [embeddedTextEnabled, setEmbeddedTextEnabled] = useState(
    () => embeddedDefaults?.enabled ?? false,
  );
  const [embeddedText, setEmbeddedText] = useState(() => embeddedDefaults?.text ?? 'Hello');
  const [embeddedTextTarget, setEmbeddedTextTarget] = useState(
    () => embeddedDefaults?.target ?? EMBED_TARGET_STAGE,
  );
  const [embeddedTextX, setEmbeddedTextX] = useState(
    () => embeddedDefaults?.x ?? Math.round(asset.width / 2),
  );
  const [embeddedTextY, setEmbeddedTextY] = useState(
    () => embeddedDefaults?.y ?? Math.round(asset.height / 2),
  );
  const [embeddedTextFontSize, setEmbeddedTextFontSize] = useState(
    () => embeddedDefaults?.fontSize ?? 42,
  );
  const [embeddedTextFill, setEmbeddedTextFill] = useState(
    () => embeddedDefaults?.fill ?? '#5a2508',
  );
  const [embeddedTextRevision, setEmbeddedTextRevision] = useState(0);
  const [isAnalyzingMotion, setIsAnalyzingMotion] = useState(false);
  const [motionAnalysis, setMotionAnalysis] = useState<MotionAnalysisResult | null>(null);
  const [motionAnalysisError, setMotionAnalysisError] = useState('');
  const [currentArmature, setCurrentArmature] = useState(
    pickInitialArmature({
      preferredArmatures: asset.armatures,
      discoveredArmatures: asset.armatures ?? [],
    }),
  );

  const canPlay = status === 'ready' && animationList.length > 0;
  const embeddedTextSettings = useMemo(
    () => ({
      enabled: embeddedTextEnabled,
      text: embeddedText,
      target: embeddedTextTarget,
      x: embeddedTextX,
      y: embeddedTextY,
      fontSize: embeddedTextFontSize,
      fill: embeddedTextFill,
    }),
    [
      embeddedText,
      embeddedTextEnabled,
      embeddedTextFill,
      embeddedTextFontSize,
      embeddedTextTarget,
      embeddedTextX,
      embeddedTextY,
    ],
  );

  useEffect(() => {
    return () => {
      clearEmbeddedText(embeddedTextHandleRef.current);
      embeddedTextHandleRef.current = null;
    };
  }, []);

  useEffect(() => {
    clearEmbeddedText(embeddedTextHandleRef.current);
    embeddedTextHandleRef.current = null;

    if (status !== 'ready') {
      return undefined;
    }

    const rafId = window.requestAnimationFrame(() => {
      embeddedTextHandleRef.current = attachEmbeddedText(playerRef.current, embeddedTextSettings);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      clearEmbeddedText(embeddedTextHandleRef.current);
      embeddedTextHandleRef.current = null;
    };
  }, [currentArmature, embeddedTextRevision, embeddedTextSettings, status]);

  const readDiscoveredArmatures = () => {
    const nextArmatures = playerRef.current?.getArmatureNames() ?? [];

    if (nextArmatures.length > 0) {
      return nextArmatures;
    }

    return discoveredArmaturesRef.current;
  };

  const syncDiscoveredArmatures = (discoveredArmatures: string[]) => {
    if (discoveredArmatures.length === 0) {
      return false;
    }

    discoveredArmaturesRef.current = discoveredArmatures;
    setArmatureList(discoveredArmatures);

    if (discoveredArmatures.includes(currentArmature)) {
      return false;
    }

    const nextArmature = pickInitialArmature({
      preferredArmatures: asset.armatures,
      discoveredArmatures,
    });

    if (nextArmature === currentArmature) {
      return false;
    }

    switchArmature(nextArmature);
    return true;
  };

  const switchArmature = (name: string) => {
    clearEmbeddedText(embeddedTextHandleRef.current);
    embeddedTextHandleRef.current = null;
    setCurrentArmature(name);
    setStatus('loading');
    setAnimationList([]);
    setCurrentAnimation('');
    setSlotNames([]);
    setErrorText('');
  };

  const playAnimation = (animationName: string, loop = shouldLoop(animationName)) => {
    if (!animationName) {
      return;
    }

    playerRef.current?.play(animationName, loop);
    setCurrentAnimation(animationName);
    setEmbeddedTextRevision((value) => value + 1);
  };

  const analyzeCurrentMotion = async () => {
    const player = playerRef.current;
    const animationName = currentAnimation || pickDefaultAnimation(animationList);

    if (!player || !animationName) {
      return;
    }

    const meta = player.getAnimationMeta(animationName);

    if (!meta || meta.frameCount <= 0) {
      setMotionAnalysisError(`无法读取动画 ${animationName} 的帧信息`);
      setMotionAnalysis(null);
      return;
    }

    setIsAnalyzingMotion(true);
    setMotionAnalysisError('');
    setMotionAnalysis(null);

    try {
      const boundsList: FrameExportBounds[] = [];
      player.setDisplayTransform({ x: 0, y: 0, scale: 1 });

      for (let frameIndex = 0; frameIndex < meta.frameCount; frameIndex += 1) {
        player.gotoAndStopByFrame(animationName, frameIndex);
        await nextFrame();
        player.renderCurrentFrame();

        const bounds = player.measureCurrentBounds();
        if (bounds && bounds.width > 0 && bounds.height > 0) {
          boundsList.push(bounds);
        }
      }

      const bounds = mergeFrameExportBounds(boundsList);

      if (!bounds) {
        throw new Error(`无法测量动画 ${animationName} 的内容范围`);
      }

      const viewport = resolveOriginalContentViewport(bounds, ANALYSIS_PADDING);
      const requiredPadding = {
        left: Math.max(0, -Math.floor(bounds.x)),
        top: Math.max(0, -Math.floor(bounds.y)),
        right: Math.max(0, Math.ceil(bounds.x + bounds.width) - asset.width),
        bottom: Math.max(0, Math.ceil(bounds.y + bounds.height) - asset.height),
      };

      setMotionAnalysis({
        animationName,
        frameCount: meta.frameCount,
        bounds,
        viewport: {
          width: viewport.width,
          height: viewport.height,
          offsetX: viewport.offsetX,
          offsetY: viewport.offsetY,
        },
        requiredPadding,
      });

      player.resizeCanvas(viewport.width, viewport.height);
      player.setDisplayTransform({
        x: viewport.offsetX,
        y: viewport.offsetY,
        scale: 1,
      });
      playAnimation(animationName, shouldLoop(animationName));
    } catch (error) {
      setMotionAnalysisError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsAnalyzingMotion(false);
    }
  };

  const displayAnimations = useMemo(() => animationList.slice(0, 10), [animationList]);

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        borderRadius: 20,
        padding: 18,
        background: 'linear-gradient(180deg, rgba(255, 250, 244, 0.98), rgba(255, 236, 219, 0.94))',
        boxShadow: '0 16px 36px rgba(116, 41, 0, 0.16)',
      }}
      data-status={status}
      data-testid={`dragonbones-card-${asset.id}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 700 }}>{asset.title}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(90, 37, 8, 0.8)' }}>
            {asset.note}
          </div>
        </div>
        <div style={getBadgeStyle(status)}>{getStatusLabel(status)}</div>
      </div>

      {armatureList.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span
            style={{
              fontSize: 12,
              color: 'rgba(90, 37, 8, 0.6)',
              alignSelf: 'center',
              marginRight: 4,
            }}
          >
            armature:
          </span>
          {armatureList.map((name) => (
            <button
              key={name}
              type="button"
              style={name === currentArmature ? buttonStyle : secondaryButtonStyle}
              onClick={() => switchArmature(name)}
            >
              {name.replace(/^armatures\//, '')}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          minHeight: asset.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 14,
          background:
            'linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(255, 245, 234, 0.92))',
          boxShadow: 'inset 0 0 0 1px rgba(226, 117, 52, 0.12)',
        }}
      >
        {status === 'error' ? (
          <div style={{ color: '#a21d2c', padding: 20, textAlign: 'center', lineHeight: 1.45 }}>
            {errorText || 'DragonBones 加载失败'}
          </div>
        ) : (
          <DragonBonesPlayer
            key={currentArmature}
            ref={playerRef}
            zipUrl={asset.zipUrl}
            armature={currentArmature}
            width={asset.width}
            height={asset.height}
            autoPlay={false}
            transparentMode={asset.transparentMode}
            onReady={() => {
              if (syncDiscoveredArmatures(readDiscoveredArmatures())) {
                return;
              }

              const list = toAnimationList(playerRef.current?.getAnimationList() ?? []);
              const initial = pickDefaultAnimation(list);
              const nextSlotNames = getSlotNames(
                playerRef.current?.getArmature() as ChildArmatureLike | null,
              );

              setStatus('ready');
              setErrorText('');
              setAnimationList(list);
              setCurrentAnimation(initial);
              setSlotNames(nextSlotNames);

              if (
                embeddedTextTarget.startsWith(EMBED_SLOT_PREFIX) &&
                !nextSlotNames.includes(embeddedTextTarget.slice(EMBED_SLOT_PREFIX.length))
              ) {
                setEmbeddedTextTarget(EMBED_TARGET_STAGE);
              }

              runPlayerStep('fitDisplayToViewport', () => {
                fitDisplayToViewport(playerRef.current, asset.width, asset.height);
              });

              if (initial) {
                runPlayerStep(`play:${initial}`, () => {
                  playerRef.current?.play(initial, shouldLoop(initial));
                });
              }

              setEmbeddedTextRevision((value) => value + 1);
            }}
            onError={(message) => {
              if (syncDiscoveredArmatures(readDiscoveredArmatures())) {
                return;
              }

              setStatus('error');
              setErrorText(message);
              setSlotNames([]);
            }}
          />
        )}
      </div>

      <div style={{ display: 'grid', gap: 8, fontSize: 12, color: 'rgba(90, 37, 8, 0.82)' }}>
        <span>source: {asset.sourceLabel ?? asset.zipUrl.split('/').pop() ?? asset.zipUrl}</span>
        <span>armature: {currentArmature}</span>
        <span>current: {currentAnimation || '-'}</span>
        <span>animations: {animationList.length}</span>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 10,
          borderRadius: 14,
          padding: 12,
          background: 'rgba(255, 255, 255, 0.62)',
          boxShadow: 'inset 0 0 0 1px rgba(180, 79, 22, 0.1)',
        }}
        data-embedded-text-enabled={embeddedTextEnabled ? 'true' : 'false'}
        data-testid="dragonbones-embedded-text-panel"
      >
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            width: 'fit-content',
            fontSize: 13,
            fontWeight: 800,
            color: '#5a2508',
          }}
        >
          <input
            type="checkbox"
            checked={embeddedTextEnabled}
            onChange={(event) => setEmbeddedTextEnabled(event.currentTarget.checked)}
            data-testid="dragonbones-embedded-text-toggle"
          />
          嵌字调试
        </label>
        <div
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            alignItems: 'end',
          }}
        >
          <label style={embeddedLabelStyle}>
            文本
            <input
              type="text"
              value={embeddedText}
              style={inputStyle}
              onChange={(event) => setEmbeddedText(event.currentTarget.value)}
              data-testid="dragonbones-embedded-text-input"
            />
          </label>
          <label style={embeddedLabelStyle}>
            目标
            <select
              value={embeddedTextTarget}
              style={inputStyle}
              onChange={(event) => setEmbeddedTextTarget(event.currentTarget.value)}
              data-testid="dragonbones-embedded-text-target"
            >
              <option value={EMBED_TARGET_STAGE}>舞台层</option>
              <option value={EMBED_TARGET_ROOT}>骨架根层</option>
              {slotNames.map((name) => (
                <option key={name} value={`${EMBED_SLOT_PREFIX}${name}`}>
                  slot: {name}
                </option>
              ))}
            </select>
          </label>
          <label style={embeddedLabelStyle}>
            X
            <input
              type="number"
              value={embeddedTextX}
              style={inputStyle}
              onChange={(event) => setEmbeddedTextX(Number(event.currentTarget.value))}
              data-testid="dragonbones-embedded-text-x"
            />
          </label>
          <label style={embeddedLabelStyle}>
            Y
            <input
              type="number"
              value={embeddedTextY}
              style={inputStyle}
              onChange={(event) => setEmbeddedTextY(Number(event.currentTarget.value))}
              data-testid="dragonbones-embedded-text-y"
            />
          </label>
          <label style={embeddedLabelStyle}>
            字号
            <input
              type="number"
              min={8}
              max={120}
              value={embeddedTextFontSize}
              style={inputStyle}
              onChange={(event) => setEmbeddedTextFontSize(Number(event.currentTarget.value))}
              data-testid="dragonbones-embedded-text-size"
            />
          </label>
          <label style={embeddedLabelStyle}>
            颜色
            <input
              type="color"
              value={embeddedTextFill}
              style={{ ...inputStyle, padding: 3 }}
              onChange={(event) => setEmbeddedTextFill(event.currentTarget.value)}
              data-testid="dragonbones-embedded-text-color"
            />
          </label>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(90, 37, 8, 0.68)' }}>
          slots: {slotNames.length}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          style={buttonStyle}
          disabled={!canPlay}
          onClick={() => playAnimation(currentAnimation || pickDefaultAnimation(animationList))}
        >
          重播
        </button>
        <button
          type="button"
          style={secondaryButtonStyle}
          disabled={!canPlay || isAnalyzingMotion}
          onClick={() => {
            void analyzeCurrentMotion();
          }}
          data-testid="dragonbones-analyze-motion"
        >
          {isAnalyzingMotion ? '分析中...' : '分析当前动作'}
        </button>
        {displayAnimations.map((animationName) => (
          <button
            key={animationName}
            type="button"
            style={secondaryButtonStyle}
            disabled={!canPlay}
            onClick={() => playAnimation(animationName)}
          >
            {animationName}
          </button>
        ))}
      </div>
      {(motionAnalysis || motionAnalysisError) && (
        <div
          style={{
            display: 'grid',
            gap: 6,
            borderRadius: 14,
            padding: 12,
            background: 'rgba(255, 255, 255, 0.72)',
            boxShadow: 'inset 0 0 0 1px rgba(180, 79, 22, 0.1)',
            fontSize: 12,
            lineHeight: 1.55,
            color: motionAnalysisError ? '#a21d2c' : 'rgba(90, 37, 8, 0.86)',
          }}
          data-testid="dragonbones-motion-analysis"
        >
          {motionAnalysisError
            ? motionAnalysisError
            : motionAnalysis && (
                <>
                  <div>
                    最大区域: x={motionAnalysis.bounds.x.toFixed(2)} y=
                    {motionAnalysis.bounds.y.toFixed(2)} w={motionAnalysis.bounds.width.toFixed(2)}{' '}
                    h=
                    {motionAnalysis.bounds.height.toFixed(2)}
                  </div>
                  <div>
                    建议 canvas: {motionAnalysis.viewport.width}x{motionAnalysis.viewport.height}；
                    offsetX={motionAnalysis.viewport.offsetX} offsetY=
                    {motionAnalysis.viewport.offsetY}
                  </div>
                  <div>
                    建议安全区: left={motionAnalysis.requiredPadding.left} top=
                    {motionAnalysis.requiredPadding.top} right=
                    {motionAnalysis.requiredPadding.right} bottom=
                    {motionAnalysis.requiredPadding.bottom}
                  </div>
                  <div>
                    动画: {motionAnalysis.animationName}；帧数: {motionAnalysis.frameCount}
                  </div>
                </>
              )}
        </div>
      )}
    </section>
  );
}
