import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import DragonBonesPlayer from '@/shared/components/dragonbones-player';
import type { DragonBonesHandle } from '@/shared/components/dragonbones-player';
import { DEFAULT_ARMATURE, pickInitialArmature } from './armatureSelection';
import {
  mergeFrameExportBounds,
  resolveOriginalContentViewport,
  type FrameExportBounds,
} from './frameExportLogic';

const PREVIEW_SIZE = 300;
const EXPORT_PADDING = 8;
const EXPORT_ASSET_URL = new URL('./assets/skeleton.zip', import.meta.url).href;

type ExportFrame = {
  index: number;
  src: string;
  width: number;
  height: number;
};

type ExportStatus = 'loading' | 'ready' | 'generating' | 'done' | 'error';

type ZipSource = {
  url: string;
  label: string;
  isObjectUrl: boolean;
};

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: '24px',
  color: '#352111',
  fontFamily: 'Primer Print, heiti, sans-serif',
  background: 'linear-gradient(135deg, #fff8ee 0%, #ffd8b8 48%, #ff9f66 100%)',
};

const cardStyle: CSSProperties = {
  borderRadius: 20,
  padding: 18,
  background: 'rgba(255, 255, 255, 0.82)',
  boxShadow: '0 16px 36px rgba(116, 41, 0, 0.14)',
};

const buttonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 999,
  padding: '9px 14px',
  background: '#ff7c42',
  color: '#fffaf3',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1,
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: '#fff3e9',
  color: '#b44f16',
  border: '1px solid rgba(221, 108, 48, 0.22)',
};

