import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import {
  exportRegionBitmapFromImageMap,
  parseSpineAtlas,
  parseSpineJson,
  resolveSlotAttachment,
  resolveSlotRegionDescriptor,
  type SpineRegionBitmapExport,
  type SpineSlotAttachmentInfo,
  type SpineSlotRegionDescriptor,
} from '@/shared/components/spine-player/spine-slot-preview';
import { loadSpineDecodedAssets } from '@/shared/components/spine-player/spine-asset-loader';
import {
  parseSpineZipBytes,
  resolveSpineTextureEntryPath,
} from '@/shared/components/spine-player/spine-zip';
import SpinePlayerWebGl, {
  loadSpineRuntimeScript,
  type SpinePlayerHandle,
} from '@/shared/components/spine-player/SpinePlayerWebGl';

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  KJT_AP_DRAW_SLOT_NAMES,
  SPINE_RUNTIME_URL,
  isKjtApDrawSample,
  shouldShowComparisonPanel,
  type SpineAsset,
} from './spineToolConfig';
import {
  buildKjtApDrawValidationReport,
  type KjtApDrawSlotKey,
  type KjtApDrawValidationReport,
} from './kjtApDrawValidation';

type PlayerStatus = 'loading' | 'ready' | 'error';
type ValidationStatus = 'idle' | 'loading' | 'ready' | 'error';
type ValidationSampleRole = 'kjt-ap-draw-spine' | 'generic-spine';

type ZipIssue = {
  level: 'warning' | 'error';
  message: string;
};

type ZipDiagnostics = {
  atlasFile: string;
  jsonFile: string;
  textureFiles: string[];
  ignoredFiles: string[];
  issues: ZipIssue[];
};

type LoadedZipAssets = {
  atlasText: string;
  atlas: ReturnType<typeof parseSpineAtlas>;
  jsonText: string;
  spineJson: ReturnType<typeof parseSpineJson>;
  imageMap: Map<string, HTMLImageElement>;
  backgroundImageUrl: string;
  cleanup: () => void;
  diagnostics: ZipDiagnostics;
};

type RuntimeContext = {
  animationState: {
    setAnimation: (track: number, animationName: string, loop: boolean) => void;
    update: (delta: number) => void;
    apply: (skeleton: unknown) => void;
  };
  skeleton: {
    updateWorldTransform: () => void;
  };
  renderer: {
    begin: () => void;
    drawSkeleton: (skeleton: unknown, premultipliedAlpha: boolean) => void;
    end: () => void;
    camera?: {
      setViewport?: (width: number, height: number) => void;
      update?: () => void;
    };
  };
  gl: WebGLRenderingContext;
  cleanup: () => void;
};

type SlotSummary = {
  slotName: KjtApDrawSlotKey;
  attachment: SpineSlotAttachmentInfo | null;
  descriptor: SpineSlotRegionDescriptor | null;
  previewUrl: string;
  maskExport: SpineRegionBitmapExport | null;
  error: string | null;
};

type TemplateValidationState = {
  status: ValidationStatus;
  sampleRole: ValidationSampleRole;
  report: KjtApDrawValidationReport | null;
  slotSummaries: SlotSummary[];
  errors: string[];
};

type SpineRuntime = {
  TextureAtlas: new (
    atlasText: string,
    textureLoader: (path: string) => unknown,
  ) => Record<string, unknown>;
  AtlasAttachmentLoader: new (atlas: Record<string, unknown>) => Record<string, unknown>;
  SkeletonJson: new (loader: Record<string, unknown>) => {
    readSkeletonData: (jsonText: string) => {
      x: number;
      y: number;
      width: number;
      height: number;
      animations: Array<{ name: string }>;
    };
  };
  Skeleton: new (data: { x: number; y: number; width: number; height: number }) => {
    scaleX: number;
    scaleY: number;
    x: number;
    y: number;
    setToSetupPose: () => void;
    updateWorldTransform: () => void;
  };
  AnimationStateData: new (data: unknown) => Record<string, unknown>;
  AnimationState: new (data: Record<string, unknown>) => {
    setAnimation: (track: number, animationName: string, loop: boolean) => void;
    update: (delta: number) => void;
    apply: (skeleton: unknown) => void;
  };
  webgl?: {
    ManagedWebGLRenderingContext: new (
      canvas: HTMLCanvasElement,
      options?: Record<string, unknown>,
    ) => {
      gl: WebGLRenderingContext;
    };
    SceneRenderer: new (
      canvas: HTMLCanvasElement,
      managedContext: { gl: WebGLRenderingContext },
      twoColorTint?: boolean,
    ) => {
      begin: () => void;
      drawSkeleton: (skeleton: unknown, premultipliedAlpha: boolean) => void;
      end: () => void;
      camera?: {
        setViewport?: (width: number, height: number) => void;
        update?: () => void;
      };
    };
    GLTexture: new (
      managedContext: { gl: WebGLRenderingContext },
      image: HTMLImageElement,
      useMipMaps?: boolean,
    ) => unknown;
  };
};

