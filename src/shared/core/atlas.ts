export interface TextureAtlasFrameData {
  x: number;
  y: number;
  w: number;
  h: number;
  offX?: number;
  offY?: number;
  sourceW?: number;
  sourceH?: number;
}

export interface TextureAtlasData {
  file: string;
  frames: Record<string, TextureAtlasFrameData>;
}

export interface AtlasSpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getTextureAtlasFrame(atlas: TextureAtlasData, frameName: string): AtlasSpriteFrame {
  const frame = atlas.frames[frameName];

  if (!frame) {
    throw new Error(`Atlas frame not found: ${frameName}`);
  }

  return {
    x: frame.x,
    y: frame.y,
    width: frame.w,
    height: frame.h,
  };
}

export function getTextureAtlasFrameRect(
  atlas: TextureAtlasData,
  frameName: string,
): [number, number, number, number] {
  const frame = getTextureAtlasFrame(atlas, frameName);
  return [frame.x, frame.y, frame.width, frame.height];
}