function toAnimationList(raw: string[]) {
  return [...new Set(raw.map((name) => String(name)).filter(Boolean))];
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function isZipFile(file: File) {
  return file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip';
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function fitLiveCanvasToPreview(player: DragonBonesHandle, width: number, height: number) {
  const canvas = player.getCanvas();

  if (!canvas) {
    return;
  }

  const scale = Math.min(PREVIEW_SIZE / width, PREVIEW_SIZE / height, 1);
  canvas.style.width = `${Math.round(width * scale)}px`;
  canvas.style.height = `${Math.round(height * scale)}px`;
}

async function measureAnimationContentBounds(
  player: DragonBonesHandle,
  animationName: string,
  frameCount: number,
) {
  const boundsList: FrameExportBounds[] = [];

  player.setDisplayTransform({ x: 0, y: 0, scale: 1 });

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    player.gotoAndStopByFrame(animationName, frameIndex);
    await nextFrame();
    player.renderCurrentFrame();

    const bounds = player.measureCurrentBounds();

    if (bounds && bounds.width > 0 && bounds.height > 0) {
      boundsList.push(bounds);
    }
  }

  return mergeFrameExportBounds(boundsList);
}

export default function FrameExportPage({ mainUrl }: { mainUrl: string }) {
  const playerRef = useRef<DragonBonesHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef('');
  const [status, setStatus] = useState<ExportStatus>('loading');
  const [errorText, setErrorText] = useState('');
  const [armatureList, setArmatureList] = useState<string[]>([]);
  const [currentArmature, setCurrentArmature] = useState(DEFAULT_ARMATURE);
  const [animationList, setAnimationList] = useState<string[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState('');
  const [frames, setFrames] = useState<ExportFrame[]>([]);
  const [metaText, setMetaText] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [zipSource, setZipSource] = useState<ZipSource>({
    url: EXPORT_ASSET_URL,
    label: 'assets/skeleton.zip',
    isObjectUrl: false,
  });

  const pageTitle = useMemo(() => {
    if (status === 'generating') {
      return '正在生成逐帧图片';
    }

    if (status === 'done') {
      return `已生成 ${frames.length} 张逐帧图片`;
    }

    return '动画转图片';
  }, [frames.length, status]);

  const syncArmatures = () => {
    const discoveredArmatures = playerRef.current?.getArmatureNames() ?? [];

    if (discoveredArmatures.length === 0) {
      return false;
    }

    setArmatureList(discoveredArmatures);

    if (discoveredArmatures.includes(currentArmature)) {
      return false;
    }

    setCurrentArmature(
      pickInitialArmature({
        discoveredArmatures,
        preferredArmatures: [DEFAULT_ARMATURE],
      }),
    );
    return true;
  };

  const resetRuntimeState = () => {
    setStatus('loading');
    setFrames([]);
    setArmatureList([]);
    setAnimationList([]);
    setCurrentAnimation('');
    setMetaText('');
    setErrorText('');
  };

  const useZipFile = (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!isZipFile(file)) {
      setStatus('error');
      setErrorText('请选择或拖入 .zip 格式的 DragonBones 动画文件');
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;

    resetRuntimeState();
    setCurrentArmature(DEFAULT_ARMATURE);
    setZipSource({
      url: objectUrl,
      label: file.name,
      isObjectUrl: true,
    });
  };

  const resetToSampleZip = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }

    resetRuntimeState();
    setCurrentArmature(DEFAULT_ARMATURE);
    setZipSource({
      url: EXPORT_ASSET_URL,
      label: 'assets/skeleton.zip',
      isObjectUrl: false,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateFrames = async (animationName = currentAnimation) => {
    const player = playerRef.current;

    if (!player || !animationName) {
      return;
    }

    const meta = player.getAnimationMeta(animationName);
    const frameCount = meta?.frameCount ?? 0;

    if (frameCount <= 0) {
      setStatus('error');
      setErrorText(`无法读取动画 ${animationName} 的帧数`);
      return;
    }

    setStatus('generating');
    setErrorText('');
    setFrames([]);
    setMetaText(
      `正在测量动画内容范围；动画 ${animationName}；帧率 ${meta?.frameRate ?? '-'}；总帧 ${frameCount}；时长 ${meta?.duration.toFixed(3) ?? '-'}s`,
    );

    try {
      const bounds = await measureAnimationContentBounds(player, animationName, frameCount);

      if (!bounds) {
        throw new Error(`无法测量动画 ${animationName} 的内容范围`);
      }

      const viewport = resolveOriginalContentViewport(bounds, EXPORT_PADDING);

      player.resizeCanvas(viewport.width, viewport.height);
      player.setDisplayTransform({
        x: viewport.offsetX,
        y: viewport.offsetY,
        scale: 1,
      });
      fitLiveCanvasToPreview(player, viewport.width, viewport.height);

      setMetaText(
        `输出 ${viewport.width}×${viewport.height}；内容 x=${formatNumber(bounds.x)} y=${formatNumber(
          bounds.y,
        )} w=${formatNumber(bounds.width)} h=${formatNumber(bounds.height)}；padding ${EXPORT_PADDING}px；动画 ${animationName}；帧率 ${
          meta?.frameRate ?? '-'
        }；总帧 ${frameCount}；时长 ${meta?.duration.toFixed(3) ?? '-'}s`,
      );

      const nextFrames: ExportFrame[] = [];

      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        player.gotoAndStopByFrame(animationName, frameIndex);
        await nextFrame();
        player.renderCurrentFrame();

        const canvas = player.getCanvas();

        if (!canvas) {
          throw new Error('未找到 DragonBones 渲染 canvas');
        }

        nextFrames.push({
          index: frameIndex,
          src: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height,
        });
      }

      setFrames(nextFrames);
      setStatus('done');
      player.play(animationName, true);
    } catch (error) {
      setStatus('error');
      setErrorText(error instanceof Error ? error.message : '逐帧图片生成失败');
    }
  };

  useEffect(() => {
    resetRuntimeState();
  }, [currentArmature, zipSource.url]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  return (
    <div style={pageStyle} data-testid="dragonbones-frame-export-root">
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 18 }}>
        <header style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', color: '#9b4b1c' }}>
            DRAGONBONES TOOL / FRAME EXPORT
          </div>
          <h1 style={{ margin: '8px 0 6px', fontSize: 34 }}>{pageTitle}</h1>
          <p style={{ margin: 0, maxWidth: 760, fontSize: 14, lineHeight: 1.7, color: '#6b4a2f' }}>
            通过 `feature=frame-export` 进入独立功能页。示例资源使用
            `src/pages/dragonbones-tool/assets/skeleton.zip`，也可以选择本地 zip 或直接拖入
            zip；页面先逐帧测量动画内容范围，再按原始内容尺寸导出 PNG。
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            <a href={mainUrl} style={{ ...secondaryButtonStyle, textDecoration: 'none' }}>
              返回工具首页
            </a>
            <button
              type="button"
              style={buttonStyle}
              disabled={status === 'loading' || status === 'generating' || !currentAnimation}
              onClick={() => generateFrames()}
            >
              重新生成图片
            </button>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => fileInputRef.current?.click()}
            >
              选择 zip 文件
            </button>
            {zipSource.isObjectUrl ? (
              <button type="button" style={secondaryButtonStyle} onClick={resetToSampleZip}>
                恢复示例文件
              </button>
            ) : null}
            <span style={{ ...secondaryButtonStyle, cursor: 'default' }}>
              输出尺寸: 动画内容原始尺寸
            </span>
          </div>
          <input
            ref={fileInputRef}
            data-testid="dragonbones-file-input"
            type="file"
            accept=".zip,application/zip"
            style={{ display: 'none' }}
            onChange={(event) => useZipFile(event.currentTarget.files?.[0])}
          />
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 420px) 1fr',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <aside style={cardStyle}>
            <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>动画预览</h2>
            <div
              data-testid="dragonbones-drop-zone"
              style={{
                marginBottom: 14,
                borderRadius: 16,
                padding: '18px 14px',
                border: `2px dashed ${isDraggingFile ? '#ff7c42' : 'rgba(180, 79, 22, 0.26)'}`,
                background: isDraggingFile
                  ? 'rgba(255, 124, 66, 0.12)'
                  : 'rgba(255, 250, 244, 0.72)',
                textAlign: 'center',
                color: '#7a5537',
                fontSize: 13,
                lineHeight: 1.6,
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
                setIsDraggingFile(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (event.currentTarget === event.target) {
                  setIsDraggingFile(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingFile(false);
                useZipFile(event.dataTransfer.files?.[0]);
              }}
            >
              <strong style={{ display: 'block', color: '#5a2508', fontSize: 15 }}>
                拖入 DragonBones zip
              </strong>
              支持 `texture.png`、`texture.json`、`skeleton.dbbin/json` 打包后的 zip。
            </div>
            <div
              style={{
                width: PREVIEW_SIZE,
                height: PREVIEW_SIZE,
                margin: '0 auto',
                borderRadius: 16,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.05) 75%), linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.05) 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 10px 10px',
                boxShadow: 'inset 0 0 0 1px rgba(120, 63, 28, 0.14)',
              }}
            >
              <DragonBonesPlayer
                key={`${zipSource.url}-${currentArmature}`}
                ref={playerRef}
                zipUrl={zipSource.url}
                armature={currentArmature}
                width={PREVIEW_SIZE}
                height={PREVIEW_SIZE}
                autoPlay={false}
                forceCanvas
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onReady={() => {
                  if (syncArmatures()) {
                    return;
                  }

                  const list = toAnimationList(playerRef.current?.getAnimationList() ?? []);
                  const firstAnimation = list[0] ?? '';

                  setStatus('ready');
                  setAnimationList(list);
                  setCurrentAnimation(firstAnimation);

                  if (firstAnimation) {
                    playerRef.current?.play(firstAnimation, true);
                    void generateFrames(firstAnimation);
                  }
                }}
                onError={(message) => {
                  if (syncArmatures()) {
                    return;
                  }

                  setStatus('error');
                  setErrorText(message);
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: 8, marginTop: 14, fontSize: 13, color: '#6b4a2f' }}>
              <span data-testid="dragonbones-source-label">source: {zipSource.label}</span>
              <span>armature: {currentArmature}</span>
              <span>animation: {currentAnimation || '-'}</span>
              <span>status: {status}</span>
              <span>{metaText || '等待动画数据...'}</span>
            </div>

            {armatureList.length > 1 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {armatureList.map((name) => (
                  <button
                    key={name}
                    type="button"
                    style={name === currentArmature ? buttonStyle : secondaryButtonStyle}
                    onClick={() => setCurrentArmature(name)}
                  >
                    {name.replace(/^armatures\//, '')}
                  </button>
                ))}
              </div>
            ) : null}

            {animationList.length > 1 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {animationList.map((name) => (
                  <button
                    key={name}
                    type="button"
                    style={name === currentAnimation ? buttonStyle : secondaryButtonStyle}
                    onClick={() => {
                      setCurrentAnimation(name);
                      playerRef.current?.play(name, true);
                      void generateFrames(name);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : null}

            {errorText ? (
              <div style={{ marginTop: 14, color: '#a21d2c', fontSize: 13, lineHeight: 1.5 }}>
                {errorText}
              </div>
            ) : null}
          </aside>

          <main style={cardStyle}>
            <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>逐帧 PNG</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
                gap: 12,
              }}
            >
              {frames.map((frame) => (
                <figure
                  key={frame.index}
                  style={{
                    margin: 0,
                    borderRadius: 14,
                    padding: 8,
                    background: '#fffaf3',
                    boxShadow: 'inset 0 0 0 1px rgba(120, 63, 28, 0.1)',
                  }}
                >
                  <img
                    data-testid="dragonbones-export-frame"
                    src={frame.src}
                    alt={`frame ${frame.index + 1}`}
                    width={frame.width}
                    height={frame.height}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                  <figcaption style={{ marginTop: 6, fontSize: 12, color: '#7a5537' }}>
                    frame {frame.index + 1} · {frame.width}×{frame.height}
                  </figcaption>
                </figure>
              ))}
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}