declare global {
  interface Window {
    spine?: SpineRuntime;
  }
}

async function loadAssetsFromZip(zipUrl: string): Promise<LoadedZipAssets> {
  const response = await fetch(zipUrl);

  if (!response.ok) {
    throw new Error(`zip fetch failed: ${response.status} ${response.statusText}`);
  }

  const zipBytes = new Uint8Array(await response.arrayBuffer());
  const zipBundle = parseSpineZipBytes(zipBytes);
  const decodedAssets = await loadSpineDecodedAssets(zipBundle);
  const issues: ZipIssue[] = [];

  if (zipBundle.ignoredEntries.length > 0) {
    issues.push({
      level: 'warning',
      message: `检测到打包污染文件：${zipBundle.ignoredEntries.join(', ')}`,
    });
  }

  const atlas = parseSpineAtlas(decodedAssets.atlasText);
  const spineJson = parseSpineJson(decodedAssets.jsonText);

  return {
    atlasText: decodedAssets.atlasText,
    atlas,
    jsonText: decodedAssets.jsonText,
    spineJson,
    imageMap: decodedAssets.imageMap,
    backgroundImageUrl: decodedAssets.backgroundImageUrl,
    cleanup: decodedAssets.cleanup,
    diagnostics: {
      atlasFile: zipBundle.atlasEntry.entryPath,
      jsonFile: zipBundle.jsonEntry.entryPath,
      textureFiles: zipBundle.textureEntries.map((entry) => entry.entryPath),
      ignoredFiles: zipBundle.ignoredEntries,
      issues,
    },
  };
}

function createRuntimeContext(
  canvas: HTMLCanvasElement,
  runtime: SpineRuntime,
  loadedAssets: LoadedZipAssets,
): { context: RuntimeContext; animationNames: string[] } {
  const ManagedContext = runtime.webgl?.ManagedWebGLRenderingContext;
  const SceneRenderer = runtime.webgl?.SceneRenderer;
  const GLTexture = runtime.webgl?.GLTexture;

  if (!ManagedContext || !SceneRenderer || !GLTexture) {
    throw new Error('runtime 缺少 webgl 渲染能力');
  }

  const managedContext = new ManagedContext(canvas, { alpha: true });
  const renderer = new SceneRenderer(canvas, managedContext, false);
  const atlas = new runtime.TextureAtlas(loadedAssets.atlasText, (path: string) => {
    const resolvedPath = resolveSpineTextureEntryPath(path, [...loadedAssets.imageMap.keys()]);
    const image = resolvedPath ? (loadedAssets.imageMap.get(resolvedPath) ?? null) : null;

    if (!image) {
      throw new Error(`atlas 引用纹理不存在: ${path}`);
    }

    return new GLTexture(managedContext, image, false);
  });
  const loader = new runtime.AtlasAttachmentLoader(atlas);
  const skeletonJson = new runtime.SkeletonJson(loader);
  const skeletonData = skeletonJson.readSkeletonData(loadedAssets.jsonText);
  const animationNames = skeletonData.animations.map((item) => item.name);

  if (animationNames.length === 0) {
    throw new Error('骨骼文件中没有可播放动画');
  }

  const skeleton = new runtime.Skeleton(skeletonData);
  const stateData = new runtime.AnimationStateData(skeletonData);
  const animationState = new runtime.AnimationState(stateData);
  const scale = Math.min(
    canvas.width / Math.max(skeletonData.width, 1),
    canvas.height / Math.max(skeletonData.height, 1),
  );
  const centerX = skeletonData.x + skeletonData.width / 2;
  const centerY = skeletonData.y + skeletonData.height / 2;

  skeleton.scaleX = scale;
  skeleton.scaleY = scale;
  skeleton.x = -centerX * scale;
  skeleton.y = -centerY * scale;
  skeleton.setToSetupPose();
  skeleton.updateWorldTransform();

  managedContext.gl.viewport(0, 0, canvas.width, canvas.height);
  renderer.camera?.setViewport?.(canvas.width, canvas.height);
  renderer.camera?.update?.();

  const context: RuntimeContext = {
    animationState,
    skeleton,
    renderer,
    gl: managedContext.gl,
    cleanup: () => {},
  };

  return { context, animationNames };
}

