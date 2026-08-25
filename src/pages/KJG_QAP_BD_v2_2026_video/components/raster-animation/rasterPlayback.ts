export type RasterRenderer = 'webm' | 'mov' | 'atlas';
export type RasterRendererPreference = RasterRenderer | 'auto' | 'broken-video';

export type RasterAtlas = {
  src: string;
  columns: number;
  rows: number;
  startFrame: number;
  frameCount: number;
};

export type RasterAction = {
  frameCount: number;
  duration: number;
  webm?: string;
  mov?: string;
  atlases?: readonly RasterAtlas[];
  still?: string;
};

export type RasterManifest = {
  version: number;
  asset: string;
  fps: number;
  canvas: { width: number; height: number };
  anchor: { x: number; y: number };
  actions: Record<string, RasterAction>;
};

export function selectRasterRenderer({
  preference,
  userAgent,
  canPlayWebm,
  canPlayMov,
}: {
  preference: RasterRendererPreference;
  userAgent: string;
  canPlayWebm: boolean;
  canPlayMov: boolean;
}): RasterRenderer {
  if (preference === 'webm' || preference === 'mov' || preference === 'atlas') {
    return preference;
  }

  const iosVersion = Number(userAgent.match(/OS (\d+)_/)?.[1] ?? 0);
  if (iosVersion > 0 && iosVersion < 13) {
    return 'atlas';
  }

  const isSafari = /Safari\//.test(userAgent) && !/(Chrome|Chromium|CriOS|Android)\//.test(userAgent);
  if (isSafari) {
    return canPlayMov ? 'mov' : 'atlas';
  }

  return canPlayWebm ? 'webm' : 'atlas';
}

export function getFrameState(
  action: Pick<RasterAction, 'frameCount' | 'duration'>,
  elapsedSeconds: number,
  fps: number,
  loop: boolean,
) {
  const rawFrame = Math.max(0, Math.floor(elapsedSeconds * fps));

  if (loop) {
    return { frame: rawFrame % action.frameCount, complete: false };
  }

  return {
    frame: Math.min(rawFrame, action.frameCount - 1),
    complete: elapsedSeconds >= action.duration,
  };
}

export function locateAtlasFrame(atlases: readonly RasterAtlas[], frame: number) {
  const atlas = atlases.find(
    (item) => frame >= item.startFrame && frame < item.startFrame + item.frameCount,
  );

  if (!atlas) {
    throw new Error(`frame ${frame} is not present in an atlas`);
  }

  const localFrame = frame - atlas.startFrame;
  return {
    atlas,
    column: localFrame % atlas.columns,
    row: Math.floor(localFrame / atlas.columns),
  };
}
