import type { CSSProperties, ReactNode, Ref } from 'react';

export interface SpineAssetManager {
  loadTextureAtlas(path: string): void;
  loadText(path: string): void;
  isLoadingComplete(): boolean;
  hasErrors?(): boolean;
  errors?: Record<string, unknown>;
  get(path: string): SpineTextureAtlas | string | null;
}

export interface SpineTextureAtlas {}
export interface SpineAtlasAttachmentLoader {}

export interface SpineManagedWebGLRenderingContext {
  gl: WebGLRenderingContext;
}

export interface SpineVector2 {
  x: number;
  y: number;
  set(x: number, y: number): void;
}

export interface SpineSkeletonJson {
  readSkeletonData(json: string): SpineSkeletonData;
}

export interface SpineSkeletonData {
  x: number;
  y: number;
  width: number;
  height: number;
  animations: Array<{ name: string; duration?: number }>;
}

export interface SpineSkeleton {
  scaleX: number;
  scaleY: number;
  x: number;
  y: number;
  getBounds?(offset: SpineVector2, size: SpineVector2, temp?: number[]): void;
  setToSetupPose(): void;
  updateWorldTransform(): void;
}

export interface SpineAnimationStateData {}

export interface SpineAnimationState {
  update(delta: number): void;
  apply(skeleton: SpineSkeleton): void;
  setAnimation(track: number, name: string, loop: boolean): SpineTrackEntry;
  addListener(listener: SpineAnimationStateListener): void;
}

export interface SpineTrackEntry {
  animation: { name: string };
}

export interface SpineAnimationStateListener {
  complete?: (entry: SpineTrackEntry) => void;
}

export interface SpineSceneRenderer {
  resize(resizeMode: unknown): void;
  begin(): void;
  drawTexture(
    texture: unknown,
    x: number,
    y: number,
    width: number,
    height: number,
    color?: unknown,
  ): void;
  drawSkeleton(skeleton: SpineSkeleton, premultipliedAlpha: boolean): void;
  end(): void;
}

export interface SpineGlobal {
  Vector2?: new (x?: number, y?: number) => SpineVector2;
  TextureAtlas: new (
    atlasText: string,
    textureLoader: (path: string) => unknown,
  ) => SpineTextureAtlas;
  AtlasAttachmentLoader: new (atlas: SpineTextureAtlas) => SpineAtlasAttachmentLoader;
  SkeletonJson: new (loader: SpineAtlasAttachmentLoader) => SpineSkeletonJson;
  Skeleton: new (data: SpineSkeletonData) => SpineSkeleton;
  AnimationState: new (data: SpineAnimationStateData) => SpineAnimationState;
  AnimationStateData: new (data: SpineSkeletonData) => SpineAnimationStateData;
  webgl?: {
    AssetManager: new (
      ctx: SpineManagedWebGLRenderingContext,
      pathPrefix?: string,
    ) => SpineAssetManager;
    ManagedWebGLRenderingContext: new (
      canvas: HTMLCanvasElement,
      options?: Record<string, unknown>,
    ) => SpineManagedWebGLRenderingContext;
    SceneRenderer: new (
      canvas: HTMLCanvasElement,
      ctx: SpineManagedWebGLRenderingContext,
      twoColorTint?: boolean,
    ) => SpineSceneRenderer;
    GLTexture: new (
      ctx: SpineManagedWebGLRenderingContext | WebGLRenderingContext,
      image: HTMLImageElement,
      useMipMaps?: boolean,
    ) => unknown;
    ResizeMode?: {
      Fit?: unknown;
      Expand: unknown;
    };
  };
}

export type SpineFitMode = 'stage' | 'content' | 'native';

export interface SpineRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpineViewportTransform {
  scale: number;
  x: number;
  y: number;
}

export interface SpineChildTarget {
  childName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  animationName?: string;
}

export interface SpineChildRectRequest {
  childName: string;
  animationNames: string[];
}

export interface SpineChildRectResult {
  childName: string;
  animationNames: string[];
  worldRect: SpineRect;
  screenRect: SpineRect;
}

export interface SpineSlotRectResult {
  slotName: string;
  worldRect: SpineRect;
  screenRect: SpineRect;
}

export interface SpinePlayerHandle {
  play: (animationName?: string, loop?: boolean) => void;
  playChild: (
    childName: string,
    animationName: string,
    loop?: number,
    stopBackStart?: boolean,
  ) => void;
  stopChild: (childName: string) => void;
  ischildPlaying: (childName: string) => boolean;
  getChildRects: (requests: SpineChildRectRequest[]) => SpineChildRectResult[];
  getSlotRect: (slotName: string) => SpineSlotRectResult | null;
  hasAnimation: (animationName: string) => boolean;
  getAnimationDuration: (animationName: string) => number | null;
  gotoAndStop: (animationName: string, time?: number) => void;
  stop: () => void;
}

export interface SpineRawBone {
  name: string;
  parent?: string;
}

export interface SpineRawData {
  bones?: SpineRawBone[];
  animations?: Record<string, unknown>;
}

export interface SpinePlayerProps {
  zipUrl?: string;
  atlasUrl?: string;
  jsonUrl?: string;
  runtimeUrl?: string;
  width?: number;
  height?: number;
  onComplete?: (animationName: string) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
  className?: string;
  style?: CSSProperties;
  fitRatio?: number;
  fitMode?: SpineFitMode;
  showBackground?: boolean;
  autoPlay?: boolean;
  defaultAnimationName?: string;
  loop?: boolean;
  flipY?: boolean;
  hiddenSlotNames?: readonly string[];
  childTargets?: SpineChildTarget[];
}

export interface SpinePlayerWebGlShellProps {
  backgroundImageUrl: string;
  showBackground?: boolean;
  backgroundNaturalSize?: { width: number; height: number } | null;
  width: number;
  height: number;
  stageWidth?: number;
  stageHeight?: number;
  fitRatio?: number;
  className?: string;
  style?: CSSProperties;
  canvasRef?: Ref<HTMLCanvasElement>;
  children?: ReactNode;
}

export interface ResolveSpineBackgroundRenderSizeOptions {
  backgroundNaturalWidth: number;
  backgroundNaturalHeight: number;
  stageWidth: number;
  stageHeight: number;
  viewWidth: number;
  viewHeight: number;
  fitRatio?: number;
}

export interface ResolveSpineBackgroundDrawRectOptions extends ResolveSpineBackgroundRenderSizeOptions {}

export interface ResolveSpineBackgroundWorldRectOptions {
  stageX?: number;
  stageY?: number;
  stageWidth: number;
  stageHeight: number;
  backgroundNaturalWidth: number;
  backgroundNaturalHeight: number;
}

export interface ResolveSpineViewportTransformOptions {
  viewWidth: number;
  viewHeight: number;
  contentBounds: SpineRect | null;
  fitRatio?: number;
  fitMode?: SpineFitMode;
}