function getValidationSampleRole(assetId: string): ValidationSampleRole {
  return isKjtApDrawSample(assetId) ? 'kjt-ap-draw-spine' : 'generic-spine';
}

function createEmptySlotSummary(
  slotName: KjtApDrawSlotKey,
  error: string | null = null,
): SlotSummary {
  return {
    slotName,
    attachment: null,
    descriptor: null,
    previewUrl: '',
    maskExport: null,
    error,
  };
}

function createInitialTemplateValidationState(assetId: string): TemplateValidationState {
  const sampleRole = getValidationSampleRole(assetId);

  return {
    status: 'idle',
    sampleRole,
    report: null,
    slotSummaries:
      sampleRole === 'kjt-ap-draw-spine'
        ? KJT_AP_DRAW_SLOT_NAMES.map((slotName) => createEmptySlotSummary(slotName))
        : [],
    errors: [],
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function SpineRuntimeCard({ asset }: { asset: SpineAsset }) {
  const isCount2Asset = shouldShowComparisonPanel(asset.id);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<RuntimeContext | null>(null);
  const sharedPlayerRef = useRef<SpinePlayerHandle | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const loadedAssetsRef = useRef<LoadedZipAssets | null>(null);
  const loadedAssetsPromiseRef = useRef<Promise<LoadedZipAssets> | null>(null);
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [animationNames, setAnimationNames] = useState<string[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState('');
  const [diagnostics, setDiagnostics] = useState<ZipDiagnostics | null>(null);
  const [templateValidation, setTemplateValidation] = useState<TemplateValidationState>(() =>
    createInitialTemplateValidationState(asset.id),
  );

  const canPlay = useMemo(
    () => status === 'ready' && currentAnimation !== '',
    [status, currentAnimation],
  );

  function releaseLoadedAssets() {
    loadedAssetsRef.current?.cleanup();
    loadedAssetsRef.current = null;
    loadedAssetsPromiseRef.current = null;
  }

  function ensureLoadedAssets() {
    if (loadedAssetsRef.current) {
      return Promise.resolve(loadedAssetsRef.current);
    }

    if (loadedAssetsPromiseRef.current) {
      return loadedAssetsPromiseRef.current;
    }

    let task: Promise<LoadedZipAssets>;
    task = loadAssetsFromZip(asset.zipUrl)
      .then((loadedAssets) => {
        loadedAssetsRef.current = loadedAssets;

        return loadedAssets;
      })
      .catch((loadError) => {
        if (loadedAssetsPromiseRef.current === task) {
          loadedAssetsPromiseRef.current = null;
        }

        throw loadError;
      });

    loadedAssetsPromiseRef.current = task;

    return task;
  }

  useEffect(() => {
    return () => {
      releaseLoadedAssets();
    };
  }, [asset.zipUrl]);

  useEffect(() => {
    let disposed = false;

    const stopLoop = () => {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };

    const releasePlayer = () => {
      playerRef.current?.cleanup();
      playerRef.current = null;
    };

    const playLoop = (timestamp: number) => {
      if (disposed || !playerRef.current) {
        return;
      }

      const deltaSeconds = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      const runtimeContext = playerRef.current;

      runtimeContext.animationState.update(deltaSeconds);
      runtimeContext.animationState.apply(runtimeContext.skeleton);
      runtimeContext.skeleton.updateWorldTransform();
      runtimeContext.gl.clearColor(0, 0, 0, 0);
      runtimeContext.gl.clear(runtimeContext.gl.COLOR_BUFFER_BIT);
      runtimeContext.renderer.begin();
      runtimeContext.renderer.drawSkeleton(runtimeContext.skeleton, false);
      runtimeContext.renderer.end();

      rafRef.current = window.requestAnimationFrame(playLoop);
    };

    const bootstrap = async () => {
      const canvas =
        canvasRef.current ??
        (isCount2Asset
          ? Object.assign(document.createElement('canvas'), {
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
            })
          : null);

      if (!canvas) {
        return;
      }

      setStatus('loading');
      setError(null);
      setAnimationNames([]);
      setCurrentAnimation('');
      setDiagnostics(null);

      try {
        await loadSpineRuntimeScript(SPINE_RUNTIME_URL);

        if (disposed) {
          return;
        }

        const runtime = window.spine;

        if (!runtime) {
          throw new Error('window.spine 不存在');
        }

        const loadedAssets = await ensureLoadedAssets();
        setDiagnostics(loadedAssets.diagnostics);

        if (disposed) {
          return;
        }

        const { context, animationNames: names } = createRuntimeContext(
          canvas,
          runtime,
          loadedAssets,
        );

        releasePlayer();
        playerRef.current = context;

        const initialAnimation = names[0] ?? '';
        context.animationState.setAnimation(0, initialAnimation, false);
        setAnimationNames(names);
        setCurrentAnimation(initialAnimation);
        setStatus('ready');

        lastTimeRef.current = performance.now();
        rafRef.current = window.requestAnimationFrame(playLoop);
      } catch (err) {
        releasePlayer();
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    bootstrap();

    return () => {
      disposed = true;
      stopLoop();
      releasePlayer();
    };
  }, [asset.zipUrl, isCount2Asset]);

  useEffect(() => {
    let disposed = false;

    if (!isKjtApDrawSample(asset.id)) {
      setTemplateValidation(createInitialTemplateValidationState(asset.id));

      return () => {
        disposed = true;
      };
    }

    const buildTemplateValidation = async () => {
      setTemplateValidation({
        status: 'loading',
        sampleRole: 'kjt-ap-draw-spine',
        report: null,
        slotSummaries: KJT_AP_DRAW_SLOT_NAMES.map((slotName) => createEmptySlotSummary(slotName)),
        errors: [],
      });

      try {
        const loadedAssets = await ensureLoadedAssets();
        const animationNames = Object.keys(loadedAssets.spineJson.animations ?? {});

        if (disposed) {
          return;
        }

        const slotDescriptors: Partial<Record<KjtApDrawSlotKey, SpineSlotAttachmentInfo>> = {};
        const previewableSlots: KjtApDrawSlotKey[] = [];
        const maskReadySlots: KjtApDrawSlotKey[] = [];
        const errors: string[] = [];
        const slotSummaries: SlotSummary[] = [];

        for (const slotName of KJT_AP_DRAW_SLOT_NAMES) {
          if (disposed) {
            return;
          }

          try {
            const attachment = resolveSlotAttachment(loadedAssets.spineJson, slotName);
            slotDescriptors[slotName] = attachment;

            let previewUrl = '';
            let maskExport: SpineRegionBitmapExport | null = null;
            let slotError: string | null = null;
            let descriptor: SpineSlotRegionDescriptor | null = null;

            if (attachment.attachmentType !== 'region') {
              slotError = `Spine slot \"${slotName}\" attachment \"${attachment.attachmentName}\" type \"${attachment.attachmentType}\" is unsupported`;
              errors.push(slotError);
            } else {
              descriptor = resolveSlotRegionDescriptor(
                loadedAssets.spineJson,
                loadedAssets.atlas,
                slotName,
              );

              if (slotName === 'draw') {
                try {
                  maskExport = exportRegionBitmapFromImageMap(loadedAssets.imageMap, descriptor);
                  maskReadySlots.push(slotName);
                } catch (slotPreviewError) {
                  slotError = `draw mask 位图导出失败: ${getErrorMessage(slotPreviewError)}`;
                  errors.push(slotError);
                }
              } else {
                try {
                  previewUrl = exportRegionBitmapFromImageMap(
                    loadedAssets.imageMap,
                    descriptor,
                  ).dataUrl;
                  previewableSlots.push(slotName);
                } catch (slotPreviewError) {
                  slotError = `${slotName} 预览生成失败: ${getErrorMessage(slotPreviewError)}`;
                  errors.push(slotError);
                }
              }
            }

            slotSummaries.push({
              slotName,
              attachment,
              descriptor,
              previewUrl,
              maskExport,
              error: slotError,
            });
          } catch (slotError) {
            const message = getErrorMessage(slotError);
            errors.push(message);
            slotSummaries.push(createEmptySlotSummary(slotName, message));
          }
        }

        const report = buildKjtApDrawValidationReport({
          animationNames,
          slotDescriptors,
          previewableSlots,
          maskReadySlots,
        });

        if (!disposed) {
          setTemplateValidation({
            status: 'ready',
            sampleRole: 'kjt-ap-draw-spine',
            report,
            slotSummaries,
            errors,
          });
        }
      } catch (validationError) {
        const message = getErrorMessage(validationError);

        if (!disposed) {
          setTemplateValidation({
            status: 'error',
            sampleRole: 'kjt-ap-draw-spine',
            report: buildKjtApDrawValidationReport({
              animationNames: [],
              slotDescriptors: {},
              previewableSlots: [],
              maskReadySlots: [],
            }),
            slotSummaries: KJT_AP_DRAW_SLOT_NAMES.map((slotName) =>
              createEmptySlotSummary(slotName, message),
            ),
            errors: [message],
          });
        }
      }
    };

    void buildTemplateValidation();

    return () => {
      disposed = true;
    };
  }, [asset.id, asset.zipUrl]);

  return (
    <article style={cardStyle} data-status={status}>
      <div style={cardHeaderStyle}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#5a2508' }}>{asset.title}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(90, 37, 8, 0.72)' }}>
            {asset.fileName}
          </div>
        </div>
        <span style={statusStyle(status)}>{statusLabel(status)}</span>
      </div>

      {isCount2Asset ? (
        <div style={comparisonGridStyle}>
          <section>
            <div style={panelTitleStyle}>project spine-player</div>
            <div style={panelStyle}>
              <SpinePlayerWebGl
                ref={sharedPlayerRef}
                zipUrl={asset.zipUrl}
                runtimeUrl={SPINE_RUNTIME_URL}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                defaultAnimationName={currentAnimation || undefined}
                autoPlay
                loop={false}
                fitMode="content"
                style={sharedPanelPlayerStyle}
              />
            </div>
          </section>
        </div>
      ) : (
        <div style={panelStyle}>
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={canvasStyle} />
        </div>
      )}

      <div style={toolbarStyle}>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => {
            if (!playerRef.current || !currentAnimation) {
              return;
            }

            playerRef.current.animationState.setAnimation(0, currentAnimation, false);
            sharedPlayerRef.current?.play(currentAnimation || undefined, false);
          }}
          disabled={!canPlay}
        >
          重新播放
        </button>
      </div>

      {animationNames.length > 0 ? (
        <div style={animationListStyle}>
          {animationNames.map((name) => (
            <button
              key={name}
              type="button"
              style={name === currentAnimation ? activeAnimButtonStyle : animButtonStyle}
              onClick={() => {
                if (!playerRef.current) {
                  return;
                }

                playerRef.current.animationState.setAnimation(0, name, false);
                sharedPlayerRef.current?.play(name, false);
                setCurrentAnimation(name);
              }}
              disabled={status !== 'ready'}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      <div style={metaStyle}>
        <div>zip: {asset.zipUrl}</div>
        <div>current: {currentAnimation || '-'}</div>
        <div>animations: {animationNames.length}</div>
        <div>atlas: {diagnostics?.atlasFile ?? '-'}</div>
        <div>json: {diagnostics?.jsonFile ?? '-'}</div>
        <div>textures: {diagnostics?.textureFiles.join(', ') || '-'}</div>
      </div>

      {diagnostics?.issues.length ? (
        <div style={warningBoxStyle}>
          {diagnostics.issues.map((issue) => (
            <div key={issue.message}>资源诊断：{issue.message}</div>
          ))}
        </div>
      ) : null}

      {templateValidation.sampleRole === 'kjt-ap-draw-spine' ? (
        <section style={validationPanelStyle}>
          <div style={sectionTitleStyle}>KJT_AP_DRAW_v2 模板契约检查</div>

          {templateValidation.report ? (
            <>
              <div style={summaryBadgeStyle(templateValidation.report.pass)}>
                {templateValidation.report.summary}
              </div>

              <div style={checkListStyle}>
                {templateValidation.report.checks.map((check) => (
                  <div key={check.key} style={checkRowStyle(check.pass)}>
                    <strong>{check.label}</strong>
                    <span>{check.pass ? '通过' : check.reason}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={validationPendingStyle}>正在解析 draw / draw2 / draw3 模板契约…</div>
          )}

          <div style={slotGridStyle}>
            {templateValidation.slotSummaries.map((slot) => {
              const slotReady =
                slot.slotName === 'draw' ? slot.maskExport !== null : Boolean(slot.previewUrl);

              return (
                <article key={slot.slotName} style={slotCardStyle}>
                  <div style={slotCardHeaderStyle}>
                    <strong style={{ fontSize: 15, color: '#5a2508' }}>{slot.slotName}</strong>
                    <span style={slotBadgeStyle(slotReady)}>
                      {slot.slotName === 'draw'
                        ? slot.maskExport
                          ? 'mask ready'
                          : 'mask missing'
                        : slot.previewUrl
                          ? 'preview ready'
                          : 'preview missing'}
                    </span>
                  </div>

                  <div style={slotMetaStyle}>
                    <div>attachment: {slot.attachment?.attachmentName ?? '-'}</div>
                    <div>type: {slot.attachment?.attachmentType ?? '-'}</div>
                    <div>region: {slot.descriptor?.regionName ?? '-'}</div>
                    <div>image: {slot.descriptor?.imageName ?? '-'}</div>
                    <div>
                      offset:{' '}
                      {slot.descriptor
                        ? `${slot.descriptor.offsetX}, ${slot.descriptor.offsetY}`
                        : '-'}
                    </div>
                  </div>

                  {slot.slotName === 'draw' ? (
                    slot.maskExport ? (
                      <>
                        <div style={slotStatusTextStyle}>用于 mask 的源图片</div>
                        <img
                          src={slot.maskExport.dataUrl}
                          alt={`${slot.slotName} mask source`}
                          style={slotPreviewImageStyle}
                        />
                        <div style={slotStatusTextStyle}>
                          {`mask bitmap: ${slot.maskExport.width} x ${slot.maskExport.height}, offset: ${slot.maskExport.offsetX}, ${slot.maskExport.offsetY}`}
                        </div>
                      </>
                    ) : (
                      <div style={slotStatusTextStyle}>未导出 mask 位图与偏移</div>
                    )
                  ) : slot.previewUrl ? (
                    <img
                      src={slot.previewUrl}
                      alt={`${slot.slotName} preview`}
                      style={slotPreviewImageStyle}
                    />
                  ) : (
                    <div style={slotStatusTextStyle}>未生成缩略图预览</div>
                  )}

                  {slot.error ? <div style={slotErrorStyle}>{slot.error}</div> : null}
                </article>
              );
            })}
          </div>

          {templateValidation.errors.length > 0 ? (
            <div style={validationErrorBoxStyle}>
              {templateValidation.errors.map((item) => (
                <div key={item}>校验失败原因：{item}</div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? <div style={errorStyle}>加载失败：{error}</div> : null}
    </article>
  );
}

function statusLabel(status: PlayerStatus) {
  if (status === 'loading') {
    return '加载中';
  }

  if (status === 'ready') {
    return '显示正常';
  }

  return '加载失败';
}

function statusStyle(status: PlayerStatus): CSSProperties {
  if (status === 'ready') {
    return { ...badgeStyle, background: 'rgba(17, 101, 55, 0.12)', color: '#116537' };
  }

  if (status === 'error') {
    return { ...badgeStyle, background: 'rgba(162, 29, 44, 0.12)', color: '#a21d2c' };
  }

  return { ...badgeStyle, background: 'rgba(123, 52, 18, 0.12)', color: '#7b3412' };
}

function summaryBadgeStyle(pass: boolean): CSSProperties {
  return {
    ...badgeStyle,
    display: 'inline-flex',
    alignItems: 'center',
    background: pass ? 'rgba(17, 101, 55, 0.12)' : 'rgba(162, 29, 44, 0.12)',
    color: pass ? '#116537' : '#a21d2c',
    marginTop: 10,
  };
}

function checkRowStyle(pass: boolean): CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 10px',
    borderRadius: 10,
    background: pass ? 'rgba(17, 101, 55, 0.06)' : 'rgba(162, 29, 44, 0.08)',
    color: pass ? '#116537' : '#7b3412',
    fontSize: 12,
    lineHeight: 1.5,
  };
}

function slotBadgeStyle(pass: boolean): CSSProperties {
  return {
    ...badgeStyle,
    background: pass ? 'rgba(17, 101, 55, 0.12)' : 'rgba(162, 29, 44, 0.12)',
    color: pass ? '#116537' : '#a21d2c',
  };
}

const cardStyle: CSSProperties = {
  borderRadius: 20,
  padding: 18,
  background: 'rgba(255, 252, 248, 0.92)',
  boxShadow: '0 14px 32px rgba(116, 41, 0, 0.12)',
};

const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
  marginBottom: 12,
};

const panelStyle: CSSProperties = {
  borderRadius: 16,
  padding: 12,
  background: 'rgba(255, 255, 255, 0.82)',
  boxShadow: '0 12px 28px rgba(116, 41, 0, 0.15)',
};

const comparisonGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 12,
};

const panelTitleStyle: CSSProperties = {
  marginBottom: 8,
  fontSize: 12,
  fontWeight: 700,
  color: 'rgba(90, 37, 8, 0.78)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const canvasStyle: CSSProperties = {
  display: 'block',
  borderRadius: 12,
  background: 'rgba(255, 255, 255, 0.45)',
};

const sharedPanelPlayerStyle: CSSProperties = {
  width: CANVAS_WIDTH,
  maxWidth: '100%',
  margin: '0 auto',
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginTop: 14,
};

const buttonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 10,
  background: '#7b3412',
  color: '#ffffff',
  padding: '8px 14px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
};

const badgeStyle: CSSProperties = {
  borderRadius: 999,
  padding: '5px 10px',
  fontSize: 12,
  fontWeight: 700,
};

const animationListStyle: CSSProperties = {
  marginTop: 12,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  maxWidth: '100%',
};

const animButtonStyle: CSSProperties = {
  border: '1px solid rgba(123, 52, 18, 0.35)',
  borderRadius: 999,
  background: '#fffefc',
  color: '#7b3412',
  padding: '6px 12px',
  fontSize: 12,
  cursor: 'pointer',
};

const activeAnimButtonStyle: CSSProperties = {
  ...animButtonStyle,
  background: '#7b3412',
  color: '#ffffff',
  borderColor: '#7b3412',
};

const metaStyle: CSSProperties = {
  marginTop: 12,
  fontSize: 12,
  color: 'rgba(90, 37, 8, 0.72)',
  lineHeight: 1.6,
};

const errorStyle: CSSProperties = {
  color: '#a21d2c',
  marginTop: 12,
  fontSize: 12,
  lineHeight: 1.5,
};

const warningBoxStyle: CSSProperties = {
  marginTop: 12,
  borderRadius: 12,
  padding: '10px 12px',
  background: 'rgba(180, 79, 22, 0.08)',
  color: '#7b3412',
  fontSize: 12,
  lineHeight: 1.6,
};

const validationPanelStyle: CSSProperties = {
  marginTop: 14,
  borderRadius: 16,
  padding: 14,
  background: 'rgba(255, 255, 255, 0.84)',
  boxShadow: 'inset 0 0 0 1px rgba(123, 52, 18, 0.08)',
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#5a2508',
};

const validationPendingStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  color: 'rgba(90, 37, 8, 0.72)',
};

const checkListStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  marginTop: 10,
};

const slotGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 10,
  marginTop: 12,
};

const slotCardStyle: CSSProperties = {
  borderRadius: 12,
  padding: 10,
  background: 'rgba(123, 52, 18, 0.04)',
};

const slotCardHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
};

const slotMetaStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 11,
  lineHeight: 1.6,
  color: 'rgba(90, 37, 8, 0.78)',
};

const slotPreviewImageStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 8,
  borderRadius: 10,
  background: '#fffaf4',
  objectFit: 'contain',
  aspectRatio: '1 / 1',
};

const slotStatusTextStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 11,
  lineHeight: 1.5,
  color: '#7b3412',
};

const slotErrorStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 11,
  lineHeight: 1.5,
  color: '#a21d2c',
};

const validationErrorBoxStyle: CSSProperties = {
  marginTop: 12,
  borderRadius: 12,
  padding: '10px 12px',
  background: 'rgba(162, 29, 44, 0.08)',
  color: '#7b3412',
  fontSize: 12,
  lineHeight: 1.6,
};
